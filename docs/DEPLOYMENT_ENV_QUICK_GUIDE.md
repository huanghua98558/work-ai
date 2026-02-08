# 部署环境变量配置快速指南

## 🚨 当前问题

部署失败，错误信息：
```
❌ 环境变量配置错误：
  - DATABASE_URL: Required
```

## ✅ 解决方案

### 步骤 1: 在部署平台配置环境变量

登录到您的部署平台（Coze FaaS），进入环境变量配置页面。

### 步骤 2: 添加必需的环境变量

#### 方式 1: 使用平台提供的数据库集成（推荐）

如果部署平台提供数据库集成服务：

1. **创建数据库实例**
   - 选择 PostgreSQL 数据库
   - 记录数据库连接信息

2. **配置环境变量**
   - 部署平台通常会自动设置一个环境变量，名称可能是：
     - `DATABASE_URL` (标准)
     - `POSTGRES_URL` (常见)
     - `POSTGRESQL_URL` (常见)
     - `DB_URL` (常见)
   
   - 如果平台自动设置了环境变量，**无需手动配置**

   - 如果没有自动设置，请手动添加：
     ```
     DATABASE_URL=postgresql://用户名:密码@主机:5432/数据库名
     ```

#### 方式 2: 使用外部数据库

如果您有自己的 PostgreSQL 数据库：

1. **获取数据库连接信息**
   - 主机地址（例如：db.example.com）
   - 端口（默认：5432）
   - 数据库名（例如：workbot）
   - 用户名
   - 密码

2. **配置环境变量**
   
   在部署平台添加以下环境变量：
   
   ```bash
   DATABASE_URL=postgresql://用户名:密码@主机:5432/数据库名
   ```
   
   **示例**：
   ```bash
   DATABASE_URL=postgresql://workbot_user:SecurePass123@db.example.com:5432/workbot
   ```

#### 方式 3: 配置 JWT_SECRET

添加第二个必需的环境变量：

```bash
JWT_SECRET=your-secret-key-at-least-32-characters-long
```

**生成强随机密钥的方法**：
```bash
# 方法 1: 使用 OpenSSL
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3: 使用 Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 步骤 3: 重新部署

配置完环境变量后，重新触发部署。

### 步骤 4: 验证部署

查看部署日志，确认以下信息：

```
✅ 环境变量检查通过
   DATABASE_URL: postgresql://user:pass@host:5432/db...
   JWT_SECRET: workbot-de...
正在启动服务...
服务进程 ID: xxxxx
✅ 服务启动成功！
```

## 📋 环境变量清单

### 必需环境变量（2个）

| 变量名 | 说明 | 示例值 | 生成方法 |
|--------|------|--------|----------|
| `DATABASE_URL` | 数据库连接 URL | `postgresql://user:pass@host:5432/db` | 从数据库平台获取 |
| `JWT_SECRET` | JWT 密钥 | `a1b2c3d4...` | 使用 OpenSSL 生成 |

### 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务端口 | `5000` |
| `POSTGRES_URL` | 数据库 URL 别名 | - |
| `POSTGRESQL_URL` | 数据库 URL 别名 | - |
| `DB_URL` | 数据库 URL 别名 | - |

## 🔍 故障排查

### 问题 1: 仍然提示 DATABASE_URL 缺失

**检查清单**:
- [ ] 确认已添加环境变量
- [ ] 确认变量名拼写正确（大小写敏感）
- [ ] 确认变量值不为空
- [ ] 确认已保存环境变量配置
- [ ] 确认已重新部署

**替代方案**:
如果平台使用不同的变量名，尝试添加：
- `POSTGRES_URL`
- `POSTGRESQL_URL`
- `DB_URL`

### 问题 2: 数据库连接失败

**错误信息**:
```
Error: connect ECONNREFUSED
Error: password authentication failed
```

**解决方案**:
1. 验证数据库连接字符串格式
2. 确认数据库允许从部署服务器连接
3. 检查防火墙规则
4. 确认用户名和密码正确

### 问题 3: JWT_SECRET 警告

**警告信息**:
```
⚠️  警告: 使用默认 JWT_SECRET（仅用于开发/测试）
   建议在生产环境中设置强随机密钥
```

**解决方案**:
添加 `JWT_SECRET` 环境变量，使用生成的强随机密钥。

## 📝 快速配置示例

### Coze FaaS 平台

1. 进入"部署配置" → "环境变量"
2. 添加以下环境变量：

```bash
# 如果使用平台数据库集成
DATABASE_URL={{平台自动提供的数据库连接URL}}

# JWT 密钥
JWT_SECRET={{使用 OpenSSL 生成的随机密钥}}
```

### 阿里云 / 腾讯云

1. 进入"应用配置" → "环境变量"
2. 添加以下环境变量：

```bash
DATABASE_URL=postgresql://username:password@rds.example.com:5432/workbot
JWT_SECRET={{使用 OpenSSL 生成的随机密钥}}
NODE_ENV=production
PORT=5000
```

## 📞 获取帮助

如果仍然遇到问题：

1. 查看详细部署指南：`docs/DEPLOYMENT_GUIDE.md`
2. 查看部署修复总结：`docs/DEPLOYMENT_FIX.md`
3. 使用部署检查清单：`docs/DEPLOYMENT_CHECKLIST.md`
4. 联系技术支持

## ✅ 配置完成后

1. 重新触发部署
2. 查看部署日志
3. 确认服务启动成功
4. 访问应用验证功能
