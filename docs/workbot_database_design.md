# WorkBot 数据库设计文档

## 数据库选择

- **数据库类型**：PostgreSQL
- **版本要求**：PostgreSQL 14+
- **字符集**：UTF-8
- **时区**：UTC

## 表结构设计

### 1. 用户表（users）

管理平台用户，包含超级管理员和普通用户。

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nickname VARCHAR(100) NOT NULL DEFAULT '未命名',
    avatar TEXT,
    phone VARCHAR(20) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- admin, user
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, disabled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- 默认超级管理员
INSERT INTO users (nickname, phone, role) VALUES
('超级管理员', '13800000000', 'admin');
```

### 2. 激活码表（activation_codes）

管理激活码的生成、使用、过期等状态。

```sql
CREATE TABLE activation_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unused', -- unused, used, expired, disabled
    validity_period INTEGER NOT NULL, -- 有效期（天数）
    bound_user_id INTEGER, -- 绑定的用户ID（可选）
    price DECIMAL(10, 2), -- 价格
    created_by INTEGER, -- 创建人ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- 激活码过期时间
    used_at TIMESTAMP, -- 首次使用时间
    notes TEXT,
    FOREIGN KEY (bound_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_activation_codes_code ON activation_codes(code);
CREATE INDEX idx_activation_codes_status ON activation_codes(status);
CREATE INDEX idx_activation_codes_bound_user_id ON activation_codes(bound_user_id);
```

### 3. 设备激活记录表（device_activations）

记录设备激活信息，实现一码一设备机制。

```sql
CREATE TABLE device_activations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) NOT NULL,
    user_id INTEGER, -- 绑定的用户ID
    device_id VARCHAR(255) NOT NULL,
    robot_id VARCHAR(255) UNIQUE NOT NULL,
    robot_uuid VARCHAR(255) UNIQUE NOT NULL,
    access_token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, unbound, expired
    
    -- 设备信息
    device_brand VARCHAR(100),
    device_model VARCHAR(100),
    device_manufacturer VARCHAR(100),
    device_os VARCHAR(50),
    device_os_version VARCHAR(50),
    device_network VARCHAR(50),
    device_app_version VARCHAR(50),
    device_total_memory INTEGER,
    device_screen_resolution VARCHAR(50),
    
    -- 统计信息
    activation_count INTEGER DEFAULT 1,
    first_activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 解绑信息
    unbound_at TIMESTAMP,
    unbound_reason TEXT,
    unbound_by INTEGER, -- 解绑操作人
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (code) REFERENCES activation_codes(code) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (unbound_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- 唯一约束：一个激活码+设备ID只能有一条记录
    CONSTRAINT unique_code_device UNIQUE(code, device_id)
);

