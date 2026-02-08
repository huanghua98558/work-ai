/**
 * 简化的数据库迁移脚本 - v3.0 WebSocket 升级
 * 直接使用 pg 库，避免项目依赖问题
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// 手动加载 .env 文件（忽略注释）
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('[Migration] .env 文件不存在');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// 加载环境变量
loadEnv();

// 从环境变量获取数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // 禁用 SSL
});

async function runMigration() {
  console.log('[Migration] 开始数据库迁移...');
  console.log('[Migration] 数据库连接:', process.env.DATABASE_URL ? '已配置' : '未配置');

  const client = await pool.connect();

  try {
    // 检查现有表
    const existingTablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const existingTables = existingTablesResult.rows.map(row => row.table_name);
    console.log('[Migration] 现有表:', existingTables.length > 0 ? existingTables.join(', ') : '(无)');

    // 逐个创建表
    const tables = [
      {
        name: 'commands',
        sql: `CREATE TABLE IF NOT EXISTS commands (
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
        )`,
        indexes: [
          'CREATE INDEX IF NOT EXISTS idx_commands_robot_id ON commands(robot_id)',
          'CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status)',
          'CREATE INDEX IF NOT EXISTS idx_commands_priority ON commands(priority)',
          'CREATE INDEX IF NOT EXISTS idx_commands_created_at ON commands(created_at)',
        ]
      },
      {
        name: 'robot_configs',
        sql: `CREATE TABLE IF NOT EXISTS robot_configs (
          id SERIAL PRIMARY KEY,
          robot_id VARCHAR(50) NOT NULL,
          config_type VARCHAR(50) NOT NULL,
          config JSONB NOT NULL,
          version INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE (robot_id, config_type)
        )`,
        indexes: [
          'CREATE INDEX IF NOT EXISTS idx_robot_configs_robot_id ON robot_configs(robot_id)',
          'CREATE INDEX IF NOT EXISTS idx_robot_configs_config_type ON robot_configs(config_type)',
        ]
      },
      {
        name: 'device_status',
        sql: `CREATE TABLE IF NOT EXISTS device_status (
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
        )`,
        indexes: [
          'CREATE INDEX IF NOT EXISTS idx_device_status_robot_id ON device_status(robot_id)',
          'CREATE INDEX IF NOT EXISTS idx_device_status_status ON device_status(status)',
        ]
      }
    ];

    for (const table of tables) {
      try {
        console.log(`[Migration] 创建表 ${table.name}...`);
        await client.query(table.sql);
        console.log(`[Migration] ✓ 表 ${table.name} 创建成功`);

        // 创建索引
        for (const indexSql of table.indexes) {
          try {
            await client.query(indexSql);
            console.log(`[Migration] ✓ 索引创建成功`);
          } catch (error) {
            console.error(`[Migration] ✗ 索引创建失败: ${error.message}`);
          }
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`[Migration] - 表 ${table.name} 已存在，跳过`);
        } else {
          console.error(`[Migration] ✗ 创建表 ${table.name} 失败:`, error.message);
          throw error;
        }
      }
    }

    console.log('[Migration] ✓ 数据库迁移完成');

    // 验证表
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('commands', 'robot_configs', 'device_status')
      ORDER BY table_name
    `);

    const tableNames = tablesResult.rows.map(row => row.table_name);
    console.log(`[Migration] ✓ 已创建表: ${tableNames.join(', ')}`);

    return true;
  } finally {
    client.release();
    await pool.end();
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
