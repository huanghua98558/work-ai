#!/bin/bash
# WorkBot 压力测试脚本

set -e

# 配置
BASE_URL="${BASE_URL:-http://localhost:5000}"
CONCURRENT="${CONCURRENT:-50}"
REQUESTS="${REQUESTS:-1000}"
TEST_DURATION="${TEST_DURATION:-60}"
OUTPUT_DIR="./stress-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查服务是否运行
check_service() {
    log_info "检查服务状态..."
    if ! curl -s -f "$BASE_URL/api/health/ready" > /dev/null; then
        log_error "服务未运行或无法访问: $BASE_URL"
        exit 1
    fi
    log_success "服务正常运行"
}

# 获取初始系统状态
get_initial_stats() {
    log_info "获取初始系统状态..."

    # CPU 和内存
    free -h > "$OUTPUT_DIR/memory_before_$TIMESTAMP.txt"
    ps aux | grep "node" | grep -v grep > "$OUTPUT_DIR/processes_before_$TIMESTAMP.txt"

    # 数据库连接（如果可能）
    if command -v ss &> /dev/null; then
        ss -tuln | grep 5000 > "$OUTPUT_DIR/connections_before_$TIMESTAMP.txt"
    fi

    log_success "初始状态已保存"
}

# 测试 1: 静态资源压力测试
test_static_files() {
    log_info "测试 1: 静态资源压力测试..."
    log_info "并发数: $CONCURRENT, 请求数: $REQUESTS"

    if command -v ab &> /dev/null; then
        ab -n "$REQUESTS" -c "$CONCURRENT" -g "$OUTPUT_DIR/static_gnuplot_$TIMESTAMP.tsv" "$BASE_URL/" > "$OUTPUT_DIR/static_ab_$TIMESTAMP.txt" 2>&1
        log_success "静态资源测试完成，结果已保存"
    else
        log_warning "Apache Bench 未安装，跳过此测试"
    fi
}

# 测试 2: API 端点压力测试
test_api_endpoints() {
    log_info "测试 2: API 端点压力测试..."

    # 健康检查端点
    if command -v ab &> /dev/null; then
        log_info "测试健康检查端点..."
        ab -n 1000 -c 50 "$BASE_URL/api/health/ready" > "$OUTPUT_DIR/health_ab_$TIMESTAMP.txt" 2>&1
        log_success "健康检查端点测试完成"
    fi

    # 登录端点（如果有测试账户）
    if command -v ab &> /dev/null; then
        log_info "测试登录端点..."
        ab -n 500 -c 20 -p /tmp/test_login.json -T application/json "$BASE_URL/api/user/login-by-password" > "$OUTPUT_DIR/login_ab_$TIMESTAMP.txt" 2>&1 || true
        log_success "登录端点测试完成"
    fi
}

# 测试 3: 并发连接测试
test_concurrent_connections() {
    log_info "测试 3: 并发连接测试..."

    # 使用 curl 并发测试
    cat > /tmp/concurrent_test.sh <<'EOF'
#!/bin/bash
BASE_URL="$1"
CONCURRENT="$2"
DURATION="$3"

pids=()
start_time=$(date +%s)

for ((i=0; i<CONCURRENT; i++)); do
    (
        while [ $(($(date +%s) - start_time)) -lt $DURATION ]; do
            curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health/ready" > /dev/null
            sleep 0.1
        done
    ) &
    pids+=($!)
done

# 等待所有进程完成
for pid in "${pids[@]}"; do
    wait $pid
done
EOF

    chmod +x /tmp/concurrent_test.sh
    /tmp/concurrent_test.sh "$BASE_URL" 30 60 > "$OUTPUT_DIR/concurrent_$TIMESTAMP.txt" 2>&1

    log_success "并发连接测试完成"
}

# 测试 4: 数据库连接池测试
test_database_pool() {
    log_info "测试 4: 数据库连接池压力测试..."

    if command -v ab &> /dev/null; then
        log_info "测试数据库查询端点..."
        # 假设有测试端点
        ab -n 200 -c 50 "$BASE_URL/api/db/test" > "$OUTPUT_DIR/db_pool_ab_$TIMESTAMP.txt" 2>&1 || true
        log_success "数据库连接池测试完成"
    else
        log_warning "Apache Bench 未安装，跳过数据库池测试"
    fi
}

