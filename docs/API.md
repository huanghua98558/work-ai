# WorkBot API 文档

## 基础信息

- **Base URL**: `https://your-domain.com`（或 http://localhost:5000 开发环境）
- **认证方式**: Bearer Token (JWT)
- **响应格式**: JSON

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    // 数据内容
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误信息"
  }
}
```

## 认证相关

### 登录

**请求**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "admin",
  "password": "admin123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "phone": "admin",
      "nickname": "管理员"
    }
  }
}
```

### 注册

**请求**:
```http
POST /api/auth/register
Content-Type: application/json

{
  "phone": "15000150000",
  "password": "password123",
  "nickname": "测试用户"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "phone": "15000150000",
      "nickname": "测试用户"
    }
  }
}
```

### 获取当前用户信息

**请求**:
```http
GET /api/auth/me
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "admin",
    "nickname": "管理员",
    "role": "admin"
  }
}
```

---

## 激活码管理

### 获取激活码列表

**请求**:
```http
GET /api/activation-codes?page=1&pageSize=10&status=active
Authorization: Bearer {token}
```

**查询参数**:
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 10）
- `status`: 状态（active/inactive/expired）
- `type`: 类型（pure_code/bind_robot）
- `keyword`: 搜索关键词

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "ABCD1234EFGH5678",
        "type": "pure_code",
        "validityPeriod": 365,
        "status": "active",
        "notes": "测试激活码",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "expiresAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

### 创建激活码

**请求**:
```http
POST /api/activation-codes
Authorization: Bearer {token}
Content-Type: application/json

{
  "validityPeriod": 365,
  "type": "pure_code",
  "notes": "测试激活码",
  "batchCount": 10,
  "robotId": "uuid" // 仅当 type 为 bind_robot 时需要
}
```

**参数说明**:
- `validityPeriod`: 有效期（天）
- `type`: 类型
  - `pure_code`: 纯激活码
  - `bind_robot`: 绑定机器人
- `notes`: 备注
- `batchCount`: 批量生成数量（仅 pure_code 模式，1-100）
- `robotId`: 绑定的机器人 ID（仅 bind_robot 模式）

**响应**:
```json
{
  "success": true,
  "data": {
    "codes": [
      {
        "id": "uuid",
        "code": "ABCD1234EFGH5678",
        "type": "pure_code",
        "validityPeriod": 365,
        "status": "active",
        "notes": "测试激活码",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "expiresAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 更新激活码

**请求**:
```http
PUT /api/activation-codes/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "inactive",
  "notes": "更新备注"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "ABCD1234EFGH5678",
    "status": "inactive",
    "notes": "更新备注"
  }
}
```

### 删除激活码

**请求**:
```http
DELETE /api/activation-codes/{id}
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

## 机器人管理

### 获取机器人列表

**请求**:
```http
GET /api/robots?page=1&pageSize=10
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "测试机器人",
        "botId": "wx1234567890",
        "corpId": "ww1234567890",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10
  }
}
```

### 创建机器人

**请求**:
```http
POST /api/robots
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "测试机器人",
  "botId": "wx1234567890",
  "corpId": "ww1234567890",
  "secret": "your-secret",
  "config": {
    "aiMode": "built_in",
    "aiProvider": "doubao",
    "model": "doubao-pro-32k",
    "temperature": 0.7,
    "maxTokens": 4096,
    "contextSize": 10,
    "scenario": "customer_service",
    "webhookUrl": "https://your-webhook.com"
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "测试机器人",
    "botId": "wx1234567890",
    "corpId": "ww1234567890",
    "status": "active",
    "config": {
      "aiMode": "built_in",
      "aiProvider": "doubao",
      "model": "doubao-pro-32k"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 更新机器人

**请求**:
```http
PUT /api/robots/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "更新后的机器人名称",
  "config": {
    "temperature": 0.8
  }
}
```

### 删除机器人

**请求**:
```http
DELETE /api/robots/{id}
Authorization: Bearer {token}
```

---

## 对话管理

### 获取对话列表

**请求**:
```http
GET /api/conversations?page=1&pageSize=10&robotId=uuid
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "sessionId": "uuid",
        "userId": "uuid",
        "robotId": "uuid",
        "userMessage": "你好",
        "aiResponse": "你好！有什么我可以帮助你的？",
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 200,
    "page": 1,
    "pageSize": 10
  }
}
```

### 获取对话详情

**请求**:
```http
GET /api/conversations/{id}
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionId": "uuid",
    "userId": "uuid",
    "robotId": "uuid",
    "userMessage": "你好",
    "aiResponse": "你好！有什么我可以帮助你的？",
    "status": "completed",
    "tokens": 150,
    "latency": 1200,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 获取会话详情

