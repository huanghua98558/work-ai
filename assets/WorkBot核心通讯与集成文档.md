# WorkBot 核心通讯与集成文档

> **文档版本**：v4.0
> **最后更新**：2026-02-06
> **适用对象**：开发工程师、架构师、集成工程师

---

## 📋 目录

1. [系统设计思路](#1-系统设计思路)
2. [系统架构思路](#2-系统架构思路)
3. [APP通讯协议](#3-app通讯协议)
4. [APP验证方式](#4-app验证方式)
5. [APP通讯代码](#5-app通讯代码)
6. [第三方平台通讯协议](#6-第三方平台通讯协议)
7. [通讯地址](#7-通讯地址)

---

## 1. 系统设计思路

### 1.1 核心设计理念

WorkBot 系统的设计围绕以下几个核心原则展开：

#### 1.1.1 设备唯一绑定原则

**设计目标**：一个激活码只能绑定一个设备，防止激活码被滥用。

**实现方式**：
- 使用设备ID（Android ID）+ 设备指纹双重验证
- 激活后记录设备信息，后续激活时验证设备是否匹配
- 支持同一设备重复激活（卸载重装）

**业务价值**：
- 保护激活码资产，防止分享和盗用
- 便于追踪和管理设备
- 提高安全性

#### 1.1.2 实时双向通讯原则

**设计目标**：服务器与APP之间实现低延迟、高可靠的双向通讯。

**实现方式**：
- 使用 WebSocket 作为主要通讯通道
- HTTP 作为辅助通道（激活、心跳等）
- 实现断线重连、消息队列、失败重试机制

**业务价值**：
- 实时接收消息和下发指令
- 提升用户体验和响应速度
- 支持复杂交互场景

#### 1.1.3 WorkTool 兼容原则

**设计目标**：完全兼容 WorkTool 平台的所有功能。

**实现方式**：
- 实现 WorkTool 的 16 种消息类型
- 兼容 WorkTool 的 API 接口
- 支持 HTTP 回调和 WebSocket 代理两种集成方式

**业务价值**：
- 无缝迁移现有 WorkTool 用户
- 降低迁移成本
- 保持功能完整性

#### 1.1.4 第三方扩展原则

**设计目标**：支持第三方系统通过标准协议集成。

**实现方式**：
- 提供 RESTful API
- 提供 WebSocket 接口
- 提供 HTTP 回调机制

**业务价值**：
- 支持定制化需求
- 扩展生态系统
- 增加商业价值

### 1.2 关键设计决策

#### 1.2.1 为什么使用 WebSocket 而非轮询？

| 方案 | 优点 | 缺点 | 决策 |
|-----|------|------|------|
| **HTTP轮询** | 实现简单 | 延迟高、服务器压力大 | ❌ 不采用 |
| **长连接** | 实时性好 | 占用资源 | ⚠️ 备选 |
| **WebSocket** | 实时、高效、双向 | 需要额外维护 | ✅ 采用 |

**决策依据**：
- WorkBot 需要实时接收消息和下发指令
- 消息频率较高，轮询不现实
- WebSocket 在移动端表现良好

#### 1.2.2 为什么使用 JWT 而非 Session？

| 方案 | 优点 | 缺点 | 决策 |
|-----|------|------|------|
| **Session** | 服务端可控 | 需要存储、跨域困难 | ❌ 不采用 |
| **JWT** | 无状态、跨域友好 | 无法撤销、Token较大 | ✅ 采用 |

**决策依据**：
- APP 和服务端分离部署
- 需要支持多个机器人并发连接
- JWT 更适合分布式架构

#### 1.2.3 为什么使用设备指纹？

**问题**：仅凭设备ID不足以防止伪造。

**解决方案**：
- 收集设备信息（型号、OS、制造商等）
- 生成设备指纹哈希
- 激活和连接时双重验证

**安全性提升**：
- 防止模拟器伪造
- 提高破解难度
- 便于异常检测

### 1.3 业务流程设计

#### 1.3.1 激活流程

```
用户输入激活码
    ↓
APP收集设备信息
    ↓
POST /api/robot-ids/verify (验证激活码)
    ↓
验证通过？
    ├─→ 否 → 提示错误
    └─→ 是 → 继续
        ↓
POST /api/robot-ids/activate (激活设备)
    ↓
服务器创建机器人实例
    ↓
生成 JWT Token
    ↓
返回 robotId + token
    ↓
APP 保存配置到 SharedPreferences
    ↓
APP 连接 WebSocket
    ↓
进入工作模式
```

#### 1.3.2 消息处理流程

```
APP 接收到企业微信消息
    ↓
通过 WebSocket 上报消息
    ↓
服务器保存消息到数据库
    ↓
触发 HTTP 回调 (如果配置)
    ↓
第三方系统接收并处理
    ↓
第三方系统通过 WorkTool API 发送回复
    ↓
服务器通过 WebSocket 下发指令
    ↓
APP 执行发送操作
    ↓
APP 上报执行结果
    ↓
服务器触发结果回调
```

---

## 2. 系统架构思路

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WorkBot 系统架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Android APP │  │  管理后台    │  │  第三方系统  │             │
│  │  (客户端)    │  │  (Web)       │  │  (WorkTool)  │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                     │
│         │ WSS              │ HTTPS            │ HTTPS              │
│         │ HTTPS            │                 │                    │
│         ▼                  ▼                  ▼                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    WorkBot 服务器                          │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │      │
│  │  │ API服务  │  │ WebSocket│  │ 回调服务  │          │      │
│  │  │ (5000)   │  │ (5001)   │  │          │          │      │
│  │  └──────────┘  └──────────┘  └──────────┘          │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │      │
│  │  │ 认证模块  │  │ 权限模块  │  │ AI模块    │          │      │
│  │  └──────────┘  └──────────┘  └──────────┘          │      │
│  └──────────────────┬───────────────────────────────────┘      │
│                     │                                         │
│         ┌───────────┼───────────┐                            │
│         ▼           ▼           ▼                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │PostgreSQL│ │  Redis   │ │对象存储  │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈选择

#### 2.2.1 后端技术栈

| 技术 | 版本 | 用途 | 选择理由 |
|-----|------|------|---------|
| **Next.js** | 16 | Web框架 | 全栈能力、API Routes、SSR |
| **TypeScript** | 5 | 编程语言 | 类型安全、开发效率 |
| **PostgreSQL** | 16 | 数据库 | 关系型、事务支持 |
| **Drizzle ORM** | latest | ORM | 轻量、类型安全、性能好 |
| **WebSocket** | ws库 | 实时通讯 | 成熟、性能好 |
| **JWT** | jose | 认证 | 无状态、跨域友好 |

#### 2.2.2 前端技术栈

| 技术 | 版本 | 用途 | 选择理由 |
|-----|------|------|---------|
| **Next.js** | 16 | 框架 | SSR、路由、API集成 |
| **React** | 19 | UI库 | 生态成熟、性能好 |
| **shadcn/ui** | latest | 组件库 | 美观、可定制 |
| **Tailwind CSS** | 4 | 样式 | 开发效率、一致性 |

### 2.3 核心模块架构

#### 2.3.1 认证授权模块

**职责**：用户认证、权限管理、Token管理

**核心组件**：
```
src/lib/auth/
├── jwt.ts              # JWT Token 生成和验证
├── middleware.ts       # 认证中间件
├── password.ts         # 密码加密和验证
└── user-service.ts     # 用户服务
```

**流程**：
```
用户登录
  ↓
验证用户名和密码
  ↓
生成 JWT Token (7天)
  ↓
生成 Refresh Token (30天)
  ↓
返回 Token
  ↓
客户端保存 Token
  ↓
每次请求携带 Bearer Token
  ↓
服务端验证 Token
```

#### 2.3.2 机器人管理模块

**职责**：机器人注册、状态管理、信息更新

**核心组件**：
```
src/lib/services/
├── robot-service.ts    # 机器人服务
└── robot-status.ts     # 状态管理
```

**状态机**：
```
未注册 → 激活 → 在线/离线 → 删除
```

#### 2.3.3 WebSocket通讯模块

**职责**：连接管理、消息处理、指令下发

**核心组件**：
```
src/lib/websocket/
├── server.ts           # WebSocket 服务器
├── connection.ts       # 连接管理
└── message-handler.ts  # 消息处理
```

**架构**：
```
WebSocket Server (5001)
  ├─ Connection Pool (Map<robotId, WebSocket>)
  ├─ Message Handler
  │  ├─ Heartbeat Handler
  │  ├─ Status Handler
  │  ├─ Message Handler
  │  ├─ Result Handler
  │  └─ Error Handler
  └─ Command Queue
```

#### 2.3.4 第三方集成模块

**职责**：WorkTool兼容、HTTP回调、指令下发

**核心组件**：
```
src/lib/
├── worktool/
│  ├── client.ts        # WorkTool 客户端
│  └── message-types.ts # 消息类型定义
└── services/
   └── integration.ts   # 集成服务
```

**集成方式**：
```
HTTP 回调:
  WorkBot → 第三方系统 (POST)

WebSocket 代理:
  WorkBot ←→ 第三方系统 (WS)

WorkTool API:
  第三方系统 → WorkBot → APP
```

### 2.4 数据流转架构

#### 2.4.1 消息流转

```
APP 接收消息
  ↓
WebSocket 上报
  ↓
API 层接收
  ↓
消息服务处理
  ├─ 保存到数据库
  ├─ 触发 HTTP 回调
  └─ 通知 AI 模块
  ↓
第三方系统接收
  ↓
第三方系统处理
  ↓
WorkTool API 调用
  ↓
WebSocket 下发指令
  ↓
APP 执行指令
  ↓
WebSocket 上报结果
  ↓
结果回调
```

#### 2.4.2 AI智能回复流转

```
APP 接收消息
  ↓
WebSocket 上报
  ↓
消息服务处理
  ↓
检查 AI 配置
  ↓
加载对话历史
  ↓
调用 AI 模型
  ↓
生成回复
  ↓
保存对话历史
  ↓
WebSocket 下发指令
  ↓
APP 执行指令
  ↓
WebSocket 上报结果
```

---

## 3. APP通讯协议

### 3.1 通讯架构

```
┌─────────────────────────────────────────────────────────────┐
│                     APP 通讯架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                                     │
│   APP                         Server                            │
│   ┌─────────┐                 ┌─────────┐                     │
│   │ HTTP    │◄──────────────►│  API    │                     │
│   │ Client  │    HTTPS        │ Server  │                     │
│   │ (5000)  │                 └─────────┘                     │
│   └─────────┘                     │                            │
│       │                           │                            │
│       │                           ▼                            │
│   ┌───┴────┐              ┌─────────┐                        │
│   │WebSocket│◄────────────►│WebSocket│                        │
│   │ Client  │    WSS        │ Server  │                        │
│   │ (5001)  │              │ (5001)  │                        │
│   └─────────┘              └─────────┘                        │
│       │                                                      │
│   ┌───┴────┐                                                │
│   │ SharedPreferences                                         │
│   │ (robotId + token)                                       │
│   └─────────┘                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 通讯方式对比

| 通讯方式 | 协议 | 端口 | 用途 | 优先级 |
|---------|------|------|------|--------|
| **HTTP POST** | HTTPS | 5000 | 激活、心跳、结果上报 | 中 |
| **WebSocket** | WSS | 5001 | 双向实时通讯 | 高 |

### 3.3 HTTP 接口

#### 3.3.1 验证激活码

**接口**：`POST /api/robot-ids/verify`

**请求**：
```json
{
  "code": "3CQ4Z9LE",
  "deviceId": "device-001"
}
```

**响应**：
```json
{
  "success": true,
  "code": 0,
  "data": {
    "valid": true,
    "robotId": "RBml9n7nikHIMZU0",
    "status": "unused",
    "canActivate": true
  }
}
```

#### 3.3.2 激活机器人

**接口**：`POST /api/robot-ids/activate`

**请求**：
```json
{
  "code": "3CQ4Z9LE",
  "deviceInfo": {
    "deviceId": "device-001",
    "model": "Samsung Galaxy S21",
    "os": "Android",
    "osVersion": "12",
    "manufacturer": "Samsung",
    "network": "4G",
    "appVersion": "1.0.0",
    "totalMemory": 8192,
    "screenResolution": "1080x2400"
  }
}
```

**响应**：
```json
{
  "success": true,
  "code": 0,
  "data": {
    "robotId": "RBml9n7nikHIMZU0",
    "robotUuid": "uuid-xxx",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-xxx",
    "expiresAt": "2026-02-13T10:00:00Z"
  }
}
```

#### 3.3.3 发送心跳

**接口**：`POST /api/heartbeat`

**请求头**：
```http
Authorization: Bearer {token}
```

**请求**：
```json
{
  "timestamp": 1770341503000,
  "memoryUsage": 1024,
  "cpuUsage": 50,
  "batteryLevel": 80,
  "networkType": "wifi"
}
```

**响应**：
```json
{
  "success": true,
  "code": 0,
  "data": {
    "serverTime": "2026-02-06T10:05:03.000Z"
  }
}
```

#### 3.3.4 上报结果

**接口**：`POST /api/result`

**请求头**：
```http
Authorization: Bearer {token}
```

**请求**：
```json
{
  "commandId": "cmd-001",
  "status": "success",
  "result": {
    "message": "执行成功",
    "messageId": "msg-002"
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
    "status": "success",
    "completedAt": "2026-02-06T10:05:00.000Z"
  }
}
```

### 3.4 WebSocket 消息协议

#### 3.4.1 连接

**地址**：`wss://your-server.com/ws/connect?token={token}`

**连接成功**：
```json
{
  "type": "connected",
  "data": {
    "robotId": "RBml9n7nikHIMZU0",
    "timestamp": 1770341503000
  }
}
```

#### 3.4.2 APP → Server 消息

**1. 心跳消息**

```json
{
  "type": "heartbeat",
  "data": {
    "timestamp": 1770341503000,
    "memoryUsage": 1024,
    "batteryLevel": 80,
    "networkType": "wifi"
  },
  "timestamp": 1770341503000,
  "messageId": "hb-001"
}
```

**2. 消息上报**

```json
{
  "type": "message",
  "data": {
    "senderId": "wxid-xxx",
    "senderName": "张三",
    "messageType": "text",
    "content": "你好，在吗？",
    "chatType": "single",
    "timestamp": 1770341503000
  },
  "timestamp": 1770341503000,
  "messageId": "msg-001"
}
```

**3. 结果上报**

```json
{
  "type": "result",
  "data": {
    "commandId": "cmd-001",
    "status": "success",
    "result": {
      "messageId": "msg-002"
    }
  },
  "timestamp": 1770341505000,
  "messageId": "res-001"
}
```

**4. 错误上报**

```json
{
  "type": "error",
  "data": {
    "errorCode": "E001",
    "errorMessage": "发送失败：网络错误",
    "timestamp": 1770341506000
  },
  "timestamp": 1770341506000,
  "messageId": "err-001"
}
```

#### 3.4.3 Server → APP 消息

**1. 指令下发**

```json
{
  "type": "command",
  "data": {
    "commandId": "cmd-001",
    "commandType": "send_message",
    "params": {
      "target": "张三",
      "content": "你好！",
      "messageType": "text"
    },
    "priority": 0
  },
  "timestamp": 1770341504000,
  "messageId": "cmd-001"
}
```

**2. 配置推送**

```json
{
  "type": "config",
  "data": {
    "configType": "risk_control",
    "config": {
      "enabled": true,
      "randomDelayMin": 1000,
      "randomDelayMax": 3000
    },
    "version": 1
  },
  "timestamp": 1770341504000,
  "messageId": "cfg-001"
}
```

**3. 心跳响应**

```json
{
  "type": "heartbeat_response",
  "data": {
    "timestamp": 1770341504000,
    "serverTime": "2026-02-06T10:05:04.000Z"
  },
  "timestamp": 1770341504000,
  "messageId": "hb-res-001"
}
```

### 3.5 消息类型汇总

| 方向 | type | 说明 | 优先级 |
|-----|------|------|--------|
| **APP → Server** | heartbeat | 心跳 | 高 |
| **APP → Server** | message | 消息上报 | 高 |
| **APP → Server** | result | 结果上报 | 中 |
| **APP → Server** | error | 错误上报 | 高 |
| **Server → APP** | command | 指令下发 | 高 |
| **Server → APP** | config | 配置推送 | 低 |
| **Server → APP** | heartbeat_response | 心跳响应 | 中 |

---

## 4. APP验证方式

### 4.1 激活码验证

#### 4.1.1 验证流程

```
用户输入激活码
    ↓
APP收集设备信息
    ↓
POST /api/robot-ids/verify
    ↓
服务器查询激活码
    ↓
检查激活码状态
    ├─ 未使用 → 返回 valid=true
    ├─ 已使用且绑定到当前设备 → 返回 valid=true (可重新激活)
    ├─ 已使用且绑定到其他设备 → 返回 valid=false
    └─ 已过期 → 返回 valid=false
```

#### 4.1.2 验证规则

| 激活码状态 | 绑定状态 | 当前设备 | 结果 |
|-----------|---------|---------|------|
| unused | unbound | 任意 | ✅ valid=true |
| used | bound | 匹配 | ✅ valid=true (可重新激活) |
| used | bound | 不匹配 | ❌ valid=false |
| expired | - | - | ❌ valid=false |

### 4.2 设备绑定验证

#### 4.2.1 设备指纹

**设备信息收集**：
```json
{
  "deviceId": "device-001",
  "model": "Samsung Galaxy S21",
  "os": "Android",
  "osVersion": "12",
  "manufacturer": "Samsung",
  "network": "4G",
  "appVersion": "1.0.0",
  "totalMemory": 8192,
  "screenResolution": "1080x2400"
}
```

**验证逻辑**：
```typescript
function verifyDeviceFingerprint(
  stored: string,
  provided: DeviceInfo
): boolean {
  const storedFingerprint = JSON.parse(stored);
  
  // 1. 检查设备ID
  if (storedFingerprint.deviceId !== provided.deviceId) {
    return false;
  }
  
  // 2. 检查设备基础信息（允许部分变化）
  const deviceMatch =
    storedFingerprint.model === provided.model &&
    storedFingerprint.os === provided.os &&
    storedFingerprint.manufacturer === provided.manufacturer;
  
  return deviceMatch;
}
```

### 4.3 JWT Token 验证

#### 4.3.1 Token 生成

```typescript
import { SignJWT } from 'jose';

async function generateToken(
  robotId: string,
  expiresIn: string = '7d'
): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  
  const token = await new SignJWT({
    robotId,
    type: 'robot',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(secret);
  
  return token;
}
```

#### 4.3.2 Token 验证

```typescript
import { jwtVerify } from 'jose';

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
```

#### 4.3.3 Token 使用场景

| 场景 | 用途 | 有效期 |
|-----|------|--------|
| **Access Token** | API请求、WebSocket连接 | 7天 |
| **Refresh Token** | 刷新Access Token | 30天 |

### 4.4 WebSocket 连接验证

#### 4.4.1 连接时验证

```typescript
// WebSocket 服务器
wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
  try {
    // 1. 从URL获取token
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(4001, 'Token required');
      return;
    }
    
    // 2. 验证token
    const payload = await verifyToken(token);
    
    if (!payload || !payload.robotId) {
      ws.close(4001, 'Invalid token');
      return;
    }
    
    // 3. 获取机器人信息
    const robot = await getRobotById(payload.robotId);
    
    if (!robot) {
      ws.close(4002, 'Robot not found');
      return;
    }
    
    // 4. 保存连接
    connections.set(robot.id, ws);
    
    // 5. 更新状态
    await updateRobotStatus(robot.id, 'online');
    
  } catch (error) {
    console.error('Connection error:', error);
    ws.close(4000, 'Connection error');
  }
});
```

#### 4.4.2 心跳验证

```typescript
// 服务端心跳检测
const heartbeatIntervals = new Map<string, NodeJS.Timeout>();

function startHeartbeatCheck(robotId: string, ws: WebSocket) {
  const interval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      clearInterval(interval);
      connections.delete(robotId);
      updateRobotStatus(robotId, 'offline');
      return;
    }
    
    // 发送心跳请求
    ws.send(JSON.stringify({
      type: 'heartbeat_request',
      timestamp: Date.now()
    }));
  }, 30000); // 30秒
  
  heartbeatIntervals.set(robotId, interval);
}
```

### 4.5 验证失败处理

#### 4.5.1 错误码

| 错误码 | 说明 | 处理方式 |
|-------|------|---------|
| 4000 | 连接错误 | 关闭连接，等待重连 |
| 4001 | Token无效 | 提示用户重新激活 |
| 4002 | 机器人不存在 | 提示用户重新激活 |
| 4003 | 设备不匹配 | 提示用户使用正确设备 |

#### 4.5.2 重连策略

```kotlin
// 指数退避策略
val RECONNECT_DELAYS = listOf(1000, 2000, 5000, 10000, 30000)
var reconnectAttempts = 0

fun scheduleReconnect() {
    if (reconnectAttempts < RECONNECT_DELAYS.size) {
        val delay = RECONNECT_DELAYS[reconnectAttempts]
        Handler(Looper.getMainLooper()).postDelayed({
            reconnectAttempts++
            connectWebSocket()
        }, delay.toLong())
    } else {
        // 提示用户手动重连
        showError("连接失败，请检查网络或重新激活")
    }
}
```

---

## 5. APP通讯代码

### 5.1 Kotlin 完整实现

#### 5.1.1 数据模型

```kotlin
// 数据类定义
data class DeviceInfo(
    val deviceId: String,
    val model: String,
    val os: String,
    val osVersion: String,
    val manufacturer: String,
    val network: String,
    val appVersion: String,
    val totalMemory: Int,
    val screenResolution: String
)

data class VerifyRequest(
    val code: String,
    val deviceId: String
)

data class ActivateRequest(
    val code: String,
    val deviceInfo: DeviceInfo
)

data class ActivateResponse(
    val success: Boolean,
    val code: Int,
    val message: String,
    val data: ActivateData?
)

data class ActivateData(
    val robotId: String,
    val robotUuid: String,
    val token: String,
    val refreshToken: String,
    val expiresAt: String
)

data class HeartbeatRequest(
    val timestamp: Long,
    val memoryUsage: Long,
    val cpuUsage: Int,
    val batteryLevel: Int,
    val networkType: String
)

data class WSMessage(
    val type: String,
    val data: Map<String, Any>,
    val timestamp: Long = System.currentTimeMillis(),
    val messageId: String = UUID.randomUUID().toString()
)
```

#### 5.1.2 API客户端

```kotlin
import okhttp3.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import com.google.gson.Gson

class ApiClient private constructor() {
    companion object {
        private const val BASE_URL = "https://your-server.com"
        
        @Volatile
        private var instance: ApiClient? = null
        
        fun getInstance() = instance ?: synchronized(this) {
            instance ?: ApiClient().also { instance = it }
        }
    }
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    private val apiService = retrofit.create(ApiService::class.java)
    private val gson = Gson()
    
    private var token: String? = null
    
    fun setToken(token: String) {
        this.token = token
    }
    
    suspend fun verifyCode(code: String): Result<VerifyData> {
        return try {
            val deviceId = getDeviceId()
            val request = VerifyRequest(code, deviceId)
            
            val response = apiService.verifyCode(request)
            
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun activateRobot(code: String): Result<ActivateData> {
        return try {
            val deviceInfo = DeviceInfo(
                deviceId = getDeviceId(),
                model = Build.MODEL,
                os = "Android",
                osVersion = Build.VERSION.RELEASE,
                manufacturer = Build.MANUFACTURER,
                network = getNetworkType(),
                appVersion = getAppVersion(),
                totalMemory = getTotalMemory(),
                screenResolution = getScreenResolution()
            )
            
            val request = ActivateRequest(code, deviceInfo)
            
            val response = apiService.activateRobot(request)
            
            if (response.success && response.data != null) {
                // 保存配置
                saveConfig(response.data)
                
                // 设置Token
                setToken(response.data.token)
                
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun sendHeartbeat(): Result<String> {
        return try {
            val request = HeartbeatRequest(
                timestamp = System.currentTimeMillis(),
                memoryUsage = getMemoryUsage(),
                cpuUsage = getCpuUsage(),
                batteryLevel = getBatteryLevel(),
                networkType = getNetworkType()
            )
            
            val response = apiService.sendHeartbeat(token!!, request)
            
            if (response.success) {
                Result.success("OK")
            } else {
                Result.failure(Exception(response.message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // 工具方法
    private fun getDeviceId(): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: ""
    }
    
    private fun getNetworkType(): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val networkInfo = cm.activeNetworkInfo
        return when (networkInfo?.type) {
            ConnectivityManager.TYPE_WIFI -> "wifi"
            ConnectivityManager.TYPE_MOBILE -> "mobile"
            else -> "unknown"
        }
    }
    
    private fun getBatteryLevel(): Int {
        val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { intent ->
            context.registerReceiver(null, intent)
        }
        val level: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level != -1 && scale != -1) {
            (level * 100) / scale
        } else {
            -1
        }
    }
    
    private fun getAppVersion(): String {
        return try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            packageInfo.versionName
        } catch (e: Exception) {
            "unknown"
        }
    }
    
    private fun getMemoryUsage(): Long {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        return memoryInfo.availMem
    }
    
    private fun getCpuUsage(): Int {
        return try {
            val reader = RandomAccessFile("/proc/stat", "r")
            val load = reader.readLine()
            val toks = load.split(" ".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
            val idle1 = toks[5].toLong()
            val cpu1 = toks[2].toLong() + toks[3].toLong() + toks[4].toLong()
            Thread.sleep(360)
            reader.seek(0)
            val load2 = reader.readLine()
            reader.close()
            val toks2 = load2.split(" ".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
            val idle2 = toks2[5].toLong()
            val cpu2 = toks2[2].toLong() + toks2[3].toLong() + toks2[4].toLong()
            ((cpu2 - cpu1) * 100.0f / ((cpu2 + idle2) - (cpu1 + idle1))).toInt()
        } catch (ex: Exception) {
            0
        }
    }
    
    private fun getTotalMemory(): Int {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        return (memoryInfo.totalMem / (1024 * 1024)).toInt()
    }
    
    private fun getScreenResolution(): String {
        val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val displayMetrics = DisplayMetrics()
        windowManager.defaultDisplay.getMetrics(displayMetrics)
        return "${displayMetrics.widthPixels}x${displayMetrics.heightPixels}"
    }
    
    private fun saveConfig(data: ActivateData) {
        val prefs = context.getSharedPreferences("robot_config", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("robot_id", data.robotId)
            putString("robot_uuid", data.robotUuid)
            putString("token", data.token)
            putString("refresh_token", data.refreshToken)
            putLong("expires_at", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                .parse(data.expiresAt)?.time ?: 0)
            putLong("activated_at", System.currentTimeMillis())
            apply()
        }
    }
}

interface ApiService {
    @POST("/api/robot-ids/verify")
    suspend fun verifyCode(@Body request: VerifyRequest): VerifyResponse
    
    @POST("/api/robot-ids/activate")
    suspend fun activateRobot(@Body request: ActivateRequest): ActivateResponse
    
    @POST("/api/heartbeat")
    suspend fun sendHeartbeat(
        @Header("Authorization") token: String,
        @Body request: HeartbeatRequest
    ): HeartbeatResponse
}
```

#### 5.1.3 WebSocket 客户端

```kotlin
import okhttp3.*
import okio.ByteString
import java.util.*

class WebSocketClient(
    private val context: Context,
    private val robotId: String,
    private val token: String
) {
    private var ws: WebSocket? = null
    private val messageQueue = mutableListOf<WSMessage>()
    private var isConnected = false
    private val reconnectDelays = listOf(1000L, 2000L, 5000L, 10000L, 30000L)
    private var reconnectAttempts = 0
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .writeTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()
    
    private val gson = Gson()
    
    fun connect() {
        val url = "wss://your-server.com/ws/connect?token=$token"
        
        val request = Request.Builder()
            .url(url)
            .build()
        
        ws = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                isConnected = true
                reconnectAttempts = 0
                Log.d(TAG, "WebSocket connected")
                
                // 发送排队的消息
                messageQueue.forEach { msg ->
                    webSocket.send(gson.toJson(msg))
                }
                messageQueue.clear()
                
                // 发送心跳
                startHeartbeat(webSocket)
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Received: $text")
                val message = gson.fromJson(text, WSMessage::class.java)
                handleMessage(message)
            }
            
            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                // 处理二进制消息
            }
            
            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "Closing: $code $reason")
                isConnected = false
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "Closed: $code $reason")
                isConnected = false
                scheduleReconnect()
            }
            
            override fun onFailure(
                webSocket: WebSocket,
                t: Throwable,
                response: Response?
            ) {
                Log.e(TAG, "Error: ${t.message}", t)
                isConnected = false
                scheduleReconnect()
            }
        })
    }
    
    fun send(message: WSMessage) {
        if (isConnected && ws != null) {
            ws!!.send(gson.toJson(message))
        } else {
            Log.d(TAG, "Message queued: ${message.type}")
            messageQueue.add(message)
        }
    }
    
    fun disconnect() {
        ws?.close(1000, "Normal close")
        ws = null
        isConnected = false
    }
    
    private fun handleMessage(message: WSMessage) {
        when (message.type) {
            "command" -> handleCommand(message.data)
            "config" -> handleConfig(message.data)
            "heartbeat_response" -> handleHeartbeatResponse(message.data)
            "error" -> handleError(message.data)
            else -> Log.w(TAG, "Unknown message type: ${message.type}")
        }
    }
    
    private fun handleCommand(data: Map<String, Any>) {
        val commandId = data["commandId"] as String
        val commandType = data["commandType"] as String
        val params = data["params"] as Map<String, Any>
        
        Log.d(TAG, "Received command: $commandType")
        
        // 执行指令
        CoroutineScope(Dispatchers.IO).launch {
            val result = executeCommand(commandType, params)
            
            // 发送结果
            send(WSMessage(
                type = "result",
                data = mapOf(
                    "commandId" to commandId,
                    "status" to result.status,
                    "result" to result.data,
                    "errorMessage" to result.errorMessage
                )
            ))
        }
    }
    
    private fun executeCommand(commandType: String, params: Map<String, Any>): CommandResult {
        return try {
            when (commandType) {
                "send_message" -> {
                    val target = params["target"] as String
                    val content = params["content"] as String
                    val messageType = params["messageType"] as String
                    
                    // 调用企业微信API发送消息
                    val messageId = sendWeChatMessage(target, content, messageType)
                    
                    CommandResult(
                        status = "success",
                        data = mapOf("messageId" to messageId),
                        errorMessage = null
                    )
                }
                else -> CommandResult(
                    status = "failed",
                    data = null,
                    errorMessage = "Unknown command type"
                )
            }
        } catch (e: Exception) {
            CommandResult(
                status = "failed",
                data = null,
                errorMessage = e.message
            )
        }
    }
    
    private fun sendWeChatMessage(target: String, content: String, messageType: String): String {
        // 调用企业微信API
        // 返回消息ID
        return "msg-${UUID.randomUUID()}"
    }
    
    private fun handleConfig(data: Map<String, Any>) {
        val configType = data["configType"] as String
        val config = data["config"] as Map<String, Any>
        
        Log.d(TAG, "Received config: $configType")
        
        // 保存配置
        val prefs = context.getSharedPreferences("robot_config", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("config_$configType", gson.toJson(config))
            apply()
        }
    }
    
    private fun handleHeartbeatResponse(data: Map<String, Any>) {
        val serverTime = data["serverTime"] as String
        Log.d(TAG, "Heartbeat response: $serverTime")
    }
    
    private fun handleError(data: Map<String, Any>) {
        val errorMessage = data["errorMessage"] as String
        Log.e(TAG, "Server error: $errorMessage")
        
        // 显示错误
        showError(errorMessage)
    }
    
    private fun startHeartbeat(webSocket: WebSocket) {
        CoroutineScope(Dispatchers.IO).launch {
            while (isConnected) {
                delay(30000) // 30秒
                
                if (isConnected) {
                    val heartbeat = WSMessage(
                        type = "heartbeat",
                        data = mapOf(
                            "timestamp" to System.currentTimeMillis(),
                            "memoryUsage" to getMemoryUsage(),
                            "batteryLevel" to getBatteryLevel(),
                            "networkType" to getNetworkType()
                        )
                    )
                    webSocket.send(gson.toJson(heartbeat))
                }
            }
        }
    }
    
    private fun scheduleReconnect() {
        if (reconnectAttempts < reconnectDelays.size) {
            val delay = reconnectDelays[reconnectAttempts]
            Log.d(TAG, "Reconnecting in ${delay}ms...")
            
            Handler(Looper.getMainLooper()).postDelayed({
                reconnectAttempts++
                connect()
            }, delay)
        } else {
            Log.e(TAG, "Max reconnection attempts reached")
            showError("连接失败，请检查网络或重新激活")
        }
    }
    
    private fun showError(message: String) {
        // 显示错误通知
        Toast.makeText(context, message, Toast.LENGTH_LONG).show()
    }
    
    companion object {
        private const val TAG = "WebSocketClient"
    }
}

data class CommandResult(
    val status: String,
    val data: Map<String, Any>?,
    val errorMessage: String?
)
```

#### 5.1.4 使用示例

```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var apiClient: ApiClient
    private lateinit var wsClient: WebSocketClient
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        apiClient = ApiClient.getInstance()
        
        // 检查是否已激活
        val prefs = getSharedPreferences("robot_config", Context.MODE_PRIVATE)
        val robotId = prefs.getString("robot_id", null)
        val token = prefs.getString("token", null)
        
        if (robotId != null && token != null) {
            // 已激活，连接WebSocket
            wsClient = WebSocketClient(this, robotId, token)
            wsClient.connect()
        } else {
            // 未激活，显示激活界面
            showActivationScreen()
        }
    }
    
    private fun activateRobot(code: String) {
        lifecycleScope.launch {
            when (val result = apiClient.activateRobot(code)) {
                is Result.Success -> {
                    // 激活成功，连接WebSocket
                    wsClient = WebSocketClient(
                        this@MainActivity,
                        result.data.robotId,
                        result.data.token
                    )
                    wsClient.connect()
                    
                    Toast.makeText(
                        this@MainActivity,
                        "激活成功！",
                        Toast.LENGTH_SHORT
                    ).show()
                }
                is Result.Failure -> {
                    Toast.makeText(
                        this@MainActivity,
                        "激活失败：${result.exception.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        wsClient?.disconnect()
    }
}
```

### 5.2 Java 完整实现（备选）

#### 5.2.1 API客户端

```java
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.http.*;

public class ApiClient {
    private static final String BASE_URL = "https://your-server.com";
    private static ApiClient instance;
    
    private ApiService apiService;
    private String token;
    
    private ApiClient() {
        Retrofit retrofit = new Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build();
        
        apiService = retrofit.create(ApiService.class);
    }
    
    public static synchronized ApiClient getInstance() {
        if (instance == null) {
            instance = new ApiClient();
        }
        return instance;
    }
    
    public void setToken(String token) {
        this.token = token;
    }
    
    public void verifyCode(String code, Callback<VerifyResponse> callback) {
        String deviceId = getDeviceId();
        VerifyRequest request = new VerifyRequest(code, deviceId);
        apiService.verifyCode(request).enqueue(callback);
    }
    
    public void activateRobot(String code, Callback<ActivateResponse> callback) {
        DeviceInfo deviceInfo = new DeviceInfo(
            getDeviceId(),
            Build.MODEL,
            "Android",
            Build.VERSION.RELEASE,
            Build.MANUFACTURER,
            getNetworkType(),
            getAppVersion(),
            getTotalMemory(),
            getScreenResolution()
        );
        
        ActivateRequest request = new ActivateRequest(code, deviceInfo);
        apiService.activateRobot(request).enqueue(callback);
    }
    
    private String getDeviceId() {
        return Settings.Secure.getString(
            getContentResolver(),
            Settings.Secure.ANDROID_ID
        );
    }
    
    private String getNetworkType() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = cm.getActiveNetworkInfo();
        if (networkInfo != null && networkInfo.isConnected()) {
            if (networkInfo.getType() == ConnectivityManager.TYPE_WIFI) {
                return "wifi";
            } else if (networkInfo.getType() == ConnectivityManager.TYPE_MOBILE) {
                return "mobile";
            }
        }
        return "unknown";
    }
    
    private String getAppVersion() {
        try {
            PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            return packageInfo.versionName;
        } catch (Exception e) {
            return "unknown";
        }
    }
    
    private int getTotalMemory() {
        ActivityManager activityManager = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
        activityManager.getMemoryInfo(memoryInfo);
        return (int) (memoryInfo.totalMem / (1024 * 1024));
    }
    
    private String getScreenResolution() {
        WindowManager windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        DisplayMetrics displayMetrics = new DisplayMetrics();
        windowManager.getDefaultDisplay().getMetrics(displayMetrics);
        return displayMetrics.widthPixels + "x" + displayMetrics.heightPixels;
    }
}

interface ApiService {
    @POST("/api/robot-ids/verify")
    Call<VerifyResponse> verifyCode(@Body VerifyRequest request);
    
    @POST("/api/robot-ids/activate")
    Call<ActivateResponse> activateRobot(@Body ActivateRequest request);
}
```

#### 5.2.2 WebSocket 客户端

```java
import okhttp3.*;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

public class WebSocketClient {
    private static final String TAG = "WebSocketClient";
    private static final long[] RECONNECT_DELAYS = {1000, 2000, 5000, 10000, 30000};
    
    private OkHttpClient client;
    private WebSocket webSocket;
    private String robotId;
    private String token;
    private boolean isConnected = false;
    private int reconnectAttempts = 0;
    
    public WebSocketClient(Context context, String robotId, String token) {
        this.robotId = robotId;
        this.token = token;
        
        client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .writeTimeout(0, TimeUnit.MILLISECONDS)
            .pingInterval(30, TimeUnit.SECONDS)
            .build();
    }
    
    public void connect() {
        String url = "wss://your-server.com/ws/connect?token=" + token;
        Request request = new Request.Builder()
            .url(url)
            .build();
        
        webSocket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                isConnected = true;
                reconnectAttempts = 0;
                Log.d(TAG, "WebSocket connected");
                
                // 开始发送心跳
                startHeartbeat(webSocket);
            }
            
            @Override
            public void onMessage(WebSocket webSocket, String text) {
                Log.d(TAG, "Received: " + text);
                handleMessage(text);
            }
            
            @Override
            public void onClosing(WebSocket webSocket, int code, String reason) {
                Log.d(TAG, "Closing: " + code + " " + reason);
                isConnected = false;
            }
            
            @Override
            public void onClosed(WebSocket webSocket, int code, String reason) {
                Log.d(TAG, "Closed: " + code + " " + reason);
                isConnected = false;
                scheduleReconnect();
            }
            
            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                Log.e(TAG, "Error: " + t.getMessage(), t);
                isConnected = false;
                scheduleReconnect();
            }
        });
    }
    
    public void send(String message) {
        if (isConnected && webSocket != null) {
            webSocket.send(message);
        }
    }
    
    public void disconnect() {
        if (webSocket != null) {
            webSocket.close(1000, "Normal close");
            webSocket = null;
        }
        isConnected = false;
    }
    
    private void handleMessage(String text) {
        try {
            JSONObject json = new JSONObject(text);
            String type = json.getString("type");
            
            switch (type) {
                case "command":
                    handleCommand(json.getJSONObject("data"));
                    break;
                case "config":
                    handleConfig(json.getJSONObject("data"));
                    break;
                case "heartbeat_response":
                    handleHeartbeatResponse(json.getJSONObject("data"));
                    break;
                default:
                    Log.w(TAG, "Unknown message type: " + type);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling message: " + e.getMessage(), e);
        }
    }
    
    private void handleCommand(JSONObject data) throws JSONException {
        String commandId = data.getString("commandId");
        String commandType = data.getString("commandType");
        JSONObject params = data.getJSONObject("params");
        
        Log.d(TAG, "Received command: " + commandType);
        
        // 执行指令
        CommandResult result = executeCommand(commandType, params);
        
        // 发送结果
        JSONObject resultJson = new JSONObject();
        resultJson.put("type", "result");
        resultJson.put("data", new JSONObject()
            .put("commandId", commandId)
            .put("status", result.status)
            .put("result", result.data != null ? new JSONObject(result.data) : null)
            .put("errorMessage", result.errorMessage));
        
        send(resultJson.toString());
    }
    
    private CommandResult executeCommand(String commandType, JSONObject params) {
        try {
            if ("send_message".equals(commandType)) {
                String target = params.getString("target");
                String content = params.getString("content");
                String messageType = params.getString("messageType");
                
                // 调用企业微信API
                String messageId = sendWeChatMessage(target, content, messageType);
                
                return new CommandResult("success", 
                    Map.of("messageId", messageId), null);
            } else {
                return new CommandResult("failed", null, "Unknown command type");
            }
        } catch (Exception e) {
            return new CommandResult("failed", null, e.getMessage());
        }
    }
    
    private String sendWeChatMessage(String target, String content, String messageType) {
        // 调用企业微信API
        return "msg-" + UUID.randomUUID().toString();
    }
    
    private void handleConfig(JSONObject data) throws JSONException {
        String configType = data.getString("configType");
        JSONObject config = data.getJSONObject("config");
        
        Log.d(TAG, "Received config: " + configType);
        
        // 保存配置
        SharedPreferences prefs = context.getSharedPreferences(
            "robot_config", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("config_" + configType, config.toString());
        editor.apply();
    }
    
    private void handleHeartbeatResponse(JSONObject data) throws JSONException {
        String serverTime = data.getString("serverTime");
        Log.d(TAG, "Heartbeat response: " + serverTime);
    }
    
    private void startHeartbeat(WebSocket ws) {
        new Thread(() -> {
            while (isConnected) {
                try {
                    Thread.sleep(30000); // 30秒
                    
                    if (isConnected) {
                        JSONObject heartbeat = new JSONObject();
                        heartbeat.put("type", "heartbeat");
                        heartbeat.put("data", new JSONObject()
                            .put("timestamp", System.currentTimeMillis())
                            .put("memoryUsage", getMemoryUsage())
                            .put("batteryLevel", getBatteryLevel())
                            .put("networkType", getNetworkType()));
                        
                        ws.send(heartbeat.toString());
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Heartbeat error: " + e.getMessage(), e);
                }
            }
        }).start();
    }
    
    private void scheduleReconnect() {
        if (reconnectAttempts < RECONNECT_DELAYS.length) {
            long delay = RECONNECT_DELAYS[reconnectAttempts];
            Log.d(TAG, "Reconnecting in " + delay + "ms...");
            
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                reconnectAttempts++;
                connect();
            }, delay);
        } else {
            Log.e(TAG, "Max reconnection attempts reached");
        }
    }
    
    private int getMemoryUsage() {
        ActivityManager activityManager = (ActivityManager) context.getSystemService(ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
        activityManager.getMemoryInfo(memoryInfo);
        return (int) (memoryInfo.availMem / (1024 * 1024));
    }
    
    private int getBatteryLevel() {
        IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        Intent batteryStatus = context.registerReceiver(null, ifilter);
        int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        return level * 100 / scale;
    }
    
    private String getNetworkType() {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = cm.getActiveNetworkInfo();
        if (networkInfo != null && networkInfo.isConnected()) {
            if (networkInfo.getType() == ConnectivityManager.TYPE_WIFI) {
                return "wifi";
            } else if (networkInfo.getType() == ConnectivityManager.TYPE_MOBILE) {
                return "mobile";
            }
        }
        return "unknown";
    }
    
    static class CommandResult {
        String status;
        Map<String, Object> data;
        String errorMessage;
        
        CommandResult(String status, Map<String, Object> data, String errorMessage) {
            this.status = status;
            this.data = data;
            this.errorMessage = errorMessage;
        }
    }
}
```

---

## 6. 第三方平台通讯协议

### 6.1 集成方式

WorkBot 支持两种第三方集成方式：

| 方式 | 协议 | 用途 | 实现难度 |
|-----|------|------|---------|
| **HTTP 回调** | HTTP POST | 推送消息和结果 | 简单 |
| **WebSocket 代理** | WebSocket | 实时双向通讯 | 中等 |

### 6.2 HTTP 回调协议

#### 6.2.1 回调类型

| 回调类型 | 说明 | 触发时机 |
|---------|------|---------|
| **message** | 消息回调 | 收到新消息时 |
| **result** | 结果回调 | 指令执行完成时 |
| **qrcode** | 二维码回调 | 获取群二维码时 |
| **online** | 上线回调 | 机器人上线时 |
| **offline** | 下线回调 | 机器人下线时 |
| **image** | 图片回调 | 收到图片消息时 |

#### 6.2.2 回调地址配置

**基础URL**：`https://third-party.com`

**完整回调地址**：
```
消息回调:
  https://third-party.com/api/callback/message?robotId=RBml9n7nikHIMZU0

结果回调:
  https://third-party.com/api/callback/result?robotId=RBml9n7nikHIMZU0

二维码回调:
  https://third-party.com/api/callback/qrcode?robotId=RBml9n7nikHIMZU0

上线回调:
  https://third-party.com/api/callback/online?robotId=RBml9n7nikHIMZU0

下线回调:
  https://third-party.com/api/callback/offline?robotId=RBml9n7nikHIMZU0

图片回调:
  https://third-party.com/api/callback/image?robotId=RBml9n7nikHIMZU0
```

#### 6.2.3 消息回调

**接口**：`POST /api/callback/message?robotId={robotId}`

**请求头**：
```http
Content-Type: application/json
X-Robot-Id: {robotId}
X-Timestamp: {timestamp}
X-Signature: {signature}
```

**请求体**：
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

**字段说明**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| messageId | string | 消息ID |
| senderId | string | 发送者ID |
| senderName | string | 发送者名称 |
| messageType | string | 消息类型 (text/image/video/audio/file/card) |
| content | string | 消息内容 |
| chatType | string | 聊天类型 (single/group) |
| extraData | object | 额外数据 |
| timestamp | string | 时间戳 (ISO 8601) |

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

**第三方服务端实现示例**：

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const SECRET_KEY = 'your-secret-key';

// 验证签名
function verifySignature(robotId: string, body: any, timestamp: string, signature: string): boolean {
  const payload = `${robotId}:${JSON.stringify(body)}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}

// 消息回调
app.post('/api/callback/message', async (req, res) => {
  try {
    const robotId = req.query.robotId as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const signature = req.headers['x-signature'] as string;
    
    // 验证签名
    if (!verifySignature(robotId, req.body, timestamp, signature)) {
      return res.status(401).json({
        code: 401,
        message: '签名验证失败'
      });
    }
    
    const { messageId, senderId, senderName, messageType, content, chatType } = req.body;
    
    console.log(`收到消息 [${robotId}]: ${senderName}: ${content}`);
    
    // 处理消息
    // ...
    
    return res.json({
      code: 200,
      message: '消息接收成功',
      data: {
        messageId,
        robotId,
        receivedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('处理消息回调失败:', error);
    return res.status(500).json({
      code: 500,
      message: '处理失败'
    });
  }
});

app.listen(3000, () => {
  console.log('第三方回调服务启动在端口 3000');
});
```

#### 6.2.4 结果回调

**接口**：`POST /api/callback/result?robotId={robotId}`

**请求体**：
```json
{
  "commandId": "cmd-1770341503000-abc123",
  "commandType": "send_message",
  "status": "success",
  "result": {
    "message": "执行成功",
    "messageId": "msg-002"
  },
  "errorMessage": null,
  "executedAt": "2026-02-06T10:05:05.000Z"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "执行结果接收成功",
  "data": {
    "commandId": "cmd-1770341503000-abc123",
    "status": "success",
    "updatedAt": "2026-02-06T10:05:05.000Z"
  }
}
```

#### 6.2.5 二维码回调

**接口**：`POST /api/callback/qrcode?robotId={robotId}`

**请求体**：
```json
{
  "groupChatId": "group-xxx",
  "qrcodeUrl": "https://example.com/qrcode/xxx.png",
  "groupName": "测试群",
  "timestamp": "2026-02-06T10:05:00.000Z"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "群二维码接收成功",
  "data": {
    "robotId": "RBml9n7nikHIMZU0",
    "groupChatId": "group-xxx",
    "qrcodeUrl": "https://example.com/qrcode/xxx.png",
    "receivedAt": "2026-02-06T10:05:00.000Z"
  }
}
```

#### 6.2.6 状态回调

**接口**：`POST /api/callback/status?robotId={robotId}`

**请求体**：
```json
{
  "status": "online",
  "deviceInfo": {
    "model": "Xiaomi 14",
    "os": "Android 14",
    "appVersion": "1.0.0"
  },
  "timestamp": "2026-02-06T10:05:00.000Z"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "机器人状态更新成功",
  "data": {
    "robotId": "RBml9n7nikHIMZU0",
    "status": "online",
    "updatedAt": "2026-02-06T10:05:00.000Z"
  }
}
```

#### 6.2.7 图片回调

**接口**：`POST /api/callback/image?robotId={robotId}`

**请求体**：
```json
{
  "messageId": "msg-1770341503000-abc123",
  "senderId": "wxid-xxx",
  "senderName": "张三",
  "imageUrl": "https://example.com/image.png",
  "imageBase64": "base64_encoded_image_data",
  "timestamp": "2026-02-06T10:05:00.000Z"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "图片消息接收成功",
  "data": {
    "messageId": "msg-1770341503000-abc123",
    "robotId": "RBml9n7nikHIMZU0",
    "imageUrl": "https://example.com/image.png",
    "receivedAt": "2026-02-06T10:05:00.000Z"
  }
}
```

### 6.3 WorkTool 平台兼容

#### 6.3.1 WorkTool API 地址

```
基础URL: https://api.worktool.ymdyes.cn
```

#### 6.3.2 WorkTool 消息类型

| type | 说明 | 参数 |
|-----|------|------|
| 203 | 发送文本消息 | titleList, receivedContent, atList |
| 205 | 转发消息 | sourceMessageId, targetList |
| 206 | 修改群信息 | groupName, newGroupName, groupNotice |
| 207 | 群管理 | groupName, operation, memberList |
| 208 | 改群备注 | groupName, groupRemark |
| 209 | 改群公告 | groupName, groupNotice |
| 213 | 修改群模板 | groupName, groupTemplate |
| 218 | 发送文件 | titleList, objectName, fileUrl, fileType |
| 219 | 解散群 | groupName |
| 220 | 修改用户备注 | userName, userRemark |
| 221 | 拉人入群 | groupName, memberList |
| 225 | 查找聊天窗 | keyword |
| 226 | 退出群 | groupName |
| 234 | 查找收藏 | keyword, time |
| 304 | 发送小程序 | titleList, appName, userName, path |
| 305 | 发送名片 | titleList, nameCard |
| 512 | 获取群二维码 | groupName |
| 900 | 发送收藏消息 | targetChat, locatorType, index/keyword/time |

#### 6.3.3 WorkTool API 调用示例

**发送文本消息 (type=203)**：

```typescript
import axios from 'axios';

async function sendTextMessage(robotId: string, params: {
  titleList: string[];
  receivedContent: string;
  atList?: string[];
}) {
  const response = await axios.post('https://api.worktool.ymdyes.cn/api/v3/command', {
    robotId,
    type: 203,
    ...params
  });
  
  return response.data;
}

// 使用示例
await sendTextMessage('RBml9n7nikHIMZU0', {
  titleList: ['张三'],
  receivedContent: '你好！\n这是一条测试消息',
  atList: ['@所有人']
});
```

**发送文件消息 (type=218)**：

```typescript
async function sendFileMessage(robotId: string, params: {
  titleList: string[];
  objectName: string;
  fileUrl: string;
  fileType: string;
  extraText?: string;
}) {
  const response = await axios.post('https://api.worktool.ymdyes.cn/api/v3/command', {
    robotId,
    type: 218,
    ...params
  });
  
  return response.data;
}

// 使用示例
await sendFileMessage('RBml9n7nikHIMZU0', {
  titleList: ['张三'],
  objectName: 'document.pdf',
  fileUrl: 'https://example.com/document.pdf',
  fileType: 'file',
  extraText: '这是重要的文档，请查收'
});
```

**获取群二维码 (type=512)**：

```typescript
async function getGroupQRCode(robotId: string, groupName: string) {
  const response = await axios.post('https://api.worktool.ymdyes.cn/api/v3/command', {
    robotId,
    type: 512,
    groupName
  });
  
  return response.data;
}

// 使用示例
await getGroupQRCode('RBml9n7nikHIMZU0', '测试群');
```

**发送收藏消息 (type=900)**：

```typescript
enum LocatorType {
  INDEX = 'index',      // 通过索引定位
  KEYWORD = 'keyword',  // 通过关键词定位
  TIME = 'time'         // 通过时间定位
}

async function sendFavoriteMessage(robotId: string, params: {
  targetChat: string;
  locatorType: LocatorType;
  index?: number;
  keyword?: string;
  time?: string;
}) {
  const response = await axios.post('https://api.worktool.ymdyes.cn/api/v3/command', {
    robotId,
    type: 900,
    ...params
  });
  
  return response.data;
}

// 使用示例 - 通过索引定位
await sendFavoriteMessage('RBml9n7nikHIMZU0', {
  targetChat: '工作群',
  locatorType: LocatorType.INDEX,
  index: 0
});

// 使用示例 - 通过关键词定位
await sendFavoriteMessage('RBml9n7nikHIMZU0', {
  targetChat: '工作群',
  locatorType: LocatorType.KEYWORD,
  keyword: '重要文档'
});
```

### 6.4 第三方调用 WorkBot

#### 6.4.1 发送指令

**接口**：`POST /api/commands`

**请求头**：
```http
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

#### 6.4.2 查询指令状态

**接口**：`GET /api/commands/{commandId}`

**请求头**：
```http
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

---

## 7. 通讯地址

### 7.1 WorkBot 服务器地址

| 服务 | 协议 | 地址 | 端口 | 用途 |
|-----|------|------|------|------|
| **API 服务** | HTTPS | `https://your-workbot.com` | 5000 | HTTP API 调用 |
| **WebSocket 服务** | WSS | `wss://your-workbot.com` | 5001 | 双向实时通讯 |

### 7.2 APP 连接地址

| 用途 | 协议 | 地址 | 说明 |
|-----|------|------|------|
| **激活验证** | HTTPS | `https://your-workbot.com/api/robot-ids/verify` | 验证激活码 |
| **激活设备** | HTTPS | `https://your-workbot.com/api/robot-ids/activate` | 激活机器人 |
| **发送心跳** | HTTPS | `https://your-workbot.com/api/heartbeat` | 保持连接 |
| **上报结果** | HTTPS | `https://your-workbot.com/api/result` | 上报执行结果 |
| **WebSocket 连接** | WSS | `wss://your-workbot.com/ws/connect?token={token}` | 实时通讯 |

### 7.3 WorkBot 提供给第三方的地址

**基础URL**：`https://your-workbot.com`

| 功能 | 地址 | 说明 |
|-----|------|------|
| **发送指令** | `POST /api/commands` | 第三方向WorkBot发送指令 |
| **查询指令状态** | `GET /api/commands/{commandId}` | 查询指令执行状态 |
| **获取机器人状态** | `GET /api/robots/{robotId}/status` | 获取机器人在线状态 |

### 7.4 第三方需要提供给 WorkBot 的地址

**基础URL**：`https://third-party.com`

| 功能 | 地址 | 说明 |
|-----|------|------|
| **消息回调** | `POST /api/callback/message?robotId={robotId}` | WorkBot推送消息到第三方 |
| **结果回调** | `POST /api/callback/result?robotId={robotId}` | WorkBot推送执行结果到第三方 |
| **二维码回调** | `POST /api/callback/qrcode?robotId={robotId}` | WorkBot推送群二维码到第三方 |
| **上线回调** | `POST /api/callback/online?robotId={robotId}` | WorkBot推送上线通知到第三方 |
| **下线回调** | `POST /api/callback/offline?robotId={robotId}` | WorkBot推送下线通知到第三方 |
| **图片回调** | `POST /api/callback/image?robotId={robotId}` | WorkBot推送图片消息到第三方 |

### 7.5 WorkTool 平台地址

| 服务 | 地址 | 说明 |
|-----|------|------|
| **WorkTool API** | `https://api.worktool.ymdyes.cn` | WorkTool官方API |

---

## 附录

### A. 错误码

| 错误码 | 说明 | 处理方式 |
|-------|------|---------|
| 0 | 成功 | - |
| 400 | 请求参数错误 | 检查参数格式 |
| 401 | 未授权 | 检查Token |
| 403 | 禁止访问 | 检查权限 |
| 404 | 资源不存在 | 检查资源ID |
| 500 | 服务器错误 | 联系管理员 |

### B. 签名验证

**签名生成算法**：

```
signature = HMAC-SHA256(SECRET_KEY, robotId + body + timestamp)
```

**实现示例**：

```typescript
import crypto from 'crypto';

function generateSignature(
  robotId: string,
  body: any,
  timestamp: string,
  secretKey: string
): string {
  const payload = `${robotId}:${JSON.stringify(body)}:${timestamp}`;
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}
```

### C. 常见问题

#### Q1: WebSocket 连接断开后如何重连？

使用指数退避策略：
1. 第1次：1秒后重连
2. 第2次：2秒后重连
3. 第3次：5秒后重连
4. 第4次：10秒后重连
5. 第5次：30秒后重连
6. 超过5次：提示用户手动重连

#### Q2: 激活码可以重复使用吗？

- **未使用的激活码**：可以激活，激活后绑定到设备
- **已使用的激活码**：
  - 绑定到当前设备：可以重新激活
  - 绑定到其他设备：无法激活

#### Q3: Token 过期后如何处理？

- **Access Token 过期**：使用 Refresh Token 刷新
- **Refresh Token 过期**：需要重新激活

---

**文档结束**

**版本**：v4.0
**更新日期**：2026-02-06
**维护者**：WorkBot Team
