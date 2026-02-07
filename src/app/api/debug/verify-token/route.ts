import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    const decoded = verifyToken(token);

    return NextResponse.json({
      success: true,
      data: {
        decoded,
        isValid: !!decoded,
      },
    });
  } catch (error: any) {
    console.error("验证 token 错误:", error);
    return NextResponse.json(
      { success: false, error: "验证 token 失败", details: error.message },
      { status: 500 }
    );
  }
}
