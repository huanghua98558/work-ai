// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";
import { logAuditEvent, AuditActionTypes, ResourceTypes } from "@/lib/audit-log";

/**
 * 批量删除用户
 * DELETE /api/users/batch-delete
 */
export async function DELETE(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    const user = requireAuth(request);

    // 只有管理员可以批量删除用户
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "请提供要删除的用户ID列表" },
        { status: 400 }
      );
    }

    // 不能删除自己
    if (userIds.includes(user.userId)) {
      return NextResponse.json(
        { success: false, error: "不能删除自己的账号" },
        { status: 400 }
      );
    }

    // 批量删除用户（设置为disabled状态）
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await client.query(
      `UPDATE users SET status = 'disabled' WHERE id IN (${placeholders}) AND id != $${userIds.length + 1} RETURNING id, phone, nickname`,
      [...userIds, user.userId]
    );

    const deletedUsers = result.rows;
    const failedCount = userIds.length - deletedUsers.length;

    // 记录审计日志
    await logAuditEvent({
      user,
      actionType: AuditActionTypes.BATCH_DELETE,
      resourceType: ResourceTypes.USER,
      description: `批量禁用了 ${deletedUsers.length} 个用户`,
      metadata: {
        userIds: deletedUsers.map((u: any) => u.id),
        userPhones: deletedUsers.map((u: any) => u.phone),
        totalCount: userIds.length,
        successCount: deletedUsers.length,
        failedCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: deletedUsers.length,
        failedCount,
        deletedUsers,
      },
    });
  } catch (error: any) {
    console.error("批量删除用户错误:", error);
    return NextResponse.json(
      { success: false, error: "批量删除用户失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
