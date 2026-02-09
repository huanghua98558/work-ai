# WorkBot 第三方集成系统分析

## 文档说明

本文档全面分析 WorkBot 系统，为实施新的第三方集成方案做好衔接准备。

**文档版本**: v1.0
**分析日期**: 2026-02-09
**方案**: APP 直接发送消息到第三方平台 + 智能回退机制

---

## 一、系统架构分析

### 1.1 当前架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Admin Web  │  │   User Web   │  │ WorkTool App │      │
│  │  (管理后台)   │  │  (用户前端)   │  │  (Android)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        服务端层                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Next.js HTTP Server (5000)                │   │
│  │  ┌───────────┐  ┌───────────┐  ┌─────────────────┐  │   │
│  │  │   API     │  │   Pages   │  │   WebSocket     │  │   │
│  │  │  Routes   │  │  (Admin)  │  │   Server v3.0   │  │   │
│  │  └───────────┘  └───────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据层                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │   Redis      │  │   File       │      │
│  │ (主数据库)    │  │  (缓存)      │  │  (日志)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js | 15.5.12 (App Router) |
| UI 库 | React | 19 |
| 语言 | TypeScript | 5 |
| 样式 | Tailwind CSS | 3.4 |
| 组件库 | shadcn/ui | - |
| 数据库 | PostgreSQL | 18 |
| ORM | Drizzle ORM | 0.45.1 |
| WebSocket | ws | - |
| 认证 | JWT | jsonwebtoken |
| 加密 | bcryptjs | - |
| 验证 | Zod | - |

---

## 二、数据库表结构分析

### 2.1 核心表结构

#### 2.1.1 用户表 (users)

```typescript
{
  id: serial,                    // 主键
  nickname: varchar(100),        // 昵称
  avatar: text,                  // 头像
  phone: varchar(20),            // 手机号（唯一）
  passwordHash: text,            // 密码哈希
  role: varchar(20),             // 角色: admin, user
  status: varchar(20),           // 状态: active, disabled
  createdAt: timestamp,          // 创建时间
  updatedAt: timestamp,          // 更新时间
  lastLoginAt: timestamp,        // 最后登录时间
}
```

**索引**:
- `users_phone_idx` (phone)

---

#### 2.1.2 激活码表 (activation_codes)

```typescript
{
  id: serial,                    // 主键
  code: varchar(8),              // 8位激活码（唯一）
  status: varchar(20),           // 状态: unused, used, expired, disabled
  validityPeriod: integer,       // 有效期（天数）
  boundUserId: integer,          // 绑定的用户ID
  price: decimal(10,2),          // 价格
  createdBy: integer,            // 创建人ID
  createdAt: timestamp,          // 创建时间
  expiresAt: timestamp,          // 激活码过期时间
  usedAt: timestamp,             // 首次使用时间
  notes: text,                   // 备注
}
```

**索引**:
- `activation_codes_code_idx` (code)
- `activation_codes_status_idx` (status)

---

#### 2.1.3 机器人配置表 (robots)

```typescript
{
  id: serial,                    // 主键
  robotId: varchar(255),         // 机器人ID（唯一）
  robotUuid: varchar(255),       // 机器人UUID（唯一）
  userId: integer,               // 用户ID
  name: varchar(100),            // 机器人名称
  status: varchar(20),           // 状态: online, offline, deleted

  // AI回复模式
  aiMode: varchar(20),           // builtin, third_party
  aiProvider: varchar(50),       // doubao, deepseek, kimi, custom
  aiModel: varchar(100),         // 模型名称
  aiApiKey: text,                // API密钥
  aiTemperature: decimal(3,2),   // 温度参数
  aiMaxTokens: integer,          // 最大tokens
  aiContextLength: integer,      // 上下文长度
  aiScenario: varchar(50),       // 应用场景

  // 第三方平台配置 ⭐ 新方案核心字段
  thirdPartyCallbackUrl: text,          // 消息回调地址
  thirdPartyResultCallbackUrl: text,    // 结果回调地址
  thirdPartySecretKey: text,            // 密钥

  // 统计信息
  totalMessages: integer,        // 总消息数
  aiCallsToday: integer,         // 今日AI调用次数
  lastResetAt: timestamp,        // 最后重置时间
  lastActiveAt: timestamp,       // 最后活跃时间

  createdAt: timestamp,          // 创建时间
  updatedAt: timestamp,          // 更新时间
  deletedAt: timestamp,          // 删除时间
}
```

**索引**:
- `robots_robot_id_idx` (robotId)
- `robots_user_id_idx` (userId)

**关键字段说明**（新方案）:
- `thirdPartyCallbackUrl`: 第三方平台的消息回调地址
  - APP 发送消息的目标地址
  - 格式：`https://api.dify.ai/callback`
  - APP 生成完整回调地址：`{url}/api/worktool/callback/{type}?robotId={robotId}`

- `thirdPartyResultCallbackUrl`: 第三方平台的结果回调地址
  - 第三方平台处理完消息后，调用此地址发送回复
  - 格式：`https://api.dify.ai/result`
  - 服务器通过 WebSocket 推送给 APP

- `thirdPartySecretKey`: 第三方平台的密钥
  - 用于签名验证（可选）
  - 保证安全性

---

#### 2.1.4 机器人成员表 (robot_members)

