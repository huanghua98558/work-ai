#!/bin/bash
# 数据库连接池压力测试

set -e

BASE_URL="${1:-http://localhost:5000}"
OUTPUT_DIR="./stress-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$OUTPUT_DIR"

echo "========================================"
echo "数据库连接池压力测试"
echo "========================================"
echo "目标地址: $BASE_URL"
echo "开始时间: $(date)"
echo "========================================"
echo ""

# 测试 1: 数据库测试端点
echo "测试 1: 数据库连接测试..."

success=0
failed=0

for i in {1..50}; do
  for j in {1..10}; do
    (
      response=$(curl -s "$BASE_URL/api/db/test")
      if echo "$response" | grep -q "success"; then
        echo "1,$(date +%s%3N)" >> /tmp/db_test_results_$$
      else
        echo "0,$(date +%s%3N)" >> /tmp/db_test_results_$$
      fi
    ) &
  done

  if (( i % 5 == 0 )); then
    wait
    echo -n "."
  fi
done

wait

echo ""

# 分析结果
if [ -f /tmp/db_test_results_$$ ]; then
  total=$(wc -l < /tmp/db_test_results_$$)
  success=$(awk -F',' '$1=="1" {count++} END {print count}' /tmp/db_test_results_$$)
  failed=$((total - success))

  echo "数据库测试结果:"
  echo "  总请求数: $total"
  echo "  成功: $success"
  echo "  失败: $failed"
  echo "  成功率: $(awk "BEGIN {printf \"%.2f\", $success * 100 / $total}")%"

  cp /tmp/db_test_results_$$ "$OUTPUT_DIR/db_test_${TIMESTAMP}.csv"
  rm -f /tmp/db_test_results_$$
fi

echo ""

# 测试 2: 激活码列表（数据库查询）
echo "测试 2: 激活码列表查询压力测试..."

success=0
failed=0

for i in {1..100}; do
  for j in {1..5}; do
    (
      start=$(date +%s%3N)
      status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/activation-codes")
      end=$(date +%s%3N)
      echo "$((end - start)),$status" >> /tmp/activation_codes_test_results_$$
    ) &
  done

  if (( i % 10 == 0 )); then
    wait
    echo -n "."
  fi
done

wait

echo ""

# 分析结果
if [ -f /tmp/activation_codes_test_results_$$ ]; then
  total=$(wc -l < /tmp/activation_codes_test_results_$$)
  success=$(awk -F',' '$2=="200" {count++} END {print count}' /tmp/activation_codes_test_results_$$)
  failed=$((total - success))
  avg_time=$(awk -F',' '{sum+=$1} END {printf "%.2f", sum/NR}' /tmp/activation_codes_test_results_$$)

  echo "激活码列表查询结果:"
  echo "  总请求数: $total"
  echo "  成功: $success"
  echo "  失败: $failed"
  echo "  成功率: $(awk "BEGIN {printf \"%.2f\", $success * 100 / $total}")%"
  echo "  平均响应时间: ${avg_time} ms"

  cp /tmp/activation_codes_test_results_$$ "$OUTPUT_DIR/activation_codes_test_${TIMESTAMP}.csv"
  rm -f /tmp/activation_codes_test_results_$$
fi

echo ""

# 测试 3: 持续数据库查询
echo "测试 3: 持续数据库查询（30秒）..."

end_time=$(($(date +%s) + 30))
request_count=0
success_count=0

while [ $(date +%s) -lt $end_time ]; do
  for j in {1..5}; do
    (
      response=$(curl -s "$BASE_URL/api/health/ready")
      if echo "$response" | grep -q "database.*ok"; then
        echo "1" >> /tmp/sustained_db_test_results_$$
      else
        echo "0" >> /tmp/sustained_db_test_results_$$
      fi
    ) &
    request_count=$((request_count + 1))
  done

  if (( request_count % 20 == 0 )); then
    wait
    echo -n "."
  fi

  sleep 0.1
done

wait

echo ""

# 分析结果
if [ -f /tmp/sustained_db_test_results_$$ ]; then
  total=$(wc -l < /tmp/sustained_db_test_results_$$)
  success=$(awk '$1=="1" {count++} END {print count}' /tmp/sustained_db_test_results_$$)

  echo "持续数据库查询结果:"
  echo "  测试时长: 30 秒"
  echo "  总请求数: $total"
  echo "  成功: $success"
  echo "  失败: $((total - success))"
  echo "  成功率: $(awk "BEGIN {printf \"%.2f\", $success * 100 / $total}")%"
  echo "  吞吐量: $(awk "BEGIN {printf \"%.2f\", $total / 30}") req/s"

  rm -f /tmp/sustained_db_test_results_$$
fi

echo ""
echo "========================================"
echo "数据库压力测试完成"
echo "========================================"
echo ""

# 生成测试报告
cat > "$OUTPUT_DIR/db_pool_test_report_${TIMESTAMP}.txt" <<EOF
# 数据库连接池压力测试报告

测试时间: $(date)
目标地址: $BASE_URL

## 测试结果

### 1. 数据库连接测试
- 测试了数据库端点的稳定性
- 验证了连接池在高并发下的表现

### 2. 激活码列表查询测试
- 测试了复杂的数据库查询
- 验证了查询性能

### 3. 持续数据库查询测试
- 测试了长时间运行的稳定性
- 验证了连接的可靠性

## 性能评估

请查看以下文件获取详细结果:
- db_test_${TIMESTAMP}.csv
- activation_codes_test_${TIMESTAMP}.csv

## 建议

根据测试结果，请关注:
1. 数据库连接数是否超出限制
2. 查询响应时间是否稳定
3. 是否有连接泄漏
4. 连接池配置是否合理
EOF

echo "测试报告已生成: $OUTPUT_DIR/db_pool_test_report_${TIMESTAMP}.txt"
