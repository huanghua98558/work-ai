import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * 列出所有机器人
 */
export async function GET(request: NextRequest) {
  try {
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      const result = await client.query(
        'SELECT id, name, bot_id, status FROM robots ORDER BY id LIMIT 10'
      );

      return NextResponse.json({
        code: 200,
        message: '查询成功',
        data: {
          count: result.rows.length,
          robots: result.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[WorkTool List Robots] 查询失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: '查询失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
