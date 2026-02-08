import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  userId: number;
  phone: string;
  role: string;
}

export function generateAccessToken(payload: JWTPayload): string {
  // 移除可能存在的 exp 和 iat 属性，避免与 expiresIn 冲突
  const { exp, iat, ...cleanPayload } = payload as any;
  const options: SignOptions = { expiresIn: '30d' };
  return jwt.sign(cleanPayload, JWT_SECRET, options);
}

export function generateRefreshToken(payload: JWTPayload): string {
  // 移除可能存在的 exp 和 iat 属性，避免与 expiresIn 冲突
  const { exp, iat, ...cleanPayload } = payload as any;
  const options: SignOptions = { expiresIn: '90d' };
  return jwt.sign(cleanPayload, JWT_SECRET, options);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
