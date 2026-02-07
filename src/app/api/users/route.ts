// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/auth";

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以查看所有用户
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const db = await getDatabase();

    // 构建 WHERE 子句
    const conditions = [];
    const values = [];

    if (role) {
      conditions.push(`role = $${values.length + 1}`);
      values.push(role);
    }

    if (status) {
      conditions.push(`status = $${values.length + 1}`);
      values.push(status);
    }

    if (search) {
      conditions.push(`(nickname ILIKE $${values.length + 1} OR phone ILIKE $${values.length + 2})`);
      values.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    // 查询用户列表
    const userListResult = await db.execute(sql`
      SELECT * FROM users 
      ${sql.raw(whereClause)}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // 查询总数
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM users 
      ${sql.raw(whereClause)}
    `);

    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      success: true,
      data: userListResult.rows,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error: any) {
    console.error("获取用户列表错误:", error);
    return NextResponse.json(
      { success: false, error: "获取用户列表失败", details: error.message },
      { status: 500 }
    );
  }
}
