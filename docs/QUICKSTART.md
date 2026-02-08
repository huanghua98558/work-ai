# WorkBot 快速开始指南

## 前置要求

- 已安装 Node.js 24+
- 已安装 pnpm
- 已有 PostgreSQL 数据库（支持阿里云 RDS、Supabase、Railway 等）
- 已有部署平台账号（Vercel、Railway、Render 等）

---

## 5 分钟快速部署

### 步骤 1: 准备数据库

#### 方式 A: 使用阿里云 RDS（推荐）

1. 登录阿里云控制台
2. 创建 PostgreSQL 实例
3. 创建数据库：
   ```sql
   CREATE DATABASE workbot;
   ```
4. 创建用户并授权：
   ```sql
   CREATE USER workbot_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE workbot TO workbot_user;
   ```
5. 获取数据库连接字符串：
   ```
   postgresql://workbot_user:secure_password@your-rds-endpoint:5432/workbot
   ```

#### 方式 B: 使用 Supabase

1. 注册并登录 Supabase
2. 创建新项目
3. 在 "Settings" → "Database" 中获取连接字符串
4. 格式：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

#### 方式 C: 使用 Railway

1. 注册并登录 Railway
2. 创建 PostgreSQL 数据库服务
3. 在 "Variables" 中查看 `DATABASE_URL`

---

### 步骤 2: 生成 JWT_SECRET

在终端运行以下命令：

```bash
openssl rand -base64 32
```

复制生成的字符串，后面会用到。

---

### 步骤 3: 部署到 Vercel

1. **连接代码仓库**

   - 登录 [Vercel](https://vercel.com)
   - 点击 "Add New Project"
   - 导入你的 GitHub 仓库

2. **配置环境变量**

   在项目设置中，添加以下环境变量：

   | 名称 | 值 |
   |------|-----|
   | `DATABASE_URL` | 步骤 1 获取的数据库连接字符串 |
   | `JWT_SECRET` | 步骤 2 生成的 JWT 密钥 |
   | `NODE_ENV` | `production` |

3. **部署**

   点击 "Deploy" 按钮，等待部署完成。

4. **创建数据库表**

   部署完成后，访问：
   ```
   https://your-domain.vercel.app/api/db/create-tables
   ```

   访问后应看到：
   ```json
   {
     "success": true,
     "message": "所有数据库表创建成功"
   }
   ```

5. **完成**

   访问你的应用：
   ```
   https://your-domain.vercel.app
   ```

   首次访问需要创建管理员账号。

---

### 步骤 4: 部署到 Railway

1. **创建新项目**

   - 登录 [Railway](https://railway.app)
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库

2. **添加数据库**

   - 在项目中点击 "New"
   - 选择 "Database"
   - 选择 "PostgreSQL"

3. **配置环境变量**

   - 点击项目中的 "Variables"
   - 点击 "New Variable"
   - 添加以下变量：

   | 名称 | 值 |
   |------|-----|
   | `JWT_SECRET` | 步骤 2 生成的 JWT 密钥 |
   | `NODE_ENV` | `production` |

   注意：`DATABASE_URL` 会自动从 Railway PostgreSQL 服务添加，不需要手动配置。

4. **部署**

   Railway 会自动部署，等待部署完成。

5. **创建数据库表**

   访问你的 Railway 域名：
   ```
   https://your-app.railway.app/api/db/create-tables
   ```

6. **完成**

   访问你的应用：
   ```
   https://your-app.railway.app
   ```

---

### 步骤 5: 部署到 Render

1. **创建 Web 服务**

   - 登录 [Render](https://render.com)
   - 点击 "New +"
   - 选择 "Web Service"
   - 连接你的 GitHub 仓库

2. **配置构建设置**

   - Runtime: `Node`
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`

3. **配置环境变量**

   - 在 "Environment" 部分添加以下变量：

   | 名称 | 值 |
   |------|-----|
   | `DATABASE_URL` | 步骤 1 获取的数据库连接字符串 |
   | `JWT_SECRET` | 步骤 2 生成的 JWT 密钥 |
   | `NODE_ENV` | `production` |

4. **部署**

   点击 "Create Web Service"，等待部署完成。

5. **创建数据库表**

   访问你的 Render 域名：
   ```
   https://your-app.onrender.com/api/db/create-tables
   ```

6. **完成**

   访问你的应用：
   ```
   https://your-app.onrender.com
   ```

---

## 本地开发

### 步骤 1: 克隆项目

```bash
git clone https://github.com/your-username/workbot.git
cd workbot
```

### 步骤 2: 安装依赖

```bash
pnpm install
```

### 步骤 3: 配置环境变量

创建 `.env.local` 文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
DATABASE_URL=postgresql://workbot_user:password@localhost:5432/workbot
JWT_SECRET=your-jwt-secret-here
NODE_ENV=development
```

### 步骤 4: 创建本地数据库

```sql
CREATE DATABASE workbot;
```

### 步骤 5: 创建数据库表

```bash
curl http://localhost:5000/api/db/create-tables
```

### 步骤 6: 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5000

---

## 部署后检查清单

部署完成后，确认以下项目：

- [ ] 应用可以正常访问
- [ ] 健康检查接口正常：`/api/health`
- [ ] 数据库表已创建：访问 `/api/db/create-tables`
- [ ] 可以创建管理员账号
- [ ] 可以正常登录
- [ ] 环境变量已正确配置
- [ ] HTTPS 已启用（生产环境）
- [ ] 自定义域名已配置（可选）

---

## 常见问题

### 部署失败：环境变量配置错误

**错误信息**：
```
❌ 环境变量配置错误:
  - DATABASE_URL: Required
  - JWT_SECRET: Required
```

**解决方案**：
1. 检查部署平台的环境变量配置
2. 确保添加了 `DATABASE_URL` 和 `JWT_SECRET`
3. 确保变量名拼写正确（区分大小写）
4. 重新部署

### 数据库连接失败

**错误信息**：
```
Error: connect ECONNREFUSED
```

**解决方案**：
1. 检查 `DATABASE_URL` 格式是否正确
2. 确认数据库地址可以从部署环境访问
3. 检查数据库防火墙规则
4. 确认数据库已创建

更多解决方案请参考 [故障排查指南](./TROUBLESHOOTING.md)。

---

## 下一步

- 阅读 [部署指南](./DEPLOYMENT_GUIDE.md) 了解更多部署选项
- 阅读 [环境变量说明](./ENVIRONMENT_VARIABLES.md) 了解所有配置选项
- 阅读 [API 文档](./API.md) 了解如何使用 API
- 阅读 [故障排查指南](./TROUBLESHOOTING.md) 解决常见问题

---

## 获取帮助

如果遇到问题：

1. 查看 [故障排查指南](./TROUBLESHOOTING.md)
2. 查看 GitHub Issues
3. 提交新的 Issue，包含：
   - 错误信息
   - 环境配置
   - 日志片段
