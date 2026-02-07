// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";

/**
 * APP激活验证 Schema
 */
const activateSchema = z.object({
  code: z.string().min(1),
  deviceInfo: z.object({
    deviceId: z.string().min(1),        // 设备唯一标识
    brand: z.string().optional(),
    model: z.string().optional(),
    os: z.string().optional(),
    osVersion: z.string().optional(),
    manufacturer: z.string().optional(),
    network: z.string().optional(),
    appVersion: z.string().optional(),
    totalMemory: z.number().optional(),
    screenResolution: z.string().optional(),
  }),
});

/**
 * 生成随机token
 */
function generateToken(length: number = 64): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * APP激活接口
 * POST /api/robot-ids/activate
 *
 * 流程：
 * 1. 验证激活码
 * 2. 检查设备绑定
 * 3. 绑定设备或返回已有token
 * 4. 生成token
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const validatedData = activateSchema.parse(body);

    console.log('APP激活请求:', {
      code: validatedData.code,
      deviceId: validatedData.deviceInfo.deviceId,
    });

    // 查找激活码
    const codeResult = await client.query(
      `SELECT * FROM activation_codes
       WHERE code = $1
       LIMIT 1`,
      [validatedData.code.toUpperCase()]
    );

    if (codeResult.rows.length === 0) {
      return NextResponse.json(
        { code: 400, message: "激活码无效", data: null },
        { status: 400 }
      );
    }

    const code = codeResult.rows[0];

    // 检查激活码状态
    if (code.status === 'disabled') {
      return NextResponse.json(
        { code: 400, message: "激活码已被禁用", data: null },
        { status: 400 }
      );
    }

    if (code.status === 'expired') {
      return NextResponse.json(
        { code: 400, message: "激活码已过期", data: null },
        { status: 400 }
      );
    }

    // 检查激活码是否过期
    if (code.expires_at && new Date() > new Date(code.expires_at)) {
      await client.query(
        `UPDATE activation_codes SET status = 'expired' WHERE id = $1`,
        [code.id]
      );

      return NextResponse.json(
        { code: 400, message: "激活码已过期", data: null },
        { status: 400 }
      );
    }

    // 检查使用次数是否已达上限
    if (code.max_uses && code.used_count >= code.max_uses) {
      return NextResponse.json(
        { code: 400, message: "激活码使用次数已达上限", data: null },
        { status: 400 }
      );
    }

    // 获取机器人
    if (!code.robot_id) {
      return NextResponse.json(
        { code: 400, message: "激活码未绑定机器人", data: null },
        { status: 400 }
      );
    }

    const robotResult = await client.query(
      `SELECT * FROM robots WHERE bot_id = $1 LIMIT 1`,
      [code.robot_id]
    );

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { code: 404, message: "机器人不存在", data: null },
        { status: 404 }
      );
    }

    const robot = robotResult.rows[0];
    const deviceId = validatedData.deviceInfo.deviceId;

    // 检查该设备是否已绑定到其他机器人
    const deviceCheck = await client.query(
      `SELECT * FROM device_bindings WHERE device_id = $1`,
      [deviceId]
    );

    if (deviceCheck.rows.length > 0) {
      const existingBinding = deviceCheck.rows[0];
      // 如果设备已绑定到其他机器人，拒绝
      if (existingBinding.robot_id !== robot.bot_id) {
        return NextResponse.json(
          { code: 400, message: "该设备已绑定到其他机器人，请联系管理员解绑", data: null },
          { status: 400 }
        );
      }
      // 同设备重复激活，返回已有token
      const tokenResult = await client.query(
        `SELECT * FROM device_tokens WHERE robot_id = $1 AND device_id = $2 AND expires_at > NOW()`,
        [robot.bot_id, deviceId]
      );

      if (tokenResult.rows.length > 0) {
        const token = tokenResult.rows[0];
        return NextResponse.json({
          code: 200,
          message: "激活成功",
          data: {
            robotId: robot.bot_id,
            robotUuid: robot.bot_id,
            token: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: token.expires_at,
            isNewActivation: false,
          },
        });
      }
    }

    // 检查机器人是否已绑定到其他设备
    const robotDeviceCheck = await client.query(
      `SELECT * FROM device_bindings WHERE robot_id = $1`,
      [robot.bot_id]
    );

    if (robotDeviceCheck.rows.length > 0) {
      const existingDevice = robotDeviceCheck.rows[0];
      // 如果机器人已绑定到其他设备，拒绝
      if (existingDevice.device_id !== deviceId) {
        return NextResponse.json(
          { code: 400, message: "该机器人已绑定到其他设备，请联系管理员解绑", data: null },
          { status: 400 }
        );
      }
      // 同设备重复激活，返回已有token（已在上面处理）
    }

    // 开始事务
    await client.query('BEGIN');

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后过期

      // 绑定设备
      await client.query(
        `INSERT INTO device_bindings (robot_id, device_id, device_info, bound_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (robot_id) DO UPDATE SET
           device_id = $2,
           device_info = $3,
           bound_at = $4`,
        [robot.bot_id, deviceId, JSON.stringify(validatedData.deviceInfo), now.toISOString()]
      );

      // 生成token
      const accessToken = generateToken();
      const refreshToken = generateToken();

      // 存储token
      await client.query(
        `INSERT INTO device_tokens (robot_id, device_id, access_token, refresh_token, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [robot.bot_id, deviceId, accessToken, refreshToken, expiresAt.toISOString(), now.toISOString()]
      );

      // 更新激活码状态和使用次数
      const newUsedCount = (code.used_count || 0) + 1;
      let newStatus = code.status;
      if (newStatus === 'unused') {
        newStatus = 'active';
      }
      if (code.max_uses && newUsedCount >= code.max_uses) {
        newStatus = 'used';
      }

      await client.query(
        `UPDATE activation_codes SET status = $1, used_count = $2 WHERE id = $3`,
        [newStatus, newUsedCount, code.id]
      );

      // 提交事务
      await client.query('COMMIT');

      return NextResponse.json({
        code: 200,
        message: "激活成功",
        data: {
          robotId: robot.bot_id,
          robotUuid: robot.bot_id,
          token: accessToken,
          refreshToken: refreshToken,
          expiresAt: expiresAt.toISOString(),
          isNewActivation: true,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error("APP激活错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: 400, message: "请求参数错误", data: null },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { code: 500, message: "激活失败", data: null },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
