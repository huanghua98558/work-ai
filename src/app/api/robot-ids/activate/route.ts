// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { generateAccessToken, generateRefreshToken, JWTPayload } from "@/lib/jwt";
import { randomBytes } from "crypto";
import { z } from "zod";

const deviceInfoSchema = z.object({
  deviceId: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  os: z.string().optional(),
  osVersion: z.string().optional(),
  manufacturer: z.string().optional(),
  network: z.string().optional(),
  appVersion: z.string().optional(),
  totalMemory: z.number().optional(),
  screenResolution: z.string().optional(),
});

const activateSchema = z.object({
  code: z.string().min(1),
  deviceInfo: deviceInfoSchema,
});

/**
 * 生成robotId：robot + 时间戳 + 随机字符串（不含标点符号）
 */
function generateRobotId(): string {
  const timestamp = Date.now();
  const randomStr = randomBytes(6).toString('hex'); // 12位16进制字符串（0-9, a-f）
  return `robot${timestamp}${randomStr}`;
}

/**
 * 生成robotUuid：36位标准UUID格式
 */
function generateRobotUuid(): string {
  const uuid = [
    randomBytes(4).toString('hex'),
    randomBytes(2).toString('hex'),
    randomBytes(2).toString('hex'),
    randomBytes(2).toString('hex'),
    randomBytes(6).toString('hex'),
  ].join('-');
  return uuid;
}

