# 安全策略

## 安全支持政策

### 支持的版本

| 版本 | 支持状态 |
|------|---------|
| 2.x.x | ✅ 当前版本，完全支持 |
| 1.x.x | ⚠️ 旧版本，仅关键安全更新 |

### 报告安全漏洞

如果你发现了安全漏洞，请**不要**在公开的 Issue 中报告，而是通过以下方式私下报告：

1. **发送邮件至**: security@your-domain.com
2. **或使用 GitHub Security Advisory**: [报告漏洞](https://github.com/your-username/workbot/security/advisories/new)

请在报告中包含：

- 漏洞描述
- 受影响的版本
- 漏洞复现步骤
- 可能的影响范围
- 建议的修复方案（如果有）

我们会在收到报告后 48 小时内回复，并在确认漏洞后尽快发布修复补丁。

## 安全最佳实践

### 环境变量

⚠️ **永远不要在代码中硬编码敏感信息**

- ✅ 使用环境变量存储敏感信息
- ✅ 使用 `.env.example` 提供模板
- ❌ 不要提交 `.env` 文件到 Git
- ❌ 不要在代码中硬编码密码、密钥等

### 密钥管理

#### JWT_SECRET

- 必须至少 32 个字符
- 使用强随机生成器生成：
  ```bash
  openssl rand -base64 32
  ```
- 定期轮换（建议每 90 天）
- 不要在多个环境使用相同的密钥

#### 数据库密码

- 使用强密码（至少 16 字符，包含大小写字母、数字、特殊字符）
- 定期轮换
- 限制数据库用户权限
- 不要在日志中记录密码

### 数据库安全

#### 连接配置

- ✅ 生产环境必须使用 SSL 连接
- ✅ 使用连接池
- ✅ 设置合理的超时时间
- ❌ 不要使用默认端口号暴露到公网

#### 权限管理

- 为不同应用使用不同的数据库用户
- 遵循最小权限原则
- 定期审查用户权限
- 禁用不需要的功能

示例权限配置：

```sql
-- 只读用户
CREATE USER workbot_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE workbot TO workbot_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO workbot_readonly;

-- 应用用户
CREATE USER workbot_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE workbot TO workbot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO workbot_app;
```

### API 安全

#### 认证和授权

- ✅ 使用 JWT 进行认证
- ✅ 实现角色权限控制
- ✅ Token 过期时间合理
- ✅ 实现 Token 刷新机制
- ❌ 不要在 URL 中传递敏感信息

#### 输入验证

- ✅ 验证所有输入参数
- ✅ 使用 Zod 进行数据验证
- ✅ 防止 SQL 注入
- ✅ 防止 XSS 攻击

#### 速率限制

- ✅ 实现 API 速率限制
- ✅ 防止暴力破解
- ✅ 记录异常请求

#### HTTPS

- ✅ 生产环境必须使用 HTTPS
- ✅ 使用有效的 SSL 证书
- ✅ 强制 HTTPS 重定向
- ✅ 使用 HSTS

### 日志安全

#### 敏感信息处理

- ❌ 不要在日志中记录：
  - 密码
  - Token
  - 信用卡号
  - 个人身份信息（PII）
  - 完整的请求体（如果包含敏感信息）

#### 日志级别

- 生产环境使用 `INFO` 或 `WARN` 级别
- 开发环境可以使用 `DEBUG` 级别
- 错误日志应该包含足够的上下文

#### 日志访问

- 限制日志访问权限
- 定期清理旧日志
- 敏感操作应该记录审计日志

### CORS 配置

```typescript
// 推荐配置
const corsOptions = {
  origin: process.env.CORS_ORIGIN, // 不要使用 *
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

### WebSocket 安全

- ✅ 验证连接时的 Token
- ✅ 实现心跳检测
- ✅ 限制连接频率
- ✅ 使用 WSS (WebSocket over TLS)
- ✅ 验证消息格式和内容

### 文件上传

- ✅ 验证文件类型
- ✅ 限制文件大小
- ✅ 扫描恶意文件
- ✅ 使用安全的文件名
- ✅ 将文件存储在非 Web 可访问目录
- ✅ 对敏感文件进行加密

### 依赖管理

#### 定期更新

```bash
# 检查过时的依赖
pnpm outdated

# 更新依赖
pnpm update

# 审计安全漏洞
pnpm audit
```

#### 使用安全工具

- [Snyk](https://snyk.io/) - 依赖漏洞扫描
- [npm audit](https://docs.npmjs.com/cli/v6/commands/audit) - npm 安全审计
- [Dependabot](https://github.com/dependabot) - 自动化依赖更新

### 部署安全

#### 容器安全

- ✅ 使用官方镜像或可信镜像
- ✅ 不要以 root 用户运行
- ✅ 最小化镜像大小
- ✅ 定期更新基础镜像

#### 服务器安全

- ✅ 定期更新系统和软件
- ✅ 配置防火墙
- ✅ 禁用不必要的服务
- ✅ 使用 SSH 密钥认证
- ✅ 禁用 root 登录
- ✅ 配置 fail2ban 防止暴力破解

### 备份和恢复

- ✅ 定期备份数据库
- ✅ 备份应该加密
- ✅ 测试恢复流程
- ✅ 保留多个版本的备份
- ✅ 将备份存储在异地

## 常见安全问题

### SQL 注入

**风险**: 攻击者可以通过注入恶意 SQL 语句来访问或修改数据库。

**防护**:
- ✅ 使用参数化查询
- ✅ 使用 ORM（如 Drizzle）
- ✅ 验证所有输入

```typescript
// ✅ 正确：使用参数化查询
await db
  .select()
  .from(users)
  .where(eq(users.id, userId));

// ❌ 错误：直接拼接 SQL
await db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

### XSS 攻击

**风险**: 攻击者可以通过注入恶意脚本窃取用户数据。

**防护**:
- ✅ 使用 React 的 JSX 自动转义
- ✅ 验证和清理用户输入
- ✅ 使用 CSP (Content Security Policy)

```typescript
// ✅ 正确：React 自动转义
<div>{userInput}</div>

// ❌ 错误：直接渲染 HTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### CSRF 攻击

**风险**: 攻击者可以伪造用户请求执行未授权操作。

**防护**:
- ✅ 使用 CSRF Token
- ✅ 验证 Referer 头
- ✅ 使用 SameSite Cookie

### 会话劫持

**风险**: 攻击者可以窃取用户会话。

**防护**:
- ✅ 使用 HTTPS
- ✅ 设置 HttpOnly Cookie
- ✅ 设置 Secure Cookie
- ✅ 设置 SameSite Cookie
- ✅ 实现 Token 刷新机制

### 暴力破解

**风险**: 攻击者可以尝试大量密码组合来破解账户。

**防护**:
- ✅ 实现登录速率限制
- ✅ 使用 CAPTCHA
- ✅ 账户锁定机制
- ✅ 记录失败尝试

## 安全检查清单

部署前请检查以下项目：

### 环境配置
- [ ] 所有敏感信息都使用环境变量
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] `JWT_SECRET` 已生成且足够长
- [ ] 数据库密码足够强
- [ ] CORS_ORIGIN 已正确配置

### 数据库
- [ ] 生产环境使用 SSL 连接
- [ ] 数据库用户权限最小化
- [ ] 定期备份数据库
- [ ] 数据库不直接暴露到公网

### API
- [ ] 所有 API 都有认证
- [ ] 实现了速率限制
- [ ] 输入验证和清理
- [ ] 错误信息不泄露敏感信息

### 日志
- [ ] 不记录敏感信息
- [ ] 日志级别正确
- [ ] 日志存储安全
- [ ] 日志有审计功能

### 部署
- [ ] 使用 HTTPS
- [ ] SSL 证书有效
- [ ] 服务器已更新
- [ ] 防火墙已配置
- [ ] 依赖已更新且无已知漏洞

## 安全更新

### 更新流程

1. 收到安全漏洞报告
2. 评估漏洞严重性
3. 开发修复补丁
4. 测试修复补丁
5. 发布安全更新
6. 通知用户更新

### 通知渠道

- GitHub Security Advisory
- 邮件通知
- 项目公告

## 安全资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

## 联系方式

如果你有任何安全问题或建议，请联系：

- Email: security@your-domain.com
- GitHub Security: [报告漏洞](https://github.com/your-username/workbot/security/advisories/new)

---

**感谢你对 WorkBot 安全性的关注！**
