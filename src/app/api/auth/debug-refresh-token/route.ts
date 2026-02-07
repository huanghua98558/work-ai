import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    console.log("[Debug] RefreshToken:", refreshToken);

    const payload = verifyToken(refreshToken);
    
    console.log("[Debug] Payload:", payload);

    return NextResponse.json({
      success: true,
      data: {
        payload,
        isValid: !!payload,
      },
    });
  } catch (error: any) {
    console.error("调试刷新Token错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
