# WorkBot 服务器 API 接口文档

## 基础信息

- **Base URL**：`https://your-domain.coze.site`
- **API 版本**：v1.0
- **数据格式**：JSON
- **字符编码**：UTF-8
- **认证方式**：Bearer Token

## 通用说明

### 请求头

```http
Content-Type: application/json
Authorization: Bearer {token}
```

### 响应格式

**成功响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

**错误响应**：
```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

### 通用错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 一、用户管理

### 1.1 发送短信验证码

```http
POST /api/user/send-sms
```

**请求参数**：
```json
{
  "phone": "13800000000"
}
```

**响应**：
```json
{
  "code": 0,
  "message": "验证码已发送",
  "data": {
    "expiresIn": 300
  }
}
```

### 1.2 手机号登录/注册

```http
POST /api/user/login
```

**请求参数**：
```json
{
  "phone": "13800000000",
  "code": "123456"
}
```

**响应**：
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "userId": 1,
    "nickname": "张三",
    "avatar": "https://cdn.example.com/avatar.jpg",
    "phone": "13800000000",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 1.3 获取用户信息

```http
GET /api/user/info
Authorization: Bearer {token}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 1,
    "nickname": "张三",
    "avatar": "https://cdn.example.com/avatar.jpg",
    "phone": "13800000000",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 二、激活管理

### 2.1 激活设备

```http
POST /api/robot-ids/activate
```

**请求参数**：
```json
{
  "code": "3CQ4Z9LE",
  "deviceInfo": {
    "deviceId": "9774d56d682e549c",
    "brand": "Xiaomi",
    "model": "Mi 10",
    "os": "Android",
    "osVersion": "13",
    "manufacturer": "Xiaomi",
    "network": "WiFi",
    "appVersion": "3.0.1",
    "totalMemory": 8192,
    "screenResolution": "1080x2400"
  }
}
```

**响应（201 - 首次激活）**：
```json
{
  "code": 201,
  "message": "激活成功",
  "data": {
    "robotId": "robot_1703123456789_abc123",
    "robotUuid": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-01-30T12:00:00.000Z",
    "isNewActivation": true
  }
}
```

**响应（200 - 同设备重复激活）**：
```json
{
  "code": 200,
  "message": "激活成功（已更新Token）",
  "data": {
    "robotId": "robot_1703123456789_abc123",
    "robotUuid": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-01-30T12:00:00.000Z",
    "isNewActivation": false
  }
}
```

**响应（409 - 激活码已被其他设备使用）**：
```json
{
  "code": 409,
  "message": "激活码已被其他设备使用，请联系管理员解绑",
  "data": {
    "existingDeviceId": "other-device-id",
    "existingRobotId": "robot_xxx",
    "activatedAt": "2024-12-01T10:00:00.000Z"
  }
}
```

### 2.2 刷新Token

```http
POST /api/robot/refresh-token
```

