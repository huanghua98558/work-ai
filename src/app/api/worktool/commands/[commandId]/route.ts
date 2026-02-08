import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import type { CommandDetailResponse } from '@/types/worktool';

/**
 * 查询命令详情接口
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { commandId: string } }
) {
  try {
    const { commandId } = params;

    if (!commandId) {
      return NextResponse.json(
        {
          success: false,
          code: 400,
          message: '缺少必要参数：commandId',
        },
        { status: 400 }
      );
    }

    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      // 查询命令
      const result = await client.query(
        `SELECT
          c.id,
          c.robot_id,
          c.command_type,
          c.params,
          c.status,
          c.result,
          c.error_message,
          c.created_at,
          c.executed_at
        FROM commands c
        WHERE c.id = $1`,
        [commandId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            code: 404,
            message: '命令不存在',
          },
          { status: 404 }
        );
      }

      const command = result.rows[0];

      const response: CommandDetailResponse = {
        success: true,
        code: 0,
        data: {
          commandId: command.id,
          robotId: command.robot_id,
          commandType: command.command_type,
          status: command.status,
          result: command.result ? JSON.parse(command.result) : undefined,
          createdAt: command.created_at.toISOString(),
          executedAt: command.executed_at ? command.executed_at.toISOString() : undefined,
        },
      };

      return NextResponse.json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[WorkTool CommandDetail] 查询失败:', error);
    return NextResponse.json(
      {
        success: false,
        code: 500,
        message: '查询失败',
      },
      { status: 500 }
    );
  }
}
