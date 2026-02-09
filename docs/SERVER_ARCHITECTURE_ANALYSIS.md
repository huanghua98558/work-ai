# WorkBot 服务器架构分析与安全增强方案

## 一、当前架构分析

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Admin Web  │  │   User Web   │  │ WorkTool App │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   HTTP Server (5000)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Next.js (App Router)                  │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │   │
│  │  │  API    │  │  Pages  │  │ Static  │         │   │
│  │  └─────────┘  └─────────┘  └─────────┘         │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │         WebSocket Server (v3.0)                 │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────┐  │   │
│  │  │Connection  │  │   Message  │  │ Command  │  │   │
│  │  │  Manager   │  │  Handler   │  │  Queue   │  │   │
│  │  └────────────┘  └────────────┘  └──────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ PostgreSQL   │  │   Redis      │  │   File       │  │
│  │   (Primary)  │  │  (Cache)     │  │  (Logs)      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心组件

#### 1.2.1 HTTP Server (Next.js)
- **端口**: 5000
- **框架**: Next.js 15.5.12 (App Router)
- **功能**:
  - 提供管理后台界面
  - 提供 REST API 接口
  - 处理用户认证和授权

#### 1.2.2 WebSocket Server (v3.0)
- **端口**: 5000 (同 HTTP)
- **路径**: `/ws`
- **功能**:
  - 与 WorkTool App 保持长连接
  - 实时推送指令和配置
  - 接收设备状态和心跳
  - 心跳间隔: 30秒
  - 心跳超时: 60秒
  - 认证超时: 30秒

#### 1.2.3 Connection Manager
- **功能**:
  - 管理所有 WebSocket 连接
  - 维护 robotId 到连接的映射
  - 检测和清理超时连接
  - 广播消息

#### 1.2.4 Message Handler
- **功能**:
  - 处理各种类型的消息
  - 认证验证
  - 心跳处理
  - 指令执行结果处理

#### 1.2.5 Command Queue
- **功能**:
  - 管理待执行的指令
  - 指令优先级排序
  - 指令状态跟踪
  - 定期清理已完成指令

### 1.3 认证流程

#### 1.3.1 用户登录
```
用户 → POST /api/auth/login
    → 验证手机号和密码
    → 生成 JWT Token (Access: 30天, Refresh: 90天)
    → 返回 Token
    → 保存到 localStorage
```

#### 1.3.2 WorkTool 连接认证
```
WorkTool → WebSocket /ws
    → 发送 authenticate 消息
    → 验证 JWT Token
    → 查询 device_activations 表
    → 返回 authenticated 消息
    → 推送待处理指令
```

### 1.4 心跳机制

#### 1.4.1 客户端心跳
- **间隔**: 30秒
- **消息类型**: `heartbeat`
- **数据**:
  - robotId
  - status (running/idle/error)
  - battery
  - signal
  - memoryUsage
  - cpuUsage
  - networkType

#### 1.4.2 服务端心跳检测
- **间隔**: 30秒
- **超时时间**: 60秒
- **处理**:
  - 检查所有连接的最后心跳时间
  - 超过 60秒的连接会被断开
  - 清理超时连接

### 1.5 当前安全措施

#### 1.5.1 已实现
1. ✅ JWT Token 认证
2. ✅ 密码 bcrypt 加密
3. ✅ HTTPS 支持
4. ✅ 用户角色区分 (admin/user)
5. ✅ WebSocket 连接数限制 (100)
6. ✅ 认证超时 (30秒)
7. ✅ 心跳超时 (60秒)

#### 1.5.2 未实现
1. ❌ Token 黑名单机制
2. ❌ 请求频率限制
3. ❌ IP 白名单/黑名单
4. ❌ Token 刷新机制（前端）
5. ❌ 防止重放攻击
6. ❌ WebSocket 连接加密
7. ❌ 敏感操作二次验证
8. ❌ 审计日志

---

## 二、问题分析与解决方案

### Q1: 如何验证 Token 是否有效？

#### 当前问题
- 后端使用 `jwt.verify()` 验证 Token
- 前端没有统一的 Token 验证机制
- 无法判断 Token 是否即将过期
- 无法检测 Token 是否被撤销

