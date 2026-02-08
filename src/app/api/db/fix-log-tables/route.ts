// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

/**
 * 修复日志表字段类型
 * POST /api/db/fix-log-tables
 */
export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();

    // 修改 timestamp 字段为 BIGINT
    await db.execute(`
      ALTER TABLE logs ALTER COLUMN timestamp TYPE BIGINT
    `);

    // 修改 sync_time 字段为 BIGINT
    await db.execute(`
      ALTER TABLE logs ALTER COLUMN sync_time TYPE BIGINT
    `);

    return NextResponse.json({
      success: true,
      message: '日志表字段类型修复成功',
      data: {
        changes: [
          'logs.timestamp: INTEGER -> BIGINT',
          'logs.sync_time: INTEGER -> BIGINT',
        ],
      },
    });
  } catch (error: any) {
    console.error('修复日志表字段类型失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || '修复日志表字段类型失败',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