**请求**:
```http
GET /api/sessions/{id}
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "robotId": "uuid",
    "status": "active",
    "messageCount": 5,
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "你好",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "你好！有什么我可以帮助你的？",
        "createdAt": "2024-01-01T00:00:01.000Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:10.000Z"
  }
}
```

---

## 知识库管理

### 获取知识库列表

**请求**:
```http
GET /api/knowledge?page=1&pageSize=10
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "产品知识库",
        "description": "产品相关问答",
        "status": "active",
        "documentCount": 100,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 20,
    "page": 1,
    "pageSize": 10
  }
}
```

### 创建知识库

**请求**:
```http
POST /api/knowledge
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "产品知识库",
  "description": "产品相关问答"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "产品知识库",
    "description": "产品相关问答",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 用户管理

### 获取用户列表

**请求**:
```http
GET /api/users?page=1&pageSize=10
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "phone": "15000150000",
        "nickname": "测试用户",
        "role": "user",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 10
  }
}
```

### 获取用户详情

**请求**:
```http
GET /api/users/{id}
Authorization: Bearer {token}
```

---

## 数据库管理

### 创建数据库表

**请求**:
```http
POST /api/db/create-tables
```

**响应**:
```json
{
  "success": true,
  "message": "所有数据库表创建成功"
}
```

### 检查数据库连接

**请求**:
```http
GET /api/db/check
```

**响应**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "database": "workbot",
    "tables": ["users", "robots", "activation_codes", ...]
  }
}
```

---

## 健康检查

### 基本健康检查

**请求**:
```http
GET /api/health
```

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "2.0.0"
  }
}
```

### 就绪检查

**请求**:
```http
GET /api/health/ready
```

**响应**:
```json
{
  "success": true,
  "data": {
    "ready": true,
    "database": "connected",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| `INVALID_CREDENTIALS` | 用户名或密码错误 |
| `UNAUTHORIZED` | 未授权或 Token 无效 |
| `FORBIDDEN` | 权限不足 |
| `NOT_FOUND` | 资源不存在 |
| `VALIDATION_ERROR` | 参数验证失败 |
| `DUPLICATE_ENTRY` | 数据重复 |
| `DATABASE_ERROR` | 数据库错误 |
| `INTERNAL_ERROR` | 服务器内部错误 |

---

## WebSocket 连接

### 连接

```
ws://your-domain.com:5000/ws
```

### 消息格式

**客户端发送**:
```json
{
  "type": "message",
  "data": {
    "sessionId": "uuid",
    "content": "用户消息",
    "userId": "uuid",
    "robotId": "uuid"
  }
}
```

**服务端响应**:
```json
{
  "type": "response",
  "data": {
    "content": "AI 响应",
    "sessionId": "uuid",
    "messageId": "uuid"
  }
}
```

---

## 限制与配额

- **请求频率**: 1000 请求/分钟
- **文件上传**: 最大 10MB
- **批量操作**: 激活码批量生成最多 100 个
- **分页大小**: 每页最多 100 条

---

## 最佳实践

1. **Token 管理**
   - 保存 Token 在安全的地方
   - Token 过期后重新登录
   - 不要在客户端代码中硬编码 Token

2. **错误处理**
   - 检查响应的 `success` 字段
   - 根据 `error.code` 处理不同错误
   - 实现重试机制（对于网络错误）

3. **分页**
   - 使用合理的分页大小
   - 缓存已获取的数据
   - 避免一次性获取大量数据

4. **WebSocket**
   - 实现断线重连机制
   - 心跳检测连接状态
   - 处理连接异常情况

---

## 获取帮助

如果遇到 API 问题：

1. 查看 [故障排查指南](./TROUBLESHOOTING.md)
2. 检查请求参数和格式
3. 查看服务器日志
4. 提交 Issue 并附上详细的错误信息
