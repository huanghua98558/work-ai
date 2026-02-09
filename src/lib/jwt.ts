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
  // 基础验证
  if (!token) {
    console.error('[JWT] Token 验证失败: Token 为空');
    return null;
  }

  if (typeof token !== 'string') {
    console.error('[JWT] Token 验证失败: Token 不是字符串，类型:', typeof token);
    return null;
  }

  // 格式验证
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('[JWT] Token 验证失败: Token 格式不正确', {
      expected: 3,
      actual: parts.length,
      tokenLength: token.length,
    });
    return null;
  }

  try {
    // 尝试解析 payload（不验证签名，用于调试）
    let payloadInfo = {};
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payloadInfo = {
        userId: payload.userId,
        phone: payload.phone,
        role: payload.role,
        exp: payload.exp,
        iat: payload.iat,
      };
    } catch (e) {
      console.error('[JWT] 解析 payload 失败:', e);
    }

    console.log('[JWT] 开始验证 Token:', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 50) + '...',
      payload: payloadInfo,
    });

    // 验证 Token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    console.log('[JWT] Token 验证成功:', {
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role,
    });

    return decoded;
  } catch (error: any) {
    console.error('[JWT] Token 验证失败:', {
      errorName: error.name,
      errorMessage: error.message,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 50) + '...',
      stack: error.stack,
    });

    // 根据错误类型提供更详细的信息
    switch (error.name) {
      case 'TokenExpiredError':
        console.error('[JWT] Token 已过期:', {
          expiredAt: error.expiredAt,
          now: new Date(),
        });
        break;

      case 'JsonWebTokenError':
        console.error('[JWT] Token 无效或签名错误:', {
          message: error.message,
          possibleCauses: [
            'Token 被篡改',
            'JWT_SECRET 不一致',
            'Token 格式错误',
          ],
        });
        break;

      case 'NotBeforeError':
        console.error('[JWT] Token 尚未生效:', {
          date: error.date,
          now: new Date(),
        });
        break;

      default:
        console.error('[JWT] 未知错误:', error);
    }

    return null;
  }
}
