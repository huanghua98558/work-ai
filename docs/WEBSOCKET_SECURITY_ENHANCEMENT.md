# WebSocket 安全增强实施总结

## 概述

本次实施完成了 **阶段二：WebSocket 安全增强**，主要改进了心跳处理、超时警告和连接管理机制。

---

## 一、改进内容

### 1.1 添加心跳 ACK 确认机制

#### 问题描述
- 原来客户端发送心跳后，服务端不回复确认
- 客户端无法确认服务端是否收到心跳
- 无法及时发现网络问题

#### 解决方案
- 在 `WSMessageType` 中添加 `HEARTBEAT_ACK` 类型
- 服务端收到心跳后，立即回复 ACK 消息
- ACK 消息包含：
  - `serverTime`: 服务器时间
  - `nextHeartbeat`: 下次心跳时间
  - `receivedAt`: 接收时间

#### 代码修改

**types.ts**
```typescript
// 添加心跳 ACK 消息类型
export enum WSMessageType {
  // ...
  HEARTBEAT_ACK = 'heartbeat_ack',
  HEARTBEAT_WARNING = 'heartbeat_warning',
}

export interface HeartbeatAckData {
  serverTime: number;
  nextHeartbeat: number;
  receivedAt: number;
}

export interface HeartbeatAckMessage extends WSMessage {
  type: WSMessageType.HEARTBEAT_ACK;
  data: HeartbeatAckData;
}
```

**message-handler.ts**
```typescript
// 在 handleHeartbeat 中添加 ACK 响应
this.sendMessage(connection, {
  type: WSMessageType.HEARTBEAT_ACK,
  data: {
    serverTime: Date.now(),
    nextHeartbeat: Date.now() + 30 * 1000,
    receivedAt: Date.now(),
  },
  timestamp: Date.now(),
});
```

#### 优势
- ✅ 客户端可以确认心跳已送达
- ✅ 可以计算网络延迟（serverTime - receivedAt）
- ✅ 可以同步时间（使用 serverTime 校准本地时间）

---

### 1.2 实现心跳超时警告机制

#### 问题描述
- 原来心跳超时后直接断开连接
- 客户端没有警告信息
- 无法提前处理网络问题

#### 解决方案
- 在超时前 10 秒发送警告消息
- 警告消息类型：`HEARTBEAT_WARNING`
- 包含剩余时间、最后心跳时间等信息

#### 代码修改

**types.ts**
```typescript
export interface HeartbeatWarningData {
  warningType: 'timeout_soon' | 'last_heartbeat_missed';
  remainingTime?: number;
  lastHeartbeatAt?: number;
  timeoutTime?: number;
}

export interface HeartbeatWarningMessage extends WSMessage {
  type: WSMessageType.HEARTBEAT_WARNING;
  data: HeartbeatWarningData;
}
```

**message-handler.ts**
```typescript
// 添加发送心跳警告的方法
sendHeartbeatWarning(
  connection: WebSocketConnection,
  warningType: 'timeout_soon' | 'last_heartbeat_missed',
  remainingTime?: number,
  lastHeartbeatAt?: number
): void {
  this.sendMessage(connection, {
    type: WSMessageType.HEARTBEAT_WARNING,
    data: {
      warningType,
      remainingTime,
      lastHeartbeatAt,
      timeoutTime: lastHeartbeatAt ? lastHeartbeatAt + 60 * 1000 : undefined,
    },
    timestamp: Date.now(),
  });
}
```

**websocket-server-v3.ts**
```typescript
// 心跳检测逻辑中添加警告
const WARNING_THRESHOLD = 50 * 1000; // 50秒警告

if (elapsed > WARNING_THRESHOLD && elapsed < HEARTBEAT_TIMEOUT) {
  const remainingTime = HEARTBEAT_TIMEOUT - elapsed;
  messageHandler.sendHeartbeatWarning(
    connection,
    'timeout_soon',
    remainingTime,
    connection.lastHeartbeatAt.getTime()
  );
}
```

#### 优势
- ✅ 提前 10 秒警告，给客户端处理时间
- ✅ 客户端可以尝试重新连接或发送保活包
- ✅ 改善用户体验，减少意外断开

---

### 1.3 优化超时断开逻辑

#### 问题描述
- 原来超时断开逻辑简单，缺少详细日志
- 没有统计信息
- 清理逻辑不够完善

#### 解决方案
- 添加详细的日志和统计信息
- 优化超时检测逻辑
- 添加心跳统计功能

#### 代码修改

