import { verifyToken, JWTPayload } from "./jwt";

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

export function authenticate(request: Request): JWTPayload | null {
  // 方法1：从 Authorization header 读取
  const token = getAuthToken(request);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      return decoded;
    }
  }

  // 方法2：从 middleware 传递的 headers 读取（优先级更高）
  const userId = request.headers.get("x-user-id");
  const phone = request.headers.get("x-user-phone");
  const role = request.headers.get("x-user-role");

  if (userId && phone && role) {
    return {
      userId: parseInt(userId),
      phone,
      role,
    };
  }

  return null;
}

export function requireAuth(request: Request): JWTPayload {
  const user = authenticate(request);

  if (!user) {
    throw new Error("未授权访问");
  }

  return user;
}

export function requireRole(user: JWTPayload, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new Error("权限不足");
  }
}

export function isAdmin(user: JWTPayload): boolean {
  return user.role === "admin";
}
