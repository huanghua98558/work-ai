/**
 * WorkBot 服务看门狗进程
 * 功能：
 * 1. 监控服务健康状态
 * 2. 检测进程数量异常
 * 3. 自动清理僵尸进程
 * 4. 服务异常时自动重启
 * 5. 记录监控日志
 */

import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// 配置
const CONFIG = {
  // 服务端口
  PORT: 5000,
  // 健康检查URL
  HEALTH_URL: 'http://localhost:5000/api/health',
  // 最大进程数量（超过则清理）
  MAX_PROCESSES: 6,
  // 健康检查间隔（毫秒）
  HEALTH_CHECK_INTERVAL: 30000, // 30秒
  // 僵尸进程清理间隔（毫秒）
  ZOMBIE_CLEAN_INTERVAL: 60000, // 1分钟
  // 服务重启间隔（毫秒）
  RESTART_INTERVAL: 120000, // 2分钟
  // 日志文件路径
  LOG_FILE: '/app/work/logs/bypass/watchdog.log',
  // PID文件路径
  PID_FILE: '/tmp/workbot_watchdog.pid',
  // 服务PID文件路径
  SERVICE_PID_FILE: '/tmp/workbot_service.pid',
};

// 日志函数
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage);
}

// 执行shell命令
function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error: any) {
    log(`Command failed: ${command} - ${error.message}`, 'ERROR');
    return '';
  }
}

// 获取进程列表
function getProcesses(): Array<{ pid: number; ppid: number; cmd: string; cpu: number; mem: number }> {
  const output = execCommand('ps -ef | grep -E "tsx|pnpm" | grep -v grep');
  return output.split('\n').filter(line => line.trim()).map(line => {
    const parts = line.trim().split(/\s+/);
    // ps -ef的格式: UID PID PPID C STIME TTY TIME CMD
    // C列是CPU使用百分比
    return {
      pid: parseInt(parts[1]),
      ppid: parseInt(parts[2]),
      cmd: parts.slice(7).join(' '),
      cpu: parseFloat(parts[2]), // 实际上这里应该是parts[2]是PPID，parts[3]是CPU百分比
      mem: 0, // ps -ef不提供内存百分比
    };
  });
}

// 使用ps aux获取准确的进程信息
function getProcessesAux(): Array<{ pid: number; ppid: number; cmd: string; cpu: number; mem: number }> {
  const output = execCommand('ps aux | grep -E "tsx|pnpm" | grep -v grep');
  return output.split('\n').filter(line => line.trim()).map(line => {
    const parts = line.trim().split(/\s+/);
    // ps aux的格式: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
    return {
      pid: parseInt(parts[1]),
      ppid: 0, // ps aux不直接提供PPID
      cmd: parts.slice(10).join(' '),
      cpu: parseFloat(parts[2]),
      mem: parseFloat(parts[3]),
    };
  });
}

// 检查端口是否被监听
function isPortListening(port: number): boolean {
  const output = execCommand(`ss -tuln 2>/dev/null | grep -E ":${port}[[:space:]]" | grep -q LISTEN && echo "YES" || echo "NO"`);
  return output === 'YES';
}

// 检查服务健康状态
async function checkServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(CONFIG.HEALTH_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5秒超时
    });
    return response.ok;
  } catch (error) {
    log(`Health check failed: ${error}`, 'WARN');
    return false;
  }
}

