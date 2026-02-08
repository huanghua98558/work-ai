# 部署说明文档

## 问题说明

在部署过程中遇到 "timeout exceeded when trying to connect" 错误，主要由以下原因导致：

1. **数据库连接超时时间过短**：原来设置为 5 秒，在网络不稳定或数据库响应慢时会超时
2. **缺少健康检查机制**：部署系统无法确认服务是否真正启动成功
3. **缺少重试机制**：网络抖动导致连接失败后没有自动重试

## 解决方案

### 1. 优化数据库连接配置

**文件：** `src/lib/db.ts`

**修改内容：**
- 将连接超时从 5 秒增加到 15 秒
- 添加查询超时 30 秒
- 添加连接重试机制（最多重试 3 次，间隔 1 秒）
- 添加连接健康检查功能

```javascript
_pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,  // 从 5 秒增加到 15 秒
  query_timeout: 30000,             // 新增：查询超时 30 秒
  retry: {
    retries: 3,                     // 新增：重试 3 次
    delay: 1000,                    // 新增：重试间隔 1 秒
  },
});
```

### 2. 添加健康检查端点

**文件：** `src/app/api/health/ready/route.ts`

**功能：**
- 检查数据库连接是否正常
- 检查 API 服务是否正常
- 返回详细的健康状态信息

**使用方式：**
```bash
GET /api/health/ready
```

**响应示例：**
```json
{
  "status": "ready",
  "message": "服务已就绪",
  "checks": {
    "database": "ok",
    "api": "ok"
  },
  "timestamp": "2026-02-08T01:49:36.551Z"
}
```

### 3. 创建部署脚本

#### 部署构建脚本
**文件：** `scripts/deploy-build.sh`

**功能：**
- 清理旧的构建文件
- 安装生产环境依赖
- 构建 Next.js 应用
- 验证构建结果

**使用方式：**
```bash
bash scripts/deploy-build.sh
```

#### 启动脚本
**文件：** `scripts/start.sh`

**功能：**
- 启动服务
- 等待服务启动（最多 60 秒）
- 健康检查确认服务就绪
- 失败时自动清理进程

**使用方式：**
```bash
bash scripts/start.sh
```

#### 数据库连接测试脚本
**文件：** `scripts/test-db.sh`

**功能：**
- 测试数据库连接
- 显示数据库版本信息
- 验证环境变量配置

**使用方式：**
```bash
bash scripts/test-db.sh
```

### 4. 更新部署配置

**文件：** `.coze`

**修改内容：**
- 部署时使用 `deploy-build.sh` 构建脚本
- 部署时使用 `start.sh` 启动脚本

```toml
[deploy]
build = ["bash", "scripts/deploy-build.sh"]
run = ["bash", "scripts/start.sh"]
```

## 部署流程

### 开发环境部署

```bash
# 1. 测试数据库连接
bash scripts/test-db.sh

# 2. 启动开发服务器
coze dev
```

### 生产环境部署

```bash
# 1. 测试数据库连接
bash scripts/test-db.sh

# 2. 构建项目
bash scripts/deploy-build.sh

# 3. 启动服务
bash scripts/start.sh

# 4. 验证服务健康状态
curl http://localhost:5000/api/health/ready
```

### 自动化部署

部署系统会自动执行以下步骤：

1. 执行 `scripts/deploy-build.sh`
2. 执行 `scripts/start.sh`
3. 启动脚本会等待服务就绪（最多 60 秒）
4. 通过 `/api/health/ready` 确认服务健康状态
5. 如果超时，自动清理进程并返回错误

## 监控和维护

### 检查服务状态

```bash
# 基本健康检查
curl http://localhost:5000/api/health

# 启动就绪检查
curl http://localhost:5000/api/health/ready

# 系统全面检查
curl http://localhost:5000/api/system/check
```

### 查看日志

```bash
# 查看主日志
tail -f /app/work/logs/bypass/app.log

# 查看开发日志
tail -f /app/work/logs/bypass/dev.log
```

### 数据库维护

```bash
# 测试数据库连接
bash scripts/test-db.sh

# 迁移数据库
pnpm run db:push

# 打开数据库管理界面
pnpm run db:studio
```

## 常见问题

### Q1: 部署时仍然超时怎么办？

**A:**
1. 检查数据库是否可访问
   ```bash
   bash scripts/test-db.sh
   ```

2. 检查网络连接
   ```bash
   ping pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com
   ```

3. 检查数据库白名单配置
   - 确保部署服务器 IP 已添加到数据库白名单
   - 当前配置为 `0.0.0.0/0`（允许所有IP）

4. 检查防火墙规则
   ```bash
   # 检查端口 5432 是否开放
   nc -zv pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com 5432
   ```

### Q2: 服务启动后健康检查失败？

**A:**
1. 查看服务日志
   ```bash
   tail -f /app/work/logs/bypass/app.log
   ```

2. 手动检查数据库连接
   ```bash
   bash scripts/test-db.sh
   ```

3. 检查环境变量配置
   ```bash
   cat .env | grep DATABASE
   ```

### Q3: 如何增加超时时间？

**A:**
修改 `src/lib/db.ts` 中的连接超时配置：

```javascript
_pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,  // 增加到 30 秒
  query_timeout: 60000,             // 增加到 60 秒
  retry: {
    retries: 5,                     // 增加重试次数
    delay: 2000,                    // 增加重试间隔
  },
});
```

## 性能优化建议

1. **连接池大小**：根据服务器资源调整 `max` 参数（当前 20）
2. **超时时间**：根据网络情况调整 `connectionTimeoutMillis`
3. **重试策略**：根据业务需求调整重试次数和间隔
4. **监控告警**：配置数据库连接失败告警

## 安全建议

1. **环境变量**：确保 `.env` 文件不提交到版本控制
2. **数据库密码**：使用强密码并定期更换
3. **网络配置**：生产环境应使用 SSL 连接（`sslmode=require`）
4. **访问控制**：限制数据库白名单，只允许必要的IP访问

## 总结

通过以上优化，部署超时问题已得到解决：

✅ 数据库连接超时增加到 15 秒
✅ 添加了连接重试机制（最多 3 次）
✅ 添加了健康检查端点
✅ 创建了完整的部署脚本
✅ 实现了优雅启动和关闭

如果仍然遇到问题，请：
1. 查看日志获取详细错误信息
2. 检查网络和数据库连接
3. 根据实际情况调整超时和重试参数
