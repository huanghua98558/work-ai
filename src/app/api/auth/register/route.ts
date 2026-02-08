// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
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

    // 获取数据库实例
    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "数据库连接失败" },
        { status: 500 }
      );
    }

    // 检查用户是否已存在
    const existingUserResult = await db.execute(sql`
      SELECT id, phone, nickname, role, status 
      FROM users 
      WHERE phone = ${validatedData.phone}
      LIMIT 1
    `);

    if (existingUserResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "该手机号已注册" },
        { status: 400 }
      );
    }

    // 创建新用户
    const newUserResult = await db.execute(sql`
      INSERT INTO users (phone, nickname, role, status)
      VALUES (${validatedData.phone}, ${validatedData.nickname || "未命名"}, 'user', 'active')
      RETURNING id, phone, nickname, role, status, avatar, created_at
    `);

    const newUser = newUserResult.rows[0];

    // 生成 JWT Token
    const payload: JWTPayload = {
      userId: newUser.id as number,
      phone: newUser.phone as string,
      role: newUser.role as string,
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
