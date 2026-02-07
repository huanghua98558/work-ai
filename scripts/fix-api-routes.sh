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
        content=$(cat "$route")

        # 检查第一行是否是注释
        first_line=$(head -n 1 "$route")
        if [[ $first_line == *"/"* ]]; then
            # 第一行是注释，在注释后添加配置
            # 提取注释行数
            comment_lines=$(head -n 20 "$route" | grep -n "^$" | head -n 1 | cut -d: -f1)
            if [ -z "$comment_lines" ]; then
                comment_lines=1
            fi
            
            # 在注释后添加配置
            temp_file=$(mktemp)
            head -n $comment_lines "$route" > "$temp_file"
            echo "" >> "$temp_file"
            echo "// 强制动态渲染，避免构建时执行" >> "$temp_file"
            echo "export const dynamic = 'force-dynamic';" >> "$temp_file"
            echo "" >> "$temp_file"
            tail -n +$((comment_lines + 1)) "$route" >> "$temp_file"
            mv "$temp_file" "$route"
        else
            # 第一行不是注释，直接在开头添加
            temp_file=$(mktemp)
            echo "// 强制动态渲染，避免构建时执行" > "$temp_file"
            echo "export const dynamic = 'force-dynamic';" >> "$temp_file"
            echo "" >> "$temp_file"
            cat "$route" >> "$temp_file"
            mv "$temp_file" "$route"
        fi
        
        count=$((count + 1))
        echo "✓ 已处理: $route"
    fi
done

echo ""
echo "✅ 完成！共处理 $count 个 API 路由文件"
