// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      // 查询 admin 用户
      const result = await client.query(
        'SELECT id, phone, password_hash, nickname, role, status FROM users WHERE phone = $1',
        ['admin']
      );

      if (!result.rows || result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Admin user not found',
        });
      }

      const user = result.rows[0];
      const testPassword = 'admin123';

      // 测试密码验证
      let bcryptValid = false;
      let bcryptError = null;

      if (user.password_hash) {
        try {
          bcryptValid = await bcrypt.compare(testPassword, user.password_hash);
        } catch (error) {
          bcryptError = error.message;
        }
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          role: user.role,
          status: user.status,
        },
        password_test: {
          test_password: testPassword,
          password_hash: user.password_hash,
          bcrypt_valid: bcryptValid,
          bcrypt_error: bcryptError,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
