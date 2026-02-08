#!/bin/bash
# 综合压力测试运行脚本

set -e

# 配置
BASE_URL="${BASE_URL:-http://localhost:5000}"
OUTPUT_DIR="./stress-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 检查服务
check_service() {
    log_info "检查服务状态..."
    if ! curl -s -f "$BASE_URL/api/health/ready" > /dev/null 2>&1; then
        log_error "服务未运行或无法访问: $BASE_URL"
        return 1
    fi
    log_success "服务正常运行"
    return 0
}

# 获取进程 PID
get_pid() {
    ps aux | grep "tsx server.ts" | grep -v grep | awk '{print $2}' | head -1
}

# 主测试流程
main() {
    echo "========================================"
    echo "WorkBot 综合压力测试"
    echo "========================================"
    echo "目标地址: $BASE_URL"
    echo "开始时间: $(date)"
    echo "========================================"
    echo ""

    # 检查服务
    if ! check_service; then
        log_error "无法继续测试，请确保服务正常运行"
        exit 1
    fi

    # 获取服务 PID
    PID=$(get_pid)
    if [ -z "$PID" ]; then
        log_warning "无法获取服务进程 PID，监控可能受限"
    else
        log_info "服务进程 PID: $PID"
    fi

    echo ""

    # 1. 启动资源监控（后台）
    if [ -n "$PID" ]; then
        log_info "启动资源监控（后台）..."
        ./scripts/monitor-resources.sh "$PID" > "$OUTPUT_DIR/monitoring_$TIMESTAMP.log" 2>&1 &
        MONITOR_PID=$!
        sleep 2
        log_success "资源监控已启动 (PID: $MONITOR_PID)"
        echo ""
    fi

    # 2. 执行基础压力测试
    log_info "执行基础压力测试..."
    ./scripts/stress-test.sh > "$OUTPUT_DIR/basic_stress_test_$TIMESTAMP.log" 2>&1
    log_success "基础压力测试完成"
    echo ""

    # 3. 执行高级压力测试
    log_info "执行高级压力测试..."
    if command -v tsx &> /dev/null; then
        tsx scripts/stress-test-advanced.ts > "$OUTPUT_DIR/advanced_stress_test_$TIMESTAMP.log" 2>&1
        log_success "高级压力测试完成"
    else
        log_warning "tsx 未安装，跳过高级压力测试"
    fi
    echo ""

    # 4. 停止资源监控
    if [ -n "$MONITOR_PID" ]; then
        log_info "停止资源监控..."
        kill -SIGINT $MONITOR_PID 2>/dev/null || true
        sleep 2
        log_success "资源监控已停止"
        echo ""
    fi

    # 5. 生成综合报告
    log_info "生成综合报告..."
    cat > "$OUTPUT_DIR/comprehensive_report_$TIMESTAMP.md" <<EOF
# WorkBot 综合压力测试报告

## 测试信息
- 测试时间: $(date)
- 目标地址: $BASE_URL
- 服务 PID: $PID
- 监控 PID: $MONITOR_PID

## 测试结果

### 基础压力测试
详见: \`basic_stress_test_$TIMESTAMP.log\`

### 高级压力测试
详见: \`advanced_stress_test_$TIMESTAMP.log\`

### 系统资源监控
详见: \`monitoring_$TIMESTAMP.log\`

## 性能评估

请查看上述日志文件获取详细的测试结果。

## 建议

根据测试结果，请关注以下方面：
1. 响应时间是否在可接受范围内
2. 错误率是否低于 1%
3. CPU 和内存使用率是否稳定
4. 数据库连接池是否正常工作

## 后续优化方向

根据测试结果，可能需要优化的方面：
- 数据库查询优化
- 缓存策略优化
- 资源限制调整
- 代码性能优化
EOF

    log_success "综合报告已生成: $OUTPUT_DIR/comprehensive_report_$TIMESTAMP.md"

    echo ""
    echo "========================================"
    echo "测试完成"
    echo "========================================"
    echo ""
    echo "所有测试结果已保存在: $OUTPUT_DIR"
    echo ""
    echo "测试文件列表:"
    ls -lh "$OUTPUT_DIR"/*$TIMESTAMP*
}

# 执行主函数
main
