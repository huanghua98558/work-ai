# WorkBot 系统全面分析报告

## 📋 目录
1. [系统概述](#系统概述)
2. [技术栈](#技术栈)
3. [数据库架构](#数据库架构)
4. [API 接口体系](#api-接口体系)
5. [WebSocket 通讯](#websocket-通讯)
6. [核心功能模块](#核心功能模块)
7. [数据流分析](#数据流分析)
8. [系统特点](#系统特点)
9. [与 WorkTool 的差异](#与-worktool-的差异)

---

## 🎯 系统概述

### 项目定位
**WorkBot** 是一个企业微信机器人管理系统，提供：
- ✅ 激活码管理
- ✅ 机器人配置
- ✅ 设备激活
- ✅ 消息管理
- ✅ 知识库管理
- ✅ 用户管理

### 架构特点
- **前后端分离**: Next.js App Router + React
- **实时通讯**: WebSocket 双向通讯
- **数据持久化**: PostgreSQL + Drizzle ORM
- **身份认证**: JWT Token
- **设备绑定**: 一码一设备机制

---

## 💻 技术栈

### 前端技术
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.5.12 | 全栈框架（App Router） |
| React | 19 | UI 框架 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 3.4 | 样式框架 |
| shadcn/ui | - | UI 组件库 |

### 后端技术
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js API | 15.5.12 | API Routes |
| Node.js | 24+ | 运行时 |
| PostgreSQL | 18 | 数据库 |
| Drizzle ORM | 0.45.1 | ORM 框架 |
| jsonwebtoken | 9.0.2 | JWT 认证 |
| ws | 8.19.0 | WebSocket 服务器 |

### 开发工具
- pnpm - 包管理器
- ESLint - 代码检查
- TypeScript - 类型检查

---

## 🗄️ 数据库架构

### 核心表结构

#### 1. 用户表 (users)
```sql
- id: 用户ID
- nickname: 昵称
- phone: 手机号（唯一）
- role: 角色（admin/user）
- status: 状态（active/disabled）
```

**用途**: 管理系统用户，区分管理员和普通用户

---

#### 2. 激活码表 (activation_codes)
```sql
- id: 激活码ID
- code: 8位激活码（唯一）
- status: 状态（unused/used/expired/disabled）
- validity_period: 有效期（天数）
- bound_user_id: 绑定用户ID
- expires_at: 过期时间
```

**用途**:
- 生成和管理激活码
- 控制激活码生命周期
- 绑定用户和激活码

---

#### 3. 设备激活表 (device_activations)
```sql
- id: 激活记录ID
- code: 激活码
- user_id: 用户ID
- device_id: 设备ID（唯一）
- robot_id: 机器人ID（唯一）
- robot_uuid: 机器人UUID（唯一）
- access_token: 访问令牌
- refresh_token: 刷新令牌
- token_expires_at: 令牌过期时间
- status: 状态（active/unbound/expired）

-- 设备信息
- device_brand: 设备品牌
- device_model: 设备型号
- device_os: 操作系统
- device_os_version: 系统版本
```

**用途**:
- 记录设备激活信息
- 实现**一码一设备**机制
- 存储 Token 用于 API 认证
- 防止跨设备激活

**重要约束**:
- `unique_code_device`: 一个激活码+设备ID只能有一条记录
- `robot_id` 唯一：每个设备对应唯一的机器人ID

---

#### 4. 机器人配置表 (robots)
```sql
- id: 机器人ID
- robot_id: 机器人ID（唯一）
- user_id: 用户ID
- name: 机器人名称
- status: 状态（online/offline/deleted）

-- AI 回复模式
- ai_mode: AI 模式（builtin/third_party）
- ai_provider: AI 提供商（doubao/deepseek/kimi/custom）
- ai_model: AI 模型
- ai_api_key: API 密钥
- ai_temperature: 温度参数（0-2）
- ai_max_tokens: 最大 Token 数
- ai_context_length: 上下文保留条数
- ai_scenario: 使用场景（咨询/问答/闲聊/售后/社群管理）

-- 第三方平台配置
- third_party_callback_url: 回调地址
- third_party_result_callback_url: 结果回调地址
- third_party_secret_key: 密钥

-- 风控配置
- reply_delay_min: 最小回复延迟（秒）
- reply_delay_max: 最大回复延迟（秒）
- ai_call_limit_daily: 每日 AI 调用限制

-- 统计信息
- total_messages: 消息总数
- ai_calls_today: 今日 AI 调用次数
- last_active_at: 最后活跃时间
```

**用途**:
- 管理机器人配置
- 控制 AI 回复行为
- 集成第三方平台
- 统计和监控

---

#### 5. 消息记录表 (messages)
```sql
- id: 消息ID
- robot_id: 机器人ID
- message_type: 消息类型（received/sent）

-- 消息内容
- spoken: 问题文本
- raw_spoken: 原始问题文本
- text_type: 消息类型（0=未知 1=文本 2=图片 3=语音 5=视频 7=小程序 8=链接 9=文件）
- file_base64: 图片 Base64

-- 对话信息
- received_name: 提问者名称
- group_name: 群名
- group_remark: 群备注名
- room_type: 房间类型（1=外部群 2=外部联系人 3=内部群 4=内部联系人）
- at_me: 是否@机器人

-- 消息处理
- ai_mode: AI 模式
- ai_provider: AI 提供商
- ai_response: AI 回复内容
- ai_tokens_used: AI 消耗的 Token
- ai_cost: AI 成本
- processing_time_ms: 处理耗时

-- 消息状态
- status: 状态（pending/processing/success/failed）
- error_message: 错误信息

-- 指令信息
- command_id: 指令ID
- command_status: 指令状态
```

**用途**:
- 记录所有收发消息
- 保存对话上下文
- 追踪 AI 处理过程
- 统计和监控

**重要**: 已经包含了 WorkTool 的所有字段！

---

#### 6. 会话表 (sessions)
```sql
- id: 会话ID
- robot_id: 机器人ID
- session_key: 会话标识（received_name + group_name）
- received_name: 提问者名称
- group_name: 群名
- room_type: 房间类型
- last_message_at: 最后消息时间
- message_count: 消息数量
```

**用途**:
- 管理会话
- 保留上下文
- 对话历史

---

#### 7. 会话上下文表 (session_contexts)
```sql
- id: 上下文ID
- session_id: 会话ID
- robot_id: 机器人ID
- message_id: 消息ID
- role: 角色（user/assistant）
- content: 内容
```

**用途**:
- 存储会话上下文
- 保留最近 N 条消息
- 用于 AI 上下文理解

---

#### 8. 指令记录表 (commands)
```sql
- id: 指令ID
- robot_id: 机器人ID
- command_id: 指令ID（唯一）
- command_type: 指令类型
- command_params: 指令参数（JSON）
- status: 状态（pending/sent/success/failed）
- sent_at: 发送时间
- executed_at: 执行时间
- error_code: 错误码
- error_reason: 错误原因
- execution_time_ms: 执行耗时
```

**用途**:
- 记录下发给 APP 的指令
- 追踪指令执行状态
- 错误处理和重试

---

#### 9. 系统日志表 (system_logs)
```sql
- id: 日志ID
- log_type: 日志类型（application/api/error/audit/websocket/ai）
- level: 级别（info/warn/error/debug）
- message: 日志消息
- details: 详细信息（JSON）
- robot_id: 机器人ID
- user_id: 用户ID
- ip_address: IP 地址
- user_agent: 用户代理
- request_method: 请求方法
- request_path: 请求路径
```

**用途**:
- 系统监控
- 审计追踪
- 故障排查

---

## 🔌 API 接口体系

### 认证相关
```
POST /api/auth/login                    # 用户登录
POST /api/auth/register                 # 用户注册
POST /api/auth/refresh-token            # 刷新 Token
POST /api/auth/check-role               # 检查角色
```

### 激活码管理
```
GET  /api/activation-codes              # 获取激活码列表
POST /api/activation-codes              # 创建激活码
GET  /api/activation-codes/[id]         # 获取单个激活码
PUT  /api/activation-codes/[id]         # 更新激活码
DELETE /api/activation-codes/[id]       # 删除激活码
POST /api/activation-codes/activate     # 激活激活码（Web 端）
```

### 机器人管理
```
GET  /api/robots                        # 获取机器人列表
POST /api/robots                        # 创建机器人
GET  /api/robots/[robotId]              # 获取机器人详情
PUT  /api/robots/[robotId]/config       # 更新机器人配置
DELETE /api/robots/[robotId]            # 删除机器人
```

### 设备激活（APP 端）
```
POST /api/robot-ids/activate            # APP 激活设备（重要！）
```

**请求格式**:
```json
{
  "code": "ABC123XYZ",
  "deviceInfo": {
    "deviceId": "unique-device-id",
    "brand": "Xiaomi",
    "model": "Mi 11",
    "os": "Android",
    "osVersion": "12"
  }
}
```

**响应格式**:
```json
{
  "code": 200,
  "message": "激活成功",
  "data": {
    "robotId": "bot_abc123xyz",
    "robotUuid": "bot_abc123xyz",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-02-10T19:36:31.790Z",
    "isNewActivation": true
  }
}
```

### 消息管理
```
POST /api/messages/report                # APP 上报消息（重要！）
POST /api/messages/send                  # 服务器发送消息给 APP
GET  /api/messages/list                  # 获取消息列表
```

**消息上报格式**:
```json
{
  "robotId": "bot_abc123xyz",
  "messageId": "msg_client_12345",
  "messageType": "text",
  "content": "你好",
  "extraData": {},
  "userId": "user_123",
  "sessionId": "session_abc123",
  "timestamp": 1770579378378
}
```

### 会话管理
```
GET  /api/sessions/list                  # 获取会话列表
GET  /api/sessions/[sessionId]           # 获取会话详情
GET  /api/sessions/[sessionId]/context   # 获取会话上下文
```

### 知识库管理
```
GET  /api/knowledge-bases               # 获取知识库列表
POST /api/knowledge-bases               # 创建知识库
POST /api/knowledge/add                 # 添加知识
POST /api/knowledge/search              # 搜索知识
```

### 日志管理
```
POST /api/v1/logs/upload                # 上传日志（批量）
POST /api/v1/logs/query                 # 查询日志
GET  /api/v1/logs/config                # 获取日志配置
```

### WebSocket 监控
```
GET  /api/websocket/monitor             # WebSocket 监控
GET  /api/websocket/status              # WebSocket 状态
```

### 仪表盘
```
GET  /api/dashboard/stats                # 获取统计数据
```

### 健康检查
```
GET  /api/health                         # 健康检查
GET  /api/health/ready                   # 就绪检查
```

---

## 🌐 WebSocket 通讯

### 连接端点
```
ws://9.129.28.93:5000/ws?robotId={robotId}&token={token}
```

### 认证流程
1. APP 连接 WebSocket（携带 robotId 和 token）
2. 服务器验证 token 有效性
3. 服务器验证设备绑定状态
4. 认证成功，建立持久连接

### 消息类型

#### 客户端 → 服务器
| 类型 | 说明 | 格式 |
|------|------|------|
| `ping` | 心跳 | `{"type":"ping","timestamp":1234567890}` |
| `message` | 消息上报 | `{"type":"message","data":{...}}` |
| `status` | 状态更新 | `{"type":"status","data":{...}}` |

#### 服务器 → 客户端
| 类型 | 说明 | 格式 |
|------|------|------|
| `authenticated` | 认证成功 | `{"type":"authenticated","data":{...}}` |
| `auto_reply` | 自动回复 | `{"type":"auto_reply","data":{...}}` |
| `message` | 消息推送 | `{"type":"message","data":{...}}` |
| `ping` | 心跳检测 | `{"type":"ping","timestamp":1234567890}` |
| `error` | 错误消息 | `{"type":"error","code":4001,"message":"..."}` |

### 心跳机制
- **客户端心跳**: 每 30 秒发送一次 `ping`
- **服务器心跳**: 每 30 秒发送一次 `ping`
- **超时判定**: 60 秒无心跳则断开连接

### 连接限制
- **最大连接数**: 100
- **认证超时**: 30 秒
- **心跳超时**: 60 秒

---

## 🔧 核心功能模块

### 1. 激活码管理模块
**功能**:
- 生成激活码（8位随机字符串）
- 批量生成（1-100个）
- 设置有效期（1个月/6个月/1年）
- 绑定机器人
- 绑定用户

**流程**:
```
管理员创建激活码
    ↓
生成 8 位随机码
    ↓
设置有效期和绑定
    ↓
保存到数据库
    ↓
APP 使用激活码激活
```

---

### 2. 设备激活模块
**功能**:
- 验证激活码
- 绑定设备（一码一设备）
- 生成 Token（24小时有效期）
- 记录设备信息
- 防止跨设备激活

**流程**:
```
APP 调用激活接口
    ↓
验证激活码有效性
    ↓
检查设备绑定状态
    ↓
生成 Token
    ↓
绑定设备
    ↓
返回 robotId 和 token
```

**重要约束**:
- 一个激活码只能绑定一个设备
- 一个设备只能对应一个机器人ID
- Token 有效期 24 小时

---

### 3. 机器人配置模块
**功能**:
- 创建机器人
- 配置 AI 参数
- 设置第三方回调
- 配置风控规则

**AI 模式**:
- `builtin`: 内置 AI（豆包/DeepSeek/Kimi）
- `third_party`: 第三方平台（通过回调接口）

**AI 参数**:
- `temperature`: 创意程度（0-2）
- `max_tokens`: 最大 Token 数
- `context_length`: 上下文保留条数

---

### 4. 消息处理模块
**功能**:
- 接收 APP 上报的消息
- 保存消息记录
- AI 自动回复
- WebSocket 推送
- 保存会话上下文

**流程**:
```
APP 上报消息
    ↓
保存到 messages 表
    ↓
更新会话
    ↓
调用 AI 生成回复
    ↓
保存 AI 回复
    ↓
通过 WebSocket 推送给 APP
```

---

### 5. 会话管理模块
**功能**:
- 创建会话
- 更新会话状态
- 保存会话上下文
- 保留最近 N 条消息

**会话标识**: `session_key = received_name + group_name`

**上下文保留**: 默认保留最近 10 条消息

---

### 6. 指令管理模块
**功能**:
- 创建指令
- 发送指令给 APP
- 追踪指令执行状态
- 错误处理和重试

**指令类型**:
- `send_message`: 发送消息
- `create_group`: 创建群
- 等等...

---

## 📊 数据流分析

### 激活流程
```
┌─────────┐     POST /api/robot-ids/activate     ┌─────────┐
│   APP   │─────────────────────────────────────→│ 服务器  │
│         │←─────────────────────────────────────│         │
└─────────┘     返回 robotId + token            └─────────┘
                                                 ↓
                                          ┌─────────────┐
                                          │ device_     │
                                          │ activations │
                                          └─────────────┘
```

### 消息上报流程
```
┌─────────┐     POST /api/messages/report       ┌─────────┐
│   APP   │─────────────────────────────────────→│ 服务器  │
│         │←─────────────────────────────────────│         │
└─────────┘     返回 messageId + sessionId      └─────────┘
                                                 ↓
                                          ┌─────────────┐
                                          │  messages   │
                                          └─────────────┘
                                                 ↓
                                          ┌─────────────┐
                                          │   AI 处理    │
                                          └─────────────┘
                                                 ↓
                                          ┌─────────────┐
                                          │ WebSocket   │
                                          │   推送      │
                                          └─────────────┘
```

### WebSocket 推送流程
```
┌─────────┐     ws://.../ws?robotId=xxx&token=xxx ┌─────────┐
│   APP   │─────────────────────────────────────→│ 服务器  │
│         │←─────────────────────────────────────│         │
└─────────┘     认证成功 + 推送消息              └─────────┘
```

---

## ✨ 系统特点

### 1. 灵活的 AI 模式
- **内置 AI**: 集成豆包、DeepSeek、Kimi
- **第三方 AI**: 支持自定义回调接口
- **可配置**: AI 参数完全可配置

### 2. 强大的设备管理
- **一码一设备**: 防止激活码滥用
- **设备解绑**: 灵活的设备管理
- **Token 机制**: 24 小时有效期，安全可靠

### 3. 完整的会话管理
- **上下文保留**: 保留最近 N 条消息
- **会话追踪**: 每个会话独立管理
- **历史查询**: 完整的消息历史

### 4. 实时通讯能力
- **WebSocket**: 双向实时通讯
- **消息推送**: AI 回复即时推送
- **心跳机制**: 保证连接稳定性

### 5. 丰富的监控能力
- **系统日志**: 完整的操作日志
- **消息记录**: 所有消息可追溯
- **指令追踪**: 指令执行状态可查

### 6. 安全可靠
- **JWT 认证**: Token 机制
- **设备绑定**: 防止跨设备
- **权限管理**: admin/user 角色分离

---

## 🔍 与 WorkTool 的差异

### 相似点
✅ 都支持企业微信机器人
✅ 都有消息回调机制
✅ 都有发送消息接口
✅ 都有参数字段（spoken, rawSpoken, receivedName 等）

### 不同点

| 维度 | WorkBot | WorkTool |
|------|---------|----------|
| **架构** | 独立系统 | 企业微信生态 |
| **激活方式** | 激活码+设备绑定 | 平台直接配置 |
| **通讯方式** | HTTP API + WebSocket | HTTP 回调 |
| **数据存储** | 自己的 PostgreSQL | 平台存储 |
| **AI 集成** | 内置多种 AI | 需要自己接入 |
| **Token 机制** | 24小时 Token | 平台认证 |
| **设备绑定** | 一码一设备 | 平台管理 |

### WorkBot 的优势
1. ✅ **独立部署**: 不依赖第三方平台
2. ✅ **数据自主**: 数据在自己服务器
3. ✅ **灵活配置**: AI 参数完全可控
4. ✅ **多平台支持**: 支持企业微信、微信公众号、小程序
5. ✅ **WebSocket 实时**: 消息推送更及时
6. ✅ **完整的监控**: 详细的日志和统计

### WorkBot 数据库已经包含 WorkTool 字段！

**好消息**: `messages` 表已经包含了 WorkTool 的所有字段：
```sql
- spoken           ✅
- raw_spoken      ✅
- text_type        ✅
- file_base64      ✅
- received_name    ✅
- group_name       ✅
- group_remark     ✅
- room_type        ✅
- at_me            ✅
```

**这意味着**: 不需要修改数据库结构！

---

## 🚀 兼容 WorkTool API 的方案

### 方案：适配器模式

**架构**:
```
WorkTool 格式的 APP
        ↓
WorkTool 适配层（新增）
        ↓
WorkBot 核心层（保持不变）
        ↓
数据库 + AI 处理
```

### 需要新增的接口

#### 1. WorkTool 回调接口
```
POST /api/worktool/callback
```

**接收 WorkTool 格式消息**:
```json
{
  "spoken": "你好",
  "rawSpoken": "@me 你好",
  "receivedName": "仑哥",
  "groupName": "测试群1",
  "groupRemark": "测试群1备注名",
  "roomType": 1,
  "atMe": true,
  "textType": 1,
  "fileBase64": "iVBORxxx=="
}
```

**处理**:
1. 转换为 WorkBot 格式
2. 保存到 messages 表
3. 调用 AI 生成回复
4. 返回成功响应（3秒内）

---

#### 2. WorkTool 发送接口
```
POST /api/worktool/sendRawMessage?robotId={robotId}
```

**接收 WorkTool 格式发送请求**:
```json
{
  "socketType": 2,
  "list": [{
    "type": 203,
    "titleList": ["测试群1"],
    "receivedContent": "这是回复消息"
  }]
}
```

**处理**:
1. 转换为 WorkBot 格式
2. 保存到 messages 表
3. 通过 WebSocket 推送给 APP
4. 返回发送结果

---

### 字段映射

| WorkTool 字段 | WorkBot 字段 |
|---------------|-------------|
| `spoken` | `spoken` |
| `rawSpoken` | `raw_spoken` |
| `receivedName` | `received_name` |
| `groupName` | `group_name` |
| `groupRemark` | `group_remark` |
| `roomType` | `room_type` |
| `atMe` | `at_me` |
| `textType` | `text_type` |
| `fileBase64` | `file_base64` |
| `socketType` | - |
| `type` | - |
| `titleList` | - |
| `receivedContent` | `content` |

---

## ✅ 结论

### WorkBot 系统现状
1. ✅ **数据库结构完善**: 已经包含 WorkTool 所需字段
2. ✅ **API 接口完整**: 支持完整的消息收发流程
3. ✅ **WebSocket 实时**: 支持双向实时通讯
4. ✅ **AI 集成完善**: 支持多种 AI 提供商

### 兼容 WorkTool 的可行性
1. ✅ **完全可行**: 数据库已经包含所需字段
2. ✅ **改动最小**: 只需新增适配层
3. ✅ **向后兼容**: 不影响现有功能
4. ✅ **易于实现**: 主要是格式转换

### 实现方案
- **推荐**: 适配器模式
- **优点**: 最小改动、完全兼容、易于维护
- **工作量**: 新增 2 个 API 接口 + 适配器

---

## 🎯 下一步

**请确认以下问题，我会立即实现 WorkTool 兼容层**：

1. ✅ **是否需要实现 WorkTool 回调接口**？（接收 APP 消息）
2. ✅ **是否需要实现 WorkTool 发送接口**？（APP 发送消息）
3. ❓ **消息处理方式**: 自动 AI 回复 还是 只存储？
4. ❓ **是否需要支持 WebSocket 推送**？（推荐支持）

**确认后，我会立即创建完整的 WorkTool 兼容层代码！** 🚀
