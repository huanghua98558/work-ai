# WorkBot 企业微信机器人管理系统

## 项目简介

WorkBot 是一个完整的企业微信机器人管理系统，支持多平台（企业微信、微信公众号、微信小程序）接入，提供激活码管理、机器人配置、对话管理、知识库等功能。

## 技术栈

- **前端**：Next.js 15.5.12 (App Router) + React 19 + TypeScript 5
- **UI 组件**：shadcn/ui (基于 Radix UI)
- **样式**：Tailwind CSS 3.4
- **后端**：Next.js API Routes
- **数据库**：PostgreSQL 18 (阿里云 RDS)
- **ORM**：Drizzle ORM 0.45.1
- **认证**：JWT (jsonwebtoken)
- **实时通信**：WebSocket (ws 库)

## 快速开始

### 1. 环境准备

确保已安装：
- Node.js 24
- pnpm

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`：

```env
# 数据库连接
PGDATABASE_URL=postgresql://username:password@host:port/database

# JWT 密钥
JWT_SECRET=your-secret-key-change-in-production
```

### 4. 初始化数据库

```bash
# 创建数据库表
curl -X POST http://localhost:5000/api/db/create-aliyun-tables
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5000

### 6. 初始化管理员账户

首次访问 http://localhost:5000/init，按照提示创建管理员账户。

默认管理员账号：
- 账号：`admin`
- 密码：`admin123`

## 功能特性

### 核心功能

- ✅ **激活码管理**：支持生成、查看、编辑、删除激活码，支持批量生成（1-100个）
- ✅ **机器人管理**：创建和管理机器人，支持绑定激活码
- ✅ **设备激活**：APP通过激活码激活设备，支持绑定机器人和纯激活码两种模式
- ✅ **对话管理**：查看和管理对话记录
- ✅ **知识库管理**：管理知识库内容
- ✅ **用户管理**：查看和管理用户

### 激活码模式

支持两种激活模式：

#### 模式A：激活码绑定机器人
- **预绑定机器人**：管理员先创建机器人，然后生成绑定该机器人的激活码
- **纯激活码激活**：管理员生成纯激活码，APP激活时自动创建机器人

#### 特性
- 支持批量生成（绑定机器人模式只能生成1个）
- 支持有效期设置（1个月/6个月/1年）
- 支持设备解绑
- 防止跨设备激活

## 项目结构

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── activation-codes/  # 激活码管理
│   │   │   ├── robots/           # 机器人管理
│   │   │   ├── auth/             # 认证相关
│   │   │   ├── db/               # 数据库相关
│   │   │   └── init/             # 初始化相关
│   │   ├── activation-codes/  # 激活码管理页面
│   │   ├── robots/            # 机器人管理页面
│   │   └── init/              # 初始化页面
│   ├── components/           # React 组件
│   │   ├── ui/               # shadcn/ui 组件
│   │   └── layout/           # 布局组件
│   ├── lib/                 # 工具库
│   │   ├── db.ts            # 数据库连接
│   │   ├── auth.ts          # 认证工具
│   │   └── jwt.ts           # JWT 工具
│   └── storage/             # 数据存储
├── .coze                    # Coze CLI 配置
├── .env                     # 环境变量
├── DEPLOYMENT.md           # 部署指南
└── README.md              # 项目说明
```

## 部署

详细的部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

### 快速部署

```bash
# 构建项目
pnpm build

# 启动生产环境
pnpm start
```

## API 文档

### 认证相关

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "admin",
  "password": "admin123"
}
```

#### 注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "phone": "15000150000",
  "password": "password123",
  "nickname": "测试用户"
}
```

### 激活码管理

#### 获取激活码列表
```http
GET /api/activation-codes
Authorization: Bearer {token}
```

#### 创建激活码
```http
POST /api/activation-codes
Authorization: Bearer {token}
Content-Type: application/json

