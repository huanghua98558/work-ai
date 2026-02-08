#!/bin/bash

# 服务监控脚本
# 用于持续监控服务状态和响应时间

LOG_FILE="/app/work/logs/bypass/monitor.log"
SERVER_URL="http://localhost:5000"
HEALTH_URL="${SERVER_URL}/api/health"
TIMEOUT=5

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 记录日志
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

# 检查服务端口
check_port() {
    if ss -lptn 'sport = :5000' | grep -q LISTEN; then
        return 0
    else
        return 1
    fi
}

# 检查健康接口
check_health() {
    local start_time=$(date +%s%N)
    local response=$(curl -s --max-time $TIMEOUT "$HEALTH_URL" 2>&1)
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))

    if echo "$response" | grep -q '"status":"healthy"'; then
        echo "$duration|$response"
        return 0
    else
        echo "$duration|$response"
        return 1
    fi
}

# 检查首页响应
check_homepage() {
    local start_time=$(date +%s%N)
    local response=$(curl -s --max-time $TIMEOUT "$SERVER_URL/" 2>&1)
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))

    if echo "$response" | grep -q "WorkBot"; then
        echo "$duration|OK"
        return 0
    else
        echo "$duration|FAILED"
        return 1
    fi
}

# 检查进程状态
check_process() {
    local pid=$(ss -lptn 'sport = :5000' | awk '/LISTEN/{print $7}' | grep -oP 'pid=\K\d+')

    if [ -n "$pid" ]; then
        local cpu=$(ps -p $pid -o %cpu --no-headers 2>/dev/null || echo "0")
        local mem=$(ps -p $pid -o %mem --no-headers 2>/dev/null || echo "0")
        local rss=$(ps -p $pid -o rss --no-headers 2>/dev/null || echo "0")
        local rss_mb=$(( rss / 1024 ))

        echo "$pid|$cpu|$mem|$rss_mb"
        return 0
    else
        echo "NOT_FOUND|0|0|0"
        return 1
    fi
}

# 主监控循环
log INFO "=========================================="
log INFO "开始监控服务: $SERVER_URL"
log INFO "=========================================="

while true; do
    echo ""
    log INFO "检查服务状态..."

    # 检查端口
    if check_port; then
        log INFO "✅ 端口 5000 正在监听"
    else
        log ERROR "❌ 端口 5000 未监听"
        sleep 5
        continue
    fi

    # 检查健康接口
    log INFO "检查健康接口..."
    health_result=$(check_health)
    health_status=$?
    health_duration=$(echo "$health_result" | cut -d'|' -f1)
    health_response=$(echo "$health_result" | cut -d'|' -f2-)

    if [ $health_status -eq 0 ]; then
        if [ $health_duration -lt 1000 ]; then
            log INFO "✅ 健康接口响应正常 (${health_duration}ms)"
        else
            log WARN "⚠️  健康接口响应较慢 (${health_duration}ms)"
        fi
    else
        log ERROR "❌ 健康接口响应失败 (${health_duration}ms): ${health_response:0:200}"
    fi

    # 检查首页
    log INFO "检查首页响应..."
    home_result=$(check_homepage)
    home_status=$?
    home_duration=$(echo "$home_result" | cut -d'|' -f1)
    home_response=$(echo "$home_result" | cut -d'|' -f2)

    if [ $home_status -eq 0 ]; then
        if [ $home_duration -lt 2000 ]; then
            log INFO "✅ 首页响应正常 (${home_duration}ms)"
        elif [ $home_duration -lt 5000 ]; then
            log WARN "⚠️  首页响应较慢 (${home_duration}ms)"
        else
            log ERROR "❌ 首页响应超时 (${home_duration}ms)"
        fi
    else
        log ERROR "❌ 首页响应失败 (${home_duration}ms)"
    fi

    # 检查进程状态
    log INFO "检查进程状态..."
    proc_result=$(check_process)
    proc_status=$?
    proc_pid=$(echo "$proc_result" | cut -d'|' -f1)
    proc_cpu=$(echo "$proc_result" | cut -d'|' -f2)
    proc_mem=$(echo "$proc_result" | cut -d'|' -f3)
    proc_rss=$(echo "$proc_result" | cut -d'|' -f4)

    if [ $proc_status -eq 0 ]; then
        log INFO "✅ 进程 PID: ${proc_pid}, CPU: ${proc_cpu}%, MEM: ${proc_mem}%, RSS: ${proc_rss}MB"

        # 警告阈值
        cpu_float=$(echo "$proc_cpu" | awk '{printf "%.0f", $1}')
        mem_float=$(echo "$proc_mem" | awk '{printf "%.0f", $1}')

        if [ "$cpu_float" -gt 80 ]; then
            log WARN "⚠️  CPU 使用率过高: ${proc_cpu}%"
        fi

        if [ "$mem_float" -gt 80 ]; then
            log WARN "⚠️  内存使用率过高: ${proc_mem}%"
        fi

        if [ "$proc_rss" -gt 1024 ]; then
            log WARN "⚠️  内存占用过高: ${proc_rss}MB"
        fi
    else
        log ERROR "❌ 进程未找到"
    fi

    # 等待 10 秒后继续监控
    sleep 10
done
