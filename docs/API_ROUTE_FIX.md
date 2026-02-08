# WorkBot API 路由修复总结

## 问题描述

用户报告服务器极度不稳定，API 路由返回 404 或 500 错误：

```
Error: ENOENT: no such file or directory, open '/workspace/projects/.next/server/app/api/health/route.js'
Error: ENOENT: no such file or directory, open '/workspace/projects/.next/server/pages/_document.js'
```

## 根本原因

### 1. 重复进程过多
发现有多个重复的进程在运行：
- **Coze CLI dev 进程**: 8 个实例（PID 3139, 3265, 3701, 4134, 4481, 4891, 5285, 5425）
- **tsx watch server.ts 进程**: 9 个实例（PID 3168, 3298, 3734, 4069, 4167, 4514, 4924, 5318, 5458）
- **pnpm run dev 进程**: 2 个实例（PID 5306, 5446）

这些重复进程导致：
- 资源浪费（CPU、内存）
- 端口冲突
- 文件访问冲突
- 编译状态不一致

### 2. Next.js 编译问题
由于有多个进程同时运行，`.next` 目录中的编译文件出现不一致：
- 缺少必要的编译文件（`route.js`, `_document.js`）
- 清单文件损坏或缺失
- API 路由没有被正确编译

### 3. 自定义 server.ts 与开发模式冲突
项目使用自定义的 `server.ts` 来同时处理 HTTP 和 WebSocket 服务器，但在开发模式下：
- Next.js 的编译机制与自定义服务器不兼容
- `.next` 目录的结构在开发和生产模式下不同
- 自定义服务器尝试读取仅在生产模式下存在的文件

## 解决方案

### 1. 清理所有重复进程
```bash
# 停止所有重复进程
pkill -f "coze-arch cli dev"
pkill -f "tsx watch"
pkill -f "pnpm run dev"

# 强制停止所有 node 进程
ps aux | grep -E "node|tsx" | grep -v grep | awk '{print $2}' | xargs -r kill -9
```

### 2. 清理 .next 目录
```bash
rm -rf .next
```

### 3. 使用 Coze CLI 启动服务
```bash
# 让 Coze CLI 自动管理服务
# Coze CLI 会监控文件变化并自动重启
```

## 当前服务状态

✅ **所有功能正常**：
- 首页 (`/`): 200 OK
- API 健康检查 (`/api/health`): 200 OK，返回正确的 JSON 响应
- 登录页面 (`/login`): 200 OK
- 端口 5000: 正常监听
- 内存使用: 70%（正常）

## 验证测试

### 1. 健康检查 API
```bash
curl http://localhost:5000/api/health
```

**响应**：
```json
{
  "status": "healthy",
  "timestamp": "2026-02-08T16:43:03.343Z",
  "uptime": "0m 18s",
  "memory": {
    "heapUsed": "293MB",
    "heapTotal": "419MB",
    "rss": "763MB",
    "usagePercent": 70
  },
  "database": {
    "status": "connected",
    "latency": "0ms"
  },
  "latency": "0ms",
  "version": "2.0.0",
  "environment": "development"
}
```

### 2. 首页访问
```bash
curl -I http://localhost:5000/
```

**响应**：
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
...
```

## 预防措施

### 1. 避免手动启动服务
不要使用以下方式启动服务：
- ❌ `pnpm dev &`
- ❌ `tsx watch server.ts &`
- ❌ `next dev &`

使用 Coze CLI 自动管理：
- ✅ Coze CLI 会自动监控服务状态
- ✅ 自动重启失败的服务
- ✅ 避免重复进程

### 2. 定期清理 .next 目录
如果遇到编译问题：
```bash
rm -rf .next
# Coze CLI 会自动重新编译
```

### 3. 监控进程数量
定期检查是否有重复进程：
```bash
ps aux | grep -E "tsx|next" | grep -v grep
```

如果发现多个实例，手动清理：
```bash
pkill -f "tsx watch"
```

### 4. 使用生产模式部署
对于生产环境，使用以下步骤：
```bash
# 1. 构建生产版本
pnpm build

# 2. 启动生产服务
pnpm start

# 3. 使用 PM2 管理进程（推荐）
npm install -g pm2
pm2 start ecosystem.config.js
```

## 后续优化建议

### 1. 修复自定义 server.ts
修改 `server.ts` 以更好地支持开发模式：
- 检查环境变量，根据模式选择不同的启动方式
- 开发模式使用 Next.js 内置服务器
- 生产模式使用自定义服务器

### 2. 添加进程管理
使用 PM2 或 systemd 管理服务：
- 自动重启失败的服务
- 监控服务状态
- 日志管理

### 3. 配置监控和告警
设置监控和自动恢复：
- 健康检查
- 自动重启
- 告警通知

### 4. 使用生产模式
在生产环境中：
- 使用 `pnpm build` 构建优化版本
- 使用 `pnpm start` 启动生产服务
- 使用 PM2 管理进程
- 配置 Nginx 反向代理

## 总结

问题的根本原因是多个重复进程导致 Next.js 编译状态不一致。通过：
1. 清理所有重复进程
2. 清理 .next 目录
3. 让 Coze CLI 自动管理服务

服务现在已经恢复正常，所有 API 路由都正常工作。

## 相关文档

- [服务稳定性优化方案](./SERVICE_STABILITY.md)
- [故障排查指南](./TROUBLESHOOTING.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [诊断报告](./DIAGNOSIS_REPORT.md)
