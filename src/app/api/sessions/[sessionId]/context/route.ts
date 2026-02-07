// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 获取会话上下文
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = await getDatabase();

    // 查询会话上下文
    const contextResult = await db.execute(sql`
      SELECT
        id,
        session_id,
        message_id,
        role,
        content,
        created_at
      FROM session_contexts
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    const contexts = contextResult.rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      messageId: row.message_id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        contexts,
        total: contexts.length,
      },
    });
  } catch (error: any) {
    console.error("获取会话上下文错误:", error);

    return NextResponse.json(
      {
        success: false,
        error: "获取会话上下文失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * 添加会话上下文
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { messageId, role, content } = body;

    if (!messageId || !role || !content) {
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

    // 插入会话上下文
    const result = await db.execute(sql`
      INSERT INTO session_contexts (session_id, message_id, role, content)
      VALUES (${sessionId}, ${messageId}, ${role}, ${content})
      RETURNING *
    `);

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        message: "会话上下文添加成功",
      },
    });
  } catch (error: any) {
    console.error("添加会话上下文错误:", error);

    return NextResponse.json(
      {
        success: false,
        error: "添加会话上下文失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * 清除会话上下文
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const db = await getDatabase();

    // 清除会话上下文
    await db.execute(sql`
      DELETE FROM session_contexts
      WHERE session_id = ${sessionId}
    `);

    return NextResponse.json({
      success: true,
      data: {
        message: "会话上下文已清除",
      },
    });
  } catch (error: any) {
    console.error("清除会话上下文错误:", error);

    return NextResponse.json(
      {
        success: false,
        error: "清除会话上下文失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
