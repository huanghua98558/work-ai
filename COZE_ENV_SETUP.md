# Coze 平台环境变量配置指南

## 问题诊断

部署时出现以下错误：

```
❌ 环境变量配置错误:
  - DATABASE_URL: Required
  请检查 .env 文件或环境变量配置
```

**原因**：Coze 平台的运行环境中没有配置必需的环境变量。

## 解决方案

需要在 Coze 平台上配置以下必需的环境变量：

### 必需的环境变量

| 变量名 | 说明 | 示例值 | 如何获取 |
|--------|------|--------|----------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://user:password@host:5432/database` | 从数据库平台获取 |
| `JWT_SECRET` | JWT 密钥（至少 32 个字符） | `your-super-secret-jwt-key-at-least-32-chars` | 使用 OpenSSL 生成 |

---

## 方案一：使用 Coze 平台的数据库集成（推荐）

如果 Coze 平台提供了 PostgreSQL 数据库集成，可以按以下步骤配置：

### 1. 在 Coze 平台创建 PostgreSQL 数据库

- 进入 Coze 平台的项目设置
- 找到"数据库"或"Database"选项
- 创建一个 PostgreSQL 数据库实例
- 记录数据库连接信息（主机、端口、用户名、密码、数据库名）

### 2. 配置环境变量

在 Coze 平台的环境变量配置页面添加：

```bash
# 方式 A: 如果平台自动提供 DATABASE_URL
DATABASE_URL={{平台自动提供的数据库连接URL}}

# 方式 B: 如果需要手动配置
DATABASE_URL=postgresql://用户名:密码@数据库主机:5432/数据库名
```

### 3. 配置 JWT_SECRET

使用以下命令生成一个安全的随机密钥：

```bash
# 使用 OpenSSL 生成 64 字符的随机密钥
openssl rand -base64 64
```

然后在 Coze 平台添加环境变量：

```bash
JWT_SECRET={{生成的随机密钥}}
```

---

## 方案二：使用外部 PostgreSQL 数据库

如果你有自己的 PostgreSQL 数据库（如阿里云 RDS、腾讯云、AWS RDS 等）：

### 1. 获取数据库连接信息

- 数据库主机地址
- 端口（默认 5432）
- 数据库名称
- 用户名
- 密码

### 2. 配置环境变量

在 Coze 平台添加以下环境变量：

```bash
# PostgreSQL 连接字符串
DATABASE_URL=postgresql://用户名:密码@数据库主机:5432/数据库名

# JWT 密钥
JWT_SECRET={{使用 OpenSSL 生成的随机密钥}}
```

**示例**：

```bash
DATABASE_URL=postgresql://workbot_user:SecurePass123@pgm-bp123456.rds.aliyuncs.com:5432/workbot
JWT_SECRET=GF3i7ksJn3q9w8m7v6n5b4x3c2z1a0s9d8f7g6h5j4k3l2m1n0b9v8c7x6z5a4s3d2f1
NODE_ENV=production
```

### 3. 配置数据库白名单

确保数据库允许来自 Coze 平台的 IP 访问：

- 登录数据库管理控制台
- 找到"白名单"或"安全组"设置
- 添加 `0.0.0.0/0`（允许所有 IP 访问）或 Coze 平台的 IP 地址段

---

## 详细的配置步骤

### 步骤 1：生成 JWT_SECRET

在本地终端运行：

```bash
# 生成 64 字符的随机密钥
openssl rand -base64 64
```

输出示例：
```
R7gH9jK2mN5pQ8sT1vW4xY7zA0bC3dE6fG9hJ2kL5mN8pQ1sT4vW7xY0zA3bC6dE9
```

**重要**：
- 复制这个密钥，不要泄露给任何人
- 这个密钥将用于签名 JWT 令牌，用于用户认证

### 步骤 2：配置环境变量

在 Coze 平台的部署配置页面：

1. 找到"环境变量"或"Environment Variables"选项
2. 点击"添加变量"或"Add Variable"
3. 添加以下变量：

#### 变量 1: DATABASE_URL

```
名称: DATABASE_URL
值: postgresql://用户名:密码@数据库主机:5432/数据库名
```

**如果使用 Coze 平台的数据库集成**：
- 查看平台是否自动提供 `DATABASE_URL` 环境变量
- 如果提供了，直接使用即可
- 如果没有提供，按照平台文档手动配置

#### 变量 2: JWT_SECRET

```
名称: JWT_SECRET
值: {{步骤 1 生成的随机密钥}}
```

