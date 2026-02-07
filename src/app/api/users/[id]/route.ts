// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";

const updateUserSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  avatar: z.string().optional(),
  role: z.enum(["admin", "user"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

// 获取用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;

    // 用户只能查看自己的信息，管理员可以查看所有用户
    if (!isAdmin(user) && parseInt(id) !== user.userId) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const db = await getDatabase();

    const userResult = await db.execute(sql`
      SELECT * FROM users 
      WHERE id = ${parseInt(id)}
      LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    const targetUser = userResult.rows[0];

    return NextResponse.json({
      success: true,
      data: targetUser,
    });
  } catch (error: any) {
    console.error("获取用户详情错误:", error);
    return NextResponse.json(
      { success: false, error: "获取用户详情失败", details: error.message },
      { status: 500 }
    );
  }
}

// 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;
    const userId = parseInt(id);

    // 用户只能更新自己的部分信息，管理员可以更新所有用户
    if (!isAdmin(user) && userId !== user.userId) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // 非管理员不能修改角色和状态
    if (!isAdmin(user)) {
      delete (validatedData as any).role;
      delete (validatedData as any).status;
    }

    const db = await getDatabase();

    // 构建 SET 子句
    const setClauses = [];
    const values = [];

    if (validatedData.nickname !== undefined) {
      setClauses.push(`nickname = $${values.length + 1}`);
      values.push(validatedData.nickname);
    }
    if (validatedData.avatar !== undefined) {
      setClauses.push(`avatar = $${values.length + 1}`);
      values.push(validatedData.avatar);
    }
    if (validatedData.role !== undefined) {
      setClauses.push(`role = $${values.length + 1}`);
      values.push(validatedData.role);
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
      UPDATE users 
      SET ${sql.raw(setClauses.join(", "))}
      WHERE id = ${userId}
      RETURNING *
    `;

    const updatedUserResult = await db.execute(updateQuery);

    if (updatedUserResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedUserResult.rows[0],
    });
  } catch (error: any) {
    console.error("更新用户错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "更新用户失败", details: error.message },
      { status: 500 }
    );
  }
}

// 删除用户（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以删除用户
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);

    // 不能删除自己
    if (userId === user.userId) {
      return NextResponse.json(
        { success: false, error: "不能删除自己" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const deletedUserResult = await db.execute(sql`
      UPDATE users 
      SET status = 'disabled', updated_at = NOW()
      WHERE id = ${userId}
      RETURNING *
    `);

    if (deletedUserResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "删除成功" },
    });
  } catch (error: any) {
    console.error("删除用户错误:", error);
    return NextResponse.json(
      { success: false, error: "删除用户失败", details: error.message },
      { status: 500 }
    );
  }
}
