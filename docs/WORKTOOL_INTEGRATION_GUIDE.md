# WorkTool 集成指南

本文档说明如何将 WorkBot 系统与第三方平台（如 WorkTool）集成。

## 概述

WorkBot 提供了完整的第三方集成能力，支持：
- **消息回调**：接收 APP 上报的消息
- **发送消息**：第三方通过 API 向机器人发送消息
- **状态管理**：管理机器人的在线/离线状态
- **命令执行**：查询命令执行状态

## 认证方式

### 激活与 Token 获取

1. **激活机器人**：
   ```bash
   POST /api/robot-ids/activate
   {
     "code": "ABC12345",
     "deviceInfo": { ... }
   }
   ```

2. **获取 Access Token**：
   激活成功后返回：
   ```json
   {
     "accessToken": "xxx",
     "expiresIn": 86400
   }
   ```

### WebSocket 连接认证

**重要**：WorkBot 使用**消息认证**而非 URL 参数认证。

**连接步骤**：

1. **建立连接**（不带参数）：
   ```javascript
   const ws = new WebSocket("wss://your-domain.com/ws");
   ```

2. **发送认证消息**：
   ```javascript
   ws.send(JSON.stringify({
     type: "authenticate",
     data: {
       robotId: "xxx",
       token: "xxx",
       timestamp: 1234567890
     }
   }));
   ```

3. **接收认证结果**：
   ```javascript
   ws.on('message', (data) => {
     const message = JSON.parse(data);
     if (message.type === 'authenticated') {
       console.log('认证成功:', message.data);
     }
   });
   ```

## API 接口

### 1. 消息回调接口

**接口**：`POST /api/worktool/callback`

**参数**：
- `robotId` (query): 机器人 ID
- `type` (query): 回调类型 (`message`, `result`, `qrcode`, `online`, `offline`, `image`)

**请求体示例**（消息回调）：
```json
{
  "messageId": "msg-1770341503000-abc123",
  "senderId": "wxid-xxx",
  "senderName": "张三",
  "messageType": "text",
  "content": "你好，在吗？",
  "chatType": "single",
  "extraData": null,
  "timestamp": "2026-02-06T10:05:03.000Z"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "消息接收成功",
  "data": {
    "messageId": "msg-1770341503000-abc123",
    "robotId": "RBml9n7nikHIMZU0",
    "receivedAt": "2026-02-06T10:05:03.000Z"
  }
}
```

### 2. 发送消息接口

**接口**：`POST /api/worktool/sendMessage`

**请求头**：
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**：
```json
{
  "robotId": "RBml9n7nikHIMZU0",
  "commandType": "send_message",
  "params": {
    "target": "张三",
    "content": "你好！",
    "messageType": "text"
  }
}
```

**响应**：
```json
{
  "success": true,
  "code": 0,
  "data": {
    "commandId": "cmd-001",
    "status": "pending",
    "createdAt": "2026-02-06T10:00:00.000Z"
  }
}
```

### 3. 查询命令状态

**接口**：`GET /api/worktool/commands/{commandId}`

**请求头**：
```
Authorization: Bearer {token}
```

**响应**：
```json
{
  "success": true,
  "code": 0,
  "data": {
    "commandId": "cmd-001",
    "robotId": "RBml9n7nikHIMZU0",
    "commandType": "send_message",
    "status": "success",
    "result": {
      "messageId": "msg-002"
    },
    "createdAt": "2026-02-06T10:00:00.000Z",
    "executedAt": "2026-02-06T10:00:05.000Z"
  }
}
```

## 消息处理优先级

WorkBot 支持两种消息处理模式：

### 1. 第三方回调模式（优先级最高）

**配置方式**：
在 `robots` 表中设置 `third_party_callback_url`。

**处理流程**：
1. APP 上报消息到服务器
2. 服务器保存消息到数据库
3. 服务器转发消息到第三方回调 URL
4. 第三方处理消息后，通过发送消息接口回复

**数据库字段**：
```sql
UPDATE robots
SET third_party_callback_url = 'https://third-party.com/api/callback',
    third_party_callback_secret_key = 'your-secret-key'
WHERE robot_id = 'xxx';
```

### 2. 内置 AI 模式

**配置方式**：
在 `robots` 表中设置 `ai_mode = 'builtin'`。

**处理流程**：
1. APP 上报消息到服务器
2. 服务器保存消息到数据库
3. 服务器调用内置 AI 生成回复
4. 服务器通过 WebSocket 发送回复给 APP