# 测试 5: 持续负载测试
test_sustained_load() {
    log_info "测试 5: 持续负载测试 ($TEST_DURATION 秒)..."

    cat > /tmp/sustained_test.sh <<'EOF'
#!/bin/bash
BASE_URL="$1"
DURATION="$2"
REPORT_INTERVAL="$3"

pids=()
start_time=$(date +%s)
end_time=$((start_time + DURATION))

for ((i=0; i<10; i++)); do
    (
        while [ $(date +%s) -lt $end_time ]; do
            curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL/api/health/ready" > /dev/null
            sleep 0.2
        done
    ) &
    pids+=($!)
done

# 等待所有进程完成
for pid in "${pids[@]}"; do
    wait $pid
done
EOF

    chmod +x /tmp/sustained_test.sh
    /tmp/sustained_test.sh "$BASE_URL" "$TEST_DURATION" 10 > "$OUTPUT_DIR/sustained_$TIMESTAMP.txt" 2>&1

    log_success "持续负载测试完成"
}

# 获取最终系统状态
get_final_stats() {
    log_info "获取最终系统状态..."

    free -h > "$OUTPUT_DIR/memory_after_$TIMESTAMP.txt"
    ps aux | grep "node" | grep -v grep > "$OUTPUT_DIR/processes_after_$TIMESTAMP.txt"

    if command -v ss &> /dev/null; then
        ss -tuln | grep 5000 > "$OUTPUT_DIR/connections_after_$TIMESTAMP.txt"
    fi

    log_success "最终状态已保存"
}

# 生成测试报告
generate_report() {
    log_info "生成测试报告..."

    cat > "$OUTPUT_DIR/report_$TIMESTAMP.md" <<EOF
# WorkBot 压力测试报告

## 测试时间
- 开始时间: $(date)
- 测试时长: 约 $((TEST_DURATION + 60)) 秒

## 测试配置
- 并发数: $CONCURRENT
- 请求数: $REQUESTS
- 测试时长: $TEST_DURATION 秒
- 目标地址: $BASE_URL

## 测试结果

### 1. 静态资源测试
EOF

    if [ -f "$OUTPUT_DIR/static_ab_$TIMESTAMP.txt" ]; then
        echo "\`\`\`" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
        cat "$OUTPUT_DIR/static_ab_$TIMESTAMP.txt" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
        echo "\`\`\`" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
    fi

    cat >> "$OUTPUT_DIR/report_$TIMESTAMP.md" <<EOF

### 2. API 端点测试
EOF

    if [ -f "$OUTPUT_DIR/health_ab_$TIMESTAMP.txt" ]; then
        echo "\`\`\`" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
        cat "$OUTPUT_DIR/health_ab_$TIMESTAMP.txt" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
        echo "\`\`\`" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
    fi

    cat >> "$OUTPUT_DIR/report_$TIMESTAMP.md" <<EOF

### 3. 系统资源对比
EOF

    echo "#### 内存使用对比" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
    echo "\`\`\`" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
    echo "测试前:" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
    cat "$OUTPUT_DIR/memory_before_$TIMESTAMP.txt" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
    echo "" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
    echo "测试后:" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
    cat "$OUTPUT_DIR/memory_after_$TIMESTAMP.txt" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"
    echo "\`\`\`" >> "$OUTPUT_DIR/report_$TIMESTAMP.md"

    cat >> "$OUTPUT_DIR/report_$TIMESTAMP.md" <<EOF

## 测试文件
所有测试结果已保存在: $OUTPUT_DIR

EOF

    log_success "测试报告已生成: $OUTPUT_DIR/report_$TIMESTAMP.md"
}

# 主测试流程
main() {
    echo "=========================================="
    echo "WorkBot 压力测试"
    echo "=========================================="
    echo "目标地址: $BASE_URL"
    echo "并发数: $CONCURRENT"
    echo "请求数: $REQUESTS"
    echo "测试时长: $TEST_DURATION 秒"
    echo "=========================================="
    echo ""

    check_service
    get_initial_stats

    echo ""
    log_info "开始压力测试..."
    echo ""

    test_static_files
    echo ""

    test_api_endpoints
    echo ""

    test_concurrent_connections
    echo ""

    test_database_pool
    echo ""

    test_sustained_load
    echo ""

    get_final_stats
    echo ""

    generate_report

    echo ""
    log_success "所有测试已完成！"
    echo ""
    echo "测试结果已保存在: $OUTPUT_DIR"
    echo "测试报告: $OUTPUT_DIR/report_$TIMESTAMP.md"
}

# 执行主函数
main "$@"