```typescript
{
  id: serial,                    // 主键
  robotId: integer,              // 机器人ID
  userId: integer,               // 用户ID
  memberId: varchar(255),        // 成员ID
  memberName: varchar(100),      // 成员名称
  memberAvatar: varchar(500),    // 成员头像
  status: varchar(20),           // 状态: active, inactive
  role: varchar(20),             // 角色: member, admin
  tags: text,                    // 标签（JSON）
  customData: text,              // 自定义数据（JSON）
  createdAt: timestamp,          // 创建时间
  updatedAt: timestamp,          // 更新时间
}
```

**索引**:
- `robot_members_robot_id_idx` (robotId)
- `robot_members_user_id_idx` (userId)

---

#### 2.1.5 对话会话表 (conversations)

```typescript
{
  id: serial,                    // 主键
  conversationId: varchar(255),  // 会话ID（唯一）
  robotId: integer,              // 机器人ID
  memberId: integer,             // 成员ID
  status: varchar(20),           // 状态: active, closed, archived
  summary: text,                 // 对话摘要
  tags: text,                    // 标签（JSON）
  messageCount: integer,         // 消息数量
  lastMessageAt: timestamp,      // 最后消息时间
  createdAt: timestamp,          // 创建时间
  updatedAt: timestamp,          // 更新时间
  closedAt: timestamp,           // 关闭时间
}
```

**索引**:
- `conversations_conversation_id_idx` (conversationId)
- `conversations_robot_id_idx` (robotId)
- `conversations_member_id_idx` (memberId)

---

#### 2.1.6 消息记录表 (messages)

```typescript
{
  id: serial,                    // 主键
  conversationId: integer,       // 会话ID
  robotId: integer,              // 机器人ID
  memberId: integer,             // 成员ID
  messageType: varchar(20),      // 消息类型: text, image, voice, video, file, link, system
  direction: varchar(20),        // 方向: inbound, outbound
  content: text,                 // 消息内容
  mediaUrl: text,                // 媒体文件URL
  aiGenerated: boolean,          // 是否AI生成
  aiModel: varchar(100),         // AI模型
  aiTokensUsed: integer,         // AI使用的tokens
  aiCost: decimal(10,4),         // AI成本
  metadata: text,                // 元数据（JSON）
  createdAt: timestamp,          // 创建时间
}
```

**索引**:
- `messages_conversation_id_idx` (conversationId)
- `messages_robot_id_idx` (robotId)
- `messages_created_at_idx` (createdAt)

---

#### 2.1.7 AI调用日志表 (ai_logs)

```typescript
{
  id: serial,                    // 主键
  robotId: integer,              // 机器人ID
  conversationId: integer,       // 会话ID
  messageId: integer,            // 消息ID
  provider: varchar(50),         // 提供商: doubao, deepseek, kimi, custom
  model: varchar(100),           // 模型名称
  requestText: text,             // 请求文本
  responseText: text,            // 响应文本
  tokensUsed: integer,           // 使用的tokens
  cost: decimal(10,4),           // 成本
  latency: integer,              // 延迟（毫秒）
  status: varchar(20),           // 状态: success, failed
  errorMessage: text,            // 错误消息
  createdAt: timestamp,          // 创建时间
}
```

**索引**:
- `ai_logs_robot_id_idx` (robotId)
- `ai_logs_conversation_id_idx` (conversationId)
- `ai_logs_created_at_idx` (createdAt)

---

#### 2.1.8 日志远程调度表 (logs)

```typescript
{
  id: varchar(64),               // 主键
  robotId: varchar(64),          // 机器人ID
  timestamp: bigint,             // Unix毫秒时间戳
  level: integer,                // 日志级别: 0-5
  tag: varchar(128),             // 日志标签
  message: text,                 // 消息内容
  extra: text,                   // 扩展信息（JSON）
  stackTrace: text,              // 堆栈跟踪
  syncStatus: varchar(20),       // 同步状态: pending, syncing, success, failed, ignored
  syncTime: bigint,              // 同步时间（Unix秒）
  deviceId: varchar(128),        // 设备ID
  createdAt: timestamp,          // 创建时间
}
```

**索引**:
- `logs_robot_id_idx` (robotId)
- `logs_timestamp_idx` (timestamp)
- `logs_level_idx` (level)
- `logs_tag_idx` (tag)
- `logs_sync_status_idx` (syncStatus)

---

#### 2.1.9 日志配置表 (log_configs)

```typescript
{
  robotId: varchar(64),          // 机器人ID（主键）
  logLevel: integer,             // 日志级别: 0-5
  uploadEnabled: boolean,        // 是否启用上传
  uploadInterval: integer,       // 上传间隔（毫秒）
  uploadOnWifiOnly: boolean,     // 仅WiFi上传
  maxLogEntries: integer,        // 最大日志条数
  retentionDays: integer,        // 保留天数
  tags: text,                    // 标签配置（JSON）
  updatedAt: timestamp,          // 更新时间
}
```

---

### 2.2 需要新增的表

#### 2.2.1 设备激活表 (device_activations)

**说明**: 此表用于管理 APP 激活和设备绑定，是新方案的核心表。

```typescript
{
  id: serial,                    // 主键
  robotId: varchar(255),         // 机器人ID（唯一）⭐
  robotUuid: varchar(255),       // 机器人UUID（唯一）
  deviceId: varchar(255),        // 设备ID
  userId: integer,               // 用户ID
  activationCode: varchar(8),    // 激活码
  status: varchar(20),           // 状态: active, inactive, expired
  activatedAt: timestamp,        // 激活时间
  expiresAt: timestamp,          // 过期时间
  lastSeenAt: timestamp,         // 最后在线时间
  deviceInfo: text,              // 设备信息（JSON）

  // 配置同步相关 ⭐ 新增
  configVersion: integer,        // 配置版本号
  configSyncedAt: timestamp,     // 配置同步时间
  configSynced: boolean,         // 是否已同步
  configError: text,             // 配置错误信息

  createdAt: timestamp,          // 创建时间
  updatedAt: timestamp,          // 更新时间
}
```

