import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { MessageType, MessageDirection, MessageStatus } from "@/types/message";
import { validateMessageType, generateMessageId } from "@/lib/message-utils";
import { z } from "zod";
import { sendWebSocketMessage } from "@/server/websocket-server";

const messageSendSchema = z.object({
  robotId: z.string().min(1),
  messageType: z.string(),
  content: z.string(),
  extraData: z.record(z.any()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  replyToMessageId: z.number().optional(),
});

/**
 * 消息发送接口（服务器 -> APP）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = messageSendSchema.parse(body);

    const {
      robotId,
      messageType,
      content,
      extraData,
      userId,
      sessionId,
      replyToMessageId,
    } = validatedData;

    // 验证消息类型
    if (!validateMessageType(messageType)) {
      return NextResponse.json(
        {
          success: false,
          error: "无效的消息类型",
          code: "INVALID_MESSAGE_TYPE",
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // 1. 查找机器人
    const robotResult = await db.execute(sql`
      SELECT id FROM device_activations
      WHERE robot_id = ${robotId}
      LIMIT 1
    `);

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "机器人不存在或未激活",
          code: "ROBOT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 2. 确定会话ID
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      // 从最近的消息中获取会话ID
      const lastMessageResult = await db.execute(sql`
        SELECT session_id FROM messages
        WHERE robot_id = ${robotId} AND user_id = ${userId || null}
        ORDER BY created_at DESC
        LIMIT 1
      `);
      if (lastMessageResult.rows.length > 0) {
        targetSessionId = lastMessageResult.rows[0].session_id as string;
      }
    }

    // 3. 插入消息记录
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
        reply_to_message_id,
        created_at
      )
      VALUES (
        ${robotId},
        ${userId || null},
        ${targetSessionId || null},
        ${messageType},
        ${content},
        ${JSON.stringify(extraData || {})},
        'sent',
        'outgoing',
        ${replyToMessageId || null},
        NOW()
      )
      RETURNING *
    `);

    const message = messageResult.rows[0];

    // 4. 通过 WebSocket 发送消息给客户端
    const wsPayload = {
      type: "message",
      data: {
        messageId: message.id,
        robotId: message.robot_id,
        userId: message.user_id,
        sessionId: message.session_id,
        messageType: message.message_type,
        content: message.content,
        extraData: message.extra_data,
        status: message.status,
        direction: message.direction,
        replyToMessageId: message.reply_to_message_id,
        timestamp: message.created_at,
      },
    };

    const wsSuccess = sendWebSocketMessage(robotId, wsPayload);

    // 5. 更新消息状态
    if (wsSuccess) {
      await db.execute(sql`
        UPDATE messages
        SET status = 'delivered'
        WHERE id = ${message.id}
      `);
    } else {
      await db.execute(sql`
        UPDATE messages
        SET status = 'failed'
        WHERE id = ${message.id}
      `);
    }

    return NextResponse.json({
      success: true,
      data: {
        messageId: message.id,
        sessionId: targetSessionId,
        status: wsSuccess ? 'delivered' : 'failed',
        delivered: wsSuccess,
        message: "消息发送成功",
      },
    });
  } catch (error: any) {
    console.error("消息发送错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "请求参数错误",
          details: error.errors,
          code: "INVALID_PARAMS",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "消息发送失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
