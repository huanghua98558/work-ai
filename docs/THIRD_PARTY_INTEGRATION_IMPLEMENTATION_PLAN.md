# WorkBot 第三方集成实施方案

## 文档说明

本文档基于 WorkBot 系统的实际接口，重新制定第三方集成实施方案。

**文档版本**: v2.0
**分析日期**: 2026-02-09
**方案**: APP 直接发送消息到第三方平台 + 智能回退机制

---

## 一、通讯架构分析

### 1.1 完整架构图

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
│                    WorkBot 服务器层                           │
│                    https://api.worktool.ymdyes.cn            │
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
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐      ┌─────────────────────────┐
│    第三方平台            │      │   WorkTool App          │
│  (Dify/豆包/自定义)      │      │  (通过 WebSocket)       │
│  - 消息回调地址          │      │  - 指令推送             │
│  - 结果回调地址          │      │  - 配置推送             │
└─────────────────────────┘      └─────────────────────────┘
```

### 1.2 WorkBot 服务器接口清单

#### 核心接口（已实现）

| 接口路径 | 方法 | 说明 | 优先级 |
|---------|------|------|--------|
| `/wework/sendRawMessage` | POST | 发送企业微信消息 | 🔴 高 |
| `/robot/robotInfo/update` | POST | 更新机器人配置 | 🔴 高 |
| `/robot/robotInfo/get` | GET | 获取机器人信息 | 🔴 高 |
| `/robot/robotInfo/online` | GET | 查询机器人是否在线 | 🟡 中 |
| `/robot/robotInfo/onlineInfos` | GET | 查询机器人登录日志 | 🟢 低 |
| `/wework/listRawMessage` | GET | 指令消息API调用查询 | 🟡 中 |
| `/robot/rawMsg/list` | GET | 指令执行结果查询 | 🟡 中 |
| `/robot/qaLog/list` | GET | 机器人消息回调日志列表 | 🟢 低 |
| `/api/robot-ids/activate` | POST | 设备激活 | 🔴 高 |
| `/api/worktool/callback` | POST | WorkTool 回调 | 🔴 高 |
| `/api/worktool/sendMessage` | POST | 发送 WorkTool 消息 | 🔴 高 |

#### 需要新增的接口

| 接口路径 | 方法 | 说明 | 优先级 |
|---------|------|------|--------|
| `/api/device/config` | GET | 设备配置查询（兜底方案） | 🔴 高 |
| `/api/third-party/callback/{type}` | POST | 第三方回调统一接口 | 🔴 高 |
| `/api/third-party/fallback/message` | POST | 消息回退接口 | 🔴 高 |
| `/api/robots/[robotId]/config` | GET/PUT | 机器人配置管理 | 🟡 中 |
| `/api/robots/[robotId]/config-status` | GET | 配置同步状态查询 | 🟡 中 |
| `/api/worktool/message-log` | POST | 消息日志上报 | 🟡 中 |

### 1.3 第三方平台通讯流程

#### 配置字段说明

**robots 表中的第三方配置字段**：
- `thirdPartyCallbackUrl`: 第三方平台的消息回调地址
  - APP 发送消息的目标地址
  - 格式：`https://api.dify.ai/callback`
  - APP 生成完整回调地址：`{url}/api/worktool/callback/{type}?robotId={robotId}`

- `thirdPartyResultCallbackUrl`: 第三方平台的结果回调地址
  - 第三方平台处理完消息后，调用 WorkBot 服务器发送回复
  - 格式：`https://api.worktool.ymdyes.cn/wework/sendRawMessage?robotId={robotId}`

- `thirdPartySecretKey`: 第三方平台的密钥
  - 用于签名验证（可选）
  - 保证安全性

#### 完整通讯流程

