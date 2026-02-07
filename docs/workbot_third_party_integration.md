# WorkBot 第三方AI平台集成技术文档

## 📋 文档说明

本文档描述了 WorkBot 系统与第三方 AI 平台（如 Dify、豆包、Coze、自定义 AI 服务等）集成的技术规范。

## 🏗️ 系统架构

```
┌─────────────┐         激活/消息        ┌──────────────┐
│  企业微信APP │ ─────────────────────→ │  WorkBot服务器 │
│  (Android)  │ ←───────────────────────│   (Next.js)  │
└─────────────┘     指令/API响应        └──────┬───────┘
                                                    │
                                         消息转发 │
                                                    ↓
                                          ┌──────────────┐
                                          │ 第三方AI平台 │
                                          │ (Dify/豆包)  │
                                          └──────────────┘
```

## 🔄 通讯流程

### 1. APP 激活流程

**请求**：
```http
POST /api/robot-ids/activate
Content-Type: application/json

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

**响应**（201 - 首次激活）：
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

**响应**（200 - 同设备重复激活）：
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

### 2. 消息回调流程

**WorkBot 服务器 → 第三方 AI 平台**

当 APP 接收到企业微信消息时，WorkBot 服务器会将消息转发到第三方 AI 平台的回调地址。

**请求**（POST）：
```http
POST {第三方回调地址}
Content-Type: application/json

