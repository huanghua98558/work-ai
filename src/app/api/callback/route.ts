// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { MessageType, MessageDirection } from "@/types/message";
import { processMessage } from "@/lib/message-processor";
import { sendWebSocketMessage } from "@/server/websocket-server";

/**
 * 企业微信 URL 验证接口（GET）
 * 企业微信首次配置回调URL时会调用此接口进行验证
 * 
 * 验证参数：
 * - msg_signature: 签名
 * - timestamp: 时间戳
 * - nonce: 随机字符串
 * - echostr: 加密字符串（需要解密后原样返回）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const msg_signature = searchParams.get('msg_signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');
    const echostr = searchParams.get('echostr');

    console.log("收到企业微信URL验证请求:", { 
      msg_signature, 
      timestamp, 
      nonce,
      hasEchostr: !!echostr 
    });

    // 简单验证：直接返回 echostr
    // 生产环境应该使用微信企业号接口进行签名验证
    if (echostr) {
      // 返回企业微信发送的 echostr 字符串（无需解密）
      return new NextResponse(echostr, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // 如果没有 echostr，返回成功响应
    return NextResponse.json({
      success: true,
      message: "验证成功",
    });
  } catch (error: any) {
    console.error("企业微信URL验证错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "验证失败",
        code: "VALIDATION_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * 第三方平台回调接口（POST）
 * 用于接收企业微信等第三方平台的消息推送
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, type, robotId, data, timestamp } = body;

    console.log("收到第三方平台回调:", { event, type, robotId });

    // 验证必要参数
    if (!robotId || !event) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必要参数",
          code: "MISSING_PARAMS",
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "数据库连接失败" },
        { status: 500 }
      );
    }

    // 查找机器人
    const robotResult = await db.execute(sql`
      SELECT id FROM device_activations
      WHERE robot_id = ${robotId}
      LIMIT 1
    `);

    if (robotResult.rows.length === 0) {
      console.warn(`机器人 ${robotId} 不存在或未激活`);
      return NextResponse.json({
        success: true,
        message: "已接收回调",
      });
    }

    // 根据事件类型处理
    switch (event) {
      case "message": {
        // 消息事件
        return await handleMessageEvent(robotId, data);
      }
      case "event": {
        // 系统事件（如好友添加、群成员变更等）
        return await handleSystemEvent(robotId, type, data);
      }
      default: {
        console.warn(`未知事件类型: ${event}`);
        return NextResponse.json({
          success: true,
          message: "已接收回调",
        });
      }
    }
  } catch (error: any) {
    console.error("处理第三方回调错误:", error);

    return NextResponse.json(
      {
        success: false,
        error: "处理回调失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * 处理消息事件
 */
async function handleMessageEvent(robotId: string, data: any) {
  const db = await getDatabase();
  if (!db) {
    console.error('数据库连接失败');
    throw new Error('数据库连接失败');
  }

  // 解析消息类型
  let messageType = MessageType.UNKNOWN;
  if (data.type === 'text') {
    messageType = MessageType.TEXT;
  } else if (data.type === 'image') {
    messageType = MessageType.IMAGE;
  } else if (data.type === 'voice') {
    messageType = MessageType.VOICE;
  } else if (data.type === 'video') {
    messageType = MessageType.VIDEO;
  } else if (data.type === 'file') {
    messageType = MessageType.FILE;
  } else if (data.type === 'link') {
    messageType = MessageType.LINK;
  } else if (data.type === 'location') {
    messageType = MessageType.LOCATION;
  } else if (data.type === 'emoji') {
    messageType = MessageType.EMOJI;
  } else if (data.type === 'mention') {
    messageType = MessageType.MENTION;
  } else if (data.type === 'system') {
    messageType = MessageType.SYSTEM;
  }

  // 确定会话ID
  const userId = data.from?.id || data.userId;
  const sessionId = `session_${robotId}_${userId}`;

  // 确保会话存在
  const sessionResult = await db.execute(sql`
    SELECT * FROM sessions
    WHERE session_id = ${sessionId}
    LIMIT 1
  `);

  if (sessionResult.rows.length === 0) {
    await db.execute(sql`
      INSERT INTO sessions (session_id, robot_id, user_id, status)
      VALUES (${sessionId}, ${robotId}, ${userId || null}, 'active')
    `);
  } else {
    await db.execute(sql`
      UPDATE sessions
      SET last_message_at = NOW(), updated_at = NOW()
      WHERE session_id = ${sessionId}
    `);
  }

  // 处理消息内容
  const processedContent = await processMessage(data, messageType);

  // 插入消息记录
  const messageResult = await db.execute(sql`
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
    VALUES (
      ${robotId},
      ${userId || null},
      ${sessionId},
      ${messageType},
      ${JSON.stringify(processedContent)},
      ${JSON.stringify(data)},
      'received',
      'incoming',
      NOW()
    )
    RETURNING *
  `);

  const message = messageResult.rows[0];

  // 通过 WebSocket 推送消息给前端
  const wsPayload = {
    type: "callback",
    event: "message",
    data: {
      messageId: message.id,
      robotId: message.robot_id,
      userId: message.user_id,
      sessionId: message.session_id,
      messageType: message.message_type,
      content: processedContent,
      originalData: data,
      timestamp: message.created_at,
    },
  };

  sendWebSocketMessage(robotId, wsPayload);

  return NextResponse.json({
    success: true,
    data: {
      messageId: message.id,
      message: "消息处理成功",
    },
  });
}

/**
 * 处理系统事件
 */
async function handleSystemEvent(robotId: string, type: string, data: any) {
  const db = await getDatabase();
  if (!db) {
    console.error('数据库连接失败');
    throw new Error('数据库连接失败');
  }

  // 插入系统消息记录
  const messageResult = await db.execute(sql`
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
    VALUES (
      ${robotId},
      ${null},
      ${null},
      'system',
      ${type},
      ${JSON.stringify(data)},
      'received',
      'incoming',
      NOW()
    )
    RETURNING *
  `);

  const message = messageResult.rows[0];

  // 通过 WebSocket 推送事件给前端
  const wsPayload = {
    type: "callback",
    event: "system",
    data: {
      eventId: message.id,
      robotId: message.robot_id,
      eventType: type,
      eventData: data,
      timestamp: message.created_at,
    },
  };

  sendWebSocketMessage(robotId, wsPayload);

  return NextResponse.json({
    success: true,
    data: {
      eventId: message.id,
      message: "系统事件处理成功",
    },
  });
}