/**
 * APP设备激活接口
 * POST /api/robot-ids/activate
 *
 * 支持模式A：激活码绑定机器人
 * 1. 如果激活码已绑定机器人（robot_id不为空），激活时直接使用该机器人
 * 2. 如果激活码未绑定机器人（robot_id为空），激活时自动创建新机器人
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const validatedData = activateSchema.parse(body);

    const { code, deviceInfo } = validatedData;

    // 1. 查找激活码
    const activationCodeResult = await client.query(
      `SELECT * FROM activation_codes
       WHERE code = $1
       LIMIT 1`,
      [code.toUpperCase()]
    );

    if (activationCodeResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "激活码不存在",
          code: "INVALID_CODE",
        },
        { status: 404 }
      );
    }

    const activationCode = activationCodeResult.rows[0];

    console.log('激活码信息:', activationCode);

    // 2. 检查激活码状态（状态应为 unused）
    if (activationCode.status !== "unused") {
      return NextResponse.json(
        {
          success: false,
          error: "激活码已被使用或已失效",
          code: "CODE_INACTIVE",
          details: { status: activationCode.status }
        },
        { status: 403 }
      );
    }

    // 3. 检查激活码是否过期
    if (activationCode.expires_at && new Date(activationCode.expires_at) < new Date()) {
      // 标记为已过期
      await client.query(
        `UPDATE activation_codes SET status = 'expired' WHERE id = $1`,
        [activationCode.id]
      );

      return NextResponse.json(
        {
          success: false,
          error: "激活码已过期",
          code: "CODE_EXPIRED",
        },
        { status: 403 }
      );
    }

    // 4. 检查使用次数
    if (activationCode.used_count >= activationCode.max_uses) {
      return NextResponse.json(
        {
          success: false,
          error: "激活码使用次数已达上限",
          code: "CODE_LIMIT_REACHED",
          details: { usedCount: activationCode.used_count, maxUses: activationCode.max_uses }
        },
        { status: 403 }
      );
    }

    // 5. 查找是否已有激活记录（检查设备是否已激活）
    const existingActivationResult = await client.query(
      `SELECT * FROM device_activations
       WHERE activation_code_id = $1
       ORDER BY activated_at DESC
       LIMIT 1`,
      [activationCode.id]
    );

    const existingActivation = existingActivationResult.rows[0];
    const now = new Date();

    if (existingActivation) {
      // 已有激活记录 - 检查是否同一设备
      if (existingActivation.device_id === deviceInfo.deviceId) {
        // 同设备重复激活 - 更新Token和最后活跃时间
        console.log('同设备重复激活，更新Token');

        // 生成Token
        const payload: JWTPayload = {
          userId: activationCode.created_by || 0,
          phone: "",
          role: "robot",
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // 更新最后活跃时间
        await client.query(
          `UPDATE device_activations
           SET last_active_at = $1
           WHERE robot_id = $2`,
          [now.toISOString(), existingActivation.robot_id]
        );

        // 计算过期时间（使用激活码的 expires_at，如果不存在则使用30天）
        const expiresAt = activationCode.expires_at
          ? new Date(activationCode.expires_at)
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // 查询机器人信息（获取 robot_uuid）
        const robotResult = await client.query(
          `SELECT robot_uuid FROM robots WHERE robot_id = $1`,
          [existingActivation.robot_id]
        );

        return NextResponse.json(
          {
            success: true,
            code: 200,
            message: "激活成功（已更新Token）",
            data: {
              robotId: existingActivation.robot_id,
              robotUuid: robotResult.rows[0]?.robot_uuid || null,
              accessToken,
              refreshToken,
              expiresAt: expiresAt.toISOString(),
              isNewActivation: false,
            },
          },
          { status: 200 }
        );
      } else {
        // 跨设备激活 - 拒绝
        console.log('跨设备激活被拒绝');
        return NextResponse.json(
          {
            success: false,
            code: 409,
            message: "激活码已被其他设备使用，请联系管理员解绑",
            data: {
              existingDeviceId: existingActivation.device_id,
              existingRobotId: existingActivation.robot_id,
              activatedAt: existingActivation.activated_at,
            },
          },
          { status: 409 }
        );
      }
    }

    // 6. 首次激活 - 需要确定使用哪个机器人
    let robotId: string;
    let robotUuid: string;

    if (activationCode.robot_id) {
      // 模式A-1：激活码已绑定机器人 - 使用该机器人
      console.log('激活码已绑定机器人，使用预配置机器人');

      // 查询机器人信息
      const robotResult = await client.query(
        `SELECT robot_id, robot_uuid FROM robots WHERE robot_id = $1`,
        [activationCode.robot_id]
      );

      if (robotResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "激活码绑定的机器人不存在",
            code: "ROBOT_NOT_FOUND",
          },
          { status: 400 }
        );
      }

      robotId = robotResult.rows[0].robot_id;
      robotUuid = robotResult.rows[0].robot_uuid;

      // 更新机器人状态为在线
      await client.query(
        `UPDATE robots SET status = 'online', last_active_at = $1 WHERE robot_id = $2`,
        [now.toISOString(), robotId]
      );
    } else {
      // 模式A-2：激活码未绑定机器人 - 自动创建新机器人
      console.log('激活码未绑定机器人，自动创建新机器人');

      robotId = generateRobotId();
      robotUuid = generateRobotUuid();

      // 创建机器人
      const creatorId = activationCode.created_by || 1;

      await client.query(
        `INSERT INTO robots (
          robot_id, robot_uuid, user_id, name, status, ai_mode, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          robotId,
          robotUuid,
          creatorId,
          '未命名机器人',
          'online',
          'builtin',
          now.toISOString(),
          now.toISOString(),
        ]
      );

      // 更新激活码，绑定机器人
      await client.query(
        `UPDATE activation_codes SET robot_id = $1 WHERE id = $2`,
        [robotId, activationCode.id]
      );
    }

    // 7. 生成Token
    const payload: JWTPayload = {
      userId: activationCode.created_by || 0,
      phone: "",
      role: "robot",
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // 8. 插入激活记录
    await client.query(
      `INSERT INTO device_activations (
        robot_id, activation_code_id, device_id, device_info, status, activated_at, last_active_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        robotId,
        activationCode.id,
        deviceInfo.deviceId,
        JSON.stringify(deviceInfo),
        'active',
        now.toISOString(),
        now.toISOString(),
      ]
    );

    // 9. 更新激活码状态和使用次数
    await client.query(
      `UPDATE activation_codes
       SET status = 'used', used_count = used_count + 1, used_at = $1
       WHERE id = $2`,
      [now.toISOString(), activationCode.id]
    );

    // 10. 计算过期时间（使用激活码的 expires_at，如果不存在则使用30天）
    const expiresAt = activationCode.expires_at
      ? new Date(activationCode.expires_at)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    console.log('首次激活成功:', { robotId, robotUuid });

    return NextResponse.json(
      {
        success: true,
        code: 201,
        message: "激活成功",
        data: {
          robotId,
          robotUuid, // 现在返回真实的 robotUuid
          accessToken,
          refreshToken,
          expiresAt: expiresAt.toISOString(), // 新增 expiresAt
          isNewActivation: true,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("设备激活错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "请求参数错误",
          details: error.errors,
          code: "INVALID_PARAMS",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "激活失败，请稍后重试",
        code: "INTERNAL_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
