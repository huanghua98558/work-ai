// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";

const activateCodeSchema = z.object({
  code: z.string().min(1),
  // 用户ID（可选，用于绑定机器人到用户）
  userId: z.number().optional(),
});

/**
 * 激活激活码
 * POST /api/activation-codes/activate
 *
 * 流程：
 * 1. 验证激活码是否有效
 * 2. 获取激活码绑定的机器人
 * 3. 如果提供了userId，将机器人绑定到用户账户
 * 4. 返回机器人ID（机器人ID是唯一识别码）
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const validatedData = activateCodeSchema.parse(body);

    console.log('激活激活码请求:', { code: validatedData.code, userId: validatedData.userId });

    // 查找激活码
    const codeResult = await client.query(
      `SELECT * FROM activation_codes
       WHERE code = $1
       LIMIT 1`,
      [validatedData.code.toUpperCase()]
    );

    if (codeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 400 }
      );
    }

    const code = codeResult.rows[0];

    // 检查激活码状态
    if (code.status === 'disabled') {
      return NextResponse.json(
        { success: false, error: "激活码已被禁用" },
        { status: 400 }
      );
    }

    if (code.status === 'expired') {
      return NextResponse.json(
        { success: false, error: "激活码已过期" },
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
        { success: false, error: "激活码已过期" },
        { status: 400 }
      );
    }

    // 检查使用次数是否已达上限
    if (code.max_uses && code.used_count >= code.max_uses) {
      return NextResponse.json(
        { success: false, error: "激活码使用次数已达上限" },
        { status: 400 }
      );
    }

    // 获取激活码绑定的机器人
    const robotResult = await client.query(
      `SELECT * FROM robots WHERE bot_id = $1 LIMIT 1`,
      [code.robot_id]
    );

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "机器人不存在" },
        { status: 404 }
      );
    }

    const robot = robotResult.rows[0];

    // 开始事务
    await client.query('BEGIN');

    // 如果提供了userId，将机器人绑定到用户
    if (validatedData.userId) {
      // 检查用户是否已绑定该机器人
      const existingBinding = await client.query(
        `SELECT * FROM user_robots WHERE user_id = $1 AND robot_id = $2`,
        [validatedData.userId, robot.bot_id]
      );

      if (existingBinding.rows.length === 0) {
        // 绑定机器人到用户
        await client.query(
          `INSERT INTO user_robots (user_id, robot_id, nickname, created_at)
           VALUES ($1, $2, $3, $4)`,
          [
            validatedData.userId,
            robot.bot_id,
            robot.name,
            new Date().toISOString(),
          ]
        );
      }
    }

    // 更新激活码状态和使用次数
    const now = new Date();
    const newUsedCount = (code.used_count || 0) + 1;

    // 计算新的状态
    let newStatus = code.status;
    if (newStatus === 'unused') {
      newStatus = 'active'; // 第一次使用后变为active
    }
    if (code.max_uses && newUsedCount >= code.max_uses) {
      newStatus = 'used'; // 达到最大使用次数后变为used
    }

    await client.query(
      `UPDATE activation_codes
       SET status = $1, used_count = $2
       WHERE id = $3`,
      [newStatus, newUsedCount, code.id]
    );

    // 创建激活记录
    await client.query(
      `INSERT INTO activation_records (user_id, code_id, robot_id, activated_at, activated_by, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        validatedData.userId || code.created_by || 1,
        code.id,
        robot.bot_id,
        now.toISOString(),
        validatedData.userId || code.created_by || 1,
        'app' // 标记来源为APP
      ]
    );

    // 提交事务
    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: {
        robotId: robot.bot_id, // 机器人ID是唯一识别码
        robotName: robot.name,
        message: "激活成功",
        remainingUses: code.max_uses ? code.max_uses - newUsedCount : null,
      },
    });
  } catch (error: any) {
    console.error("激活激活码错误:", error);

    // 回滚事务
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      console.error("回滚事务失败:", e);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "激活失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
