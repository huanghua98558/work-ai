#!/bin/bash

# 部署构建脚本
# 用于在生产环境中构建应用

set -e  # 遇到错误立即退出

echo "========================================="
echo "开始部署构建"
echo "========================================="

# 1. 清理之前的构建
echo "[1/4] 清理之前的构建..."
rm -rf .next
rm -rf node_modules/.cache

# 2. 安装依赖（生产环境）
echo "[2/4] 安装依赖..."
NODE_ENV=production pnpm install --prefer-offline --frozen-lockfile

# 3. 构建Next.js应用
echo "[3/4] 构建Next.js应用..."
NODE_ENV=production pnpm run build

# 4. 检查构建结果
echo "[4/4] 检查构建结果..."
if [ ! -d ".next" ]; then
    echo "❌ 构建失败：.next 目录不存在"
    exit 1
fi

echo "========================================="
echo "✅ 部署构建完成"
echo "========================================="
