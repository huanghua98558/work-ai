# 部署环境变量问题修复（V2）

## 问题描述

在 Coze FaaS 平台部署时，环境变量在**构建阶段可用**，但在**运行阶段不可用**。

### 错误日志

```
🔍 调试信息：检查所有可能的数据库环境变量...
  DATABASE_URL: 未设置
  POSTGRES_URL: 未设置
  POSTGRESQL_URL: 未设置
  DB_URL: 未设置
  PG_URL: 未设置
  DATABASE_CONNECTION_URL: 未设置
```

## 根本原因

Coze FaaS 平台的环境变量传递机制：
- ✅ 构建阶段：环境变量可用（`check-env.sh` 检查通过）
- ❌ 运行阶段：环境变量不可用（`start.sh` 检测不到）

## 修复方案

### 方案 1: 使用 `.env` 文件（当前方案）

修改 `scripts/start.sh`，从 `.env` 文件读取环境变量：

```bash
# 从 .env 文件加载
if [ -f ".env" ]; then
  echo "✅ 发现 .env 文件，正在加载..."
  export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
  echo "   已从 .env 文件加载环境变量"
fi
```

### 方案 2: 检查 FaaS 平台特定的环境变量文件

```bash
# 从常见的环境变量文件加载（FaaS 平台可能使用）
if [ -f "/app/work/env/.env" ]; then
  echo "✅ 发现 /app/work/env/.env 文件，正在加载..."
  export $(cat /app/work/env/.env | grep -v '^#' | grep -v '^$' | xargs)
  echo "   已从 /app/work/env/.env 文件加载环境变量"
fi
```

## 已完成的修改

### 1. 更新 `scripts/start.sh`

- ✅ 添加从 `.env` 文件加载环境变量
- ✅ 添加从 `/app/work/env/.env` 文件加载环境变量
- ✅ 添加从 `/run/secrets/.env` 文件加载环境变量
- ✅ 支持 `PGDATABASE_URL` 环境变量
- ✅ 添加详细的调试信息

### 2. 更新 `.env` 文件

```bash
# 服务器配置
PORT=5000
NODE_ENV=development

# 数据库配置（阿里云 RDS PostgreSQL）
DATABASE_URL=postgresql://workbot:YourSecurePassword123@pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com:5432/postgres

# JWT 密钥
JWT_SECRET=GF3i7ksJn3YS3kYCRWPqMWkF3AoPpaWoPiipD+Fzjzo=
JWT_ACCESS_TOKEN_EXPIRES_IN=30d
JWT_REFRESH_TOKEN_EXPIRES_IN=90d
```

## 下一步操作

### 方案 A: 使用 `.env` 文件（推荐）

1. **确认 `.env` 文件已更新**
   - ✅ `DATABASE_URL` 已配置
   - ✅ `JWT_SECRET` 已配置

2. **提交代码**
   ```bash
   git add .
   git commit -m "fix: 添加从 .env 文件加载环境变量功能"
   git push
   ```

3. **重新部署**
   - 在 Coze FaaS 平台重新部署应用

4. **查看部署日志**
   - 应该看到：`✅ 发现 .env 文件，正在加载...`
   - 环境变量应该正确加载

### 方案 B: 联系 Coze FaaS 平台

如果方案 A 不行，需要联系 Coze FaaS 平台管理员，了解：

1. **环境变量传递机制**
   - 平台如何传递环境变量到运行时容器？
   - 是否有特定的配置方式？

2. **Secret 管理**
   - 平台是否有 Secret 管理功能？
   - 如何配置 Secret 并在运行时使用？

3. **环境变量文件位置**
   - 平台是否将环境变量写入到特定文件？
   - 文件路径是什么？

## 预期结果

部署成功后，日志应该显示：

```
=========================================
启动 WorkBot 服务
=========================================

🔍 尝试加载环境变量...

✅ 发现 .env 文件，正在加载...
   已从 .env 文件加载环境变量

🔍 调试信息：检查所有可能的数据库环境变量...
  DATABASE_URL: postgresql://workbot:YourS...
  ...

✅ 环境变量检查通过
   DATABASE_URL: postgresql://workbot:YourS...
   JWT_SECRET: GF3i7ksJn3...

正在启动服务...
服务进程 ID: xxxxx

等待服务启动...
✅ 服务启动成功！
=========================================
✅ 服务已启动并就绪
=========================================
```

## 故障排除

### 问题 1: 仍然检测不到环境变量

**可能原因**：
- `.env` 文件没有包含在部署包中
- 文件路径不正确

**解决方案**：
1. 确认 `.env` 文件已提交到代码仓库
2. 检查 `.gitignore` 文件，确保 `.env` 不被忽略
3. 查看完整的调试日志，确认文件是否被找到

### 问题 2: 数据库连接失败

**可能原因**：
- 数据库连接信息错误
- 数据库白名单未配置

**解决方案**：
1. 检查数据库连接信息是否正确
2. 在阿里云 RDS 控制台配置白名单，允许 Coze FaaS 平台的 IP 地址访问

### 问题 3: JWT 密钥错误

**可能原因**：
- JWT_SECRET 格式不正确
- JWT_SECRET 长度不够

**解决方案**：
1. 确认 JWT_SECRET 是有效的 base64 字符串
2. JWT_SECRET 长度应该至少 32 个字符

## 相关文档

- [环境变量配置诊断指南](./ENV_VAR_DIAGNOSIS.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [部署环境变量配置快速指南](./DEPLOYMENT_ENV_QUICK_GUIDE.md)
