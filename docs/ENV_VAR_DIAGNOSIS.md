# 环境变量配置诊断指南

## 问题描述

部署失败，提示 `DATABASE_URL: Required`。

## 诊断步骤

### 步骤 1: 查看调试信息

在最新的部署日志中，查找以下调试输出：

```
🔍 调试信息：检查所有可能的数据库环境变量...
  DATABASE_URL: 未设置
  POSTGRES_URL: 未设置
  POSTGRESQL_URL: 未设置
  DB_URL: 未设置
  PG_URL: 未设置
  DATABASE_CONNECTION_URL: 未设置
```

**如果所有环境变量都显示"未设置"**，说明环境变量没有正确传递到容器中。

### 步骤 2: 确认环境变量配置

#### 在 Coze FaaS 平台配置

1. **登录 Coze FaaS 平台**
2. **找到您的应用（WorkBot）**
3. **进入"部署配置"或"环境变量"页面**
4. **添加/检查以下环境变量**：

##### 方式 A: 使用 DATABASE_URL（推荐）

```bash
# 变量名
DATABASE_URL

# 变量值
postgresql://workbot:YourSecurePassword123@pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com:5432/postgres
```

##### 方式 B: 如果平台使用其他名称

如果平台使用其他环境变量名称，请根据实际情况配置：

```bash
# 变量名（根据平台实际名称）
POSTGRES_URL
# 或
POSTGRESQL_URL
# 或
DB_URL
# 或
PG_URL

# 变量值
postgresql://workbot:YourSecurePassword123@pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com:5432/postgres
```

### 步骤 3: 配置 JWT_SECRET

```bash
# 变量名
JWT_SECRET

# 变量值
GF3i7ksJn3YS3kYCRWPqMWkF3AoPpaWoPiipD+Fzjzo=
```

### 步骤 4: 保存配置

1. **保存环境变量配置**
2. **重新部署应用**

### 步骤 5: 验证部署

部署完成后，查看日志，应该看到：

```
✅ 环境变量检查通过
   DATABASE_URL: postgresql://workbot:YourS...
   JWT_SECRET: GF3i7ksJn3...
```

## 常见问题

### Q1: 为什么环境变量显示"未设置"？

**可能原因**：
1. 环境变量名称不匹配
2. 环境变量未保存
3. 环境变量需要重新部署才能生效
4. 平台使用不同的环境变量传递方式

**解决方案**：
1. 确认变量名拼写正确（区分大小写）
2. 确认已保存配置
3. 重新部署应用
4. 联系平台管理员，确认环境变量配置方式

### Q2: 平台使用什么环境变量名称？

不同平台可能使用不同的环境变量名称：

| 平台 | 常见环境变量名称 |
|------|------------------|
| Coze FaaS | `DATABASE_URL`、`POSTGRES_URL` |
| Vercel | `POSTGRES_PRISMA_URL`、`DATABASE_URL` |
| Railway | `DATABASE_URL` |
| Render | `DATABASE_URL` |
| Heroku | `DATABASE_URL` |
| 自定义 | 任意名称 |

**建议**：优先使用 `DATABASE_URL`，这是最通用的名称。

### Q3: 如何确认数据库连接信息？

您的数据库连接信息：

- **主机地址**: `pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com`
- **端口**: `5432`
- **数据库名**: `postgres`
- **用户名**: `workbot`
- **密码**: `YourSecurePassword123`

**连接字符串**：
```
postgresql://workbot:YourSecurePassword123@pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com:5432/postgres
```

### Q4: 如何测试数据库连接？

在本地测试数据库连接：

```bash
# 使用 psql 测试
psql -h pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com -p 5432 -U workbot -d postgres

# 输入密码: YourSecurePassword123
```

如果连接成功，说明数据库连接信息正确。

## 完整的环境变量配置示例

```bash
# 数据库连接
DATABASE_URL=postgresql://workbot:YourSecurePassword123@pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com:5432/postgres

# JWT 密钥
JWT_SECRET=GF3i7ksJn3YS3kYCRWPqMWkF3AoPpaWoPiipD+Fzjzo=

# 可选：配置其他环境变量
NODE_ENV=production
PORT=5000
```

## 部署检查清单

- [ ] 已登录 Coze FaaS 平台
- [ ] 已找到 WorkBot 应用
- [ ] 已进入环境变量配置页面
- [ ] 已配置 `DATABASE_URL` 环境变量
- [ ] 已配置 `JWT_SECRET` 环境变量
- [ ] 已保存配置
- [ ] 已重新部署应用
- [ ] 部署日志显示"环境变量检查通过"
- [ ] 服务成功启动

## 需要帮助？

如果按照以上步骤仍然无法解决，请提供：

1. **部署日志**（包含调试信息部分）
2. **环境变量配置截图**（请隐藏敏感信息）
3. **平台名称和版本**
4. **使用的部署方式**

## 相关文档

- [部署指南](./DEPLOYMENT_GUIDE.md)
- [部署环境变量配置快速指南](./DEPLOYMENT_ENV_QUICK_GUIDE.md)
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)
