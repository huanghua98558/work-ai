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
  code: z.string().optional(),
  robotId: z.string().optional(),
  reason: z.string().optional(),
  resetStatus: z.boolean().optional().default(true), // 是否重置激活码状态（允许重新激活）
}).refine(
  (data) => data.code || data.robotId,
  { message: "必须提供激活码或机器人ID" }
).refine(
  (data) => !(data.code && data.robotId),
  { message: "只能提供激活码或机器人ID之一" }
);

/**
 * 管理员解绑设备
 * POST /api/admin/unbind-device
 *
 * 流程：
 * 1. 验证管理员权限
 * 2. 根据激活码或robotId查找设备绑定
 * 3. 删除设备绑定记录
 * 4. 删除设备token记录
 * 5. 记录解绑日志
 * 6. 重置激活码状态（允许重新激活）
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    // 验证管理员权限
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足，需要管理员权限" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = unbindDeviceSchema.parse(body);

    console.log('解绑设备请求:', {
      userId: user.userId,
      code: validatedData.code,
      robotId: validatedData.robotId,
      reason: validatedData.reason,
    });

    let robotId = null;
    let activationCode = null;

    // 根据激活码查找robotId
    if (validatedData.code) {
      const codeResult = await client.query(
        `SELECT * FROM activation_codes
         WHERE code = $1
         LIMIT 1`,
        [validatedData.code.toUpperCase()]
      );

      if (codeResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "激活码不存在" },
          { status: 404 }
        );
      }

      activationCode = codeResult.rows[0];
      robotId = activationCode.robot_id;
    } else if (validatedData.robotId) {
      robotId = validatedData.robotId;
    }

    if (!robotId) {
      return NextResponse.json(
        { success: false, error: "无法确定机器人ID" },
        { status: 400 }
      );
    }

    // 查找设备绑定
    const deviceBindingResult = await client.query(
      `SELECT * FROM device_bindings WHERE robot_id = $1`,
      [robotId]
    );

    if (deviceBindingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "该机器人未绑定设备" },
        { status: 404 }
      );
    }

    const deviceBinding = deviceBindingResult.rows[0];

    // 开始事务
    await client.query('BEGIN');

    try {
      const now = new Date();

      // 记录解绑日志（可选，可以创建一个device_unbind_logs表）
      // 这里先简单记录到激活码的remark中
      if (activationCode) {
        const newRemark = (activationCode.remark || '') + `\n[解绑设备] ${now.toISOString()}: 设备ID=${deviceBinding.device_id}, 原因=${validatedData.reason || '管理员操作'}, 操作人=${user.userId}`;
        await client.query(
          `UPDATE activation_codes SET remark = $1 WHERE id = $2`,
          [newRemark, activationCode.id]
        );

        // 重置激活码状态（允许重新激活）
        if (validatedData.resetStatus) {
          // 减少已使用次数（如果大于0）
          const newUsedCount = Math.max(0, (activationCode.used_count || 0) - 1);

          // 如果使用次数降为0，重置为unused状态
          // 否则保持active状态
          const newStatus = newUsedCount === 0 ? 'unused' : (activationCode.status === 'used' ? 'active' : activationCode.status);

          await client.query(
            `UPDATE activation_codes
             SET status = $1, used_count = $2
             WHERE id = $3`,
            [newStatus, newUsedCount, activationCode.id]
          );
        }
      }

      // 删除设备绑定
      await client.query(
        `DELETE FROM device_bindings WHERE robot_id = $1`,
        [robotId]
      );

      // 删除设备token
      await client.query(
        `DELETE FROM device_tokens WHERE robot_id = $1`,
        [robotId]
      );

      // 提交事务
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: validatedData.resetStatus ? "设备解绑成功，激活码已重置，可重新激活" : "设备解绑成功",
        data: {
          robotId,
          deviceId: deviceBinding.device_id,
          unboundAt: now.toISOString(),
          resetStatus: validatedData.resetStatus,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error("解绑设备错误:", error);

    // 处理权限错误
    if (error.message === "未授权访问") {
      return NextResponse.json(
        { success: false, error: "未授权访问" },
        { status: 401 }
      );
    }

    if (error.message === "权限不足") {
      return NextResponse.json(
        { success: false, error: "权限不足，需要管理员权限" },
        { status: 403 }
      );
    }

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
