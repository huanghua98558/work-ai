import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activationCodes, users } from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const activateCodeSchema = z.object({
  code: z.string().min(8).max(8),
});

// 使用激活码
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const body = await request.json();
    const validatedData = activateCodeSchema.parse(body);

    // 查找激活码
    const codes = await db
      .select()
      .from(activationCodes)
      .where(
        and(
          eq(activationCodes.code, validatedData.code.toUpperCase()),
          eq(activationCodes.status, "unused")
        )
      );

    if (codes.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在或已被使用" },
        { status: 400 }
      );
    }

    const code = codes[0];

    // 检查激活码是否过期
    if (code.expiresAt && new Date() > code.expiresAt) {
      await db
        .update(activationCodes)
        .set({ status: "expired" })
        .where(eq(activationCodes.id, code.id));

      return NextResponse.json(
        { success: false, error: "激活码已过期" },
        { status: 400 }
      );
    }

    // 检查是否已经绑定用户
    if (code.boundUserId && code.boundUserId !== user.userId) {
      return NextResponse.json(
        { success: false, error: "该激活码已被其他用户使用" },
        { status: 400 }
      );
    }

    // 激活激活码
    const now = new Date();
    const [updatedCode] = await db
      .update(activationCodes)
      .set({
        status: "used",
        boundUserId: user.userId,
        usedAt: now,
      })
      .where(eq(activationCodes.id, code.id))
      .returning();

    // 更新用户角色为管理员（可选）
    await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, user.userId));

    return NextResponse.json({
      success: true,
      data: {
        activationCode: updatedCode,
        message: "激活成功",
      },
    });
  } catch (error: any) {
    console.error("激活激活码错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "激活激活码失败", details: error.message },
      { status: 500 }
    );
  }
}
