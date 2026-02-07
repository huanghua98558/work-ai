# WorkBot 技术文档版本对比

## 版本变更说明

| 版本 | 日期 | 主要变化 |
|-----|------|---------|
| v1.0 | 2025-02-06 | 初始版本，基于自建服务器 |
| v2.0 | 2025-02-07 | 适配扣子云平台 |

---

## 主要变更列表

### 1. WebSocket端口（重大变更）

#### v1.0（自建服务器）
```yaml
WebSocket:
  端口: 5001
  地址: wss://your-server.com:5001/ws/connect
  说明: 独立端口，与HTTP分离
```

#### v2.0（扣子云平台）
```yaml
WebSocket:
  端口: 5000（与HTTP共享）
  地址: wss://your-domain.coze.site/ws/connect
  说明: 与HTTP共享5000端口，自动升级为WSS
```

**影响**：
- ⚠️ APP需要修改连接地址
- ⚠️ 端口从5001改为5000（或省略）
- ✅ 协议不变，都是WSS

---

### 2. 消息队列（重大变更）

#### v1.0（自建服务器）
```yaml
消息队列:
  技术: Redis
  端口: 6379
  用途:
    - 暂存离线指令
    - 缓存机器人状态
    - 缓存用户配置
```

**实现示例**：
```javascript
// v1.0 - 使用Redis
await redis.lpush('commands:offline', JSON.stringify(command));
const command = await redis.rpop('commands:offline');
await redis.setex(`robot:${robotId}:status`, 30, 'online');
```

#### v2.0（扣子云平台）
```yaml
消息队列:
  技术: PostgreSQL
  说明: 替代Redis，与主数据库共享
  用途:
    - 暂存离线指令（offline_commands表）
    - 缓存机器人状态（robots表）
    - 缓存用户配置（users表）
```

**实现示例**：
```typescript
// v2.0 - 使用PostgreSQL
await db.insert(offlineCommands).values({
  robotId,
  command: JSON.stringify(command),
  processed: false
});

const commands = await db.select()
  .from(offlineCommands)
  .where(
    and(
      eq(offlineCommands.robotId, robotId),
      eq(offlineCommands.processed, false)
    )
  )
  .limit(10);
```

**影响**：
- ✅ APP无影响
- ⚠️ 消息队列性能略低于Redis（但WorkBot规模足够）
- ✅ 数据持久化更安全
- ✅ 无需额外配置Redis服务器

---

### 3. 部署架构（架构变更）

#### v1.0（自建服务器）
```
自建服务器（阿里云/腾讯云）：
├─ Nginx（端口443）
│   ├─ 反向代理到5000（HTTP）
│   └─ 反向代理到5001（WebSocket）
├─ Next.js应用
│   ├─ HTTP服务（5000端口）
│   └─ WebSocket服务（5001端口）
├─ PostgreSQL（5432端口）
├─ Redis（6379端口）
└─ 对象存储（自建或使用云存储）
```

