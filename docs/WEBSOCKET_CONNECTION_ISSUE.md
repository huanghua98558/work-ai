# WebSocket 连接问题诊断与解决方案

## 问题诊断

### 当前状态
通过日志分析，我发现当前运行的服务是：
- **启动命令**: `next dev -p 5000`
- **运行时间**: 2026-02-09 03:15:13

### 根本原因
`next dev` 命令**只启动 HTTP 服务器**，不会初始化 WebSocket 服务器！

WebSocket 服务器仅在自定义服务器 `server.ts` 中初始化，而自定义服务器只在以下脚本中启动：
- `pnpm run start` - 生产环境
- `pnpm run dev:ws` - 开发模式（带 WebSocket 支持）

### 问题表现
- ✅ APP 激活成功 - HTTP API 正常工作
- ✅ 监测通讯正常 - HTTP 通讯正常
- ❌ WebSocket 连接失败 - WebSocket 服务器未启动

---

## 解决方案

### 方案 1: 开发环境（推荐用于测试）

使用带 WebSocket 支持的开发服务器：

```bash
# 停止当前服务
pkill -f "next dev"

# 启动带 WebSocket 的开发服务器
pnpm run dev:ws
```

**优点**：
- 支持 WebSocket
- 支持热更新
- 适合开发调试

**缺点**：
- 启动时间较长（需要编译 TypeScript）
- 内存占用稍高

---

### 方案 2: 生产环境（推荐用于部署）

使用生产环境服务器：

```bash
# 停止当前服务
pkill -f "next dev"

# 启动生产服务器（包含 WebSocket）
pnpm run start
```

**优点**：
- 性能最优
- 包含所有功能
- 适合生产部署

**缺点**：
- 无热更新
- 修改代码需要重新构建

---

### 方案 3: 并行运行（高级）

如果需要同时开发前端和 WebSocket，可以启动两个服务：

```bash
# 终端 1: 启动 Next.js 开发服务器（HTTP API + 前端）
pnpm run dev

# 终端 2: 启动自定义服务器（WebSocket）
pnpm run dev:ws
```

**注意**：
- 需要修改端口配置，避免冲突
- HTTP 服务使用 5000 端口
- WebSocket 服务可以使用其他端口（如 5001）

---

## 快速修复脚本

我为你创建了一个快速切换脚本：

### 创建脚本文件 `scripts/switch-dev-mode.sh`

```bash
#!/bin/bash

echo "🔄 切换开发模式..."

# 停止所有 Node.js 进程
echo "⏹️  停止当前服务..."
pkill -f "next dev" 2>/dev/null
pkill -f "tsx server" 2>/dev/null

# 等待进程完全停止
sleep 2

# 检查端口是否被占用
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 5000 仍被占用，尝试强制清理..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# 选择模式
case "$1" in
    ws)
        echo "🚀 启动带 WebSocket 的开发服务器..."
        pnpm run dev:ws
        ;;
    prod)
        echo "🚀 启动生产服务器..."
        pnpm run start
        ;;
    *)
        echo "🚀 启动标准开发服务器（不含 WebSocket）..."
        pnpm run dev
        ;;
esac
```

### 使用方法

```bash
# 启动标准开发服务器（不含 WebSocket）
bash scripts/switch-dev-mode.sh

# 启动带 WebSocket 的开发服务器
bash scripts/switch-dev-mode.sh ws

# 启动生产服务器
bash scripts/switch-dev-mode.sh prod
```

---

## 验证 WebSocket 连接

### 1. 检查 WebSocket 服务器是否启动

```bash
# 检查 WebSocket 进程
ps aux | grep "server.ts" | grep -v grep

# 应该看到类似这样的输出：
# root     12345  0.5  0.8 12345678 65432 ?  Sl   03:20   0:00 tsx server.ts
```

### 2. 检查 WebSocket 日志

```bash
# 查看开发日志
tail -f /app/work/logs/bypass/dev.log

# 应该看到类似这样的输出：
# [Server] Starting with config: { dev: true, hostname: 'localhost', port: 5000 }
# [Server] Next.js initialized successfully
# [Server] Initializing WebSocket server...
# [Server] WebSocket server initialized successfully
# > Ready on http://localhost:5000
# > WebSocket: ws://localhost:5000/ws
```

### 3. 测试 WebSocket 连接

使用 WebSocket 测试工具：

```bash
# 使用 wscat 测试（需要先安装）
npm install -g wscat
wscat -c "ws://localhost:5000/ws?robotId=YOUR_ROBOT_ID&token=YOUR_TOKEN"
```

或者使用在线测试工具：
- https://www.piesocket.com/websocket-tester
- https://websocket.org/echo.html

连接地址：
```
ws://你的服务器IP:5000/ws?robotId=YOUR_ROBOT_ID&token=YOUR_TOKEN
```

---

## 常见问题

### Q1: 为什么 `next dev` 不包含 WebSocket？

**A**: Next.js 的内置服务器不支持自定义 WebSocket 处理，需要使用自定义 HTTP 服务器。

### Q2: 开发环境必须用 `dev:ws` 吗？

**A**: 如果只需要 HTTP API 和前端功能，用 `next dev` 即可。如果需要 WebSocket 功能，必须用 `dev:ws` 或 `start`。

### Q3: 生产环境怎么办？

**A**: 生产环境直接使用 `pnpm run start`，它会自动包含 WebSocket 支持。

### Q4: 如何同时启用热更新和 WebSocket？

**A**: 当前设计下，`dev:ws` 不支持热更新。如果需要同时支持，可以考虑：
- 使用方案 3（并行运行）
- 或者等待修复后，在 `server.ts` 中集成热更新功能

### Q5: 端口冲突怎么办？

**A**: 检查并清理端口：
```bash
# 查看端口占用
lsof -i:5000

# 清理端口
pkill -f "next dev"
pkill -f "tsx server"
```

---

## 下一步建议

1. **立即修复**：
   ```bash
   # 停止当前服务
   pkill -f "next dev"

   # 启动带 WebSocket 的开发服务器
   pnpm run dev:ws
   ```

2. **验证连接**：
   - 检查日志中的 WebSocket 初始化信息
   - 使用 APP 重新连接 WebSocket

3. **长期优化**：
   - 考虑统一开发模式，让 `dev` 脚本也包含 WebSocket 支持
   - 添加健康检查 API，确保 WebSocket 服务可用

---

## 相关文档

- [自定义服务器配置](./server.ts)
- [WebSocket 服务器实现](../src/server/websocket-server.ts)
- [部署修复文档](./DEPLOYMENT_FIX_V2.md)
- [环境变量配置](../.env)