**索引**:
- `device_activations_robot_id_idx` (robotId)
- `device_activations_device_id_idx` (deviceId)
- `device_activations_user_id_idx` (userId)

**关键字段说明**:
- `robotId`: APP 使用的机器人标识符（20位中英文数字混合）
- `configVersion`: 配置版本号，用于防止配置冲突
- `configSynced`: 配置是否已同步到 APP
- `configError`: 配置同步失败时的错误信息

---

#### 2.2.2 配置同步日志表 (config_sync_logs)

**说明**: 记录配置推送和同步的详细日志。

```typescript
{
  id: serial,                    // 主键
  robotId: varchar(255),         // 机器人ID
  configVersion: varchar(50),    // 配置版本号
  configData: jsonb,             // 配置数据（JSONB）
  syncStatus: varchar(20),       // 同步状态: pending, synced, failed
  syncedAt: timestamp,           // 同步时间
  errorMessage: text,            // 错误消息
  createdAt: timestamp,          // 创建时间
}
```

**索引**:
- `config_sync_logs_robot_id_idx` (robotId)
- `config_sync_logs_status_idx` (syncStatus)
- `config_sync_logs_version_idx` (configVersion)

---

#### 2.2.3 消息发送失败日志表 (message_fail_logs)

**说明**: 记录 APP 发送消息到第三方平台失败的日志。

```typescript
{
  id: serial,                    // 主键
  robotId: varchar(255),         // 机器人ID
  messageId: varchar(255),       // 消息ID
  thirdPartyUrl: text,           // 第三方URL
  errorMessage: text,            // 错误消息
  errorType: varchar(50),        // 错误类型: timeout, network, server, client
  retryCount: integer,           // 重试次数
  failedAt: timestamp,           // 失败时间
  createdAt: timestamp,          // 创建时间
}
```

**索引**:
- `message_fail_logs_robot_id_idx` (robotId)
- `message_fail_logs_message_id_idx` (messageId)
- `message_fail_logs_error_type_idx` (errorType)
- `message_fail_logs_created_at_idx` (createdAt)

---

#### 2.2.4 会话表 (sessions)

**说明**: 用于管理会话状态，替代 `conversations` 表（简化版）。

```typescript
{
  id: serial,                    // 主键
  sessionId: varchar(255),       // 会话ID（唯一）
  robotId: varchar(255),         // 机器人ID
  userId: varchar(255),          // 用户ID
  status: varchar(20),           // 状态: active, closed, archived
  messageCount: integer,         // 消息数量
  lastMessageAt: timestamp,      // 最后消息时间
  createdAt: timestamp,          // 创建时间
  updatedAt: timestamp,          // 更新时间
}
```

**索引**:
- `sessions_session_id_idx` (sessionId)
- `sessions_robot_id_idx` (robotId)
- `sessions_user_id_idx` (userId)

---

## 三、API 接口分析

### 3.1 现有接口列表

| 接口路径 | 方法 | 说明 | 状态 |
|---------|------|------|------|
| `/api/auth/login` | POST | 用户登录 | ✅ 已实现 |
| `/api/auth/refresh-token` | POST | 刷新 Token | ✅ 已实现 |
| `/api/activation-codes` | GET/POST | 激活码管理 | ✅ 已实现 |
| `/api/robots` | GET/POST | 机器人管理 | ✅ 已实现 |
| `/api/robot-ids/activate` | POST | 设备激活 | ✅ 已实现 |
| `/api/worktool/callback` | POST | WorkTool 回调 | ✅ 已实现 |
| `/api/worktool/sendMessage` | POST | 发送 WorkTool 消息 | ✅ 已实现 |
| `/api/callback` | GET/POST | 第三方回调 | ✅ 已实现 |
| `/api/messages/send` | POST | 发送消息 | ✅ 已实现 |
| `/api/messages/list` | GET | 消息列表 | ✅ 已实现 |
| `/api/knowledge-bases` | GET/POST | 知识库管理 | ✅ 已实现 |

### 3.2 需要新增的接口

| 接口路径 | 方法 | 说明 | 优先级 |
|---------|------|------|--------|
| `/api/device/config` | GET | 设备配置查询（兜底方案） | 🔴 高 |
| `/api/third-party/callback/{type}` | POST | 第三方回调统一接口 | 🔴 高 |
| `/api/third-party/fallback/message` | POST | 消息回退接口 | 🔴 高 |
| `/api/robots/[robotId]/config` | GET/PUT | 机器人配置管理 | 🟡 中 |
| `/api/robots/[robotId]/config-status` | GET | 配置同步状态查询 | 🟡 中 |
| `/api/robots/[robotId]/message-logs` | GET | 消息日志查询 | 🟢 低 |
| `/api/robots/[robotId]/fail-logs` | GET | 失败日志查询 | 🟢 低 |

### 3.3 需要修改的接口

| 接口路径 | 修改内容 | 原因 |
|---------|---------|------|
| `/api/worktool/callback` | 修改消息处理逻辑 | 增加配置同步日志记录 |
| `/api/robots` | 增加第三方配置字段 | 支持配置管理 |

---

## 四、WebSocket 协议分析

