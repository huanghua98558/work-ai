#!/bin/bash
# 日志远程调度接口测试脚本（不依赖 jq）

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
ROBOT_ID="test_robot_$(date +%s)"
TOKEN="test_token_$(date +%s)"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "========================================"
echo "日志远程调度接口测试"
echo "========================================"
echo "Base URL: $BASE_URL"
echo "Robot ID: $ROBOT_ID"
echo "Token: $TOKEN"
echo "========================================"
echo ""

# 测试 1: 上传日志
log_info "测试 1: 上传日志"
response=$(curl -s -X POST "$BASE_URL/api/v1/logs/upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Robot-Id: $ROBOT_ID" \
  -d "{
    \"robotId\": \"$ROBOT_ID\",
    \"logs\": [
      {
        \"id\": \"log_1\",
        \"timestamp\": $(date +%s000),
        \"level\": 2,
        \"tag\": \"TestModule\",
        \"message\": \"测试日志消息\",
        \"extra\": {\"test\": true, \"value\": 123},
        \"deviceId\": \"test_device\"
      },
      {
        \"id\": \"log_2\",
        \"timestamp\": $(($(date +%s000) + 1000)),
        \"level\": 4,
        \"tag\": \"TestModule\",
        \"message\": \"测试错误日志\",
        \"stackTrace\": \"Error: Test error\",
        \"deviceId\": \"test_device\"
      }
    ]
  }")

echo "响应: $response"
echo ""
log_success "日志上传测试完成"
echo ""

# 等待一秒
sleep 1

# 测试 2: 查询日志
log_info "测试 2: 查询日志"
response=$(curl -s -X GET "$BASE_URL/api/v1/logs/query?robotId=$ROBOT_ID&page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Robot-Id: $ROBOT_ID")

echo "响应: $response"
echo ""
log_success "日志查询测试完成"
echo ""

# 测试 3: 获取日志配置
log_info "测试 3: 获取日志配置"
response=$(curl -s -X GET "$BASE_URL/api/v1/logs/config?robotId=$ROBOT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Robot-Id: $ROBOT_ID")

echo "响应: $response"
echo ""
log_success "获取日志配置测试完成"
echo ""

# 测试 4: 更新日志配置
log_info "测试 4: 更新日志配置"
response=$(curl -s -X POST "$BASE_URL/api/v1/logs/config" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Robot-Id: $ROBOT_ID" \
  -d "{
    \"robotId\": \"$ROBOT_ID\",
    \"logLevel\": 3,
    \"uploadEnabled\": true,
    \"uploadInterval\": 600000,
    \"uploadOnWifiOnly\": false,
    \"maxLogEntries\": 5000,
    \"retentionDays\": 60,
    \"tags\": {\"TestModule\": 4, \"NetworkModule\": 2}
  }")

echo "响应: $response"
echo ""
log_success "更新日志配置测试完成"
echo ""

# 测试 5: 再次查询日志（按级别筛选）
log_info "测试 5: 查询日志（按级别筛选）"
response=$(curl -s -X GET "$BASE_URL/api/v1/logs/query?robotId=$ROBOT_ID&level=4&page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Robot-Id: $ROBOT_ID")

echo "响应: $response"
echo ""
log_success "按级别筛选测试完成"
echo ""

# 测试 6: 查询日志（按关键词筛选）
log_info "测试 6: 查询日志（按关键词筛选）"
response=$(curl -s -X GET "$BASE_URL/api/v1/logs/query?robotId=$ROBOT_ID&keyword=测试&page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Robot-Id: $ROBOT_ID")

echo "响应: $response"
echo ""
log_success "关键词筛选测试完成"
echo ""

echo "========================================"
echo "所有测试完成"
echo "========================================"
