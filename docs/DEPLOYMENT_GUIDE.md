# WorkBot 部署指南

## 📋 概述

WorkBot 是一个多平台智能机器人管理系统，支持企业微信、微信公众号、微信小程序等平台。本指南将帮助您完成应用的部署。

## 🔧 部署前准备

### 1. 环境要求

- **Node.js**: 24.x 或更高版本
- **数据库**: PostgreSQL 18 或更高版本
- **包管理器**: pnpm (必需)
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 10GB 可用空间

### 2. 数据库准备

确保您有一个可用的 PostgreSQL 数据库：

```sql
-- 创建数据库
CREATE DATABASE workbot;

-- 创建用户（可选）
CREATE USER workbot_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE workbot TO workbot_user;
```

### 3. 获取数据库连接信息

记录以下信息用于配置环境变量：

- **主机地址**: 例如 `localhost` 或云数据库地址
- **端口**: 默认 `5432`
- **数据库名**: 例如 `workbot`
- **用户名**: 数据库用户名
- **密码**: 数据库密码

数据库连接字符串格式：
```
postgresql://username:password@hostname:5432/database_name
```

## ⚙️ 环境变量配置

### 必需环境变量

WorkBot 需要以下两个必需的环境变量：

#### 1. DATABASE_URL

数据库连接 URL，用于连接 PostgreSQL 数据库。

**格式**:
```
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
```

**示例**:
```
DATABASE_URL=postgresql://workbot_user:secure_password@db.example.com:5432/workbot
```

**支持的别名**:
如果部署平台使用不同的环境变量名称，启动脚本会自动检测：
- `POSTGRES_URL`
- `POSTGRESQL_URL`
- `DB_URL`

#### 2. JWT_SECRET

用于生成和验证 JWT token 的密钥。

**要求**:
- 至少 32 个字符
- 使用强随机字符串
- 不要在代码中硬编码

**生成方法**:
```bash
# 使用 OpenSSL 生成随机密钥
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**示例**:
```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1
```

### 可选环境变量

其他可选的环境变量请参考 `deploy.env.example` 文件。

## 🚀 部署步骤

### 步骤 1: 在部署平台配置环境变量

登录到您的部署平台（如 Coze FaaS、阿里云、腾讯云等），在环境变量配置中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | 数据库连接字符串 |
| `JWT_SECRET` | `your-32-char-random-secret` | JWT 密钥 |

### 步骤 2: 配置数据库集成（如果使用）

如果部署平台提供数据库集成服务：

1. 创建数据库实例
2. 获取连接信息
3. 配置环境变量 `DATABASE_URL`

**注意**: 某些平台会自动设置数据库连接 URL，环境变量名称可能是 `POSTGRES_URL` 或其他名称。请参考平台文档。

### 步骤 3: 提交代码并触发部署

将代码推送到 Git 仓库，触发自动部署。

### 步骤 4: 监控部署日志

查看部署日志，确认以下步骤：

```
✅ 代码打包成功
✅ 依赖安装成功
✅ Next.js 构建成功
✅ 环境变量检查通过
✅ 服务启动成功
✅ 健康检查通过
```

### 步骤 5: 验证部署

访问应用并验证功能：

- **主页**: `https://your-domain.com/`
- **健康检查**: `https://your-domain.com/api/health`
- **就绪检查**: `https://your-domain.com/api/health/ready`

## 🔍 故障排查

### 问题 1: 环境变量配置错误

**错误信息**:
```
❌ 环境变量配置错误：
  - DATABASE_URL: Required
```

**解决方案**:
1. 检查部署平台的环境变量配置
2. 确保 `DATABASE_URL` 或其别名已正确设置
3. 确保连接字符串格式正确

### 问题 2: 数据库连接失败

**错误信息**:
```
Error: connect ECONNREFUSED
Error: password authentication failed
```

**解决方案**:
1. 检查数据库主机地址和端口
2. 验证用户名和密码
3. 确保数据库允许从部署服务器连接
4. 检查防火墙规则

### 问题 3: 启动超时

**错误信息**:
```
❌ 服务启动超时
```

**解决方案**:
1. 检查日志文件：`/app/work/logs/bypass/app.log`
2. 确认数据库连接正常
3. 检查端口 5000 是否被占用
4. 增加启动超时时间（修改 `scripts/start.sh`）

### 问题 4: 内存不足

**错误信息**:
```
JavaScript heap out of memory
```

**解决方案**:
1. 增加 Node.js 内存限制（已默认设置为 2048MB）
2. 优化数据库连接池配置
3. 减少 WebSocket 最大连接数

## 🔄 部署后配置

### 1. 初始化管理员账户

首次部署后，需要创建管理员账户：

```bash
curl -X POST https://your-domain.com/api/init/admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_secure_password",
    "email": "admin@example.com"
  }'
```

### 2. 配置企业微信/微信公众号

登录管理后台，配置机器人信息：

1. 访问 `https://your-domain.com/robots`
2. 点击"创建机器人"
3. 填写企业微信/微信公众号配置信息

### 3. 配置知识库

上传文档到知识库：

1. 访问 `https://your-domain.com/knowledge`
2. 点击"上传文档"
3. 选择文档并上传

## 📊 监控和维护

### 1. 健康检查

定期检查服务健康状态：

```bash
# 检查服务是否运行
curl https://your-domain.com/api/health

# 检查服务是否就绪
curl https://your-domain.com/api/health/ready
```

### 2. 查看日志

查看应用日志：

- **应用日志**: `/app/work/logs/bypass/app.log`
- **开发日志**: `/app/work/logs/bypass/dev.log`
- **控制台日志**: `/app/work/logs/bypass/console.log`

### 3. 数据库维护

定期执行数据库维护：

```sql
-- 清理过期激活码
DELETE FROM activation_codes WHERE expires_at < NOW();

-- 清理旧日志（保留最近30天）
DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';

-- 优化表
VACUUM ANALYZE robots, users, activation_codes;
```

### 4. 备份

定期备份数据库：

```bash
# 使用 pg_dump 备份
pg_dump -h hostname -U username -d database_name > backup.sql

# 或使用云数据库的备份功能
```

## 🔐 安全建议

1. **使用强密码**: 所有密码至少 16 个字符
2. **定期更换密钥**: 每 3-6 个月更换 JWT_SECRET
3. **启用 HTTPS**: 确保所有通信都使用 HTTPS
4. **限制访问**: 使用防火墙限制数据库访问
5. **定期更新**: 及时更新依赖包和安全补丁

## 📞 技术支持

如遇到问题，请：

1. 查看本文档的故障排查部分
2. 检查日志文件
3. 运行诊断脚本：`bash scripts/diagnose.sh`
4. 联系技术支持

## 📚 相关文档

- [服务稳定性优化方案](./SERVICE_STABILITY.md)
- [开发模式修复总结](./DEV_MODE_FIX.md)
- [故障排查指南](./TROUBLESHOOTING.md)
- [API 路由修复](./API_ROUTE_FIX.md)
