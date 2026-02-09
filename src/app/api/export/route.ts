// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";
import { logAuditEvent, AuditActionTypes, ResourceTypes } from "@/lib/audit-log";

/**
 * 数据导出
 * GET /api/export?resource=users|robots|activation-codes&format=csv|json
 */
export async function GET(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    const user = requireAuth(request);

    // 只有管理员可以导出数据
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get("resource") || "users";
    const format = searchParams.get("format") || "csv";

    let query: string;
    let data: any[];
    let filename: string;

    switch (resource) {
      case "users":
        query = `
          SELECT
            id, phone, nickname, role, status,
            created_at, last_login_at
          FROM users
          ORDER BY created_at DESC
        `;
        const userResult = await client.query(query);
        data = userResult.rows;
        filename = `users_${new Date().toISOString().split('T')[0]}.${format}`;
        break;

      case "robots":
        query = `
          SELECT
            id, bot_id as "robotId", name, status,
            ai_mode as "aiMode", ai_provider as "aiProvider",
            created_at, last_active_at as "lastActiveAt"
          FROM robots
          WHERE status != 'deleted'
          ORDER BY created_at DESC
        `;
        const robotResult = await client.query(query);
        data = robotResult.rows;
        filename = `robots_${new Date().toISOString().split('T')[0]}.${format}`;
        break;

      case "activation-codes":
        query = `
          SELECT
            id, code, type, status,
            robot_id as "robotId", device_id as "deviceId",
            created_at, used_at as "usedAt", expires_at as "expiresAt"
          FROM activation_codes
          ORDER BY created_at DESC
        `;
        const codeResult = await client.query(query);
        data = codeResult.rows;
        filename = `activation_codes_${new Date().toISOString().split('T')[0]}.${format}`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: "不支持的资源类型" },
          { status: 400 }
        );
    }

    // 记录审计日志
    await logAuditEvent({
      user,
      actionType: AuditActionTypes.DATA_EXPORT,
      resourceType: resource === 'users' ? ResourceTypes.USER :
                      resource === 'robots' ? ResourceTypes.ROBOT :
                      ResourceTypes.ACTIVATION_CODE,
      description: `导出了 ${data.length} 条${resource}数据`,
      metadata: {
        resource,
        format,
        count: data.length,
        filename,
      },
    });

    // 根据格式返回数据
    if (format === "json") {
      return NextResponse.json({
        success: true,
        data,
        filename,
        count: data.length,
      });
    } else if (format === "csv") {
      // 生成CSV
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header];
            // 处理逗号和引号
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          }).join(',')
        )
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: "不支持的格式" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("数据导出错误:", error);
    return NextResponse.json(
      { success: false, error: "数据导出失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
