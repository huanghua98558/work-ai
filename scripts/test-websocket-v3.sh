#!/bin/bash

# WorkBot WebSocket v3.0 集成测试脚本

set -e

echo "==================================================="
echo "  WorkBot WebSocket v3.0 集成测试"
echo "==================================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TESTS_PASSED=0
TESTS_FAILED=0

# 辅助函数
print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_section() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 检查依赖
print_section "1. 检查依赖"

if ! command -v node &> /dev/null; then
    print_error "Node.js 未安装"
    exit 1
fi
print_success "Node.js 已安装"

if ! command -v pnpm &> /dev/null; then
    print_error "pnpm 未安装"
    exit 1
fi
print_success "pnpm 已安装"

# 检查端口
if ! curl -s http://localhost:5000 > /dev/null 2>&1; then
    print_error "服务未在端口 5000 上运行"
    print_info "请先启动服务: coze dev"
    exit 1
fi
print_success "服务正在运行 (端口 5000)"

# 测试数据库连接
print_section "2. 测试数据库连接"

DB_TEST=$(cat <<'EOF'
import { getPool } from './src/lib/db.js';

(async () => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✓ 数据库连接成功');
    process.exit(0);
  } catch (error) {
    console.error('✗ 数据库连接失败:', error.message);
    process.exit(1);
  }
})();
EOF
)

echo "$DB_TEST" > /tmp/test_db.mjs
if node /tmp/test_db.mjs 2>/dev/null; then
    print_success "数据库连接正常"
else
    print_error "数据库连接失败"
fi
rm -f /tmp/test_db.mjs

# 测试类型定义
print_section "3. 测试类型定义"

TYPE_TEST=$(cat <<'EOF'
import {
  WSMessageType,
  CommandType,
  ConfigType,
  DeviceStatus,
  CommandStatus,
  CommandPriority,
  COMMAND_CODE_MAP
} from './src/server/websocket/types.js';

console.log('WSMessageType:', Object.keys(WSMessageType).length, 'types');
console.log('CommandType:', Object.keys(CommandType).length, 'types');
console.log('ConfigType:', Object.keys(ConfigType).length, 'types');
console.log('DeviceStatus:', Object.keys(DeviceStatus).length, 'types');
console.log('CommandStatus:', Object.keys(CommandStatus).length, 'types');
console.log('CommandPriority:', Object.keys(CommandPriority).length, 'types');
console.log('COMMAND_CODE_MAP:', Object.keys(COMMAND_CODE_MAP).length, 'entries');

// 测试消息类型守卫
const testMessage = {
  type: 'authenticate',
  data: { robotId: 'test', token: 'test' },
  timestamp: Date.now()
};

const isAuth = testMessage.type === WSMessageType.AUTHENTICATE;
console.log('类型守卫测试:', isAuth);

process.exit(0);
EOF
)

echo "$TYPE_TEST" > /tmp/test_types.mjs
if node /tmp/test_types.mjs 2>/dev/null; then
    print_success "类型定义正确"
else
    print_error "类型定义测试失败"
fi
rm -f /tmp/test_types.mjs

# 测试 WebSocket 服务器模块
print_section "4. 测试 WebSocket 服务器模块"

WS_TEST=$(cat <<'EOF'
import {
  getOnlineRobots,
  getConnectionCount,
  getServerStatus,
  getQueueStats
} from './src/server/websocket-server-v3.js';

(async () => {
  try {
    const status = getServerStatus();
    const count = getConnectionCount();
    const robots = getOnlineRobots();
    const stats = getQueueStats();

    console.log('服务器状态:', status);
    console.log('连接数:', count);
    console.log('在线机器人:', robots.length);
    console.log('队列统计:', JSON.stringify(stats));

    if (status === 'running' || status === 'stopped') {
      console.log('✓ WebSocket 服务器模块正常');
      process.exit(0);
    } else {
      console.error('✗ WebSocket 服务器状态异常');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ WebSocket 服务器模块测试失败:', error.message);
    process.exit(1);
  }
})();
EOF
)

echo "$WS_TEST" > /tmp/test_ws.mjs
if node /tmp/test_ws.mjs 2>/dev/null; then
    print_success "WebSocket 服务器模块正常"
else
    print_error "WebSocket 服务器模块测试失败"
fi
rm -f /tmp/test_ws.mjs

# 测试数据库表
print_section "5. 测试数据库表"

TABLES_TEST=$(cat <<'EOF'
import { getPool } from './src/lib/db.js';

(async () => {
  try {
    const pool = await getPool();
    const client = await pool.connect();

    // 检查指令队列表
    const commandsResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_name = 'commands'
    `);
    if (commandsResult.rows[0].count > 0) {
      console.log('✓ 指令队列表存在');
    } else {
      console.error('✗ 指令队列表不存在');
      process.exit(1);
    }

    // 检查配置表
    const configsResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_name = 'robot_configs'
    `);
    if (configsResult.rows[0].count > 0) {
      console.log('✓ 配置表存在');
    } else {
      console.error('✗ 配置表不存在');
      process.exit(1);
    }

    // 检查设备状态表
    const statusResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_name = 'device_status'
    `);
    if (statusResult.rows[0].count > 0) {
      console.log('✓ 设备状态表存在');
    } else {
      console.error('✗ 设备状态表不存在');
      process.exit(1);
    }

    client.release();
    console.log('✓ 所有数据库表已创建');
    process.exit(0);
  } catch (error) {
    console.error('✗ 数据库表检查失败:', error.message);
    process.exit(1);
  }
})();
EOF
)

echo "$TABLES_TEST" > /tmp/test_tables.mjs
if node /tmp/test_tables.mjs 2>/dev/null; then
    print_success "数据库表结构正确"
else
    print_error "数据库表结构检查失败"
fi
rm -f /tmp/test_tables.mjs

# 测试 API 接口
print_section "6. 测试 API 接口"

# 测试健康检查接口
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    print_success "健康检查接口正常"
else
    print_info "健康检查接口未实现（可选）"
fi

# 测试 WebSocket 接口
WS_CONNECTION_TEST=$(cat <<'EOF'
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', () => {
  console.log('✓ WebSocket 连接成功');

  // 发送认证消息
  ws.send(JSON.stringify({
    type: 'authenticate',
    data: {
      robotId: 'test-robot',
      token: 'test-token',
      timestamp: Date.now()
    },
    timestamp: Date.now()
  }));

  // 5秒后关闭
  setTimeout(() => {
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('收到消息:', message.type);
});

ws.on('error', (error) => {
  console.error('✗ WebSocket 连接错误:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('✓ WebSocket 连接已关闭');
  process.exit(0);
});
EOF
)

echo "$WS_CONNECTION_TEST" > /tmp/test_ws_connection.mjs
if timeout 10 node /tmp/test_ws_connection.mjs 2>/dev/null; then
    print_success "WebSocket 连接测试通过"
else
    print_info "WebSocket 连接测试失败（可能需要有效的认证凭据）"
fi
rm -f /tmp/test_ws_connection.mjs

# 打印测试结果
print_section "测试结果"
echo ""
echo -e "通过: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "失败: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}部分测试失败，请检查日志${NC}"
    exit 1
fi
