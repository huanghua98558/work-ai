#!/bin/bash

echo "========================================"
echo "修复 WorkBot 数据库问题"
echo "========================================"
echo ""

# 检查是否以管理员身份运行
if [ "$EUID" -ne 0 ]; then
  echo "请使用 sudo 运行此脚本"
  exit 1
fi

echo "步骤 1: 创建 user_robots 表..."
sudo -u postgres psql workbot -f /home/admin/workbot/work-ai/scripts/create-user-robots-table.sql

if [ $? -eq 0 ]; then
  echo "✅ user_robots 表创建成功"
else
  echo "❌ user_robots 表创建失败"
  exit 1
fi

echo ""
echo "步骤 2: 验证表是否创建成功..."
sudo -u postgres psql workbot -c "\d user_robots"

echo ""
echo "步骤 3: 验证 robots 表结构..."
sudo -u postgres psql workbot -c "\d robots"

echo ""
echo "步骤 4: 重启应用..."
pm2 restart workbot

echo ""
echo "========================================"
echo "✅ 修复完成！"
echo "========================================"
echo ""
echo "请访问 https://xzzp.xyz 检查页面是否正常"
