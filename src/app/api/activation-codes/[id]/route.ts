import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activationCodes } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";

const updateActivationCodeSchema = z.object({
  status: z.enum(["unused", "used", "expired", "disabled"]).optional(),
  boundUserId: z.number().int().optional(),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

// 获取单个激活码详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;

    const codes = await db
      .select()
      .from(activationCodes)
      .where(eq(activationCodes.id, parseInt(id)));

    if (codes.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    const code = codes[0];

    // 只有管理员或绑定用户可以查看
    if (!isAdmin(user) && code.boundUserId !== user.userId) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: code,
    });
  } catch (error: any) {
    console.error("获取激活码详情错误:", error);
    return NextResponse.json(
      { success: false, error: "获取激活码详情失败", details: error.message },
      { status: 500 }
    );
  }
}

// 更新激活码
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以更新激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateActivationCodeSchema.parse(body);

    const [updatedCode] = await db
      .update(activationCodes)
      .set(validatedData)
      .where(eq(activationCodes.id, parseInt(id)))
      .returning();

    if (!updatedCode) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCode,
    });
  } catch (error: any) {
    console.error("更新激活码错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "更新激活码失败", details: error.message },
      { status: 500 }
    );
  }
}

// 删除激活码
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以删除激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const deletedCodes = await db
      .delete(activationCodes)
      .where(eq(activationCodes.id, parseInt(id)))
      .returning();

    if (deletedCodes.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "删除成功" },
    });
  } catch (error: any) {
    console.error("删除激活码错误:", error);
    return NextResponse.json(
      { success: false, error: "删除激活码失败", details: error.message },
      { status: 500 }
    );
  }
}
