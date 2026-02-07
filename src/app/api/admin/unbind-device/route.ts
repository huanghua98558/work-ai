import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";

const unbindDeviceSchema = z.object({
  code: z.string().min(1),
  reason: z.string().optional(),
});

/**
 * 设备解绑接口（管理员）
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    // 验证管理员权限
    if (!isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足，仅管理员可以解绑设备",
          code: "PERMISSION_DENIED",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = unbindDeviceSchema.parse(body);

    const { code, reason } = validatedData;

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

    // 2. 查找激活记录
    const activationResult = await db.execute(sql`
      SELECT * FROM device_activations
      WHERE activation_code_id = ${activationCode.id}
      LIMIT 1
    `);

    if (activationResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "该激活码尚未被激活",
          code: "NOT_ACTIVATED",
        },
        { status: 400 }
      );
    }

    const activation = activationResult.rows[0];

    // 3. 记录解绑历史
    await db.execute(sql`
      INSERT INTO device_unbindings (
        robot_id,
        activation_code_id,
        old_device_id,
        reason,
        unbound_by
      )
      VALUES (
        ${activation.robot_id},
        ${activationCode.id},
        ${activation.device_id},
        ${reason || null},
        ${user.userId}
      )
    `);

    // 4. 删除激活记录
    await db.execute(sql`
      DELETE FROM device_activations
      WHERE robot_id = ${activation.robot_id}
    `);

    // 5. 减少激活码使用次数（可选，根据业务需求）
    await db.execute(sql`
      UPDATE activation_codes
      SET used_count = GREATEST(0, used_count - 1)
      WHERE id = ${activationCode.id}
    `);

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "设备解绑成功",
          unbindDeviceId: activation.device_id,
          robotId: activation.robot_id,
          reason: reason || "无",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("设备解绑错误:", error);

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
        error: "解绑失败，请稍后重试",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
