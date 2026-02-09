// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";
import { logAuditEvent, AuditActionTypes, ResourceTypes } from "@/lib/audit-log";

/**
 * 批量删除激活码
 * DELETE /api/activation-codes/batch-delete
 */
export async function DELETE(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    const user = requireAuth(request);

    // 只有管理员可以批量删除激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { codeIds } = body;

    if (!codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "请提供要删除的激活码ID列表" },
        { status: 400 }
      );
    }

    // 批量删除激活码
    const placeholders = codeIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await client.query(
      `DELETE FROM activation_codes WHERE id IN (${placeholders}) RETURNING id, code, type, status`,
      codeIds
    );

    const deletedCodes = result.rows;
    const failedCount = codeIds.length - deletedCodes.length;

    // 记录审计日志
    await logAuditEvent({
      user,
      actionType: AuditActionTypes.BATCH_DELETE,
      resourceType: ResourceTypes.ACTIVATION_CODE,
      description: `批量删除了 ${deletedCodes.length} 个激活码`,
      metadata: {
        codeIds: deletedCodes.map((c: any) => c.id),
        codes: deletedCodes.map((c: any) => c.code),
        totalCount: codeIds.length,
        successCount: deletedCodes.length,
        failedCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: deletedCodes.length,
        failedCount,
        deletedCodes,
      },
    });
  } catch (error: any) {
    console.error("批量删除激活码错误:", error);
    return NextResponse.json(
      { success: false, error: "批量删除激活码失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
