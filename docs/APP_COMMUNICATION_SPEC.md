# WorkBot APP 通讯规范

## 📋 目录
- [服务器地址](#服务器地址)
- [通讯流程](#通讯流程)
- [API 接口规范](#api-接口规范)
- [WebSocket 通讯规范](#websocket-通讯规范)
- [错误码说明](#错误码说明)
- [测试工具](#测试工具)

---

## 🌐 服务器地址

### 基础信息
- **服务器 IP**: `9.129.28.93`
- **HTTP 端口**: `5000`
- **WebSocket 端口**: `5000`
- **协议**: HTTP / WebSocket (ws://)

### 完整地址
| 类型 | 地址 | 说明 |
|------|------|------|
| HTTP API | `http://9.129.28.93:5000` | 所有 REST API |
| WebSocket | `ws://9.129.28.93:5000/ws` | WebSocket 连接端点 |
| 健康检查 | `http://9.129.28.93:5000/api/health` | 检查服务状态 |

---

## 🔄 通讯流程

### 完整流程图
```
┌─────────────┐     1.激活     ┌──────────────┐     2.返回Token    ┌─────────────┐
│     APP     │───────────────>│   激活API     │<───────────────────│     APP     │
│             │                │  /robot-ids/  │                    │             │
└─────────────┘                │   activate   │                    └─────────────┘
                                       │
                                       │ 3.保存Token
                                       ▼
┌─────────────┐     4.连接     ┌──────────────┐     5.验证        ┌─────────────┐
│     APP     │───────────────>│  WebSocket   │<───────────────────│     APP     │
│             │   (带Token)    │     /ws       │                    │             │
└─────────────┘                └──────────────┘                    └─────────────┘
                                       │
                                       │ 6.建立连接
                                       ▼
┌─────────────┐     7.上报     ┌──────────────┐     8.自动回复   ┌─────────────┐
│     APP     │───────────────>│  WebSocket   │───────────────────>│     APP     │
│             │   (消息)       │  (消息处理)   │   (回复)          │             │
└─────────────┘                └──────────────┘                    └─────────────┘
```

### 详细步骤

#### 步骤 1: APP 激活
1. APP 调用激活 API
2. 服务器验证激活码
3. 服务器绑定设备
4. 服务器生成 Token（有效期 24 小时）
5. 服务器返回 Token 和机器人信息

#### 步骤 2: WebSocket 连接
1. APP 使用 Token 连接 WebSocket
2. 服务器验证 Token 有效性
3. 服务器验证设备绑定状态
4. 认证成功，建立持久连接

#### 步骤 3: 消息通讯
1. APP 发送消息（HTTP API 或 WebSocket）
2. 服务器保存消息记录
3. 服务器调用 AI 生成回复
4. 服务器通过 WebSocket 推送回复

---

## 📡 API 接口规范

### 1. 激活接口

#### 请求
```http
POST /api/robot-ids/activate
Content-Type: application/json
```

#### 请求体
```json
{
  "code": "ABC123XYZ",
  "deviceInfo": {
    "deviceId": "unique-device-id-12345",
    "brand": "Xiaomi",
    "model": "Mi 11",
    "os": "Android",
    "osVersion": "12",
    "manufacturer": "Xiaomi",
    "network": "WiFi",
    "appVersion": "1.0.0",
    "totalMemory": 8192,
    "screenResolution": "1080x2400"
  }
}
```

#### 响应
**成功 (200)**:
```json
{
  "code": 200,
  "message": "激活成功",
  "data": {
    "robotId": "bot_abc123xyz",
    "robotUuid": "bot_abc123xyz",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-02-10T19:36:31.790Z",
    "isNewActivation": true
  }
}
```

**错误 (400)**:
```json
{
  "code": 400,
  "message": "激活码无效",
  "data": null
}
```

#### 错误消息
| 错误码 | 消息 | 说明 |
|--------|------|------|
| 400 | 激活码无效 | 激活码不存在 |
| 400 | 激活码已被禁用 | 激活码已禁用 |
| 400 | 激活码已过期 | 激活码已过期 |
| 400 | 激活码使用次数已达上限 | 激活码已用完 |
| 400 | 激活码未绑定机器人 | 激活码无关联机器人 |
| 404 | 机器人不存在 | 机器人已删除 |
| 400 | 该设备已绑定到其他设备 | 需要解绑 |
| 400 | 该机器人已绑定到其他设备 | 需要解绑 |
| 500 | 激活失败 | 服务器错误 |

---

### 2. 消息上报接口

#### 请求
```http
POST /api/messages/report
Content-Type: application/json
Authorization: Bearer {token}
```

#### 请求体
```json
{
  "robotId": "bot_abc123xyz",
  "messageId": "msg_client_12345",
  "messageType": "text",
  "content": "你好，我想咨询一下产品信息",
  "extraData": {
    "media": null,
    "metadata": {}
  },
  "userId": "user_123",
  "sessionId": "session_abc123",
  "timestamp": 1770579378378
}
```

#### 参数说明
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| robotId | string | ✅ | 机器人 ID |
| messageId | string | ✅ | 消息唯一 ID |
| messageType | string | ✅ | 消息类型 (text/image/file/audio/video) |
| content | string | ✅ | 消息内容 |
| extraData | object | ❌ | 附加数据 |
| userId | string | ❌ | 用户 ID |
| sessionId | string | ❌ | 会话 ID（可选，不传自动生成） |
| timestamp | number | ❌ | 消息时间戳 |

#### 响应
**成功 (200)**:
```json
{
  "code": 200,
  "message": "消息上报成功，正在处理自动回复",
  "data": {
    "messageId": 12345,
    "sessionId": "session_abc123",
    "status": "received",
    "autoReply": "processing"
  }
}
```

**错误**:
```json
{
  "code": 404,
  "message": "机器人不存在或未激活"
}
```

---

### 3. 消息发送接口（服务器 -> APP）

此接口由服务器调用，APP 不需要主动调用。服务器会通过 WebSocket 推送消息给 APP。

#### WebSocket 推送消息格式
```json
{
  "type": "message",
  "data": {
    "messageId": 12345,
    "robotId": "bot_abc123xyz",
    "userId": "user_123",
    "sessionId": "session_abc123",
    "messageType": "text",
    "content": "您好！我是您的智能助手，很高兴为您服务。",
    "extraData": {},
    "status": "delivered",
    "direction": "outgoing",
    "replyToMessageId": 12344,
    "timestamp": "2026-02-09T03:36:31.790Z"
  }
}
```

---

## 📡 WebSocket 通讯规范

### 连接端点
```
ws://9.129.28.93:5000/ws?robotId={robotId}&token={token}
```

### 连接参数
| 参数 | 说明 | 示例 |
|------|------|------|
| robotId | 机器人 ID | `bot_abc123xyz` |
| token | 访问令牌 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### 连接流程

#### 1. 建立连接
```
WebSocket URL: ws://9.129.28.93:5000/ws?robotId=bot_abc123xyz&token=xxx
```

#### 2. 认证成功
服务器发送认证成功消息：
```json
{
  "type": "authenticated",
  "data": {
    "authenticated": true,
    "robotId": "bot_abc123xyz",
    "deviceId": "device_12345",
    "userId": 1,
    "timestamp": 1770579378378
  }
}
```

#### 3. 认证失败
服务器发送错误消息并关闭连接：
```json
{
  "type": "error",
  "code": 4001,
  "message": "Token 无效"
}
```

---

### 消息类型

#### 客户端 -> 服务器

##### 1. 心跳消息
```json
{
  "type": "ping",
  "timestamp": 1770579378378
}
```

**响应**:
```json
{
  "type": "pong",
  "timestamp": 1770579378378
}
```

##### 2. 消息上报
```json
{
  "type": "message",
  "data": {
    "messageId": "msg_client_12345",
    "messageType": "text",
    "content": "你好",
    "userId": "user_123",
    "sessionId": "session_abc123"
  }
}
```

**响应**:
```json
{
  "type": "message_ack",
  "messageId": "msg_client_12345",
  "timestamp": 1770579378378
}
```

##### 3. 状态更新
```json
{
  "type": "status",
  "data": {
    "status": "online",
    "battery": 80,
    "network": "wifi",
    "location": "CN-GD"
  }
}
```

**响应**:
```json
{
  "type": "status_ack",
  "timestamp": 1770579378378
}
```

---

#### 服务器 -> 客户端

##### 1. 自动回复
```json
{
  "type": "auto_reply",
  "data": {
    "robotId": "bot_abc123xyz",
    "sessionId": "session_abc123",
    "userId": "user_123",
    "response": "您好！我是您的智能助手。",
    "usedKnowledgeBase": true,
    "timestamp": 1770579378378
  }
}
```

##### 2. 消息推送
```json
{
  "type": "message",
  "data": {
    "messageId": 12345,
    "robotId": "bot_abc123xyz",
    "content": "这是服务器推送的消息",
    "messageType": "text",
    "timestamp": "2026-02-09T03:36:31.790Z"
  }
}
```

##### 3. 心跳检测
服务器会每 30 秒发送一次心跳检测：
```json
{
  "type": "ping",
  "timestamp": 1770579378378
}
```

客户端需在 10 秒内响应：
```json
{
  "type": "pong",
  "timestamp": 1770579378378
}
```

---

### 错误消息格式

```json
{
  "type": "error",
  "code": 4001,
  "message": "错误描述"
}
```

#### WebSocket 错误码
| 错误码 | 消息 | 说明 |
|--------|------|------|
| 4000 | 未知的消息类型 | 收到不支持的消息类型 |
| 4001 | Token 无效 | Token 不存在或已失效 |
| 4006 | 认证超时 | 30 秒内未完成认证 |
| 4007 | Token 已过期 | Token 超过有效期 |
| 4029 | 连接数超限 | 服务器连接数已达上限（100） |

---

## ❌ 错误码说明

### HTTP 状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 业务错误码
| 错误码 | 消息 | HTTP 状态码 |
|--------|------|-------------|
| 400 | 激活码无效 | 400 |
| 400 | 激活码已被禁用 | 400 |
| 400 | 激活码已过期 | 400 |
| 400 | 激活码使用次数已达上限 | 400 |
| 400 | 激活码未绑定机器人 | 400 |
| 404 | 机器人不存在 | 404 |
| 400 | 设备已绑定到其他机器人 | 400 |
| 400 | 机器人已绑定到其他设备 | 400 |
| 500 | 激活失败 | 500 |

---

## 🧪 测试工具

### 1. 激活接口测试

#### 使用 curl
```bash
curl -X POST http://9.129.28.93:5000/api/robot-ids/activate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "YOUR_ACTIVATION_CODE",
    "deviceInfo": {
      "deviceId": "test-device-123",
      "brand": "Test",
      "model": "Test Device",
      "os": "Android",
      "osVersion": "12"
    }
  }'
```

#### 使用 Postman
- **Method**: POST
- **URL**: `http://9.129.28.93:5000/api/robot-ids/activate`
- **Headers**: `Content-Type: application/json`
- **Body** (JSON):
  ```json
  {
    "code": "YOUR_ACTIVATION_CODE",
    "deviceInfo": {
      "deviceId": "test-device-123"
    }
  }
  ```

---

### 2. WebSocket 连接测试

#### 使用 wscat
```bash
# 安装 wscat
npm install -g wscat

# 连接 WebSocket
wscat -c "ws://9.129.28.93:5000/ws?robotId=YOUR_ROBOT_ID&token=YOUR_TOKEN"
```

#### 使用在线工具
- **工具 1**: https://www.piesocket.com/websocket-tester
- **工具 2**: https://websocket.org/echo.html

**配置**:
- WebSocket URL: `ws://9.129.28.93:5000/ws`
- Query Parameters: `robotId={机器人ID}&token={访问令牌}`

---

### 3. 消息上报测试

#### 使用 curl
```bash
curl -X POST http://9.129.28.93:5000/api/messages/report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "robotId": "YOUR_ROBOT_ID",
    "messageId": "test-msg-123",
    "messageType": "text",
    "content": "测试消息"
  }'
```

---

### 4. 健康检查

#### 使用 curl
```bash
curl http://9.129.28.93:5000/api/health
```

**预期响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-09T03:36:31.790Z"
}
```

---

### 5. WebSocket 监控

#### 查看实时连接
```bash
curl http://9.129.28.93:5000/api/websocket/monitor
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "totalConnections": 0,
    "onlineRobots": [],
    "serverStatus": "running",
    "timestamp": "2026-02-08T19:36:31.790Z"
  }
}
```

---

## 📝 注意事项

### 1. Token 管理
- Token 有效期为 **24 小时**
- 建议在 Token 过期前 1 小时重新激活
- 使用 `refreshToken` 可以刷新 Token（待实现）

### 2. WebSocket 连接
- 客户端需要每 30 秒发送一次心跳
- 服务器会在 60 秒无心跳后断开连接
- 最大连接数限制为 **100** 个

### 3. 消息去重
- 使用 `messageId` 进行消息去重
- 重复上报的消息会被服务器忽略

### 4. 会话管理
- `sessionId` 可选，不传会自动生成
- 建议在同一次对话中复用 `sessionId`
- 会话上下文会保存最近 10 条消息

### 5. 网络环境
- 服务器支持 HTTP 和 WebSocket
- 建议使用稳定的网络环境
- WebSocket 断开后应自动重连

---

## 📞 技术支持

### 查看服务器日志
```bash
# 查看实时日志
tail -f /app/work/logs/bypass/dev.log

# 查看 WebSocket 相关日志
tail -f /app/work/logs/bypass/dev.log | grep "\[WebSocket\]"
```

### 诊断 WebSocket 连接
```bash
# 运行诊断脚本
bash scripts/diagnose-websocket.sh
```

### 服务状态检查
```bash
# 检查 HTTP 服务
curl http://9.129.28.93:5000/api/health

# 检查 WebSocket 服务
curl http://9.129.28.93:5000/api/websocket/monitor
```

---

## 📚 相关文档

- [WebSocket 连接问题诊断与解决方案](./WEBSOCKET_CONNECTION_ISSUE.md)
- [WebSocket 连接验证指南](./WEBSOCKET_CONNECTION_GUIDE.md)
- [部署修复文档](./DEPLOYMENT_FIX_V2.md)
- [数据库设计文档](./workbot_database_design.md)

---

## 🚀 快速开始

### APP 端集成步骤

1. **获取激活码**：从管理后台获取激活码
2. **调用激活接口**：使用激活码和设备信息激活
3. **保存 Token**：保存返回的 token 和 robotId
4. **连接 WebSocket**：使用 token 连接 WebSocket
5. **发送/接收消息**：通过 WebSocket 进行实时通讯

### 代码示例（伪代码）

```javascript
// 1. 激活设备
const activateResponse = await fetch('http://9.129.28.93:5000/api/robot-ids/activate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'YOUR_ACTIVATION_CODE',
    deviceInfo: {
      deviceId: getDeviceId(),
      brand: getBrand(),
      model: getModel(),
      os: getOS(),
      osVersion: getOSVersion()
    }
  })
});

const { data } = await activateResponse.json();
const { robotId, token } = data;

// 2. 连接 WebSocket
const ws = new WebSocket(`ws://9.129.28.93:5000/ws?robotId=${robotId}&token=${token}`);

ws.onopen = () => {
  console.log('WebSocket 连接成功');
  
  // 启动心跳
  setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
  }, 30000);
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'authenticated':
      console.log('认证成功', message.data);
      break;
    case 'auto_reply':
      console.log('收到自动回复', message.data);
      // 显示回复给用户
      break;
    case 'pong':
      console.log('心跳响应');
      break;
    case 'error':
      console.error('WebSocket 错误', message);
      break;
  }
};

// 3. 发送消息
function sendMessage(content) {
  fetch('http://9.129.28.93:5000/api/messages/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      robotId,
      messageId: generateMessageId(),
      messageType: 'text',
      content,
      userId: getCurrentUserId(),
      sessionId: getCurrentSessionId()
    })
  });
}
```

---

**最后更新**: 2026-02-09
**版本**: v1.0.0
