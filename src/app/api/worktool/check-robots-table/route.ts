import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * 检查 robots 表结构
 */
export async function GET(request: NextRequest) {
  try {
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      // 检查 robots 表中是否包含 robot_id 或 bot_id 字段
      const columnsQuery = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'robots'
        ORDER BY ordinal_position
      `);

      return NextResponse.json({
        code: 200,
        message: '检查成功',
        data: {
          columnCount: columnsQuery.rows.length,
          columns: columnsQuery.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[WorkTool Check Robots Table] 检查失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: '检查失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
