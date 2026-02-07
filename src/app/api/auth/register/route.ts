import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { generateAccessToken, generateRefreshToken, JWTPayload } from "@/lib/jwt";
import { z } from "zod";

const registerSchema = z.object({
  phone: z.string().min(11).max(11),
  nickname: z.string().min(1).max(100).optional(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // 检查用户是否已存在
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.phone, validatedData.phone));

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: "该手机号已注册" },
        { status: 400 }
      );
    }

    // 创建新用户（暂时使用手机号作为密码）
    const [newUser] = await db
      .insert(users)
      .values({
        phone: validatedData.phone,
        nickname: validatedData.nickname || "未命名",
        role: "user",
        status: "active",
      })
      .returning();

    // 生成 JWT Token
    const payload: JWTPayload = {
      userId: newUser.id,
      phone: newUser.phone,
      role: newUser.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          nickname: newUser.nickname,
          avatar: newUser.avatar,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    console.error("注册错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "注册失败", details: error.message },
      { status: 500 }
    );
  }
}
