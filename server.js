const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initializeWebSocketServer } = require('./src/server/websocket-server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 5000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // 初始化 WebSocket 服务器
  initializeWebSocketServer(server);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket: ws://${hostname}:${port}/ws`);
  });
});