**websocket-server-v3.ts**
```typescript
// 改进的心跳检测
function startHeartbeatCheck() {
  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    const connections = connectionManager.getAuthenticatedConnections();
    const warningConnections: any[] = [];
    const timeoutConnections: any[] = [];

    // 检查所有连接
    for (const connection of connections) {
      const elapsed = now - connection.lastHeartbeatAt.getTime();

      // 发送警告
      if (elapsed > WARNING_THRESHOLD && elapsed < HEARTBEAT_TIMEOUT) {
        warningConnections.push({ robotId: connection.robotId, elapsed });
        // ...
      }

      // 检查超时
      if (elapsed >= HEARTBEAT_TIMEOUT) {
        timeoutConnections.push({ robotId: connection.robotId, elapsed });
        // ...
      }
    }

    // 清理超时连接
    if (timeoutConnections.length > 0) {
      for (const timeout of timeoutConnections) {
        // 发送错误消息
        sendError(connection.ws, 1000, '心跳超时，连接已断开', {
          elapsed: timeout.elapsed,
          lastHeartbeatAt: timeout.stats?.lastHeartbeatAt,
        });

        // 断开连接
        connection.ws.close(1000, '心跳超时');
      }
    }

    // 记录统计日志
    console.log(
      `[WebSocket] 心跳检测: ${connections.length} 个活跃连接` +
      (warningConnections.length > 0 ? `, ${warningConnections.length} 个即将超时` : '') +
      (timeoutConnections.length > 0 ? `, ${timeoutConnections.length} 个已超时` : '')
    );
  }, HEARTBEAT_INTERVAL);
}
```

**connection-manager.ts**
```typescript
// 优化超时清理
cleanupTimeoutConnections(timeoutMs: number = 60 * 1000): number {
  const now = Date.now();
  const toRemove: WebSocket[] = [];
  const timeoutInfo: Array<{ robotId: string; elapsed: number }> = [];

  for (const [ws, connection] of this.connections.entries()) {
    if (!connection.lastHeartbeatAt) continue;

    const elapsed = now - connection.lastHeartbeatAt.getTime();
    if (elapsed > timeoutMs) {
      toRemove.push(ws);
      timeoutInfo.push({ robotId: connection.robotId || 'unknown', elapsed });
    }
  }

  // 关闭超时连接
  toRemove.forEach(ws => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Connection timeout');
      }
    } catch (error) {
      console.error('[ConnectionManager] 关闭超时连接失败:', error);
    }
  });

  // 记录清理日志
  if (toRemove.length > 0) {
    const totalTimeout = timeoutInfo.reduce((sum, info) => sum + info.elapsed, 0);
    const avgTimeout = totalTimeout / timeoutInfo.length;

    console.log(
      `[ConnectionManager] 清理了 ${toRemove.length} 个超时连接, ` +
      `平均超时时间: ${Math.round(avgTimeout / 1000)}秒, ` +
      `总连接数: ${this.connections.size}`
    );
  }

  return toRemove.length;
}

// 添加心跳统计
getHeartbeatStats(): {
  totalConnections: number;
  authenticatedConnections: number;
  activeConnections: number;
  warningConnections: number;
  timeoutConnections: number;
} {
  const now = Date.now();
  const connections = this.getAuthenticatedConnections();
  const WARNING_THRESHOLD = 50 * 1000;
  const TIMEOUT_THRESHOLD = 60 * 1000;

  let activeConnections = 0;
  let warningConnections = 0;
  let timeoutConnections = 0;

  for (const connection of connections) {
    if (!connection.lastHeartbeatAt) continue;

    const elapsed = now - connection.lastHeartbeatAt.getTime();

    if (elapsed < WARNING_THRESHOLD) {
      activeConnections++;
    } else if (elapsed < TIMEOUT_THRESHOLD) {
      warningConnections++;
    } else {
      timeoutConnections++;
    }
  }

  return {
    totalConnections: this.connections.size,
    authenticatedConnections: connections.length,
    activeConnections,
    warningConnections,
    timeoutConnections,
  };
}
```

#### 优势
- ✅ 详细的日志和统计信息
- ✅ 更好的错误处理
- ✅ 实时监控连接状态

---

### 1.4 添加心跳统计功能

#### 新增功能