### 4.1 现有消息类型

| 类型 | 方向 | 说明 | 状态 |
|------|------|------|------|
| `authenticate` | APP → 服务器 | 认证请求 | ✅ 已实现 |
| `authenticated` | 服务器 → APP | 认证响应 | ✅ 已实现 |
| `heartbeat` | 双向 | 心跳消息 | ✅ 已实现 |
| `heartbeat_ack` | 服务器 → APP | 心跳确认 | ✅ 已实现 |
| `heartbeat_warning` | 服务器 → APP | 心跳警告 | ✅ 已实现 |
| `command_push` | 服务器 → APP | 指令推送 | ✅ 已实现 |
| `result` | APP → 服务器 | 结果上报 | ✅ 已实现 |
| `config_push` | 服务器 → APP | 配置推送 | ✅ 已实现 |
| `status_query` | APP → 服务器 | 状态查询 | ✅ 已实现 |
| `status_response` | 服务器 → APP | 状态响应 | ✅ 已实现 |
| `error` | 服务器 → APP | 错误消息 | ✅ 已实现 |

### 4.2 需要新增的消息类型

| 类型 | 方向 | 说明 | 优先级 |
|------|------|------|--------|
| `config_ack` | APP → 服务器 | 配置确认 | 🔴 高 |
| `config_nack` | APP → 服务器 | 配置拒绝 | 🔴 高 |
| `callback` | 服务器 → APP | 消息回调 | 🔴 高 |
| `message_log` | APP → 服务器 | 消息日志上报 | 🟡 中 |

### 4.3 消息类型定义

#### 4.3.1 配置推送消息 (config_push)

```typescript
{
  type: "config_push",
  data: {
    robotId: string,              // 机器人ID
    worktoolApiUrl: string,       // 第三方API地址
    resultCallbackUrl?: string,   // 结果回调地址
    secretKey?: string,           // 密钥
    updatedAt: number,            // 更新时间（Unix毫秒）
    version: string,              // 配置版本号
    fallbackMode?: boolean        // 是否回退模式
  },
  timestamp: number
}
```

#### 4.3.2 配置确认消息 (config_ack)

```typescript
{
  type: "config_ack",
  data: {
    robotId: string,              // 机器人ID
    configVersion: string,        // 配置版本号
    ackTime: string               // 确认时间（ISO 8601）
  },
  timestamp: number
}
```

#### 4.3.3 配置拒绝消息 (config_nack)

```typescript
{
  type: "config_nack",
  data: {
    robotId: string,              // 机器人ID
    configVersion: string,        // 配置版本号
    error: string,                // 错误信息
    nackTime: string              // 拒绝时间（ISO 8601）
  },
  timestamp: number
}
```

#### 4.3.4 消息回调消息 (callback)

```typescript
{
  type: "callback",
  data: {
    event: "message" | "system",  // 事件类型
    messageId?: string,           // 消息ID
    robotId: string,              // 机器人ID
    senderId?: string,            // 发送者ID
    senderName?: string,          // 发送者名称
    messageType?: string,         // 消息类型
    content?: string,             // 消息内容
    chatType?: string,            // 聊天类型
    extraData?: any,              // 额外数据
    timestamp: string             // 时间戳（ISO 8601）
  },
  timestamp: number
}
```

#### 4.3.5 消息日志上报消息 (message_log)

```typescript
{
  type: "message_log",
  data: {
    messageId: string,            // 消息ID
    robotId: string,              // 机器人ID
    thirdPartyUrl: string,        // 第三方URL
    status: "success" | "failed", // 状态
    error?: string,               // 错误信息
    reportedAt: string            // 上报时间（ISO 8601）
  },
  timestamp: number
}
```

---

## 五、代码结构分析

### 5.1 项目目录结构

```
.
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API 路由
│   │   │   ├── auth/                 # 认证相关
│   │   │   │   ├── login/            # 登录
│   │   │   │   └── refresh-token/    # Token刷新
│   │   │   ├── activation-codes/     # 激活码管理
│   │   │   ├── robots/               # 机器人管理
│   │   │   ├── robot-ids/            # 机器人ID管理
│   │   │   │   └── activate/         # 设备激活 ⭐
│   │   │   ├── worktool/             # WorkTool 相关
│   │   │   │   ├── callback/         # WorkTool 回调 ⭐
│   │   │   │   └── sendMessage/      # 发送消息
│   │   │   ├── third-party/          # 第三方相关 🔴 新增
│   │   │   │   ├── callback/         # 第三方回调
│   │   │   │   └── fallback/         # 回退接口
│   │   │   ├── device/               # 设备相关 🔴 新增
│   │   │   │   └── config/           # 配置查询
│   │   │   └── messages/             # 消息管理
│   │   ├── robots/                   # 机器人页面
│   │   └── dashboard/                # 仪表盘
│   ├── components/                   # React 组件
│   │   ├── ui/                       # shadcn/ui 组件
│   │   └── layout/                   # 布局组件
│   ├── lib/                          # 工具库
│   │   ├── db.ts                     # 数据库连接
│   │   ├── auth.ts                   # 认证工具
│   │   ├── jwt.ts                    # JWT 工具
│   │   └── api-client.ts             # API 客户端
│   ├── server/                       # 服务端代码
│   │   ├── websocket/                # WebSocket 相关
│   │   │   ├── types.ts              # 类型定义 ⭐
│   │   │   ├── message-handler.ts    # 消息处理 ⭐
│   │   │   ├── connection-manager.ts # 连接管理
│   │   │   └── websocket-server-v3.ts # WebSocket 服务器
│   │   └── middleware/               # 中间件
│   ├── types/                        # 类型定义
│   │   ├── worktool.ts               # WorkTool 类型 ⭐
│   │   └── message.ts                # 消息类型
│   ├── db/                           # 数据库
│   │   └── schema.ts                 # 数据库模式（简化版）
│   └── storage/                      # 存储
│       └── database/
│           └── shared/
│               └── schema.ts         # 数据库模式（完整版）⭐
├── docs/                             # 文档
│   ├── WORKTOOL_WEBSOCKET_CLIENT_DEVELOPMENT_GUIDE.md
│   └── THIRD_PARTY_INTEGRATION_SYSTEM_ANALYSIS.md ⭐ 本文档
└── .coze                             # Coze CLI 配置
```

