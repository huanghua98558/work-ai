#!/bin/bash
# 快速压力测试脚本（使用 curl 和 awk）

set -e

BASE_URL="${1:-http://localhost:5000}"
CONCURRENT="${2:-20}"
REQUESTS="${3:-200}"
OUTPUT_DIR="./stress-test-results"

mkdir -p "$OUTPUT_DIR"

echo "========================================"
echo "快速压力测试"
echo "========================================"
echo "目标地址: $BASE_URL"
echo "并发数: $CONCURRENT"
echo "请求数: $REQUESTS"
echo "开始时间: $(date)"
echo "========================================"
echo ""

# 测试 1: 健康检查端点
echo "测试 1: 健康检查端点压力测试..."

start_time=$(date +%s)
success=0
failed=0
total_time=0

for ((i=0; i<REQUESTS; i++)); do
  # 启动并发请求
  for ((j=0; j<CONCURRENT; j++)); do
    (
      req_start=$(date +%s%3N)
      status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health/ready")
      req_end=$(date +%s%3N)
      echo "$((req_end - req_start)),$status" >> /tmp/test_results_$$
    ) &

    # 控制并发数
    if (( i % 10 == 0 )); then
      wait
    fi
  done
done

wait

# 分析结果
echo ""
echo "测试结果："
echo ""

if [ -f /tmp/test_results_$$ ]; then
  total=$(wc -l < /tmp/test_results_$$)
  success=$(awk -F',' '$2=="200" {count++} END {print count+0}' /tmp/test_results_$$)
  failed=$((total - success))
  success_rate=$(awk -v total=$total -v success=$success 'BEGIN {printf "%.2f", success * 100 / total}')
  avg_time=$(awk -F',' '{sum+=$1} END {printf "%.2f", sum/NR}' /tmp/test_results_$$)
  max_time=$(awk -F',' '{if(NR==1 || $1>max) max=$1} END {printf "%.0f", max}' /tmp/test_results_$$)
  min_time=$(awk -F',' '{if(NR==1 || $1<min) min=$1} END {printf "%.0f", min}' /tmp/test_results_$$)

  echo "总请求数: $total"
  echo "成功: $success"
  echo "失败: $failed"
  echo "成功率: ${success_rate}%"
  echo ""
  echo "响应时间统计:"
  echo "  平均: ${avg_time} ms"
  echo "  最小: ${min_time} ms"
  echo "  最大: ${max_time} ms"

  # 保存详细结果
  timestamp=$(date +%Y%m%d_%H%M%S)
  cp /tmp/test_results_$$ "$OUTPUT_DIR/quick_test_${timestamp}.csv"

  # 生成统计报告
  cat > "$OUTPUT_DIR/quick_test_report_${timestamp}.txt" <<EOF
# 快速压力测试报告

测试时间: $(date)
目标地址: $BASE_URL

## 测试配置
- 并发数: $CONCURRENT
- 请求数: $REQUESTS
- 总请求数: $total

## 测试结果
- 成功: $success
- 失败: $failed
- 成功率: ${success_rate}%

## 响应时间统计
- 平均: ${avg_time} ms
- 最小: ${min_time} ms
- 最大: ${max_time} ms

## 性能评估
EOF

  # 性能评估
  if (( $(echo "$success_rate >= 99" | awk '{print ($1 >= 99)}') )); then
    echo "✓ 优秀: 成功率 ${success_rate}%" >> "$OUTPUT_DIR/quick_test_report_${timestamp}.txt"
  elif (( $(echo "$success_rate >= 95" | awk '{print ($1 >= 95)}') )); then
    echo "✓ 良好: 成功率 ${success_rate}%" >> "$OUTPUT_DIR/quick_test_report_${timestamp}.txt"
  else
    echo "✗ 需要优化: 成功率 ${success_rate}%" >> "$OUTPUT_DIR/quick_test_report_${timestamp}.txt"
  fi

  if (( $(echo "$avg_time < 200" | awk '{print ($1 < 200)}') )); then
    echo "✓ 优秀: 平均响应时间 ${avg_time}ms" >> "$OUTPUT_DIR/quick_test_report_${timestamp}.txt"
  elif (( $(echo "$avg_time < 500" | awk '{print ($1 < 500)}') )); then
    echo "✓ 良好: 平均响应时间 ${avg_time}ms" >> "$OUTPUT_DIR/quick_test_report_${timestamp}.txt"
  else
    echo "✗ 需要优化: 平均响应时间 ${avg_time}ms" >> "$OUTPUT_DIR/quick_test_report_${timestamp}.txt"
  fi

  rm -f /tmp/test_results_$$
fi

end_time=$(date +%s)
duration=$((end_time - start_time))
throughput=$(awk -v total=$total -v duration=$duration 'BEGIN {printf "%.2f", total / duration}')

echo ""
echo "总耗时: ${duration} 秒"
echo "吞吐量: ${throughput} req/s"
echo ""
echo "========================================"
echo "测试完成"
echo "========================================"
