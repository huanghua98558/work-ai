import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
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

    const userList = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)));

    if (userList.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    const targetUser = userList[0];

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

    // 用户只能更新自己的部分信息，管理员可以更新所有用户
    if (!isAdmin(user) && parseInt(id) !== user.userId) {
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

    const [updatedUser] = await db
      .update(users)
      .set(validatedData)
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
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

    // 不能删除自己
    if (parseInt(id) === user.userId) {
      return NextResponse.json(
        { success: false, error: "不能删除自己" },
        { status: 400 }
      );
    }

    const [deletedUser] = await db
      .update(users)
      .set({ status: "disabled" })
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (!deletedUser) {
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