### 5.2 关键文件清单

#### 5.2.1 需要新增的文件

| 文件路径 | 说明 | 优先级 |
|---------|------|--------|
| `src/app/api/device/config/route.ts` | 设备配置查询接口 | 🔴 高 |
| `src/app/api/third-party/callback/[type]/route.ts` | 第三方回调统一接口 | 🔴 高 |
| `src/app/api/third-party/fallback/message/route.ts` | 消息回退接口 | 🔴 高 |
| `src/app/api/robots/[robotId]/config/route.ts` | 机器人配置管理 | 🟡 中 |
| `src/app/api/robots/[robotId]/config-status/route.ts` | 配置同步状态查询 | 🟡 中 |
| `src/app/api/robots/[robotId]/message-logs/route.ts` | 消息日志查询 | 🟢 低 |
| `src/app/api/robots/[robotId]/fail-logs/route.ts` | 失败日志查询 | 🟢 低 |
| `src/app/api/worktool/message-log/route.ts` | 消息日志上报 | 🟡 中 |
| `src/middleware/api-auth.ts` | API 认证中间件 | 🟡 中 |

#### 5.2.2 需要修改的文件

| 文件路径 | 修改内容 | 原因 |
|---------|---------|------|
| `src/server/websocket/types.ts` | 新增消息类型 | 支持配置同步 |
| `src/server/websocket/message-handler.ts` | 新增消息处理逻辑 | 处理配置确认/拒绝 |
| `src/server/websocket-server-v3.ts` | 新增配置推送触发时机 | 连接时推送配置 |
| `src/app/api/worktool/callback/route.ts` | 修改消息处理逻辑 | 增加日志记录 |
| `src/storage/database/shared/schema.ts` | 新增数据库表 | 支持新功能 |

---

## 六、兼容性分析

### 6.1 新旧协议兼容性

#### 6.1.1 WebSocket 协议兼容性

**现有协议**（v3.0）:
- 消息类型：`authenticate`, `heartbeat`, `command_push`, `result`, `config_push` 等
- 配置推送格式：使用 `configType` 字段区分配置类型

**新协议**（扩展）:
- 新增消息类型：`config_ack`, `config_nack`, `callback`, `message_log`
- 配置推送格式：使用 `worktoolApiUrl` 字段存储第三方API地址

**兼容性评估**: ✅ **向后兼容**
- 新增的消息类型不影响现有消息处理
- APP 可以根据收到的消息类型选择是否处理
- 旧版本 APP 忽略新消息类型，不会崩溃

#### 6.1.2 API 接口兼容性

**现有接口**:
- `/api/worktool/callback` - WorkTool 回调
- `/api/robot-ids/activate` - 设备激活

**新增接口**:
- `/api/device/config` - 设备配置查询
- `/api/third-party/callback/{type}` - 第三方回调
- `/api/third-party/fallback/message` - 消息回退

**兼容性评估**: ✅ **完全兼容**
- 新接口是独立的，不影响现有接口
- 现有接口保持不变
- APP 可以根据版本选择使用哪些接口

### 6.2 数据库兼容性

#### 6.2.1 表结构变更

**现有表**（需要修改）:
- `robots` 表：已有 `thirdPartyCallbackUrl`, `thirdPartyResultCallbackUrl`, `thirdPartySecretKey` 字段 ✅

**新增表**:
- `device_activations` - 设备激活表
- `config_sync_logs` - 配置同步日志表
- `message_fail_logs` - 消息发送失败日志表
- `sessions` - 会话表

**兼容性评估**: ✅ **完全兼容**
- 新增表不影响现有表
- 现有表结构不变
- 数据迁移风险低

### 6.3 业务逻辑兼容性

#### 6.3.1 激活流程

**现有流程**:
```
APP → 激活接口 → 生成 robotId → 返回 Token
```

**新流程**:
```
APP → 激活接口 → 生成 robotId → 保存到 device_activations → 推送配置 → 返回 Token
```

**兼容性评估**: ✅ **兼容**
- 激活接口保持不变
- 新增步骤对 APP 透明
- APP 无需修改激活逻辑

#### 6.3.2 消息发送流程

**现有流程**:
```
APP → 发送到第三方平台 → 第三方平台 → WorkBot 服务器 → WebSocket 推送给 APP
```

**新流程**:
```
APP → 发送到第三方平台 → 第三方平台 → WorkBot 服务器 → WebSocket 推送给 APP
      ↓
  失败时回退到主服务器
```

**兼容性评估**: ✅ **兼容**
- 正常流程不变
- 新增回退逻辑，APP 无需修改
- 回退逻辑对 APP 透明

---

## 七、实施计划

### 7.1 实施阶段划分

