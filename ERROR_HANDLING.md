# 错误处理文档

## 概述

本项目实现了完整的错误处理机制，包括：
- 统一的错误类型定义
- 详细的错误日志记录
- 请求追踪（request ID）
- 错误告警机制
- 完善的 API 错误响应

## 错误类型

### 基础错误类

```typescript
// AppError - 应用错误基类
class AppError extends Error {
  code: ErrorCode;          // 错误码
  statusCode: number;       // HTTP 状态码
  level: ErrorLevel;        // 错误等级
  details?: any;            // 详细信息
  requestId?: string;       // 请求 ID
  timestamp: Date;          // 时间戳
}

// 具体错误类
ValidationError          // 验证错误（400）
AuthenticationError      // 认证错误（401）
AuthorizationError       // 授权错误（403）
NotFoundError            // 未找到错误（404）
InternalServerError      // 内部服务器错误（500）
BusinessError            // 业务逻辑错误
DatabaseError            // 数据库错误
AIServiceError           // AI 服务错误
KnowledgeError           // 知识库错误
```

### 错误码（ErrorCode）

```typescript
// 通用错误 1000-1999
UNKNOWN_ERROR
INTERNAL_ERROR
INVALID_PARAMS
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
RATE_LIMIT_EXCEEDED

// 认证相关 2000-2999
INVALID_TOKEN
TOKEN_EXPIRED
INVALID_CREDENTIALS
USER_NOT_FOUND
SMS_SEND_FAILED
SMS_RATE_LIMIT

// 设备/机器人相关 4000-4999
DEVICE_NOT_FOUND
DEVICE_ALREADY_ACTIVATED
ROBOT_NOT_FOUND
ROBOT_OFFLINE

// 消息相关 5000-5999
INVALID_MESSAGE_TYPE
MESSAGE_SEND_FAILED
SESSION_NOT_FOUND

// AI 相关 6000-6999
AI_SERVICE_ERROR
AI_MODEL_ERROR
AI_TIMEOUT

// 知识库相关 7000-7999
KNOWLEDGE_IMPORT_FAILED
KNOWLEDGE_SEARCH_FAILED

// 数据库相关 8000-8999
DATABASE_ERROR
DATABASE_CONNECTION_ERROR

// 文件相关 9000-9999
FILE_UPLOAD_FAILED
FILE_NOT_FOUND
```

## 错误等级

```typescript
enum ErrorLevel {
  DEBUG,      // 调试信息
  INFO,       // 一般信息
  WARN,       // 警告
  ERROR,      // 错误
  CRITICAL,   // 严重错误（触发告警）
}
```

## 使用方法

### 1. 抛出错误

```typescript
import {
  ValidationError,
  NotFoundError,
  BusinessError,
  InternalServerError,
} from '@/lib/error-handler';

// 验证错误
throw new ValidationError('用户名格式不正确');

// 未找到错误
throw new NotFoundError('用户');

// 业务错误
throw new BusinessError(ErrorCode.ACTIVATION_CODE_EXPIRED, '激活码已过期');

// 内部错误
throw new InternalServerError('数据库连接失败', errorDetails);
```

### 2. API 接口错误处理

```typescript
import {
  withErrorHandling,
  successResponse,
  validateParams,
  NotFoundError,
} from '@/lib/error-handler';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  // 验证参数
  const body = await request.json();
  const data = validateParams(schema, body);

  // 业务逻辑
  const result = await doSomething(data);

  // 返回成功响应
  return successResponse(result);
});
```

### 3. 操作包装器

```typescript
import {
  asyncWrapper,
  withDatabase,
  withAIService,
  withRetry,
  withTimeout,
} from '@/lib/error-handler';

// 异步操作包装器
const result = await asyncWrapper(
  async () => { return await fetchData(); },
  '获取数据失败'
);

// 数据库操作包装器
const result = await withDatabase(
  async () => { return await db.query(...); },
  '数据库查询失败'
);

// AI 服务操作包装器
const result = await withAIService(
  async () => { return await aiService.chat(...); },
  'AI 调用失败'
);

// 重试包装器
const result = await withRetry(
  async () => { return await unstableOperation(); },
  3,      // 最多重试 3 次
  1000,   // 初始延迟 1000ms
  '操作失败，请稍后重试'
);

// 超时包装器
const result = await withTimeout(
  async () => { return await slowOperation(); },
  5000,   // 5 秒超时
  '操作超时，请稍后重试'
);
```

### 4. 辅助函数

```typescript
import {
  ensureExists,
  ensurePermission,
  ensureAuthenticated,
} from '@/lib/error-handler';

// 检查资源是否存在
const user = ensureExists(await db.getUser(id), '用户');

// 检查权限
ensurePermission(user.role === 'admin', '无权执行此操作');

// 检查认证
const userId = ensureAuthenticated(request.userId);
```

### 5. 错误日志记录

```typescript
import { logger } from '@/lib/error-logger';

// 记录错误
logger.logError(error, {
  userId: 123,
  robotId: 'robot_001',
  sessionId: 'session_001',
  path: '/api/messages/report',
  method: 'POST',
});

// 记录调试信息
logger.debug('处理消息', { messageId: 12345 });

// 记录信息
logger.info('消息处理成功', { messageId: 12345 });

// 记录警告
logger.warn('响应时间过长', { responseTime: 5000 });
```