**message-handler.ts**
```typescript
// 获取心跳统计信息
getHeartbeatStats(connection: WebSocketConnection): {
  robotId: string;
  lastHeartbeatAt: Date | undefined;
  timeSinceLastHeartbeat: number;
  isTimeout: boolean;
} | null {
  if (!connection.robotId) {
    return null;
  }

  const now = Date.now();
  const lastHeartbeatAt = connection.lastHeartbeatAt;
  const timeSinceLastHeartbeat = lastHeartbeatAt
    ? now - lastHeartbeatAt.getTime()
    : Infinity;

  return {
    robotId: connection.robotId,
    lastHeartbeatAt,
    timeSinceLastHeartbeat,
    isTimeout: timeSinceLastHeartbeat > 60 * 1000,
  };
}
```

**connection-manager.ts**
```typescript
// 获取全局心跳统计
getHeartbeatStats(): {
  totalConnections: number;
  authenticatedConnections: number;
  activeConnections: number;
  warningConnections: number;
  timeoutConnections: number;
}
```

#### 使用示例
```typescript
// 获取单个连接的统计
const stats = messageHandler.getHeartbeatStats(connection);
console.log(`最后心跳: ${stats.lastHeartbeatAt}`);
console.log(`距离上次心跳: ${Math.round(stats.timeSinceLastHeartbeat / 1000)}秒`);
console.log(`是否超时: ${stats.isTimeout}`);

// 获取全局统计
const globalStats = connectionManager.getHeartbeatStats();
console.log(`总连接数: ${globalStats.totalConnections}`);
console.log(`活跃连接: ${globalStats.activeConnections}`);
console.log(`警告连接: ${globalStats.warningConnections}`);
console.log(`超时连接: ${globalStats.timeoutConnections}`);
```

---

### 1.5 实现 WebSocket 客户端自动重连

#### 功能特性

**examples/websocket-client-example.ts**

```typescript
export class WSClient {
  // 自动重连
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // 配置
  private config: Required<WSClientConfig> = {
    heartbeatInterval: 30000, // 30秒心跳
    maxReconnectAttempts: 5,  // 最多重连5次
    reconnectDelay: 5000,     // 重连延迟5秒
    enableAutoReconnect: true, // 启用自动重连
  };

  // 连接
  connect(): void {
    this.ws = new WebSocket(this.config.url);

    this.ws.onclose = (event) => {
      // 自动重连
      if (this.config.enableAutoReconnect && event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  // 安排重连（指数退避）
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * this.reconnectAttempts;

    this.log(`${delay / 1000}秒后重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // 心跳
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      }
    }, this.config.heartbeatInterval);
  }
}
```

#### 使用示例
```typescript
const client = new WSClient({
  url: 'ws://localhost:5000/ws',
  robotId: 'robot123',
  token: 'your-jwt-token',
  debug: true,
});

// 监听事件
client.on('open', () => console.log('✅ 已连接'));
client.on('authenticated', () => console.log('✅ 认证成功'));
client.on('heartbeat_ack', (data) => console.log('💓 心跳 ACK', data));
client.on('heartbeat_warning', (data) => console.warn('⚠️ 心跳警告', data));
client.on('reconnecting', (data) => console.log('🔄 重连中', data));
client.on('reconnect_failed', () => console.error('❌ 重连失败'));

// 启动连接
client.connect();
```

#### 优势
- ✅ 自动重连（指数退避）
- ✅ 事件驱动架构
- ✅ 完整的心跳机制
- ✅ 详细的日志输出

---

## 二、心跳流程对比

### 改进前
```
客户端 (30s)                              服务端 (30s)
    │                                         │
    ├─ heartbeat ──────────────────────────→ │
    │                                         │ 更新最后心跳时间
    │                                         │ 检测超时连接
    │                                         │
    │ (60秒后超时)                             │
    │                                         │
    │          ←── CLOSE (1000) ──────────────┤
    │ (无警告，直接断开)                       │
```

### 改进后
```
客户端 (30s)                              服务端 (30s)
    │                                         │
    ├─ heartbeat ──────────────────────────→ │
    │                                         │ 更新最后心跳时间
    │          ←── ACK (可选) ───────────────┤
    │                                         │
    ├─ heartbeat ──────────────────────────→ │
    │          ←── ACK (可选) ───────────────┤
    │                                         │
    │ (50秒后，即将超时)                       │
    │          ←── WARNING ───────────────────┤
    │ (剩余10秒)                               │
    │                                         │
    │ (尝试发送保活包或重新连接)               │
    │                                         │
    ├─ heartbeat ──────────────────────────→ │
    │          ←── ACK (可选) ───────────────┤
    │ (恢复正常)                               │
    │                                         │
    │ (如果60秒后仍超时)                       │
    │          ←── ERROR (1000) ──────────────┤
    │          ←── CLOSE (1000) ──────────────┤
    │ (自动重连)                               │