**优先级规则**：
- 如果配置了 `third_party_callback_url`，优先使用第三方回调
- 否则，如果 `ai_mode = 'builtin'`，使用内置 AI
- 否则，仅保存消息，不自动回复

## 签名验证（可选）

为了确保回调请求的安全性，WorkBot 支持 HMAC-SHA256 签名验证。

**签名计算**：
```javascript
const crypto = require('crypto');
const robotId = 'xxx';
const body = { ... };
const timestamp = Date.now().toString();
const secret = 'your-secret-key';

const payload = `${robotId}:${JSON.stringify(body)}:${timestamp}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');
```

**请求头**：
```
X-Robot-Id: {robotId}
X-Timestamp: {timestamp}
X-Signature: {signature}
```

## 测试工具

WorkBot 提供了集成测试工具 `scripts/test-worktool-integration.sh`。

**使用方法**：
```bash
# 设置环境变量
export BASE_URL="http://localhost:5000"
export ROBOT_ID="RBml9n7nikHIMZU0"
export ACCESS_TOKEN="your-access-token"

# 运行测试
bash scripts/test-worktool-integration.sh
```

**测试内容**：
1. 消息回调接口
2. 状态回调接口（在线）
3. 二维码回调接口
4. 发送消息接口
5. 查询命令状态接口

## WebSocket 消息类型

### 客户端 → 服务器

| type | 说明 | 参数 |
|-----|------|------|
| authenticate | 认证 | robotId, token, timestamp |
| ping | 心跳 | - |
| message | 消息上报 | messageId, content, senderId, ... |
| status | 状态更新 | status, deviceInfo |

### 服务器 → 客户端

| type | 说明 |
|-----|------|
| authenticated | 认证结果 |
| pong | 心跳响应 |
| message_ack | 消息确认 |
| status_ack | 状态确认 |
| command | 命令下发 |
| error | 错误消息 |

## 常见问题

### 1. 认证失败

**错误**：`Token 无效` 或 `Token 已过期`

**解决**：
- 检查 Token 是否正确
- 检查 Token 是否过期（默认 24 小时）
- 重新激活机器人获取新 Token

### 2. WebSocket 连接失败

**错误**：`认证超时`

**解决**：
- 确保在连接后 30 秒内发送认证消息
- 检查 `authenticate` 消息格式是否正确
- 检查 `robotId` 和 `token` 是否正确

### 3. 消息未转发到第三方

**原因**：
- 未配置 `third_party_callback_url`
- 第三方回调地址不可访问

**解决**：
- 在数据库中配置 `third_party_callback_url`
- 检查第三方回调地址是否可访问
- 检查网络连接

## 数据库表结构

### robots 表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | serial | 主键 |
| robot_id | varchar | 机器人 ID |
| ai_mode | varchar | AI 模式 (builtin, third_party) |
| third_party_callback_url | text | 第三方回调 URL |
| third_party_callback_secret_key | text | 第三方回调密钥 |
| online_status | varchar | 在线状态 (online, offline) |

### messages 表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | serial | 主键 |
| robot_id | varchar | 机器人 ID |
| spoken | text | 消息内容 |
| raw_spoken | text | 原始消息内容 |
| sender_id | varchar | 发送者 ID |
| sender_name | varchar | 发送者名称 |
| group_name | varchar | 群名称 |
| room_type | varchar | 聊天类型 (single, group) |
| message_type | varchar | 消息类型 |
| timestamp | timestamp | 消息时间戳 |

### commands 表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | varchar | 命令 ID |
| robot_id | varchar | 机器人 ID |
| command_type | varchar | 命令类型 |
| params | json | 命令参数 |
| status | varchar | 状态 (pending, success, failed) |
| result | json | 执行结果 |
| created_at | timestamp | 创建时间 |
| executed_at | timestamp | 执行时间 |

## 开发调试

### 查看日志

```bash
# 查看应用日志
tail -f /app/work/logs/bypass/app.log

# 查看开发日志
tail -f /app/work/logs/bypass/dev.log
```

### WebSocket 调试

```bash
# 使用 wscat 工具测试 WebSocket 连接
npm install -g wscat

# 连接 WebSocket
wscat -c "ws://localhost:5000/ws"

# 发送认证消息
> {"type":"authenticate","data":{"robotId":"xxx","token":"xxx","timestamp":1234567890}}
```

## 联系支持

如有问题，请联系技术支持团队。
