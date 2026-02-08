#!/bin/bash

# WorkBot APP 测试脚本
# 用于快速测试 APP 通讯接口

echo "================================"
echo "  WorkBot APP 接口测试工具"
echo "================================"
echo ""

# 服务器配置
SERVER="9.129.28.93:5000"
BASE_URL="http://$SERVER"
WS_URL="ws://$SERVER/ws"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试参数（请修改为实际值）
TEST_CODE="YOUR_ACTIVATION_CODE"    # 激活码
TEST_DEVICE_ID="test-device-$(date +%s)"  # 测试设备 ID

# 全局变量
ROBOT_ID=""
TOKEN=""

# 测试计数器
TESTS_PASSED=0
TESTS_FAILED=0

# 辅助函数
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# 测试 1: 健康检查
test_health_check() {
    echo ""
    echo "测试 1: 健康检查"
    echo "----------------------------------------"
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        print_success "HTTP 服务正常 (HTTP 200)"
        echo "响应: $body"
    else
        print_error "HTTP 服务异常 (HTTP $http_code)"
        echo "响应: $body"
    fi
}

# 测试 2: 激活设备
test_activation() {
    echo ""
    echo "测试 2: 激活设备"
    echo "----------------------------------------"
    print_info "使用激活码: $TEST_CODE"
    print_info "设备 ID: $TEST_DEVICE_ID"
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/robot-ids/activate" \
        -H "Content-Type: application/json" \
        -d "{
            \"code\": \"$TEST_CODE\",
            \"deviceInfo\": {
                \"deviceId\": \"$TEST_DEVICE_ID\",
                \"brand\": \"Test\",
                \"model\": \"Test Device\",
                \"os\": \"Android\",
                \"osVersion\": \"12\"
            }
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        print_success "设备激活成功 (HTTP 200)"
        echo "响应: $body"
        
        # 提取 robotId 和 token
        ROBOT_ID=$(echo "$body" | grep -o '"robotId":"[^"]*"' | cut -d'"' -f4)
        TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        
        print_info "Robot ID: $ROBOT_ID"
        print_info "Token: ${TOKEN:0:20}..."
    else
        print_error "设备激活失败 (HTTP $http_code)"
        echo "响应: $body"
        echo ""
        print_info "请修改脚本中的 TEST_CODE 为有效的激活码"
    fi
}

# 测试 3: WebSocket 监控
test_websocket_monitor() {
    echo ""
    echo "测试 3: WebSocket 监控"
    echo "----------------------------------------"
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/websocket/monitor")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        print_success "WebSocket 监控 API 正常 (HTTP 200)"
        echo "响应: $body"
        
        # 提取连接数
        connections=$(echo "$body" | grep -o '"totalConnections":[0-9]*' | cut -d':' -f2)
        print_info "当前 WebSocket 连接数: $connections"
    else
        print_error "WebSocket 监控 API 异常 (HTTP $http_code)"
        echo "响应: $body"
    fi
}

# 测试 4: WebSocket 连接（需要 wscat）
test_websocket_connection() {
    echo ""
    echo "测试 4: WebSocket 连接"
    echo "----------------------------------------"
    
    if [ -z "$ROBOT_ID" ] || [ -z "$TOKEN" ]; then
        print_info "跳过 WebSocket 连接测试（需要先激活设备）"
        return
    fi
    
    if ! command -v wscat &> /dev/null; then
        print_info "wscat 未安装，跳过 WebSocket 连接测试"
        print_info "安装命令: npm install -g wscat"
        return
    fi
    
    print_info "WebSocket URL: $WS_URL?robotId=$ROBOT_ID&token=${TOKEN:0:20}..."
    print_info "连接超时: 5 秒"
    
    # 使用 wscat 测试连接（5 秒超时）
    output=$(timeout 5 wscat -c "$WS_URL?robotId=$ROBOT_ID&token=$TOKEN" 2>&1 || true)
    
    if echo "$output" | grep -q "Connected\|authenticated"; then
        print_success "WebSocket 连接成功"
        echo "响应: $output"
    elif echo "$output" | grep -q "error\|failed"; then
        print_error "WebSocket 连接失败"
        echo "响应: $output"
    else
        print_info "WebSocket 连接测试超时（可能已连接，但超时未响应）"
    fi
}

# 测试 5: 消息上报
test_message_report() {
    echo ""
    echo "测试 5: 消息上报"
    echo "----------------------------------------"
    
    if [ -z "$ROBOT_ID" ] || [ -z "$TOKEN" ]; then
        print_info "跳过消息上报测试（需要先激活设备）"
        return
    fi
    
    message_id="test-msg-$(date +%s)"
    
    print_info "Robot ID: $ROBOT_ID"
    print_info "Message ID: $message_id"
    print_info "Content: 测试消息"
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/messages/report" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"robotId\": \"$ROBOT_ID\",
            \"messageId\": \"$message_id\",
            \"messageType\": \"text\",
            \"content\": \"测试消息\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        print_success "消息上报成功 (HTTP 200)"
        echo "响应: $body"
    else
        print_error "消息上报失败 (HTTP $http_code)"
        echo "响应: $body"
    fi
}

# 主函数
main() {
    echo "服务器地址: $BASE_URL"
    echo "WebSocket 地址: $WS_URL"
    echo ""
    
    # 检查是否需要设置激活码
    if [ "$TEST_CODE" = "YOUR_ACTIVATION_CODE" ]; then
        print_info "⚠️  请先修改脚本中的 TEST_CODE 为有效的激活码"
        echo ""
        read -p "是否继续测试（仅健康检查和 WebSocket 监控）？(y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "测试已取消"
            exit 0
        fi
        echo ""
    fi
    
    # 运行测试
    test_health_check
    test_websocket_monitor
    
    if [ "$TEST_CODE" != "YOUR_ACTIVATION_CODE" ]; then
        test_activation
        test_websocket_connection
        test_message_report
    fi
    
    # 输出测试结果
    echo ""
    echo "================================"
    echo "  测试结果"
    echo "================================"
    echo -e "${GREEN}通过: $TESTS_PASSED${NC}"
    echo -e "${RED}失败: $TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "所有测试通过！"
    else
        print_error "部分测试失败，请检查日志"
    fi
}

# 运行主函数
main