```
1. 配置阶段
   管理员在后台配置：
   - thirdPartyCallbackUrl: https://api.dify.ai/callback
   - thirdPartyResultCallbackUrl: https://api.worktool.ymdyes.cn/wework/sendRawMessage
   - thirdPartySecretKey: secret_xxx

2. 配置同步
   服务器 → APP (WebSocket):
   {
     type: "config_push",
     data: {
       worktoolApiUrl: "https://api.dify.ai/callback",
       resultCallbackUrl: "https://api.worktool.ymdyes.cn/wework/sendRawMessage",
       robotId: "wt22phhjpt2xboerspxsote472xdnyq2",
       secretKey: "secret_xxx",
       updatedAt: 1739085600000,
       version: "1.0"
     }
   }

   APP 保存配置后确认：
   {
     type: "config_ack",
     data: {
       robotId: "wt22phhjpt2xboerspxsote472xdnyq2",
       configVersion: "1.0",
       ackTime: "2026-02-09T10:01:00.000Z"
     }
   }

3. 消息发送流程（正常）
   APP 收到企业微信消息
   → 生成回调地址：https://api.dify.ai/callback/api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2
   → 发送消息到第三方平台

   第三方平台处理消息
   → 生成 AI 回复
   → 调用 WorkBot 服务器：https://api.worktool.ymdyes.cn/wework/sendRawMessage?robotId=wt22phhjpt2xboerspxsote472xdnyq2
   → WorkBot 服务器通过 WebSocket 推送给 APP
   → APP 执行指令，发送到企业微信

4. 消息发送流程（回退）
   APP 收到企业微信消息
   → 发送消息到第三方平台
   → 第三方平台返回错误（500、超时等）

   APP 检测到失败，触发回退：
   → 调用 WorkBot 服务器：https://api.worktool.ymdyes.cn/api/third-party/fallback/message
   → WorkBot 服务器使用内置 AI 处理消息
   → 通过 WebSocket 推送给 APP
   → APP 执行指令，发送到企业微信
```

---

## 二、数据库表扩展

### 2.1 需要新增的表

#### 2.1.1 设备激活表 (device_activations)

**说明**: 记录 APP 激活状态和配置同步情况。

```sql
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

  -- 配置同步相关
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
```

#### 2.1.2 配置同步日志表 (config_sync_logs)

**说明**: 记录配置推送和同步的详细日志。

```sql
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
```

#### 2.1.3 消息发送失败日志表 (message_fail_logs)

**说明**: 记录 APP 发送消息到第三方平台失败的日志。

```sql
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
```

#### 2.1.4 会话表 (sessions)

**说明**: 简化版会话管理。