#### 解决方案

##### 1. 后端 Token 验证中间件
```typescript
// src/lib/auth-middleware.ts
export async function verifyAccessToken(
  token: string
): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JWTPayload;

    // 检查 Token 是否在黑名单中
    if (TokenBlacklist.isBlacklisted(token)) {
      return { valid: false, error: 'Token 已失效' };
    }

    return { valid: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token 已过期' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Token 无效' };
    }
    return { valid: false, error: 'Token 验证失败' };
  }
}
```

##### 2. 前端 Token 验证
```typescript
// 使用之前创建的 api-client.ts
import { validateToken, TokenManager, getUserInfoFromToken } from '@/lib/api-client';

// 验证 Token 是否有效
const isValid = validateToken();

// 获取用户信息
const userInfo = getUserInfoFromToken();

// 检查 Token 是否即将过期（5分钟内）
const isExpiring = TokenManager.isTokenExpiringSoon();
```

##### 3. API 中间件自动验证
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth-middleware';

export async function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = await verifyAccessToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // 将用户信息添加到请求头
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(result.payload!.userId));
    requestHeaders.set('x-user-role', result.payload!.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}
```

---

### Q2: Token 过期怎么办？

#### 当前问题
- Access Token 有效期 30天
- Refresh Token 有效期 90天
- 前端没有自动刷新机制
- Token 过期后用户需要重新登录

#### 解决方案

##### 1. Token 刷新策略
```
┌─────────────────────────────────────────┐
│  Token 有效期管理                        │
├─────────────────────────────────────────┤
│  Access Token: 30天                     │
│  Refresh Token: 90天                    │
│  自动刷新: 5分钟内过期                  │
├─────────────────────────────────────────┤
│  刷新时机:                               │
│  1. API 返回 401                        │
│  2. Token 即将过期（5分钟内）           │
│  3. 用户主动触发（如刷新页面）           │
└─────────────────────────────────────────┘
```

##### 2. 前端自动刷新（已实现）
```typescript
// src/lib/api-client.ts 已实现
// 1. 检测 401 错误
// 2. 使用 Refresh Token 刷新
// 3. 重试失败的请求
// 4. 刷新失败时跳转登录页
```

##### 3. 主动刷新机制
```typescript
// 在应用启动时检查 Token
useEffect(() => {
  const checkTokenExpiry = () => {
    if (TokenManager.isTokenExpiringSoon()) {
      console.log('[App] Token 即将过期，主动刷新...');
      apiClient.refreshAccessToken();
    }
  };

  checkTokenExpiry();

  // 每分钟检查一次
  const interval = setInterval(checkTokenExpiry, 60000);
  return () => clearInterval(interval);
}, []);
```

##### 4. 优雅降级
```typescript
// Token 刷新失败时的处理
if (!newToken) {
  // 1. 清除本地 Token
  TokenManager.clearTokens();

  // 2. 显示提示
  toast.error('登录已过期，请重新登录');

  // 3. 延迟跳转（给用户时间看到提示）
  setTimeout(() => {
    window.location.href = '/login';
  }, 2000);

  return { success: false, error: '登录已过期' };
}
```

---

### Q3: 心跳超时会怎样？

#### 当前问题
- 客户端每 30 秒发送一次心跳
- 服务端每 30 秒检测一次
- 超时时间 60 秒
- 超时后断开连接，但没有通知
- 断开后没有自动重连机制

#### 解决方案

##### 1. 当前心跳流程
```
客户端 (30s)                              服务端 (30s)
    │                                         │
    ├─ heartbeat ──────────────────────────→ │
    │                                         │ 检测所有连接
    │                                         │ lastHeartbeatAt
    │                                         │
    │          ←── ACK (可选) ───────────────┤
    │                                         │
    ├─ heartbeat ──────────────────────────→ │
    │                                         │ 清理超时连接
    │                                         │ (>60s)
    │                                         │
    │ (超时)                                   │
    │                                         │
    │          ←── CLOSE (1000) ──────────────┤