#### 阶段一：数据库准备（1天）

**任务清单**:
1. ✅ 创建 `device_activations` 表
2. ✅ 创建 `config_sync_logs` 表
3. ✅ 创建 `message_fail_logs` 表
4. ✅ 创建 `sessions` 表
5. ✅ 添加索引
6. ✅ 数据迁移（如果有旧数据）

**验证标准**:
- 所有表创建成功
- 索引创建成功
- 数据迁移完成
- 无数据丢失

---

#### 阶段二：API 接口开发（2天）

**任务清单**:
1. ✅ 实现 `/api/device/config` 接口
2. ✅ 实现 `/api/third-party/callback/{type}` 接口
3. ✅ 实现 `/api/third-party/fallback/message` 接口
4. ✅ 实现 `/api/robots/[robotId]/config` 接口
5. ✅ 实现 `/api/robots/[robotId]/config-status` 接口
6. ✅ 实现 `/api/worktool/message-log` 接口

**验证标准**:
- 所有接口开发完成
- 接口测试通过
- 错误处理完善
- 文档编写完成

---

#### 阶段三：WebSocket 协议扩展（1天）

**任务清单**:
1. ✅ 扩展 WebSocket 消息类型
2. ✅ 实现配置推送逻辑
3. ✅ 实现配置确认/拒绝处理
4. ✅ 实现消息回调推送
5. ✅ 实现消息日志上报处理
6. ✅ 测试 WebSocket 通信

**验证标准**:
- 所有消息类型实现完成
- 消息处理正确
- 异常处理完善
- 通信稳定

---

#### 阶段四：系统集成测试（2天）

**任务清单**:
1. ✅ 配置同步流程测试
2. ✅ 消息发送流程测试
3. ✅ 回退机制测试
4. ✅ 异常情况测试
5. ✅ 性能测试
6. ✅ 压力测试

**验证标准**:
- 所有流程测试通过
- 异常情况处理正确
- 性能满足要求
- 压力测试通过

---

#### 阶段五：文档编写（1天）

**任务清单**:
1. ✅ 更新 API 文档
2. ✅ 更新 WebSocket 协议文档
3. ✅ 编写数据库设计文档
4. ✅ 编写部署指南
5. ✅ 编写故障排查指南

**验证标准**:
- 文档完整
- 文档准确
- 文档易懂

---

#### 阶段六：部署上线（1天）

**任务清单**:
1. ✅ 备份数据库
2. ✅ 执行数据库迁移
3. ✅ 部署新版本
4. ✅ 验证部署结果
5. ✅ 监控运行状态

**验证标准**:
- 数据库迁移成功
- 部署成功
- 功能正常
- 无异常报错

---

### 7.2 风险评估

| 风险项 | 风险等级 | 影响 | 应对措施 |
|--------|---------|------|---------|
| 数据库迁移失败 | 🟡 中 | 无法创建新表 | 1. 提前测试迁移脚本<br>2. 准备回滚方案<br>3. 备份数据库 |
| 配置同步失败 | 🟡 中 | 配置无法推送 | 1. 实现重试机制<br>2. 提供手动查询接口<br>3. 记录详细日志 |
| 第三方API不可用 | 🟢 低 | 消息发送失败 | 1. 实现回退机制<br>2. 自动切换到主服务器<br>3. 记录失败日志 |
| WebSocket 连接不稳定 | 🟢 低 | 消息推送延迟 | 1. 实现重连机制<br>2. 增加心跳检测<br>3. 优化网络配置 |
| 性能问题 | 🟢 低 | 响应变慢 | 1. 添加缓存<br>2. 优化查询<br>3. 增加监控 |

---

### 7.3 回退方案

#### 7.3.1 数据库回退

```sql
-- 删除新增的表
DROP TABLE IF EXISTS message_fail_logs CASCADE;
DROP TABLE IF EXISTS config_sync_logs CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS device_activations CASCADE;
```

#### 7.3.2 代码回退

```bash
# 回退到上一个版本
git revert <commit-hash>

# 或者切换到上一个分支
git checkout <previous-branch>
```

#### 7.3.3 配置回退

```bash
# 恢复环境变量
cp .env.backup .env

# 重启服务
pnpm dev
```

---

## 八、关键衔接点

### 8.1 数据库衔接

#### 8.1.1 robots 表与 device_activations 表的关系

```
robots 表：
- robot_id (机器人ID)
- third_party_callback_url (第三方回调地址)
- third_party_result_callback_url (第三方结果回调地址)
- third_party_secret_key (第三方密钥)

device_activations 表：
- robot_id (机器人ID，外键)
- config_version (配置版本号)
- config_synced_at (配置同步时间)
- config_synced (配置是否已同步)
- config_error (配置错误信息)
```

**衔接逻辑**:
1. 机器人配置修改时，更新 `robots` 表
2. 通过 WebSocket 推送配置到 APP
3. APP 确认后，更新 `device_activations` 表的同步状态

---

#### 8.1.2 messages 表与 sessions 表的关系

```
sessions 表：
- session_id (会话ID)
- robot_id (机器人ID)
- user_id (用户ID)
- status (状态)

messages 表：
- conversation_id (会话ID，外键)
- robot_id (机器人ID)
- member_id (成员ID)
- message_type (消息类型)
- direction (方向)
- content (内容)
```

**衔接逻辑**:
1. 收到消息时，查找或创建会话
2. 将消息保存到 `messages` 表，关联 `conversation_id`
3. 更新 `sessions` 表的最后消息时间

---

