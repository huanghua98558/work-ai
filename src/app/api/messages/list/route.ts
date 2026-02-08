// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const listMessagesSchema = z.object({
  robotId: z.string().min(1),
  memberId: z.string().optional(),
  conversationId: z.string().optional(),
  messageType: z.string().optional(),
  direction: z.enum(['incoming', 'outgoing', 'all']).optional().default('all'),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
});

/**
 * 获取消息列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validatedData = listMessagesSchema.parse({
      robotId: searchParams.get('robotId'),
      memberId: searchParams.get('memberId') || undefined,
      conversationId: searchParams.get('conversationId') || undefined,
      messageType: searchParams.get('messageType') || undefined,
      direction: searchParams.get('direction') || 'all',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });

    const { robotId, memberId, conversationId, messageType, direction, limit, offset } = validatedData;

    const db = await getDatabase();

    // 构建查询条件
    let whereClause = sql`WHERE robot_id = ${robotId}`;
    if (memberId) {
      whereClause = sql`${whereClause} AND member_id = ${memberId}`;
    }
    if (conversationId) {
      whereClause = sql`${whereClause} AND conversation_id = ${conversationId}`;
    }
    if (messageType) {
      whereClause = sql`${whereClause} AND message_type = ${messageType}`;
    }
    if (direction !== 'all') {
      whereClause = sql`${whereClause} AND direction = ${direction}`;
    }

    // 查询消息列表
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
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    // 查询总数
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM messages ${whereClause}
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

    return NextResponse.json({
      success: true,
      data: {
        messages,
        pagination: {
          total: parseInt(countResult.rows[0].total as string),
          limit,
          offset,
        },
      },
    });
  } catch (error: any) {
    console.error("获取消息列表错误:", error);

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
        error: "获取消息列表失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
