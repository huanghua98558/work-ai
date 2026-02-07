import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { generateAccessToken, generateRefreshToken, JWTPayload } from "@/lib/jwt";
import { nanoid } from "nanoid";
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
 * APP设备激活接口
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = activateSchema.parse(body);

    const { code, deviceInfo } = validatedData;

    const db = await getDatabase();

    // 1. 查找激活码
    const activationCodeResult = await db.execute(sql`
      SELECT * FROM activation_codes
      WHERE code = ${code.toUpperCase()}
      LIMIT 1
    `);

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

    // 2. 检查激活码状态
    if (activationCode.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: "激活码已失效",
          code: "CODE_INACTIVE",
        },
        { status: 403 }
      );
    }

    // 3. 检查激活码是否过期
    if (activationCode.expires_at && new Date(activationCode.expires_at) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "激活码已过期",
          code: "CODE_EXPIRED",
        },
        { status: 403 }
      );
    }

    // 4. 查找是否已有激活记录
    const existingActivationResult = await db.execute(sql`
      SELECT * FROM device_activations
      WHERE activation_code_id = ${activationCode.id}
      ORDER BY activated_at DESC
      LIMIT 1
    `);

    const existingActivation = existingActivationResult.rows[0];

    // 6. 处理激活逻辑
    if (existingActivation) {
      // 已有激活记录
      if (existingActivation.device_id === deviceInfo.deviceId) {
        // 同设备重复激活 - 更新Token
        const now = new Date();
        
        // 生成新的Token
        const payload: JWTPayload = {
          userId: activationCode.creator_id || 0,
          phone: "",
          role: "robot",
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // 更新最后活跃时间
        await db.execute(sql`
          UPDATE device_activations
          SET last_active_at = ${now.toISOString()}
          WHERE robot_id = ${existingActivation.robot_id}
        `);

        return NextResponse.json(
          {
            success: true,
            code: 200,
            message: "激活成功（已更新Token）",
            data: {
              robotId: existingActivation.robot_id,
              robotUuid: existingActivation.robot_uuid,
              accessToken,
              refreshToken,
              isNewActivation: false,
            },
          },
          { status: 200 }
        );
      } else {
        // 跨设备激活 - 拒绝
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
    } else {
      // 首次激活
      
      // 检查使用次数
      if (activationCode.used_count >= activationCode.max_uses) {
        return NextResponse.json(
          {
            success: false,
            error: "激活码使用次数已达上限",
            code: "CODE_LIMIT_REACHED",
          },
          { status: 403 }
        );
      }
      
      const now = new Date();
      
      // 生成robotId和robotUuid
      const robotId = `robot_${Date.now()}_${nanoid(8).toLowerCase()}`;

      // 生成Token
      const payload: JWTPayload = {
        userId: activationCode.creator_id || 0,
        phone: "",
        role: "robot",
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      // 插入激活记录
      await db.execute(sql`
        INSERT INTO device_activations (
          robot_id,
          activation_code_id,
          device_id,
          device_info,
          status,
          activated_at,
          last_active_at
        )
        VALUES (
          ${robotId},
          ${activationCode.id},
          ${deviceInfo.deviceId},
          ${JSON.stringify(deviceInfo)},
          'active',
          ${now.toISOString()},
          ${now.toISOString()}
        )
        RETURNING *
      `);

      // 更新激活码使用次数（只首次激活增加使用次数）
      await db.execute(sql`
        UPDATE activation_codes
        SET used_count = used_count + 1
        WHERE id = ${activationCode.id}
      `);

      // 记录激活日志
      if (activationCode.creator_id) {
        await db.execute(sql`
          INSERT INTO activation_records (user_id, code_id, activated_at, activated_by)
          VALUES (${activationCode.creator_id}, ${activationCode.id}, ${now.toISOString()}, ${activationCode.creator_id})
        `);
      }

      return NextResponse.json(
        {
          success: true,
          code: 201,
          message: "激活成功",
          data: {
            robotId,
            robotUuid: null, // 会在返回时填充
            accessToken,
            refreshToken,
            isNewActivation: true,
          },
        },
        { status: 201 }
      );
    }
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
      },
      { status: 500 }
    );
  }
}
