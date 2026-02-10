# WorkBot 数据库修复指南

## 问题说明

修复了两个数据库问题：

1. **dashboard stats API 列名错误**
   - 问题：代码中使用了 `r.bot_id` 进行 JOIN
   - 修复：改为 `r.robot_id`
   - 文件：`src/app/api/dashboard/stats/route.ts`

2. **缺少 user_robots 表**
   - 问题：代码中使用了 `user_robots` 表，但数据库中不存在
   - 修复：创建 `user_robots` 表
   - 文件：`scripts/create-user-robots-table.sql`

## 修复步骤

### 1. 提交代码到 GitHub

在本地执行：

```bash
cd /home/admin/workbot/work-ai
git add .
git commit -m "fix: 修复 dashboard stats API 和创建 user_robots 表"
git push origin main
```

### 2. 在服务器上拉取代码

```bash
cd /home/admin/workbot/work-ai
git pull origin main
```

### 3. 执行数据库修复脚本

```bash
cd /home/admin/workbot/work-ai
chmod +x scripts/fix-database-issues.sh
sudo ./scripts/fix-database-issues.sh
```

或者手动执行 SQL：

```bash
sudo -u postgres psql workbot -f scripts/create-user-robots-table.sql
pm2 restart workbot
```

### 4. 验证修复结果

访问以下页面检查是否正常：
- 仪表盘：https://xzzp.xyz/
- 机器人列表：https://xzzp.xyz/robots
- 知识库：https://xzzp.xyz/knowledge
- 用户列表：https://xzzp.xyz/users

## 如果还有问题

查看错误日志：

```bash
pm2 logs workbot --err --lines 50
```

测试 API：

```bash
# 测试 robots API
curl http://localhost:5000/api/robots

# 测试 dashboard stats API
curl http://localhost:5000/api/dashboard/stats
```
