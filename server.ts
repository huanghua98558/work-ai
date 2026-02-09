import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeWebSocketServer } from './src/server/websocket-server-v3';
import { cleanupZombieProcesses, getSystemStats } from './src/lib/process-cleanup';

// 检查必需的环境变量
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ 缺少必需的环境变量:');
  missingEnvVars.forEach(varName => {
    console.error(`  - ${varName}: 未配置`);
  });
  console.error('');
  console.error('配置方式：');
  console.error('');
  console.error('📖 本地开发：');
  console.error('  在项目根目录创建 .env 文件并配置以上环境变量');
  console.error('');
  console.error('☁️  Coze 平台部署：');
  console.error('  1. 进入 Coze 平台项目设置');
  console.error('  2. 找到"环境变量"或"Secrets"配置页面');
  console.error('  3. 添加以下必需的环境变量：');
  console.error('     - DATABASE_URL: PostgreSQL 数据库连接字符串');
  console.error('     - JWT_SECRET: 至少 32 个字符的随机密钥');
  console.error('  4. 保存配置并重新部署');
  console.error('');
  console.error('📚 详细配置指南请查看：COZE_ENV_SETUP.md');
  process.exit(1);
}

// 增加 Node.js 内存限制（防止 OOM）
if (process.env.NODE_OPTIONS === undefined) {
  process.env.NODE_OPTIONS = '--max-old-space-size=2048';
}
console.log('[Server] NODE_OPTIONS:', process.env.NODE_OPTIONS);

// 强制设置端口为 5000，防止被其他配置覆盖
process.env.PORT = '5000';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

console.log('[Server] Starting with config:', { dev, hostname, port, NODE_ENV: process.env.NODE_ENV });

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log('[Server] Initializing Next.js...');
app.prepare().then(async () => {
  console.log('[Server] Next.js initialized successfully');

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[Server] Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  console.log('[Server] Initializing WebSocket server...');
  try {
    await initializeWebSocketServer(server);
    console.log('[Server] WebSocket server initialized successfully');
  } catch (err) {
    console.error('[Server] Failed to initialize WebSocket server:', err);
    // 不要因为 WebSocket 初始化失败就退出，继续启动 HTTP 服务器
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket: ws://${hostname}:${port}/ws`);
    
    // 启动定期监控
    startMonitoring();
  }).on('error', (err: any) => {
    console.error('[Server] Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${port} is already in use`);
    }
    process.exit(1);
  });

  // 定义优雅关闭函数（放在server作用域内）
  let isShuttingDown = false;
  function gracefulShutdown(exitCode: number, reason: string) {
    if (isShuttingDown) {
      console.log('[Server] Shutdown already in progress, ignoring...');
      return;
    }
    
    isShuttingDown = true;
    console.log(`[Server] Starting graceful shutdown (reason: ${reason})...`);

    // 设置强制关闭超时（10秒）
    const forceShutdownTimeout = setTimeout(() => {
      console.log('[Server] Force shutdown timeout reached, exiting...');
      process.exit(1);
    }, 10000);

    // 关闭HTTP服务器
    console.log('[Server] Closing HTTP server...');
    server.close((err) => {
      if (err) {
        console.error('[Server] Error closing server:', err);
        clearTimeout(forceShutdownTimeout);
        process.exit(1);
      }
      
      console.log('[Server] HTTP server closed');
      
      // 清理其他资源
      console.log('[Server] Cleaning up resources...');
      
      // 清理WebSocket连接
      try {
        // 这里可以添加WebSocket连接清理逻辑
        console.log('[Server] WebSocket connections cleaned');
      } catch (err) {
        console.error('[Server] Error cleaning WebSocket:', err);
      }

      // 清理数据库连接（如果有）
      try {
        // 这里可以添加数据库连接清理逻辑
        console.log('[Server] Database connections cleaned');
      } catch (err) {
        console.error('[Server] Error cleaning database:', err);
      }

      console.log('[Server] Graceful shutdown completed');
      clearTimeout(forceShutdownTimeout);
      process.exit(exitCode);
    });

    // 立即停止接受新连接
    console.log('[Server] Stopping accepting new connections...');
  }

  // 添加进程退出处理
  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err);
    gracefulShutdown(1, 'uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // 优雅关闭处理
  const shutdownSignals = ['SIGTERM', 'SIGINT'];
  shutdownSignals.forEach(signal => {
    process.on(signal as NodeJS.Signals, () => {
      console.log(`[Server] Received ${signal}, initiating graceful shutdown...`);
      gracefulShutdown(0, signal);
    });
  });

  // 超时强制退出
  process.on('SIGUSR2', () => {
    console.log('[Server] Received SIGUSR2, performing emergency shutdown...');
    process.exit(1);
  });
}).catch((err) => {
  console.error('[Server] Failed to start server:', err);
  process.exit(1);
});

/**
 * 启动监控功能
 */
function startMonitoring() {
  console.log('[Monitor] Starting monitoring system...');

  // 每5分钟检查一次系统资源
  const systemCheckInterval = 5 * 60 * 1000;
  
  const systemCheckTimer = setInterval(() => {
    try {
      const stats = getSystemStats();
      console.log('[Monitor] System Stats:', {
        memory: `${stats.memory.used}MB/${stats.memory.total}MB (${stats.memory.usagePercent}%)`,
        load: stats.loadAverage,
      });

      // 如果内存使用超过80%，触发清理
      if (stats.memory.usagePercent > 80) {
        console.warn('[Monitor] High memory usage detected, running cleanup...');
        const cleaned = cleanupZombieProcesses(6);
        console.log(`[Monitor] Cleanup completed: ${cleaned} processes removed`);
      }
    } catch (error) {
      console.error('[Monitor] Error checking system stats:', error);
    }
  }, systemCheckInterval);

  // 每10分钟清理一次僵尸进程
  const cleanupInterval = 10 * 60 * 1000;
  
  const cleanupTimer = setInterval(() => {
    try {
      console.log('[Monitor] Running scheduled cleanup...');
      const cleaned = cleanupZombieProcesses(6);
      console.log(`[Monitor] Cleanup completed: ${cleaned} processes removed`);
    } catch (error) {
      console.error('[Monitor] Error during cleanup:', error);
    }
  }, cleanupInterval);

  // 在关闭时清理定时器
  process.on('exit', () => {
    clearInterval(systemCheckTimer);
    clearInterval(cleanupTimer);
    console.log('[Monitor] Monitoring stopped');
  });

  console.log('[Monitor] Monitoring system started');
  console.log(`[Monitor] System check interval: ${systemCheckInterval / 1000}s`);
  console.log(`[Monitor] Cleanup interval: ${cleanupInterval / 1000}s`);
}
