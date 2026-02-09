# Coze 平台环境变量配置指南

## 概述

本文档详细说明在 Coze 平台部署 WorkBot 时需要配置的环境变量。

## 部署失败原因

当前部署失败是因为缺少必需的环境变量：

```
❌ 环境变量配置错误:
  - DATABASE_URL: Required
  - JWT_SECRET: Required
```

## 必需的环境变量

### 1. DATABASE_URL

**用途**：PostgreSQL 数据库连接字符串

**格式**：
```
postgresql://用户名:密码@主机:端口/数据库名
```

**示例**：
```
postgresql://workbot_user:secure_password@postgres.example.com:5432/workbot
```

**组成部分**：
- `postgresql://` - 协议
- `workbot_user` - 数据库用户名
- `secure_password` - 数据库密码
- `postgres.example.com` - 数据库主机地址
- `5432` - 数据库端口（PostgreSQL 默认端口）
- `workbot` - 数据库名称

### 2. JWT_SECRET

**用途**：用于生成和验证 JWT 令牌的密钥

**格式**：任意随机字符串（至少 32 个字符）

**生成方法**：

#### 方法 1：使用 Node.js 生成
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 方法 2：使用 OpenSSL 生成
```bash
openssl rand -hex 32
```

#### 方法 3：使用 Python 生成
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**示例输出**：
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

**安全要求**：
- ✅ 必须至少 32 个字符
- ✅ 使用强随机数生成
- ✅ 不要使用可预测的字符串
- ✅ 不要在代码中硬编码
- ✅ 不要在公共仓库中提交

## 可选的环境变量

### 3. NEXT_PUBLIC_API_URL

**用途**：前端 API 基础 URL

**默认值**：自动从当前域名获取

**示例**：
```
https://workbot.example.com
```

### 4. NODE_ENV

**用途**：运行环境

**默认值**：`production`

**可选值**：
- `development` - 开发环境
- `production` - 生产环境

### 5. NEXT_PUBLIC_APP_NAME

**用途**：应用名称（显示在网页标题中）

**默认值**：`WorkBot`

**示例**：
```
企业微信机器人管理系统
```

### 6. NEXT_PUBLIC_APP_DESCRIPTION

**用途**：应用描述（用于 SEO）

**默认值**：`WorkBot - 企业微信机器人管理系统`

### 7. NEXT_PUBLIC_APP_VERSION

**用途**：应用版本号

**默认值**：从 `package.json` 读取

**示例**：
```
2.0.0
```

## 在 Coze 平台配置环境变量

### 步骤 1：获取 PostgreSQL 连接信息

如果使用 Coze 平台提供的 PostgreSQL 数据库服务：

1. 在 Coze 平台进入"数据库"页面
2. 找到或创建 PostgreSQL 数据库实例
3. 查看连接信息（用户名、密码、主机、端口、数据库名）
4. 组合成连接字符串

**注意**：如果使用外部数据库，请确保数据库服务器允许从 Coze 平台 IP 访问。

### 步骤 2：生成 JWT_SECRET

使用上面提供的方法之一生成一个安全的 JWT_SECRET。

**建议**：
- 保存在安全的地方（密码管理器）
- 生成后立即配置到平台
- 不要丢失（否则所有现有 Token 将失效）

### 步骤 3：在 Coze 平台配置环境变量

1. 进入 Coze 平台项目设置
2. 找到"环境变量"或"Secrets"配置页面
3. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | 必需 |
| `JWT_SECRET` | 32+ 字符随机字符串 | 必需 |
| `NODE_ENV` | `production` | 可选，默认生产环境 |

4. 保存配置

### 步骤 4：重新触发部署

配置完成后：
1. 返回部署页面
2. 点击"重新部署"或"触发部署"
3. 等待部署完成

## 验证配置

### 方法 1：查看部署日志

部署成功后，日志中应该看到：

```
✓ Database connection successful
✓ Environment variables validated
✓ Server started on port 5000
```

### 方法 2：访问健康检查端点

部署成功后，访问：

```
https://your-domain.com/api/health
```

