import { NextRequest, NextResponse } from 'next/server';
import { pushCommand, getQueueStats } from '@/server/websocket-server-v3';
import { CommandType, CommandPriority } from '@/server/websocket/types';
import { z } from 'zod';

/**
 * 发送指令接口
 * POST /api/commands/send
 */
const sendCommandSchema = z.object({
  robotId: z.string().min(1),
  commandType: z.enum(['send_message', 'forward_message', 'create_group', 'update_group', 'send_file', 'dissolve_group', 'send_favorite']),
  target: z.string().optional(),
  params: z.record(z.any()).optional(),
  priority: z.enum(['0', '1', '2', '3']).optional().default('1'),
});

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const body = await req.json();
    const validation = sendCommandSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { robotId, commandType, target, params, priority } = validation.data;

    // 生成指令 ID
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 构建指令数据（遵循 v3.0 规范）
    const command = {
      commandId,
      commandType,
      commandCode: getCommandCode(commandType),
      target,
      params: params || {},
      priority: parseInt(priority, 10) as CommandPriority,
    };

    // 推送指令
    const sent = await pushCommand(robotId, command);

    return NextResponse.json({
      success: true,
      data: {
        commandId,
        sent,
        message: sent ? '指令已发送' : '指令已加入队列（设备离线）',
      },
    });
  } catch (error) {
    console.error('[API] 发送指令失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send command',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 获取指令队列统计
 * GET /api/commands/stats
 */
export async function GET(req: NextRequest) {
  try {
    const stats = getQueueStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[API] 获取队列统计失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get queue stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 获取指令编码
 */
function getCommandCode(commandType: string): number {
  const codeMap: Record<string, number> = {
    send_message: 203,
    forward_message: 205,
    create_group: 206,
    update_group: 207,
    send_file: 218,
    dissolve_group: 219,
    send_favorite: 900,
  };
  return codeMap[commandType] || 0;
}
