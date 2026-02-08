# 日志上传接口文档

## 概述

WorkBot 提供了日志远程调度功能，允许机器人客户端将运行日志上传到服务器进行集中管理和分析。

## 接口规范

### 1. 上传日志

**接口地址**: `POST /api/v1/logs`

**请求头**:
```
Content-Type: application/json
```

**请求参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| robotId | string | 是 | 机器人 ID |
| deviceId | string | 否 | 设备 ID（可选） |
| logs | array | 是 | 日志数组 |

**日志条目结构**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| level | string | 是 | 日志级别（VERBOSE, DEBUG, INFO, WARN, ERROR, FATAL） |
| tag | string | 是 | 日志标签（来源模块） |
| message | string | 是 | 日志消息 |
| timestamp | number | 否 | 时间戳（毫秒，默认当前时间） |
| extras | object | 否 | 扩展信息（JSON 对象） |
| stackTrace | string | 否 | 堆栈跟踪 |

**请求示例**:

```json
{
  "robotId": "robot_123",
  "deviceId": "device_001",
  "logs": [
    {
      "level": "INFO",
      "tag": "RobotService",
      "message": "机器人已启动",
      "timestamp": 1707360000000,
      "extras": null
    },
    {
      "level": "ERROR",
      "tag": "DatabaseService",
      "message": "数据库连接失败",
      "timestamp": 1707360001000,
      "extras": {
        "errorCode": "CONNECTION_REFUSED",
        "host": "localhost:5432"
      },
      "stackTrace": "Error: Connection refused\n    at DatabaseService.connect (/app/src/db.ts:45:15)"
    }
  ]
}
```

**响应示例**:

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "successCount": 2,
    "failedCount": 0,
    "failedIds": []
  }
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 响应状态码（200 成功，400 参数错误，500 服务器错误） |
| message | string | 响应消息 |
| data.successCount | number | 成功上传的日志数量 |
| data.failedCount | number | 上传失败的日志数量 |
| data.failedIds | array | 失败日志的索引数组 |

### 2. 查询日志

**接口地址**: `GET /api/v1/logs`

**查询参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| robotId | string | 是 | 机器人 ID |
| level | number | 否 | 日志级别（0-5） |
| limit | number | 否 | 返回数量（默认 100） |
| offset | number | 否 | 偏移量（默认 0） |

**请求示例**:

```bash
GET /api/v1/logs?robotId=robot_123&level=4&limit=10&offset=0
```

**响应示例**:

```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "logs": [
      {
        "id": "l6TVfTYfvlX5RCCFc50X5",
        "robotId": "robot_123",
        "timestamp": 1707360001000,
        "level": "ERROR",
        "tag": "DatabaseService",
        "message": "数据库连接失败",
        "extras": {
          "errorCode": "CONNECTION_REFUSED",
          "host": "localhost:5432"
        },
        "stackTrace": "Error: Connection refused\n    at DatabaseService.connect (/app/src/db.ts:45:15)",
        "syncStatus": "success",
        "deviceId": "device_001",
        "createdAt": "2026-02-08T17:47:30.254Z"
      }
    ],
    "total": 2,
    "limit": 10,
    "offset": 0
  }
}
```

## 日志级别

| 级别 | 数值 | 说明 |
|------|------|------|
| VERBOSE | 0 | 详细日志（用于调试详细信息） |
| DEBUG | 1 | 调试日志 |
| INFO | 2 | 信息日志（正常运行信息） |
| WARN | 3 | 警告日志（潜在问题） |
| ERROR | 4 | 错误日志（需要处理的问题） |
| FATAL | 5 | 致命错误（导致程序崩溃） |

## 限制条件

1. **单次上传数量**: 最多 1000 条日志
2. **批量大小**: 建议每批 100 条日志
3. **上传频率**: 建议间隔 5 分钟（300 秒）
4. **日志大小**: 单条日志消息建议不超过 10KB
5. **extras 大小**: extras 对象建议不超过 5KB

## 使用示例

### Node.js / TypeScript

```typescript
import { uploadLogs, queryLogs, LogLevel } from '@/lib/log-uploader';

// 上传日志
async function exampleUpload() {
  try {
    const response = await uploadLogs(
      'robot_123',
      [
        {
          level: LogLevel.INFO,
          tag: 'RobotService',
          message: '机器人已启动',
          timestamp: Date.now(),
          extras: {
            version: '1.0.0',
            environment: 'production'
          }
        },
        {
          level: LogLevel.ERROR,
          tag: 'DatabaseService',
          message: '数据库连接失败',
          timestamp: Date.now(),
          extras: {
            errorCode: 'CONNECTION_REFUSED',
            host: 'localhost:5432'
          }
        }
      ],
      'device_001'
    );

    console.log('上传成功:', response.data);
  } catch (error) {
    console.error('上传失败:', error);
  }
}

// 查询日志
async function exampleQuery() {
  try {
    const response = await queryLogs(
      'robot_123',
      {
        level: LogLevel.ERROR,
        limit: 10,
        offset: 0
      }
    );

    console.log('查询成功:', response.data.logs);
  } catch (error) {
    console.error('查询失败:', error);
  }
}
```

### 使用 LogUploader 类

