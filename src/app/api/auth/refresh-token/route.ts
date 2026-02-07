import { NextRequest, NextResponse } from "next/server";
import { verifyToken, generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { z } from "zod";

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh Token不能为空"),
});

/**
 * 刷新Access Token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = refreshTokenSchema.parse(body);

    const { refreshToken } = validatedData;

    console.log("[RefreshToken] Received token:", refreshToken);

    // 验证 Refresh Token
    const payload = verifyToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "Refresh Token无效或已过期",
          code: "INVALID_REFRESH_TOKEN",
        },
        { status: 401 }
      );
    }

    console.log("[RefreshToken] Payload:", payload);

    // 生成新的 Access Token 和 Refresh Token
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    console.log("[RefreshToken] New tokens generated");

    return NextResponse.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error: any) {
    console.error("刷新Token错误:", error);

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
        error: "刷新Token失败，请重新登录",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
