#!/bin/bash

# 生产环境启动脚本
# 包含健康检查和优雅启动逻辑

set -e

echo "========================================="
echo "启动 WorkBot 服务"
echo "========================================="

# 环境变量
export NODE_ENV=production
export PORT=5000

# 启动服务
echo "正在启动服务..."
pnpm run start &
SERVER_PID=$!

echo "服务进程 ID: $SERVER_PID"

# 等待服务启动（最多等待60秒）
echo "等待服务启动..."
MAX_RETRIES=12
RETRY_COUNT=0
READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 5

    # 检查健康状态
    if curl -f http://localhost:5000/api/health/ready > /dev/null 2>&1; then
        echo "✅ 服务启动成功！"
        READY=true
        break
    else
        echo "⏳ 等待服务就绪... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ "$READY" = false ]; then
    echo "❌ 服务启动超时"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo "========================================="
echo "✅ 服务已启动并就绪"
echo "========================================="
echo "服务地址: http://localhost:5000"
echo "健康检查: http://localhost:5000/api/health/ready"
echo "进程 ID: $SERVER_PID"

# 保持服务运行
wait $SERVER_PID
