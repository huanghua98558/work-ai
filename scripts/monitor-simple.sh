#!/bin/bash
# 简化版资源监控脚本

set -e

PID="$1"
OUTPUT_DIR="./stress-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SAMPLE_INTERVAL=1

mkdir -p "$OUTPUT_DIR"

OUTPUT_FILE="$OUTPUT_DIR/monitoring_simple_${TIMESTAMP}.txt"

echo "========================================" | tee -a "$OUTPUT_FILE"
echo "WorkBot 系统资源监控" | tee -a "$OUTPUT_FILE"
echo "========================================" | tee -a "$OUTPUT_FILE"
echo "监控 PID: $PID" | tee -a "$OUTPUT_FILE"
echo "开始时间: $(date)" | tee -a "$OUTPUT_FILE"
echo "========================================" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

# 写入 CSV 头部
echo "timestamp,cpu_user,cpu_system,cpu_idle,mem_total_mb,mem_used_mb,mem_free_mb,mem_available_mb,proc_cpu_percent,proc_mem_percent,proc_mem_mb,connections" > "$OUTPUT_DIR/monitoring_${TIMESTAMP}.csv"

# 监控主循环
echo "开始监控 (按 Ctrl+C 停止)..."
echo ""

monitor_count=0

while true; do
    monitor_count=$((monitor_count + 1))
    timestamp=$(date +%s)

    # 获取 CPU 使用率
    cpu_info=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%us.*/, \1/" | sed "s/.*, *\([0-9.]*\)%sy.*/\1/" | sed "s/.*, *\([0-9.]*\)%id.*/\1/")
    cpu_user=$(echo $cpu_info | awk '{print $1}')
    cpu_system=$(echo $cpu_info | awk '{print $2}')
    cpu_idle=$(echo $cpu_info | awk '{print $3}')

    # 获取内存使用
    mem_info=$(free -m | grep "^Mem:")
    mem_total=$(echo $mem_info | awk '{print $2}')
    mem_used=$(echo $mem_info | awk '{print $3}')
    mem_free=$(echo $mem_info | awk '{print $4}')
    mem_available=$(echo $mem_info | awk '{print $7}')

    # 获取进程信息
    if [ -n "$PID" ]; then
        proc_info=$(ps -p "$PID" -o %cpu,%mem,rss --no-headers 2>/dev/null || echo "0 0 0")
        proc_cpu=$(echo $proc_info | awk '{print $1}')
        proc_mem=$(echo $proc_info | awk '{print $2}')
        proc_mem_mb=$(echo $proc_info | awk '{print $3}')
    else
        proc_cpu=0
        proc_mem=0
        proc_mem_mb=0
    fi

    # 获取连接数
    connections=$(ss -an | grep :5000 | wc -l)

    # 写入 CSV
    echo "$timestamp,$cpu_user,$cpu_system,$cpu_idle,$mem_total,$mem_used,$mem_free,$mem_available,$proc_cpu,$proc_mem,$proc_mem_mb,$connections" >> "$OUTPUT_DIR/monitoring_${TIMESTAMP}.csv"

    # 显示实时状态（每 10 次）
    if (( monitor_count % 10 == 0 )); then
        echo -ne "\r[监控] CPU: ${cpu_user}% user, ${cpu_system}% system, ${cpu_idle}% idle | RAM: ${mem_used}MB / ${mem_total}MB | 进程: ${proc_cpu}% CPU, ${proc_mem}% RAM (${proc_mem_mb}MB) | 连接: ${connections}"
    fi

    sleep "$SAMPLE_INTERVAL"
done
