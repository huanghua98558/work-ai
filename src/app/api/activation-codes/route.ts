import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activationCodes } from "@/storage/database/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/auth";
import { nanoid } from "nanoid";
import { z } from "zod";

const createActivationCodeSchema = z.object({
  validityPeriod: z.number().int().positive(),
  price: z.string().or(z.number()).transform(String).optional(),
  notes: z.string().optional(),
});

// 获取激活码列表
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以查看所有激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let whereCondition: any = {};
    if (status) {
      whereCondition = eq(activationCodes.status, status);
    }

    const codes = await db
      .select()
      .from(activationCodes)
      .where(whereCondition)
      .orderBy(desc(activationCodes.createdAt));

    return NextResponse.json({
      success: true,
      data: codes,
    });
  } catch (error: any) {
    console.error("获取激活码列表错误:", error);
    return NextResponse.json(
      { success: false, error: "获取激活码列表失败", details: error.message },
      { status: 500 }
    );
  }
}

// 创建激活码
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以创建激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createActivationCodeSchema.parse(body);

    // 生成8位随机激活码
    const code = nanoid(8).toUpperCase();

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validatedData.validityPeriod);

    const [newCode] = await db
      .insert(activationCodes)
      .values({
        code,
        status: "unused",
        validityPeriod: validatedData.validityPeriod,
        price: validatedData.price || "0.00",
        createdBy: user.userId,
        notes: validatedData.notes,
        expiresAt,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newCode,
    });
  } catch (error: any) {
    console.error("创建激活码错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "创建激活码失败", details: error.message },
      { status: 500 }
    );
  }
}