// 清理僵尸进程
function cleanupZombieProcesses(): number {
  // 使用ps aux获取准确的进程信息
  const processes = getProcessesAux();
  
  if (processes.length <= CONFIG.MAX_PROCESSES) {
    log(`Process count normal: ${processes.length}`);
    return 0;
  }

  log(`Too many processes: ${processes.length} (max: ${CONFIG.MAX_PROCESSES})`, 'WARN');

  // 识别主进程（包含"server.ts"的进程）
  const serverProcesses = processes.filter(p => p.cmd.includes('server.ts'));
  
  if (serverProcesses.length === 0) {
    log('No server.ts process found, aborting cleanup', 'WARN');
    return 0;
  }

  log(`Found ${serverProcesses.length} server.ts process(es)`, 'INFO');

  // 保留CPU使用率最高的主进程（可能是活跃的主进程）
  const mainServerProcess = serverProcesses.reduce((max, p) => 
    p.cpu > max.cpu ? p : max, serverProcesses[0]);
  
  log(`Keeping main server process: PID ${mainServerProcess.pid} (CPU: ${mainServerProcess.cpu}%)`, 'INFO');

  // 标记要保留的进程
  const processesToKeep = new Set<number>([mainServerProcess.pid]);

  // 按CPU使用率排序，只清理CPU使用率很低的进程（可能是僵尸进程）
  const sortedProcesses = [...processes].sort((a, b) => a.cpu - b.cpu);
  
  // 选择要清理的进程
  let processesToKill = sortedProcesses.filter(p => 
    p.cpu < 0.5 && !processesToKeep.has(p.pid)); // 只清理CPU<0.5%且不是主进程的进程
  
  // 如果清理后还是超过限制，再清理CPU最低的几个进程，但保留至少CONFIG.MAX_PROCESSES个进程
  const remainingAfterCleanup = processes.length - processesToKill.length;
  if (remainingAfterCleanup > CONFIG.MAX_PROCESSES) {
    const additionalToKill = remainingAfterCleanup - CONFIG.MAX_PROCESSES;
    const remainingProcesses = sortedProcesses.filter(p => 
      !processesToKill.some(k => k.pid === p.pid) && !processesToKeep.has(p.pid));
    processesToKill = [...processesToKill, ...remainingProcesses.slice(0, additionalToKill)];
  }

  let killedCount = 0;

  processesToKill.forEach(proc => {
    try {
      // 先尝试优雅关闭
      execCommand(`kill ${proc.pid} 2>/dev/null`);
      killedCount++;
      log(`Killed process ${proc.pid} (CPU: ${proc.cpu}%, MEM: ${proc.mem}%)`);
    } catch (error: any) {
      log(`Failed to kill process ${proc.pid}: ${error.message}`, 'ERROR');
    }
  });

  // 等待2秒后检查是否还有僵尸进程
  setTimeout(() => {
    const remainingProcesses = getProcessesAux();
    if (remainingProcesses.length > CONFIG.MAX_PROCESSES) {
      log(`Still ${remainingProcesses.length} processes remaining, forcing cleanup...`, 'WARN');
      
      // 强制清理CPU为0且不是主进程的进程
      remainingProcesses.forEach(proc => {
        if (proc.cpu === 0 && !processesToKeep.has(proc.pid)) {
          try {
            execCommand(`kill -9 ${proc.pid} 2>/dev/null`);
            log(`Force killed process ${proc.pid}`);
          } catch (error) {
            // 忽略错误
          }
        }
      });
    }
  }, 2000);

  log(`Cleanup completed: ${killedCount} processes killed`);
  return killedCount;
}

// 获取活跃的server.ts进程PID
function getServerProcessPID(): number | null {
  const output = execCommand('pgrep -f "tsx.*server.ts"');
  if (!output) return null;
  
  const pids = output.trim().split('\n').map(p => parseInt(p.trim()));
  // 返回最新的PID（最大的PID）
  return pids.length > 0 ? Math.max(...pids) : null;
}

