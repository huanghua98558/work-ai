// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";

const activateCodeSchema = z.object({
  code: z.string().min(1),
});

/**
 * 生成通讯码（用于APP连接）
 */
function generateToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.random() < 0.5
      ? String.fromCharCode(97 + Math.floor(Math.random() * 26)) // a-z
      : String.fromCharCode(48 + Math.floor(Math.random() * 10))  // 0-9
  ).join('');
}

/**
 * 激活激活码
 * POST /api/activation-codes/activate
 *
 * 流程：
 * 1. 验证激活码是否有效
 * 2. 如果激活码已绑定机器人，返回该机器人
 * 3. 如果激活码未绑定机器人，自动创建一个新机器人
 * 4. 返回机器人ID和通讯码
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const validatedData = activateCodeSchema.parse(body);

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
    if (code.status === 'used' || code.status === 'disabled') {
      return NextResponse.json(
        { success: false, error: "激活码已被使用或已禁用" },
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

    // 开始事务
    await client.query('BEGIN');

    let robot = null;
    let isNewRobot = false;

    // 如果激活码已绑定机器人，获取该机器人
    if (code.robot_id) {
      const robotResult = await client.query(
        `SELECT * FROM robots WHERE bot_id = $1 LIMIT 1`,
        [code.robot_id]
      );

      if (robotResult.rows.length > 0) {
        robot = robotResult.rows[0];
      }
    }

    // 如果激活码未绑定机器人，自动创建一个新机器人
    if (!robot) {
      // 生成botId：20位随机字符
      const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomValues = randomBytes(20);
      let botId = '';
      for (let i = 0; i < 20; i++) {
        botId += chars[randomValues[i] % chars.length];
      }

      const now = new Date();

      // 创建新机器人
      const newRobotResult = await client.query(
        `INSERT INTO robots (
          bot_id, name, description, status, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          botId,
          '新机器人', // 默认名称
          '通过激活码自动创建',
          'offline',
          code.created_by || 1, // 使用激活码创建者作为机器人创建者
          now.toISOString(),
          now.toISOString(),
        ]
      );

      robot = newRobotResult.rows[0];
      isNewRobot = true;

      // 更新激活码，绑定到新创建的机器人
      await client.query(
        `UPDATE activation_codes SET robot_id = $1 WHERE id = $2`,
        [botId, code.id]
      );
    }

    // 生成通讯码
    const token = generateToken();

    // 更新激活码状态
    const now = new Date();
    await client.query(
      `UPDATE activation_codes
       SET status = 'used', used_count = used_count + 1
       WHERE id = $1`,
      [code.id]
    );

    // 创建激活记录
    await client.query(
      `INSERT INTO activation_records (user_id, code_id, activated_at, activated_by)
       VALUES ($1, $2, $3, $4)`,
      [code.created_by || 1, code.id, now.toISOString(), code.created_by || 1]
    );

    // 提交事务
    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: {
        robotId: robot.bot_id,
        robotName: robot.name,
        token: token, // 通讯码
        isNewRobot: isNewRobot,
        message: isNewRobot ? "激活成功，已自动创建新机器人" : "激活成功",
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
      { success: false, error: "激活激活码失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
