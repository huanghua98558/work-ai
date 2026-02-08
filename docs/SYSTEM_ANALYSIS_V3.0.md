# WorkBot 系统分析报告 v1.0

**分析日期**: 2026-02-09  
**目标版本**: v3.0  
**当前状态**: 需要完整整改

---

## 1. 现状分析

### 1.1 WebSocket 连接方式

#### 当前实现
```typescript
// 文件: src/server/websocket-server.ts
- 连接地址: /ws
- 认证方式: 消息认证（已实现）
- 认证超时: 30秒 ✅
- 心跳间隔: 30秒 ✅
- 心跳超时: 60秒 ✅
```

#### 文档要求
```
- 连接地址: wss://gbdvprr2vy.coze.site/ws ✅
- 认证方式: 消息认证 ✅
- 连接超时: 10秒 ❌
- 重连延迟: 5秒 ❌ (客户端配置)
- 最大重连次数: 5次 ❌ (客户端配置)
- 认证超时: 30秒 ✅
```

### 1.2 消息类型对比

| 消息类型 | 文档要求 | 当前实现 | 状态 |
|---------|---------|---------|------|
| authenticate | ✅ | ✅ | 已实现 |
| authenticated | ✅ | ✅ | 已实现 |
| heartbeat | ✅ | ✅ | 已实现 (ping/pong) |
| command_push | ✅ | ❌ | 需要实现 |
| config_push | ✅ | ❌ | 需要实现 |
| status_query | ✅ | ❌ | 需要实现 |
| status_response | ✅ | ❌ | 需要实现 |
| result | ✅ | ❌ | 需要实现 |
| error | ✅ | ✅ | 已实现 |

### 1.3 指令类型对比

| 指令类型 | 编码 | 文档要求 | 当前实现 | 状态 |
|---------|------|---------|---------|------|
| send_message | 203 | ✅ | ❌ | 需要实现 |
| forward_message | 205 | ✅ | ❌ | 需要实现 |
| create_group | 206 | ✅ | ❌ | 需要实现 |
| update_group | 207 | ✅ | ❌ | 需要实现 |
| send_file | 218 | ✅ | ❌ | 需要实现 |
| dissolve_group | 219 | ✅ | ❌ | 需要实现 |
| send_favorite | 900 | ✅ | ❌ | 需要实现 |

---

## 2. 关键差异分析

### 2.1 消息格式差异

#### 文档要求的消息格式
```json
{
  "type": "command_push",
  "data": {
    "commandId": "cmd-001",
    "commandType": "send_message",
    "target": "张三",
    "params": {
      "titleList": ["张三"],
      "receivedContent": "你好！",
      "atList": []
    },
    "priority": 0
  },
  "timestamp": "1770341506000"
}
```

#### 当前实现的消息格式
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

**差异点**：
1. type 不一致：`command` vs `command_push`
2. params 结构不一致：
   - 文档：`titleList`, `receivedContent`, `atList`
   - 当前：`target`, `content`, `messageType`
3. 缺少 `target` 字段
4. 有额外的 `messageId` 字段

### 2.2 心跳格式差异

#### 文档要求
```json
{
  "type": "heartbeat",
  "data": {
    "robotId": "robot_1770466979183_l91gip9c",
    "status": "running",
    "battery": 85,
    "signal": 4
  },
  "timestamp": "1770341507000"
}
```

#### 当前实现
```json
// 客户端发送
{
  "type": "ping",
  "data": {}
}

// 服务器响应
{
  "type": "pong",
  "timestamp": 1234567890
}
```

**差异点**：
1. type 不一致：`heartbeat` vs `ping/pong`
2. 客户端心跳缺少设备状态信息
3. 服务器响应格式不一致

### 2.3 认证格式差异

#### 文档要求
```json
{
  "type": "authenticate",
  "data": {
    "robotId": "robot_1770466979183_l91gip9c",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "timestamp": 1770341504000
  },
  "timestamp": "1770341504000"
}
```

#### 当前实现
```json
{
  "type": "authenticate",
  "data": {
    "robotId": "xxx",
    "token": "xxx",
    "timestamp": 1234567890
  }
}
```

**差异点**：
- 基本一致 ✅

---

## 3. 功能缺失分析

### 3.1 缺失的核心功能

1. **配置推送功能** ❌
   - config_push 消息类型未实现
   - 无法动态更新客户端配置

2. **状态查询功能** ❌
   - status_query 消息类型未实现
   - 无法主动查询设备状态

3. **指令执行结果反馈** ❌
   - result 消息类型未处理
   - 无法获取指令执行结果

4. **指令队列管理** ❌
   - 缺少优先级队列
   - 缺少指令状态跟踪

5. **风控配置** ❌
   - 缺少延迟控制
   - 缺少频率限制

### 3.2 数据模型缺失

```typescript
// 缺失的数据模型
interface HeartbeatData {
  robotId: string;
  status: string;          // running/idle/error
  battery: number;         // 0-100
  signal: number;          // 0-4
}

interface CommandPushData {
  commandId: string;
  commandType: string;
  target: string;
  params: Map<string, any>;
  priority: number;
}

interface ConfigPushData {
  robotId: string;
  configType: string;
  config: Map<string, any>;
  version: number;
}

interface StatusQueryData {
  queryId: string;
}

interface StatusResponseData {
  queryId: string;
  status: string;
  deviceInfo: DeviceInfo;
}

interface DeviceInfo {
  robotId: string;
  deviceModel: string;
  androidVersion: string;
  battery: number;
  signal: number;
  memoryUsage: number;
  cpuUsage: number;
  networkType: string;
  weworkVersion: string;
}
```

