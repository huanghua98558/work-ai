#!/bin/bash
set -e

echo "🚀 Starting deployment build process..."

# 安装依赖
echo "📦 Installing dependencies..."
pnpm install

# 构建项目
echo "🔨 Building project..."
pnpm run build

echo "✅ Build completed successfully!"
