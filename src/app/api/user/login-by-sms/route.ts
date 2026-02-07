import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { generateAccessToken, generateRefreshToken, JWTPayload } from "@/lib/jwt";
import { verifyCode } from "@/lib/sms";
import { z } from "zod";

const loginBySmsSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
  code: z.string().length(6, "验证码格式错误"),
  type: z.enum(["login", "register"]).optional().default("login"),
});

/**
 * 手机号验证码登录/注册
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginBySmsSchema.parse(body);

    const { phone, code, type } = validatedData;

    // 验证验证码
    const isCodeValid = await verifyCode(phone, code, type);
    if (!isCodeValid) {
      return NextResponse.json(
        {
          success: false,
          error: "验证码错误或已过期",
          code: "INVALID_CODE",
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // 查找用户
    const userResult = await db.execute(sql`
      SELECT id, phone, nickname, avatar, role, status 
      FROM users 
      WHERE phone = ${phone}
      LIMIT 1
    `);

    let user;

    if (userResult.rows.length === 0) {
      // 用户不存在，自动注册
      if (type === "login") {
        return NextResponse.json(
          {
            success: false,
            error: "用户不存在，请先注册",
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // 注册新用户
      const newUserResult = await db.execute(sql`
        INSERT INTO users (phone, nickname, role, status)
        VALUES (${phone}, '未命名', 'user', 'active')
        RETURNING id, phone, nickname, avatar, role, status, created_at
      `);

      user = newUserResult.rows[0];
    } else {
      // 用户存在
      user = userResult.rows[0];

      // 检查用户状态
      if (user.status !== "active") {
        return NextResponse.json(
          {
            success: false,
            error: "账户已被禁用",
            code: "ACCOUNT_DISABLED",
          },
          { status: 403 }
        );
      }
    }

    // 更新最后登录时间
    await db.execute(sql`
      UPDATE users 
      SET last_login_at = NOW()
      WHERE id = ${user.id}
    `);

    // 生成 JWT Token
    const payload: JWTPayload = {
      userId: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

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
        isNewUser: userResult.rows.length === 0,
      },
    });
  } catch (error: any) {
    console.error("手机号验证码登录错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "请求参数错误",
          details: error.errors,
          code: "INVALID_PARAMS",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "登录失败，请稍后重试",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