**请求参数**：
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-01-30T12:00:00.000Z"
  }
}
```

---

## 三、机器人管理

### 3.1 获取机器人列表

```http
GET /api/robots
Authorization: Bearer {token}
```

**查询参数**：
- `page`：页码（默认1）
- `pageSize`：每页数量（默认20）
- `status`：状态筛选（online/offline/deleted）

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 30,
    "list": [
      {
        "robotId": "robot_1703123456789_abc123",
        "name": "客服机器人1",
        "status": "online",
        "aiMode": "builtin",
        "aiProvider": "doubao",
        "totalMessages": 1523,
        "aiCallsToday": 45,
        "lastActiveAt": "2024-12-01T10:30:00Z",
        "deviceInfo": {
          "deviceId": "9774d56d682e549c",
          "brand": "Xiaomi",
          "model": "Mi 10"
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 3.2 获取机器人详情

```http
GET /api/robots/{robotId}
Authorization: Bearer {token}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "robotId": "robot_1703123456789_abc123",
    "robotUuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "客服机器人1",
    "status": "online",
    "aiMode": "builtin",
    "aiProvider": "doubao",
    "aiModel": "doubao-pro-32k",
    "aiTemperature": 0.7,
    "aiMaxTokens": 2000,
    "aiContextLength": 10,
    "aiScenario": "咨询",
    "totalMessages": 1523,
    "aiCallsToday": 45,
    "lastActiveAt": "2024-12-01T10:30:00Z",
    "deviceInfo": {
      "deviceId": "9774d56d682e549c",
      "brand": "Xiaomi",
      "model": "Mi 10",
      "os": "Android",
      "osVersion": "13"
    },
    "activationInfo": {
      "code": "3CQ4Z9LE",
      "firstActivatedAt": "2024-01-01T00:00:00Z",
      "lastActivatedAt": "2024-12-01T10:30:00Z"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 3.3 创建机器人

```http
POST /api/robots
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "name": "客服机器人1",
  "aiMode": "builtin",
  "aiProvider": "doubao",
  "aiModel": "doubao-pro-32k",
  "aiTemperature": 0.7,
  "aiMaxTokens": 2000,
  "aiContextLength": 10,
  "aiScenario": "咨询"
}
```

**响应**：
```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "robotId": "robot_1703123456789_abc123",
    "name": "客服机器人1"
  }
}
```

### 3.4 更新机器人配置

```http
PUT /api/robots/{robotId}
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "name": "客服机器人1（更新）",
  "aiMode": "third_party",
  "aiProvider": "dify",
  "aiTemperature": 0.8,
  "aiMaxTokens": 3000,
  "replyDelayMin": 2,
  "replyDelayMax": 5,
  "aiCallLimitDaily": 2000
}
```

**响应**：
```json
{
  "code": 0,
  "message": "更新成功",
  "data": null
}
```

### 3.5 删除机器人

```http
DELETE /api/robots/{robotId}
Authorization: Bearer {token}
```

**响应**：
```json
{
  "code": 0,
  "message": "删除成功",
  "data": null
}
```

---

## 四、消息处理

### 4.1 APP上报消息

```http
POST /api/robot/messages
Authorization: Bearer {robot_token}
```

**请求参数**：
```json
{
  "robotId": "robot_1703123456789_abc123",
  "spoken": "你好啊",
  "rawSpoken": "@机器人 你好啊",
  "receivedName": "张三",
  "groupName": "测试群1",
  "groupRemark": "测试群1备注名",
  "roomType": 1,
  "atMe": true,
  "textType": 1,
  "fileBase64": "iVBORxxx==",
  "timestamp": "2024-12-01T10:30:00Z"
}
```

**响应**：
```json
{
  "code": 0,
  "message": "消息已接收",
  "data": {
    "messageId": "msg_1703123456789_abc123"
  }
}
```

### 4.2 发送消息到企业微信

```http
POST /api/robot/send-message
Authorization: Bearer {token}
```

**请求参数（文本消息）**：
```json
{
  "robotId": "robot_1703123456789_abc123",
  "type": "text",
  "titleList": ["张三", "测试群1"],
  "content": "你好！我是AI助手，很高兴为您服务~",
  "atList": ["张三"]
}
```

**请求参数（图片消息）**：
```json
{
  "robotId": "robot_1703123456789_abc123",
  "type": "image",
  "titleList": ["测试群1"],
  "fileUrl": "https://cdn.example.com/image.jpg",
  "fileType": "image",
  "objectName": "reply.jpg",
  "extraText": "这是图片回复"
}
```

**请求参数（文件消息）**：
```json
{
  "robotId": "robot_1703123456789_abc123",
  "type": "file",
  "titleList": ["张三"],
  "fileUrl": "https://cdn.example.com/file.pdf",
  "fileType": "*",
  "objectName": "document.pdf"
}
```

**响应**：
```json
{
  "code": 0,
  "message": "指令已下发",
  "data": {
    "commandId": "cmd_1703123456789_abc123",
    "status": "pending"
  }
}
```

### 4.3 获取待执行指令

```http
GET /api/robot/commands?robotId={robotId}
Authorization: Bearer {robot_token}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "commands": [
      {
        "commandId": "cmd_1703123456789_abc123",
        "commandType": "send_message",
        "commandParams": {
          "type": "text",
          "titleList": ["张三"],
          "content": "你好！"
        },
        "createdAt": "2024-12-01T10:30:00Z"
      }
    ]
  }
}
```

### 4.4 上报指令执行结果

```http
POST /api/robot/command-result
Authorization: Bearer {robot_token}
```

**请求参数**：
```json
{
  "robotId": "robot_1703123456789_abc123",
  "commandId": "cmd_1703123456789_abc123",
  "errorCode": 0,
  "errorReason": "",
  "executionTimeMs": 2500,
  "successList": ["张三"],
  "failList": []
}
```

**响应**：
```json
{
  "code": 0,
  "message": "结果已记录",
  "data": null
}
```

---

## 五、第三方集成

### 5.1 配置第三方回调

```http
POST /api/robot/third-party/config
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "robotId": "robot_1703123456789_abc123",
  "messageCallbackUrl": "https://api.third-party.com/callback",
  "resultCallbackUrl": "https://api.third-party.com/result",
  "enableSignature": true,
  "secretKey": "your-secret-key"
}
```

**响应**：
```json
{
  "code": 0,
  "message": "配置成功",
  "data": null
}
```

### 5.2 获取第三方配置

```http
GET /api/robot/third-party/config/{robotId}
Authorization: Bearer {token}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "robotId": "robot_1703123456789_abc123",
    "messageCallbackUrl": "https://api.third-party.com/callback",
    "resultCallbackUrl": "https://api.third-party.com/result",
    "enableSignature": true,
    "isActive": true
  }
}
```

### 5.3 第三方发送消息（供第三方调用）

```http
POST /api/robot/send-message
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "robotId": "robot_1703123456789_abc123",
  "type": "text",
  "titleList": ["张三"],
  "content": "你好！",
  "atList": []
}
```

**响应**：
```json
{
  "code": 0,
  "message": "指令已下发",
  "data": {
    "commandId": "cmd_1703123456789_abc123",
    "status": "pending"
  }
}
```

---

## 六、激活码管理（管理员）

### 6.1 生成激活码

```http
POST /api/admin/activation-codes
Authorization: Bearer {admin_token}
```

**请求参数**：
```json
{
  "count": 10,
  "validityPeriod": 30,
  "boundUserId": 1
}
```

**响应**：
```json
{
  "code": 0,
  "message": "生成成功",
  "data": {
    "codes": [
      {
        "code": "ABCD1234",
        "status": "unused",
        "validityPeriod": 30,
        "price": 50.00,
        "createdAt": "2024-12-01T10:00:00Z"
      },
      {
        "code": "ABCD1235",
        "status": "unused",
        "validityPeriod": 30,
        "price": 50.00,
        "createdAt": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

### 6.2 获取激活码列表

```http
GET /api/admin/activation-codes?page=1&pageSize=20&status=unused
Authorization: Bearer {admin_token}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 100,
    "list": [
      {
        "code": "3CQ4Z9LE",
        "status": "used",
        "validityPeriod": 30,
        "price": 50.00,
        "boundUser": {
          "userId": 1,
          "nickname": "张三",
          "phone": "13800000000"
        },
        "deviceInfo": {
          "deviceId": "9774d56d682e549c",
          "brand": "Xiaomi",
          "model": "Mi 10"
        },
        "firstActivatedAt": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

### 6.3 解绑设备

```http
POST /api/admin/unbind-device
Authorization: Bearer {admin_token}
```

**请求参数**：
```json
{
  "code": "3CQ4Z9LE",
  "reason": "用户更换设备",
  "adminId": 1
}
```

**响应**：
```json
{
  "code": 0,
  "message": "解绑成功",
  "data": {
    "deviceId": "9774d56d682e549c",
    "robotId": "robot_1703123456789_abc123",
    "unboundAt": "2024-12-01T10:30:00Z"
  }
}
```

### 6.4 禁用激活码

```http
POST /api/admin/activation-codes/{code}/disable
Authorization: Bearer {admin_token}
```

**响应**：
```json
{
  "code": 0,
  "message": "禁用成功",
  "data": null
}
```

---

## 七、用户管理（管理员）

### 7.1 获取用户列表

```http
GET /api/admin/users?page=1&pageSize=20&role=user
Authorization: Bearer {admin_token}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 100,
    "list": [
      {
        "userId": 1,
        "nickname": "张三",
        "avatar": "https://cdn.example.com/avatar.jpg",
        "phone": "13800000000",
        "role": "user",
        "status": "active",
        "robotCount": 5,
        "totalActivationCodes": 10,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastLoginAt": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

### 7.2 禁用用户

```http
POST /api/admin/users/{userId}/disable
Authorization: Bearer {admin_token}
```

**响应**：
```json
{
  "code": 0,
  "message": "禁用成功",
  "data": null
}
```

---

## 八、统计与分析

### 8.1 获取机器人统计数据

```http
GET /api/robots/{robotId}/statistics?startDate=2024-12-01&endDate=2024-12-31
Authorization: Bearer {token}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalMessages": 1523,
    "totalAICalls": 1523,
    "avgResponseTime": 2.5,
    "successRate": 99.5,
    "topContacts": [
      {
        "name": "张三",
        "messageCount": 120
      },
      {
        "name": "李四",
        "messageCount": 85
      }
    ],
    "topGroups": [
      {
        "name": "测试群1",
        "messageCount": 500
      }
    ]
  }
}
```

### 8.2 获取用户统计数据

```http
GET /api/user/statistics?startDate=2024-12-01&endDate=2024-12-31
Authorization: Bearer {token}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalRobots": 5,
    "totalMessages": 5000,
    "totalAICalls": 5000,
    "aiCost": 125.50,
    "activationCodeCount": 10,
    "activeRobots": 3
  }
}
```

---

## 九、系统日志

### 9.1 获取日志列表

```http
GET /api/admin/logs?logType=api&level=error&page=1&pageSize=20
Authorization: Bearer {admin_token}
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 100,
    "list": [
      {
        "id": 1,
        "logType": "api",
        "level": "error",
        "message": "激活码不存在",
        "details": {
          "code": "INVALID_CODE",
          "requestId": "req_xxx"
        },
        "ipAddress": "1.2.3.4",
        "createdAt": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

---

## 十、WebSocket连接

### 连接地址

```
wss://your-domain.coze.site/ws?robotId={robotId}&token={token}
```

### 心跳机制

**客户端发送**：
```json
{
  "type": "ping"
}
```

**服务器响应**：
```json
{
  "type": "pong",
  "timestamp": 1703123456789
}
```

### 指令推送

**服务器推送**：
```json
{
  "type": "command",
  "data": {
    "commandId": "cmd_1703123456789_abc123",
    "commandType": "send_message",
    "commandParams": {
      "type": "text",
      "titleList": ["张三"],
      "content": "你好！"
    },
    "createdAt": "2024-12-01T10:30:00Z"
  }
}
```

---

## 限流策略

- **所有API请求**：60 QPM（每分钟60次请求）
- **超出限制**：返回 429 错误

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "code": 429,
  "message": "请求过于频繁，请稍后重试",
  "data": {
    "retryAfter": 60
  }
}
```

---

## 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 0 | 成功 | - |
| 400 | 参数错误 | 检查请求参数格式和必填项 |
| 401 | 未授权 | 检查Token是否有效 |
| 403 | 禁止访问 | 检查权限和资源状态 |
| 404 | 资源不存在 | 检查资源ID是否正确 |
| 409 | 资源冲突 | 激活码已被其他设备使用 |
| 429 | 请求过于频繁 | 等待后重试 |
| 500 | 服务器内部错误 | 联系管理员 |

---

## 相关文档

- [WorkBot 最终需求文档 v2.0](./workbot_final_requirements_v2.md)
- [WorkBot 数据库设计文档](./workbot_database_design.md)
- [WorkBot 第三方集成文档](./workbot_third_party_integration.md)
- [WorkBot 激活码逻辑文档](./activation_code_logic.md)
