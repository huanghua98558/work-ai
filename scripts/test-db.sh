#!/bin/bash

# 数据库连接测试脚本
# 用于部署前验证数据库连接

set -e

echo "========================================="
echo "测试数据库连接"
echo "========================================="

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env 文件不存在"
    exit 1
fi

# 检查环境变量
if [ -z "$PGDATABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo "❌ 数据库连接字符串未配置"
    exit 1
fi

# 使用 psql 测试连接（如果可用）
if command -v psql &> /dev/null; then
    echo "使用 psql 测试连接..."
    CONNECTION_STRING="${PGDATABASE_URL:-$DATABASE_URL}"
    
    if psql "$CONNECTION_STRING" -c "SELECT 1" &> /dev/null; then
        echo "✅ 数据库连接成功"
        psql "$CONNECTION_STRING" -c "SELECT version();"
        exit 0
    else
        echo "❌ 数据库连接失败"
        exit 1
    fi
else
    # 如果没有 psql，使用 Node.js 脚本测试
    echo "使用 Node.js 测试连接..."
    node -e "
const { Client } = require('pg');
const connectionString = process.env.PGDATABASE_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString });

client.connect()
  .then(() => client.query('SELECT version()'))
  .then(res => {
    console.log('✅ 数据库连接成功');
    console.log('数据库版本:', res.rows[0].version);
    return client.end();
  })
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  });
    "
fi
