// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

/**
 * 创建日志相关表
 * POST /api/db/create-log-tables
 */
export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();

    // 创建 logs 表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id VARCHAR(64) PRIMARY KEY,
        robot_id VARCHAR(64) NOT NULL,
        timestamp INTEGER NOT NULL,
        level INTEGER NOT NULL,
        tag VARCHAR(128) NOT NULL,
        message TEXT NOT NULL,
        extra TEXT,
        stack_trace TEXT,
        sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        sync_time INTEGER,
        device_id VARCHAR(128),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await db.execute(`CREATE INDEX IF NOT EXISTS logs_robot_id_idx ON logs(robot_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS logs_timestamp_idx ON logs(timestamp)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS logs_level_idx ON logs(level)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS logs_tag_idx ON logs(tag)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS logs_sync_status_idx ON logs(sync_status)`);

    // 创建 log_configs 表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS log_configs (
        robot_id VARCHAR(64) PRIMARY KEY,
        log_level INTEGER NOT NULL DEFAULT 2,
        upload_enabled BOOLEAN NOT NULL DEFAULT true,
        upload_interval INTEGER NOT NULL DEFAULT 300000,
        upload_on_wifi_only BOOLEAN NOT NULL DEFAULT true,
        max_log_entries INTEGER NOT NULL DEFAULT 10000,
        retention_days INTEGER NOT NULL DEFAULT 30,
        tags TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    return NextResponse.json({
      success: true,
      message: '日志表创建成功',
      data: {
        tables: ['logs', 'log_configs'],
        indexes: [
          'logs_robot_id_idx',
          'logs_timestamp_idx',
          'logs_level_idx',
          'logs_tag_idx',
          'logs_sync_status_idx',
        ],
      },
    });
  } catch (error: any) {
    console.error('创建日志表失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || '创建日志表失败',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
