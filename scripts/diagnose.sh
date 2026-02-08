#!/bin/bash

# 快速服务诊断脚本
# 用于快速诊断服务问题

SERVER_URL="http://localhost:5000"
HEALTH_URL="${SERVER_URL}/api/health"
TIMEOUT=5

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "WorkBot 服务快速诊断"
echo "=========================================="
echo ""

# 1. 端口检查
echo -e "${BLUE}[1] 端口检查${NC}"
if ss -lptn 'sport = :5000' | grep -q LISTEN; then
    echo -e "${GREEN}✅ 端口 5000 正在监听${NC}"
    ss -lptn 'sport = :5000'
else
    echo -e "${RED}❌ 端口 5000 未监听${NC}"
fi
echo ""

# 2. 进程检查
echo -e "${BLUE}[2] 进程检查${NC}"
pid=$(ss -lptn 'sport = :5000' | awk '/LISTEN/{print $7}' | grep -oP 'pid=\K\d+')
if [ -n "$pid" ]; then
    echo -e "${GREEN}✅ 进程运行中，PID: $pid${NC}"
    ps aux | grep -E "$pid|node|tsx" | grep -v grep
else
    echo -e "${RED}❌ 进程未找到${NC}"
fi
echo ""

# 3. 健康检查
echo -e "${BLUE}[3] 健康检查${NC}"
start_time=$(date +%s%N)
response=$(curl -s --max-time $TIMEOUT "$HEALTH_URL" 2>&1)
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))

if echo "$response" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ 健康接口响应正常 (${duration}ms)${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo -e "${RED}❌ 健康接口响应失败 (${duration}ms)${NC}"
    echo "响应: ${response:0:500}"
fi
echo ""

# 4. 首页检查
echo -e "${BLUE}[4] 首页检查${NC}"
start_time=$(date +%s%N)
response=$(curl -s --max-time $TIMEOUT "$SERVER_URL/" 2>&1)
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))

if echo "$response" | grep -q "WorkBot"; then
    echo -e "${GREEN}✅ 首页响应正常 (${duration}ms)${NC}"
else
    echo -e "${RED}❌ 首页响应失败 (${duration}ms)${NC}"
    echo "响应: ${response:0:500}"
fi
echo ""

# 5. 系统资源
echo -e "${BLUE}[5] 系统资源${NC}"
echo "内存:"
free -h
echo ""
echo "磁盘:"
df -h /
echo ""
echo "CPU 负载:"
uptime
echo ""

# 6. 数据库连接
echo -e "${BLUE}[6] 数据库连接检查${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ 找到 .env 文件${NC}"
    grep -E "DATABASE_URL|PGDATABASE_URL" .env | sed 's/=.*/=***/'
else
    echo -e "${YELLOW}⚠️  未找到 .env 文件${NC}"
fi

# 检查数据库连接
db_check=$(curl -s --max-time $TIMEOUT "$SERVER_URL/api/db/check" 2>&1)
if echo "$db_check" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ 数据库连接正常${NC}"
else
    echo -e "${RED}❌ 数据库连接失败${NC}"
    echo "响应: ${db_check:0:500}"
fi
echo ""

# 7. 日志检查
echo -e "${BLUE}[7] 最近错误日志${NC}"
if [ -f "/app/work/logs/bypass/app.log" ]; then
    echo "最近的错误日志:"
    tail -n 10 /app/work/logs/bypass/app.log | grep -iE "error|warn|fail" || echo "无错误日志"
else
    echo -e "${YELLOW}⚠️  未找到日志文件${NC}"
fi
echo ""

# 8. WebSocket 检查
echo -e "${BLUE}[8] WebSocket 检查${NC}
"
ws_connections=$(ss -tn | grep ':5000' | grep ESTAB | wc -l)
echo "WebSocket 连接数: $ws_connections"
echo ""

# 9. 网络检查
echo -e "${BLUE}[9] 网络检查${NC}"
ping -c 1 8.8.8.8 >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 外网连接正常${NC}"
else
    echo -e "${RED}❌ 外网连接失败${NC}"
fi
echo ""

# 10. 环境变量检查
echo -e "${BLUE}[10] 环境变量检查${NC}"
if [ -n "$DATABASE_URL" ] || [ -n "$PGDATABASE_URL" ]; then
    echo -e "${GREEN}✅ DATABASE_URL 已配置${NC}"
else
    echo -e "${RED}❌ DATABASE_URL 未配置${NC}"
fi

if [ -n "$JWT_SECRET" ]; then
    if [ ${#JWT_SECRET} -ge 32 ]; then
        echo -e "${GREEN}✅ JWT_SECRET 已配置（长度: ${#JWT_SECRET}）${NC}"
    else
        echo -e "${RED}❌ JWT_SECRET 长度不足（当前: ${#JWT_SECRET}，要求: 32）${NC}"
    fi
else
    echo -e "${RED}❌ JWT_SECRET 未配置${NC}"
fi
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "可用命令:"
echo "  bash /workspace/projects/scripts/monitor.sh  - 持续监控服务"
echo "  bash /workspace/projects/scripts/recovery.sh - 自动恢复服务"
echo "  tail -f /app/work/logs/bypass/app.log        - 查看应用日志"
echo "  tail -f /app/work/logs/bypass/dev.log        - 查看开发日志"
