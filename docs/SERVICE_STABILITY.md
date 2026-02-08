# 服务稳定性优化方案

## 当前诊断结果

根据诊断脚本运行结果，发现以下问题：

### 1. 内存使用率过高 (79-82%)
- **堆内存使用**: 334-404MB / 409-511MB
- **RSS 内存**: 845-863MB
- **影响**: 可能导致垃圾回收频繁，影响性能

### 2. JWT_SECRET 配置检测问题
- **状态**: 实际已配置（64字符），但检测脚本可能无法正确读取

### 3. 数据库连接池配置
- **当前配置**: 开发环境最大 20 个连接，最小 2 个连接
- **状态**: 正常

## 优化方案

### 1. 内存优化

#### 1.1 增加 Node.js 内存限制

在启动脚本中增加 Node.js 内存限制：

```bash
# 编辑 server.ts 的启动命令
NODE_OPTIONS="--max-old-space-size=2048" pnpm dev
```

#### 1.2 优化连接池配置

调整数据库连接池配置，减少内存占用：

```typescript
// src/lib/db.ts
function getPoolConfig(): PoolConfig {
  // ...其他配置...

  return {
    connectionString,
    max: isProduction() ? 20 : 10,  // 减少开发环境连接数
    min: isProduction() ? 5 : 1,    // 减少开发环境最小连接数
    idleTimeoutMillis: 10000,       // 缩短空闲超时
    connectionTimeoutMillis: 10000, // 缩短连接超时
    // ...其他配置...
  };
}
```

#### 1.3 启用生产模式配置

开发模式比生产模式使用更多内存，建议：

```bash
# 使用生产模式配置
NODE_ENV=production pnpm build
NODE_ENV=production pnpm start
```

### 2. 自动监控和恢复

#### 2.1 启动监控脚本

在后台运行监控脚本，持续监控服务状态：

```bash
# 终端 1: 启动监控
cd /workspace/projects
bash scripts/monitor.sh

# 查看监控日志
tail -f /app/work/logs/bypass/monitor.log
```

#### 2.2 启动自动恢复脚本

在后台运行自动恢复脚本，当服务不可用时自动重启：

```bash
# 终端 2: 启动自动恢复
cd /workspace/projects
bash scripts/recovery.sh > /app/work/logs/bypass/recovery.log 2>&1 &

# 查看恢复日志
tail -f /app/work/logs/bypass/recovery.log
```

### 3. 日志管理

#### 3.1 配置日志轮转

避免日志文件过大导致磁盘空间问题：

```bash
# 安装 logrotate (如果未安装)
sudo apt-get install logrotate

# 创建 logrotate 配置
sudo tee /etc/logrotate.d/workbot << EOF
/app/work/logs/bypass/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        # 如果需要重启服务以释放日志文件句柄，可以在这里添加
        # kill -USR1 $(cat /var/run/workbot.pid)
    endscript
}
EOF
```

#### 3.2 限制日志大小

在代码中限制日志输出：

```typescript
// 只在生产环境输出 debug 日志
if (isDevelopment()) {
    console.debug('[Debug]', ...args);
}

// 避免在日志中输出大量数据
console.log('[数据库] 新连接已建立', {
    totalCount: pool.totalCount,
    // 不要输出完整对象
});
```

### 4. 数据库优化

#### 4.1 检查慢查询

定期检查数据库慢查询：

```sql
-- 查看慢查询
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### 4.2 添加索引

为常用查询添加索引：

```sql
-- 为 activation_codes 添加索引
CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON activation_codes(status);
CREATE INDEX IF NOT EXISTS idx_activation_codes_expires_at ON activation_codes(expires_at);