{
  "validityPeriod": 365,
  "type": "pure_code",
  "notes": "测试激活码",
  "batchCount": 10
}
```

#### 删除激活码
```http
DELETE /api/activation-codes/{id}
Authorization: Bearer {token}
```

### 机器人管理

#### 获取机器人列表
```http
GET /api/robots
Authorization: Bearer {token}
```

#### 创建机器人
```http
POST /api/robots
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "测试机器人",
  "description": "这是一个测试机器人",
  "botType": "feishu"
}
```

## 开发规范

### 命名规范
- 组件文件：PascalCase (如 `ActivationCodesPage.tsx`)
- 工具函数：camelCase (如 `getAuthToken`)
- API 路由：kebab-case (如 `/api/activation-codes`)

### 代码风格
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码

## 常见问题

### 1. 数据库连接失败

检查 `.env` 文件中的数据库连接字符串是否正确。

### 2. 激活码生成失败

确保：
- 已登录且角色为 `admin`
- JWT token 未过期
- 数据库表结构正确

### 3. 部署后无法访问

检查：
- 服务是否正常启动
- 端口 5000 是否可访问
- 查看日志文件：`/app/work/logs/bypass/app.log`

## 技术支持

如有问题，请查看：
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- 日志文件：`/app/work/logs/bypass/app.log`

## License

MIT

## 最新功能：日志远程调度（2026-02-08）

### 功能概述

实现了完整的日志远程调度功能，包括日志上传、查询、配置和 WebSocket 实时推送。

### 数据库表结构

#### logs 表
存储远程客户端上传的日志条目，包含以下字段：
- `id`: 日志唯一标识
- `robot_id`: 机器人ID
- `timestamp`: Unix 毫秒时间戳
- `level`: 日志级别（0-5）
- `tag`: 日志标签（来源模块）
- `message`: 日志消息
- `extra`: 扩展信息（JSON）
- `stack_trace`: 异常堆栈
- `sync_status`: 同步状态
- `sync_time`: 同步时间戳
- `device_id`: 设备ID

#### log_configs 表
存储客户端的日志配置，包含以下字段：
- `robot_id`: 机器人ID（主键）
- `log_level`: 日志级别
- `upload_enabled`: 是否启用上传
- `upload_interval`: 上传间隔（毫秒）
- `upload_on_wifi_only`: 仅 WiFi 上传
- `max_log_entries`: 最大日志条数
- `retention_days`: 保留天数
- `tags`: 各模块的日志级别配置（JSON）

### API 接口

#### 1. 上传日志
```http
POST /api/v1/logs/upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "robotId": "robot_123456789",
  "logs": [
    {
      "id": "uuid-1",
      "timestamp": 1707350400000,
      "level": 2,
      "tag": "RobotService",
      "message": "机器人已启动",
      "extra": {...},
      "stackTrace": "...",
      "deviceId": "device_fingerprint_123"
    }
  ]
}
```

#### 2. 查询日志
```http
GET /api/v1/logs/query?robotId=xxx&level=2&page=1&pageSize=50
Authorization: Bearer {token}
```

支持筛选参数：
- `robotId`: 机器人ID（必需）
- `level`: 日志级别
- `tag`: 日志标签
- `startTime`: 开始时间戳
- `endTime`: 结束时间戳
- `keyword`: 关键词搜索
- `page`: 页码
- `pageSize`: 每页数量

#### 3. 获取日志配置
```http
GET /api/v1/logs/config?robotId=xxx
Authorization: Bearer {token}
```

#### 4. 更新日志配置
```http
POST /api/v1/logs/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "robotId": "robot_123456789",
  "logLevel": 2,
  "uploadEnabled": true,
  "uploadInterval": 300000,
  "uploadOnWifiOnly": true,
  "maxLogEntries": 10000,
  "retentionDays": 30,
  "tags": {...}
}
```

### WebSocket 实时推送

#### 连接地址
```
ws://localhost:5000/api/v1/logs/stream?robotId=xxx&token=xxx
```

#### 消息类型

**客户端 → 服务器**：
- `ping` - 心跳
- `subscribe` - 订阅实时日志推送
- `unsubscribe` - 取消订阅

**服务器 → 客户端**：
- `authenticated` - 认证成功
- `pong` - 心跳响应
- `log` - 实时日志推送
- `config_update` - 配置变更通知

### 客户端 SDK

提供了完整的 TypeScript 客户端 SDK，位于 `docs/WorkToolLogClient.ts`。

#### HTTP 客户端示例
```typescript
import { WorkToolLogClient, LogLevel } from './WorkToolLogClient';

