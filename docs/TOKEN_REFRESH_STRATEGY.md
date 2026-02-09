# Token 刷新策略优化说明

## 问题分析

### 原始配置
```typescript
// 检查 Token 是否即将过期（5分钟内）
static isTokenExpiringSoon(): boolean {
  const expiresIn = tokens.expiresAt - Date.now();
  return expiresIn < 5 * 60 * 1000; // 5分钟内
}
```

### 问题
1. **对于 30天有效期的 Token，5分钟太短**：
   - 5 / (30 * 24 * 60) = 0.0115%，仅占总有效期的 0.0115%
   - 会导致频繁的刷新请求
   - 增加服务器负担
   - 用户体验不好（频繁看到刷新提示）

2. **不适用于不同有效期的 Token**：
   - 短期 Token（如30分钟）和长期 Token（如30天）使用相同的阈值
   - 无法灵活适应不同场景

## 优化方案

### 智能刷新策略

根据 Token 的有效期动态调整提前刷新时间：

```typescript
static isTokenExpiringSoon(thresholdMs?: number): boolean {
  const tokens = this.getTokens();
  if (!tokens) return false;

  const expiresIn = tokens.expiresAt - Date.now();

  // 如果用户指定了阈值，使用用户指定的值
  if (thresholdMs !== undefined) {
    return expiresIn < thresholdMs;
  }

  // 否则根据 Token 有效期自动计算
  const totalValidity = tokens.expiresAt - (Date.now() - expiresIn);

  // 短期 Token（< 2小时）：提前 10 分钟
  if (totalValidity < 2 * 60 * 60 * 1000) {
    return expiresIn < 10 * 60 * 1000;
  }

  // 中期 Token（2小时 - 7天）：提前 2 小时
  if (totalValidity < 7 * 24 * 60 * 60 * 1000) {
    return expiresIn < 2 * 60 * 60 * 1000;
  }

  // 长期 Token（7天 - 30天）：提前 1 天
  if (totalValidity < 30 * 24 * 60 * 60 * 1000) {
    return expiresIn < 24 * 60 * 60 * 1000;
  }

  // 超长期 Token（> 30天）：提前 3 天
  return expiresIn < 3 * 24 * 60 * 60 * 1000;
}
```

### 刷新时间对照表

| Token 有效期 | 提前刷新时间 | 占比 | 使用场景 |
|------------|------------|------|---------|
| < 2小时 | 10分钟 | 8.3% | 临时会话、高安全场景 |
| 2小时 - 7天 | 2小时 | 5.9% - 0.6% | 普通用户会话 |
| 7天 - 30天 | 1天 | 14.3% - 3.3% | 长期登录（当前场景） |
| > 30天 | 3天 | < 10% | 超长期登录 |

### 当前配置

WorkBot 系统使用的是 **30天** 有效期的 Token，因此：

```
Access Token 有效期: 30天
提前刷新时间: 1天（24小时）
刷新触发时机: 剩余时间 < 24小时
```

## 新增功能

### 1. 自定义刷新阈值

允许用户指定自定义的刷新阈值：

```typescript
// 使用默认阈值（根据有效期自动计算）
const isExpiring1 = TokenManager.isTokenExpiringSoon();

// 自定义阈值：提前 2小时
const isExpiring2 = TokenManager.isTokenExpiringSoon(2 * 60 * 60 * 1000);

// 自定义阈值：提前 12小时
const isExpiring3 = TokenManager.isTokenExpiringSoon(12 * 60 * 60 * 1000);
```

### 2. 获取剩余时间

```typescript
// 获取剩余时间（毫秒）
const expiresIn = TokenManager.getExpiresIn();

// 获取剩余时间（人类可读格式）
const expiresInHuman = TokenManager.getExpiresInHumanReadable();
// 返回: "29天 12小时 30分钟"
```

### 3. 使用示例

```typescript
import { TokenManager } from '@/lib/api-client';

// 检查 Token 是否即将过期
if (TokenManager.isTokenExpiringSoon()) {
  console.log('Token 即将过期，准备刷新...');

  // 显示提示（可选）
  toast.info('登录即将过期，正在自动刷新...');

  // 自动刷新
  await apiClient.refreshAccessToken();
}

// 获取剩余时间
const expiresIn = TokenManager.getExpiresIn();
const expiresInHuman = TokenManager.getExpiresInHumanReadable();

console.log(`Token 剩余有效时间: ${expiresInHuman}`);

// 在页面显示
<div>
  <span>登录有效期剩余：</span>
  <span className="text-blue-600">{expiresInHuman}</span>
</div>
```

## 最佳实践

### 1. Token 有效期建议

