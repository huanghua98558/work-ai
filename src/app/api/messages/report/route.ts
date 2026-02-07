import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { MessageType, MessageDirection, MessageStatus, MessageReportRequest } from "@/types/message";
import { validateMessageType, generateMessageId, generateSessionId } from "@/lib/message-utils";
import { getMessageHandler } from "@/lib/message-handler";
import { extractHeadersFromRequest } from "@/lib/ai-service";
import { z } from "zod";

const messageReportSchema = z.object({
  robotId: z.string().min(1),
  messageId: z.string().min(1),
  messageType: z.string(),
  content: z.string(),
  extraData: z.record(z.any()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.number().optional(),
});

/**
 * 消息上报接口（APP -> 服务器）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = messageReportSchema.parse(body);

    const {
      robotId,
      messageId,
      messageType,
      content,
      extraData,
      userId,
      sessionId: providedSessionId,
      timestamp,
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

    // 2. 生成或使用提供的 sessionId
    const sessionId = providedSessionId || generateSessionId(robotId, userId);

    // 3. 确保会话存在
    const sessionResult = await db.execute(sql`
      SELECT * FROM sessions
      WHERE session_id = ${sessionId}
      LIMIT 1
    `);

    if (sessionResult.rows.length === 0) {
      // 创建新会话
      await db.execute(sql`
        INSERT INTO sessions (session_id, robot_id, user_id, status)
        VALUES (${sessionId}, ${robotId}, ${userId || null}, 'active')
      `);
    } else {
      // 更新会话最后消息时间
      await db.execute(sql`
        UPDATE sessions
        SET last_message_at = NOW(), updated_at = NOW()
        WHERE session_id = ${sessionId}
      `);
    }

    // 4. 检查消息是否已存在
    const existingMessageResult = await db.execute(sql`
      SELECT id FROM messages
      WHERE robot_id = ${robotId} AND content = ${messageId}
      LIMIT 1
    `);

    if (existingMessageResult.rows.length > 0) {
      // 消息已存在，返回成功
      return NextResponse.json({
        success: true,
        data: {
          message: "消息已存在",
          existing: true,
        },
      });
    }

    // 5. 插入消息记录
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
        ${messageId},
        ${JSON.stringify(extraData || {})},
        'pending',
        'incoming',
        ${timestamp ? new Date(timestamp).toISOString() : null}
      )
      RETURNING *
    `);

    const message = messageResult.rows[0];

    // 6. 保存用户消息到会话上下文
    try {
      await db.execute(sql`
        INSERT INTO session_contexts (session_id, message_id, role, content)
        VALUES (${sessionId}, ${message.id}, 'user', ${content})
      `);
    } catch (error) {
      console.error("保存用户消息到上下文失败:", error);
    }

    // 7. 自动回复（后台处理）
    // 只有文本消息才触发自动回复
    if (messageType === MessageType.TEXT || messageType === MessageType.IMAGE) {
      // 异步处理，不阻塞响应
      processAutoReply(robotId, content, messageType, sessionId, userId, request.headers).catch(error => {
        console.error("自动回复处理失败:", error);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        messageId: message.id,
        sessionId,
        status: 'received',
        autoReply: 'processing',
        message: "消息上报成功，正在处理自动回复",
      },
    });
  } catch (error: any) {
    console.error("消息上报错误:", error);

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
        error: "消息上报失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * 处理自动回复
 */
async function processAutoReply(
  robotId: string,
  content: string,
  messageType: MessageType,
  sessionId: string,
  userId: string | undefined,
  headers: Headers
): Promise<void> {
  try {
    const handler = getMessageHandler();
    const customHeaders = extractHeadersFromRequest(headers);

    const result = await handler.handleMessage(
      robotId,
      content,
      messageType,
      sessionId,
      userId,
      customHeaders
    );

    if (result.success && result.response) {
      // 通过 WebSocket 发送回复
      const { sendWebSocketMessage } = await import('@/server/websocket-server');
      
      sendWebSocketMessage(robotId, {
        type: 'auto_reply',
        data: {
          robotId,
          sessionId,
          userId,
          response: result.response,
          usedKnowledgeBase: result.usedKnowledgeBase,
          timestamp: Date.now(),
        },
      });

      // 保存回复到消息表
      const db = await getDatabase();
      await db.execute(sql`
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
          'text',
          ${result.response},
          ${JSON.stringify({ autoReply: true, usedKnowledgeBase: result.usedKnowledgeBase })},
          'sent',
          'outgoing',
          NOW()
        )
      `);
    }
  } catch (error) {
    console.error("自动回复处理失败:", error);
  }
}