**配置文件**：
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # HTTP
    location / {
        proxy_pass http://localhost:5000;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### v2.0（扣子云平台）
```
扣子云平台：
├─ 域名：your-domain.coze.site
├─ 自动HTTPS（Let's Encrypt）
├─ Next.js应用
│   ├─ HTTP服务（5000端口）
│   └─ WebSocket服务（5000端口，共享）
├─ PostgreSQL（Database技能提供）
├─ 对象存储（Storage技能提供）
└─ LLM服务（LLM技能提供）
```

**配置**：
```yaml
# .coze文件
[project]
requires = ["nodejs-24"]

[dev]
build = ["pnpm", "install"]
run = ["pnpm", "run", "dev"]

[deploy]
build = ["pnpm", "run", "build"]
run = ["pnpm", "run", "start"]
```

**影响**：
- ✅ 无需配置Nginx
- ✅ 自动HTTPS，无需申请SSL证书
- ✅ 无需管理Redis服务器
- ⚠️ 域名从`your-domain.com`变为`your-domain.coze.site`

---

### 4. 域名配置（域名变更）

#### v1.0（自建服务器）
```
HTTP: https://your-domain.com
WebSocket: wss://your-domain.com:5001/ws/connect
```

#### v2.0（扣子云平台）
```
开发环境:
  HTTP: http://localhost:5000
  WebSocket: ws://localhost:5000/ws/connect

生产环境:
  HTTP: https://your-domain.coze.site
  WebSocket: wss://your-domain.coze.site/ws/connect
```

**影响**：
- ⚠️ APP需要更新连接地址
- ⚠️ 第三方平台需要更新回调地址
- ⚠️ 管理后台访问地址变更

---

### 5. 环境变量（环境变量变更）

#### v1.0（自建服务器）
```bash
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/workbot

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# 对象存储
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=your-bucket
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# 微信支付
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret
WECHAT_MCH_ID=your-mch-id
WECHAT_API_KEY=your-api-key
```

#### v2.0（扣子云平台）
```bash
# 数据库（扣子自动提供）
PGDATABASE_URL=postgresql://...（自动配置）

# 对象存储（扣子自动提供）
COZE_BUCKET_ENDPOINT_URL=https://integration.coze.cn/coze-coding-s3proxy/v1
COZE_BUCKET_NAME=bucket_xxxxxx

# JWT
JWT_SECRET=your-secret-key

# 微信支付
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret
WECHAT_MCH_ID=your-mch-id
WECHAT_API_KEY=your-api-key

# 阿里云短信（验证码）
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_SMS_SIGN_NAME=your-sign-name
ALIYUN_SMS_TEMPLATE_CODE=your-template-code

# AI服务配置
DOUBAO_API_KEY=your-doubao-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
KIMI_API_KEY=your-kimi-api-key

# 扣子平台（自动配置）
COZE_PROJECT_DOMAIN=https://your-domain.coze.site
DEPLOY_RUN_PORT=5000
```

**变化**：
- ✅ 移除`REDIS_URL`（不再需要Redis）
- ✅ 移除`S3_*`环境变量（使用扣子提供的Storage技能）
- ✅ 新增扣子环境变量（自动配置）
- ✅ 新增阿里云短信环境变量（验证码）
- ✅ 新增AI服务环境变量（豆包/DeepSeek/Kimi）

---

### 6. 数据库表结构（新增离线指令表）

#### v1.0（自建服务器）
```sql
-- v1.0 无离线指令表，使用Redis
-- Redis: LPUSH/RPOP commands:offline
```

#### v2.0（扣子云平台）
```sql
-- v2.0 新增离线指令表
CREATE TABLE offline_commands (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(36) NOT NULL REFERENCES robots(id),
  command JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_offline_commands_robot_id ON offline_commands(robot_id);
CREATE INDEX idx_offline_commands_processed ON offline_commands(processed, created_at);
```

**影响**：
- ✅ 需要在数据库中创建`offline_commands`表
- ✅ 需要实现消息队列逻辑

---

### 7. 部署流程（部署流程变更）

#### v1.0（自建服务器）
```bash
# 1. 配置Nginx
sudo nano /etc/nginx/sites-available/workbot

# 2. 申请SSL证书
sudo certbot --nginx -d your-domain.com

# 3. 安装依赖
pnpm install

# 4. 构建生产版本
pnpm run build

# 5. 启动服务
pnpm run start

# 6. 配置Redis
redis-server

# 7. 配置PostgreSQL
sudo -u postgres psql
CREATE DATABASE workbot;
```

#### v2.0（扣子云平台）
```bash
# 1. 初始化项目
coze init /workspace/projects --template nextjs

# 2. 安装依赖
pnpm install

# 3. 开发环境
coze dev

# 4. 构建生产版本
pnpm run build

# 5. 部署到扣子
coze build
coze start
```

**影响**：
- ✅ 部署流程更简单
- ✅ 无需配置Nginx
- ✅ 无需配置Redis
- ✅ 无需申请SSL证书

---

### 8. 用户登录方式（登录方式变更）

#### v1.0（自建服务器）
```yaml
登录方式: 微信授权登录（主要）
流程:
  1. 用户点击"微信授权登录"
  2. 跳转微信授权页面
  3. 授权成功，获取微信昵称、头像
  4. 提示绑定手机号（必填）
  5. 发送验证码
  6. 验证验证码
  7. 注册成功
```

#### v2.0（扣子云平台）
```yaml
登录方式: 手机号+短信验证码（主要）
可选方式: 微信授权登录（后续扩展）
流程:
  1. 用户输入手机号
  2. 点击"发送验证码"
  3. 系统发送短信验证码（阿里云SMS）
  4. 用户输入验证码
  5. 验证验证码
  6. 注册/登录成功
```

**影响**：
- ✅ 登录流程更简单
- ✅ 无需微信授权
- ✅ 需要集成阿里云短信服务

---

### 9. 不变的内容

以下内容在v1.0和v2.0中保持不变：

- ✅ HTTP API接口规范
- ✅ 数据库表结构（除`offline_commands`表）
- ✅ 业务逻辑
- ✅ 用户角色和权限
- ✅ 机器人管理功能
- ✅ 激活码机制
- ✅ AI回复系统
- ✅ 第三方通讯协议
- ✅ 支付系统
- ✅ 管理后台功能
- ✅ 系统监控与告警
- ✅ 数据备份策略
- ✅ 日志保留策略

---

## 迁移指南

### 从v1.0迁移到v2.0

#### 1. 修改APP配置
```javascript
// v1.0
const wsUrl = `wss://your-server.com:5001/ws/connect?token=${token}`;
const apiUrl = `https://your-server.com/api`;

// v2.0
const wsUrl = `wss://your-domain.coze.site/ws/connect?token=${token}`;
const apiUrl = `https://your-domain.coze.site/api`;
```

#### 2. 修改第三方平台回调地址
```javascript
// v1.0
const callbackUrl = `https://your-server.com/api/worktool/callback`;

// v2.0
const callbackUrl = `https://your-domain.coze.site/api/worktool/callback`;
```

#### 3. 创建离线指令表
```sql
CREATE TABLE offline_commands (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(36) NOT NULL REFERENCES robots(id),
  command JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_offline_commands_robot_id ON offline_commands(robot_id);
CREATE INDEX idx_offline_commands_processed ON offline_commands(processed, created_at);
```

#### 4. 更新环境变量
```bash
# 移除
REDIS_URL=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# 新增
COZE_BUCKET_ENDPOINT_URL=
COZE_BUCKET_NAME=
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=
DOUBAO_API_KEY=
DEEPSEEK_API_KEY=
KIMI_API_KEY=
```

#### 5. 更新部署配置
```bash
# 删除Nginx配置
sudo rm /etc/nginx/sites-available/workbot

# 使用扣子部署
coze init /workspace/projects --template nextjs
coze build
coze start
```

---

## 总结

### 主要变化
1. ✅ WebSocket端口从5001改为5000（与HTTP共享）
2. ✅ 消息队列从Redis改为PostgreSQL
3. ✅ 部署环境从自建服务器改为扣子云平台
4. ✅ 域名从自定义域名改为`.coze.site`
5. ✅ 登录方式从微信授权改为手机号+验证码
6. ✅ 新增离线指令表
7. ✅ 新增阿里云短信集成
8. ✅ 新增AI服务配置

### 不变的内容
1. ✅ HTTP API接口
2. ✅ 业务逻辑
3. ✅ 数据库表结构（除新增表）
4. ✅ 用户角色和权限
5. ✅ 机器人管理功能
6. ✅ 激活码机制
7. ✅ AI回复系统
8. ✅ 第三方通讯协议

### 优势
1. ✅ 部署更简单
2. ✅ 运维成本更低
3. ✅ 自动HTTPS
4. ✅ 无需配置Nginx
5. ✅ 无需管理Redis
6. ✅ 功能完全一致

---

**文档结束**
