// 强制动态渲染
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("accessToken")?.value;
  const xUserId = request.headers.get("x-user-id");
  const xUserPhone = request.headers.get("x-user-phone");
  const xUserRole = request.headers.get("x-user-role");

  return NextResponse.json({
    authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : null,
    cookieToken: cookieToken ? `${cookieToken.substring(0, 20)}...` : null,
    middlewareUser: xUserId ? {
      userId: xUserId,
      phone: xUserPhone,
      role: xUserRole,
    } : null,
    message: "此 API 用于调试认证状态",
  });
}
