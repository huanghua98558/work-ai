/**
 * 进程清理工具
 * 用于清理僵尸进程和重复进程
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

const LOG_FILE = '/app/work/logs/bypass/process_cleanup.log';

// 日志函数
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

// 执行命令
function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error: any) {
    log(`Command failed: ${command} - ${error.message}`, 'ERROR');
    return '';
  }
}

/**
 * 获取相关进程列表
 */
export function getProcesses(): Array<{ pid: number; ppid: number; cpu: number; mem: number; cmd: string }> {
  const output = execCommand('ps -ef | grep -E "tsx|pnpm" | grep -v grep');
  return output.split('\n').filter(line => line.trim()).map(line => {
    const parts = line.trim().split(/\s+/);
    return {
      pid: parseInt(parts[1]),
      ppid: parseInt(parts[2]),
      cpu: parseFloat(parts[2] || '0'),
      mem: parseFloat(parts[3] || '0'),
      cmd: parts.slice(7).join(' '),
    };
  });
}

/**
 * 获取进程统计信息
 */
export function getProcessStats() {
  const processes = getProcesses();
  
  // 按父进程分组
  const byParent = new Map<number, Array<typeof processes[0]>>();
  processes.forEach(p => {
    if (!byParent.has(p.ppid)) {
      byParent.set(p.ppid, []);
    }
    byParent.get(p.ppid)!.push(p);
  });

  // 统计
  const stats = {
    total: processes.length,
    groups: byParent.size,
    groupDetails: Array.from(byParent.entries()).map(([ppid, procs]) => ({
      parentPid: ppid,
      count: procs.length,
      avgCpu: procs.reduce((sum, p) => sum + p.cpu, 0) / procs.length,
      avgMem: procs.reduce((sum, p) => sum + p.mem, 0) / procs.length,
      processes: procs.map(p => ({ pid: p.pid, cmd: p.cmd.split(' ')[0] })),
    })),
  };

  return { processes, stats };
}

/**
 * 清理僵尸进程
 * @param maxProcesses 最大允许的进程数
 * @returns 清理的进程数
 */
export function cleanupZombieProcesses(maxProcesses: number = 6): number {
  log(`Starting zombie process cleanup (max: ${maxProcesses})...`);
  const { processes } = getProcessStats();
  
  if (processes.length <= maxProcesses) {
    log(`Process count normal: ${processes.length}/${maxProcesses}`);
    return 0;
  }

  log(`Too many processes: ${processes.length}/${maxProcesses}`, 'WARN');

  // 按CPU使用率排序，清理CPU使用率低的进程（可能是僵尸进程）
  const sortedProcesses = [...processes].sort((a, b) => a.cpu - b.cpu);
  const processesToKill = sortedProcesses.slice(0, processes.length - maxProcesses);

  let killedCount = 0;
  const killedPids: number[] = [];

  processesToKill.forEach(proc => {
    try {
      // 先尝试优雅关闭
      execCommand(`kill ${proc.pid} 2>/dev/null`);
      killedPids.push(proc.pid);
      killedCount++;
      log(`Killed process ${proc.pid} (CPU: ${proc.cpu}%, MEM: ${proc.mem}%)`);
    } catch (error: any) {
      log(`Failed to kill process ${proc.pid}: ${error.message}`, 'ERROR');
    }
  });

  // 等待2秒后检查是否还有僵尸进程
  setTimeout(() => {
    const remainingProcesses = getProcesses();
    if (remainingProcesses.length > maxProcesses) {
      log(`Still ${remainingProcesses.length} processes remaining, forcing cleanup...`, 'WARN');
      
      // 强制清理
      remainingProcesses.forEach(proc => {
        if (proc.cpu === 0) { // 只清理CPU为0的进程
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

/**
 * 检查端口占用
 */
export function checkPortOccupancy(port: number): {
  occupied: boolean;
  process?: { pid: number; cmd: string };
} {
  const output = execCommand(`lsof -i:${port} 2>/dev/null || echo "NOT_FOUND"`);
  
  if (output === 'NOT_FOUND') {
    return { occupied: false };
  }

  const lines = output.split('\n').filter(line => line.includes('LISTEN'));
  if (lines.length === 0) {
    return { occupied: false };
  }

  const parts = lines[0].trim().split(/\s+/);
  if (parts.length >= 2) {
    return {
      occupied: true,
      process: {
        pid: parseInt(parts[1]),
        cmd: parts[0],
      },
    };
  }

  return { occupied: false };
}

/**
 * 清理指定端口上的进程
 */
export function cleanupPortProcesses(port: number): number {
  log(`Cleaning up processes on port ${port}...`);
  const { occupied, process } = checkPortOccupancy(port);

  if (!occupied) {
    log(`Port ${port} is not occupied`);
    return 0;
  }

  try {
    execCommand(`kill -9 ${process!.pid} 2>/dev/null`);
    log(`Killed process ${process!.pid} on port ${port}`);
    return 1;
  } catch (error: any) {
    log(`Failed to kill process on port ${port}: ${error.message}`, 'ERROR');
    return 0;
  }
}

/**
 * 完整的清理流程
 */
export function fullCleanup(options: {
  maxProcesses?: number;
  checkPorts?: number[];
} = {}): {
  processesCleaned: number;
  portsCleaned: number;
} {
  log('Starting full cleanup process...');

  const { maxProcesses = 6, checkPorts = [5000, 9000] } = options;

  // 清理僵尸进程
  const processesCleaned = cleanupZombieProcesses(maxProcesses);

  // 清理端口
  let portsCleaned = 0;
  checkPorts.forEach(port => {
    const cleaned = cleanupPortProcesses(port);
    portsCleaned += cleaned;
  });

  log(`Full cleanup completed: ${processesCleaned} processes, ${portsCleaned} ports`);

  return { processesCleaned, portsCleaned };
}

/**
 * 获取系统资源使用情况
 */
export function getSystemStats() {
  const memInfo = execCommand('free -m | grep Mem');
  const memParts = memInfo.split(/\s+/);
  
  return {
    memory: {
      total: parseInt(memParts[1]),
      used: parseInt(memParts[2]),
      free: parseInt(memParts[3]),
      available: parseInt(memParts[6]),
      usagePercent: Math.round((parseInt(memParts[2]) / parseInt(memParts[1])) * 100),
    },
    loadAverage: execCommand('uptime').split('load average:')[1]?.trim() || 'N/A',
  };
}

// 如果直接运行此脚本，执行清理
if (require.main === module) {
  console.log('=== Process Cleanup Tool ===');
  console.log('Running full cleanup...');
  
  const result = fullCleanup({
    maxProcesses: 6,
    checkPorts: [5000],
  });

  console.log(`\nCleanup Summary:`);
  console.log(`- Processes cleaned: ${result.processesCleaned}`);
  console.log(`- Ports cleaned: ${result.portsCleaned}`);
  
  const stats = getSystemStats();
  console.log(`\nSystem Stats:`);
  console.log(`- Memory: ${stats.memory.used}MB / ${stats.memory.total}MB (${stats.memory.usagePercent}%)`);
  console.log(`- Load Average: ${stats.loadAverage}`);
}