```

##### 2. 改进的心跳处理
```typescript
// src/server/websocket/message-handler.ts
private async handleHeartbeat(
  message: WSMessage,
  connection: WebSocketConnection
): Promise<void> {
  // 更新最后心跳时间
  connection.lastHeartbeatAt = new Date();

  // 更新设备状态到数据库
  // ...

  // 回复心跳（客户端可以确认收到）
  this.sendMessage(connection, {
    type: WSMessageType.HEARTBEAT_ACK,
    data: {
      serverTime: Date.now(),
      nextHeartbeat: Date.now() + 30 * 1000,
    },
    timestamp: Date.now(),
  });
}
```

##### 3. 超时前的警告
```typescript
// src/server/websocket-server-v3.ts
function startHeartbeatCheck() {
  setInterval(() => {
    const now = Date.now();
    const warningThreshold = 50 * 1000; // 50秒

    for (const connection of connectionManager.getAuthenticatedConnections()) {
      if (!connection.lastHeartbeatAt) continue;

      const elapsed = now - connection.lastHeartbeatAt.getTime();

      // 发送警告消息（剩余10秒）
      if (elapsed > warningThreshold && elapsed < HEARTBEAT_TIMEOUT) {
        sendWarning(connection, '心跳即将超时，请检查网络连接');
      }

      // 超时断开
      if (elapsed > HEARTBEAT_TIMEOUT) {
        console.log(`[WebSocket] 心跳超时: ${connection.robotId}`);
        sendError(connection, 1000, '心跳超时');
        connection.ws.close(1000, '心跳超时');
        connectionManager.removeConnection(connection.ws);
      }
    }
  }, HEARTBEAT_INTERVAL);
}
```

##### 4. 客户端自动重连
```typescript
// 客户端 (WorkTool App) 实现示例
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5秒

  connect() {
    this.ws = new WebSocket('ws://localhost:5000/ws');

    this.ws.onopen = () => {
      console.log('[WebSocket] 连接成功');
      this.reconnectAttempts = 0;
      this.authenticate();
    };

    this.ws.onclose = (event) => {
      console.log('[WebSocket] 连接关闭:', event.code, event.reason);

      // 自动重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`[WebSocket] ${this.reconnectDelay/1000}秒后重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.connect(), this.reconnectDelay);
      } else {
        console.error('[WebSocket] 重连失败，停止尝试');
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] 连接错误:', error);
    };

    // 启动心跳
    this.startHeartbeat();
  }

  startHeartbeat() {
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'heartbeat',
          data: {
            status: 'running',
            timestamp: Date.now(),
          },
        }));
      }
    }, 30000);
  }

  authenticate() {
    // 发送认证消息
    this.ws?.send(JSON.stringify({
      type: 'authenticate',
      data: {
        robotId: 'robot123',
        token: 'your-jwt-token',
      },
    }));
  }
}
```

---

### Q4: 如何提高安全性？

#### 安全增强方案

##### 1. Token 黑名单机制 ✅（已实现）
```typescript
// src/lib/middleware.ts
export class TokenBlacklist {
  static add(token: string): void {
    // 将失效的 Token 加入黑名单
  }

  static isBlacklisted(token: string): boolean {
    // 检查 Token 是否在黑名单中
  }

  static cleanup(): void {
    // 定期清理过期记录
  }
}
```

##### 2. 请求频率限制 ✅（已实现）
```typescript
// src/lib/middleware.ts
export class RateLimiter {
  // 全局限制：每分钟100次
  static globalRateLimiter = new RateLimiter(100, 60000);

  // 登录限制：每分钟5次
  static authRateLimiter = new RateLimiter(5, 60000);

  // API限制：每分钟60次
  static apiRateLimiter = new RateLimiter(60, 60000);
}
```

##### 3. IP 白名单/黑名单 ✅（已实现）
```typescript
// src/lib/middleware.ts
export class IpWhitelist {
  static add(ip: string): void;
  static remove(ip: string): void;
  static isAllowed(ip: string): boolean;
}
```

##### 4. 密码强度验证 ✅（已实现）
```typescript
// src/lib/middleware.ts
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  feedback: string[];
}
```

##### 5. HTTPS 强制
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};
```

##### 6. CSRF 保护
```typescript
// 使用 double-submit cookie pattern
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string): boolean {
  // 验证 CSRF Token
}
```