---

## 4. 架构整改方案

### 4.1 消息类型规范化

```typescript
// 统一消息类型常量
export enum WSMessageType {
  // 认证相关
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  
  // 心跳相关
  HEARTBEAT = 'heartbeat',
  
  // 指令相关
  COMMAND_PUSH = 'command_push',
  RESULT = 'result',
  
  // 配置相关
  CONFIG_PUSH = 'config_push',
  
  // 状态相关
  STATUS_QUERY = 'status_query',
  STATUS_RESPONSE = 'status_response',
  
  // 错误
  ERROR = 'error',
  
  // 保留旧类型（兼容性）
  PING = 'ping',
  PONG = 'pong',
}

// 指令类型常量
export enum CommandType {
  SEND_MESSAGE = 'send_message',      // 203
  FORWARD_MESSAGE = 'forward_message', // 205
  CREATE_GROUP = 'create_group',       // 206
  UPDATE_GROUP = 'update_group',       // 207
  SEND_FILE = 'send_file',            // 218
  DISSOLVE_GROUP = 'dissolve_group', // 219
  SEND_FAVORITE = 'send_favorite',   // 900
}

// 配置类型常量
export enum ConfigType {
  RISK_CONTROL = 'risk_control',
  REPLY_TEMPLATE = 'reply_template',
  BEHAVIOR_PATTERN = 'behavior_pattern',
  KEYWORD_FILTER = 'keyword_filter',
}
```

### 4.2 WebSocket 服务器改造

```typescript
// 新增功能模块
src/server/websocket/
├── server.ts              # WebSocket 服务器（主文件）
├── connection-manager.ts  # 连接管理器
├── message-handler.ts     # 消息处理器
├── command-queue.ts       # 指令队列
├── config-manager.ts      # 配置管理器
└── types.ts               # 类型定义
```

### 4.3 数据库表结构

```sql
-- 指令队列表
CREATE TABLE IF NOT EXISTS commands (
  id VARCHAR(50) PRIMARY KEY,
  robot_id VARCHAR(50) NOT NULL,
  command_type VARCHAR(50) NOT NULL,
  command_code INT,              -- 指令编码 (203, 205, etc.)
  target VARCHAR(100),
  params JSONB NOT NULL,
  priority INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, executing, success, failed
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 配置表
CREATE TABLE IF NOT EXISTS robot_configs (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(50) NOT NULL UNIQUE,
  config_type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 设备状态表
CREATE TABLE IF NOT EXISTS device_status (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'idle',      -- running, idle, error
  device_info JSONB,
  battery INT,                             -- 0-100
  signal INT,                              -- 0-4
  memory_usage INT,                        -- 百分比
  cpu_usage INT,                           -- 百分比
  network_type VARCHAR(20),
  wework_version VARCHAR(20),
  last_heartbeat_at TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.4 API 接口改造

```typescript
// 新增接口
POST /api/commands/send          // 发送指令
GET  /api/commands/{id}          // 查询指令状态
GET  /api/commands/queue/{robotId} // 查询指令队列
POST /api/configs/push           // 推送配置
GET  /api/configs/{robotId}      // 查询配置
GET  /api/status/{robotId}       // 查询设备状态
POST /api/status/query           // 主动查询状态
```

---

## 5. 实施计划

### 阶段一：消息类型规范化（优先级：高）

1. 定义统一的消息类型常量
2. 更新类型定义文件
3. 修改消息处理器支持新格式
4. 保持向后兼容

### 阶段二：核心功能实现（优先级：高）

1. 实现指令推送功能
2. 实现指令队列管理
3. 实现配置推送功能
4. 实现状态查询功能
5. 实现结果反馈功能

### 阶段三：数据库支持（优先级：中）

1. 创建指令队列表
2. 创建配置表
3. 创建设备状态表
4. 更新数据访问层

### 阶段四：风控和安全（优先级：中）

1. 实现延迟控制
2. 实现频率限制
3. 实现指令优先级
4. 实现错误重试机制

### 阶段五：测试和优化（优先级：中）

1. 单元测试
2. 集成测试
3. 性能优化
4. 文档更新

---

## 6. 风险评估

### 6.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| 客户端不兼容 | 高 | 中 | 提供版本检测和降级方案 |
| 消息格式冲突 | 中 | 高 | 保持向后兼容 |
| 性能下降 | 中 | 中 | 使用队列和异步处理 |
| 数据丢失 | 高 | 低 | 实现持久化和重试机制 |

### 6.2 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| 功能中断 | 高 | 中 | 灰度发布，快速回滚 |
| 数据不一致 | 中 | 中 | 事务处理和数据校验 |
| 用户体验下降 | 中 | 低 | 充分测试和优化 |

---

## 7. 成功标准

### 7.1 功能完整性

- ✅ 所有文档要求的消息类型都已实现
- ✅ 所有文档要求的指令类型都已实现
- ✅ 指令队列正常工作
- ✅ 配置推送正常工作
- ✅ 状态查询正常工作

### 7.2 性能指标

- ✅ 消息延迟 < 100ms
- ✅ 心跳响应 < 50ms
- ✅ 指令执行成功率 > 99%
- ✅ 连接稳定性 > 99.9%

### 7.3 兼容性

- ✅ 向后兼容旧版本客户端
- ✅ 支持新版本客户端所有功能
- ✅ 支持主流 Android 版本

---

## 8. 下一步行动

1. ✅ 确认技术文档要求
2. ✅ 分析当前实现差异
3. ⏳ 制定详细实施计划
4. ⏳ 开始代码改造
5. ⏳ 测试验证
6. ⏳ 部署上线

---

**报告结束**
