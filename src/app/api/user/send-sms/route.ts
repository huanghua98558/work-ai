// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createVerificationCode, checkRateLimit } from "@/lib/sms";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

const sendSmsSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
  type: z.enum(["login", "register", "reset"]).optional().default("login"),
});

/**
 * 发送短信验证码
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sendSmsSchema.parse(body);

    const { phone, type } = validatedData;

    // 获取客户端IP
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ||
                     request.headers.get("x-real-ip") ||
                     "unknown";

    // 检查发送频率限制
    const canSend = await checkRateLimit(phone);
    if (!canSend) {
      return NextResponse.json(
        {
          success: false,
          error: "验证码发送过于频繁，请稍后再试",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    // 创建并发送验证码
    const code = await createVerificationCode(phone, type, ipAddress);
    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "验证码发送失败，请稍后重试",
          code: "SEND_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "验证码已发送",
        expiresIn: 300, // 5分钟
        // 开发环境下返回验证码，生产环境不应返回
        code: process.env.NODE_ENV === 'development' ? code : undefined,
      },
    });
  } catch (error: any) {
    console.error("发送短信验证码错误:", error);

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
        error: "服务器内部错误",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