##### 7. SQL 注入防护
```typescript
// 使用参数化查询（已实现）
const result = await client.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
```

##### 8. XSS 防护
```typescript
// Next.js 默认转义 JSX
// 手动转义
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

##### 9. 敏感数据脱敏 ✅（已实现）
```typescript
// src/lib/middleware.ts
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  // 隐藏中间部分，只显示前后几位
  // 例如：138****5678
}
```

##### 10. 审计日志
```typescript
// src/lib/audit-logger.ts
export class AuditLogger {
  static log(action: string, userId: number, details: any): void {
    // 记录审计日志到数据库
  }

  static async query(filters: any): Promise<AuditLog[]> {
    // 查询审计日志
  }
}
```

##### 11. WebSocket 安全
```typescript
// 强制使用 WSS (WebSocket Secure)
const wss = new WebSocketServer({
  server,
  verifyClient: async (info, cb) => {
    // 验证来源
    const origin = info.origin;
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return cb(false, 403, 'Origin not allowed');
    }

    // 验证 Token
    const token = info.req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      return cb(false, 401, 'Token required');
    }

    const result = await verifyAccessToken(token);
    if (!result.valid) {
      return cb(false, 401, result.error!);
    }

    cb(true);
  },
});
```

##### 12. 速率限制（Rate Limiting）
```typescript
// 使用 redis-py-rate-limit 或类似库
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rate_limit',
  points: 100, // 100次
  duration: 60, // 每分钟
});

// 在每个请求前检查
try {
  await rateLimiter.consume(ipAddress);
} catch (rejRes) {
  throw new Error('Too many requests');
}
```

---

## 三、实施计划

### 阶段一：基础安全增强（1-2天）
1. ✅ 实现统一的 API 客户端（自动 Token 刷新）
2. ✅ 实现 Token 黑名单机制
3. ✅ 实现请求频率限制
4. ✅ 实现密码强度验证
5. ✅ 实现敏感数据脱敏

### 阶段二：WebSocket 安全增强（1天）
6. ✅ 改进心跳超时处理
7. ✅ 实现心跳警告机制
8. ✅ 实现 WebSocket 自动重连（客户端）

### 阶段三：高级安全措施（2-3天）
9. 🔄 实现 IP 白名单/黑名单
10. 🔄 实现 CSRF 保护
11. 🔄 实现审计日志
12. 🔄 实现 WebSocket 验证中间件

### 阶段四：监控和告警（1-2天）
13. 🔄 实现安全事件监控
14. 🔄 实现告警通知
15. 🔄 实现安全报告生成

---

## 四、最佳实践

### 4.1 Token 管理
- ✅ Access Token 短期有效（30分钟 - 2小时）
- ✅ Refresh Token 长期有效（7天 - 30天）
- ✅ 自动刷新机制
- ✅ Token 黑名单
- ✅ 安全存储（HttpOnly Cookie）

### 4.2 连接管理
- ✅ 心跳检测（30秒间隔）
- ✅ 超时处理（60秒）
- ✅ 自动重连
- ✅ 连接数限制
- ✅ 连接状态监控

### 4.3 数据安全
- ✅ 密码 bcrypt 加密
- ✅ HTTPS/WSS 加密传输
- ✅ 参数化查询（防SQL注入）
- ✅ XSS 防护
- ✅ 敏感数据脱敏

### 4.4 监控和审计
- ✅ 请求日志
- ✅ 错误日志
- ✅ 审计日志
- ✅ 性能监控
- ✅ 安全告警

---

## 五、总结

### 当前状态
- ✅ 已实现基础认证机制
- ✅ 已实现心跳检测
- ✅ 已实现基本安全措施

### 需要改进
- 🔄 Token 自动刷新
- 🔄 Token 黑名单
- 🔄 请求频率限制
- 🔄 心跳超时警告
- 🔄 自动重连
- 🔄 审计日志
- 🔄 CSRF 保护

### 安全等级评估
- **当前等级**: 中等
- **目标等级**: 高
- **预计完成时间**: 5-7天

---

*文档版本: 1.0*
*最后更新: 2026-02-09*
