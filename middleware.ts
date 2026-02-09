import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./src/lib/jwt";
import {
  extractRateLimitIdentifier,
  checkRateLimit,
  addRateLimitHeaders,
} from "./src/lib/rate-limit";

// 不需要认证的路径（公开路由）
const publicPaths = [
  // 登录相关
  "/login",
  "/register",
  "/init",
  // API - 认证相关
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/sms-code",
  "/api/user/login-by-password",
  "/api/user/login-by-phone",
  "/api/init/admin",
  // API - 健康检查
  "/api/health",
  "/api/health/ready",
  "/api/system/check",
  "/api/system/check-deploy",
  // API - WebSocket 测试
  "/api/websocket/test",
  // API - 数据库测试
  "/api/db/test",
  "/api/db/check",
];

// 不需要限流的路径（健康检查等）
const noRateLimitPaths = [
  "/api/health",
  "/api/health/ready",
  "/api/system/check",
  "/api/system/check-deploy",
];

// 需要重定向到登录页的页面路由
const pageAuthPaths = [
  "/dashboard",
  "/robots",
  "/users",
  "/settings",
  "/monitor",
  "/logs",
  "/conversations",
];

// 需要管理员权限的路径
const adminPaths = [
  "/admin",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    // 检查是否是公开路径
    const isPublicPath = publicPaths.some((path) =>
      pathname.startsWith(path)
    );

    // 如果是公开路径，直接进行限流检查
    if (isPublicPath && !noRateLimitPaths.some(path => pathname.startsWith(path))) {
      // 对于公开路径，使用更严格的限流
      const identifier = extractRateLimitIdentifier(request);
      const rateLimitResult = checkRateLimit(identifier, 50, 60000); // 50请求/分钟

      if (!rateLimitResult.success) {
        const response = NextResponse.json(
          {
            success: false,
            error: "请求过于频繁，请稍后再试",
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: rateLimitResult.retryAfter,
          },
          { status: 429 }
        );
        addRateLimitHeaders(response.headers, rateLimitResult, 50);
        return response;
      }
    }

    // 静态资源和 Next.js 内部资源直接放行
    if (
      pathname.startsWith("/_next/static") ||
      pathname.startsWith("/_next/image") ||
      pathname.startsWith("/favicon.ico") ||
      pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i)
    ) {
      return NextResponse.next();
    }

    // 获取 Token
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get("accessToken")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    console.log('[Middleware] 请求路径:', pathname);
    console.log('[Middleware] Token 信息:', {
      hasAuthHeader: !!authHeader,
      hasCookie: !!cookieToken,
      tokenLength: token?.length || 0,
    });

    // 验证 Token
    let user = null;
    if (token) {
      try {
        user = verifyToken(token);
        console.log('[Middleware] Token 验证成功:', { userId: user.userId, phone: user.phone, role: user.role });
      } catch (error) {
        console.error("[Middleware] Token 验证失败:", error);
      }
    }

    // 对于 API 路由
    if (pathname.startsWith("/api")) {
      // 跳过限流检查的路径
      if (!noRateLimitPaths.some(path => pathname.startsWith(path))) {
        const identifier = extractRateLimitIdentifier(request);
        const rateLimitResult = checkRateLimit(identifier);

        if (!rateLimitResult.success) {
          const response = NextResponse.json(
            {
              success: false,
              error: "请求过于频繁，请稍后再试",
              code: "RATE_LIMIT_EXCEEDED",
              retryAfter: rateLimitResult.retryAfter,
            },
            { status: 429 }
          );
          addRateLimitHeaders(response.headers, rateLimitResult);
          return response;
        }
      }

      if (!token || !user) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权访问，请先登录",
            code: "UNAUTHORIZED"
          },
          { status: 401 }
        );
      }

      // 将用户信息添加到请求头，供后续路由使用
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", user.userId?.toString() || "");
      requestHeaders.set("x-user-phone", user.phone || "");
      requestHeaders.set("x-user-role", user.role || "");

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // 添加限流信息到响应头
      const identifier = extractRateLimitIdentifier(request);
      const rateLimitResult = checkRateLimit(identifier);
      addRateLimitHeaders(response.headers, rateLimitResult);

      return response;
    }

    // 对于需要认证的页面路由，重定向到登录页
    if (pageAuthPaths.some((path) => pathname.startsWith(path))) {
      if (!token || !user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // 对于需要管理员权限的页面路由
    if (adminPaths.some((path) => pathname.startsWith(path))) {
      if (!token || !user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // 检查是否是管理员
      if (user.role !== "admin") {
        // 非管理员，返回 403 或重定向到首页
        if (pathname.startsWith("/api")) {
          return NextResponse.json(
            {
              success: false,
              error: "权限不足，需要管理员权限",
              code: "FORBIDDEN"
            },
            { status: 403 }
          );
        } else {
          // 页面路由，重定向到首页并显示错误提示
          const homeUrl = new URL("/", request.url);
          homeUrl.searchParams.set("error", "admin_only");
          return NextResponse.redirect(homeUrl);
        }
      }
    }

    return NextResponse.next();

  } catch (error) {
    console.error("Middleware 错误:", error);
    // 出错时，如果是 API 返回 500，否则重定向到登录页
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { success: false, error: "服务器内部错误" },
        { status: 500 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon 文件)
     * - public 文件夹中的静态资源
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