### 8.2 API 接口衔接

#### 8.2.1 激活接口与配置推送

```
/api/robot-ids/activate (POST)
    ↓
1. 验证激活码
2. 创建/更新 device_activations 记录
3. 查询机器人配置
4. 通过 WebSocket 推送配置
5. 返回 Token
```

**衔接点**: 激活成功后立即推送配置

---

#### 8.2.2 配置接口与 WebSocket 推送

```
/api/robots/[robotId]/config (PUT)
    ↓
1. 更新 robots 表配置
2. 检查机器人是否在线
3. 通过 WebSocket 推送配置
4. 更新 config_sync_logs 表
```

**衔接点**: 配置修改时立即推送

---

#### 8.2.3 第三方回调与 WebSocket 推送

```
/api/third-party/callback/result (POST)
    ↓
1. 验证 Token
2. 提取消息内容
3. 通过 WebSocket 推送给 APP
4. 更新 messages 表
```

**衔接点**: 收到第三方回复后立即推送

---

### 8.3 WebSocket 消息衔接

#### 8.3.1 配置推送与配置确认

```
服务器 → APP: config_push
    ↓
APP 收到配置
    ↓
APP 保存到本地
    ↓
APP → 服务器: config_ack
    ↓
服务器更新 device_activations.config_synced = true
```

**衔接点**: APP 确认后更新同步状态

---

#### 8.3.2 消息发送与回退

```
APP → 第三方平台: 发送消息
    ↓
第三方平台返回错误
    ↓
APP 检测到失败
    ↓
APP → 服务器: /api/third-party/fallback/message
    ↓
服务器处理消息
    ↓
服务器 → APP: command_push
```

**衔接点**: 发送失败后自动回退

---

## 九、总结

### 9.1 系统现状

✅ **优点**:
1. 架构清晰，前后端分离
2. WebSocket 实时通信已实现
3. 数据库设计完善
4. API 接口齐全
5. 认证授权机制健全

⚠️ **不足**:
1. 第三方集成不够灵活
2. 配置同步机制缺失
3. 回退机制未实现
4. 日志记录不够完整

### 9.2 新方案优势

✅ **架构优势**:
1. APP 直接发送消息，减少服务器压力
2. 智能回退机制，提高可靠性
3. 配置同步确认，确保一致性
4. 完整的日志记录，便于调试

✅ **功能优势**:
1. 双重配置同步（WebSocket + 主动查询）
2. 动态回调地址生成
3. 消息发送失败重试
4. 配置版本管理

✅ **兼容性优势**:
1. 向后兼容现有协议
2. 不影响现有功能
3. 数据迁移风险低
4. 回退方案完善

### 9.3 实施建议

**优先级排序**:
1. 🔴 **高优先级**：数据库准备、核心API接口、WebSocket协议扩展
2. 🟡 **中优先级**：配置管理接口、日志接口
3. 🟢 **低优先级**：监控接口、统计接口

**测试重点**:
1. 配置同步流程
2. 消息发送流程
3. 回退机制
4. 异常处理

**文档重点**:
1. API 接口文档
2. WebSocket 协议文档
3. 部署指南
4. 故障排查指南

---

## 附录

### A. 关键代码片段

#### A.1 设备激活接口（修改后）

```typescript
// src/app/api/robot-ids/activate/route.ts

export async function POST(request: NextRequest) {
  // 1. 验证激活码
  // 2. 检查设备绑定
  // 3. 创建/更新 device_activations 记录 ⭐
  await db.execute(sql`
    INSERT INTO device_activations (
      robot_id, robot_uuid, device_id, user_id,
      activation_code, status, activated_at,
      device_info
    )
    VALUES (
      ${robotId}, ${robotUuid}, ${deviceId}, ${userId},
      ${code}, 'active', NOW(),
      ${JSON.stringify(deviceInfo)}
    )
    ON CONFLICT (robot_id) DO UPDATE SET
      last_seen_at = NOW(),
      updated_at = NOW()
  `);

  // 4. 查询机器人配置 ⭐
  const robot = await db.execute(sql`
    SELECT
      third_party_callback_url,
      third_party_result_callback_url,
      third_party_secret_key,
      EXTRACT(EPOCH FROM updated_at) * 1000 as updated_at_timestamp
    FROM robots
    WHERE robot_id = ${robotId}
    LIMIT 1
  `);

  // 5. 通过 WebSocket 推送配置 ⭐
  if (robot.rows.length > 0) {
    const robotData = robot.rows[0];
    pushConfigToRobot(robotId, {
      worktoolApiUrl: robotData.third_party_callback_url,
      resultCallbackUrl: robotData.third_party_result_callback_url,
      secretKey: robotData.third_party_secret_key,
      updatedAt: robotData.updated_at_timestamp,
      version: '1.0'
    });
  }

  // 6. 返回 Token
  return NextResponse.json({
    code: 201,
    data: {
      robotId,
      token,
      expiresIn: 86400
    }
  });
}
```

#### A.2 配置推送函数

```typescript
// src/server/websocket/message-handler.ts

async function pushConfigToRobot(robotId: string, config: ConfigPushData) {
  const connection = connectionManager.getConnection(robotId);
  if (!connection) {
    console.log(`[WebSocket] 机器人离线，无法推送配置: ${robotId}`);
    return;
  }

  // 发送配置推送消息
  sendMessage(connection, {
    type: WSMessageType.CONFIG_PUSH,
    data: config,
    timestamp: Date.now()
  });

  // 记录推送日志
  await db.execute(sql`
    INSERT INTO config_sync_logs (
      robot_id, config_version, config_data,
      sync_status, created_at
    )
    VALUES (
      ${robotId}, ${config.version}, ${JSON.stringify(config)},
      'pending', NOW()
    )
  `);

  console.log(`[WebSocket] 配置已推送: ${robotId}`);
}
```