```

---

## 三、监控和统计

### 3.1 实时监控 API

```typescript
// 获取连接统计
const stats = connectionManager.getHeartbeatStats();

// 返回结果
{
  totalConnections: 10,        // 总连接数
  authenticatedConnections: 8, // 已认证连接数
  activeConnections: 6,        // 活跃连接（< 50秒）
  warningConnections: 1,       // 警告连接（50-60秒）
  timeoutConnections: 1,       // 超时连接（> 60秒）
}
```

### 3.2 单个连接统计

```typescript
const stats = messageHandler.getHeartbeatStats(connection);

// 返回结果
{
  robotId: 'robot123',
  lastHeartbeatAt: Date(2026-02-09T10:00:00.000Z),
  timeSinceLastHeartbeat: 35000, // 35秒
  isTimeout: false
}
```

### 3.3 监控接口

可以添加监控接口，供前端调用：

```typescript
// src/app/api/websocket/monitor/route.ts
export async function GET(request: NextRequest) {
  const stats = connectionManager.getHeartbeatStats();

  return successResponse({
    ...stats,
    timestamp: Date.now(),
  });
}
```

前端调用：
```typescript
const response = await fetch('/api/websocket/monitor');
const data = await response.json();

console.log('活跃连接:', data.data.activeConnections);
console.log('警告连接:', data.data.warningConnections);
```

---

## 四、使用建议

### 4.1 客户端实现建议

1. **处理心跳 ACK**
```typescript
client.on('heartbeat_ack', (data) => {
  // 计算网络延迟
  const latency = Date.now() - data.receivedAt;
  console.log(`网络延迟: ${latency}ms`);

  // 同步时间
  const timeOffset = data.serverTime - Date.now();
  console.log(`时间偏差: ${timeOffset}ms`);
});
```

2. **处理心跳警告**
```typescript
client.on('heartbeat_warning', (data) => {
  console.warn(`心跳警告: 剩余 ${data.remainingTime / 1000} 秒`);

  // 尝试发送保活包
  client.sendHeartbeat();
});
```

3. **处理重连事件**
```typescript
client.on('reconnecting', (data) => {
  console.log(`正在重连: ${data.attempt}/${data.maxAttempts}`);

  // 显示重连提示
  showNotification(`正在重连... (${data.attempt}/${data.maxAttempts})`);
});

client.on('reconnect_failed', () => {
  console.error('重连失败');

  // 显示错误提示
  showNotification('重连失败，请检查网络连接', 'error');
});
```

### 4.2 服务端配置建议

```typescript
// 根据业务场景调整参数
const config = {
  HEARTBEAT_INTERVAL: 30 * 1000,  // 30秒（适合大多数场景）
  HEARTBEAT_TIMEOUT: 60 * 1000,   // 60秒（建议是心跳间隔的2倍）
  WARNING_THRESHOLD: 50 * 1000,   // 50秒（提前10秒警告）
  MAX_CONNECTIONS: 100,            // 最大连接数
};
```

---

## 五、测试建议

### 5.1 心跳测试

```typescript
// 测试正常心跳
- 客户端发送心跳
- 服务端回复 ACK
- 检查延迟和统计

// 测试心跳超时
- 停止发送心跳
- 等待50秒，检查是否收到警告
- 等待60秒，检查是否断开连接

// 测试自动重连
- 手动断开连接
- 检查是否自动重连
- 检查重连延迟（指数退避）
```

### 5.2 压力测试

```typescript
// 测试多连接
- 创建100个连接
- 检查心跳统计
- 检查性能

// 测试超时清理
- 创建10个连接
- 让其中5个超时
- 检查清理逻辑
```

---

## 六、总结

### 改进成果

1. ✅ **心跳 ACK 确认机制**
   - 服务端回复心跳确认
   - 客户端可以确认心跳送达
   - 可以计算网络延迟

2. ✅ **心跳超时警告**
   - 提前10秒发送警告
   - 客户端有时间处理
   - 改善用户体验

3. ✅ **优化超时断开**
   - 详细的日志和统计
   - 更好的错误处理
   - 实时监控连接状态

4. ✅ **心跳统计功能**
   - 单个连接统计
   - 全局连接统计
   - 实时监控

5. ✅ **客户端自动重连**
   - 指数退避策略
   - 事件驱动架构
   - 完整的示例代码

### 下一步

- [ ] 添加 WebSocket 监控页面
- [ ] 实现连接质量评估
- [ ] 添加连接数动态限制
- [ ] 实现连接优先级管理
- [ ] 添加连接质量告警

---

*文档版本: 1.0*
*最后更新: 2026-02-09*
