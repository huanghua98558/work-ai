# 环境变量配置说明

## 必需的环境变量

### DATABASE_URL
**必需**：是
**描述**：PostgreSQL 数据库连接字符串
**格式**：`postgresql://用户名:密码@主机:端口/数据库名`
**示例**：
```bash
DATABASE_URL=postgresql://workbot_user:secure_password@db.example.com:5432/workbot
```

**配置说明**：
- 确保数据库已创建
- 确保用户有足够的权限
- 确保主机地址可以从部署环境访问

**注意事项**：
- 密码中包含特殊字符时需要进行 URL 编码
- 生产环境建议使用 SSL 连接：`?sslmode=require`

---

### JWT_SECRET
**必需**：是
**描述**：JWT 令牌签名密钥
**要求**：至少 32 个字符的随机字符串
**生成方法**：

```bash
# 方法 1: 使用 OpenSSL
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3: 使用 Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**示例**：
```bash
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**安全注意事项**：
- 使用强随机字符串
- 不要在代码中硬编码
- 不要在公共仓库中提交
- 定期轮换密钥

---

## 可选的环境变量

### CORS_ORIGIN
**必需**：否
**默认值**：`*`
**描述**：允许跨域请求的来源
**示例**：

允许单个域名：
```bash
CORS_ORIGIN=https://your-domain.com
```

允许多个域名（逗号分隔）：
```bash
CORS_ORIGIN=https://your-domain.com,https://app.your-domain.com
```

允许所有来源（不推荐生产环境使用）：
```bash
CORS_ORIGIN=*
```

---

### NODE_ENV
**必需**：否
**默认值**：`development`
**描述**：Node.js 运行环境
**可选值**：
- `development` - 开发环境
- `production` - 生产环境
- `test` - 测试环境

**示例**：
```bash
NODE_ENV=production
```

---

### PORT
**必需**：否
**默认值**：`5000`
**描述**：应用监听的端口号
**示例**：
```bash
PORT=5000
```

**注意事项**：
- 部署平台可能通过环境变量自动设置端口
- 修改端口可能需要更新防火墙规则

---

## 数据库连接参数

### SSL 模式

在 DATABASE_URL 中可以添加 SSL 参数：

```bash
# 禁用 SSL（不推荐）
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=disable

# 优先 SSL（推荐）
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require

# 允许 SSL 但不要求
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=prefer
```

### 连接池参数

Drizzle ORM 会自动管理连接池，但可以通过环境变量配置：

```bash
# 最大连接数
PG_MAX_CLIENTS=10

# 连接超时（毫秒）
PG_TIMEOUT=10000

# 空闲超时（毫秒）
PG_IDLE_TIMEOUT=10000
```

---

## 如何配置环境变量

### Vercel

1. 进入项目设置
2. 选择 "Environment Variables"
3. 添加环境变量：
   - Name: `DATABASE_URL`
   - Value: 你的数据库连接字符串
   - 选择环境（Production/Preview/Development）

### Railway

1. 进入项目设置
2. 选择 "Variables"
3. 添加环境变量：
   - Key: `DATABASE_URL`
   - Value: 你的数据库连接字符串

### Render

1. 进入项目设置
2. 选择 "Environment"
3. 添加环境变量：
   - Key: `DATABASE_URL`
   - Value: 你的数据库连接字符串

### Docker

使用 `.env` 文件：

```bash
# 创建 .env 文件
cat > .env << EOF
DATABASE_URL=postgresql://workbot_user:password@db:5432/workbot
JWT_SECRET=your-jwt-secret-here
NODE_ENV=production
PORT=5000
EOF

# 运行容器
docker run --env-file .env your-image
```

或使用 `-e` 参数：

```bash
docker run \
  -e DATABASE_URL="postgresql://workbot_user:password@db:5432/workbot" \
  -e JWT_SECRET="your-jwt-secret-here" \
  your-image
```

### 传统服务器

使用 systemd 服务：

```ini
[Service]
Environment="DATABASE_URL=postgresql://workbot_user:password@db:5432/workbot"
Environment="JWT_SECRET=your-jwt-secret-here"
Environment="NODE_ENV=production"
```

或使用环境文件：

```ini
[Service]
EnvironmentFile=/etc/workbot/.env
```

---

## 安全最佳实践

### 1. 永远不要提交敏感信息

将 `.env` 文件添加到 `.gitignore`：

```gitignore
.env
.env.local
.env.*.local
```

### 2. 使用强随机密钥

```bash
# 生成强随机 JWT_SECRET
openssl rand -base64 32
```

### 3. 定期轮换密钥

- 每 90 天轮换一次 JWT_SECRET
- 轮换后需要所有用户重新登录
- 提前通知用户

### 4. 限制访问权限

- 只授权必要的权限
- 使用只读用户执行只读操作
- 定期审查权限

### 5. 使用连接池

- 避免创建过多连接
- 设置合理的连接超时
- 监控连接使用情况

### 6. 启用 SSL

- 生产环境必须使用 SSL
- 使用 `sslmode=require` 强制 SSL 连接
- 定期更新 SSL 证书

---

## 环境变量验证

部署前，可以使用以下脚本验证环境变量：

```bash
bash scripts/check-env.sh
```

该脚本会检查：
- 必需的环境变量是否存在
- JWT_SECRET 是否足够长
- DATABASE_URL 格式是否正确

---

## 常见问题

### Q: 如何生成安全的 JWT_SECRET？

A: 使用以下命令生成：

```bash
openssl rand -base64 32
```

### Q: DATABASE_URL 格式错误怎么办？

A: 检查以下内容：
- 使用 `postgresql://` 前缀
- 包含用户名和密码
- 主机地址正确
- 端口号正确（默认 5432）
- 数据库名存在

### Q: 如何测试环境变量是否正确？

A: 使用检查脚本：

```bash
bash scripts/check-env.sh
```

### Q: 如何在多个环境中使用不同的配置？

A: 使用环境特定的配置文件：

```bash
# 开发环境
.env.development

# 生产环境
.env.production

# 测试环境
.env.test
```

或使用部署平台的环境变量管理功能。
