# WorkBot 部署说明

## 概述

本文档描述 WorkBot 企业微信机器人管理系统的部署流程，包括环境配置、构建、启动和验证。

## 前置要求

### 1. 环境变量配置

在项目根目录创建 `.env` 文件，配置以下环境变量：

```bash
# 数据库连接（阿里云 RDS PostgreSQL）
PGDATABASE_URL=postgresql://username:password@rds-hostname:5432/dbname?sslmode=disable

# JWT 密钥（生产环境必须配置）
JWT_SECRET=your-secret-key-here

# 其他配置（可选）
NODE_ENV=production
```

**重要说明**：
- `PGDATABASE_URL` 中的 `sslmode=disable` 是必需的，因为阿里云 RDS 不支持 SSL 连接
- `JWT_SECRET` 在生产环境必须配置，否则可能导致安全风险
- 数据库白名单需要设置为 `0.0.0.0/0` 以允许沙箱环境访问

### 2. 依赖安装

确保已安装 Node.js 18+ 和 pnpm：

```bash
# 安装 pnpm
npm install -g pnpm

# 安装项目依赖
pnpm install
```

## 部署流程

### 方法 1：使用部署脚本（推荐）

项目提供了自动化部署脚本，可以简化部署流程：

```bash
# 1. 构建 + 启动
./scripts/deploy-build.sh
```

该脚本会自动执行以下操作：
- 安装依赖
- 清理构建缓存
- 构建生产版本
- 启动服务
- 验证服务状态

### 方法 2：手动部署

如果需要手动部署，请按照以下步骤：

#### 1. 构建生产版本

```bash
# 构建生产版本
pnpm run build
```

构建成功后，`.next` 目录下会生成优化后的生产文件。

#### 2. 启动服务

```bash
# 使用提供的启动脚本
./scripts/start.sh

# 或直接启动
NODE_ENV=production pnpm run start
```

服务启动后会运行在 5000 端口。

#### 3. 验证服务状态

```bash
# 检查端口是否监听
ss -lptn 'sport = :5000'

# 或使用健康检查端点
curl http://localhost:5000/api/health/ready
```

健康检查端点返回示例：

```json
{
  "status": "ready",
  "database": "connected",
  "timestamp": "2024-02-08T10:00:00.000Z"
}
```

## 数据库连接测试

在部署前，建议先测试数据库连接：

```bash
# 使用提供的测试脚本
./scripts/test-db.sh
```

该脚本会测试数据库连接是否正常，并返回详细的连接信息。

## 服务端口

- **HTTP 服务**: 5000
- **WebSocket 服务**: 与 HTTP 共享 5000 端口

## 日志位置

- **应用日志**: `/app/work/logs/bypass/app.log`
- **开发日志**: `/app/work/logs/bypass/dev.log`
- **控制台日志**: `/app/work/logs/bypass/console.log`

## 常见问题

### 1. 数据库连接超时

**问题**: 部署时出现 "timeout exceeded when trying to connect" 错误。

**解决方案**:
- 数据库连接超时已优化为 15 秒，添加了连接重试机制（最多 3 次）
- 确保数据库白名单设置为 `0.0.0.0/0`
- 确保数据库连接字符串包含 `sslmode=disable`

### 2. 构建失败

**问题**: 构建时出现 TypeScript 错误。

**解决方案**:
- 生产环境会进行严格的类型检查
- 确保所有依赖都已安装：`pnpm install`
- 检查 `.env` 文件是否配置正确

### 3. 客户端异常

**问题**: 页面显示 "Application error: a client-side exception has occurred"。

**解决方案**:
- 系统已实现全局错误边界和错误监听器
- 错误会自动上报到 `/api/errors` 端点
- 检查日志文件查看详细错误信息

### 4. 端口冲突

**问题**: 启动时提示 "Port 5000 is already in use"。

**解决方案**:

```bash
# 查找占用端口的进程
ss -lptn 'sport = :5000'

# 终止进程
kill -9 <PID>

# 重新启动服务
./scripts/start.sh
```

### 5. 服务未就绪

**问题**: 部署系统无法确认服务是否启动成功。

**解决方案**:
- 使用健康检查端点：`curl http://localhost:5000/api/health/ready`
- 确保返回 `status: "ready"` 和 `database: "connected"`
- 如果健康检查失败，检查日志文件排查问题

## 部署验证清单

在部署完成后，请验证以下项目：

- [ ] 服务启动成功，5000 端口正常监听
- [ ] 健康检查端点返回正常状态
- [ ] 数据库连接正常
- [ ] 可以访问首页：`http://localhost:5000`
- [ ] 登录页面可以正常加载
- [ ] 日志文件正常生成

## 生产环境安全配置

在生产环境部署时，请确保：

1. **JWT_SECRET**: 必须配置强密码
2. **数据库白名单**: 使用最小权限原则，只允许必要的 IP 访问
3. **HTTPS**: 使用反向代理（如 Nginx）配置 HTTPS
4. **防火墙**: 配置防火墙规则，只允许必要端口访问

## 监控和维护

### 日志监控

定期检查日志文件：

```bash
# 查看最新日志
tail -n 50 /app/work/logs/bypass/app.log

# 搜索错误日志
grep -i error /app/work/logs/bypass/app.log | tail -n 20
```

### 数据库监控

使用提供的测试脚本定期检查数据库连接：

```bash
./scripts/test-db.sh
```

### 服务重启

如果需要重启服务：

```bash
# 停止服务
pkill -f "tsx server.ts"

# 启动服务
./scripts/start.sh
```

## 技术支持

如果遇到部署问题，请检查：

1. 日志文件：`/app/work/logs/bypass/app.log`
2. 健康检查：`curl http://localhost:5000/api/health/ready`
3. 数据库连接：`./scripts/test-db.sh`

如需进一步帮助，请提供：
- 错误日志
- 健康检查结果
- 数据库连接测试结果

## 附录

### 环境变量完整列表

```bash
# 数据库连接
PGDATABASE_URL=postgresql://username:password@host:5432/dbname?sslmode=disable
DATABASE_URL=postgresql://username:password@host:5432/dbname?sslmode=disable

# JWT 配置
JWT_SECRET=your-secret-key

# 运行环境
NODE_ENV=production
```

### 服务脚本说明

- `scripts/deploy-build.sh`: 自动化部署脚本（构建 + 启动）
- `scripts/start.sh`: 服务启动脚本
- `scripts/test-db.sh`: 数据库连接测试脚本

### 关键端点

- 健康检查: `GET /api/health/ready`
- 错误上报: `POST /api/errors`
- 登录: `POST /api/user/login-by-password`