#### A.3 配置确认处理

```typescript
// src/server/websocket/message-handler.ts

async function handleConfigAck(connection: WebSocketConnection, message: WSMessage) {
  const { robotId, configVersion, ackTime } = message.data;

  // 更新配置同步状态
  await db.execute(sql`
    UPDATE device_activations
    SET config_synced = true,
        config_synced_at = ${ackTime}
    WHERE robot_id = ${robotId}
  `);

  // 更新同步日志
  await db.execute(sql`
    UPDATE config_sync_logs
    SET sync_status = 'synced',
        synced_at = ${ackTime}
    WHERE robot_id = ${robotId}
      AND config_version = ${configVersion}
      AND sync_status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `);

  console.log(`[WebSocket] 配置确认: ${robotId}, 版本: ${configVersion}`);
}
```

### B. 数据库迁移脚本

```sql
-- 创建设备激活表
CREATE TABLE IF NOT EXISTS device_activations (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(255) NOT NULL UNIQUE,
  robot_uuid VARCHAR(255) NOT NULL UNIQUE,
  device_id VARCHAR(255),
  user_id INTEGER,
  activation_code VARCHAR(8),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  activated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  device_info TEXT,

  config_version INTEGER DEFAULT 0,
  config_synced_at TIMESTAMP,
  config_synced BOOLEAN DEFAULT true,
  config_error TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX device_activations_robot_id_idx ON device_activations(robot_id);
CREATE INDEX device_activations_device_id_idx ON device_activations(device_id);
CREATE INDEX device_activations_user_id_idx ON device_activations(user_id);

-- 创建配置同步日志表
CREATE TABLE IF NOT EXISTS config_sync_logs (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(255) NOT NULL,
  config_version VARCHAR(50) NOT NULL,
  config_data JSONB NOT NULL,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  synced_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX config_sync_logs_robot_id_idx ON config_sync_logs(robot_id);
CREATE INDEX config_sync_logs_status_idx ON config_sync_logs(sync_status);
CREATE INDEX config_sync_logs_version_idx ON config_sync_logs(config_version);

-- 创建消息发送失败日志表
CREATE TABLE IF NOT EXISTS message_fail_logs (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  third_party_url TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_type VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  failed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX message_fail_logs_robot_id_idx ON message_fail_logs(robot_id);
CREATE INDEX message_fail_logs_message_id_idx ON message_fail_logs(message_id);
CREATE INDEX message_fail_logs_error_type_idx ON message_fail_logs(error_type);
CREATE INDEX message_fail_logs_created_at_idx ON message_fail_logs(created_at);

-- 创建会话表
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  robot_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX sessions_session_id_idx ON sessions(session_id);
CREATE INDEX sessions_robot_id_idx ON sessions(robot_id);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
```

### C. 测试用例

#### C.1 配置同步流程测试

```typescript
// 测试场景：管理员修改配置

describe('配置同步流程', () => {
  it('应该成功推送配置到在线的APP', async () => {
    // 1. 修改配置
    await request(app)
      .put(`/api/robots/${robotId}/config`)
      .send({
        thirdPartyCallbackUrl: 'https://api.dify.ai/callback',
        thirdPartyResultCallbackUrl: 'https://api.dify.ai/result',
        thirdPartySecretKey: 'secret_xxx'
      })
      .expect(200);

    // 2. 验证配置已保存
    const robot = await db.query.robots.findFirst({
      where: eq(robots.robotId, robotId)
    });
    expect(robot?.thirdPartyCallbackUrl).toBe('https://api.dify.ai/callback');

    // 3. 验证配置已推送
    const syncLog = await db.query.configSyncLogs.findFirst({
      where: eq(configSyncLogs.robotId, robotId)
    });
    expect(syncLog?.syncStatus).toBe('pending');

    // 4. 模拟APP确认
    ws.send(JSON.stringify({
      type: 'config_ack',
      data: {
        robotId,
        configVersion: '1.0',
        ackTime: new Date().toISOString()
      }
    }));

    // 5. 验证配置已确认
    await sleep(1000);
    const updatedLog = await db.query.configSyncLogs.findFirst({
      where: eq(configSyncLogs.robotId, robotId)
    });
    expect(updatedLog?.syncStatus).toBe('synced');
  });
});
```

#### C.2 消息回退流程测试

```typescript
describe('消息回退流程', () => {
  it('应该成功回退到主服务器', async () => {
    // 1. 模拟APP发送消息到第三方平台失败
    await request(app)
      .post('/api/third-party/fallback/message')
      .set('Authorization', `Bearer ${token}`)
      .send({
        robotId,
        content: '你好',
        messageType: 'text',
        senderId: 'wxid_xxx',
        senderName: '张三'
      })
      .expect(200);

    // 2. 验证消息已保存
    const message = await db.query.messages.findFirst({
      where: eq(messages.robotId, robotId)
    });
    expect(message?.content).toBe('你好');

    // 3. 验证已生成回复
    const reply = await db.query.messages.findFirst({
      where: and(
        eq(messages.robotId, robotId),
        eq(messages.direction, 'outgoing')
      )
    });
    expect(reply).toBeDefined();
  });
});
```

---

**文档结束**
