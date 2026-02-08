import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { sendWebSocketMessage } from '@/server/websocket-server';
import type { SendMessageRequest, CommandResponse } from '@/types/worktool';

/**
 * WorkTool 第三方发送消息接口
 * 允许第三方通过 API 向机器人发送消息指令
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json();

    // 验证必要参数
    if (!body.robotId || !body.commandType || !body.params) {
      return NextResponse.json(
        {
          success: false,
          code: 400,
          message: '缺少必要参数：robotId, commandType, params',
        },
        { status: 400 }
      );
    }

    // 验证参数
    if (!body.params.target || !body.params.content) {
      return NextResponse.json(
        {
          success: false,
          code: 400,
          message: '缺少必要参数：params.target, params.content',
        },
        { status: 400 }
      );
    }

    const { robotId, commandType, params } = body;

    // 查询机器人
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      const robotResult = await client.query(
        `SELECT
          r.id,
          r.name,
          r.user_id,
          r.online_status
        FROM robots r
        WHERE r.id = $1`,
        [robotId]
      );

      if (robotResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            code: 404,
            message: '机器人不存在',
          },
          { status: 404 }
        );
      }

      const robot = robotResult.rows[0];

      // 检查机器人是否在线
      if (robot.online_status !== 'online') {
        return NextResponse.json(
          {
            success: false,
            code: 400,
            message: '机器人未在线',
          },
          { status: 400 }
        );
      }

      // 生成命令 ID
      const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 保存命令到数据库
      await client.query(
        `INSERT INTO commands (
          id,
          robot_id,
          command_type,
          params,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          commandId,
          robotId,
          commandType,
          JSON.stringify(params),
          'pending',
        ]
      );

      // 通过 WebSocket 发送命令给机器人
      const wsSuccess = sendWebSocketMessage(robotId, {
        type: 'command',
        data: {
          commandId,
          commandType,
          params,
          priority: 0,
        },
        timestamp: Date.now(),
        messageId: commandId,
      });

      if (!wsSuccess) {
        // WebSocket 发送失败，更新命令状态
        await client.query(
          `UPDATE commands SET status = 'failed', error_message = $1 WHERE id = $2`,
          ['机器人未连接', commandId]
        );

        return NextResponse.json(
          {
            success: false,
            code: 400,
            message: '机器人未连接',
          },
          { status: 400 }
        );
      }

      console.log(`[WorkTool SendMessage] 命令已发送: robotId=${robotId}, commandId=${commandId}, target=${params.target}`);

      const response: CommandResponse = {
        success: true,
        code: 0,
        data: {
          commandId,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      };

      return NextResponse.json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[WorkTool SendMessage] 处理失败:', error);
    return NextResponse.json(
      {
        success: false,
        code: 500,
        message: '处理失败',
      },
      { status: 500 }
    );
  }
}
