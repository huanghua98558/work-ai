-- WorkBot 数据库索引优化脚本
-- 用于提高查询性能
-- 执行方式: psql -h <host> -U <user> -d <database> -f optimize-indexes.sql

-- ============================================
-- Robots 表索引
-- ============================================

-- 状态查询索引
CREATE INDEX IF NOT EXISTS idx_robots_status ON robots(status);
CREATE INDEX IF NOT EXISTS idx_robots_status_created ON robots(status, created_at DESC);

-- 最后活跃时间索引（用于排序和活跃度统计）
CREATE INDEX IF NOT EXISTS idx_robots_last_active ON robots(last_active_at DESC NULLS LAST);

-- bot_id 查询索引
CREATE INDEX IF NOT EXISTS idx_robots_bot_id ON robots(bot_id);

-- 用户关联索引
CREATE INDEX IF NOT EXISTS idx_robots_user_id ON robots(user_id);


-- ============================================
-- Activation Codes 表索引
-- ============================================

-- 状态查询索引
CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON activation_codes(status);
CREATE INDEX IF NOT EXISTS idx_activation_codes_status_created ON activation_codes(status, created_at DESC);

-- 类型查询索引
CREATE INDEX IF NOT EXISTS idx_activation_codes_type ON activation_codes(type);

-- code 唯一索引（确保唯一性）
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);

-- 机器人关联索引
CREATE INDEX IF NOT EXISTS idx_activation_codes_robot_id ON activation_codes(robot_id);


-- ============================================
-- Device Tokens 表索引
-- ============================================

-- access_token 唯一索引
CREATE INDEX IF NOT EXISTS idx_device_tokens_access_token ON device_tokens(access_token);

-- robot_id 查询索引
CREATE INDEX IF NOT EXISTS idx_device_tokens_robot_id ON device_tokens(robot_id);

-- 过期时间索引（用于清理过期 token）
CREATE INDEX IF NOT EXISTS idx_device_tokens_expires_at ON device_tokens(expires_at);


-- ============================================
-- Device Bindings 表索引
-- ============================================

-- robot_id 唯一索引
CREATE INDEX IF NOT EXISTS idx_device_bindings_robot_id ON device_bindings(robot_id);

-- device_id 查询索引
CREATE INDEX IF NOT EXISTS idx_device_bindings_device_id ON device_bindings(device_id);

-- user_id 查询索引
CREATE INDEX IF NOT EXISTS idx_device_bindings_user_id ON device_bindings(user_id);

-- 最后活跃时间索引
CREATE INDEX IF NOT EXISTS idx_device_bindings_last_active ON device_bindings(last_active_at DESC);


-- ============================================
-- Logs 表索引
-- ============================================

-- 等级查询索引
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

-- robot_id 查询索引
CREATE INDEX IF NOT EXISTS idx_logs_robot_id ON logs(robot_id);

-- 时间范围查询索引
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);

-- 组合索引：robot_id + timestamp（用于按机器人查询日志）
CREATE INDEX IF NOT EXISTS idx_logs_robot_timestamp ON logs(robot_id, timestamp DESC);

-- 组合索引：level + timestamp（用于按级别查询日志）
CREATE INDEX IF NOT EXISTS idx_logs_level_timestamp ON logs(level, timestamp DESC);


-- ============================================
-- Log Configs 表索引
-- ============================================

-- robot_id 唯一索引
CREATE INDEX IF NOT EXISTS idx_log_configs_robot_id ON log_configs(robot_id);


-- ============================================
-- Users 表索引
-- ============================================

-- phone 唯一索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- role 查询索引
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 创建时间索引
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);


-- ============================================
-- SMS Codes 表索引
-- ============================================

-- phone + code 组合索引
CREATE INDEX IF NOT EXISTS idx_sms_codes_phone_code ON sms_codes(phone, code);

-- 过期时间索引
CREATE INDEX IF NOT EXISTS idx_sms_codes_expires_at ON sms_codes(expires_at);


-- ============================================
-- Activation Records 表索引
-- ============================================

-- code 查询索引
CREATE INDEX IF NOT EXISTS idx_activation_records_code ON activation_records(code);

-- robot_id 查询索引
CREATE INDEX IF NOT EXISTS idx_activation_records_robot_id ON activation_records(robot_id);

-- user_id 查询索引
CREATE INDEX IF NOT EXISTS idx_activation_records_user_id ON activation_records(user_id);

-- 时间索引
CREATE INDEX IF NOT EXISTS idx_activation_records_created_at ON activation_records(created_at DESC);


-- ============================================
-- 索引优化命令
-- ============================================

-- 更新所有表的统计信息（PostgreSQL 查询优化器需要准确的统计信息）
ANALYZE robots;
ANALYZE activation_codes;
ANALYZE device_tokens;
ANALYZE device_bindings;
ANALYZE logs;
ANALYZE log_configs;
ANALYZE users;
ANALYZE sms_codes;
ANALYZE activation_records;


-- ============================================
-- 索引创建完成提示
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '数据库索引优化完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '已创建的索引包括：';
  RAISE NOTICE '  - Robots 表索引';
  RAISE NOTICE '  - Activation Codes 表索引';
  RAISE NOTICE '  - Device Tokens 表索引';
  RAISE NOTICE '  - Device Bindings 表索引';
  RAISE NOTICE '  - Logs 表索引';
  RAISE NOTICE '  - Log Configs 表索引';
  RAISE NOTICE '  - Users 表索引';
  RAISE NOTICE '  - SMS Codes 表索引';
  RAISE NOTICE '  - Activation Records 表索引';
  RAISE NOTICE '========================================';
  RAISE NOTICE '所有表的统计信息已更新';
  RAISE NOTICE '========================================';
END $$;
