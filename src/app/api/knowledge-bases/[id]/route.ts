// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

// 获取知识库详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;

    const db = await getDatabase();

    const kbResult = await db.execute(sql`
      SELECT * FROM knowledge_bases
      WHERE id = ${parseInt(id)}
      LIMIT 1
    `);

    if (kbResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "知识库不存在" },
        { status: 404 }
      );
    }

    const knowledgeBase = {
      ...kbResult.rows[0],
    };

    return NextResponse.json({
      success: true,
      data: knowledgeBase,
    });
  } catch (error: any) {
    console.error("获取知识库详情错误:", error);
    return NextResponse.json(
      { success: false, error: "获取知识库详情失败", details: error.message },
      { status: 500 }
    );
  }
}

// 更新知识库
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateKnowledgeBaseSchema.parse(body);

    const db = await getDatabase();

    // 构建 SET 子句
    const setClauses = [];
    const values = [];

    if (validatedData.name !== undefined) {
      setClauses.push(`name = $${values.length + 1}`);
      values.push(validatedData.name);
    }
    if (validatedData.description !== undefined) {
      setClauses.push(`description = $${values.length + 1}`);
      values.push(validatedData.description);
    }
    if (validatedData.status !== undefined) {
      setClauses.push(`status = $${values.length + 1}`);
      values.push(validatedData.status);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有提供更新字段" },
        { status: 400 }
      );
    }

    setClauses.push(`updated_at = NOW()`);

    const updateQuery = sql`
      UPDATE knowledge_bases
      SET ${sql.raw(setClauses.join(", "))}
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    const updatedKbResult = await db.execute(updateQuery);

    if (updatedKbResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "知识库不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedKbResult.rows[0],
      message: "知识库更新成功",
    });
  } catch (error: any) {
    console.error("更新知识库错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "更新知识库失败", details: error.message },
      { status: 500 }
    );
  }
}

// 删除知识库
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;
    const knowledgeBaseId = parseInt(id);

    const db = await getDatabase();

    // 检查知识库是否存在
    const kbResult = await db.execute(sql`
      SELECT id FROM knowledge_bases WHERE id = ${knowledgeBaseId} LIMIT 1
    `);

    if (kbResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "知识库不存在" },
        { status: 404 }
      );
    }

    // 删除知识库
    await db.execute(sql`
      DELETE FROM knowledge_bases WHERE id = ${knowledgeBaseId}
    `);

    return NextResponse.json({
      success: true,
      data: { message: "知识库删除成功" },
    });
  } catch (error: any) {
    console.error("删除知识库错误:", error);
    return NextResponse.json(
      { success: false, error: "删除知识库失败", details: error.message },
      { status: 500 }
    );
  }
}
