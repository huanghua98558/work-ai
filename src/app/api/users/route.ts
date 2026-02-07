import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/storage/database/shared/schema";
import { eq, like, desc, or } from "drizzle-orm";
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

    let whereConditions: any[] = [];

    if (role) {
      whereConditions.push(eq(users.role, role));
    }

    if (status) {
      whereConditions.push(eq(users.status, status));
    }

    if (search) {
      whereConditions.push(
        or(
          like(users.nickname, `%${search}%`),
          like(users.phone, `%${search}%`)
        )
      );
    }

    const userList = await db
      .select()
      .from(users)
      .where(whereConditions.length > 0 ? or(...whereConditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      success: true,
      data: userList,
      pagination: {
        page,
        limit,
        total: userList.length,
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
