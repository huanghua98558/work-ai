#!/bin/bash

# 服务健康检查和自动恢复脚本
# 当服务不可用时自动重启

LOG_FILE="/app/work/logs/bypass/recovery.log"
SERVER_URL="http://localhost:5000"
HEALTH_URL="${SERVER_URL}/api/health"
TIMEOUT=3
MAX_FAILURES=3
FAILURE_COUNT=0

# 记录日志
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

# 检查服务健康
check_health() {
    local response=$(curl -s --max-time $TIMEOUT "$HEALTH_URL" 2>&1)
    if echo "$response" | grep -q '"status":"healthy"'; then
        return 0
    else
        return 1
    fi
}

# 获取服务进程 PID
get_service_pid() {
    local pid=$(ss -lptn 'sport = :5000' | awk '/LISTEN/{print $7}' | grep -oP 'pid=\K\d+')
    echo "$pid"
}

# 杀死服务进程
kill_service() {
    local pid=$(get_service_pid)
    if [ -n "$pid" ]; then
        log INFO "杀死服务进程: PID $pid"
        kill -9 "$pid" 2>/dev/null || true
        sleep 2
    fi
}

# 重启服务
restart_service() {
    log INFO "开始重启服务..."

    # 切换到项目目录
    cd /workspace/projects

    # 检查环境变量
    if [ -f ".env" ]; then
        log INFO "找到 .env 文件"
    else
        log WARN "未找到 .env 文件"
    fi

    # 重启服务
    log INFO "执行: coze dev > /app/work/logs/bypass/dev.log 2>&1 &"
    nohup coze dev > /app/work/logs/bypass/dev.log 2>&1 &

    local new_pid=$!
    log INFO "服务已启动，PID: $new_pid"

    # 等待服务启动
    sleep 5

    # 检查服务是否启动成功
    for i in {1..30}; do
        if check_health; then
            log INFO "✅ 服务重启成功"
            return 0
        fi
        log INFO "等待服务启动... ($i/30)"
        sleep 2
    done

    log ERROR "❌ 服务重启失败"
    return 1
}

# 主监控循环
log INFO "=========================================="
log INFO "启动服务健康检查和自动恢复"
log INFO "最大失败次数: $MAX_FAILURES"
log INFO "=========================================="

while true; do
    if check_health; then
        log INFO "✅ 服务健康"
        FAILURE_COUNT=0
    else
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        log ERROR "❌ 服务健康检查失败 (失败次数: $FAILURE_COUNT/$MAX_FAILURES)"

        # 如果连续失败次数达到阈值，重启服务
        if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
            log ERROR "服务连续失败 $MAX_FAILURES 次，开始恢复..."

            # 获取当前进程信息
            local pid=$(get_service_pid)
            if [ -n "$pid" ]; then
                local cpu=$(ps -p $pid -o %cpu --no-headers 2>/dev/null || echo "0")
                local mem=$(ps -p $pid -o %mem --no-headers 2>/dev/null || echo "0")
                local rss=$(ps -p $pid -o rss --no-headers 2>/dev/null || echo "0")
                local rss_mb=$(( rss / 1024 ))
                log ERROR "进程信息: PID=$pid, CPU=${cpu}%, MEM=${mem}%, RSS=${rss_mb}MB"
            fi

            # 杀死服务
            kill_service

            # 重启服务
            if restart_service; then
                FAILURE_COUNT=0
                log INFO "服务恢复成功"
            else
                log ERROR "服务恢复失败，将在 1 分钟后重试"
                sleep 60
            fi
        fi
    fi

    # 等待 10 秒后继续检查
    sleep 10
done
