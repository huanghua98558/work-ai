#!/bin/bash

echo "🔍 WorkBot WebSocket 诊断工具"
echo "================================"
echo ""

# 1. 检查进程状态
echo "📊 1. 检查进程状态"
echo "----------------------------------------"
echo ""

# 检查 Next.js 进程
if pgrep -f "next dev" > /dev/null; then
    echo "✅ Next.js 开发服务器正在运行"
    ps aux | grep "next dev" | grep -v grep | head -1 | awk '{printf "   PID: %s, CPU: %s%%, 内存: %sMB\n", $2, $3, $6/1024}'
else
    echo "❌ Next.js 开发服务器未运行"
fi

echo ""

# 检查自定义服务器进程（WebSocket）
if pgrep -f "server.ts" > /dev/null; then
    echo "✅ 自定义服务器（WebSocket）正在运行"
    ps aux | grep "server.ts" | grep -v grep | head -1 | awk '{printf "   PID: %s, CPU: %s%%, 内存: %sMB\n", $2, $3, $6/1024}'
else
    echo "❌ 自定义服务器（WebSocket）未运行"
    echo "   ⚠️  这会导致 WebSocket 连接失败！"
fi

echo ""
echo ""

# 2. 检查端口状态
echo "📊 2. 检查端口状态"
echo "----------------------------------------"
echo ""

# 检查 5000 端口
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ 端口 5000 正在监听"
    lsof -i:5000 | grep LISTEN | awk '{printf "   进程: %s, PID: %s\n", $1, $2}'
else
    echo "❌ 端口 5000 未监听"
fi

echo ""

# 检查 WebSocket 端点
echo "📊 3. WebSocket 端点测试"
echo "----------------------------------------"
echo ""

# 测试 HTTP 端点
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ HTTP API 正常工作 (HTTP $HTTP_STATUS)"
else
    echo "❌ HTTP API 无响应 (HTTP $HTTP_STATUS)"
fi

echo ""

# 尝试 WebSocket 握手（使用 curl）
WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    http://localhost:5000/ws 2>/dev/null || echo "000")

if [ "$WS_STATUS" = "101" ] || [ "$WS_STATUS" = "400" ] || [ "$WS_STATUS" = "401" ]; then
    echo "✅ WebSocket 端点响应正常 (HTTP $WS_STATUS)"
    if [ "$WS_STATUS" = "101" ]; then
        echo "   WebSocket 握手成功"
    elif [ "$WS_STATUS" = "401" ]; then
        echo "   WebSocket 端点需要认证（这是正常的）"
    fi
else
    echo "❌ WebSocket 端点无响应 (HTTP $WS_STATUS)"
    echo "   这意味着 WebSocket 服务器未启动"
fi

echo ""
echo ""

# 4. 检查日志
echo "📊 4. 最近的 WebSocket 相关日志"
echo "----------------------------------------"
echo ""

if [ -f "/app/work/logs/bypass/dev.log" ]; then
    echo "最近 5 行开发日志："
    tail -n 5 /app/work/logs/bypass/dev.log | grep -E "\[WebSocket\]|\[Server\]" || echo "   （无 WebSocket 相关日志）"
else
    echo "⚠️  日志文件不存在"
fi

echo ""
echo ""

# 5. 诊断结论
echo "📊 5. 诊断结论"
echo "----------------------------------------"
echo ""

# 判断 WebSocket 服务状态
WS_PROCESS_RUNNING=false
WS_PORT_RESPONSIVE=false

if pgrep -f "server.ts" > /dev/null; then
    WS_PROCESS_RUNNING=true
fi

if [ "$WS_STATUS" = "101" ] || [ "$WS_STATUS" = "400" ] || [ "$WS_STATUS" = "401" ]; then
    WS_PORT_RESPONSIVE=true
fi

if [ "$WS_PROCESS_RUNNING" = true ] && [ "$WS_PORT_RESPONSIVE" = true ]; then
    echo "✅ WebSocket 服务状态: 正常"
    echo "   您的 APP 应该可以正常连接 WebSocket"
    echo ""
    echo "📍 WebSocket 端点地址:"
    echo "   ws://localhost:5000/ws?robotId=<机器人ID>&token=<访问令牌>"
    echo ""
    echo "📱 下一步操作:"
    echo "   1. 在 APP 中输入服务器地址: $(hostname -I | awk '{print $1}'):5000"
    echo "   2. 确保 APP 已激活（使用正确的 robotId 和 token）"
    echo "   3. APP 应该会自动连接到 WebSocket"
elif [ "$WS_PROCESS_RUNNING" = false ]; then
    echo "❌ WebSocket 服务状态: 未运行"
    echo "   问题原因: 自定义服务器（server.ts）未启动"
    echo ""
    echo "🔧 解决方案："
    echo "   方法 1: 使用切换脚本（推荐）"
    echo "     bash scripts/switch-dev-mode.sh ws"
    echo ""
    echo "   方法 2: 手动启动"
    echo "     pkill -f 'next dev'"
    echo "     pnpm run dev:ws"
else
    echo "⚠️  WebSocket 服务状态: 异常"
    echo "   问题原因: 进程运行但端点无响应"
    echo "   可能需要检查日志或重启服务"
    echo ""
    echo "📋 查看日志："
    echo "   tail -f /app/work/logs/bypass/dev.log"
fi

echo ""
echo ""

# 6. 快速操作建议
echo "📊 6. 快速操作建议"
echo "----------------------------------------"
echo ""

if [ "$WS_PROCESS_RUNNING" = false ]; then
    echo "启动 WebSocket 服务："
    echo "  bash scripts/switch-dev-mode.sh ws"
else
    echo "重启 WebSocket 服务："
    echo "  bash scripts/switch-dev-mode.sh ws"
fi

echo ""
echo "查看实时日志："
echo "  tail -f /app/work/logs/bypass/dev.log"
echo ""
