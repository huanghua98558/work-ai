import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import type {
  MessageCallbackRequest,
  ResultCallbackRequest,
  QRCodeCallbackRequest,
  StatusCallbackRequest,
  ImageCallbackRequest,
} from '@/types/worktool';

/**
 * WorkTool 第三方消息回调接口
 * 支持多种回调类型：message, result, qrcode, online, offline, image
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const robotId = searchParams.get('robotId');
    const type = searchParams.get('type') as any;

    // 验证必要参数
    if (!robotId || !type) {
      return NextResponse.json(
        {
          code: 400,
          message: '缺少必要参数：robotId 和 type',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 根据回调类型处理
    switch (type) {
      case 'message':
        return await handleMessageCallback(robotId, body);
      case 'result':
        return await handleResultCallback(robotId, body);
      case 'qrcode':
        return await handleQRCodeCallback(robotId, body);
      case 'online':
      case 'offline':
        return await handleStatusCallback(robotId, body, type);
      case 'image':
        return await handleImageCallback(robotId, body);
      default:
        return NextResponse.json(
          {
            code: 400,
            message: `未知的回调类型: ${type}`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[WorkTool Callback] 处理失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: '处理失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 处理消息回调
 */
async function handleMessageCallback(robotId: string, body: MessageCallbackRequest) {
  console.log(`[WorkTool Callback] 收到消息回调: bot_id=${robotId}, messageId=${body.messageId}`);

  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    // 查询机器人配置（使用实际的字段名）
    const robotResult = await client.query(
      `SELECT id, name, bot_secret
      FROM robots
      WHERE bot_id = $1`,
      [robotId]
    );

    if (robotResult.rows.length === 0) {
      console.warn(`[WorkTool Callback] 机器人不存在: ${robotId}`);
      return NextResponse.json(
        {
          code: 404,
          message: '机器人不存在',
        },
        { status: 404 }
      );
    }

    const robot = robotResult.rows[0];

    console.log(`[WorkTool Callback] 机器人找到: ${robot.name}`);

    // TODO: 实现消息转发逻辑
    // 目前直接返回成功
    console.log(`[WorkTool Callback] 消息已接收，转发逻辑待实现`);

    return NextResponse.json({
      code: 200,
      message: '消息接收成功',
      data: {
        messageId: body.messageId,
        botId: robotId,
        receivedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[WorkTool Callback] 处理失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: '处理失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 处理结果回调
 */
async function handleResultCallback(robotId: string, body: ResultCallbackRequest) {
  console.log(`[WorkTool Callback] 收到结果回调: robotId=${robotId}, commandId=${body.commandId}`);

  return NextResponse.json({
    code: 200,
    message: '执行结果接收成功',
    data: {
      commandId: body.commandId,
      status: body.status,
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * 处理二维码回调
 */
async function handleQRCodeCallback(robotId: string, body: QRCodeCallbackRequest) {
  console.log(`[WorkTool Callback] 收到二维码回调: robotId=${robotId}, groupName=${body.groupName}`);

  return NextResponse.json({
    code: 200,
    message: '群二维码接收成功',
    data: {
      robotId,
      groupChatId: body.groupChatId,
      qrcodeUrl: body.qrcodeUrl,
      receivedAt: new Date().toISOString(),
    },
  });
}

/**
 * 处理状态回调
 */
async function handleStatusCallback(robotId: string, body: StatusCallbackRequest, status: 'online' | 'offline') {
  console.log(`[WorkTool Callback] 收到状态回调: robotId=${robotId}, status=${status}`);

  return NextResponse.json({
    code: 200,
    message: '机器人状态更新成功',
    data: {
      robotId,
      status,
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * 处理图片回调
 */
async function handleImageCallback(robotId: string, body: ImageCallbackRequest) {
  console.log(`[WorkTool Callback] 收到图片回调: robotId=${robotId}, messageId=${body.messageId}`);

  return NextResponse.json({
    code: 200,
    message: '图片消息接收成功',
    data: {
      messageId: body.messageId,
      robotId,
      imageUrl: body.imageUrl,
      receivedAt: new Date().toISOString(),
    },
  });
}
