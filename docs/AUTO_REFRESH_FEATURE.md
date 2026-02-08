# 激活码管理 - 自动刷新功能

## 功能概述

激活码管理页面现在支持自动刷新功能，可以定期自动获取最新的激活码列表数据。

## 功能特性

### 1. 自动刷新开关

- **位置**：页面顶部，按钮栏右侧
- **状态**：
  - ⏸️ **暂停状态**：显示"开启"按钮，点击后开启自动刷新
  - ▶️ **运行状态**：显示"暂停"按钮，点击后关闭自动刷新

### 2. 刷新间隔设置

支持以下刷新间隔：
- 15 秒
- 30 秒（默认）
- 1 分钟
- 2 分钟
- 5 分钟

### 3. 倒计时显示

- 显示距离下次自动刷新的剩余时间
- 格式：`Xs`（例如：30s、15s、5s）
- 倒计时结束后自动刷新列表

## 使用方法

### 开启自动刷新

1. 点击页面顶部的 **"开启"** 按钮
2. 自动刷新开始运行，按钮变为 **"暂停"**
3. 倒计时开始显示

### 关闭自动刷新

1. 点击页面顶部的 **"暂停"** 按钮
2. 自动刷新停止，按钮变回 **"开启"**
3. 倒计时消失

### 更改刷新间隔

1. 确保自动刷新已开启
2. 点击刷新间隔下拉菜单
3. 选择所需的刷新间隔（15秒、30秒、1分钟、2分钟、5分钟）
4. 倒计时重置为新的间隔

## 技术实现

### 状态管理

```typescript
// 自动刷新相关状态
const [autoRefresh, setAutoRefresh] = useState(false);        // 自动刷新开关
const [refreshInterval, setRefreshInterval] = useState(30);  // 刷新间隔（秒）
const [countdown, setCountdown] = useState(refreshInterval); // 倒计时
```

### 自动刷新逻辑

使用 `useEffect` 和 `setInterval` 实现：

```typescript
useEffect(() => {
  let intervalId: NodeJS.Timeout | null = null;

  if (autoRefresh) {
    // 倒计时
    const countdownId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // 倒计时结束，触发刷新
          loadData();
          return refreshInterval; // 重置倒计时
        }
        return prev - 1;
      });
    }, 1000);

    intervalId = countdownId;
  } else {
    setCountdown(refreshInterval);
  }

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}, [autoRefresh, refreshInterval]);
```

### 数据加载优化

自动刷新时不显示加载状态，避免页面闪烁：

```typescript
const loadData = async (retryCount = 0, showLoading = true) => {
  try {
    if (showLoading) {
      setLoading(true);
    }
    // ... 加载数据逻辑
  } finally {
    if (showLoading) {
      setLoading(false);
    }
    setRefreshing(false);
  }
};
```

## 注意事项

### 1. 性能考虑

- 建议刷新间隔不要设置得太短（不要少于 15 秒）
- 过于频繁的刷新会增加服务器负载

### 2. 网络连接

- 自动刷新依赖网络连接
- 网络断开时，倒计时仍会继续，但刷新会失败
- 重新连接后，下次倒计时结束时会自动尝试刷新

### 3. 用户体验

- 自动刷新时不会显示加载状态，避免打断用户操作
- 手动点击"刷新列表"按钮会立即刷新，不受自动刷新影响
- 创建、编辑、删除操作后立即刷新列表

### 4. 浏览器行为

- 切换标签页时，自动刷新会继续运行（除非浏览器限制了后台定时器）
- 关闭标签页时，自动刷新会自动停止
- 页面刷新时，自动刷新状态会重置为关闭

## 使用场景

### 适用场景

- 监控激活码的实时状态变化
- 等待用户激活激活码
- 管理大量激活码，需要及时获取最新数据

### 不适用场景

- 静态查看激活码列表
- 需要长时间保持页面打开但不需要最新数据

## 未来改进

可能的改进方向：

1. **智能刷新**
   - 根据数据变化频率自动调整刷新间隔
   - 在有新数据时才刷新

2. **后台通知**
   - 当有新激活码被激活时，发送通知
   - 当有激活码过期时，发送通知

3. **刷新历史**
   - 记录每次刷新的时间和结果
   - 显示刷新成功率

4. **分批刷新**
   - 如果数据量很大，可以分批刷新
   - 先刷新最近的激活码，再刷新历史记录

## 相关文件

- `src/app/activation-codes/page.tsx` - 激活码管理页面
- `docs/AUTO_REFRESH_FEATURE.md` - 本文档
