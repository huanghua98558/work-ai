import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeWebSocketServer } from './src/server/websocket-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

console.log('[Server] Starting with config:', { dev, hostname, port });

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log('[Server] Initializing Next.js...');
app.prepare().then(() => {
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
    initializeWebSocketServer(server);
    console.log('[Server] WebSocket server initialized successfully');
  } catch (err) {
    console.error('[Server] Failed to initialize WebSocket server:', err);
    // 不要因为 WebSocket 初始化失败就退出，继续启动 HTTP 服务器
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket: ws://${hostname}:${port}/ws`);
  }).on('error', (err: any) => {
    console.error('[Server] Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${port} is already in use`);
    }
    process.exit(1);
  });

  // 添加进程退出处理
  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server]Unhandled Rejection at:', promise, 'reason:', reason);
  });
}).catch((err) => {
  console.error('[Server] Failed to start server:', err);
  process.exit(1);
});