应该返回：

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-02-09T14:00:00.000Z"
}
```

### 方法 3：查看系统检查端点

访问：

```
https://your-domain.com/api/system/check
```

应该返回完整的系统状态信息。

## 常见问题

### Q1: 部署后仍然提示 DATABASE_URL 缺失

**原因**：环境变量配置后未重新部署

**解决**：
- 确认环境变量已保存
- 等待几秒钟（平台可能需要时间同步）
- 重新触发部署

### Q2: 数据库连接失败

**原因**：可能是以下原因之一：
- 数据库连接字符串格式错误
- 数据库服务器不可访问
- 数据库用户名或密码错误
- 数据库不存在

**解决**：
- 验证连接字符串格式
- 检查数据库服务器是否运行
- 确认数据库用户权限
- 测试数据库连接：
  ```bash
  psql "postgresql://用户名:密码@主机:端口/数据库名"
  ```

### Q3: JWT_SECRET 格式错误

**原因**：JWT_SECRET 长度不足或包含特殊字符

**解决**：
- 确保至少 32 个字符
- 建议使用十六进制字符串（仅包含 0-9 和 a-f）
- 重新生成并配置

### Q4: 配置后应用启动但无法访问

**原因**：可能是端口配置或网络问题

**解决**：
- 确认应用监听 5000 端口
- 检查防火墙规则
- 查看部署日志中的错误信息

### Q5: 环境变量被重置

**原因**：某些平台在重新部署时可能不会保留环境变量

**解决**：
- 在项目的 CI/CD 配置中自动设置环境变量
- 使用平台的持久化环境变量功能
- 定期备份环境变量配置

## 安全建议

### 1. 密码和密钥管理

- ✅ 使用强密码（至少 16 个字符）
- ✅ 定期轮换 JWT_SECRET
- ✅ 不要在代码中硬编码敏感信息
- ✅ 不要在日志中输出环境变量

### 2. 数据库安全

- ✅ 使用独立的数据库用户
- ✅ 仅授予必要的权限
- ✅ 定期备份数据库
- ✅ 启用数据库 SSL 连接（如支持）

### 3. 环境变量存储

- ✅ 使用平台的加密存储功能
- ✅ 不要在公共仓库中提交 `.env` 文件
- ✅ 使用 `.gitignore` 排除敏感文件
- ✅ 定期审计环境变量访问权限

## 示例配置

### 开发环境（.env.example）

```env
# 数据库配置
DATABASE_URL=postgresql://workbot_user:dev_password@localhost:5432/workbot_dev

# JWT 密钥
JWT_SECRET=development_secret_only_for_local_testing

# 运行环境
NODE_ENV=development

# 应用配置
NEXT_PUBLIC_APP_NAME=WorkBot (开发环境)
NEXT_PUBLIC_APP_VERSION=2.0.0
```

### 生产环境（Coze 平台）

| 变量名 | 示例值 |
|--------|--------|
| `DATABASE_URL` | `postgresql://prod_user:strong_password_here@postgres.example.com:5432/workbot_prod` |
| `JWT_SECRET` | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0` |
| `NODE_ENV` | `production` |

## 快速检查清单

部署前请确认：

- [ ] `DATABASE_URL` 已配置
- [ ] `JWT_SECRET` 已配置（至少 32 字符）
- [ ] 数据库服务器可访问
- [ ] 数据库用户有足够权限
- [ ] 环境变量已保存
- [ ] 已触发重新部署

## 联系支持

如果按照上述步骤操作后仍然遇到问题：

1. 收集部署日志（特别是错误部分）
2. 记录当前环境变量配置（隐藏敏感信息）
3. 联系技术支持并提供以下信息：
   - 部署 ID
   - 错误日志
   - 环境变量配置状态（是否所有必需变量都已配置）

## 相关文档

- [部署指南](docs/DEPLOYMENT.md)
- [数据库迁移指南](docs/DATABASE_MIGRATION.md)
- [API 文档](docs/API.md)
- [故障排查指南](docs/TROUBLESHOOTING.md)

---

**最后更新**：2026-02-09
**适用版本**：WorkBot 2.0.0
