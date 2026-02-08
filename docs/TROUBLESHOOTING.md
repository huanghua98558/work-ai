# 部署故障排查指南

## 常见问题

### ❌ 问题：环境变量配置错误

#### 错误信息
```
❌ 环境变量配置错误:
  - DATABASE_URL: Required
  - JWT_SECRET: Required
```

#### 原因分析
部署平台未配置必需的环境变量。

#### 解决方案

**步骤 1：检查部署平台的环境变量配置**

1. 登录到部署平台
2. 找到项目设置 → 环境变量
3. 查看是否已配置以下环境变量：
   - `DATABASE_URL`
   - `JWT_SECRET`

**步骤 2：添加缺失的环境变量**

```bash
DATABASE_URL=postgresql://用户名:密码@数据库地址:5432/数据库名
JWT_SECRET=至少32个字符的随机字符串
```

**步骤 3：生成 JWT_SECRET**

```bash
# 方法 1: 使用 OpenSSL
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**步骤 4：重新部署**

添加环境变量后，重新部署应用。

---

### ❌ 问题：数据库连接失败

#### 错误信息
```
Error: connect ECONNREFUSED
```
或
```
Error: connection terminated
```

#### 可能原因

1. **数据库 URL 格式错误**
2. **数据库地址无法访问**
3. **用户名或密码错误**
4. **数据库不存在**
5. **防火墙阻止连接**
6. **SSL 连接问题**

#### 解决方案

**检查 1：验证数据库 URL 格式**

正确的格式：
```
postgresql://用户名:密码@主机:端口/数据库名
```

示例：
```
postgresql://workbot_user:secure_password@db.example.com:5432/workbot
```

**检查 2：测试数据库连接**

在本地测试数据库连接：

```bash
psql "postgresql://用户名:密码@主机:端口/数据库名"
```

或使用 Node.js：

```bash
node -e "
const pg = require('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  console.log('✅ 数据库连接成功');
  client.end();
}).catch(err => {
  console.error('❌ 数据库连接失败:', err.message);
});
"
```

**检查 3：确认数据库已创建**

```sql
SELECT datname FROM pg_database WHERE datname = 'workbot';
```

**检查 4：检查用户权限**

```sql
\l workbot
```

确保用户有以下权限：
- CONNECT
- TEMPORARY
- CREATE
- ALL ON SCHEMA public

**检查 5：防火墙和网络**

- 确保部署环境可以访问数据库
- 检查数据库防火墙规则
- 如果使用云数据库，确认已允许部署环境的 IP 地址

**检查 6：SSL 连接问题**

如果遇到 SSL 错误，尝试添加 SSL 参数：

```
postgresql://user:password@host:5432/database?sslmode=require
```

---

### ❌ 问题：JWT_SECRET 太短

#### 错误信息
```
❌ 环境变量配置错误:
  - JWT_SECRET: 至少 32 个字符
```

#### 解决方案

生成至少 32 个字符的随机字符串：

```bash
# 方法 1: 使用 OpenSSL
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3: 使用 Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

将生成的密钥设置为 `JWT_SECRET` 环境变量。

---

### ❌ 问题：服务启动超时

#### 错误信息
```
❌ 服务启动超时
```

#### 可能原因

1. 数据库连接失败
2. 环境变量未正确配置
3. 端口被占用
4. 数据库表未创建

#### 解决方案

**检查 1：查看启动日志**

找到详细的错误信息：
- 部署平台日志
- 应用日志
- 错误堆栈

**检查 2：验证数据库连接**

```bash
curl http://你的域名/api/health
```

**检查 3：检查端口占用**

确保 5000 端口未被占用：

```bash
ss -lptn 'sport = :5000'
```

**检查 4：创建数据库表**

访问以下 URL 创建必需的数据库表：

```
http://你的域名/api/db/create-tables
```

---

### ❌ 问题：构建失败

#### 错误信息
```
Failed to compile
```

#### 可能原因

1. TypeScript 类型错误
2. ESLint 错误
3. 依赖版本冲突
4. 内存不足

#### 解决方案

**检查 1：查看详细的错误信息**

构建日志会显示具体的错误位置和原因。

**检查 2：本地构建测试**

在本地执行构建以重现问题：

```bash
pnpm build
```

**检查 3：检查依赖版本**

```bash
pnpm outdated
```

更新过时的依赖：

```bash
pnpm update
```

**检查 4：增加 Node.js 内存**

如果遇到内存不足错误：

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

---

### ❌ 问题：404 错误

#### 错误信息
```
404 Not Found
```

#### 可能原因

1. 路由不存在
2. 文件未正确部署
3. 静态资源路径错误

#### 解决方案

**检查 1：确认路由正确**

查看项目中的路由配置：

```bash
find src/app -name "page.tsx" -o -name "route.ts"
```

**检查 2：检查构建输出**

确认 `.next` 目录已正确构建：

```bash
ls -la .next
```

**检查 3：验证部署文件**

确认所有必要的文件都已部署。

---

### ❌ 问题：CORS 错误

#### 错误信息
```
Access to fetch at 'xxx' has been blocked by CORS policy
```

#### 解决方案

配置 CORS_ORIGIN 环境变量：

```bash
CORS_ORIGIN=https://your-domain.com
```

或允许所有来源（不推荐生产环境使用）：

```bash
CORS_ORIGIN=*
```

---

## 诊断工具

### 环境变量检查

```bash
bash scripts/check-env.sh
```

### 健康检查

```bash
curl http://你的域名/api/health
```

### 就绪检查

```bash
curl http://你的域名/api/health/ready
```

### 数据库检查

```bash
curl http://你的域名/api/db/check
```

---

## 日志查看

### 开发环境

```bash
# 启动服务
pnpm dev

# 查看日志
tail -f /app/work/logs/bypass/app.log
```

### 生产环境

在部署平台查看：
- 应用日志
- 错误日志
- 访问日志

---

## 获取帮助

如果以上解决方案都无法解决您的问题：

1. **查看文档**
   - [部署指南](./DEPLOYMENT_GUIDE.md)
   - [环境变量说明](./ENVIRONMENT_VARIABLES.md)

2. **检查日志**
   - 查看详细的错误日志
   - 查看堆栈跟踪

3. **提交 Issue**
   - 提供详细的错误信息
   - 提供环境配置信息
   - 提供日志片段

4. **联系支持**
   - 联系部署平台支持
   - 联系数据库提供商
