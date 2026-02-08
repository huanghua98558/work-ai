#!/bin/bash

# 环境变量检查工具
# 用于快速诊断环境变量配置问题

echo "========================================="
echo "WorkBot 环境变量检查工具"
echo "========================================="
echo ""

# 检查必需的环境变量
echo "检查必需的环境变量..."
echo ""

REQUIRED_VARS=(
  "DATABASE_URL"
  "JWT_SECRET"
)

MISSING_VARS=0

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ $var: 未配置"
    MISSING_VARS=$((MISSING_VARS + 1))
  else
    echo "✅ $var: 已配置"

    # 特殊检查
    if [ "$var" = "DATABASE_URL" ]; then
      # 检查 URL 格式
      if [[ "${!var}" =~ ^postgresql:// ]]; then
        echo "   └─ 格式正确"
      else
        echo "   └─ ⚠️  警告: URL 应该以 postgresql:// 开头"
      fi
    fi

    if [ "$var" = "JWT_SECRET" ]; then
      # 检查长度
      LENGTH=${#var}
      if [ $LENGTH -lt 32 ]; then
        echo "   └─ ⚠️  警告: JWT_SECRET 长度应该至少 32 个字符"
      fi
    fi
  fi
done

echo ""

if [ $MISSING_VARS -gt 0 ]; then
  echo "========================================="
  echo "❌ 检查失败"
  echo "========================================="
  echo ""
  echo "发现 $MISSING_VARS 个缺失的环境变量"
  echo ""
  echo "请配置以下环境变量："
  echo ""
  for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
      echo "  • $var"
    fi
  done
  echo ""
  echo "参考配置："
  echo "  DATABASE_URL=postgresql://user:password@host:5432/database"
  echo "  JWT_SECRET=your-secret-key-at-least-32-characters-long"
  echo ""
  echo "生成 JWT_SECRET："
  echo "  openssl rand -base64 32"
  echo ""
  exit 1
else
  echo "========================================="
  echo "✅ 检查通过"
  echo "========================================="
  echo ""
  echo "所有必需的环境变量都已配置"
  echo ""
  exit 0
fi
