// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  withErrorHandling,
  successResponse,
  validateParams,
} from "@/lib/error-handler";
import { z } from "zod";

const closeSessionSchema = z.object({
  status: z.literal('closed'),
});

/**
 * 获取会话详情
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params;

  const db = await getDatabase();

  // 查询会话信息
  const sessionResult = await db.execute(sql`
    SELECT
      id,
      session_id,
      robot_id,
      user_id,
      status,
      metadata,
      message_count,
      last_message_at,
      created_at,
      updated_at
    FROM sessions
    WHERE session_id = ${id}
    LIMIT 1
  `);

  if (sessionResult.rows.length === 0) {
    return {
      success: false,
      error: "会话不存在",
      code: "SESSION_NOT_FOUND",
    };
  }

  const session = sessionResult.rows[0];

  // 查询会话的消息列表
  const messagesResult = await db.execute(sql`
    SELECT
      id,
      robot_id,
      member_id,
      conversation_id,
      message_type,
      content,
      media_url,
      ai_generated,
      ai_model,
      ai_tokens_used,
      ai_cost,
      metadata,
      direction,
      created_at
    FROM messages
    WHERE conversation_id = ${id}
    ORDER BY created_at ASC
  `);

  const messages = messagesResult.rows.map((row: any) => ({
    id: row.id,
    robotId: row.robot_id,
    memberId: row.member_id,
    conversationId: row.conversation_id,
    messageType: row.message_type,
    content: row.content,
    mediaUrl: row.media_url,
    aiGenerated: row.ai_generated,
    aiModel: row.ai_model,
    aiTokensUsed: row.ai_tokens_used,
    aiCost: row.ai_cost,
    metadata: row.metadata,
    direction: row.direction,
    createdAt: row.created_at,
  }));

  return successResponse({
    session: {
      id: session.id,
      sessionId: session.session_id,
      robotId: session.robot_id,
      userId: session.user_id,
      status: session.status,
      metadata: session.metadata,
      messageCount: session.message_count,
      lastMessageAt: session.last_message_at,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    },
    messages,
  });
});

/**
 * 关闭会话
 */
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params;

  const body = await request.json();
  const validatedData = validateParams(closeSessionSchema, body);

  const db = await getDatabase();

  // 检查会话是否存在
  const sessionResult = await db.execute(sql`
    SELECT id FROM sessions WHERE session_id = ${id} LIMIT 1
  `);

  if (sessionResult.rows.length === 0) {
    return {
      success: false,
      error: "会话不存在",
      code: "SESSION_NOT_FOUND",
    };
  }

  // 更新会话状态
  await db.execute(sql`
    UPDATE sessions
    SET status = 'closed',
        updated_at = NOW()
    WHERE session_id = ${id}
  `);

  return successResponse({
    message: "会话已关闭",
  });
});