### 6. API 响应格式

#### 成功响应

```json
{
  "success": true,
  "data": {
    "messageId": 12345,
    "status": "received"
  },
  "requestId": "req_abc123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "机器人不存在",
  "code": "ROBOT_NOT_FOUND",
  "details": {
    "robotId": "robot_001"
  },
  "requestId": "req_abc123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 日志文件

所有日志文件存储在 `/app/work/logs/bypass/` 目录：

- `debug.log` - 调试日志
- `info.log` - 信息日志
- `warn.log` - 警告日志
- `error.log` - 错误日志
- `critical.log` - 严重错误日志

## 请求追踪

每个请求都会自动生成唯一的 `requestId`，用于追踪请求链路：

```typescript
import { RequestContextManager } from '@/lib/request-context';

// 获取当前请求 ID
const requestId = RequestContextManager.getRequestId();

// 获取用户 ID
const userId = RequestContextManager.getUserId();

// 获取机器人 ID
const robotId = RequestContextManager.getRobotId();
```

## 测试接口

### 测试错误处理

```bash
# 测试验证错误
curl -X POST http://localhost:5000/api/test/errors \
  -H "Content-Type: application/json" \
  -d '{"type": "validation", "message": "测试错误"}'

# 测试未找到错误
curl -X POST http://localhost:5000/api/test/errors \
  -H "Content-Type: application/json" \
  -d '{"type": "notFound", "message": "测试资源"}'

# 测试业务错误
curl -X POST http://localhost:5000/api/test/errors \
  -H "Content-Type: application/json" \
  -d '{"type": "business", "message": "测试业务错误"}'

# 测试内部错误
curl -X POST http://localhost:5000/api/test/errors \
  -H "Content-Type: application/json" \
  -d '{"type": "internal", "message": "测试内部错误"}'
```

### 查看错误日志

```bash
# 获取最近的 100 条错误日志
curl http://localhost:5000/api/admin/errors?limit=100

# 查看错误日志文件
tail -f /app/work/logs/bypass/error.log

# 查看严重错误日志
tail -f /app/work/logs/bypass/critical.log
```

## 最佳实践

### 1. 使用正确的错误类型

```typescript
// ✅ 好的做法
if (!user) {
  throw new NotFoundError('用户');
}

// ❌ 不好的做法
if (!user) {
  throw new Error('用户不存在');
}
```

### 2. 提供详细的错误信息

```typescript
// ✅ 好的做法
throw new ValidationError('用户名格式不正确', {
  field: 'username',
  value: username,
  expectedFormat: '字母开头，4-20个字符'
});

// ❌ 不好的做法
throw new ValidationError('参数错误');
```

### 3. 使用操作包装器

```typescript
// ✅ 好的做法
const result = await withDatabase(
  async () => await db.query(...),
  '数据库查询失败'
);

// ❌ 不好的做法
let result;
try {
  result = await db.query(...);
} catch (error) {
  throw new InternalServerError('数据库查询失败');
}
```

### 4. 记录关键操作

```typescript
// ✅ 好的做法
logger.info('消息上报成功', {
  messageId,
  robotId,
  sessionId,
});

// ❌ 不好的做法
console.log('消息上报成功');
```

### 5. 使用重试机制

```typescript
// ✅ 好的做法
const result = await withRetry(
  async () => await externalAPI.call(),
  3,
  1000,
  '外部 API 调用失败'
);

// ❌ 不好的做法
const result = await externalAPI.call();
```

## 监控和告警

### 1. 严重错误自动告警

`CRITICAL` 级别的错误会自动触发告警机制。

### 2. 错误统计

可以通过 `/api/admin/errors` 接口查看最近的错误统计。

### 3. 日志分析

定期分析日志文件，识别高频错误和性能问题。

## 故障排查

### 常见错误

1. **DATABASE_ERROR**
   - 检查数据库连接配置
   - 检查数据库服务是否运行
   - 查看详细错误日志

2. **AI_SERVICE_ERROR**
   - 检查 AI 服务配置
   - 检查网络连接
   - 查看详细错误日志

3. **INVALID_TOKEN**
   - 检查 JWT 配置
   - 检查 Token 是否过期
   - 重新获取 Token

4. **ROBOT_OFFLINE**
   - 检查机器人 WebSocket 连接
   - 检查机器人是否激活
   - 重启机器人客户端

## 扩展

### 添加自定义错误类型

```typescript
// src/lib/errors.ts
export class MyCustomError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      ErrorCode.MY_CUSTOM_ERROR,
      message,
      400,
      ErrorLevel.INFO,
      details,
      requestId
    );
    this.name = 'MyCustomError';
  }
}
```

### 添加自定义错误告警

```typescript
// src/lib/error-logger.ts
private triggerAlert(entry: LogEntry): void {
  // 实现邮件告警
  sendEmailAlert(entry);

  // 实现短信告警
  sendSMSAlert(entry);

  // 实现钉钉告警
  sendDingTalkAlert(entry);
}
```

## 总结

完善的错误处理机制可以：
- 提高系统的稳定性
- 便于问题定位和排查
- 提供更好的用户体验
- 支持监控和告警
- 促进快速迭代和优化

请遵循最佳实践，确保系统的健壮性和可维护性。
