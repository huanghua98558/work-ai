# 仪表盘数据真实性分析报告

## 概述

本文档分析仪表盘页面各个组件的数据来源，标识哪些显示真实数据，哪些是硬编码或暂不可用。

## 数据来源分析

### ✅ 真实数据组件

#### 1. 机器人总数
- **API**: `/api/dashboard/stats`
- **数据字段**: `totalRobots`
- **查询**: `SELECT COUNT(*) as total FROM robots WHERE status != 'deleted'`
- **状态**: ✅ 真实数据

#### 2. 激活码数量
- **API**: `/api/dashboard/stats`
- **数据字段**: `totalActivationCodes`
- **查询**: `SELECT COUNT(*) as total FROM activation_codes`
- **状态**: ✅ 真实数据

#### 3. 未使用激活码
- **API**: `/api/dashboard/stats`
- **数据字段**: `unusedActivationCodes`
- **查询**: `COUNT(CASE WHEN status = 'unused' THEN 1 END)`
- **状态**: ✅ 真实数据

#### 4. 已使用激活码
- **API**: `/api/dashboard/stats`
- **数据字段**: `usedActivationCodes`
- **查询**: `COUNT(CASE WHEN status = 'used' THEN 1 END)`
- **状态**: ✅ 真实数据

#### 5. 已过期激活码
- **API**: `/api/dashboard/stats`
- **数据字段**: `expiredActivationCodes`
- **查询**: `COUNT(CASE WHEN status = 'expired' THEN 1 END)`
- **状态**: ✅ 真实数据

#### 6. 在线机器人
- **API**: `/api/dashboard/stats`
- **数据字段**: `activeRobots`
- **查询**: `SELECT COUNT(*) as total FROM robots WHERE status = 'online'`
- **状态**: ✅ 真实数据

#### 7. WebSocket 连接数
- **API**: `/api/websocket/monitor`
- **数据字段**: `totalConnections`
- **实现**: `getConnectionCount()`
- **状态**: ✅ 真实数据（需要 WebSocket 服务器运行）

#### 8. WebSocket 在线机器人数
- **API**: `/api/websocket/monitor`
- **数据字段**: `onlineRobots.length`
- **实现**: `getOnlineRobots()`
- **状态**: ✅ 真实数据（需要 WebSocket 服务器运行）

#### 9. WebSocket 服务器状态
- **API**: `/api/websocket/monitor`
- **数据字段**: `serverStatus`
- **实现**: `getServerStatus()`
- **状态**: ✅ 真实数据（需要 WebSocket 服务器运行）

#### 10. 最近活跃的机器人列表
- **API**: `/api/dashboard/stats`
- **数据字段**: `recentRobots`
- **查询**: 从 robots 表查询，按 last_active_at 排序
- **状态**: ✅ 真实数据

#### 11. 最近创建的激活码列表
- **API**: `/api/dashboard/stats`
- **数据字段**: `recentActivationCodes`
- **查询**: 从 activation_codes 表查询，按 created_at 排序
- **状态**: ✅ 真实数据

---

### ❌ 硬编码数据组件

#### 1. 活跃用户数
- **显示值**: "28"
- **数据字段**: 前端硬编码
- **API 返回值**: `activeUsers: 0`（未实现）
- **位置**: 仪表盘统计卡片第 5 个
- **状态**: ❌ 硬编码

#### 2. 响应速度
- **显示值**: "1.2s"
- **数据字段**: 前端硬编码
- **API 返回值**: 无此字段
- **位置**: 仪表盘统计卡片第 6 个
- **状态**: ❌ 硬编码

---

### ⚠️ 暂不可用数据组件

#### 1. 对话总数
- **API**: `/api/dashboard/stats`
- **数据字段**: `totalConversations`
- **API 返回值**: `0`（注释：暂时不统计对话数）
- **查询**: 未实现
- **状态**: ⚠️ 暂不可用

#### 2. 消息总数
- **API**: `/api/dashboard/stats`
- **数据字段**: `totalMessages`
- **API 返回值**: `0`（注释：暂时不统计消息数）
- **查询**: 未实现
- **状态**: ⚠️ 暂不可用

#### 3. 今日消息数
- **API**: `/api/dashboard/stats`
- **数据字段**: `todayMessages`
- **API 返回值**: `0`（注释：暂时不统计今日消息数）
- **查询**: 未实现
- **状态**: ⚠️ 暂不可用

#### 4. 活跃用户数（API 返回）
- **API**: `/api/dashboard/stats`
- **数据字段**: `activeUsers`
- **API 返回值**: `0`（注释：暂时不统计活跃用户数）
- **查询**: 未实现
- **状态**: ⚠️ 暂不可用

