# 部署环境配置指南

## 环境变量配置

WorkBot 需要配置以下必需的环境变量才能在生产环境中正常运行。

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://user:password@host:5432/database` |
| `JWT_SECRET` | JWT 密钥（至少 32 个字符） | `your-super-secret-jwt-key-at-least-32-chars` |

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | Node 环境 | `production` |
| `PORT` | 服务端口 | `5000` |
| `JWT_ACCESS_EXPIRES_IN` | 访问令牌过期时间 | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | 刷新令牌过期时间 | `7d` |
| `WS_HEARTBEAT_INTERVAL` | WebSocket 心跳间隔（毫秒） | `30000` |
| `WS_MAX_CONNECTIONS` | 最大 WebSocket 连接数 | `1000` |
| `CORS_ORIGIN` | CORS 源 | `*` |
| `RATE_LIMIT_ENABLED` | 启用限流 | `true` |
| `RATE_LIMIT_WINDOW_MS` | 限流时间窗口（毫秒） | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | 每个时间窗口内的最大请求数 | `100` |

## 部署平台配置

### 在部署平台配置环境变量

1. 登录到部署平台
2. 找到项目设置 → 环境变量配置
3. 添加以下必需的环境变量：

```
DATABASE_URL=postgresql://用户名:密码@数据库地址:5432/数据库名
JWT_SECRET=至少32个字符的随机字符串
```

### 生成强密钥的方法

**JWT_SECRET 生成：**

```bash
# Linux/macOS
openssl rand -base64 32

# 或者使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 数据库配置

### PostgreSQL 连接字符串格式

```
postgresql://用户名:密码@主机:端口/数据库名?参数1=值1&参数2=值2
```

### 常用参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `sslmode` | SSL 模式 | `require`（推荐生产环境使用） |
| `connect_timeout` | 连接超时（秒） | `10` |

### 示例

```
# 开发环境
DATABASE_URL=postgresql://postgres:password@localhost:5432/workbot

# 生产环境（启用 SSL）
DATABASE_URL=postgresql://user:password@db.example.com:5432/workbot?sslmode=require
```

## 故障排查

### 错误：环境变量配置错误

如果看到以下错误：

```
❌ 环境变量配置错误:
  - DATABASE_URL: Required
  - JWT_SECRET: Required
```

**解决方案：**

1. 检查部署平台的环境变量配置
2. 确保必需的环境变量已添加
3. 确保环境变量值正确

### 错误：数据库连接失败

**可能的原因：**

1. 数据库 URL 格式错误
2. 数据库地址无法访问
3. 用户名或密码错误
4. 数据库不存在

**解决方案：**

1. 验证 DATABASE_URL 格式是否正确
2. 确保数据库可从部署环境访问
3. 检查数据库用户权限
4. 确认数据库已创建

### 错误：JWT_SECRET 太短

**解决方案：**

生成至少 32 个字符的随机字符串作为 JWT_SECRET：

```bash
openssl rand -base64 32
```

## 安全建议

1. **使用强密码**：数据库密码和 JWT_SECRET 应该使用强密码
2. **启用 SSL**：生产环境数据库连接应该使用 SSL
3. **定期更换密钥**：定期更换 JWT_SECRET 和数据库密码
4. **最小权限原则**：数据库用户只应授予必要的权限
5. **不要提交敏感信息**：不要将 .env 文件提交到版本控制系统

## 参考资源

- [PostgreSQL 连接字符串](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [JWT 最佳实践](https://tools.ietf.org/html/rfc8725)
