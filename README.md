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