{
  "robotId": "robot_1703123456789_abc123",
  "robotUuid": "550e8400-e29b-41d4-a716-446655440000",
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

**参数说明**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| robotId | string | 是 | 机器人ID |
| robotUuid | string | 是 | 机器人UUID |
| spoken | string | 是 | 问题文本（去掉@机器人） |
| rawSpoken | string | 是 | 原始问题文本 |
| receivedName | string | 是 | 提问者名称 |
| groupName | string | 是 | QA所在群名（群聊） |
| groupRemark | string | 是 | QA所在群备注名 |
| roomType | integer | 是 | 房间类型：1=外部群 2=外部联系人 3=内部群 4=内部联系人 |
| atMe | boolean | 是 | 是否@机器人（群聊） |
| textType | integer | 是 | 消息类型：0=未知 1=文本 2=图片 3=语音 5=视频 7=小程序 8=链接 9=文件 13=合并记录 15=带回复文本 |
| fileBase64 | string | 否 | 图片base64 (png)，仅textType=2时存在 |
| timestamp | string | 是 | 消息时间戳（ISO 8601） |

**响应**：
```json
{
  "code": 0,
  "message": "success"
}
```

**注意**：
- 回调接口必须在 **3秒内** 响应，否则平台将放弃本次请求
- 如果接口处理耗时较长，应立即响应（200），处理消息后异步调用发送消息接口

### 3. AI 回复下发流程

**第三方 AI 平台 → WorkBot 服务器 → APP**

第三方 AI 平台处理完消息后，需要调用 WorkBot 服务器的接口来发送回复。

WorkBot 服务器提供两种方式：

#### 方式一：第三方直接调用 WorkBot 指令接口（推荐）

WorkBot 服务器提供 REST API 供第三方平台调用：

```http
POST /api/robot/send-message
Content-Type: application/json
Authorization: Bearer {robot_token}

{
  "robotId": "robot_1703123456789_abc123",
  "type": "text",
  "titleList": ["张三", "测试群1"],
  "content": "你好！我是AI助手，很高兴为您服务~",
  "atList": ["张三"]
}
```

**参数说明**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| robotId | string | 是 | 机器人ID |
| type | string | 是 | 消息类型：text, image, video, file, link, mini_program |
| titleList | array | 是 | 接收者列表（昵称或群名） |
| content | string | 是 | 消息内容（文本类型） |
| atList | array | 否 | @的人名列表（at所有人用"@所有人"） |
| fileUrl | string | 否 | 文件URL（文件类型） |
| fileType | string | 否 | 文件类型（image/audio/video/*） |
| objectName | string | 否 | 文件名（微盘文件） |

**响应**：
```json
{
  "code": 0,
  "message": "指令已下发",
  "data": {
    "messageId": "msg_1703123456789_abc123",
    "status": "pending"
  }
}
```

#### 方式二：第三方 AI 平台提供 Webhook，WorkBot 拉取回复

第三方 AI 平台提供 Webhook 地址，WorkBot 服务器主动拉取回复：

```http
GET {第三方Webhook地址}?robotId={robotId}&messageId={messageId}
```

### 4. 指令执行结果回调

**APP → WorkBot 服务器 → 第三方 AI 平台**

WorkBot 服务器会将指令执行结果回调给第三方 AI 平台（如果配置了回调地址）。

**请求**：
```http
POST {第三方回调地址}
Content-Type: application/json

{
  "robotId": "robot_1703123456789_abc123",
  "messageId": "msg_1703123456789_abc123",
  "errorCode": 0,
  "errorReason": "",
  "runTime": 1666238534935,
  "timeCost": 2.5,
  "type": 203,
  "rawMsg": "{\"type\":203,\"titleList\":[\"张三\"],\"receivedContent\":\"你好~\"}",
  "successList": ["张三"],
  "failList": []
}
```

**错误码说明**：

| 错误码 | 说明 |
|--------|------|
| 0 | 执行成功 |
| 101011 | 数据格式错误 |
| 101012 | 非法操作 |
| 101013 | 非法权限 |
| 201011 | 创建群失败 |
| 201012 | 群改名失败 |
| 201013 | 群拉人失败 |
| 201014 | 群踢人失败 |
| 201101 | 查找聊天窗失败 |
| 201102 | 发送消息失败 |

## 🔐 安全机制

### 1. Token 认证

所有 API 请求都需要在 Header 中携带 Token：

```http
Authorization: Bearer {access_token}
```

### 2. 回调签名验证（可选）

为了防止恶意请求，可以开启回调签名验证：

```typescript
// WorkBot 服务器计算签名
const signature = crypto
  .createHmac('sha256', ROBOT_SECRET_KEY)
  .update(JSON.stringify(payload))
  .digest('hex');

// 在请求头中携带
X-Signature: {signature}
```

第三方平台收到请求后验证签名：

```typescript
const expectedSignature = crypto
  .createHmac('sha256', ROBOT_SECRET_KEY)
  .update(JSON.stringify(requestBody))
  .digest('hex');

if (signature !== expectedSignature) {
  // 拒绝请求
}
```

## 📊 消息类型说明

### 支持的消息类型

| type值 | 名称 | 说明 |
|--------|------|------|
| 203 | 文本消息 | 发送文本内容 |
| 218 | 文件消息 | 发送图片/视频/文件（网络URL） |
| 208 | 微盘图片 | 发送微盘中的图片 |
| 209 | 微盘文件 | 发送微盘中的文件 |
| 205 | 转发消息 | 转发小程序消息 |
| 206 | 创建群 | 创建外部群并拉人 |
| 207 | 修改群信息 | 修改群名、公告、成员等 |
| 219 | 解散群 | 解散指定群（需群主权限） |
| 213 | 添加好友 | 按手机号或群成员添加好友 |
| 220 | 群成员加好友 | 从外部群添加好友 |
| 225 | 修改群成员备注 | 修改群成员备注名 |
| 221 | 添加待办 | 给内部成员添加待办 |
| 226 | 撤回消息 | 撤回机器人发送的消息 |
| 234 | 删除联系人 | 删除指定联系人 |
| 304 | 清空客户端指令 | 清空所有待执行指令 |
| 305 | 清除指定指令 | 清除指定messageId的指令 |
| 512 | 获取群成员信息 | 获取指定群的成员列表 |

### 消息类型定义（textType）

| 值 | 类型 |
|----|------|
| 0 | 未知 |
| 1 | 文本 |
| 2 | 图片 |
| 3 | 语音 |
| 5 | 视频 |
| 7 | 小程序 |
| 8 | 链接 |
| 9 | 文件 |
| 13 | 合并记录 |
| 15 | 带回复文本 |

## 🚦 频率限制

- **API 请求频率**：60 QPM（每分钟60次请求）
- **回调接口超时**：3秒
- **超出限制**：返回 429 错误

## 🔧 配置管理

### 机器人配置接口

WorkBot 服务器提供管理接口，用于配置第三方 AI 平台的回调地址。

**设置消息回调**：
```http
POST /api/robot/robotInfo/update
Content-Type: application/json

{
  "robotId": "robot_1703123456789_abc123",
  "openCallback": 1,
  "replyAll": 1,
  "callbackUrl": "https://api.third-party.com/callback"
}
```

**参数说明**：
- `openCallback`：是否开启QA回调（0=关闭，1=开启）
- `replyAll`：回复策略
- `callbackUrl`：第三方回调地址

**设置指令结果回调**：
```http
POST /api/robot/robotInfo/callBack/bind
Content-Type: application/json

{
  "robotId": "robot_1703123456789_abc123",
  "type": 1,
  "callBackUrl": "https://api.third-party.com/result-callback"
}
```

**回调类型说明**：
- 0：群二维码回调
- 1：指令结果回调
- 5：机器人上线回调
- 6：机器人下线回调

## 📝 完整示例

### 示例1：文本消息处理流程

```typescript
// 1. APP 收到企业微信消息，发送到 WorkBot 服务器
POST /api/robot/messages
{
  "robotId": "robot_1703123456789_abc123",
  "spoken": "你好",
  "rawSpoken": "@机器人 你好",
  "receivedName": "张三",
  "groupName": "测试群1",
  "roomType": 1,
  "atMe": true,
  "textType": 1
}

// 2. WorkBot 服务器转发消息到第三方 AI 平台
POST https://api.third-party.com/callback
{
  "robotId": "robot_1703123456789_abc123",
  "spoken": "你好",
  "rawSpoken": "@机器人 你好",
  "receivedName": "张三",
  "groupName": "测试群1",
  "roomType": 1,
  "atMe": true,
  "textType": 1,
  "timestamp": "2024-12-01T10:30:00Z"
}
// 响应：{"code": 0, "message": "success"}

// 3. 第三方 AI 平台处理完消息，调用 WorkBot 服务器发送回复
POST /api/robot/send-message
Authorization: Bearer {token}
{
  "robotId": "robot_1703123456789_abc123",
  "type": "text",
  "titleList": ["测试群1"],
  "content": "你好！我是AI助手，很高兴为您服务~"
}
// 响应：{"code": 0, "message": "指令已下发", "data": {"messageId": "msg_xxx"}}

// 4. WorkBot 服务器将指令下发给 APP

// 5. APP 执行指令，发送消息到企业微信

// 6. WorkBot 服务器回调执行结果给第三方 AI 平台
POST https://api.third-party.com/result-callback
{
  "robotId": "robot_1703123456789_abc123",
  "messageId": "msg_xxx",
  "errorCode": 0,
  "errorReason": "",
  "runTime": 1666238534935,
  "timeCost": 2.5,
  "type": 203,
  "successList": ["测试群1"],
  "failList": []
}
```

### 示例2：图片消息处理流程

```typescript
// 1. APP 收到企业微信图片消息
POST /api/robot/messages
{
  "robotId": "robot_1703123456789_abc123",
  "spoken": "",
  "rawSpoken": "",
  "receivedName": "张三",
  "groupName": "测试群1",
  "roomType": 1,
  "atMe": true,
  "textType": 2,
  "fileBase64": "iVBORw0KGgoAAAANSUhEUgAA..."
}

// 2. WorkBot 服务器转发消息到第三方 AI 平台
POST https://api.third-party.com/callback
{
  "robotId": "robot_1703123456789_abc123",
  "spoken": "",
  "rawSpoken": "",
  "receivedName": "张三",
  "groupName": "测试群1",
  "roomType": 1,
  "atMe": true,
  "textType": 2,
  "fileBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "timestamp": "2024-12-01T10:30:00Z"
}

// 3. 第三方 AI 平台识别图片，返回回复（包含图片）
POST /api/robot/send-message
Authorization: Bearer {token}
{
  "robotId": "robot_1703123456789_abc123",
  "type": "image",
  "titleList": ["测试群1"],
  "fileUrl": "https://cdn.example.com/reply.jpg",
  "fileType": "image",
  "extraText": "这是我的回复"
}
```

## ⚠️ 注意事项

1. **回调超时**：消息回调接口必须在 3 秒内响应
2. **异步处理**：如果处理耗时较长，应立即响应，异步调用发送接口
3. **保留字**：减号 `-`、空格、英文括号 `()` 和 `@` 符号为保留字，请勿在人名/群名/备注名中使用
4. **群名长度**：群名定义尽量短，一般不要超过 12 个汉字
5. **备注名优先**：如果好友/群名有备注名，优先使用备注名
6. **@所有人**：@所有人需要群主或群管理员权限
7. **图片格式**：图片格式不支持 webp
8. **文件大小**：避免频繁发送大文件（>10M）
9. **错误重试**：WorkBot 不会对失败的回调进行重试，请第三方平台自行处理

## 🔗 相关文档

- [WorkBot 激活接口文档](./activation_code_logic.md)
- [WorkBot 数据库设计](./workbot_database_design.md)
- [WorkBot 系统架构](./workbot_final_requirements_v2.md)
