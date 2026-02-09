-- WorkBot 第三方集成数据库迁移脚本
-- 版本: 1.0
-- 日期: 2026-02-09
-- 说明: 创建第三方集成所需的4个新表

-- =====================================================
-- 1. 设备激活表 (device_activations)
-- =====================================================
CREATE TABLE IF NOT EXISTS device_activations (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(255) NOT NULL UNIQUE,
  robot_uuid VARCHAR(255) NOT NULL UNIQUE,
  device_id VARCHAR(255),
  user_id INTEGER,
  activation_code VARCHAR(8),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  activated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  device_info TEXT,

  -- 配置同步相关
  config_version INTEGER DEFAULT 0,
  config_synced_at TIMESTAMP,
  config_synced BOOLEAN DEFAULT true,
  config_error TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS device_activations_robot_id_idx ON device_activations(robot_id);
CREATE INDEX IF NOT EXISTS device_activations_device_id_idx ON device_activations(device_id);
CREATE INDEX IF NOT EXISTS device_activations_user_id_idx ON device_activations(user_id);
CREATE INDEX IF NOT EXISTS device_activations_status_idx ON device_activations(status);

-- 添加注释
COMMENT ON TABLE device_activations IS '设备激活表，记录APP激活状态和配置同步情况';
COMMENT ON COLUMN device_activations.robot_id IS '机器人ID，APP使用的标识符';
COMMENT ON COLUMN device_activations.robot_uuid IS '机器人UUID，全局唯一';
COMMENT ON COLUMN device_activations.device_id IS '设备ID，设备的唯一标识';
COMMENT ON COLUMN device_activations.user_id IS '用户ID，关联users表';
COMMENT ON COLUMN device_activations.activation_code IS '激活码';
COMMENT ON COLUMN device_activations.status IS '状态：active, inactive, expired';
COMMENT ON COLUMN device_activations.config_version IS '配置版本号';
COMMENT ON COLUMN device_activations.config_synced_at IS '配置同步时间';
COMMENT ON COLUMN device_activations.config_synced IS '配置是否已同步到APP';
COMMENT ON COLUMN device_activations.config_error IS '配置同步失败时的错误信息';


-- =====================================================
-- 2. 配置同步日志表 (config_sync_logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS config_sync_logs (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(255) NOT NULL,
  config_version VARCHAR(50) NOT NULL,
  config_data JSONB NOT NULL,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  synced_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS config_sync_logs_robot_id_idx ON config_sync_logs(robot_id);
CREATE INDEX IF NOT EXISTS config_sync_logs_status_idx ON config_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS config_sync_logs_version_idx ON config_sync_logs(config_version);
CREATE INDEX IF NOT EXISTS config_sync_logs_created_at_idx ON config_sync_logs(created_at);

-- 添加注释
COMMENT ON TABLE config_sync_logs IS '配置同步日志表，记录配置推送和同步的详细日志';
COMMENT ON COLUMN config_sync_logs.robot_id IS '机器人ID';
COMMENT ON COLUMN config_sync_logs.config_version IS '配置版本号';
COMMENT ON COLUMN config_sync_logs.config_data IS '配置数据（JSONB）';
COMMENT ON COLUMN config_sync_logs.sync_status IS '同步状态：pending, synced, failed';
COMMENT ON COLUMN config_sync_logs.synced_at IS '同步时间';
COMMENT ON COLUMN config_sync_logs.error_message IS '错误消息';


-- =====================================================
-- 3. 消息发送失败日志表 (message_fail_logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_fail_logs (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  third_party_url TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_type VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  failed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS message_fail_logs_robot_id_idx ON message_fail_logs(robot_id);
CREATE INDEX IF NOT EXISTS message_fail_logs_message_id_idx ON message_fail_logs(message_id);
CREATE INDEX IF NOT EXISTS message_fail_logs_error_type_idx ON message_fail_logs(error_type);
CREATE INDEX IF NOT EXISTS message_fail_logs_created_at_idx ON message_fail_logs(created_at);
CREATE INDEX IF NOT EXISTS message_fail_logs_failed_at_idx ON message_fail_logs(failed_at);

-- 添加注释
COMMENT ON TABLE message_fail_logs IS '消息发送失败日志表，记录APP发送消息到第三方平台失败的日志';
COMMENT ON COLUMN message_fail_logs.robot_id IS '机器人ID';
COMMENT ON COLUMN message_fail_logs.message_id IS '消息ID';
COMMENT ON COLUMN message_fail_logs.third_party_url IS '第三方URL';
COMMENT ON COLUMN message_fail_logs.error_message IS '错误消息';
COMMENT ON COLUMN message_fail_logs.error_type IS '错误类型：timeout, network, server, client';
COMMENT ON COLUMN message_fail_logs.retry_count IS '重试次数';
COMMENT ON COLUMN message_fail_logs.failed_at IS '失败时间';


-- =====================================================
-- 4. 会话表 (sessions)
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  robot_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS sessions_session_id_idx ON sessions(session_id);
CREATE INDEX IF NOT EXISTS sessions_robot_id_idx ON sessions(robot_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_status_idx ON sessions(status);
CREATE INDEX IF NOT EXISTS sessions_last_message_at_idx ON sessions(last_message_at);

-- 添加注释
COMMENT ON TABLE sessions IS '会话表，简化版会话管理';
COMMENT ON COLUMN sessions.session_id IS '会话ID，唯一标识';
COMMENT ON COLUMN sessions.robot_id IS '机器人ID';
COMMENT ON COLUMN sessions.user_id IS '用户ID';
COMMENT ON COLUMN sessions.status IS '状态：active, closed, archived';
COMMENT ON COLUMN sessions.message_count IS '消息数量';
COMMENT ON COLUMN sessions.last_message_at IS '最后消息时间';


-- =====================================================
-- 5. 创建迁移记录表（如果不存在）
-- =====================================================
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- 记录本次迁移
INSERT INTO migrations (name) VALUES ('create-third-party-integration-tables-v1.0')
ON CONFLICT (name) DO NOTHING;


-- =====================================================
-- 完成
-- =====================================================
-- 所有表创建完成，请执行以下查询验证：

-- 验证表是否创建成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'device_activations',
    'config_sync_logs',
    'message_fail_logs',
    'sessions'
  );

-- 验证索引是否创建成功
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN (
    'device_activations',
    'config_sync_logs',
    'message_fail_logs',
    'sessions'
);
