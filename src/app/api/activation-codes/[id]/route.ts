// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";

/**
 * 获取单个激活码详情
 * GET /api/activation-codes/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    // 只有管理员可以查看激活码详情
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const codeId = parseInt(params.id);

    // 查询激活码详情（关联机器人和用户信息）
    const result = await client.query(
      `SELECT
        ac.*,
        u.username as creator_name,
        r.name as robot_name,
        r.status as robot_status,
        r.user_id as robot_user_id,
        ru.username as robot_user_name
      FROM activation_codes ac
      LEFT JOIN users u ON ac.created_by = u.id
      LEFT JOIN robots r ON ac.robot_id = r.robot_id
      LEFT JOIN users ru ON r.user_id = ru.id
      WHERE ac.id = $1`,
      [codeId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("获取激活码详情错误:", error);
    return NextResponse.json(
      { success: false, error: "获取激活码详情失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 更新激活码
 * PUT /api/activation-codes/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    // 只有管理员可以更新激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const codeId = parseInt(params.id);
    const body = await request.json();

    // 验证激活码是否存在
    const existingCode = await client.query(
      `SELECT * FROM activation_codes WHERE id = $1`,
      [codeId]
    );

    if (existingCode.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    const code = existingCode.rows[0];

    // 已使用的激活码不允许修改
    if (code.status === 'used') {
      return NextResponse.json(
        { success: false, error: "已使用的激活码不允许修改" },
        { status: 400 }
      );
    }

    // 构建更新字段
    const updates: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    if (body.validityPeriod !== undefined) {
      updates.push(`validity_period = $${valueIndex++}`);
      values.push(body.validityPeriod);

      // 重新计算过期时间
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + body.validityPeriod);
      updates.push(`expires_at = $${valueIndex++}`);
      values.push(expiresAt.toISOString());
    }

    if (body.price !== undefined) {
      updates.push(`price = $${valueIndex++}`);
      values.push(String(body.price));
    }

    if (body.notes !== undefined) {
      updates.push(`notes = $${valueIndex++}`);
      values.push(body.notes);
    }

    if (body.maxUses !== undefined) {
      updates.push(`max_uses = $${valueIndex++}`);
      values.push(body.maxUses);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有需要更新的字段" },
        { status: 400 }
      );
    }

    values.push(codeId);

    const updateQuery = `
      UPDATE activation_codes
      SET ${updates.join(", ")}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "激活码更新成功",
    });
  } catch (error: any) {
    console.error("更新激活码错误:", error);
    return NextResponse.json(
      { success: false, error: "更新激活码失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 删除激活码
 * DELETE /api/activation-codes/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    // 只有管理员可以删除激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const codeId = parseInt(params.id);

    // 验证激活码是否存在
    const existingCode = await client.query(
      `SELECT * FROM activation_codes WHERE id = $1`,
      [codeId]
    );

    if (existingCode.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    const code = existingCode.rows[0];

    // 已使用的激活码不允许删除
    if (code.status === 'used') {
      return NextResponse.json(
        { success: false, error: "已使用的激活码不允许删除" },
        { status: 400 }
      );
    }

    // 如果激活码绑定了机器人，解绑机器人
    if (code.robot_id) {
      await client.query(
        `UPDATE robots SET activation_code_id = NULL WHERE robot_id = $1`,
        [code.robot_id]
      );
    }

    // 删除激活码
    await client.query(`DELETE FROM activation_codes WHERE id = $1`, [codeId]);

    return NextResponse.json({
      success: true,
      message: "激活码删除成功",
    });
  } catch (error: any) {
    console.error("删除激活码错误:", error);
    return NextResponse.json(
      { success: false, error: "删除激活码失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
