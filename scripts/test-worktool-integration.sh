#!/bin/bash

# WorkTool 集成测试工具
# 用于测试 WorkTool 适配层的各个接口

set -e

# 配置
BASE_URL="${BASE_URL:-http://localhost:5000}"
ROBOT_ID="${ROBOT_ID:-RBml9n7nikHIMZU0}"
ACCESS_TOKEN="${ACCESS_TOKEN:-}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 测试 1: 消息回调接口
test_message_callback() {
    print_info "测试 1: 消息回调接口"
    print_info "URL: ${BASE_URL}/api/worktool/callback?robotId=${ROBOT_ID}&type=message"

    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${BASE_URL}/api/worktool/callback?robotId=${ROBOT_ID}&type=message" \
        -H "Content-Type: application/json" \
        -d '{
            "messageId": "msg-test-'$(date +%s)'",
            "senderId": "wxid-test001",
            "senderName": "测试用户",
            "messageType": "text",
            "content": "这是一条测试消息",
            "chatType": "single",
            "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        }')

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        print_success "消息回调测试成功"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_error "消息回调测试失败，HTTP 状态码: $http_code"
        echo "$body"
        return 1
    fi
}

# 测试 2: 状态回调接口（在线）
test_online_callback() {
    print_info "测试 2: 状态回调接口（在线）"
    print_info "URL: ${BASE_URL}/api/worktool/callback?robotId=${ROBOT_ID}&type=online"

    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${BASE_URL}/api/worktool/callback?robotId=${ROBOT_ID}&type=online" \
        -H "Content-Type: application/json" \
        -d '{
            "status": "online",
            "deviceInfo": {
                "model": "Xiaomi 14",
                "os": "Android 14",
                "appVersion": "1.0.0"
            },
            "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        }')

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        print_success "在线状态回调测试成功"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_error "在线状态回调测试失败，HTTP 状态码: $http_code"
        echo "$body"
        return 1
    fi
}

# 测试 3: 二维码回调接口
test_qrcode_callback() {
    print_info "测试 3: 二维码回调接口"
    print_info "URL: ${BASE_URL}/api/worktool/callback?robotId=${ROBOT_ID}&type=qrcode"

    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${BASE_URL}/api/worktool/callback?robotId=${ROBOT_ID}&type=qrcode" \
        -H "Content-Type: application/json" \
        -d '{
            "groupChatId": "group-test001",
            "qrcodeUrl": "https://example.com/qrcode/test.png",
            "groupName": "测试群",
            "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        }')

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        print_success "二维码回调测试成功"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_error "二维码回调测试失败，HTTP 状态码: $http_code"
        echo "$body"
        return 1
    fi
}

# 测试 4: 发送消息接口
test_send_message() {
    if [ -z "$ACCESS_TOKEN" ]; then
        print_warning "未设置 ACCESS_TOKEN 环境变量，跳过发送消息测试"
        return 0
    fi

    print_info "测试 4: 发送消息接口"
    print_info "URL: ${BASE_URL}/api/worktool/sendMessage"

    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${BASE_URL}/api/worktool/sendMessage" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -d "{
            \"robotId\": \"${ROBOT_ID}\",
            \"commandType\": \"send_message\",
            \"params\": {
                \"target\": \"测试用户\",
                \"content\": \"这是一条测试消息\",
                \"messageType\": \"text\"
            }
        }")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        print_success "发送消息测试成功"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"

        # 提取 commandId
        command_id=$(echo "$body" | jq -r '.data.commandId' 2>/dev/null)
        if [ -n "$command_id" ] && [ "$command_id" != "null" ]; then
            print_info "命令ID: $command_id"
            export COMMAND_ID="$command_id"
        fi
    else
        print_error "发送消息测试失败，HTTP 状态码: $http_code"
        echo "$body"
        return 1
    fi
}

# 测试 5: 查询命令状态接口
test_query_command() {
    if [ -z "$COMMAND_ID" ]; then
        print_warning "未设置 COMMAND_ID，跳过查询命令状态测试"
        return 0
    fi

    print_info "测试 5: 查询命令状态接口"
    print_info "URL: ${BASE_URL}/api/worktool/commands/${COMMAND_ID}"

    response=$(curl -s -w "\n%{http_code}" -X GET \
        "${BASE_URL}/api/worktool/commands/${COMMAND_ID}")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        print_success "查询命令状态测试成功"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_error "查询命令状态测试失败，HTTP 状态码: $http_code"
        echo "$body"
        return 1
    fi
}

# 主函数
main() {
    print_info "WorkTool 集成测试开始"
    print_info "BASE_URL: ${BASE_URL}"
    print_info "ROBOT_ID: ${ROBOT_ID}"
    echo ""

    # 运行测试
    test_message_callback || true
    echo ""

    test_online_callback || true
    echo ""

    test_qrcode_callback || true
    echo ""

    test_send_message || true
    echo ""

    test_query_command || true
    echo ""

    print_info "WorkTool 集成测试完成"
}

# 运行主函数
main
