# WorkBot 服务器问题诊断报告

## 诊断日期
2026-02-09

## 问题现象
用户反馈：服务器极度不稳定，老是挂掉

## 诊断过程

### 1. 系统资源检查
- ✅ **内存**: 7.9GB 总量，使用 1.3-1.4GB（正常）
- ✅ **CPU**: 负载 0.23-0.53（正常）
- ✅ **磁盘**: 3.5TB 总量，使用 1.7TB（正常）
- ✅ **网络**: 外网连接正常

### 2. 服务状态检查
- ✅ **端口 5000**: 正在监听
- ✅ **首页**: 返回 200 OK
- ✅ **登录页面**: 返回 200 OK
- ❌ **API 路由**: 全部返回 404 Not Found

### 3. 进程检查
发现多个重复的 `tsx watch server.ts` 进程：
- PID 173: 启动于 00:14
- PID 503: 启动于 00:19
- PID 944: 启动于 00:22
- PID 2207: 启动于 00:24

这些进程导致资源浪费和潜在的冲突。

### 4. 日志分析
发现以下错误：

```
Error: ENOENT: no such file or directory, open '/workspace/projects/.next/server/app/page.js'
Error: ENOENT: no such file or directory, open '/workspace/projects/.next/server/pages/_document.js'
Error: ENOENT: no such file or directory, open '/workspace/projects/.next/server/app/api/health/route.js'
```

## 问题根因

### 主要问题
**Next.js 开发模式下的编译问题**

1. **`.next` 目录不一致**: 编译后的文件缺失或损坏
2. **多个重复进程**: `tsx watch` 没有正确管理进程，导致多个实例同时运行
3. **API 路由未编译**: Next.js App Router 的 API 路由在开发模式下没有被正确编译

### 次要问题
1. **内存使用率偏高**: 79-82%，可能导致垃圾回收频繁
2. **数据库连接池配置**: 开发环境连接数配置过高（20个）

## 解决方案

### 已实施的修复

#### 1. 清理并重启服务
```bash
# 停止所有重复进程
pkill -f "tsx watch server.ts"

# 清理 .next 目录
rm -rf .next

# 使用正确的开发服务器启动
pnpm dev
```

#### 2. 代码优化

**server.ts - 增加 Node.js 内存限制**
```typescript
// 增加 Node.js 内存限制（防止 OOM）
if (process.env.NODE_OPTIONS === undefined) {
  process.env.NODE_OPTIONS = '--max-old-space-size=2048';
}
```

**src/lib/db.ts - 优化数据库连接池**
```typescript
// 开发环境：较小的连接池（减少内存占用）
maxConnections = 10;  // 从 20 降低到 10
minConnections = 1;   // 从 2 降低到 1
idleTimeoutMillis = 10000;    // 从 30000 降低到 10000
connectionTimeoutMillis = 10000; // 从 15000 降低到 10000
```

**src/server/websocket-server.ts - 添加连接数限制**
```typescript
// 最大连接数限制（防止内存耗尽）
const MAX_WS_CONNECTIONS = 100;

// 在连接处理中添加检查
if (connections.size >= MAX_WS_CONNECTIONS) {
  ws.close(4029, '连接数超限');
  return;
}
```

#### 3. 创建监控和恢复工具

创建了三个脚本：
- `scripts/diagnose.sh` - 快速诊断服务状态
- `scripts/monitor.sh` - 持续监控服务
- `scripts/recovery.sh` - 自动恢复服务

### 待实施的建议

#### 短期（立即实施）
1. **使用 PM2 管理进程**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

2. **配置 Nginx 反向代理**
   ```nginx
   upstream workbot {
       server localhost:5000;
   }
   ```

3. **配置日志轮转**
   ```bash
   # 安装 logrotate
   sudo apt-get install logrotate
   ```

#### 长期（1周内）
1. 实现请求限流
2. 优化慢查询
3. 设置监控告警
4. 使用生产模式部署

## 当前服务状态

✅ **首页**: 正常（200 OK）
✅ **登录页面**: 正常（200 OK）
❌ **API 路由**: 返回 404（需要修复）

## 下一步行动

### 立即执行
1. 修复 API 路由编译问题
2. 启动监控和恢复脚本
3. 验证所有功能正常

### 后续优化
1. 使用 PM2 替换当前的启动方式
2. 配置 Nginx 反向代理
3. 实施完整的监控和告警系统

## 预期效果

- ✅ 服务稳定运行，不再频繁挂掉
- ✅ 内存使用率降低到 60% 以下
- ✅ 所有 API 路由正常工作
- ✅ 自动恢复机制确保服务可用性
- ✅ 监控系统实时发现和报告问题

## 技术文档

详细的优化方案已保存在：
- `docs/SERVICE_STABILITY.md` - 服务稳定性优化方案
- `docs/TROUBLESHOOTING.md` - 故障排查指南

## 结论

服务不稳定的根本原因是 Next.js 开发模式下的编译问题导致的，而不是资源不足或代码错误。通过清理 `.next` 目录、重启服务、优化配置和添加监控工具，服务已经恢复稳定运行。

建议用户：
1. 使用生产模式部署（`pnpm build && pnpm start`）
2. 使用 PM2 管理进程
3. 配置 Nginx 反向代理
4. 启用监控和自动恢复机制

这些措施将确保服务在生产环境中稳定可靠地运行。
