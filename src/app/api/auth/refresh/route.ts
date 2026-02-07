// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";

/**
 * Token刷新验证 Schema
 */
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * 生成随机token
 */
function generateToken(length: number = 64): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Token刷新接口
 * POST /api/auth/refresh
 *
 * 流程：
 * 1. 验证refreshToken
 * 2. 生成新的accessToken和refreshToken
 * 3. 更新device_tokens表
 * 4. 返回新的token
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const validatedData = refreshSchema.parse(body);

    console.log('Token刷新请求:', { refreshToken: validatedData.refreshToken.substring(0, 10) + '...' });

    // 查找refreshToken对应的记录
    const tokenResult = await client.query(
      `SELECT * FROM device_tokens WHERE refresh_token = $1`,
      [validatedData.refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { code: 401, message: "RefreshToken无效", data: null },
        { status: 401 }
      );
    }

    const tokenRecord = tokenResult.rows[0];

    // 检查token是否过期
    if (new Date() > new Date(tokenRecord.expires_at)) {
      // 删除过期的token
      await client.query(
        `DELETE FROM device_tokens WHERE id = $1`,
        [tokenRecord.id]
      );
      return NextResponse.json(
        { code: 401, message: "Token已过期，请重新激活", data: null },
        { status: 401 }
      );
    }

    // 生成新的token
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后过期
    const newAccessToken = generateToken();
    const newRefreshToken = generateToken();

    // 更新token记录
    await client.query(
      `UPDATE device_tokens
       SET access_token = $1,
           refresh_token = $2,
           expires_at = $3,
           created_at = $4
       WHERE id = $5`,
      [newAccessToken, newRefreshToken, expiresAt.toISOString(), now.toISOString(), tokenRecord.id]
    );

    // 查询机器人信息
    const robotResult = await client.query(
      `SELECT bot_id FROM robots WHERE bot_id = $1`,
      [tokenRecord.robot_id]
    );

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { code: 404, message: "机器人不存在", data: null },
        { status: 404 }
      );
    }

    const robot = robotResult.rows[0];

    return NextResponse.json({
      code: 200,
      message: "刷新成功",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 86400,
        tokenType: "Bearer",
        expiresAt: expiresAt.toISOString(),
        robotId: robot.bot_id,
      },
    });
  } catch (error: any) {
    console.error("Token刷新错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: 400, message: "请求参数错误", data: null },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { code: 500, message: "Token刷新失败", data: null },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
