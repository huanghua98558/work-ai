// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 获取会话详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const db = await getDatabase();

    // 查询会话
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
      WHERE session_id = ${sessionId}
      LIMIT 1
    `);

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "会话不存在",
          code: "SESSION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const session = sessionResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
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
    });
  } catch (error: any) {
    console.error("获取会话详情错误:", error);

    return NextResponse.json(
      {
        success: false,
        error: "获取会话详情失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * 关闭会话
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { status } = body;

    if (status !== 'closed') {
      return NextResponse.json(
        {
          success: false,
          error: "只支持关闭会话",
          code: "INVALID_ACTION",
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // 更新会话状态
    const result = await db.execute(sql`
      UPDATE sessions
      SET status = 'closed', updated_at = NOW()
      WHERE session_id = ${sessionId}
      RETURNING *
    `);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "会话不存在",
          code: "SESSION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "会话已关闭",
      },
    });
  } catch (error: any) {
    console.error("关闭会话错误:", error);

    return NextResponse.json(
      {
        success: false,
        error: "关闭会话失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
