#!/bin/bash

echo "🔄 WorkBot 开发模式切换工具"
echo "================================"

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
        echo "📍 端口: 5000"
        echo "📍 WebSocket: ws://localhost:5000/ws"
        echo ""
        exec pnpm run dev:ws
        ;;
    prod)
        echo "🚀 启动生产服务器..."
        echo "📍 端口: 5000"
        echo "📍 WebSocket: ws://localhost:5000/ws"
        echo ""
        exec pnpm run start
        ;;
    *)
        echo "🚀 启动标准开发服务器（不含 WebSocket）..."
        echo "📍 端口: 5000"
        echo "⚠️  注意: 此模式不支持 WebSocket"
        echo ""
        exec pnpm run dev
        ;;
esac