```typescript
import { LogUploader, LogLevel } from '@/lib/log-uploader';

// 创建日志上传器
const uploader = new LogUploader({
  serverUrl: 'http://localhost:5000',
  robotId: 'robot_123',
  deviceId: 'device_001',
  uploadInterval: 300000, // 5 分钟
  batchSize: 100, // 每批 100 条
  maxRetries: 3,
  wifiOnly: false
});

// 添加日志（自动缓冲）
uploader.addLog(LogLevel.INFO, 'RobotService', '机器人已启动');
uploader.addLog(LogLevel.ERROR, 'DatabaseService', '数据库连接失败', {
  errorCode: 'CONNECTION_REFUSED'
});

// 启动定时上传
uploader.start();

// 手动上传（立即上传缓冲的日志）
await uploader.flush();

// 停止定时上传
uploader.stop();

// 销毁上传器（上传剩余日志并停止定时器）
await uploader.destroy();
```

### JavaScript / 浏览器

```javascript
// 上传日志
async function uploadLogs() {
  const response = await fetch('http://localhost:5000/api/v1/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      robotId: 'robot_123',
      deviceId: 'device_001',
      logs: [
        {
          level: 'INFO',
          tag: 'RobotService',
          message: '机器人已启动',
          timestamp: Date.now(),
          extras: null
        }
      ]
    })
  });

  const data = await response.json();
  console.log('上传成功:', data);
}

// 查询日志
async function queryLogs() {
  const response = await fetch('http://localhost:5000/api/v1/logs?robotId=robot_123&limit=10');
  const data = await response.json();
  console.log('查询成功:', data.data.logs);
}
```

### cURL

```bash
# 上传日志
curl -X POST http://localhost:5000/api/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "robotId": "robot_123",
    "logs": [
      {
        "level": "INFO",
        "tag": "RobotService",
        "message": "机器人已启动",
        "timestamp": 1707360000000
      }
    ]
  }'

# 查询日志
curl -X GET "http://localhost:5000/api/v1/logs?robotId=robot_123&limit=10"
```

## 最佳实践

### 1. 日志级别使用

- **VERBOSE**: 仅在需要非常详细的调试信息时使用
- **DEBUG**: 用于开发和调试阶段的日志
- **INFO**: 用于记录正常运行的关键信息（启动、停止、配置变更等）
- **WARN**: 用于记录潜在问题（资源不足、性能下降等）
- **ERROR**: 用于记录需要处理的问题（请求失败、数据错误等）
- **FATAL**: 用于记录导致程序崩溃的严重错误

### 2. 日志内容规范

- **消息简洁**: 每条日志消息建议不超过 200 字符
- **结构化信息**: 使用 extras 字段存储结构化信息
- **上下文完整**: 包含足够的上下文信息用于问题排查
- **避免敏感信息**: 不要在日志中包含密码、密钥等敏感信息

### 3. 性能优化

- **批量上传**: 使用 LogUploader 类进行批量上传
- **定时上传**: 设置合理的上传间隔（5-10 分钟）
- **缓冲管理**: 控制缓冲区大小，避免内存溢出
- **网络优化**: 仅在 WiFi 环境下上传（可选）

### 4. 错误处理

- **重试机制**: 使用 LogUploader 的自动重试功能
- **本地存储**: 上传失败的日志可以存储到本地，稍后重试
- **告警通知**: 重要错误日志可以触发告警通知

## 故障排查

### 问题 1: 上传失败 - robotId 参数缺失

**错误信息**:
```json
{
  "code": 400,
  "message": "robotId 参数缺失",
  "data": null
}
```

**解决方案**: 确保请求体中包含 `robotId` 参数。

### 问题 2: 上传失败 - 日志数量超限

**错误信息**:
```json
{
  "code": 400,
  "message": "单次上传日志数量不能超过 1000 条",
  "data": null
}
```

**解决方案**: 减少单次上传的日志数量，分批次上传。

### 问题 3: 上传失败 - 无效的日志级别

**错误信息**:
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "successCount": 0,
    "failedCount": 1,
    "failedIds": [0]
  }
}
```

**解决方案**: 检查日志级别是否为以下之一：VERBOSE, DEBUG, INFO, WARN, ERROR, FATAL。

### 问题 4: 上传失败 - 网络错误

**错误信息**:
```
Error: HTTP 500: Internal Server Error
```

**解决方案**:
1. 检查网络连接
2. 检查服务器状态
3. 使用重试机制

## 数据库表结构

日志存储在 `logs` 表中，表结构如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(64) | 主键 |
| robot_id | varchar(64) | 机器人 ID |
| timestamp | bigint | 时间戳（毫秒） |
| level | integer | 日志级别（0-5） |
| tag | varchar(128) | 日志标签 |
| message | text | 日志消息 |
| extra | text | 扩展信息（JSON） |
| stack_trace | text | 堆栈跟踪 |
| sync_status | varchar(20) | 同步状态 |
| sync_time | bigint | 同步时间（秒） |
| device_id | varchar(128) | 设备 ID |
| created_at | timestamp | 创建时间 |

## 相关文档

- [部署指南](./DEPLOYMENT_GUIDE.md)
- [服务稳定性优化方案](./SERVICE_STABILITY.md)
- [API 文档](./API.md)
