// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

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

    const total = parseInt(countResult.rows[0].total as string);

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

// 创建用户
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以创建用户
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nickname, phone, password, role, status } = body;

    // 验证必填字段
    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: "手机号和密码不能为空" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // 检查手机号是否已存在
    const existingUser = await db.execute(sql`
      SELECT id FROM users WHERE phone = ${phone}
    `);

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "该手机号已被注册" },
        { status: 400 }
      );
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await db.execute(sql`
      INSERT INTO users (nickname, phone, password_hash, role, status)
      VALUES (
        ${nickname || '未命名'},
        ${phone},
        ${passwordHash},
        ${role || 'user'},
        ${status || 'active'}
      )
      RETURNING id, nickname, phone, role, status, created_at
    `);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "用户创建成功",
    });
  } catch (error: any) {
    console.error("创建用户错误:", error);
    return NextResponse.json(
      { success: false, error: "创建用户失败", details: error.message },
      { status: 500 }
    );
  }
}
