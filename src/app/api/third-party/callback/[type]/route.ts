// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

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
 * 第三方平台回调统一接口
 * 
 * 接口: POST /api/third-party/callback/{type}
 * 
 * 支持的回调类型:
 * - message: 消息回调
 * - result: 结果回调
 * - qrcode: 二维码回调
 * - online: 上线回调
 * - offline: 下线回调
 * - image: 图片回调
 * 
 * 示例:
 * POST /api/third-party/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  
  try {
    const type = params.type;
    const robotId = request.nextUrl.searchParams.get('robotId');
    
    // 验证必要参数
    if (!robotId) {
      return NextResponse.json({
        code: 400,
        message: '缺少必要参数：robotId',
      }, { status: 400 });
    }
    
    const body = await request.json();
    
    console.log(`[ThirdParty Callback] 收到回调: type=${type}, robotId=${robotId}`);
    
    // 根据回调类型处理
    switch (type) {
      case 'message':
        return await handleMessageCallback(client, robotId, body);
      case 'result':
        return await handleResultCallback(client, robotId, body);
      case 'qrcode':
        return await handleQRCodeCallback(client, robotId, body);
      case 'online':
      case 'offline':
        return await handleStatusCallback(client, robotId, body, type);
      case 'image':
        return await handleImageCallback(client, robotId, body);
      default:
        return NextResponse.json({
          code: 400,
          message: `未知的回调类型: ${type}`,
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[ThirdParty Callback] 处理失败:', error);
    return NextResponse.json({
      code: 500,
      message: '处理回调失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * 处理消息回调
 */
async function handleMessageCallback(client: any, robotId: string, body: MessageCallbackRequest) {
  console.log(`[ThirdParty Callback] 收到消息回调: robot_id=${robotId}, messageId=${body.messageId}`);

  try {
    // 1. 查询设备激活记录（使用 robot_id）
    const activationResult = await client.query(
      `SELECT
        id,
        robot_id,
        robot_uuid,
        device_id,
        status,
        activated_at
      FROM device_activations
      WHERE robot_id = $1`,
      [robotId]
    );

    if (activationResult.rows.length === 0) {
      console.warn(`[ThirdParty Callback] 机器人未激活: ${robotId}`);
      return NextResponse.json({
        code: 404,
        message: '机器人未激活',
      }, { status: 404 });
    }

    const activation = activationResult.rows[0];
    console.log(`[ThirdParty Callback] 机器人已激活: ${activation.robot_id}, device_id=${activation.device_id}`);

    // 2. 保存消息到数据库
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = `session_${robotId}_${body.senderId || 'unknown'}`;

    await client.query(`
      INSERT INTO messages (
        robot_id,
        user_id,
        session_id,
        message_type,
        content,
        extra_data,
        status,
        direction,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'received', 'incoming', NOW())
    `, [
      robotId,
      body.senderId || null,
      sessionId,
      body.messageType || 'text',
      body.content || '',
      JSON.stringify(body)
    ]);

    console.log(`[ThirdParty Callback] 消息已保存: ${messageId}`);

    // 3. 通过 WebSocket 推送给 APP
    const { sendWebSocketMessage } = await import('@/server/websocket-server');
    
    const wsPayload = {
      type: "callback",
      event: "message",
      data: {
        messageId,
        robotId,
        senderId: body.senderId,
        senderName: body.senderName,
        messageType: body.messageType,
        content: body.content,
        chatType: body.chatType,
        extraData: body.extraData,
        timestamp: body.timestamp || new Date().toISOString()
      }
    };

    sendWebSocketMessage(robotId, wsPayload);
    console.log(`[ThirdParty Callback] 消息已推送给 APP: ${robotId}`);

    return NextResponse.json({
      code: 200,
      message: '消息接收成功',
      data: {
        messageId,
        robotId,
        deviceId: activation.device_id,
        receivedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[ThirdParty Callback] 处理消息回调失败:', error);
    return NextResponse.json({
      code: 500,
      message: '处理消息回调失败',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 处理结果回调（第三方平台调用 WorkBot 发送回复）
 */
async function handleResultCallback(client: any, robotId: string, body: ResultCallbackRequest) {
  console.log(`[ThirdParty Callback] 收到结果回调: robotId=${robotId}, commandId=${body.commandId}`);

  try {
    // 1. 验证机器人是否存在
    const robotResult = await client.query(
      `SELECT id, robot_id FROM robots WHERE robot_id = $1 LIMIT 1`,
      [robotId]
    );

    if (robotResult.rows.length === 0) {
      return NextResponse.json({
        code: 404,
        message: '机器人不存在'
      }, { status: 404 });
    }

    // 2. 提取消息内容
    const { content, target, messageType = 'text' } = body;

    if (!content || !target) {
      return NextResponse.json({
        code: 400,
        message: '缺少必要参数：content 或 target'
      }, { status: 400 });
    }

    // 3. 通过 WebSocket 推送给 APP
    const { sendWebSocketMessage } = await import('@/server/websocket-server');

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const wsPayload = {
      type: "command_push",
      data: {
        commandId,
        commandType: 203, // 发送消息指令
        params: {
          target,
          content,
          messageType
        }
      },
      timestamp: Date.now()
    };

    sendWebSocketMessage(robotId, wsPayload);
    console.log(`[ThirdParty Callback] 指令已推送给 APP: ${robotId}, 指令: ${commandId}`);

    return NextResponse.json({
      code: 200,
      message: '指令已下发',
      data: {
        commandId,
        robotId,
        status: 'pending'
      }
    });

  } catch (error: any) {
    console.error('[ThirdParty Callback] 处理结果回调失败:', error);
    return NextResponse.json({
      code: 500,
      message: '处理结果回调失败',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 处理二维码回调
 */
async function handleQRCodeCallback(client: any, robotId: string, body: QRCodeCallbackRequest) {
  console.log(`[ThirdParty Callback] 收到二维码回调: robotId=${robotId}, groupName=${body.groupName}`);

  return NextResponse.json({
    code: 200,
    message: '群二维码接收成功',
    data: {
      robotId,
      groupChatId: body.groupChatId,
      qrcodeUrl: body.qrcodeUrl,
      receivedAt: new Date().toISOString()
    }
  });
}

/**
 * 处理状态回调
 */
async function handleStatusCallback(client: any, robotId: string, body: StatusCallbackRequest, status: 'online' | 'offline') {
  console.log(`[ThirdParty Callback] 收到状态回调: robotId=${robotId}, status=${status}`);

  return NextResponse.json({
    code: 200,
    message: '机器人状态更新成功',
    data: {
      robotId,
      status,
      updatedAt: new Date().toISOString()
    }
  });
}

/**
 * 处理图片回调
 */
async function handleImageCallback(client: any, robotId: string, body: ImageCallbackRequest) {
  console.log(`[ThirdParty Callback] 收到图片回调: robotId=${robotId}, messageId=${body.messageId}`);

  return NextResponse.json({
    code: 200,
    message: '图片消息接收成功',
    data: {
      messageId: body.messageId,
      robotId,
      imageUrl: body.imageUrl,
      receivedAt: new Date().toISOString()
    }
  });
}