// 重启服务
async function restartService(): Promise<boolean> {
  log('Restarting service...', 'WARN');

  try {
    // 清理旧进程
    cleanupZombieProcesses();
    
    // 删除.next缓存
    const projectRoot = process.env.COZE_WORKSPACE_PATH || '/workspace/projects';
    const nextDir = path.join(projectRoot, '.next');
    if (fs.existsSync(nextDir)) {
      execCommand(`rm -rf ${nextDir}`);
      log('Cleaned .next directory');
    }

    // 启动新服务
    const devLogPath = '/app/work/logs/bypass/dev.log';
    execCommand(`cd ${projectRoot} && nohup coze dev > ${devLogPath} 2>&1 &`);
    
    // 等待服务启动
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒

    // 检查服务是否启动成功
    if (isPortListening(CONFIG.PORT)) {
      log('Service restarted successfully');
      return true;
    } else {
      log('Service restart failed - port not listening', 'ERROR');
      return false;
    }
  } catch (error: any) {
    log(`Failed to restart service: ${error.message}`, 'ERROR');
    return false;
  }
}

// 主监控循环
async function monitorLoop() {
  log('Starting watchdog monitoring...');

  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3;

  // 健康检查定时器
  const healthCheckTimer = setInterval(async () => {
    log('Performing health check...');
    
    const isHealthy = await checkServiceHealth();
    const portListening = isPortListening(CONFIG.PORT);
    const processCount = getProcesses().length;

    log(`Health status: ${isHealthy ? 'OK' : 'FAIL'}, Port: ${portListening ? 'LISTENING' : 'NOT_LISTENING'}, Processes: ${processCount}`);

    if (!isHealthy || !portListening) {
      consecutiveFailures++;
      log(`Service unhealthy (failure ${consecutiveFailures}/${maxConsecutiveFailures})`, 'WARN');

      if (consecutiveFailures >= maxConsecutiveFailures) {
        log('Max consecutive failures reached, restarting service...', 'ERROR');
        const success = await restartService();
        if (success) {
          consecutiveFailures = 0;
        }
      }
    } else {
      consecutiveFailures = 0;
    }
  }, CONFIG.HEALTH_CHECK_INTERVAL);

  // 僵尸进程清理定时器
  const zombieCleanupTimer = setInterval(() => {
    log('Checking for zombie processes...');
    const cleaned = cleanupZombieProcesses();
    if (cleaned > 0) {
      log(`Cleaned ${cleaned} zombie processes`, 'WARN');
    }
  }, CONFIG.ZOMBIE_CLEAN_INTERVAL);

  // 优雅关闭处理
  const shutdown = (signal: string) => {
    log(`Received ${signal}, shutting down watchdog...`);
    clearInterval(healthCheckTimer);
    clearInterval(zombieCleanupTimer);
    
    // 删除PID文件
    if (fs.existsSync(CONFIG.PID_FILE)) {
      fs.unlinkSync(CONFIG.PID_FILE);
    }
    
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// 检查是否已经有看门狗在运行
function checkSingleton(): boolean {
  if (fs.existsSync(CONFIG.PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(CONFIG.PID_FILE, 'utf-8').trim());
    
    try {
      // 检查进程是否还在运行
      execCommand(`ps -p ${oldPid} > /dev/null 2>&1`);
      log(`Watchdog already running (PID: ${oldPid})`, 'ERROR');
      return false;
    } catch {
      // 进程不存在，可以启动新的看门狗
      log('Stale watchdog PID file found, cleaning up...');
    }
  }

  // 写入当前PID
  fs.writeFileSync(CONFIG.PID_FILE, process.pid.toString());
  return true;
}

// 启动看门狗
function startWatchdog() {
  log('=== WorkBot Watchdog Starting ===');
  log(`Port: ${CONFIG.PORT}`);
  log(`Max Processes: ${CONFIG.MAX_PROCESSES}`);
  log(`Health Check Interval: ${CONFIG.HEALTH_CHECK_INTERVAL}ms`);
  log(`PID File: ${CONFIG.PID_FILE}`);
  log(`Log File: ${CONFIG.LOG_FILE}`);

  if (!checkSingleton()) {
    process.exit(1);
  }

  monitorLoop();
}

// 如果是主模块，则启动看门狗
if (require.main === module) {
  startWatchdog();
}

export { startWatchdog, checkServiceHealth, cleanupZombieProcesses, restartService };
