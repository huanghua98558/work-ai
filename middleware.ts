import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, JWTPayload } from "./src/lib/jwt";

// 不需要认证的路径
const publicPaths = [
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路径
  const isPublicPath = publicPaths.some((path) =>
    pathname.startsWith(path)
  );

  // 如果是公开路径，放行
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 对于 API 路由，检查认证
  if (pathname.startsWith("/api")) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "未授权访问" },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "无效的令牌" },
        { status: 401 }
      );
    }

    // 将用户信息添加到请求头
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.userId.toString());
    requestHeaders.set("x-user-phone", user.phone);
    requestHeaders.set("x-user-role", user.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 对于页面路由，检查认证（如果有登录页面的话）
  if (!pathname.startsWith("/login")) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon 文件)
     * - public 文件夹
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
