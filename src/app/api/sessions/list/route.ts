import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const listSessionsSchema = z.object({
  robotId: z.string().min(1),
  userId: z.string().optional(),
  status: z.enum(['active', 'closed', 'all']).optional().default('all'),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
});

/**
 * 获取会话列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validatedData = listSessionsSchema.parse({
      robotId: searchParams.get('robotId'),
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') || 'all',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });

    const { robotId, userId, status, limit, offset } = validatedData;

    const db = await getDatabase();

    // 构建查询条件
    let whereClause = sql`WHERE robot_id = ${robotId}`;
    if (userId) {
      whereClause = sql`${whereClause} AND user_id = ${userId}`;
    }
    if (status !== 'all') {
      whereClause = sql`${whereClause} AND status = ${status}`;
    }

    // 查询会话列表
    const sessionsResult = await db.execute(sql`
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
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    // 查询总数
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM sessions ${whereClause}
    `);

    const sessions = sessionsResult.rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      robotId: row.robot_id,
      userId: row.user_id,
      status: row.status,
      metadata: row.metadata,
      messageCount: row.message_count,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
        },
      },
    });
  } catch (error: any) {
    console.error("获取会话列表错误:", error);

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
        error: "获取会话列表失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
