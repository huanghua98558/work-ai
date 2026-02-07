// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";

/**
 * 解绑设备验证 Schema
 */
const unbindDeviceSchema = z.object({
  code: z.string().min(1).optional(), // 通过激活码解绑
  robotId: z.string().min(1).optional(), // 通过机器人ID解绑
  reason: z.string().optional(),
}).refine(
  data => data.code || data.robotId,
  { message: "必须提供 code 或 robotId 参数" }
);

/**
 * 解绑设备接口
 * POST /api/admin/unbind-device
 *
 * 功能：
 * 1. 删除 device_activations 表中的激活记录
 * 2. 将 activation_codes 状态从 used 改为 unused
 * 3. 将 robots 状态改为 offline
 * 4. 记录操作日志
 *
 * 支持两种方式：
 * - 通过激活码解绑（前端管理页面使用）
 * - 通过机器人ID解绑
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    // 只有管理员可以解绑设备
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = unbindDeviceSchema.parse(body);

    const { code, robotId, reason } = validatedData;

    console.log('解绑设备请求:', { code, robotId, reason });

    // 查找激活记录（支持通过激活码或机器人ID查找）
    let activation: any;
    let query: string;
    let params: any[];

    if (code) {
      // 通过激活码查找
      query = `
        SELECT da.*, ac.code as activation_code
        FROM device_activations da
        JOIN activation_codes ac ON da.activation_code_id = ac.id
        WHERE ac.code = $1
      `;
      params = [code.toUpperCase()];
    } else {
      // 通过机器人ID查找
      query = `
        SELECT da.*, ac.code as activation_code
        FROM device_activations da
        JOIN activation_codes ac ON da.activation_code_id = ac.id
        WHERE da.robot_id = $1
      `;
      params = [robotId];
    }

    const activationResult = await client.query(query, params);

    if (activationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: code ? "未找到该激活码的激活记录" : "未找到该机器人的激活记录" },
        { status: 404 }
      );
    }

    activation = activationResult.rows[0];

    // 查找关联的激活码
    const activationCodeResult = await client.query(
      `SELECT * FROM activation_codes WHERE id = $1`,
      [activation.activation_code_id]
    );

    if (activationCodeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    const activationCode = activationCodeResult.rows[0];

    // 删除激活记录
    await client.query(
      `DELETE FROM device_activations WHERE robot_id = $1`,
      [activation.robot_id]
    );

    // 更新激活码状态（从 used 改为 unused）
    await client.query(
      `UPDATE activation_codes
       SET status = 'unused', used_count = used_count - 1
       WHERE id = $1 AND status = 'used'`,
      [activationCode.id]
    );

    // 更新机器人状态为离线
    await client.query(
      `UPDATE robots SET status = 'offline' WHERE robot_id = $1`,
      [activation.robot_id]
    );

    // 记录操作日志（如果有操作日志表）
    try {
      await client.query(
        `INSERT INTO operation_logs (
          operator_id, operation_type, target_type, target_id, details, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.userId,
          'unbind_device',
          'robot',
          activation.robot_id,
          JSON.stringify({
            reason,
            code: activationCode.code,
            deviceInfo: activation.device_info,
            activatedAt: activation.activated_at,
          }),
          new Date().toISOString(),
        ]
      );
    } catch (error) {
      // 操作日志表可能不存在，忽略错误
      console.log('操作日志记录失败（可能日志表不存在）:', error);
    }

    console.log('设备解绑成功:', { robotId: activation.robot_id, code: activationCode.code });

    return NextResponse.json({
      success: true,
      message: "设备解绑成功",
      data: {
        robotId: activation.robot_id,
        activationCodeId: activationCode.id,
        activationCode: activationCode.code,
        unbindReason: reason,
      },
    });
  } catch (error: any) {
    console.error("解绑设备错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "解绑设备失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