-- 索引
CREATE INDEX idx_device_activations_code ON device_activations(code);
CREATE INDEX idx_device_activations_device_id ON device_activations(device_id);
CREATE INDEX idx_device_activations_robot_id ON device_activations(robot_id);
CREATE INDEX idx_device_activations_user_id ON device_activations(user_id);
CREATE INDEX idx_device_activations_status ON device_activations(status);
CREATE INDEX idx_device_activations_token_expires_at ON device_activations(token_expires_at);
```

### 4. 设备解绑历史表（device_unbindings）

记录设备解绑历史，用于审计追踪。

```sql
CREATE TABLE device_unbindings (
    id SERIAL PRIMARY KEY,
    activation_id INTEGER NOT NULL,
    code VARCHAR(8) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    robot_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    admin_id INTEGER NOT NULL,
    unbound_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (activation_id) REFERENCES device_activations(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_device_unbindings_code ON device_unbindings(code);
CREATE INDEX idx_device_unbindings_device_id ON device_unbindings(device_id);
CREATE INDEX idx_device_unbindings_robot_id ON device_unbindings(robot_id);
```

### 5. 激活日志表（activation_logs）

记录激活请求日志，用于审计和故障排查。

```sql
CREATE TABLE activation_logs (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_info JSONB,
    action VARCHAR(50) NOT NULL, -- activate, re-activate, fail
    result VARCHAR(20) NOT NULL, -- success, failed
    error_message TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_activation_logs_code ON activation_logs(code);
CREATE INDEX idx_activation_logs_device_id ON activation_logs(device_id);
CREATE INDEX idx_activation_logs_created_at ON activation_logs(created_at);
```

### 6. 机器人配置表（robots）

管理机器人的配置信息，包括AI模式、回调地址等。

```sql
CREATE TABLE robots (
    id SERIAL PRIMARY KEY,
    robot_id VARCHAR(255) UNIQUE NOT NULL,
    robot_uuid VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT '未命名机器人',
    status VARCHAR(20) NOT NULL DEFAULT 'offline', -- online, offline, deleted
    
    -- AI回复模式
    ai_mode VARCHAR(20) NOT NULL DEFAULT 'builtin', -- builtin, third_party
    ai_provider VARCHAR(50), -- doubao, deepseek, kimi, custom
    ai_model VARCHAR(100),
    ai_api_key TEXT,
    ai_temperature DECIMAL(3, 2) DEFAULT 0.7,
    ai_max_tokens INTEGER DEFAULT 2000,
    ai_context_length INTEGER DEFAULT 10, -- 上下文保留条数
    ai_scenario VARCHAR(50), -- 咨询, 问答, 闲聊, 售后, 社群管理
    
    -- 第三方平台配置
    third_party_callback_url TEXT,
    third_party_result_callback_url TEXT,
    third_party_secret_key TEXT,
    
    -- 风控配置
    reply_delay_min INTEGER DEFAULT 1, -- 最小回复延迟（秒）
    reply_delay_max INTEGER DEFAULT 3, -- 最大回复延迟（秒）
    ai_call_limit_daily INTEGER DEFAULT 1000, -- 每日AI调用限制
    
    -- 统计信息
    total_messages INTEGER DEFAULT 0,
    ai_calls_today INTEGER DEFAULT 0,
    last_reset_at TIMESTAMP, -- 每日AI调用计数重置时间
    last_active_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_robots_robot_id ON robots(robot_id);
CREATE INDEX idx_robots_user_id ON robots(user_id);
CREATE INDEX idx_robots_status ON robots(status);
CREATE INDEX idx_robots_ai_mode ON robots(ai_mode);
```

### 7. 消息记录表（messages）

记录所有收发的消息，用于会话管理和历史查询。

```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    robot_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(20) NOT NULL, -- received, sent
    
    -- 消息内容
    spoken TEXT,
    raw_spoken TEXT,
    text_type INTEGER NOT NULL, -- 0=未知 1=文本 2=图片 3=语音 5=视频 7=小程序 8=链接 9=文件
    file_base64 TEXT,
    
    -- 对话信息
    received_name VARCHAR(100),
    group_name VARCHAR(100),
    group_remark VARCHAR(100),
    room_type INTEGER, -- 1=外部群 2=外部联系人 3=内部群 4=内部联系人
    at_me BOOLEAN DEFAULT false,
    
    -- 消息处理
    ai_mode VARCHAR(20),
    ai_provider VARCHAR(50),
    ai_response TEXT,
    ai_tokens_used INTEGER,
    ai_cost DECIMAL(10, 4),
    processing_time_ms INTEGER,
    
    -- 消息状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, success, failed
    error_message TEXT,
    
    -- 指令信息
    command_id VARCHAR(255),
    command_status VARCHAR(20), -- pending, success, failed
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (robot_id) REFERENCES robots(robot_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_messages_robot_id ON messages(robot_id);
CREATE INDEX idx_messages_message_type ON messages(message_type);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_received_name ON messages(received_name);
CREATE INDEX idx_messages_group_name ON messages(group_name);
```

### 8. 会话表（sessions）

管理会话，用于上下文保留和对话历史。

```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    robot_id VARCHAR(255) NOT NULL,
    session_key VARCHAR(255) NOT NULL, -- 唯一会话标识（received_name + group_name）
    received_name VARCHAR(100),
    group_name VARCHAR(100),
    room_type INTEGER,
    
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (robot_id) REFERENCES robots(robot_id) ON DELETE CASCADE,
    
    CONSTRAINT unique_robot_session UNIQUE(robot_id, session_key)
);

-- 索引
CREATE INDEX idx_sessions_robot_id ON sessions(robot_id);
CREATE INDEX idx_sessions_session_key ON sessions(session_key);
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at);
```

### 9. 会话上下文表（session_contexts）

存储会话的上下文消息（最近N条）。

```sql
CREATE TABLE session_contexts (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    robot_id VARCHAR(255) NOT NULL,
    message_id INTEGER NOT NULL,
    
    role VARCHAR(20) NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (robot_id) REFERENCES robots(robot_id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_session_contexts_session_id ON session_contexts(session_id);
CREATE INDEX idx_session_contexts_robot_id ON session_contexts(robot_id);
CREATE INDEX idx_session_contexts_created_at ON session_contexts(created_at);
```

### 10. 指令记录表（commands）

记录下发给APP的指令。

```sql
CREATE TABLE commands (
    id SERIAL PRIMARY KEY,
    robot_id VARCHAR(255) NOT NULL,
    command_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- 指令内容
    command_type VARCHAR(50) NOT NULL, -- send_message, create_group, etc.
    command_params JSONB NOT NULL,
    
    -- 指令状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, success, failed
    sent_at TIMESTAMP,
    executed_at TIMESTAMP,
    
    -- 执行结果
    error_code INTEGER,
    error_reason TEXT,
    execution_time_ms INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (robot_id) REFERENCES robots(robot_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_commands_robot_id ON commands(robot_id);
CREATE INDEX idx_commands_command_id ON commands(command_id);
CREATE INDEX idx_commands_status ON commands(status);
CREATE INDEX idx_commands_created_at ON commands(created_at);
```

### 11. 系统日志表（system_logs）

记录系统各类日志，用于监控和审计。

```sql
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    log_type VARCHAR(20) NOT NULL, -- application, api, error, audit, websocket, ai
    level VARCHAR(20) NOT NULL, -- info, warn, error, debug
    
    -- 日志内容
    message TEXT NOT NULL,
    details JSONB,
    
    -- 关联信息
    robot_id VARCHAR(255),
    user_id INTEGER,
    
    -- 请求信息
    ip_address VARCHAR(50),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (robot_id) REFERENCES robots(robot_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_system_logs_log_type ON system_logs(log_type);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_robot_id ON system_logs(robot_id);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- 日志清理规则：
-- application日志：保留30天
-- api日志：保留7天
-- error日志：永久保留
-- audit日志：永久保留
-- websocket日志：保留7天
-- ai日志：保留30天
```

### 12. 订单表（orders）

记录激活码购买订单。

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    
    -- 订单信息
    order_type VARCHAR(20) NOT NULL DEFAULT 'activation_code', -- activation_code
    validity_period INTEGER NOT NULL, -- 有效期（天数）
    price DECIMAL(10, 2) NOT NULL,
    
    -- 订单状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, cancelled, expired
    payment_method VARCHAR(20), -- wechat
    payment_time TIMESTAMP,
    
    -- 关联信息
    activation_code_id INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activation_code_id) REFERENCES activation_codes(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

### 13. 第三方平台配置表（third_party_configs）

管理第三方AI平台的配置。

```sql
CREATE TABLE third_party_configs (
    id SERIAL PRIMARY KEY,
    robot_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- 回调配置
    message_callback_url TEXT,
    result_callback_url TEXT,
    qrcode_callback_url TEXT,
    status_callback_url TEXT,
    
    -- 安全配置
    secret_key VARCHAR(255),
    enable_signature BOOLEAN DEFAULT false,
    
    -- 配置状态
    is_active BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (robot_id) REFERENCES robots(robot_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_third_party_configs_robot_id ON third_party_configs(robot_id);
```

## 数据库视图

### 1. 机器人统计视图

```sql
CREATE VIEW robot_statistics AS
SELECT 
    r.robot_id,
    r.name,
    r.status,
    r.user_id,
    u.nickname as user_name,
    r.ai_mode,
    r.ai_provider,
    r.total_messages,
    r.ai_calls_today,
    da.device_id,
    da.device_brand,
    da.device_model,
    da.first_activated_at,
    da.last_activated_at,
    ac.code as activation_code,
    ac.validity_period,
    CASE 
        WHEN r.status = 'deleted' THEN '已删除'
        WHEN r.status = 'online' THEN '在线'
        ELSE '离线'
    END as status_text
FROM robots r
LEFT JOIN users u ON r.user_id = u.id
LEFT JOIN device_activations da ON r.robot_id = da.robot_id AND da.status = 'active'
LEFT JOIN activation_codes ac ON da.code = ac.code;
```

### 2. 激活码统计视图

```sql
CREATE VIEW activation_code_statistics AS
SELECT 
    ac.code,
    ac.status,
    ac.validity_period,
    ac.price,
    ac.created_at,
    ac.expires_at,
    u.nickname as bound_user,
    da.robot_id,
    da.device_id,
    da.device_brand,
    da.device_model,
    da.first_activated_at,
    CASE 
        WHEN ac.status = 'unused' THEN '未使用'
        WHEN ac.status = 'used' THEN '已使用'
        WHEN ac.status = 'expired' THEN '已过期'
        WHEN ac.status = 'disabled' THEN '已禁用'
    END as status_text
FROM activation_codes ac
LEFT JOIN users u ON ac.bound_user_id = u.id
LEFT JOIN device_activations da ON ac.code = da.code AND da.status = 'active';
```

## 数据清理策略

### 定时任务（Cron Jobs）

1. **每日重置AI调用计数**（每天00:00）
```sql
UPDATE robots 
SET ai_calls_today = 0, 
    last_reset_at = CURRENT_TIMESTAMP
WHERE ai_calls_today > 0;
```

2. **清理过期订单**（每小时）
```sql
UPDATE orders 
SET status = 'expired'
WHERE status = 'pending' 
  AND expired_at < CURRENT_TIMESTAMP;
```

3. **清理系统日志**（每天01:00）
```sql
-- 清理application日志（保留30天）
DELETE FROM system_logs 
WHERE log_type = 'application' 
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- 清理api日志（保留7天）
DELETE FROM system_logs 
WHERE log_type = 'api' 
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';

-- 清理websocket日志（保留7天）
DELETE FROM system_logs 
WHERE log_type = 'websocket' 
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';

-- 清理ai日志（保留30天）
DELETE FROM system_logs 
WHERE log_type = 'ai' 
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
```

4. **清理已删除的机器人**（每天02:00）
```sql
-- 软删除30天后永久删除
DELETE FROM robots 
WHERE status = 'deleted' 
  AND deleted_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
```

5. **清理过期激活码**（每天03:00）
```sql
UPDATE activation_codes 
SET status = 'expired'
WHERE status IN ('unused', 'used') 
  AND expires_at < CURRENT_TIMESTAMP;
```

## 数据库备份策略

1. **全量备份**：每天凌晨04:00
2. **增量备份**：每小时
3. **备份保留**：7天全量备份，30天增量备份
4. **异地备份**：每天同步到异地存储

## 性能优化

### 索引优化

所有外键和常用查询字段都已建立索引。

### 查询优化

1. 使用 `EXPLAIN ANALYZE` 分析慢查询
2. 避免使用 `SELECT *`，只查询需要的字段
3. 合理使用 `LIMIT` 和 `OFFSET`
4. 使用连接（JOIN）代替子查询

### 连接池配置

```typescript
const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    max: 20,              // 最大连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

## 数据库监控

### 关键指标

1. **连接数**：当前活跃连接数
2. **查询性能**：慢查询日志
3. **表大小**：各表占用空间
4. **索引使用率**：索引效率分析
5. **缓存命中率**：Buffer cache hit ratio

### 告警规则

1. 连接数超过15个
2. 慢查询超过1秒
3. 表大小超过10GB
4. 查询失败率超过1%

## 安全建议

1. **最小权限原则**：数据库用户只授予必要的权限
2. **敏感数据加密**：API密钥、Token等敏感字段加密存储
3. **定期备份**：确保数据安全
4. **访问日志**：记录所有数据库访问
5. **定期审计**：定期检查数据库日志和权限
