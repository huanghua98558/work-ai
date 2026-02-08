# WorkBot WebSocket v3.0 快速启动指南

## 🚀 快速开始

### 1. 环境检查

确保以下环境已配置：
- ✅ Node.js 24+
- ✅ PostgreSQL 18
- ✅ pnpm 包管理器

### 2. 数据库迁移

由于数据库权限限制，需要手动执行迁移：

```bash
# 方式一：使用 psql（推荐）
psql -h pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com \
     -U workbot \
     -d postgres \
     -f migrations/v3.0_websocket_upgrade.sql

# 方式二：在数据库管理工具中执行
# 复制 migrations/v3.0_websocket_upgrade.sql 中的 SQL 语句执行
```

### 3. 启动服务

```bash
# 开发模式
pnpm install
pnpm dev

# 生产模式
pnpm build
pnpm start
```

### 4. 验证服务

```bash
# 检查服务状态
curl http://localhost:5000

# 测试 WebSocket 连接
curl -I http://localhost:5000/ws
```

---

## 📡 WebSocket 连接示例

### 认证流程

```javascript
const ws = new WebSocket('ws://localhost:5000/ws');

ws.onopen = () => {
  console.log('✓ 连接成功');

  // 发送认证消息（必须在30秒内完成）
  ws.send(JSON.stringify({
    type: 'authenticate',
    data: {
      robotId: 'your-robot-id',
      token: 'your-jwt-token',
      timestamp: Date.now()
    },
    timestamp: Date.now()
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'authenticated':
      console.log('✓ 认证成功:', message.data);
      break;
    case 'command_push':
      console.log('收到指令:', message.data);
      handleCommand(message.data);
      break;
    case 'config_push':
      console.log('收到配置:', message.data);
      updateConfig(message.data);
      break;
    case 'error':
      console.error('错误:', message.data);
      break;
  }
};

ws.onerror = (error) => {
  console.error('连接错误:', error);
};

ws.onclose = () => {
  console.log('连接已关闭');
};
```

### 心跳发送

```javascript
// 每30秒发送一次心跳
setInterval(() => {
  ws.send(JSON.stringify({
    type: 'heartbeat',
    data: {
      robotId: 'your-robot-id',
      status: 'running',
      battery: 85,
      signal: 4
    },
    timestamp: Date.now()
  }));
}, 30000);
```

### 结果上报

```javascript
function reportResult(commandId, status, result, errorMessage) {
  ws.send(JSON.stringify({
    type: 'result',
    data: {
      commandId,
      status, // 'success' or 'failed'
      result,
      errorMessage,
      executedAt: Date.now()
    },
    timestamp: Date.now()
  }));
}

// 示例：发送消息成功
reportResult('cmd-123', 'success', {
  messageId: 'msg-456',
  timestamp: Date.now()
}, null);

// 示例：发送消息失败
reportResult('cmd-123', 'failed', null, '消息发送失败：网络错误');
```

---

## 🔧 API 使用示例

### 发送指令

```bash
curl -X POST http://localhost:5000/api/commands/send \
  -H "Content-Type: application/json" \
  -d '{
    "robotId": "robot-001",
    "commandType": "send_message",
    "target": "张三",
    "params": {
      "titleList": ["张三"],
      "receivedContent": "你好，这是一条测试消息",
      "atList": []
    },
    "priority": "1"
  }'
```

### 推送配置

```bash
curl -X POST http://localhost:5000/api/configs/push \
  -H "Content-Type: application/json" \
  -d '{
    "robotId": "robot-001",
    "configType": "risk_control",
    "config": {
      "enabled": true,
      "maxMessagesPerMinute": 60,
      "replyDelayMin": 0,
      "replyDelayMax": 3
    }
  }'
```

### 查询状态

```bash
# 获取在线机器人列表
curl "http://localhost:5000/api/status?action=list"

# 查询特定机器人状态
curl "http://localhost:5000/api/status?action=query&robotId=robot-001"
```

---

## 🧪 测试脚本

运行集成测试：

```bash
chmod +x scripts/test-websocket-v3.sh
./scripts/test-websocket-v3.sh
```

---

## 📚 常见问题

### Q: 连接超时怎么办？

A: 确保在30秒内发送认证消息。如果超过30秒，连接将被关闭。

### Q: 心跳如何配置？

A: 客户端每30秒发送一次心跳，服务器60秒内未收到心跳将断开连接。

### Q: 指令如何重试？

A: 指令队列会自动处理重试。客户端只需上报结果，成功或失败。

### Q: 配置如何更新？

A: 配置会实时推送给在线的客户端。离线客户端在下次连接时会获取最新配置。

### Q: 如何查看连接状态？

A: 使用状态查询接口：`GET /api/status?action=list`

---

## 🔐 认证说明

### JWT Token 获取

```javascript
// 生成 JWT Token
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    id: userId,
    robotId: 'your-robot-id'
  },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);
```

### 认证流程

1. 客户端连接到 WebSocket 服务器
2. 在 30 秒内发送 `authenticate` 消息
3. 服务器验证 Token 和 robotId
4. 认证成功后，服务器返回 `authenticated` 消息
5. 客户端可以开始发送和接收消息

---

## 📊 消息类型参考

### 认证消息

```json
{
  "type": "authenticate",
  "data": {
    "robotId": "robot-001",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "timestamp": 1770341504000
  },
  "timestamp": 1770341504000
}
```

### 心跳消息

```json
{
  "type": "heartbeat",
  "data": {
    "robotId": "robot-001",
    "status": "running",
    "battery": 85,
    "signal": 4
  },
  "timestamp": 1770341507000
}
```

### 指令推送

```json
{
  "type": "command_push",
  "data": {
    "commandId": "cmd-001",
    "commandType": "send_message",
    "commandCode": 203,
    "target": "张三",
    "params": {
      "titleList": ["张三"],
      "receivedContent": "你好！",
      "atList": []
    },
    "priority": 1
  },
  "timestamp": 1770341506000
}
```

### 结果上报

```json
{
  "type": "result",
  "data": {
    "commandId": "cmd-001",
    "status": "success",
    "result": {
      "messageId": "msg-001",
      "timestamp": 1770341508000
    },
    "executedAt": 1770341508000
  },
  "timestamp": 1770341508000
}
```

---

## 🎯 指令类型参考

| 指令类型 | 编码 | 说明 |
|---------|------|------|
| send_message | 203 | 发送文本消息 |
| forward_message | 205 | 转发消息 |
| create_group | 206 | 创建/修改群 |
| update_group | 207 | 群管理 |
| send_file | 218 | 发送文件 |
| dissolve_group | 219 | 解散群 |
| send_favorite | 900 | 发送收藏消息 |

---

## 📞 技术支持

如有问题，请参考：
- 完整文档: `docs/WEBSOCKET_V3_MIGRATION_REPORT.md`
- 系统分析: `docs/SYSTEM_ANALYSIS_V3.0.md`
- API 文档: 见各 API 路由文件

---

**快速启动指南结束**

*更新时间: 2026-02-09*
*版本: 1.0*