-- 为 conversations 添加索引
CREATE INDEX IF NOT EXISTS idx_conversations_robot_id ON conversations(robot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
```

#### 4.3 优化查询

避免 N+1 查询，使用 JOIN：

```typescript
// ❌ 不好的方式：N+1 查询
const conversations = await db.select().from(conversations);
for (const conv of conversations) {
  const robot = await db.select().from(robots).where(eq(robots.id, conv.robotId));
}

// ✅ 好的方式：使用 JOIN
const conversationsWithRobot = await db
  .select({
    ...conversations,
    robot: robots
  })
  .from(conversations)
  .leftJoin(robots, eq(conversations.robotId, robots.id));
```

### 5. WebSocket 优化

#### 5.1 限制连接数

防止过多的 WebSocket 连接导致内存耗尽：

```typescript
// src/server/websocket-server.ts
const MAX_WS_CONNECTIONS = 100;

if (connections.size >= MAX_WS_CONNECTIONS) {
  const errorMsg = {
    type: 'error',
    code: 4029,
    message: '服务器连接数已达上限',
  };
  ws.send(JSON.stringify(errorMsg));
  ws.close(4029, '连接数超限');
  return;
}
```

#### 5.2 优化心跳检测

调整心跳间隔，减少不必要的网络流量：

```typescript
// 根据连接数动态调整心跳间隔
const HEARTBEAT_INTERVAL = connections.size > 50 ? 60 * 1000 : 30 * 1000;
```

### 6. 请求限流

防止 DDoS 攻击或异常流量导致服务崩溃：

```typescript
// src/middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
}
```

### 7. 健康检查增强

增强健康检查接口，提供更详细的诊断信息：

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      usagePercent: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
    },
    database: await checkDatabaseHealth(),
    websocket: {
      connections: connections.size,
      status: globalServerStatus,
    },
    environment: process.env.NODE_ENV,
    version: '2.0.0',
  };

  // 如果内存使用率超过 90%，返回警告
  if (healthCheck.memory.usagePercent > 90) {
    healthCheck.status = 'warning';
    healthCheck.warning = '内存使用率过高';
  }

  return NextResponse.json(healthCheck);
}
```

### 8. 生产环境部署建议

#### 8.1 使用 PM2 管理进程

PM2 是一个流行的 Node.js 进程管理器，提供自动重启、负载均衡等功能：

```bash
# 安装 PM2
npm install -g pm2

# 创建 ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'workbot',
    script: './node_modules/.bin/tsx',
    args: 'server.ts',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs workbot

# 设置开机自启
pm2 startup
pm2 save
```

#### 8.2 使用 Nginx 反向代理

使用 Nginx 作为反向代理，提供负载均衡和缓存：

```nginx
upstream workbot {
    server localhost:5000;
    # 如果有多个实例，可以添加更多服务器
    # server localhost:5001;
    # server localhost:5002;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # 客户端上传文件大小限制
    client_max_body_size 10M;

    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # 健康检查
    location /health {
        proxy_pass http://workbot/api/health;
        access_log off;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://workbot;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # HTTP 请求
    location / {
        proxy_pass http://workbot;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 立即行动

### 快速修复（5分钟）

1. **启动自动恢复脚本**
   ```bash
   cd /workspace/projects
   nohup bash scripts/recovery.sh > /app/work/logs/bypass/recovery.log 2>&1 &
   ```

2. **启动监控脚本**
   ```bash
   cd /workspace/projects
   nohup bash scripts/monitor.sh > /app/work/logs/bypass/monitor.log 2>&1 &
   ```

3. **验证服务状态**
   ```bash
   bash scripts/diagnose.sh
   ```

### 短期优化（1小时）

1. **增加 Node.js 内存限制**
2. **优化数据库连接池配置**
3. **配置日志轮转**
4. **添加数据库索引**

### 长期优化（1周）

1. **使用 PM2 管理进程**
2. **配置 Nginx 反向代理**
3. **实现请求限流**
4. **优化慢查询**
5. **设置监控告警**

## 监控建议

定期运行诊断脚本检查服务状态：

```bash
# 每小时检查一次
0 * * * * /workspace/projects/scripts/diagnose.sh >> /app/work/logs/bypass/diagnose_hourly.log 2>&1

# 每天生成报告
0 0 * * * /workspace/projects/scripts/diagnose.sh >> /app/work/logs/bypass/diagnose_daily_$(date +\%Y\%m\%d).log 2>&1
```

## 总结

当前服务主要问题是内存使用率较高，可能导致服务不稳定。建议：

1. ✅ 立即启动自动恢复和监控脚本
2. ✅ 增加 Node.js 内存限制
3. ✅ 优化数据库连接池配置
4. ✅ 配置日志轮转
5. ✅ 长期使用 PM2 和 Nginx 进行生产部署

这些优化措施将显著提高服务的稳定性和可靠性。
