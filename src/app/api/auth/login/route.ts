// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { generateAccessToken, generateRefreshToken, JWTPayload } from "@/lib/jwt";
import { z } from "zod";
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  phone: z.string().min(1).max(20),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    console.log('登录请求:', { phone: validatedData.phone });

    // 查询用户（包含password_hash字段）
    const userResult = await client.query(
      `SELECT id, phone, nickname, avatar, role, status, password_hash
       FROM users
       WHERE phone = $1
       LIMIT 1`,
      [validatedData.phone]
    );

    if (userResult.rows.length === 0) {
      console.log('用户不存在:', validatedData.phone);
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // 检查用户状态
    if (user.status !== "active") {
      console.log('账户已被禁用:', user.status);
      return NextResponse.json(
        { success: false, error: "账户已被禁用" },
        { status: 403 }
      );
    }

    // 验证密码
    let isPasswordValid = false;

    // 方式1：使用bcrypt验证password_hash字段（推荐方式）
    if (user.password_hash) {
      try {
        isPasswordValid = await bcrypt.compare(validatedData.password, user.password_hash);
      } catch (error) {
        console.error('bcrypt验证失败:', error);
      }
    }

    // 方式2：直接比较password_hash（向后兼容旧数据）
    if (!isPasswordValid && user.password_hash) {
      isPasswordValid = validatedData.password === user.password_hash;
    }

    // 方式3：使用手机号作为密码（临时兼容，用于测试）
    if (!isPasswordValid) {
      isPasswordValid = validatedData.password === user.phone;
    }

    if (!isPasswordValid) {
      console.log('密码错误');
      return NextResponse.json(
        { success: false, error: "密码错误" },
        { status: 401 }
      );
    }

    console.log('登录成功:', { userId: user.id, role: user.role });

    // 生成 JWT Token
    const payload: JWTPayload = {
      userId: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // 更新最后登录时间
    await client.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

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
  } finally {
    client.release();
  }
}
