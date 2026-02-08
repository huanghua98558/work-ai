# APP 通讯快速参考卡

## 📌 服务器地址

```
HTTP API:   http://9.129.28.93:5000
WebSocket:  ws://9.129.28.93:5000/ws
```

---

## 🔑 快速开始

### 1️⃣ 激活设备
```bash
POST http://9.129.28.93:5000/api/robot-ids/activate
Content-Type: application/json

{
  "code": "YOUR_ACTIVATION_CODE",
  "deviceInfo": {
    "deviceId": "unique-device-id"
  }
}
```

**响应**:
```json
{
  "code": 200,
  "message": "激活成功",
  "data": {
    "robotId": "bot_abc123",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-02-10T19:36:31.790Z"
  }
}
```

---

### 2️⃣ 连接 WebSocket
```
ws://9.129.28.93:5000/ws?robotId={robotId}&token={token}
```

**认证成功**:
```json
{
  "type": "authenticated",
  "data": {
    "authenticated": true,
    "robotId": "bot_abc123",
    "deviceId": "device_12345",
    "userId": 1
  }
}
```

---

### 3️⃣ 发送消息
```bash
POST http://9.129.28.93:5000/api/messages/report
Content-Type: application/json
Authorization: Bearer {token}

{
  "robotId": "bot_abc123",
  "messageId": "msg_12345",
  "messageType": "text",
  "content": "你好"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "消息上报成功",
  "data": {
    "messageId": 12345,
    "sessionId": "session_abc123",
    "status": "received"
  }
}
```

---

### 4️⃣ 接收回复（WebSocket 推送）
```json
{
  "type": "auto_reply",
  "data": {
    "robotId": "bot_abc123",
    "sessionId": "session_abc123",
    "response": "您好！我是您的智能助手。"
  }
}
```

---

## 💬 WebSocket 消息类型

### 客户端 -> 服务器
| 类型 | 说明 | 示例 |
|------|------|------|
| `ping` | 心跳 | `{"type":"ping","timestamp":1234567890}` |
| `message` | 消息上报 | `{"type":"message","data":{...}}` |
| `status` | 状态更新 | `{"type":"status","data":{...}}` |

### 服务器 -> 客户端
| 类型 | 说明 | 示例 |
|------|------|------|
| `authenticated` | 认证成功 | `{"type":"authenticated","data":{...}}` |
| `auto_reply` | 自动回复 | `{"type":"auto_reply","data":{...}}` |
| `message` | 消息推送 | `{"type":"message","data":{...}}` |
| `ping` | 心跳检测 | `{"type":"ping","timestamp":1234567890}` |
| `error` | 错误消息 | `{"type":"error","code":4001,"message":"..."}` |

---

## ⚠️ 常见错误码

### HTTP 错误
| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### WebSocket 错误
| 错误码 | 说明 |
|--------|------|
| 4000 | 未知的消息类型 |
| 4001 | Token 无效 |
| 4006 | 认证超时 |
| 4007 | Token 已过期 |
| 4029 | 连接数超限 |

---

## 🧪 测试命令

### 健康检查
```bash
curl http://9.129.28.93:5000/api/health
```

### WebSocket 监控
```bash
curl http://9.129.28.93:5000/api/websocket/monitor
```

### 运行完整测试
```bash
bash scripts/test-app-communication.sh
```

---

## 📝 重要提示

1. **Token 有效期**: 24 小时
2. **心跳间隔**: 每 30 秒发送一次 `ping`
3. **心跳超时**: 60 秒无心跳则断开连接
4. **最大连接数**: 100 个
5. **消息去重**: 使用 `messageId` 避免重复

---

## 📞 技术支持

- **详细文档**: `docs/APP_COMMUNICATION_SPEC.md`
- **WebSocket 指南**: `docs/WEBSOCKET_CONNECTION_GUIDE.md`
- **测试工具**: `scripts/test-app-communication.sh`

---

**服务器状态**: ✅ 运行中
**最后更新**: 2026-02-09
