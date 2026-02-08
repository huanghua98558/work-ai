# WorkBot 部署指南

## 📋 部署前准备

在部署 WorkBot 之前，您需要准备以下资源：

### 1. 数据库
- PostgreSQL 数据库（版本 13 或更高）
- 数据库用户名和密码
- 数据库主机地址和端口

### 2. 环境变量
需要配置以下必需的环境变量：

| 变量名 | 说明 | 示例 | 必需 |
|--------|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@host:5432/db` | ✅ 是 |
| `JWT_SECRET` | JWT 加密密钥 | 至少 32 个字符的随机字符串 | ✅ 是 |

## 🚀 快速部署

### 步骤 1: 生成 JWT_SECRET

```bash
# 方法 1: 使用 OpenSSL
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3: 使用 Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 步骤 2: 配置数据库连接字符串

格式：
```
postgresql://用户名:密码@主机:端口/数据库名
```

示例：
```
postgresql://workbot_user:secure_password_123@db.example.com:5432/workbot
```

### 步骤 3: 在部署平台配置环境变量

1. 登录到部署平台
2. 进入项目设置 → 环境变量
3. 添加以下环境变量：

```bash
DATABASE_URL=postgresql://用户名:密码@数据库地址:5432/数据库名
JWT_SECRET=生成的密钥（至少32个字符）
```

### 步骤 4: 创建数据库表

部署成功后，访问以下 URL 创建必需的数据库表：

```
http://您的域名/api/db/create-tables
```

### 步骤 5: 初始化管理员账户

访问以下 URL 创建管理员账户：

```
http://您的域名/init
```

## 🔧 详细配置

### 环境变量完整列表

#### 必需的环境变量

```bash
# 数据库连接
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT 密钥（至少 32 个字符）
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
```

#### 可选的环境变量

```bash
# Node 环境（默认: production）
NODE_ENV=production

# 服务端口（默认: 5000）
PORT=5000

# JWT 访问令牌过期时间（默认: 24h）
JWT_ACCESS_EXPIRES_IN=24h

# JWT 刷新令牌过期时间（默认: 7d）
JWT_REFRESH_EXPIRES_IN=7d

# WebSocket 心跳间隔（默认: 30000ms）
WS_HEARTBEAT_INTERVAL=30000

# 最大 WebSocket 连接数（默认: 1000）
WS_MAX_CONNECTIONS=1000

# CORS 源（默认: *）
CORS_ORIGIN=*

# 启用限流（默认: true）
RATE_LIMIT_ENABLED=true

# 限流时间窗口（默认: 60000ms）
RATE_LIMIT_WINDOW_MS=60000

# 每个时间窗口内的最大请求数（默认: 100）
RATE_LIMIT_MAX_REQUESTS=100
```

### 数据库配置

#### 创建数据库

```sql
-- 创建数据库
CREATE DATABASE workbot;

-- 创建用户
CREATE USER workbot_user WITH PASSWORD 'secure_password';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE workbot TO workbot_user;

-- 连接到数据库
\c workbot

-- 授予 schema 权限
GRANT ALL ON SCHEMA public TO workbot_user;
```

#### 连接字符串格式

**开发环境：**
```
postgresql://workbot_user:password@localhost:5432/workbot
```

**生产环境（推荐使用 SSL）：**
```
postgresql://workbot_user:password@db.example.com:5432/workbot?sslmode=require
```

#### SSL 模式说明

| 模式 | 说明 |
|------|------|
| `disable` | 禁用 SSL（不推荐） |
| `allow` | 首尝试 SSL，失败则继续 |
| `prefer` | 首尝试 SSL，失败则继续（默认） |
| `require` | 必须使用 SSL |
| `verify-ca` | 必须使用 SSL 并验证 CA |
| `verify-full` | 必须使用 SSL 并完全验证（推荐） |

## 🛠️ 常见部署平台配置

### Vercel

1. 进入项目设置
2. 选择 Environment Variables
3. 添加以下变量：

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key
```

### Railway

1. 进入项目设置
2. 选择 Variables
3. 添加以下变量：

```bash
DATABASE_URL=${{RAILWAY_POSTGRES_URL}}
JWT_SECRET=your-secret-key
```

### Render

1. 进入项目设置
2. 选择 Environment
3. 添加以下变量：

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key
```

### Docker

```bash
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/database \
  -e JWT_SECRET=your-secret-key \
  workbot:latest
```

## 🔍 验证部署

### 检查健康状态

```bash
curl http://你的域名/api/health
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2026-02-08T12:00:00.000Z",
  "version": "2.0.0"
}
```

### 检查就绪状态

```bash
curl http://你的域名/api/health/ready
```

预期响应：
```json
{
  "status": "ready",
  "timestamp": "2026-02-08T12:00:00.000Z",
  "database": "connected"
}
```

## 🐛 故障排查

### 问题 1: 环境变量配置错误

**错误信息：**
```
❌ 环境变量配置错误:
  - DATABASE_URL: Required
  - JWT_SECRET: Required
```

**解决方案：**

1. 检查部署平台的环境变量配置
2. 确保已添加 `DATABASE_URL` 和 `JWT_SECRET`
3. 重新部署应用

### 问题 2: 数据库连接失败

**可能的原因：**

1. 数据库 URL 格式错误
2. 数据库地址无法访问
3. 用户名或密码错误
4. 数据库不存在
5. 防火墙阻止连接

**解决方案：**

1. 验证 DATABASE_URL 格式
2. 确保数据库可从部署环境访问
3. 检查数据库用户权限
4. 确认数据库已创建
5. 检查防火墙规则

### 问题 3: JWT_SECRET 太短

**错误信息：**
```
❌ 环境变量配置错误:
  - JWT_SECRET: 至少 32 个字符
```

**解决方案：**

生成至少 32 个字符的随机字符串：

```bash
openssl rand -base64 32
```

### 问题 4: 服务启动超时

**错误信息：**
```
❌ 服务启动超时
```

**可能的原因：**

1. 数据库连接失败
2. 环境变量未正确配置
3. 端口被占用

**解决方案：**

1. 检查数据库连接
2. 验证环境变量配置
3. 检查端口 5000 是否可用

## 🔐 安全建议

1. **使用强密码**：数据库密码和 JWT_SECRET 应该使用强密码
2. **启用 SSL**：生产环境数据库连接应该使用 SSL
3. **定期更换密钥**：定期更换 JWT_SECRET 和数据库密码
4. **最小权限原则**：数据库用户只应授予必要的权限
5. **不要提交敏感信息**：不要将 .env 文件提交到版本控制系统
6. **使用环境变量**：所有敏感信息都应通过环境变量配置
7. **定期更新依赖**：定期更新依赖包以修复安全漏洞
8. **监控日志**：监控应用日志，及时发现异常

## 📚 相关文档

- [环境变量详细说明](./ENVIRONMENT_VARIABLES.md)
- [数据库配置指南](./DATABASE_SETUP.md)
- [安全最佳实践](./SECURITY.md)

## 💡 提示

- 首次部署后，访问 `/init` 页面创建管理员账户
- 确保数据库在部署前已创建
- 生产环境建议使用强密码和 SSL 连接
- 定期备份数据库
- 监控应用性能和日志