#### 变量 3: NODE_ENV（可选，但推荐）

```
名称: NODE_ENV
值: production
```

### 步骤 3：保存并重新部署

1. 保存环境变量配置
2. 触发新的部署
3. 等待部署完成

---

## 验证配置

部署成功后，可以通过以下方式验证：

### 方式 1：访问健康检查接口

```bash
curl https://你的应用域名/api/health
```

如果配置正确，应该返回：

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-02-09T21:36:00Z"
}
```

### 方式 2：访问诊断页面

```
https://你的应用域名/diagnose
```

检查环境变量部分，确保：
- ✅ DATABASE_URL 已设置
- ✅ JWT_SECRET 已设置

---

## 常见问题

### Q1: 如何找到 Coze 平台的数据库连接信息？

**A**:
1. 登录 Coze 平台
2. 进入你的项目
3. 找到"数据库"或"Database"选项卡
4. 查看数据库实例的连接信息
5. 记录以下信息：
   - 主机地址（Host）
   - 端口（Port，默认 5432）
   - 数据库名称（Database Name）
   - 用户名（Username）
   - 密码（Password）

### Q2: 部署平台可能使用不同的环境变量名称？

**A**: 是的。某些平台可能使用以下名称之一：
- `DATABASE_URL`（最常见，推荐）
- `POSTGRES_URL`
- `POSTGRESQL_URL`
- `PGDATABASE_URL`

**当前代码支持的环境变量优先级**：
1. `DATABASE_URL`（优先）
2. `PGDATABASE_URL`（备用）

### Q3: 如何生成安全的 JWT_SECRET？

**A**: 推荐使用 OpenSSL 生成：

```bash
# 生成 64 字符的随机密钥（推荐）
openssl rand -base64 64

# 生成 32 字符的随机密钥（最低要求）
openssl rand -base64 32
```

**注意事项**：
- 密钥长度必须至少 32 个字符
- 不要使用简单的密码，如 `secret123`
- 不要在生产环境使用开发环境的密钥
- 定期更换密钥（建议每 6 个月）

### Q4: 数据库连接失败怎么办？

**A**: 检查以下几点：

1. **连接字符串格式**：
   ```bash
   # 正确格式
   DATABASE_URL=postgresql://用户名:密码@主机:端口/数据库名

   # 错误示例
   DATABASE_URL=postgres://user:pass@host/db  # 缺少端口
   DATABASE_URL=user:pass@host:5432/db        # 缺少协议前缀
   ```

2. **数据库白名单**：
   - 确保数据库允许来自 Coze 平台的 IP 访问
   - 测试时可以临时设置为 `0.0.0.0/0`

3. **数据库权限**：
   - 确保数据库用户有读写权限
   - 测试时可以临时使用 superuser 账户

### Q5: 为什么会出现 `EROFS: read-only file system` 错误？

**A**: 这是之前的问题，已经修复。原因是在运行时尝试安装依赖，但 Coze 的运行环境是只读的。

**解决方案**：
- 依赖在构建阶段安装（build 脚本中包含 `pnpm install`）
- 运行时直接使用已安装的依赖（start 脚本中不包含 `pnpm install`）

---

## 快速配置模板

### 使用 Coze 平台数据库

```bash
# 如果平台自动提供 DATABASE_URL
DATABASE_URL={{平台自动提供的数据库连接URL}}
JWT_SECRET={{使用 openssl rand -base64 64 生成的密钥}}
NODE_ENV=production
```

### 使用阿里云 RDS

```bash
DATABASE_URL=postgresql://workbot_user:YourSecurePassword123@pgm-bp123456.rds.aliyuncs.com:5432/workbot
JWT_SECRET={{使用 openssl rand -base64 64 生成的密钥}}
NODE_ENV=production
```

### 使用 Railway

```bash
# Railway 会自动添加 DATABASE_URL
# 只需手动添加 JWT_SECRET
JWT_SECRET={{使用 openssl rand -base64 64 生成的密钥}}
NODE_ENV=production
```

---

## 联系支持

如果按照上述步骤配置后仍然遇到问题：

1. 检查部署日志，查看具体错误信息
2. 确认环境变量名称拼写正确（区分大小写）
3. 确认数据库可以从 Coze 平台访问
4. 尝试在诊断页面查看详细的环境变量状态

---

## 相关文档

- [README.md](./README.md) - 项目主文档
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - 部署指南
- [docs/ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md) - 环境变量详细说明
