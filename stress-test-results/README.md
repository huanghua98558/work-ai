# WorkBot 压力测试工具集

本目录包含 WorkBot 企业微信机器人管理系统的压力测试和监控工具。

## 工具列表

### 1. 快速压力测试 (`quick-stress-test.sh`)

**用途**: 快速测试服务器在高并发下的性能和稳定性

**使用方法**:
```bash
bash scripts/quick-stress-test.sh <base_url> <concurrent> <requests>
```

**参数**:
- `base_url`: 服务器地址（默认: http://localhost:5000）
- `concurrent`: 并发数（默认: 20）
- `requests`: 批次数（默认: 200）

**示例**:
```bash
# 基础测试
bash scripts/quick-stress-test.sh http://localhost:5000 10 50

# 高负载测试
bash scripts/quick-stress-test.sh http://localhost:5000 20 100

# 极限测试
bash scripts/quick-stress-test.sh http://localhost:5000 50 200
```

### 2. 资源监控 (`monitor-simple.sh`)

**用途**: 监控服务器在压力测试期间的资源使用情况

**使用方法**:
```bash
bash scripts/monitor-simple.sh <pid>
```

**参数**:
- `pid`: 需要监控的进程 ID（可以通过 `ps aux | grep "tsx server.ts"` 获取）

**示例**:
```bash
# 获取 PID
PID=$(ps aux | grep "tsx server.ts" | grep -v grep | awk '{print $2}')

# 启动监控（后台运行）
bash scripts/monitor-simple.sh $PID > /tmp/monitor.log 2>&1 &

# 停止监控
pkill -f "monitor-simple.sh"
```

### 3. 数据库连接池测试 (`test-db-pool.sh`)

**用途**: 测试数据库连接池在高并发下的稳定性和性能

**使用方法**:
```bash
bash scripts/test-db-pool.sh <base_url>
```

**参数**:
- `base_url`: 服务器地址（默认: http://localhost:5000）

**示例**:
```bash
bash scripts/test-db-pool.sh http://localhost:5000
```

### 4. 综合压力测试 (`stress-test.sh`)

**用途**: 使用 Apache Bench 进行全面的压力测试

**前提**: 需要安装 Apache Bench (`ab`)

**使用方法**:
```bash
bash scripts/stress-test.sh
```

### 5. 高级压力测试 (`stress-test-advanced.ts`)

**用途**: 使用 TypeScript 进行高级压力测试，支持更复杂的场景

**前提**: 需要安装 `tsx`

**使用方法**:
```bash
tsx scripts/stress-test-advanced.ts
```

### 6. 综合测试运行器 (`run-stress-test.sh`)

**用途**: 一键运行所有测试和监控

**使用方法**:
```bash
bash scripts/run-stress-test.sh
```

## 测试结果

所有测试结果保存在 `./stress-test-results/` 目录下：

### 文件类型

1. **CSV 文件**: 包含详细的测试数据
   - `quick_test_*.csv` - 压力测试详细数据
   - `db_test_*.csv` - 数据库测试数据
   - `activation_codes_test_*.csv` - 激活码查询数据
   - `monitoring_*.csv` - 资源监控数据

2. **报告文件**: 包含测试总结和评估
   - `quick_test_report_*.txt` - 压力测试报告
   - `db_pool_test_report_*.txt` - 数据库测试报告
   - `comprehensive_report_*.md` - 综合测试报告
   - `FINAL_REPORT.md` - 最终测试报告

## 快速开始

### 1. 准备环境

确保服务正在运行：

```bash
# 检查服务状态
curl http://localhost:5000/api/health/ready

# 如果服务未运行，启动服务
pnpm run start
```

### 2. 运行基础测试

```bash
# 运行快速压力测试
bash scripts/quick-stress-test.sh http://localhost:5000 10 50
```

### 3. 查看结果

```bash
# 查看测试报告
cat stress-test-results/quick_test_report_*.txt | tail -20

# 查看详细数据
head -20 stress-test-results/quick_test_*.csv
```

### 4. 运行完整测试套件

```bash
# 获取服务 PID
PID=$(ps aux | grep "tsx server.ts" | grep -v grep | awk '{print $2}')

# 启动监控
bash scripts/monitor-simple.sh $PID > /tmp/monitor.log 2>&1 &

# 运行高负载测试
bash scripts/quick-stress-test.sh http://localhost:5000 20 100

# 运行数据库测试
bash scripts/test-db-pool.sh http://localhost:5000

# 停止监控
pkill -f "monitor-simple.sh"

# 查看监控数据
tail -20 stress-test-results/monitoring_*.csv
```

## 性能指标说明

### 关键指标

1. **成功率**: 成功请求数 / 总请求数
   - 优秀: >= 99%
   - 良好: >= 95%
   - 需要优化: < 95%

2. **平均响应时间**: 所有请求的平均响应时间
   - 优秀: < 200ms
   - 良好: < 500ms
   - 需要优化: >= 500ms

3. **吞吐量**: 每秒处理的请求数
   - 优秀: > 100 req/s
   - 良好: > 50 req/s
   - 需要优化: <= 50 req/s

4. **资源使用率**: CPU 和内存使用情况
   - CPU: 平均 < 70% 为健康状态
   - 内存: 无内存泄漏，使用稳定

## 常见问题

### Q: 如何调整测试参数？

A: 修改脚本中的 `CONCURRENT` 和 `REQUESTS` 变量，或通过命令行参数传递。

### Q: 测试期间服务崩溃了怎么办？

A: 检查日志文件（`/app/work/logs/bypass/app.log`），查看错误信息，并分析崩溃原因。

### Q: 如何测试需要认证的 API？

A: 在测试脚本中添加认证 token，或使用已有的测试账户进行登录。

### Q: 监控数据不准确怎么办？

A: 确保传入正确的进程 PID，并使用 `top` 或 `htop` 验证监控数据。

## 最佳实践

1. **渐进式测试**: 从小负载开始，逐步增加并发数和请求数
2. **持续监控**: 在测试期间始终运行资源监控，实时了解系统状态
3. **多次测试**: 进行多次测试以确保结果的稳定性和可靠性
4. **数据分析**: 仔细分析测试数据，找出性能瓶颈
5. **优化验证**: 每次优化后重新测试，验证优化效果

## 报告生成

测试完成后，可以查看 `FINAL_REPORT.md` 获取完整的测试报告：

```bash
cat stress-test-results/FINAL_REPORT.md
```

该报告包含：
- 测试概述和配置
- 详细的测试结果
- 性能分析和评估
- 优化建议

## 联系方式

如有问题或建议，请查看项目文档或联系开发团队。

---

**最后更新**: 2026-02-08
**版本**: 1.0.0
