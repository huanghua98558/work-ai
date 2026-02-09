// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAuditEvent, AuditActionTypes, ResourceTypes } from "@/lib/audit-log";

/**
 * 修改密码
 * POST /api/user/change-password
 */
export async function POST(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "请提供当前密码和新密码" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "新密码长度至少为6位" },
        { status: 400 }
      );
    }

    // 验证当前密码
    const userResult = await client.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "当前密码错误" },
        { status: 400 }
      );
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, user.userId]
    );

    // 记录审计日志
    await logAuditEvent({
      user,
      actionType: 'user.change_password',
      resourceType: ResourceTypes.USER,
      resourceId: String(user.userId),
      description: '修改了密码',
      metadata: {
        userId: user.userId,
        phone: user.phone,
      },
    });

    return NextResponse.json({
      success: true,
      message: "密码修改成功",
    });
  } catch (error: any) {
    console.error("修改密码错误:", error);
    return NextResponse.json(
      { success: false, error: "修改密码失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
