#!/bin/bash
# 系统资源监控脚本
# 在压力测试期间监控服务器资源使用情况

set -e

# 配置
OUTPUT_DIR="./stress-test-results"
SAMPLE_INTERVAL=1  # 采样间隔（秒）
PID=${1:-$(pgrep -f "tsx server.ts" | head -1)}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 输出文件
CPU_FILE="$OUTPUT_DIR/cpu_usage_$TIMESTAMP.csv"
MEMORY_FILE="$OUTPUT_DIR/memory_usage_$TIMESTAMP.csv"
DISK_FILE="$OUTPUT_DIR/disk_usage_$TIMESTAMP.csv"
PROCESS_FILE="$OUTPUT_DIR/process_stats_$TIMESTAMP.csv"
NETWORK_FILE="$OUTPUT_DIR/network_stats_$TIMESTAMP.csv"

# 写入 CSV 头部
echo "timestamp,cpu_total,cpu_user,cpu_system,cpu_idle" > "$CPU_FILE"
echo "timestamp,total,used,free,available,buffers,cached" > "$MEMORY_FILE"
echo "timestamp,filesystem,size,used,available,use_percent" > "$DISK_FILE"
echo "timestamp,pid,cpu_percent,memory_percent,memory_mb,threads,fd_count" > "$PROCESS_FILE"
echo "timestamp,rx_bytes,tx_bytes,rx_packets,tx_packets" > "$NETWORK_FILE"

# 获取系统 CPU 使用率
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | \
        sed "s/.*, *\([0-9.]*\)%us.*/, \1/" | \
        sed "s/.*, *\([0-9.]*\)%sy.*/\1/" | \
        sed "s/.*, *\([0-9.]*\)%id.*/\1/"
}

# 获取内存使用情况
get_memory_usage() {
    free -m | grep "^Mem:" | awk '{print $2,$3,$4,$7,$6,$5}'
}

# 获取磁盘使用情况
get_disk_usage() {
    df -h | grep -E "^/dev/" | awk '{print $1,$2,$3,$4,$5}' | head -1 | \
        sed 's/%//'
}

# 获取进程统计
get_process_stats() {
    if [ -z "$PID" ]; then
        echo "0,0,0,0,0,0"
        return
    fi

    local cpu_mem=$(ps -p "$PID" -o %cpu,%mem,rss --no-headers 2>/dev/null || echo "0 0 0")
    local threads=$(ps -p "$PID" -o nlwp --no-headers 2>/dev/null || echo "0")
    local fd_count=$(ls -la /proc/$PID/fd 2>/dev/null | wc -l || echo "0")

    echo "$cpu_mem $threads $fd_count" | awk '{printf "%d,%s,%s,%.2f,%s,%s", '"$PID"', $1, $2, $3, $4, $5}'
}

# 获取网络统计
get_network_stats() {
    cat /proc/net/dev | grep -E "eth|ens|enp" | head -1 | \
        awk '{print $2,$10,$3,$11}'
}

# 生成实时监控报告
generate_realtime_report() {
    local cpu_usage=$(get_cpu_usage)
    local memory_usage=$(get_memory_usage)
    local process_stats=$(get_process_stats)

    echo -ne "\r\033[K"
    echo -ne "${GREEN}[MONITOR]${NC} CPU: $cpu_usage | RAM: $memory_usage | Process: $process_stats"
}

# 监控主循环
monitor() {
    echo -e "\n${BLUE}开始系统资源监控...${NC}\n"
    echo "监控 PID: $PID"
    echo "采样间隔: ${SAMPLE_INTERVAL}s"
    echo "按 Ctrl+C 停止监控\n"

    # 清屏并显示标题
    clear
    echo "========================================"
    echo "WorkBot 系统资源监控"
    echo "========================================"
    echo "PID: $PID"
    echo "开始时间: $(date)"
    echo "========================================"
    echo ""

    while true; do
        local timestamp=$(date +%s)

        # 收集数据
        local cpu_usage=$(get_cpu_usage)
        local memory_usage=$(get_memory_usage)
        local disk_usage=$(get_disk_usage)
        local process_stats=$(get_process_stats)
        local network_stats=$(get_network_stats)

        # 写入 CSV 文件
        echo "$timestamp,$cpu_usage" >> "$CPU_FILE"
        echo "$timestamp,$memory_usage" >> "$MEMORY_FILE"
        echo "$timestamp,$disk_usage" >> "$DISK_FILE"
        echo "$timestamp,$process_stats" >> "$PROCESS_FILE"
        echo "$timestamp,$network_stats" >> "$NETWORK_FILE"

        # 生成实时报告
        generate_realtime_report

        sleep "$SAMPLE_INTERVAL"
    done
}

# 清理函数
cleanup() {
    echo ""
    echo -e "\n${BLUE}监控已停止${NC}"

    # 生成汇总报告
    echo ""
    echo "生成汇总报告..."

    cat > "$OUTPUT_DIR/monitoring_summary_$TIMESTAMP.md" <<EOF
# 系统资源监控汇总报告

## 监控时间
- 开始时间: $(date -d @$(head -1 "$CPU_FILE" | cut -d, -f1))
- 结束时间: $(date)
- 采样间隔: ${SAMPLE_INTERVAL} 秒

## CPU 使用情况
\`\`\`
$(awk -F',' 'NR>1 {sum+=$2; count++} END {printf "平均: %.2f%%\n最小: %.2f%%\n最大: %.2f%%\n", sum/count, min, max}' \
    <(tail -n +2 "$CPU_FILE" | sort -t',' -k2 -n | awk -F',' 'NR==1{min=$2} NR==END{print min, $2}' -))
\`\`\`

## 内存使用情况
\`\`\`
$(awk -F',' 'NR>1 {used_sum+=$2; avail_sum+=$4; count++} END {printf "平均已用: %.2f MB\n平均可用: %.2f MB\n", used_sum/count, avail_sum/count}' \
    <(tail -n +2 "$MEMORY_FILE"))
\`\`\`

## 进程资源使用
\`\`\`
$(awk -F',' 'NR>1 {cpu_sum+=$3; mem_sum+=$4; count++} END {printf "平均 CPU: %.2f%%\n平均内存: %.2f%%\n", cpu_sum/count, mem_sum/count}' \
    <(tail -n +2 "$PROCESS_FILE"))
\`\`\`

## 监控文件
- CPU 使用率: $CPU_FILE
- 内存使用: $MEMORY_FILE
- 磁盘使用: $DISK_FILE
- 进程统计: $PROCESS_FILE
- 网络统计: $NETWORK_FILE
EOF

    echo "汇总报告已生成: $OUTPUT_DIR/monitoring_summary_$TIMESTAMP.md"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

# 开始监控
monitor
