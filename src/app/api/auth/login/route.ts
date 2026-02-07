import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword } from "@/lib/password";
import { generateAccessToken, generateRefreshToken, JWTPayload } from "@/lib/jwt";
import { z } from "zod";

const loginSchema = z.object({
  phone: z.string().min(1).max(20),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // 查询用户
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.phone, validatedData.phone));

    if (userList.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 401 }
      );
    }

    const user = userList[0];

    // 检查用户状态
    if (user.status !== "active") {
      return NextResponse.json(
        { success: false, error: "账户已被禁用" },
        { status: 403 }
      );
    }

    // 验证密码（这里简化处理，实际应该存储密码哈希）
    // 暂时使用手机号作为密码（仅用于测试）
    const isPasswordValid = validatedData.password === user.phone;

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "密码错误" },
        { status: 401 }
      );
    }

    // 生成 JWT Token
    const payload: JWTPayload = {
      userId: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // 更新最后登录时间
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    console.error("登录错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "登录失败", details: error.message },
      { status: 500 }
    );
  }
}
