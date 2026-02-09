// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent, AuditActionTypes, ResourceTypes } from "@/lib/audit-log";

/**
 * 更新个人资料
 * PUT /api/user/update-profile
 */
export async function PUT(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { nickname, avatar } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (nickname !== undefined && nickname !== null) {
      updates.push(`nickname = $${paramIndex++}`);
      values.push(nickname);
    }

    if (avatar !== undefined && avatar !== null) {
      updates.push(`avatar = $${paramIndex++}`);
      values.push(avatar);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有提供需要更新的字段" },
        { status: 400 }
      );
    }

    values.push(user.userId);

    // 更新用户信息
    const result = await client.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id, phone, nickname, avatar, role, status`,
      values
    );

    // 记录审计日志
    await logAuditEvent({
      user,
      actionType: AuditActionTypes.USER_UPDATE,
      resourceType: ResourceTypes.USER,
      resourceId: String(user.userId),
      description: '更新了个人资料',
      metadata: {
        userId: user.userId,
        phone: user.phone,
        updates: Object.keys(body),
      },
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "个人资料更新成功",
    });
  } catch (error: any) {
    console.error("更新个人资料错误:", error);
    return NextResponse.json(
      { success: false, error: "更新个人资料失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
