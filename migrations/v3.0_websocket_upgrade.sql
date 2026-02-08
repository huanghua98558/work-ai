-- WorkBot WebSocket v3.0 数据库迁移脚本
-- 创建指令队列表、配置表和设备状态表

-- 1. 指令队列表
CREATE TABLE IF NOT EXISTS commands (
  id VARCHAR(50) PRIMARY KEY,
  robot_id VARCHAR(50) NOT NULL,
  command_type VARCHAR(50) NOT NULL,
  command_code INT,
  target VARCHAR(100),
  params JSONB NOT NULL,
  priority INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_commands_robot_id ON commands(robot_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
CREATE INDEX IF NOT EXISTS idx_commands_priority ON commands(priority);
CREATE INDEX IF NOT EXISTS idx_commands_created_at ON commands(created_at);

-- 2. 机器人配置表
CREATE TABLE IF NOT EXISTS robot_configs (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(50) NOT NULL,
  config_type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (robot_id, config_type)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_robot_configs_robot_id ON robot_configs(robot_id);
CREATE INDEX IF NOT EXISTS idx_robot_configs_config_type ON robot_configs(config_type);

-- 3. 设备状态表
CREATE TABLE IF NOT EXISTS device_status (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'idle',
  device_info JSONB,
  battery INT,
  signal INT,
  memory_usage INT,
  cpu_usage INT,
  network_type VARCHAR(20),
  wework_version VARCHAR(20),
  last_heartbeat_at TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_device_status_robot_id ON device_status(robot_id);
CREATE INDEX IF NOT EXISTS idx_device_status_status ON device_status(status);

-- 4. 添加注释
COMMENT ON TABLE commands IS '指令队列表 - 存储所有待执行和已执行的指令';
COMMENT ON TABLE robot_configs IS '机器人配置表 - 存储机器人的各种配置';
COMMENT ON TABLE device_status IS '设备状态表 - 存储设备的实时状态信息';

COMMENT ON COLUMN commands.priority IS '指令优先级: 0=低, 1=普通, 2=高, 3=紧急';
COMMENT ON COLUMN commands.status IS '指令状态: pending, executing, success, failed';
COMMENT ON COLUMN robot_configs.version IS '配置版本号，每次更新递增';
COMMENT ON COLUMN device_status.status IS '设备状态: running, idle, error';
COMMENT ON COLUMN device_status.battery IS '电池电量: 0-100';
COMMENT ON COLUMN device_status.signal IS '信号强度: 0-4';
COMMENT ON COLUMN device_status.memory_usage IS '内存使用率: 百分比';
COMMENT ON COLUMN device_status.cpu_usage IS 'CPU 使用率: 百分比';

-- 5. 更新设备绑定表，添加设备信息字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_bindings'
    AND column_name = 'device_info'
  ) THEN
    ALTER TABLE device_bindings ADD COLUMN device_info JSONB;
    COMMENT ON COLUMN device_bindings.device_info IS '设备详细信息';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_bindings'
    AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE device_bindings ADD COLUMN last_active_at TIMESTAMP;
    COMMENT ON COLUMN device_bindings.last_active_at IS '最后活跃时间';
  END IF;
END $$;

-- 6. 确保 robots 表有必要的字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robots'
    AND column_name = 'ai_mode'
  ) THEN
    ALTER TABLE robots ADD COLUMN ai_mode VARCHAR(20) DEFAULT 'builtin';
    COMMENT ON COLUMN robots.ai_mode IS 'AI 模式: builtin, third_party';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robots'
    AND column_name = 'ai_provider'
  ) THEN
    ALTER TABLE robots ADD COLUMN ai_provider VARCHAR(50);
    COMMENT ON COLUMN robots.ai_provider IS 'AI 提供商: openai, coze, etc.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robots'
    AND column_name = 'ai_model'
  ) THEN
    ALTER TABLE robots ADD COLUMN ai_model VARCHAR(100);
    COMMENT ON COLUMN robots.ai_model IS 'AI 模型名称';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robots'
    AND column_name = 'third_party_callback_url'
  ) THEN
    ALTER TABLE robots ADD COLUMN third_party_callback_url TEXT;
    COMMENT ON COLUMN robots.third_party_callback_url IS '第三方回调 URL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robots'
    AND column_name = 'third_party_callback_secret_key'
  ) THEN
    ALTER TABLE robots ADD COLUMN third_party_callback_secret_key VARCHAR(255);
    COMMENT ON COLUMN robots.third_party_callback_secret_key IS '第三方回调密钥';
  END IF;
END $$;

-- 迁移完成
SELECT 'Database migration completed successfully' as status;
