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
  const token = getAuthToken(request);
  if (!token) {
    return null;
  }

  return verifyToken(token);
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
