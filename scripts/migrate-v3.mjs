/**
 * 数据库迁移脚本 - v3.0 WebSocket 升级
 */

import { getPool } from '../src/lib/db.ts';

const migrationSQL = `
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
`;

async function runMigration() {
  console.log('[Migration] 开始数据库迁移...');

  try {
    const pool = await getPool();
    const client = await pool.connect();

    try {
      // 拆分 SQL 语句（按分号分割）
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      console.log(`[Migration] 准备执行 ${statements.length} 条 SQL 语句`);

      for (let i = 0; i < statements.length; i++) {
        const sql = statements[i];

        try {
          await client.query(sql);
          console.log(`[Migration] ✓ 执行语句 ${i + 1}/${statements.length}`);
        } catch (error) {
          // 忽略"已存在"错误
          if (error.message.includes('already exists')) {
            console.log(`[Migration] - 跳过（已存在）语句 ${i + 1}/${statements.length}`);
          } else {
            throw error;
          }
        }
      }

      console.log('[Migration] ✓ 数据库迁移完成');

      // 验证表是否创建成功
      const tables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('commands', 'robot_configs', 'device_status')
        ORDER BY table_name
      `);

      console.log(`[Migration] ✓ 已创建表: ${tables.rows.map(row => row.table_name).join(', ')}`);

      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Migration] ✗ 数据库迁移失败:', error);
    throw error;
  }
}

// 执行迁移
runMigration()
  .then(() => {
    console.log('[Migration] 迁移成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Migration] 迁移失败:', error);
    process.exit(1);
  });
