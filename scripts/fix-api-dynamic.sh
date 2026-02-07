#!/bin/bash
# 批量为所有 API 路由添加动态配置

set -e

echo "🔧 批量为 API 路由添加动态配置..."

# 查找所有 API 路由文件
API_ROUTES=$(find src/app/api -name "route.ts" -type f)

count=0
for route in $API_ROUTES; do
    # 检查是否已经有 dynamic 配置
    if ! grep -q "export const dynamic" "$route"; then
        # 读取文件内容
        first_line=$(head -n 1 "$route")
        
        # 创建临时文件
        temp_file=$(mktemp)
        
        # 添加动态配置
        echo "// 强制动态渲染，避免构建时执行" > "$temp_file"
        echo "export const dynamic = 'force-dynamic';" >> "$temp_file"
        echo "" >> "$temp_file"
        
        # 复制原文件内容
        cat "$route" >> "$temp_file"
        
        # 替换原文件
        mv "$temp_file" "$route"
        
        count=$((count + 1))
        echo "✓ 已处理: $route"
    fi
done

echo ""
echo "✅ 完成！共处理 $count 个 API 路由文件"
