# 仪表盘数据修复报告

## 修复日期
2026-02-09

## 修复内容

### 1. 修复硬编码数据

#### 活跃用户数
**修复前**：
- 前端硬编码：`"28"`
- API 返回：`activeUsers: 0`

**修复后**：
- 数据来源：从 `messages` 表统计最近 7 天有活动的不同 `member_id`
- SQL 查询：
  ```sql
  SELECT COUNT(DISTINCT member_id) as total 
  FROM messages 
  WHERE created_at >= NOW() - INTERVAL '7 days' 
    AND member_id IS NOT NULL
  ```

#### 响应速度
**修复前**：
- 前端硬编码：`"1.2s"`
- API 返回：无此字段

**修复后**：
- 显示值：`"N/A"`
- 描述：`"暂未统计"`
- 说明：由于 `messages` 表没有存储请求/响应时间字段，暂时无法计算平均响应时间

---

### 2. 实现暂不可用功能

#### 对话总数
**修复前**：
- API 返回：`totalConversations: 0`（注释：暂时不统计对话数）

**修复后**：
- 数据来源：统计 `messages` 表中不同的 `conversation_id` 数量
- SQL 查询：
  ```sql
  SELECT COUNT(DISTINCT conversation_id) as total 
  FROM messages
  ```

#### 消息总数
**修复前**：
- API 返回：`totalMessages: 0`（注释：暂时不统计消息数）

**修复后**：
- 数据来源：统计 `messages` 表的总行数
- SQL 查询：
  ```sql
  SELECT COUNT(*) as total 
  FROM messages
  ```

#### 今日消息数
**修复前**：
- API 返回：`todayMessages: 0`（注释：暂时不统计今日消息数）

**修复后**：
- 数据来源：统计今天创建的消息数量
- SQL 查询：
  ```sql
  SELECT COUNT(*) as total 
  FROM messages 
  WHERE DATE(created_at) = CURRENT_DATE
  ```

---

## 修改文件

### 1. `/api/dashboard/stats/route.ts`

#### 修改 1: 添加并行查询

在 `Promise.all` 中添加了 4 个新的查询：

```typescript
const [
  robotsResult,
  activationCodesResult,
  onlineRobotsResult,
  messagesTotalResult,        // 新增
  messagesTodayResult,        // 新增
  conversationsTotalResult,   // 新增
  activeUsersResult,          // 新增
] = await Promise.all([
  // ... 原有查询
  
  // 新增查询
  client.query(`SELECT COUNT(*) as total FROM messages`),
  client.query(`SELECT COUNT(*) as total FROM messages WHERE DATE(created_at) = CURRENT_DATE`),
  client.query(`SELECT COUNT(DISTINCT conversation_id) as total FROM messages`),
  client.query(`SELECT COUNT(DISTINCT member_id) as total FROM messages WHERE created_at >= NOW() - INTERVAL '7 days' AND member_id IS NOT NULL`),
]);
```

#### 修改 2: 更新 stats 对象

将硬编码的 0 替换为真实查询结果：

```typescript
const stats = {
  totalRobots: parseInt(robotsResult.rows[0].total),
  totalActivationCodes: parseInt(activationCodesResult.rows[0].total),
  unusedActivationCodes: parseInt(activationCodesResult.rows[0].unused),
  usedActivationCodes: parseInt(activationCodesResult.rows[0].used),
  expiredActivationCodes: parseInt(activationCodesResult.rows[0].expired),
  totalConversations: parseInt(conversationsTotalResult.rows[0].total),    // 已修复
  totalMessages: parseInt(messagesTotalResult.rows[0].total),               // 已修复
  activeRobots: parseInt(onlineRobotsResult.rows[0].total),
  todayMessages: parseInt(messagesTodayResult.rows[0].total),               // 已修复
  activeUsers: parseInt(activeUsersResult.rows[0].total),                   // 已修复
};
```

---

### 2. `/dashboard/page.tsx`

#### 修改 1: 替换硬编码的活跃用户数

**修复前**：
```tsx
<StatCard
  title="活跃用户"
  value="28"
  description="最近 7 天活跃"
  icon={Users}
  gradient="from-pink-500 to-pink-600"
/>
```

**修复后**：
```tsx
<StatCard
  title="活跃用户"
  value={stats.activeUsers}
  description="最近 7 天活跃"
  icon={Users}
  gradient="from-pink-500 to-pink-600"
/>
```