```sql
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

---

## 三、API 接口实现

### 3.1 设备配置查询接口（兜底方案）

**接口**: `GET /api/device/config`

**请求头**:
```
Authorization: Bearer {token}
X-Robot-Id: {robotId}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "worktoolApiUrl": "https://api.dify.ai/callback",
    "resultCallbackUrl": "https://api.worktool.ymdyes.cn/wework/sendRawMessage",
    "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
    "secretKey": "secret_xxx",
    "updatedAt": 1739085600000,
    "version": "1.0"
  }
}
```

**实现文件**: `src/app/api/device/config/route.ts`

### 3.2 第三方回调统一接口

**接口**: `POST /api/third-party/callback/{type}`

**支持的类型**:
- `message`: 消息回调
- `result`: 结果回调
- `qrcode`: 二维码回调
- `online`: 上线回调
- `offline`: 下线回调
- `image`: 图片回调

**示例**: `POST /api/third-party/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2`

**请求体**:
```json
{
  "messageId": "msg_xxx",
  "senderId": "wxid_xxx",
  "senderName": "张三",
  "messageType": "text",
  "content": "你好",
  "chatType": "group",
  "extraData": null,
  "timestamp": "2026-02-09T10:05:03.000Z"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "消息接收成功",
  "data": {
    "messageId": "msg_xxx",
    "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
    "receivedAt": "2026-02-09T10:05:03.000Z"
  }
}
```

**实现文件**: `src/app/api/third-party/callback/[type]/route.ts`

### 3.3 消息回退接口

**接口**: `POST /api/third-party/fallback/message`

**请求头**:
```
Authorization: Bearer {token}
X-Robot-Id: {robotId}
```

**请求体**:
```json
{
  "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
  "content": "你好",
  "messageType": "text",
  "senderId": "wxid_xxx",
  "senderName": "张三"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "messageId": "msg_xxx",
    "replyContent": "您好！我是 AI 助手，很高兴为您服务~",
    "isFallback": true
  }
}
```

**实现文件**: `src/app/api/third-party/fallback/message/route.ts`

### 3.4 机器人配置管理接口

**接口**: `GET /api/robots/[robotId]/config`

**响应**:
```json
{
  "success": true,
  "data": {
    "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
    "thirdPartyCallbackUrl": "https://api.dify.ai/callback",
    "thirdPartyResultCallbackUrl": "https://api.worktool.ymdyes.cn/wework/sendRawMessage",
    "thirdPartySecretKey": "secret_xxx",
    "updatedAt": "2026-02-09T10:00:00.000Z"
  }
}
```

**接口**: `PUT /api/robots/[robotId]/config`

**请求体**:
```json
{
  "thirdPartyCallbackUrl": "https://api.dify.ai/callback",
  "thirdPartyResultCallbackUrl": "https://api.worktool.ymdyes.cn/wework/sendRawMessage",
  "thirdPartySecretKey": "secret_xxx"
}
```

**响应**:
```json
{
  "success": true,
  "message": "配置已更新"
}
```

**实现文件**: `src/app/api/robots/[robotId]/config/route.ts`

### 3.5 配置同步状态查询接口

**接口**: `GET /api/robots/[robotId]/config-status`

**响应**:
```json
{
  "success": true,
  "data": {
    "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
    "deviceId": "device_xxx",
    "configVersion": 1,
    "configSyncedAt": "2026-02-09T10:01:00.000Z",
    "configSynced": true,
    "configError": null,
    "status": "synced"
  }
}
```

**实现文件**: `src/app/api/robots/[robotId]/config-status/route.ts`

### 3.6 消息日志上报接口

**接口**: `POST /api/worktool/message-log`

**请求体**:
```json
{
  "messageId": "msg_xxx",
  "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
  "thirdPartyUrl": "https://api.dify.ai/callback",
  "status": "success",
  "error": null,
  "reportedAt": "2026-02-09T10:05:03.000Z"
}
```

**响应**:
```json
{
  "success": true,
  "message": "日志已记录"
}
```

**实现文件**: `src/app/api/worktool/message-log/route.ts`

---

## 四、WebSocket 协议扩展

### 4.1 新增消息类型

#### 4.1.1 配置推送消息 (config_push)

**服务器 → APP**

```json
{
  "type": "config_push",
  "data": {
    "worktoolApiUrl": "https://api.dify.ai/callback",
    "resultCallbackUrl": "https://api.worktool.ymdyes.cn/wework/sendRawMessage",
    "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
    "secretKey": "secret_xxx",
    "updatedAt": 1739085600000,
    "version": "1.0"
  },
  "timestamp": 1739085600000
}
```

#### 4.1.2 配置确认消息 (config_ack)

**APP → 服务器**

```json
{
  "type": "config_ack",
  "data": {
    "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
    "configVersion": "1.0",
    "ackTime": "2026-02-09T10:01:00.000Z"
  },
  "timestamp": 1739085660000
}
```

#### 4.1.3 配置拒绝消息 (config_nack)

**APP → 服务器**

```json
{
  "type": "config_nack",
  "data": {
    "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
    "configVersion": "1.0",
    "error": "保存配置失败",
    "nackTime": "2026-02-09T10:01:00.000Z"
  },
  "timestamp": 1739085660000
}
```

#### 4.1.4 消息回调消息 (callback)

**服务器 → APP**

```json
{
  "type": "callback",
  "data": {
    "event": "message",
    "messageId": "msg_xxx",
    "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
    "senderId": "wxid_xxx",
    "senderName": "张三",
    "messageType": "text",
    "content": "你好",
    "chatType": "group",
    "extraData": null,
    "timestamp": "2026-02-09T10:05:03.000Z"
  },
  "timestamp": 1739085903000
}
```

#### 4.1.5 消息日志上报消息 (message_log)

**APP → 服务器**

```json
{
  "type": "message_log",
  "data": {
    "messageId": "msg_xxx",
    "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
    "thirdPartyUrl": "https://api.dify.ai/callback",
    "status": "success",
    "error": null,
    "reportedAt": "2026-02-09T10:05:03.000Z"
  },
  "timestamp": 1739085903000
}
```

### 4.2 WebSocket 消息处理实现

**实现文件**: `src/server/websocket/message-handler.ts`

**需要新增的处理函数**:
- `handleConfigAck()` - 处理配置确认
- `handleConfigNack()` - 处理配置拒绝
- `handleMessageLog()` - 处理消息日志上报
- `pushConfigToRobot()` - 推送配置到机器人

---

## 五、实施计划

### 5.1 实施阶段

#### 阶段一：数据库准备（1天）

**任务清单**:
- ✅ 创建 `device_activations` 表
- ✅ 创建 `config_sync_logs` 表
- ✅ 创建 `message_fail_logs` 表
- ✅ 创建 `sessions` 表
- ✅ 添加索引
- ✅ 数据迁移（如果有旧数据）

**文件**: `src/db/migrations/create-third-party-integration-tables.sql`

---

#### 阶段二：API 接口开发（2天）

**任务清单**:
1. ✅ 实现 `/api/device/config` 接口
2. ✅ 实现 `/api/third-party/callback/[type]/` 接口
3. ✅ 实现 `/api/third-party/fallback/message` 接口
4. ✅ 实现 `/api/robots/[robotId]/config` 接口
5. ✅ 实现 `/api/robots/[robotId]/config-status` 接口
6. ✅ 实现 `/api/worktool/message-log` 接口

**文件**:
- `src/app/api/device/config/route.ts`
- `src/app/api/third-party/callback/[type]/route.ts`
- `src/app/api/third-party/fallback/message/route.ts`
- `src/app/api/robots/[robotId]/config/route.ts`
- `src/app/api/robots/[robotId]/config-status/route.ts`
- `src/app/api/worktool/message-log/route.ts`

---

#### 阶段三：WebSocket 协议扩展（1天）

**任务清单**:
1. ✅ 扩展 WebSocket 消息类型
2. ✅ 实现配置推送逻辑
3. ✅ 实现配置确认/拒绝处理
4. ✅ 实现消息回调推送
5. ✅ 实现消息日志上报处理
6. ✅ 测试 WebSocket 通信

**文件**:
- `src/server/websocket/types.ts` - 扩展消息类型定义
- `src/server/websocket/message-handler.ts` - 新增消息处理函数
- `src/server/websocket-server-v3.ts` - 新增配置推送触发时机

---

#### 阶段四：系统集成测试（2天）

**任务清单**:
1. ✅ 配置同步流程测试
2. ✅ 消息发送流程测试
3. ✅ 回退机制测试
4. ✅ 异常情况测试
5. ✅ 性能测试
6. ✅ 压力测试

**测试用例**:
- 配置推送和确认
- 消息发送到第三方平台
- 第三方平台调用 WorkBot API
- 消息回退到主服务器
- 配置同步失败重试
- WebSocket 连接异常

---

#### 阶段五：文档编写（1天）

**任务清单**:
1. ✅ 更新 API 文档
2. ✅ 更新 WebSocket 协议文档
3. ✅ 编写数据库设计文档
4. ✅ 编写部署指南
5. ✅ 编写故障排查指南

---

#### 阶段六：部署上线（1天）

**任务清单**:
1. ✅ 备份数据库
2. ✅ 执行数据库迁移
3. ✅ 部署新版本
4. ✅ 验证部署结果
5. ✅ 监控运行状态

---

### 5.2 优先级排序

| 优先级 | 功能 | 天数 | 依赖 |
|--------|------|------|------|
| 🔴 高 | 数据库准备 | 1天 | 无 |
| 🔴 高 | API 接口开发 | 2天 | 数据库准备 |
| 🔴 高 | WebSocket 协议扩展 | 1天 | API 接口开发 |
| 🟡 中 | 系统集成测试 | 2天 | WebSocket 协议扩展 |
| 🟡 中 | 文档编写 | 1天 | 系统集成测试 |
| 🔴 高 | 部署上线 | 1天 | 文档编写 |

**总时间**: 8天

---

## 六、关键代码示例

### 6.1 设备激活接口（修改后）

```typescript
// src/app/api/robot-ids/activate/route.ts

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { code, deviceInfo } = activateSchema.parse(body);

    // 1. 验证激活码
    const codeResult = await client.query(
      `SELECT * FROM activation_codes WHERE code = $1 LIMIT 1`,
      [code.toUpperCase()]
    );

    if (codeResult.rows.length === 0) {
      return NextResponse.json({ code: 400, message: "激活码无效" }, { status: 400 });
    }

    const activationCode = codeResult.rows[0];

    // 2. 生成机器人ID和UUID
    const robotId = generateRobotId();
    const robotUuid = generateUUID();
    const token = generateToken();

    // 3. 创建/更新 device_activations 记录 ⭐
    await client.query(`
      INSERT INTO device_activations (
        robot_id, robot_uuid, device_id, user_id,
        activation_code, status, activated_at, device_info
      )
      VALUES ($1, $2, $3, $4, $5, 'active', NOW(), $6)
      ON CONFLICT (robot_id) DO UPDATE SET
        last_seen_at = NOW(),
        updated_at = NOW()
    `, [
      robotId,
      robotUuid,
      deviceInfo.deviceId,
      activationCode.bound_user_id,
      activationCode.code,
      JSON.stringify(deviceInfo)
    ]);

    // 4. 查询机器人配置 ⭐
    const robotResult = await client.query(`
      SELECT
        third_party_callback_url,
        third_party_result_callback_url,
        third_party_secret_key,
        EXTRACT(EPOCH FROM updated_at) * 1000 as updated_at_timestamp
      FROM robots
      WHERE robot_id = $1
      LIMIT 1
    `, [robotId]);

    // 5. 通过 WebSocket 推送配置 ⭐
    if (robotResult.rows.length > 0) {
      const robot = robotResult.rows[0];
      const connection = connectionManager.getConnection(robotId);

      if (connection) {
        sendMessage(connection, {
          type: 'config_push',
          data: {
            worktoolApiUrl: robot.third_party_callback_url,
            resultCallbackUrl: robot.third_party_result_callback_url,
            robotId: robotId,
            secretKey: robot.third_party_secret_key,
            updatedAt: robot.updated_at_timestamp,
            version: '1.0'
          },
          timestamp: Date.now()
        });

        // 记录推送日志
        await client.query(`
          INSERT INTO config_sync_logs (
            robot_id, config_version, config_data, sync_status, created_at
          )
          VALUES ($1, '1.0', $2, 'pending', NOW())
        `, [
          robotId,
          JSON.stringify({
            worktoolApiUrl: robot.third_party_callback_url,
            resultCallbackUrl: robot.third_party_result_callback_url,
            robotId: robotId,
            secretKey: robot.third_party_secret_key,
            updatedAt: robot.updated_at_timestamp,
            version: '1.0'
          })
        ]);
      }
    }

    // 6. 返回 Token
    return NextResponse.json({
      code: 201,
      data: {
        robotId,
        robotUuid,
        token,
        expiresIn: 86400
      }
    });

  } catch (error) {
    console.error('激活失败:', error);
    return NextResponse.json(
      { code: 500, message: "激活失败" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
```

### 6.2 第三方回调接口实现

```typescript
// src/app/api/third-party/callback/[type]/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const type = params.type;
    const robotId = request.nextUrl.searchParams.get('robotId');

    if (!robotId) {
      return NextResponse.json(
        { code: 400, message: '缺少机器人ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    console.log(`[ThirdParty] 收到回调: type=${type}, robotId=${robotId}`);

    // 根据回调类型处理
    switch (type) {
      case 'message':
        return await handleMessageCallback(robotId, body);
      case 'result':
        return await handleResultCallback(robotId, body);
      case 'qrcode':
        return await handleQRCodeCallback(robotId, body);
      case 'online':
      case 'offline':
        return await handleStatusCallback(robotId, body, type);
      case 'image':
        return await handleImageCallback(robotId, body);
      default:
        return NextResponse.json(
          { code: 400, message: `未知的回调类型: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[ThirdParty] 处理回调失败:', error);
    return NextResponse.json(
      { code: 500, message: '处理回调失败' },
      { status: 500 }
    );
  }
}

// 处理结果回调（第三方平台调用 WorkBot 发送回复）
async function handleResultCallback(robotId: string, body: any) {
  const client = await pool.connect();
  try {
    // 1. 验证机器人
    const robotResult = await client.query(
      `SELECT id FROM robots WHERE robot_id = $1 LIMIT 1`,
      [robotId]
    );

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { code: 404, message: '机器人不存在' },
        { status: 404 }
      );
    }

    // 2. 提取消息内容
    const { content, target, messageType = 'text' } = body;

    if (!content || !target) {
      return NextResponse.json(
        { code: 400, message: '缺少必要参数：content 或 target' },
        { status: 400 }
      );
    }

    // 3. 通过 WebSocket 推送给 APP
    const connection = connectionManager.getConnection(robotId);

    if (!connection) {
      return NextResponse.json(
        { code: 503, message: '机器人未连接' },
        { status: 503 }
      );
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    sendMessage(connection, {
      type: 'command_push',
      data: {
        commandId,
        commandType: 203, // 发送消息指令
        params: {
          target,
          content,
          messageType
        }
      },
      timestamp: Date.now()
    });

    console.log(`[ThirdParty] 指令已推送给 APP: ${robotId}, 指令: ${commandId}`);

    return NextResponse.json({
      code: 200,
      message: '指令已下发',
      data: {
        commandId,
        robotId,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('[ThirdParty] 处理结果回调失败:', error);
    throw error;
  } finally {
    client.release();
  }
}
```

### 6.3 消息回退接口实现

```typescript
// src/app/api/third-party/fallback/message/route.ts

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    // 1. 验证 Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '缺少认证信息' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);

    if (!payload || payload.robotId !== robotId) {
      return NextResponse.json(
        { success: false, error: 'Token 无效' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const { robotId, content, messageType, senderId, senderName } = body;

    if (!robotId || !content) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 3. 查询机器人配置
    const robotResult = await client.query(
      `SELECT id, robot_id, ai_mode, ai_provider, ai_model, ai_api_key
       FROM robots WHERE robot_id = $1 LIMIT 1`,
      [robotId]
    );

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '机器人不存在' },
        { status: 404 }
      );
    }

    const robot = robotResult.rows[0];

    // 4. 保存消息到数据库
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = `session_${robotId}_${senderId || 'unknown'}`;

    await client.query(`
      INSERT INTO messages (
        robot_id, user_id, session_id, message_type,
        content, extra_data, status, direction, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'received', 'incoming', NOW())
    `, [robotId, senderId || null, sessionId, messageType || 'text', content, JSON.stringify(body)]);

    // 5. 处理消息（使用内置 AI 或其他方式）
    let replyContent = '';

    if (robot.ai_mode === 'builtin' && robot.ai_api_key) {
      // 使用内置 AI 生成回复
      replyContent = await generateAIReply(content, robot);
    } else {
      // 使用默认回复
      replyContent = '感谢您的消息，我们会尽快回复。';
    }

    // 6. 保存回复到数据库
    await client.query(`
      INSERT INTO messages (
        robot_id, user_id, session_id, message_type,
        content, extra_data, status, direction, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'sent', 'outgoing', NOW())
    `, [robotId, null, sessionId, 'text', replyContent, JSON.stringify({ isFallback: true })]);

    // 7. 通过 WebSocket 推送给 APP
    const connection = connectionManager.getConnection(robotId);

    if (connection) {
      sendMessage(connection, {
        type: 'command_push',
        data: {
          commandId: `cmd_${Date.now()}`,
          commandType: 203,
          params: {
            target: senderName || '用户',
            content: replyContent,
            messageType: 'text'
          }
        },
        timestamp: Date.now()
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        messageId,
        replyContent,
        isFallback: true
      }
    });

  } catch (error) {
    console.error('[Fallback] 处理消息失败:', error);
    return NextResponse.json(
      { success: false, error: '处理消息失败' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// AI 回复生成函数
async function generateAIReply(content: string, robot: any): Promise<string> {
  // TODO: 实现具体的 AI 调用逻辑
  // 这里可以调用豆包、DeepSeek、Kimi 等 AI 服务
  
  // 简化实现：返回固定回复
  return `您好！我是 AI 助手，您说"${content}"，很高兴为您服务！`;
}
```

---

## 七、总结

### 7.1 关键点

1. **配置字段映射**:
   - `thirdPartyCallbackUrl` → APP 发送消息的目标地址
   - `thirdPartyResultCallbackUrl` → 第三方平台调用 WorkBot 的地址
   - `thirdPartySecretKey` → 密钥（可选）

2. **配置推送流程**:
   - 管理员配置 → 保存到数据库 → WebSocket 推送 → APP 确认

3. **消息发送流程**:
   - APP → 第三方平台 → WorkBot API → WebSocket → APP

4. **回退机制**:
   - 第三方平台失败 → APP 回退到 WorkBot → 内置 AI 处理 → WebSocket → APP

### 7.2 兼容性

✅ **向后兼容**:
- 现有接口保持不变
- 新增消息类型不影响现有 WebSocket 协议
- 数据库新增表不影响现有表

### 7.3 实施时间

**总时间**: 8天
- 数据库准备: 1天
- API 接口开发: 2天
- WebSocket 协议扩展: 1天
- 系统集成测试: 2天
- 文档编写: 1天
- 部署上线: 1天

---

**文档结束**
