# WorkBot APP 通讯技术文档 v3.0

**版本**: v3.0
**更新日期**: 2026-02-09
**服务器**: `wss://gbdvprr2vy.coze.site`

---

## 📋 目录

1. [概览](#概览)
2. [服务器配置](#服务器配置)
3. [通讯架构](#通讯架构)
4. [认证流程](#认证流程)
5. [API 接口](#api-接口)
6. [WebSocket 通讯规范](#websocket-通讯规范)
7. [消息类型详解](#消息类型详解)
8. [错误处理](#错误处理)
9. [客户端实现示例](#客户端实现示例)
10. [测试指南](#测试指南)
11. [故障排查](#故障排查)
12. [附录](#附录)

---

## 概览

### 系统简介

WorkBot 是一个企业级智能机器人管理系统，支持多平台接入（企业微信、微信、小程序）。本文档描述 APP 端如何与服务器进行通讯，包括设备激活、WebSocket 连接、消息收发等功能。

### 核心特性

- ✅ **消息认证模式**: 符合 WebSocket v3.0 规范，使用消息认证而非 URL 参数
- ✅ **加密连接**: 支持 WSS/HTTPS 安全传输
- ✅ **自动重连**: 连接断开时自动重连，最大 5 次
- ✅ **心跳保活**: 30 秒心跳间隔，60 秒超时检测
- ✅ **指令推送**: 支持服务器主动推送指令
- ✅ **自动回复**: 消息上报后自动生成 AI 回复

---

## 服务器配置

### 基础信息

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **服务器域名** | `gbdvprr2vy.coze.site` | Coze 托管域名 |
| **HTTP 协议** | `https://` | 加密 HTTP |
| **WebSocket 协议** | `wss://` | 加密 WebSocket |
| **端口** | `443` | HTTPS/WSS 默认端口 |
| **API 路径** | `/api/*` | REST API 前缀 |
| **WS 路径** | `/ws` | WebSocket 端点 |

### 完整地址

| 类型 | 地址 | 说明 |
|------|------|------|
| **HTTP API** | `https://gbdvprr2vy.coze.site/api/*` | 所有 REST API 接口 |
| **WebSocket** | `wss://gbdvprr2vy.coze.site/ws` | WebSocket 连接端点（不带参数） |
| **健康检查** | `https://gbdvprr2vy.coze.site/api/health` | 服务状态检查 |

### 端口说明

- **HTTPS**: 443（标准 HTTPS 端口，无需显式指定）
- **WSS**: 443（标准 WSS 端口，无需显式指定）

**示例**:
- ❌ 错误: `https://gbdvprr2vy.coze.site:443/api/...` （无需指定端口）
- ✅ 正确: `https://gbdvprr2vy.coze.site/api/...` （使用默认端口）

---

## 通讯架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        APP 端                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  激活模块     │  │ WebSocket    │  │  消息处理     │       │
│  │  (HTTP API)  │  │  客户端       │  │  模块         │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
└─────────┼─────────────────┼─────────────────┼────────────────┘
          │                 │                 │
          │ 1. 激活请求     │ 2. 建立连接      │ 3. 消息上报
          │ (POST /activate)│ (WSS /ws)       │ (WebSocket)    │
          ▼                 ▼                 ▼
┌─────────┼─────────────────┼─────────────────┼────────────────┐
│         │    ┌──────────────────────────────┐                │
│         │    │      WorkBot 服务器          │                │
│         │    │   gbdvprr2vy.coze.site       │                │
│         │    └──────────────────────────────┘                │
│         │                 │                 │                │
└─────────┼─────────────────┼─────────────────┼────────────────┘
          │                 │                 │
          │ 4. 返回 Token   │ 5. 认证消息      │ 6. 自动回复
          │ (JSON 响应)     │ (WebSocket)     │ (WebSocket)    │
```

### 通讯模式

| 模式 | 协议 | 用途 | 频率 |
|------|------|------|------|
| **激活通讯** | HTTPS | 设备激活、Token 获取 | 低频（仅首次） |
| **命令通讯** | HTTPS | 消息上报、配置获取 | 中频 |
| **实时通讯** | WSS | 指令推送、自动回复 | 高频 |

---

## 认证流程

### 流程图

```
APP                              服务器
 │                                │
 │── 1. 激活请求 ─────────────────▶│
 │    POST /api/robot-ids/activate  │
 │    {code, deviceInfo}            │
 │◀──────────────── 2. 返回 Token ──│
 │    {robotId, token, expiresAt}   │
 │                                │
 │── 3. 建立 WebSocket 连接 ───────▶│
 │    wss://gbdvprr2vy.coze.site/ws │
 │◀──────────────── 4. 连接成功 ────│
 │                                │
 │── 5. 发送认证消息 ──────────────▶│
 │    {type: authenticate, ...}    │
 │◀──────────────── 6. 认证响应 ────│
 │    {type: authenticated, ...}    │
 │                                │
 │── 7. 心跳保活 ◀─────────────────│
 │    ↔ 每 30 秒                   │
```

### 详细步骤

#### 步骤 1: 激活设备

**目的**: 获取 robotId 和 token

**请求**:
```http
POST https://gbdvprr2vy.coze.site/api/robot-ids/activate
Content-Type: application/json
```

**请求体**:
```json
{
  "code": "YOUR_ACTIVATION_CODE",
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

**响应（成功）**:
```json
{
  "code": 200,
  "message": "激活成功",
  "data": {
    "robotId": "bot_abc123xyz",
    "robotUuid": "bot_abc123xyz",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2JvdElkIjoiYm90X2FiYzEyM3h5eiIsInVzZXJJZCI6MSwiZGV2aWNlSWQiOiJkZXZpY2VfMTIzNDUiLCJpYXQiOjE3NzA1NzkyNTksImV4cCI6MTc3MDY2NTY1OX0.",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-02-10T19:36:31.790Z",
    "isNewActivation": true
  }
}
```

**响应（失败）**:
```json
{
  "code": 400,
  "message": "激活码无效",
  "data": null
}
```

**保存凭证**:
```javascript
// 保存到本地存储
localStorage.setItem('workbot_robotId', result.data.robotId);
localStorage.setItem('workbot_token', result.data.token);
localStorage.setItem('workbot_expiresAt', result.data.expiresAt);
```

---

#### 步骤 2: 建立 WebSocket 连接

**⚠️ 重要**: 使用 v3.0 消息认证模式，**不要在 URL 中传递参数**！

**❌ 错误方式**:
```javascript
// 不要这样！
const ws = new WebSocket('wss://gbdvprr2vy.coze.site/ws?robotId=xxx&token=xxx');
```

**✅ 正确方式**:
```javascript
// 1. 建立连接（不带参数）
const ws = new WebSocket('wss://gbdvprr2vy.coze.site/ws');

// 2. 连接打开后，发送认证消息
ws.onopen = () => {
  const authMessage = {
    type: 'authenticate',
    data: {
      robotId: 'bot_abc123xyz',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      timestamp: Date.now()
    },
    timestamp: Date.now()
  };
  ws.send(JSON.stringify(authMessage));
};
```

---

#### 步骤 3: 认证响应

**成功响应**:
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

**失败响应**:
```json
{
  "type": "error",
  "code": 4001,
  "message": "Token 无效或已过期"
}
```

---

## API 接口

### 1. 激活接口

#### 接口信息

| 配置项 | 值 |
|--------|-----|
| **URL** | `https://gbdvprr2vy.coze.site/api/robot-ids/activate` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

#### 请求参数

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `code` | string | ✅ | 激活码 | `"ABC123XYZ"` |
| `deviceInfo` | object | ✅ | 设备信息 | 见下表 |

#### deviceInfo 参数

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `deviceId` | string | ✅ | 设备唯一标识 | `"device-12345"` |
| `brand` | string | ❌ | 设备品牌 | `"Xiaomi"` |
| `model` | string | ❌ | 设备型号 | `"Mi 11"` |
| `os` | string | ❌ | 操作系统 | `"Android"` |
| `osVersion` | string | ❌ | 系统版本 | `"12"` |
| `manufacturer` | string | ❌ | 制造商 | `"Xiaomi"` |
| `network` | string | ❌ | 网络类型 | `"WiFi"` |
| `appVersion` | string | ❌ | APP 版本 | `"1.0.0"` |
| `totalMemory` | number | ❌ | 总内存（MB） | `8192` |
| `screenResolution` | string | ❌ | 屏幕分辨率 | `"1080x2400"` |

#### 响应参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | number | 状态码（200 成功） |
| `message` | string | 响应消息 |
| `data.robotId` | string | 机器人 ID |
| `data.robotUuid` | string | 机器人 UUID |
| `data.token` | string | 访问令牌 |
| `data.refreshToken` | string | 刷新令牌 |
| `data.expiresAt` | string | 过期时间（ISO 8601） |
| `data.isNewActivation` | boolean | 是否首次激活 |

#### 错误码

| 错误码 | 消息 | 解决方案 |
|--------|------|----------|
| 400 | 激活码无效 | 检查激活码是否正确 |
| 400 | 激活码已被禁用 | 联系管理员 |
| 400 | 激活码已过期 | 获取新激活码 |
| 400 | 激活码使用次数已达上限 | 获取新激活码 |
| 400 | 该设备已绑定到其他设备 | 先解绑旧设备 |
| 400 | 该机器人已绑定到其他设备 | 先解绑旧设备 |
| 500 | 激活失败 | 联系技术支持 |

---

### 2. 消息上报接口

#### 接口信息

| 配置项 | 值 |
|--------|-----|
| **URL** | `https://gbdvprr2vy.coze.site/api/messages/report` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |
| **Authorization** | `Bearer {token}` |

#### 请求参数

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `robotId` | string | ✅ | 机器人 ID | `"bot_abc123xyz"` |
| `messageId` | string | ✅ | 消息唯一 ID | `"msg_client_12345"` |
| `messageType` | string | ✅ | 消息类型 | `"text"` |
| `content` | string | ✅ | 消息内容 | `"你好"` |
| `extraData` | object | ❌ | 附加数据 | 见下表 |
| `userId` | string | ❌ | 用户 ID | `"user_123"` |
| `sessionId` | string | ❌ | 会话 ID | `"session_abc123"` |
| `timestamp` | number | ❌ | 消息时间戳 | `1770579378378` |

#### messageType 可选值

| 值 | 说明 |
|----|------|
| `text` | 文本消息 |
| `image` | 图片消息 |
| `file` | 文件消息 |
| `audio` | 语音消息 |
| `video` | 视频消息 |

#### 响应

**成功**:
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

**失败**:
```json
{
  "code": 401,
  "message": "未授权，Token 无效"
}
```

---

### 3. 健康检查接口

#### 接口信息

| 配置项 | 值 |
|--------|-----|
| **URL** | `https://gbdvprr2vy.coze.site/api/health` |
| **Method** | `GET` |

#### 响应

**正常**:
```json
{
  "status": "ok",
  "timestamp": 1770579378378,
  "websocket": "online",
  "database": "connected"
}
```

**异常**:
```json
{
  "status": "error",
  "timestamp": 1770579378378,
  "error": "数据库连接失败"
}
```

---

## WebSocket 通讯规范

### 连接配置

| 配置项 | 值 |
|--------|-----|
| **URL** | `wss://gbdvprr2vy.coze.site/ws` |
| **协议** | `wss://` (WebSocket Secure) |
| **认证方式** | 消息认证（v3.0） |
| **心跳间隔** | 30 秒 |
| **心跳超时** | 60 秒 |
| **认证超时** | 30 秒 |
| **最大连接数** | 100 |

### ⚠️ 认证方式（重要）

**WebSocket v3.0 采用"消息认证"模式，不要在 URL 中传递参数！**

#### ❌ 错误示例

```javascript
// 错误！不要在 URL 中传递 robotId 和 token
const ws = new WebSocket(
  'wss://gbdvprr2vy.coze.site/ws?robotId=xxx&token=xxx'
);
```

#### ✅ 正确示例

```javascript
// 1. 建立连接（不带参数）
const ws = new WebSocket('wss://gbdvprr2vy.coze.site/ws');

// 2. 连接打开后，发送认证消息
ws.onopen = () => {
  const authMessage = {
    type: 'authenticate',
    data: {
      robotId: 'bot_abc123xyz',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      timestamp: Date.now()
    },
    timestamp: Date.now()
  };
  ws.send(JSON.stringify(authMessage));
};
```

---

## 消息类型详解

### 消息结构

所有消息都遵循以下结构：

```typescript
interface WSMessage {
  type: string;           // 消息类型
  data: any;              // 消息数据
  timestamp: number;      // 时间戳（毫秒）
  messageId?: string;     // 消息 ID（可选）
}
```

---

### 客户端 → 服务器

#### 1. 认证消息（authenticate）

**用途**: 连接后进行身份认证

**消息格式**:
```json
{
  "type": "authenticate",
  "data": {
    "robotId": "bot_abc123xyz",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "timestamp": 1770579378378
  },
  "timestamp": 1770579378378
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 固定为 `"authenticate"` |
| `data.robotId` | string | ✅ | 机器人 ID（从激活接口获取） |
| `data.token` | string | ✅ | 访问令牌（从激活接口获取） |
| `data.timestamp` | number | ❌ | 时间戳 |
| `timestamp` | number | ✅ | 消息时间戳 |

**响应**:
- 成功: `{type: "authenticated", ...}`
- 失败: `{type: "error", code: 4001, ...}`

---

#### 2. 心跳消息（heartbeat）

**用途**: 保持连接活跃，每 30 秒发送一次

**消息格式**:
```json
{
  "type": "heartbeat",
  "data": {
    "robotId": "bot_abc123xyz",
    "status": "online",
    "battery": 80,
    "signal": 5,
    "memoryUsage": 45,
    "cpuUsage": 30,
    "networkType": "WiFi"
  },
  "timestamp": 1770579378378
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 固定为 `"heartbeat"` |
| `data.robotId` | string | ✅ | 机器人 ID |
| `data.status` | string | ❌ | 设备状态（online/idle/error） |
| `data.battery` | number | ❌ | 电池电量（0-100） |
| `data.signal` | number | ❌ | 信号强度（0-5） |
| `data.memoryUsage` | number | ❌ | 内存使用率（%） |
| `data.cpuUsage` | number | ❌ | CPU 使用率（%） |
| `data.networkType` | string | ❌ | 网络类型（WiFi/4G/5G） |

**响应**: 无需响应，服务器会通过连接状态确认

---

#### 3. 消息上报（message）

**用途**: 上报用户发送的消息

**消息格式**:
```json
{
  "type": "message",
  "data": {
    "messageId": "msg_client_12345",
    "messageType": "text",
    "content": "你好，我想咨询产品信息",
    "userId": "user_123",
    "sessionId": "session_abc123",
    "extraData": {
      "media": null,
      "metadata": {}
    }
  },
  "timestamp": 1770579378378
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 固定为 `"message"` |
| `data.messageId` | string | ✅ | 消息唯一 ID |
| `data.messageType` | string | ✅ | 消息类型（text/image/file/audio/video） |
| `data.content` | string | ✅ | 消息内容 |
| `data.userId` | string | ❌ | 用户 ID |
| `data.sessionId` | string | ❌ | 会话 ID |
| `data.extraData` | object | ❌ | 附加数据 |

**响应**:
```json
{
  "type": "message_ack",
  "messageId": "msg_client_12345",
  "timestamp": 1770579378378
}
```

---

#### 4. 状态上报（status）

**用途**: 上报设备状态信息

**消息格式**:
```json
{
  "type": "status",
  "data": {
    "status": "online",
    "battery": 80,
    "network": "wifi",
    "location": "CN-GD",
    "deviceModel": "Xiaomi Mi 11",
    "androidVersion": "12"
  },
  "timestamp": 1770579378378
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 固定为 `"status"` |
| `data.status` | string | ✅ | 状态（online/idle/error） |
| `data.battery` | number | ❌ | 电池电量（0-100） |
| `data.network` | string | ❌ | 网络类型（wifi/4g/5g） |
| `data.location` | string | ❌ | 位置代码 |
| `data.deviceModel` | string | ❌ | 设备型号 |
| `data.androidVersion` | string | ❌ | Android 版本 |

**响应**:
```json
{
  "type": "status_ack",
  "timestamp": 1770579378378
}
```

---

#### 5. 指令结果上报（result）

**用途**: 上报服务器推送指令的执行结果

**消息格式**:
```json
{
  "type": "result",
  "data": {
    "commandId": "cmd_123456",
    "status": "success",
    "result": {
      "messageId": 12345
    },
    "errorMessage": null,
    "executedAt": 1770579378378
  },
  "timestamp": 1770579378378
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 固定为 `"result"` |
| `data.commandId` | string | ✅ | 指令 ID |
| `data.status` | string | ✅ | 执行状态（success/failed） |
| `data.result` | object | ❌ | 执行结果 |
| `data.errorMessage` | string | ❌ | 错误消息（失败时） |
| `data.executedAt` | number | ✅ | 执行时间戳 |

**响应**: 无需响应

---

### 服务器 → 客户端

#### 1. 认证成功响应（authenticated）

**用途**: 认证成功后的确认消息

**消息格式**:
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

**处理**: 保存连接状态，启动心跳

---

#### 2. 错误消息（error）

**用途**: 服务器错误通知

**消息格式**:
```json
{
  "type": "error",
  "code": 4001,
  "message": "Token 无效或已过期",
  "details": {
    "robotId": "bot_abc123xyz"
  }
}
```

**错误码**:
| 错误码 | 消息 | 说明 |
|--------|------|------|
| 4000 | 未知的消息类型 | 收到不支持的消息类型 |
| 4001 | Token 无效 | Token 不存在或已失效 |
| 4006 | 认证超时 | 30 秒内未完成认证 |
| 4007 | Token 已过期 | Token 超过有效期 |
| 4029 | 连接数超限 | 服务器连接数已达上限（100） |

**处理**: 根据错误码采取相应措施（重新激活、重新连接等）

---

#### 3. 自动回复（auto_reply）

**用途**: 服务器推送的 AI 自动回复

**消息格式**:
```json
{
  "type": "auto_reply",
  "data": {
    "robotId": "bot_abc123xyz",
    "sessionId": "session_abc123",
    "userId": "user_123",
    "response": "您好！我是您的智能助手，很高兴为您服务。",
    "usedKnowledgeBase": true,
    "timestamp": 1770579378378
  }
}
```

**参数说明**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `data.robotId` | string | 机器人 ID |
| `data.sessionId` | string | 会话 ID |
| `data.userId` | string | 用户 ID |
| `data.response` | string | 回复内容 |
| `data.usedKnowledgeBase` | boolean | 是否使用了知识库 |
| `data.timestamp` | number | 时间戳 |

**处理**: 在 APP 界面显示回复

---

#### 4. 指令推送（command_push）

**用途**: 服务器推送的执行指令

**消息格式**:
```json
{
  "type": "command_push",
  "data": {
    "commandId": "cmd_123456",
    "commandType": "send_message",
    "commandCode": 203,
    "target": "user_123",
    "params": {
      "content": "这是服务器发送的消息",
      "messageType": "text"
    },
    "priority": 1
  },
  "timestamp": 1770579378378
}
```

**commandType 可选值**:
| 值 | 说明 | 编码 |
|----|------|------|
| `send_message` | 发送消息 | 203 |
| `forward_message` | 转发消息 | 205 |
| `create_group` | 创建群组 | 206 |
| `update_group` | 更新群组 | 207 |
| `send_file` | 发送文件 | 218 |
| `dissolve_group` | 解散群组 | 219 |
| `send_favorite` | 发送收藏 | 900 |

**处理**: 执行指令后，发送 `result` 消息

---

#### 5. 配置推送（config_push）

**用途**: 服务器推送的配置更新

**消息格式**:
```json
{
  "type": "config_push",
  "data": {
    "robotId": "bot_abc123xyz",
    "configType": "risk_control",
    "config": {
      "enabled": true,
      "maxMessagesPerMinute": 10
    },
    "version": 1
  },
  "timestamp": 1770579378378
}
```

**configType 可选值**:
| 值 | 说明 |
|----|------|
| `risk_control` | 风控配置 |
| `reply_template` | 回复模板 |
| `behavior_pattern` | 行为模式 |
| `keyword_filter` | 关键词过滤 |

**处理**: 更新本地配置

---

#### 6. 心跳检测（ping）

**用途**: 服务器发送的心跳检测

**消息格式**:
```json
{
  "type": "ping",
  "timestamp": 1770579378378
}
```

**处理**: 立即响应 `pong` 消息
```json
{
  "type": "pong",
  "timestamp": 1770579378378
}
```

---

## 错误处理

### WebSocket 错误码

| 错误码 | 消息 | HTTP 状态码 | 解决方案 |
|--------|------|-------------|----------|
| 4000 | 未知的消息类型 | - | 检查消息类型是否正确 |
| 4001 | Token 无效 | - | 重新激活获取新 Token |
| 4006 | 认证超时 | - | 在连接后 30 秒内发送认证消息 |
| 4007 | Token 已过期 | - | 重新激活获取新 Token |
| 4029 | 连接数超限 | - | 等待或联系管理员 |

### HTTP 错误码

| 状态码 | 说明 | 解决方案 |
|--------|------|----------|
| 200 | 成功 | - |
| 400 | 请求参数错误 | 检查请求参数 |
| 401 | 未授权 | 检查 Token 是否有效 |
| 404 | 资源不存在 | 检查资源路径 |
| 500 | 服务器内部错误 | 联系技术支持 |

### 错误处理最佳实践

```javascript
// 1. 捕获 WebSocket 错误
ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);

  // 根据错误类型采取不同措施
  if (error.code === 4001 || error.code === 4007) {
    // Token 失效，重新激活
    handleTokenExpired();
  } else if (error.code === 4029) {
    // 连接数超限，等待后重试
    setTimeout(() => reconnect(), 60000);
  }
};

// 2. 捕获连接关闭
ws.onclose = (event) => {
  console.log('连接关闭:', event.code, event.reason);

  // 正常关闭（1000）不重连
  if (event.code !== 1000) {
    reconnect();
  }
};

// 3. 处理 HTTP 错误
async function activate(code, deviceInfo) {
  try {
    const response = await fetch(
      'https://gbdvprr2vy.coze.site/api/robot-ids/activate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, deviceInfo })
      }
    );

    const result = await response.json();

    if (result.code !== 200) {
      throw new Error(result.message);
    }

    return result.data;
  } catch (error) {
    console.error('激活失败:', error);
    throw error;
  }
}
```

---

## 客户端实现示例

### JavaScript/TypeScript 示例

```typescript
/**
 * WorkBot WebSocket 客户端实现
 * 版本: v3.0
 * 服务器: wss://gbdvprr2vy.coze.site/ws
 */

interface WSConfig {
  serverUrl: string;
  robotId: string;
  token: string;
}

interface MessageHandler {
  (message: any): void;
}

class WorkBotWebSocketClient {
  private config: WSConfig;
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private isAuthenticated: boolean = false;

  constructor(config: WSConfig) {
    this.config = config;
  }

  /**
   * 连接 WebSocket
   */
  connect() {
    // 建立 WebSocket 连接（注意：不带 URL 参数）
    this.ws = new WebSocket('wss://gbdvprr2vy.coze.site/ws');

    this.ws.onopen = () => {
      console.log('[WebSocket] ✅ 连接成功');
      this.reconnectAttempts = 0;

      // 立即发送认证消息
      this.sendAuthMessage();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] ❌ 错误:', error);
    };

    this.ws.onclose = (event) => {
      console.log(`[WebSocket] 🔌 连接关闭: ${event.code} - ${event.reason}`);
      this.isAuthenticated = false;
      this.stopHeartbeat();

      // 自动重连
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`[WebSocket] 🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), 3000);
      }
    };
  }

  /**
   * 发送认证消息
   */
  private sendAuthMessage() {
    const authMessage = {
      type: 'authenticate',
      data: {
        robotId: this.config.robotId,
        token: this.config.token,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    this.send(authMessage);
    console.log('[WebSocket] 📤 发送认证消息');

    // 认证超时检测（30 秒）
    setTimeout(() => {
      if (!this.isAuthenticated) {
        console.error('[WebSocket] ❌ 认证超时');
        this.ws?.close(4006, '认证超时');
      }
    }, 30000);
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      console.log(`[WebSocket] 📥 收到消息: ${message.type}`);

      switch (message.type) {
        case 'authenticated':
          this.handleAuthenticated(message);
          break;

        case 'error':
          this.handleError(message);
          break;

        case 'ping':
          this.handlePing();
          break;

        case 'auto_reply':
          this.handleAutoReply(message);
          break;

        case 'command_push':
          this.handleCommandPush(message);
          break;

        case 'config_push':
          this.handleConfigPush(message);
          break;

        default:
          this.triggerMessageHandler(message.type, message);
      }
    } catch (error) {
      console.error('[WebSocket] ❌ 消息解析失败:', error);
    }
  }

  /**
   * 处理认证成功
   */
  private handleAuthenticated(message: any) {
    console.log('[WebSocket] ✅ 认证成功:', message.data);
    this.isAuthenticated = true;
    this.startHeartbeat();
    this.triggerMessageHandler('authenticated', message);
  }

  /**
   * 处理错误消息
   */
  private handleError(message: any) {
    console.error(`[WebSocket] ❌ 服务器错误 [${message.code}]: ${message.message}`);

    // Token 失效，需要重新激活
    if (message.code === 4001 || message.code === 4007) {
      this.triggerMessageHandler('token_expired', message);
    }

    this.triggerMessageHandler('error', message);
  }

  /**
   * 处理服务器心跳
   */
  private handlePing() {
    console.log('[WebSocket] 💓 收到服务器心跳');
    this.send({
      type: 'pong',
      timestamp: Date.now()
    });
  }

  /**
   * 处理自动回复
   */
  private handleAutoReply(message: any) {
    console.log('[WebSocket] 💬 收到自动回复:', message.data);
    this.triggerMessageHandler('auto_reply', message);
  }

  /**
   * 处理指令推送
   */
  private handleCommandPush(message: any) {
    console.log('[WebSocket] 📤 收到指令推送:', message.data);

    // 发送确认
    this.sendCommandResult(message.data.commandId, 'success', {});

    // 触发处理器
    this.triggerMessageHandler('command_push', message);
  }

  /**
   * 处理配置推送
   */
  private handleConfigPush(message: any) {
    console.log('[WebSocket] ⚙️ 收到配置推送:', message.data);
    this.triggerMessageHandler('config_push', message);
  }

  /**
   * 启动心跳
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // 30 秒
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat() {
    const heartbeat = {
      type: 'heartbeat',
      data: {
        robotId: this.config.robotId,
        status: 'online',
        battery: this.getBatteryLevel(),
        signal: this.getSignalStrength(),
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: this.getCpuUsage(),
        networkType: this.getNetworkType()
      },
      timestamp: Date.now()
    };

    this.send(heartbeat);
  }

  /**
   * 发送消息
   */
  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[WebSocket] ❌ 连接未打开，无法发送消息');
    }
  }

  /**
   * 上报消息
   */
  reportMessage(messageData: any) {
    const message = {
      type: 'message',
      data: messageData,
      timestamp: Date.now()
    };

    this.send(message);
  }

  /**
   * 上报状态
   */
  reportStatus(status: any) {
    const message = {
      type: 'status',
      data: status,
      timestamp: Date.now()
    };

    this.send(message);
  }

  /**
   * 发送指令结果
   */
  sendCommandResult(commandId: string, status: 'success' | 'failed', result: any) {
    const message = {
      type: 'result',
      data: {
        commandId,
        status,
        result,
        executedAt: Date.now()
      },
      timestamp: Date.now()
    };

    this.send(message);
  }

  /**
   * 注册消息处理器
   */
  on(messageType: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  /**
   * 触发消息处理器
   */
  private triggerMessageHandler(messageType: string, message: any) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, '正常关闭');
      this.ws = null;
    }
  }

  /**
   * 获取电池电量（需根据实际平台实现）
   */
  private getBatteryLevel(): number {
    // TODO: 根据实际平台实现
    return 80;
  }

  /**
   * 获取信号强度（需根据实际平台实现）
   */
  private getSignalStrength(): number {
    // TODO: 根据实际平台实现
    return 5;
  }

  /**
   * 获取内存使用率（需根据实际平台实现）
   */
  private getMemoryUsage(): number {
    // TODO: 根据实际平台实现
    return 45;
  }

  /**
   * 获取 CPU 使用率（需根据实际平台实现）
   */
  private getCpuUsage(): number {
    // TODO: 根据实际平台实现
    return 30;
  }

  /**
   * 获取网络类型（需根据实际平台实现）
   */
  private getNetworkType(): string {
    // TODO: 根据实际平台实现
    return 'WiFi';
  }
}

// 导出类
export { WorkBotWebSocketClient };
```

### 使用示例

```typescript
import { WorkBotWebSocketClient } from './workbot-client';

// 1. 激活设备
async function activateDevice(activationCode: string, deviceInfo: any) {
  const response = await fetch(
    'https://gbdvprr2vy.coze.site/api/robot-ids/activate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: activationCode, deviceInfo })
    }
  );

  const result = await response.json();

  if (result.code === 200) {
    console.log('✅ 激活成功', result.data);
    return result.data;
  } else {
    throw new Error(result.message);
  }
}

// 2. 使用 WebSocket 客户端
async function main() {
  try {
    // 步骤 1: 激活设备
    const activationData = await activateDevice('YOUR_ACTIVATION_CODE', {
      deviceId: 'device-12345',
      brand: 'Xiaomi',
      model: 'Mi 11',
      os: 'Android',
      osVersion: '12'
    });

    // 步骤 2: 创建 WebSocket 客户端
    const client = new WorkBotWebSocketClient({
      serverUrl: 'wss://gbdvprr2vy.coze.site/ws',
      robotId: activationData.robotId,
      token: activationData.token
    });

    // 步骤 3: 注册消息处理器
    client.on('authenticated', (message) => {
      console.log('🎉 认证成功，开始通信');
    });

    client.on('auto_reply', (message) => {
      console.log('💬 收到自动回复:', message.data.response);
      // 在界面显示回复
      displayReply(message.data.response);
    });

    client.on('command_push', (message) => {
      console.log('📤 收到指令:', message.data);
      // 执行指令
      executeCommand(message.data);
    });

    client.on('token_expired', (message) => {
      console.log('⚠️ Token 已过期，需要重新激活');
      // 重新激活
      reActivateDevice();
    });

    // 步骤 4: 连接 WebSocket
    client.connect();

    // 步骤 5: 上报消息
    setTimeout(() => {
      client.reportMessage({
        messageId: `msg-${Date.now()}`,
        messageType: 'text',
        content: '你好，我想咨询产品信息',
        userId: 'user-123',
        sessionId: `session-${Date.now()}`
      });
    }, 5000);

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  }
}

// 辅助函数
function displayReply(reply: string) {
  // 在界面显示回复
  console.log('显示回复:', reply);
}

function executeCommand(command: any) {
  // 执行指令
  console.log('执行指令:', command);
}

function reActivateDevice() {
  // 重新激活设备
  console.log('重新激活设备');
}

// 启动
main();
```

---

## 测试指南

### 使用 wscat 测试（推荐）

#### 安装 wscat

```bash
npm install -g wscat
```

#### 测试连接

```bash
# 连接 WebSocket（不带参数）
wscat -c "wss://gbdvprr2vy.coze.site/ws"
```

#### 发送认证消息

连接成功后，手动发送认证消息：

```bash
> {"type":"authenticate","data":{"robotId":"YOUR_ROBOT_ID","token":"YOUR_TOKEN","timestamp":1699999999999},"timestamp":1699999999999}
```

#### 预期响应

**成功**:
```json
< {"type":"authenticated","data":{"authenticated":true,"robotId":"...","deviceId":"...","userId":...,"timestamp":...}}
```

**失败（Token 无效）**:
```json
< {"type":"error","code":4001,"message":"Token 无效"}
```

**失败（认证超时）**:
```json
< {"type":"error","code":4006,"message":"认证超时"}
```

---

### 使用在线测试工具

#### 工具 1: PieSocket WebSocket Tester

1. 访问 https://www.piesocket.com/websocket-tester
2. 配置:
   - **WebSocket URL**: `wss://gbdvprr2vy.coze.site/ws`
3. 点击 **Connect**
4. 连接成功后，发送认证消息

#### 工具 2: WebSocket.org Echo

1. 访问 https://websocket.org/echo.html
2. 配置:
   - **Location**: `wss://gbdvprr2vy.coze.site/ws`
3. 点击 **Connect**
4. 连接成功后，发送认证消息

---

### 测试健康检查

```bash
curl https://gbdvprr2vy.coze.site/api/health
```

**预期响应**:
```json
{
  "status": "ok",
  "timestamp": 1770579378378,
  "websocket": "online",
  "database": "connected"
}
```

---

## 故障排查

### 问题 1: 连接失败

**症状**: APP 显示"连接失败"

**可能原因**:
1. 网络不通
2. 服务器地址错误
3. 防火墙阻止

**排查步骤**:

1. **测试网络连通性**
   ```bash
   # 测试 HTTP 连接
   curl https://gbdvprr2vy.coze.site/api/health

   # 测试 WebSocket 连接
   wscat -c "wss://gbdvprr2vy.coze.site/ws"
   ```

2. **检查服务器地址**
   - 确认使用 `wss://gbdvprr2vy.coze.site/ws`
   - 确认使用 WSS 协议（加密）

3. **检查防火墙**
   - 确认防火墙允许出站连接
   - 确认允许端口 443

---

### 问题 2: 认证失败（4001/4007）

**症状**: 连接后立即断开，收到错误码 4001 或 4007

**可能原因**:
1. Token 无效
2. Token 已过期
3. robotId 错误

**排查步骤**:

1. **检查 Token 是否有效**
   - 确认 Token 从激活接口获取
   - 确认 Token 未过期（24 小时有效期）

2. **重新激活设备**
   ```javascript
   const activationData = await activateDevice('YOUR_CODE', deviceInfo);
   // 使用新的 robotId 和 token
   ```

3. **检查 robotId**
   - 确认 robotId 与激活返回的一致
   - 确认 robotId 格式正确

---

### 问题 3: 认证超时（4006）

**症状**: 连接后 30 秒内未发送认证消息

**可能原因**:
1. 认证消息未发送
2. 认证消息格式错误
3. 网络延迟

**排查步骤**:

1. **检查认证消息发送**
   - 确保在 `onopen` 事件中立即发送
   - 确保使用正确的消息格式

2. **检查消息格式**
   ```javascript
   // ✅ 正确格式
   {
     "type": "authenticate",
     "data": {
       "robotId": "bot_abc123xyz",
       "token": "eyJhbGci...",
       "timestamp": 1699999999999
     },
     "timestamp": 1699999999999
   }
   ```

3. **优化网络**
   - 减少认证消息前的逻辑
   - 确保网络稳定

---

### 问题 4: 连接数超限（4029）

**症状**: 收到错误码 4029

**可能原因**:
1. 服务器连接数已达上限（100）
2. 有重复连接

**排查步骤**:

1. **检查重复连接**
   - 确保只有一个 WebSocket 连接
   - 断开旧连接后再建立新连接

2. **等待连接释放**
   - 等待旧连接自动断开
   - 等待 1-2 分钟后重试

3. **联系管理员**
   - 如果连接数持续超限，联系管理员

---

### 问题 5: 心跳超时

**症状**: 连接频繁断开

**可能原因**:
1. 网络不稳定
2. 心跳间隔设置过大
3. 心跳消息未发送

**排查步骤**:

1. **检查心跳发送**
   - 确认每 30 秒发送一次心跳
   - 确认心跳格式正确

2. **检查网络**
   - 测试网络稳定性
   - 检查网络延迟

3. **调整心跳间隔**（服务器端）
   - 编辑服务器代码
   - 修改 `HEARTBEAT_INTERVAL` 和 `HEARTBEAT_TIMEOUT`

---

## 附录

### A. 完整配置示例

```javascript
const config = {
  // 服务器配置
  server: {
    httpUrl: 'https://gbdvprr2vy.coze.site',
    wsUrl: 'wss://gbdvprr2vy.coze.site/ws',
    healthCheckUrl: 'https://gbdvprr2vy.coze.site/api/health'
  },

  // API 配置
  api: {
    activateUrl: '/api/robot-ids/activate',
    messageReportUrl: '/api/messages/report'
  },

  // WebSocket 配置
  websocket: {
    heartbeatInterval: 30000,  // 30 秒
    heartbeatTimeout: 60000,   // 60 秒
    authTimeout: 30000,        // 30 秒
    maxReconnectAttempts: 5,
    reconnectDelay: 3000       // 3 秒
  },

  // Token 配置
  token: {
    expiresIn: 24 * 60 * 60 * 1000  // 24 小时
  }
};
```

### B. 消息类型速查表

| 类型 | 方向 | 说明 |
|------|------|------|
| `authenticate` | C→S | 认证消息 |
| `authenticated` | S→C | 认证成功 |
| `heartbeat` | C→S | 心跳消息 |
| `ping` | S→C | 服务器心跳 |
| `pong` | C→S | 响应心跳 |
| `message` | C→S | 消息上报 |
| `message_ack` | S→C | 消息确认 |
| `status` | C→S | 状态上报 |
| `status_ack` | S→C | 状态确认 |
| `result` | C→S | 指令结果 |
| `auto_reply` | S→C | 自动回复 |
| `command_push` | S→C | 指令推送 |
| `config_push` | S→C | 配置推送 |
| `error` | S→C | 错误消息 |

### C. 错误码速查表

| 错误码 | 消息 | 方向 | 解决方案 |
|--------|------|------|----------|
| 4000 | 未知的消息类型 | S→C | 检查消息类型 |
| 4001 | Token 无效 | S→C | 重新激活 |
| 4006 | 认证超时 | S→C | 立即发送认证 |
| 4007 | Token 已过期 | S→C | 重新激活 |
| 4029 | 连接数超限 | S→C | 等待或联系管理员 |

### D. 支持的指令类型

| 指令类型 | 编码 | 说明 |
|----------|------|------|
| `send_message` | 203 | 发送消息 |
| `forward_message` | 205 | 转发消息 |
| `create_group` | 206 | 创建群组 |
| `update_group` | 207 | 更新群组 |
| `send_file` | 218 | 发送文件 |
| `dissolve_group` | 219 | 解散群组 |
| `send_favorite` | 900 | 发送收藏 |

### E. 支持的配置类型

| 配置类型 | 说明 |
|----------|------|
| `risk_control` | 风控配置 |
| `reply_template` | 回复模板 |
| `behavior_pattern` | 行为模式 |
| `keyword_filter` | 关键词过滤 |

### F. 技术支持

如遇到问题，请联系技术支持：

- **邮箱**: support@workbot.com
- **文档**: https://docs.workbot.com
- **GitHub**: https://github.com/workbot/workbot-app

---

**文档版本**: v3.0
**最后更新**: 2026-02-09
**维护者**: WorkBot 技术团队
