import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * 列出设备激活记录
 */
export async function GET(request: NextRequest) {
  try {
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      const result = await client.query(
        `SELECT
          id,
          robot_id,
          robot_uuid,
          activation_code_id,
          device_id,
          status,
          activated_at,
          last_active_at,
          expires_at
        FROM device_activations
        ORDER BY id
        LIMIT 10`
      );

      return NextResponse.json({
        code: 200,
        message: '查询成功',
        data: {
          count: result.rows.length,
          activations: result.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[WorkTool List Activations] 查询失败:', error);
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