#### 5. 最近对话列表
- **API**: `/api/dashboard/stats`
- **数据字段**: `recentConversations`
- **API 返回值**: `[]`（注释：暂时不返回对话列表）
- **查询**: 未实现
- **状态**: ⚠️ 暂不可用

---

## 改进建议

### 优先级 1: 修复硬编码数据

#### 1. 活跃用户数
**方案 A: 从 sessions 表统计**
```sql
SELECT COUNT(DISTINCT user_id)
FROM sessions
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND user_id IS NOT NULL
```

**方案 B: 从 users 表统计最后活跃时间**
```sql
SELECT COUNT(*)
FROM users
WHERE last_login_at >= NOW() - INTERVAL '7 days'
```

#### 2. 响应速度
**方案 A: 从 messages 表统计平均响应时间**
```sql
SELECT AVG(EXTRACT(EPOCH FROM (response_time - request_time))) as avg_response_time
FROM messages
WHERE request_time IS NOT NULL
  AND response_time IS NOT NULL
  AND response_time >= NOW() - INTERVAL '24 hours'
```

**方案 B: 从 logs 表统计 API 响应时间**
```sql
SELECT AVG(response_time) as avg_response_time
FROM logs
WHERE level = 'INFO'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND response_time IS NOT NULL
```

### 优先级 2: 实现暂不可用功能

#### 1. 对话总数
```sql
SELECT COUNT(*) as total
FROM sessions
WHERE status != 'deleted'
```

#### 2. 消息总数
```sql
SELECT COUNT(*) as total
FROM messages
WHERE status != 'deleted'
```

#### 3. 今日消息数
```sql
SELECT COUNT(*) as total
FROM messages
WHERE DATE(created_at) = CURRENT_DATE
  AND status != 'deleted'
```

#### 4. 最近对话列表
```sql
SELECT
  s.id,
  s.session_id,
  s.robot_id,
  s.status,
  s.last_active_at,
  COUNT(m.id) as message_count,
  r.name as robot_name
FROM sessions s
LEFT JOIN messages m ON s.id = m.session_id
LEFT JOIN robots r ON s.robot_id = r.bot_id
WHERE s.status != 'deleted'
GROUP BY s.id, r.name
ORDER BY s.last_active_at DESC
LIMIT 5
```

---

## 完整的统计数据结构

### 当前返回的数据
```typescript
{
  stats: {
    totalRobots: number,           // ✅ 真实
    totalActivationCodes: number,  // ✅ 真实
    unusedActivationCodes: number, // ✅ 真实
    usedActivationCodes: number,   // ✅ 真实
    expiredActivationCodes: number,// ✅ 真实
    totalConversations: 0,         // ⚠️ 暂不可用
    totalMessages: 0,              // ⚠️ 暂不可用
    activeRobots: number,          // ✅ 真实
    todayMessages: 0,              // ⚠️ 暂不可用
    activeUsers: 0,                // ⚠️ 暂不可用
  },
  recentRobots: [],                // ✅ 真实
  recentActivationCodes: [],       // ✅ 真实
  recentConversations: [],         // ⚠️ 暂不可用
}
```

### 完整的数据结构（改进后）
```typescript
{
  stats: {
    totalRobots: number,
    totalActivationCodes: number,
    unusedActivationCodes: number,
    usedActivationCodes: number,
    expiredActivationCodes: number,
    totalConversations: number,    // ✅ 已实现
    totalMessages: number,         // ✅ 已实现
    activeRobots: number,
    todayMessages: number,         // ✅ 已实现
    activeUsers: number,           // ✅ 已实现
    avgResponseTime: number,       // ✅ 新增
  },
  recentRobots: [],
  recentActivationCodes: [],
  recentConversations: [],         // ✅ 已实现
}
```

---

## 总结

### 数据真实性统计
- **真实数据**: 11 个（61%）
- **硬编码数据**: 2 个（11%）
- **暂不可用数据**: 5 个（28%）

### 关键发现
1. ✅ **机器人相关数据**: 全部真实
2. ✅ **激活码相关数据**: 全部真实
3. ✅ **WebSocket 相关数据**: 全部真实（需要服务器运行）
4. ❌ **用户活跃度**: 硬编码
5. ❌ **响应速度**: 硬编码
6. ⚠️ **对话和消息数据**: 未实现

### 建议行动
1. **立即修复**: 替换硬编码的活跃用户数和响应速度
2. **短期实现**: 实现对话和消息统计功能
3. **长期优化**: 添加更多性能指标和用户行为分析

---

## 相关文件

- `src/app/dashboard/page.tsx` - 仪表盘页面
- `src/app/api/dashboard/stats/route.ts` - 统计数据 API
- `src/app/api/websocket/monitor/route.ts` - WebSocket 监控 API
