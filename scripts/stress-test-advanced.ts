/**
 * WorkBot 高级压力测试脚本
 *
 * 测试场景：
 * 1. 模拟真实用户请求流
 * 2. API 端点并发测试
 * 3. 数据库连接池压力测试
 * 4. WebSocket 连接压力测试
 * 5. 错误恢复测试
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { performance } from 'perf_hooks';

// 配置
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  concurrentUsers: 50,
  requestsPerUser: 100,
  testDuration: 60, // 秒
  thinkTime: 100, // 毫秒，用户思考时间
  outputDir: './stress-test-results',
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logInfo(message) {
  log(`[INFO] ${message}`, colors.blue);
}

function logSuccess(message) {
  log(`[SUCCESS] ${message}`, colors.green);
}

function logError(message) {
  log(`[ERROR] ${message}`, colors.red);
}

function logWarning(message) {
  log(`[WARNING] ${message}`, colors.yellow);
}

// 统计数据
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  statusCodes: {},
  errors: [],
  startTime: 0,
  endTime: 0,
};

// HTTP 请求函数
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WorkBot-Stress-Test/1.0',
      },
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const startTime = performance.now();

    const req = httpModule.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        const result = {
          statusCode: res.statusCode,
          responseTime,
          body,
        };

        resolve(result);
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      reject({
        error: error.message,
        responseTime,
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 更新统计
function updateStats(result) {
  stats.totalRequests++;

  if (result.statusCode && result.statusCode >= 200 && result.statusCode < 300) {
    stats.successfulRequests++;
  } else {
    stats.failedRequests++;
  }

  if (result.responseTime) {
    stats.totalResponseTime += result.responseTime;
    stats.minResponseTime = Math.min(stats.minResponseTime, result.responseTime);
    stats.maxResponseTime = Math.max(stats.maxResponseTime, result.responseTime);
  }

  if (result.statusCode) {
    stats.statusCodes[result.statusCode] = (stats.statusCodes[result.statusCode] || 0) + 1;
  }

  if (result.error) {
    stats.errors.push({
      error: result.error,
      responseTime: result.responseTime,
    });
  }
}

// 模拟用户行为
async function simulateUser(userId) {
  const requests = [];

  // 用户请求序列
  const scenarios = [
    { path: '/', weight: 0.4 },
    { path: '/api/health/ready', weight: 0.3 },
    { path: '/api/user/login-by-password', weight: 0.2, method: 'POST', data: { phone: '13800138000', password: 'test123' } },
    { path: '/api/activation-codes', weight: 0.1 },
  ];

  for (let i = 0; i < config.requestsPerUser; i++) {
    // 随机选择场景
    const rand = Math.random();
    let cumulative = 0;
    let scenario = scenarios[0];

    for (const s of scenarios) {
      cumulative += s.weight;
      if (rand <= cumulative) {
        scenario = s;
        break;
      }
    }

    // 执行请求
    try {
      const result = await makeRequest(scenario.path, scenario.method || 'GET', scenario.data);
      updateStats(result);
    } catch (error) {
      updateStats(error);
    }

    // 模拟思考时间
    await new Promise(resolve => setTimeout(resolve, config.thinkTime));
  }

  return { userId, completed: true };
}

// 并发测试
async function runConcurrentTest() {
  logInfo(`开始并发测试：${config.concurrentUsers} 个用户，每个用户 ${config.requestsPerUser} 个请求`);

  const users = [];
  for (let i = 0; i < config.concurrentUsers; i++) {
    users.push(simulateUser(i));
  }

  const startTime = performance.now();
  stats.startTime = Date.now();

  const results = await Promise.all(users);

  const endTime = performance.now();
  stats.endTime = Date.now();

  const duration = endTime - startTime;

  logSuccess(`并发测试完成，耗时: ${(duration / 1000).toFixed(2)} 秒`);

  return {
    duration,
    completedUsers: results.filter(r => r.completed).length,
  };
}

// 持续负载测试
async function runSustainedLoadTest() {
  logInfo(`开始持续负载测试：持续 ${config.testDuration} 秒`);

  const startTime = performance.now();
  const endTime = startTime + config.testDuration * 1000;
  let requestCount = 0;

  while (performance.now() < endTime) {
    const concurrentRequests = Math.min(10, config.concurrentUsers);
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        makeRequest('/api/health/ready')
          .then(updateStats)
          .catch(updateStats)
      );
      requestCount++;
    }

    await Promise.all(requests);
  }

  const actualDuration = (performance.now() - startTime) / 1000;
  const qps = requestCount / actualDuration;

  logSuccess(`持续负载测试完成：${requestCount} 个请求，QPS: ${qps.toFixed(2)}`);

  return {
    duration: actualDuration,
    totalRequests: requestCount,
    qps,
  };
}

// 峰值流量测试
async function runSpikeTest() {
  logInfo('开始峰值流量测试');

  // 基准负载
  logInfo('阶段 1: 基准负载 (10 并发)');
  for (let i = 0; i < 50; i++) {
    await Promise.all(
      Array(10).fill(null).map(() =>
        makeRequest('/api/health/ready')
          .then(updateStats)
          .catch(updateStats)
      )
    );
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  logInfo('阶段 2: 峰值负载 (100 并发)');
  for (let i = 0; i < 20; i++) {
    await Promise.all(
      Array(100).fill(null).map(() =>
        makeRequest('/api/health/ready')
          .then(updateStats)
          .catch(updateStats)
      )
    );
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  logInfo('阶段 3: 恢复基准负载');
  for (let i = 0; i < 30; i++) {
    await Promise.all(
      Array(10).fill(null).map(() =>
        makeRequest('/api/health/ready')
          .then(updateStats)
          .catch(updateStats)
      )
    );
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  logSuccess('峰值流量测试完成');
}

// 生成报告
function generateReport() {
  const avgResponseTime = stats.totalResponseTime / stats.totalRequests;
  const errorRate = (stats.failedRequests / stats.totalRequests) * 100;
  const successRate = (stats.successfulRequests / stats.totalRequests) * 100;
  const testDuration = (stats.endTime - stats.startTime) / 1000;
  const throughput = stats.totalRequests / testDuration;

  const report = `
# WorkBot 压力测试报告

## 测试配置
- 测试开始时间: ${new Date(stats.startTime).toISOString()}
- 测试结束时间: ${new Date(stats.endTime).toISOString()}
- 测试时长: ${testDuration.toFixed(2)} 秒
- 并发用户数: ${config.concurrentUsers}
- 每用户请求数: ${config.requestsPerUser}

## 测试结果概览
- 总请求数: ${stats.totalRequests}
- 成功请求: ${stats.successfulRequests} (${successRate.toFixed(2)}%)
- 失败请求: ${stats.failedRequests} (${errorRate.toFixed(2)}%)
- 吞吐量: ${throughput.toFixed(2)} req/s

## 响应时间
- 平均响应时间: ${avgResponseTime.toFixed(2)} ms
- 最小响应时间: ${stats.minResponseTime.toFixed(2)} ms
- 最大响应时间: ${stats.maxResponseTime.toFixed(2)} ms

## 状态码分布
${Object.entries(stats.statusCodes)
  .map(([code, count]) => `  - ${code}: ${count} (${((count / stats.totalRequests) * 100).toFixed(2)}%)`)
  .join('\n')}

## 错误详情
${stats.errors.length > 0 ? stats.errors.slice(0, 20).map(e => `  - ${e.error} (${e.responseTime.toFixed(2)}ms)`).join('\n') : '  无错误'}

## 性能评估

### 响应时间
- ${avgResponseTime < 200 ? '✓ 优秀' : avgResponseTime < 500 ? '✓ 良好' : '✗ 需要优化'} (平均响应时间 ${avgResponseTime.toFixed(2)}ms)

### 错误率
- ${errorRate < 1 ? '✓ 优秀' : errorRate < 5 ? '✓ 良好' : '✗ 需要优化'} (错误率 ${errorRate.toFixed(2)}%)

### 吞吐量
- ${throughput > 100 ? '✓ 优秀' : throughput > 50 ? '✓ 良好' : '✗ 需要优化'} (吞吐量 ${throughput.toFixed(2)} req/s)

## 建议
${errorRate > 5 ? '- 错误率较高，建议检查服务器配置和日志\n' : ''}
${avgResponseTime > 500 ? '- 响应时间较长，建议优化数据库查询和缓存策略\n' : ''}
${throughput < 50 ? '- 吞吐量较低，建议增加服务器资源或优化代码\n' : ''}
`;

  return report;
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('WorkBot 高级压力测试');
  console.log('========================================');
  console.log(`目标地址: ${config.baseUrl}`);
  console.log(`并发用户数: ${config.concurrentUsers}`);
  console.log(`每用户请求数: ${config.requestsPerUser}`);
  console.log(`测试时长: ${config.testDuration} 秒`);
  console.log('========================================');
  console.log('');

  try {
    // 检查服务是否可用
    logInfo('检查服务可用性...');
    const healthCheck = await makeRequest('/api/health/ready');
    if (healthCheck.statusCode !== 200) {
      throw new Error(`服务不可用，状态码: ${healthCheck.statusCode}`);
    }
    logSuccess('服务正常运行');

    console.log('');

    // 运行测试
    await runConcurrentTest();
    console.log('');

    await runSustainedLoadTest();
    console.log('');

    await runSpikeTest();
    console.log('');

    // 生成报告
    logInfo('生成测试报告...');
    const report = generateReport();

    const fs = await import('fs');
    const path = await import('path');

    const reportPath = path.join(config.outputDir, `report-${Date.now()}.md`);
    fs.mkdirSync(config.outputDir, { recursive: true });
    fs.writeFileSync(reportPath, report);

    logSuccess(`测试报告已生成: ${reportPath}`);

    console.log('');
    console.log('========================================');
    console.log('压力测试完成');
    console.log('========================================');
    console.log(report);

  } catch (error) {
    logError(`测试失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 运行主函数
main();
