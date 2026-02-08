#!/bin/bash

# 生产环境启动脚本
# 包含环境变量检查、健康检查和优雅启动逻辑

set -e

echo "========================================="
echo "启动 WorkBot 服务"
echo "========================================="

# 环境变量
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-5000}

# 检查必需的环境变量
echo "检查环境变量配置..."

# 尝试自动获取数据库连接信息（支持多种环境变量名称）
if [ -z "$DATABASE_URL" ]; then
  # 尝试常见的数据库环境变量名称
  if [ -n "$POSTGRES_URL" ]; then
    export DATABASE_URL="$POSTGRES_URL"
    echo "✅ 从 POSTGRES_URL 获取数据库连接信息"
  elif [ -n "$POSTGRESQL_URL" ]; then
    export DATABASE_URL="$POSTGRESQL_URL"
    echo "✅ 从 POSTGRESQL_URL 获取数据库连接信息"
  elif [ -n "$DB_URL" ]; then
    export DATABASE_URL="$DB_URL"
    echo "✅ 从 DB_URL 获取数据库连接信息"
  fi
fi

# 检查必需的环境变量
REQUIRED_VARS=(
  "DATABASE_URL"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

# JWT_SECRET 可以有默认值（仅用于开发/测试）
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET="workbot-default-jwt-secret-for-testing-only"
  echo "⚠️  警告: 使用默认 JWT_SECRET（仅用于开发/测试）"
  echo "   建议在生产环境中设置强随机密钥"
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ 环境变量配置错误："
  echo ""
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var: Required"
  done
  echo ""
  echo "请在部署平台配置以下环境变量："
  echo ""
  for var in "${REQUIRED_VARS[@]}"; do
    echo "  • $var"
  done
  echo ""
  echo "参考配置："
  echo "  DATABASE_URL=postgresql://user:password@host:5432/database"
  echo "  JWT_SECRET=your-secret-key-at-least-32-characters-long"
  echo ""
  echo "注意: 部署平台可能使用不同的环境变量名称："
  echo "  • POSTGRES_URL"
  echo "  • POSTGRESQL_URL"
  echo "  • DB_URL"
  echo ""
  exit 1
fi

echo "✅ 环境变量检查通过"
echo "   DATABASE_URL: ${DATABASE_URL:0:20}..."
echo "   JWT_SECRET: ${JWT_SECRET:0:10}..."

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