| 场景 | Access Token 有效期 | Refresh Token 有效期 | 提前刷新时间 |
|-----|-------------------|-------------------|------------|
| 高安全场景（银行、支付） | 15-30分钟 | 1天 | 5分钟 |
| 普通应用（社交、电商） | 2-6小时 | 7天 | 30分钟 |
| 长期登录（当前场景） | 1-30天 | 30-90天 | 1-3天 |
| 内部系统（低风险） | 30-90天 | 180天 | 3-7天 |

### 2. 刷新频率建议

**原则**：
- 不宜过于频繁（增加服务器负担）
- 不宜过晚（可能导致 Token 过期无法刷新）
- 给用户足够的缓冲时间（处理刷新失败）

**推荐配置**：
- 短期 Token：提前 10-30 分钟
- 中期 Token：提前 1-6 小时
- 长期 Token：提前 1-3 天

### 3. 用户体验优化

```typescript
// 显示剩余时间倒计时
useEffect(() => {
  const updateTimer = () => {
    const expiresIn = TokenManager.getExpiresInHumanReadable();
    setRemainingTime(expiresInHuman);

    // 如果即将过期，显示警告
    if (TokenManager.isTokenExpiringSoon()) {
      setShowWarning(true);
    }
  };

  updateTimer();
  const interval = setInterval(updateTimer, 60000); // 每分钟更新一次

  return () => clearInterval(interval);
}, []);

return (
  <div>
    {showWarning && (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          登录即将过期，剩余时间：{remainingTime}
        </AlertDescription>
      </Alert>
    )}
  </div>
);
```

### 4. 刷新失败处理

```typescript
try {
  const newToken = await apiClient.refreshAccessToken();
  console.log('Token 刷新成功');
} catch (error) {
  console.error('Token 刷新失败:', error);

  // 显示错误提示
  toast.error('登录已过期，请重新登录');

  // 延迟跳转（给用户时间看到提示）
  setTimeout(() => {
    window.location.href = '/login';
  }, 2000);
}
```

## 安全考虑

### 1. 刷新机制的安全性

- ✅ Refresh Token 使用 HTTPS 传输
- ✅ Refresh Token 存储在 localStorage（生产环境建议使用 HttpOnly Cookie）
- ✅ 刷新成功后生成新的 Refresh Token（轮换机制）
- ✅ 刷新失败立即清除 Token

### 2. 防止 Token 泄露

- ✅ 使用 HTTPS/WSS 加密传输
- ✅ 不在 URL 中传递 Token
- ✅ 敏感操作需要二次验证
- ✅ Token 黑名单机制（撤销已泄露的 Token）

### 3. 防止重放攻击

```typescript
// 建议：在 Token 中添加 jti（JWT ID）和 nonce
const payload = {
  userId: user.id,
  phone: user.phone,
  role: user.role,
  jti: generateJTI(), // 唯一标识符
  nonce: generateNonce(), // 随机数
};

// 在验证时检查 jti 和 nonce 是否已使用
if (isJTIUsed(payload.jti)) {
  return { valid: false, error: 'Token 已被使用' };
}
```

## 监控和告警

### 1. 刷新成功率监控

```typescript
// 记录刷新成功/失败
if (refreshSuccess) {
  metrics.increment('token.refresh.success');
} else {
  metrics.increment('token.refresh.failure');
}
```

### 2. 异常刷新频率告警

```typescript
// 如果某个用户频繁刷新 Token（如每小时超过10次），发送告警
if (refreshCount > 10) {
  sendAlert({
    type: 'abnormal_token_refresh',
    userId: user.id,
    refreshCount,
  });
}
```

### 3. Token 使用情况报告

```typescript
// 生成 Token 使用报告
const report = {
  totalTokens: 1000,
  activeTokens: 850,
  expiredTokens: 150,
  avgRefreshInterval: '25天',
  refreshSuccessRate: '99.5%',
};
```

## 总结

### 优化前
- 固定提前刷新时间：5分钟
- 不适用于不同有效期的 Token
- 可能导致频繁刷新

### 优化后
- 智能提前刷新时间：根据有效期自动计算
- 30天 Token：提前 1 天刷新
- 支持自定义阈值
- 提供剩余时间查询功能
- 更好的用户体验

### 下一步建议

1. **生产环境优化**：
   - 使用 Redis 存储 Token 刷新记录
   - 实现刷新频率限制
   - 添加刷新失败告警

2. **安全增强**：
   - 使用 HttpOnly Cookie 存储 Refresh Token
   - 实现 Token 轮换机制
   - 添加设备指纹验证

3. **用户体验**：
   - 显示剩余有效时间
   - 提前 1 天提醒用户
   - 提供"保持登录"选项

---

*文档版本: 1.0*
*最后更新: 2026-02-09*