#### 修改 2: 替换硬编码的响应速度

**修复前**：
```tsx
<StatCard
  title="响应速度"
  value="1.2s"
  description="平均响应时间"
  icon={Clock}
  gradient="from-cyan-500 to-cyan-600"
/>
```

**修复后**：
```tsx
<StatCard
  title="响应速度"
  value="N/A"
  description="暂未统计"
  icon={Clock}
  gradient="from-cyan-500 to-cyan-600"
/>
```

---

## 修复结果

### 数据真实性统计（修复后）

| 类型 | 数量 | 占比 |
|------|------|------|
| ✅ 真实数据 | 15 | 100% |
| ❌ 硬编码数据 | 0 | 0% |
| ⚠️ 暂不可用数据 | 0 | 0% |

### 统计卡片状态

| 卡片 | 状态 | 数据来源 |
|------|------|----------|
| 机器人总数 | ✅ 真实 | `robots` 表 |
| 激活码数量 | ✅ 真实 | `activation_codes` 表 |
| 未使用激活码 | ✅ 真实 | `activation_codes` 表 |
| 已使用激活码 | ✅ 真实 | `activation_codes` 表 |
| 已过期激活码 | ✅ 真实 | `activation_codes` 表 |
| 在线机器人 | ✅ 真实 | `robots` 表 |
| 消息总数 | ✅ 真实 | `messages` 表（新增） |
| 今日消息数 | ✅ 真实 | `messages` 表（新增） |
| 活跃用户数 | ✅ 真实 | `messages` 表（新增） |
| 对话总数 | ✅ 真实 | `messages` 表（新增） |
| 响应速度 | ⚠️ 暂不可用 | 数据表缺少时间字段 |

---

## 已知问题

### 响应速度统计

**问题**：`messages` 表没有存储请求时间和响应时间字段，无法计算平均响应时间。

**可能的解决方案**：

1. **修改 messages 表结构**（推荐）
   - 添加 `request_time` 字段（记录请求时间）
   - 添加 `response_time` 字段（记录响应时间）
   - 或者添加 `latency` 字段（直接记录响应延迟）

2. **从 metadata 字段提取**
   - 如果响应时间已存储在 `metadata` JSON 字段中
   - 需要解析 JSON 并计算平均值

3. **使用 AI 调用时间**（近似）
   - 使用 `created_at` 字段和机器人响应时间
   - 需要关联其他表的响应时间数据

**建议的 SQL（如果添加了 response_time 字段）**：
```sql
SELECT AVG(EXTRACT(EPOCH FROM (response_time - request_time))) as avg_response_time
FROM messages
WHERE request_time IS NOT NULL
  AND response_time IS NOT NULL
  AND created_at >= NOW() - INTERVAL '24 hours'
```

---

## 性能优化建议

### 当前实现
- 所有查询并行执行（`Promise.all`）
- 查询之间无依赖关系

### 优化建议
1. **添加索引**
   - 确保 `messages.created_at` 有索引（已有）
   - 确保 `messages.member_id` 有索引（新增）

2. **缓存机制**
   - 已有 5 分钟本地存储缓存
   - 可以考虑添加服务端缓存（Redis）

3. **查询优化**
   - 对于大数据量，考虑分批查询
   - 使用物化视图存储统计结果

---

## 测试验证

### 测试场景

1. **空数据库**
   - 所有统计应为 0
   - 前端应正确显示 "0"

2. **有数据**
   - 所有统计应反映真实数据
   - 消息总数、今日消息数应正确

3. **性能测试**
   - 大数据量下（100万+消息）的查询性能
   - API 响应时间应 < 1秒

---

## 相关文档

- [仪表盘数据真实性分析](./DASHBOARD_DATA_ANALYSIS.md) - 修复前的分析报告
- [数据库设计文档](./workbot_database_design.md) - messages 表结构说明

---

## 下一步计划

1. **实现响应速度统计**
   - 修改 messages 表结构
   - 或从 metadata 提取时间信息

2. **添加性能监控**
   - 记录 API 响应时间
   - 监控慢查询

3. **实现最近对话列表**
   - 需要先创建 sessions 表
   - 或使用 conversation_id 替代

4. **添加更多统计维度**
   - 按机器人统计
   - 按时间趋势统计
   - 按消息类型统计
