// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";

/**
 * 审计日志接口
 */
export async function GET(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    const user = requireAuth(request);

    // 只有管理员可以查看审计日志
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const actionType = searchParams.get("actionType");
    const resourceType = searchParams.get("resourceType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 构建查询条件
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (actionType) {
      conditions.push(`action_type = $${paramIndex++}`);
      params.push(actionType);
    }

    if (resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(resourceType);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // 检查审计日志表是否存在
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'audit_logs'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }

    // 查询总数
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 查询审计日志
    const query = `
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await client.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("获取审计日志错误:", error);
    return NextResponse.json(
      { success: false, error: "获取审计日志失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 创建审计日志（内部使用）
 */
export async function POST(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    const user = requireAuth(request);
    const body = await request.json();

    const { actionType, resourceType, resourceId, description, metadata } = body;

    if (!actionType || !resourceType) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 检查审计日志表是否存在
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'audit_logs'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // 创建审计日志表
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_phone VARCHAR(20),
          user_role VARCHAR(20),
          action_type VARCHAR(50) NOT NULL,
          resource_type VARCHAR(50) NOT NULL,
          resource_id VARCHAR(100),
          description TEXT,
          metadata JSONB,
          ip_address VARCHAR(50),
          user_agent TEXT,
          status VARCHAR(20) DEFAULT 'success',
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          INDEX idx_user_id (user_id),
          INDEX idx_action_type (action_type),
          INDEX idx_resource_type (resource_type),
          INDEX idx_created_at (created_at)
        )
      `);
    }

    const result = await client.query(
      `INSERT INTO audit_logs (
        user_id, user_phone, user_role,
        action_type, resource_type, resource_id,
        description, metadata, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        user.userId,
        user.phone,
        user.role,
        actionType,
        resourceType,
        resourceId || null,
        description || null,
        metadata || JSON.stringify({}),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || null,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("创建审计日志错误:", error);
    return NextResponse.json(
      { success: false, error: "创建审计日志失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