const client = new WorkToolLogClient({
  baseUrl: 'https://gbdvprr2vy.coze.site',
  token: 'your_token_here',
  robotId: 'robot_123456789',
});

// 上传日志
await client.uploadLogs([
  {
    id: 'log_1',
    timestamp: Date.now(),
    level: LogLevel.INFO,
    tag: 'RobotService',
    message: '机器人已启动',
    extra: { batteryLevel: 85 },
  },
]);

// 查询日志
const result = await client.queryLogs({
  level: LogLevel.ERROR,
  page: 1,
  pageSize: 50,
});

// 获取配置
const config = await client.getLogConfig();

// 更新配置
await client.updateLogConfig({
  logLevel: LogLevel.WARN,
  uploadEnabled: true,
});
```

#### WebSocket 客户端示例
```typescript
import { LogStreamClient } from './WorkToolLogClient';

const streamClient = new LogStreamClient({
  baseUrl: 'https://gbdvprr2vy.coze.site',
  token: 'your_token_here',
  robotId: 'robot_123456789',
});

// 连接
await streamClient.connect();

// 注册消息处理器
streamClient.on('log', (data) => {
  console.log('收到实时日志:', data);
});

streamClient.on('config_update', (data) => {
  console.log('配置已更新:', data);
});

// 订阅实时日志
streamClient.subscribe();

// 取消订阅
streamClient.unsubscribe();

// 断开连接
streamClient.disconnect();
```

### 部署说明

#### 1. 创建数据库表
```bash
curl -X POST http://localhost:5000/api/db/create-log-tables
```

#### 2. 修复字段类型（如果需要）
```bash
curl -X POST http://localhost:5000/api/db/fix-log-tables
```

#### 3. 验证接口
```bash
bash scripts/test-log-apis.sh
```

### 文档清单

- `docs/WorkToolLogClient.ts` - 客户端 SDK 源码
- `docs/日志远程调度接口实现文档.md` - 完整实现文档
- `scripts/test-log-apis.sh` - API 接口测试脚本

### 测试结果

| 接口 | 状态 | 说明 |
|------|------|------|
| POST /api/v1/logs/upload | ✅ 通过 | 日志上传成功 |
| GET /api/v1/logs/query | ✅ 通过 | 日志查询成功 |
| GET /api/v1/logs/config | ✅ 通过 | 获取配置成功 |
| POST /api/v1/logs/config | ✅ 通过 | 更新配置成功 |
| WS /api/v1/logs/stream | ✅ 通过 | WebSocket 连接成功 |

### 注意事项

1. **Token 验证**: 当前实现中 Token 验证已预留接口，生产环境需要实现完整的 Token 验证逻辑
2. **权限控制**: 需要添加用户权限检查，确保用户只能查询和修改自己授权的机器人日志
3. **数据脱敏**: 日志中可能包含敏感信息，需要在查询和展示时进行脱敏处理
4. **性能优化**: 对于大量日志的查询，建议添加分页、索引和缓存机制
5. **错误处理**: 需要完善错误处理逻辑，包括网络错误、数据库错误、认证错误等

### 后续优化

1. **日志分析**: 添加日志统计和分析功能
2. **告警机制**: 实现基于日志的告警功能
3. **日志导出**: 支持导出日志为文件
4. **实时监控**: 添加实时日志监控面板
5. **日志清理**: 实现自动清理过期日志的任务

