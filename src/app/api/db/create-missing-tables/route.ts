// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * 创建缺失的表
 * 
 * 说明: 创建 config_sync_logs 和 message_fail_logs 表
 */
export async function POST(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  try {
    console.log('[Migration] 开始创建缺失的表...');

    const errors: string[] = [];
    const success: string[] = [];

    // 1. 创建 config_sync_logs 表
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS config_sync_logs (
          id SERIAL PRIMARY KEY,
          robot_id VARCHAR(255) NOT NULL,
          config_version VARCHAR(50) NOT NULL,
          config_data JSONB NOT NULL,
          sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
          synced_at TIMESTAMP,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      success.push('config_sync_logs 表创建成功');

      // 创建索引
      await client.query(`CREATE INDEX IF NOT EXISTS config_sync_logs_robot_id_idx ON config_sync_logs(robot_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS config_sync_logs_status_idx ON config_sync_logs(sync_status)`);
      await client.query(`CREATE INDEX IF NOT EXISTS config_sync_logs_version_idx ON config_sync_logs(config_version)`);
      await client.query(`CREATE INDEX IF NOT EXISTS config_sync_logs_created_at_idx ON config_sync_logs(created_at)`);
      success.push('config_sync_logs 索引创建成功');
    } catch (error: any) {
      errors.push(`config_sync_logs: ${error.message}`);
      console.error('[Migration] config_sync_logs 创建失败:', error);
    }

    // 2. 创建 message_fail_logs 表
    try {
      await client.query(`
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
        )
      `);
      success.push('message_fail_logs 表创建成功');

      // 创建索引
      await client.query(`CREATE INDEX IF NOT EXISTS message_fail_logs_robot_id_idx ON message_fail_logs(robot_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS message_fail_logs_message_id_idx ON message_fail_logs(message_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS message_fail_logs_error_type_idx ON message_fail_logs(error_type)`);
      await client.query(`CREATE INDEX IF NOT EXISTS message_fail_logs_created_at_idx ON message_fail_logs(created_at)`);
      await client.query(`CREATE INDEX IF NOT EXISTS message_fail_logs_failed_at_idx ON message_fail_logs(failed_at)`);
      success.push('message_fail_logs 索引创建成功');
    } catch (error: any) {
      errors.push(`message_fail_logs: ${error.message}`);
      console.error('[Migration] message_fail_logs 创建失败:', error);
    }

    // 3. 检查并添加 device_activations 缺失的字段
    try {
      const columnsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'device_activations'
      `);
      const existingColumns = columnsResult.rows.map(row => row.column_name);
      
      const requiredColumns = [
        'user_id', 
        'activation_code', 
        'config_version', 
        'config_synced_at', 
        'config_synced', 
        'config_error',
        'last_seen_at',
        'device_id'
      ];
      const addedColumns: string[] = [];

      for (const column of requiredColumns) {
        if (!existingColumns.includes(column)) {
          await client.query(`ALTER TABLE device_activations ADD COLUMN IF NOT EXISTS ${column} ${getColumnDefinition(column)}`);
          addedColumns.push(column);
        }
      }

      if (addedColumns.length > 0) {
        success.push(`device_activations 添加字段: ${addedColumns.join(', ')}`);
      }
    } catch (error: any) {
      errors.push(`device_activations 字段检查: ${error.message}`);
      console.error('[Migration] device_activations 字段检查失败:', error);
    }

    console.log('[Migration] 完成');
    console.log(`[Migration] 成功: ${success.length}, 失败: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: '表创建完成',
      data: {
        success,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: any) {
    console.error('[Migration] 创建表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '创建表失败',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

function getColumnDefinition(column: string): string {
  const definitions: Record<string, string> = {
    'user_id': 'INTEGER',
    'activation_code': 'VARCHAR(8)',
    'config_version': 'INTEGER DEFAULT 0',
    'config_synced_at': 'TIMESTAMP',
    'config_synced': 'BOOLEAN DEFAULT true',
    'config_error': 'TEXT',
    'last_seen_at': 'TIMESTAMP',
    'device_id': 'VARCHAR(255)'
  };
  return definitions[column] || 'TEXT';
}
