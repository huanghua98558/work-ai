// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.string().optional().default('document'),
  remoteId: z.string().optional(),
});

// 获取知识库列表
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const db = await getDatabase();

    // 构建 WHERE 子句
    const conditions = [];
    const values = [];

    if (status) {
      conditions.push(`status = $${values.length + 1}`);
      values.push(status);
    }

    if (search) {
      conditions.push(`(name ILIKE $${values.length + 1} OR description ILIKE $${values.length + 2})`);
      values.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    // 查询知识库列表
    const kbListResult = await db.execute(sql`
      SELECT * FROM knowledge_bases
      ${sql.raw(whereClause)}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // 查询总数
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM knowledge_bases
      ${sql.raw(whereClause)}
    `);

    const total = parseInt(countResult.rows[0].total as string);

    return NextResponse.json({
      success: true,
      data: kbListResult.rows,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error: any) {
    console.error("获取知识库列表错误:", error);
    return NextResponse.json(
      { success: false, error: "获取知识库列表失败", details: error.message },
      { status: 500 }
    );
  }
}

// 创建知识库
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const body = await request.json();
    const validatedData = createKnowledgeBaseSchema.parse(body);

    const db = await getDatabase();

    // 创建知识库
    const result = await db.execute(sql`
      INSERT INTO knowledge_bases (name, description, type, remote_id, status, created_by)
      VALUES (
        ${validatedData.name},
        ${validatedData.description || ''},
        ${validatedData.type},
        ${validatedData.remoteId || ''},
        'active',
        ${user.userId}
      )
      RETURNING *
    `);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "知识库创建成功",
    });
  } catch (error: any) {
    console.error("创建知识库错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "创建知识库失败", details: error.message },
      { status: 500 }
    );
  }
}
