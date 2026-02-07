// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { randomBytes } from "crypto";

/**
 * 创建机器人验证 Schema
 */
const createRobotSchema = z.object({
  name: z.string().min(1).max(100).default("未命名机器人"),
  description: z.string().optional(),
  // 必须提供激活码或机器人ID之一
  activationCode: z.string().optional(),
  robotId: z.string().optional(),
}).refine(
  (data) => data.activationCode || data.robotId,
  { message: "必须提供激活码或机器人ID" }
).refine(
  (data) => !(data.activationCode && data.robotId),
  { message: "只能提供激活码或机器人ID之一" }
);

/**
 * 生成botId：20位随机数字大小英文字母
 */
function generateBotId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomValues = randomBytes(20);
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * 创建机器人（绑定机器人到用户）
 * POST /api/robots
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    const body = await request.json();
    const validatedData = createRobotSchema.parse(body);

    console.log('创建机器人请求:', validatedData);

    // 验证激活码或机器人ID
    let sourceRobotId = null;

    if (validatedData.activationCode) {
      // 验证激活码
      const codeResult = await client.query(
        `SELECT * FROM activation_codes
         WHERE code = $1
         LIMIT 1`,
        [validatedData.activationCode.toUpperCase()]
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

      // 如果激活码已绑定机器人，使用绑定的机器人ID
      if (code.robot_id) {
        sourceRobotId = code.robot_id;
      } else {
        // 激活码未绑定机器人，自动创建一个新机器人作为源机器人
        const botId = generateBotId();
        const now = new Date();

        const newBotResult = await client.query(
          `INSERT INTO robots (
            bot_id, name, description, status, created_by, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            botId,
            '新机器人',
            '通过激活码自动创建',
            'offline',
            code.created_by || 1,
            now.toISOString(),
            now.toISOString(),
          ]
        );

        sourceRobotId = botId;

        // 更新激活码，绑定到新创建的机器人
        await client.query(
          `UPDATE activation_codes SET robot_id = $1 WHERE id = $2`,
          [botId, code.id]
        );
      }

      // 标记激活码为已使用
      await client.query(
        `UPDATE activation_codes
         SET status = 'used', used_count = used_count + 1
         WHERE id = $1`,
        [code.id]
      );
    } else if (validatedData.robotId) {
      // 验证机器人ID
      const robotResult = await client.query(
        `SELECT * FROM robots WHERE bot_id = $1 LIMIT 1`,
        [validatedData.robotId]
      );

      if (robotResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "机器人ID不存在" },
          { status: 400 }
        );
      }

      sourceRobotId = validatedData.robotId;
    }

    if (!sourceRobotId) {
      return NextResponse.json(
        { success: false, error: "无法确定机器人ID" },
        { status: 400 }
      );
    }

    // 开始事务
    await client.query('BEGIN');

    try {
      const now = new Date();

      // 为用户创建一个新的机器人记录，使用相同的bot_id（但这会违反唯一约束）
      // 所以实际上应该是：用户添加机器人到列表，而不是创建新机器人
      // 但当前的schema设计是bot_id唯一，所以我们需要使用robot_members表
      
      // 由于robot_members表结构不明确，我们采用简单的方式：
      // 创建一个新的机器人记录，bot_id是唯一的（通过添加用户ID后缀）
      const userBotId = `${sourceRobotId}_u${user.userId}`;
      
      // 创建用户机器人记录
      const newRobotResult = await client.query(
        `INSERT INTO robots (
          bot_id, name, description, status, created_by, created_at, updated_at,
          robot_uuid
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          userBotId,
          validatedData.name || '未命名机器人',
          validatedData.description || null,
          'offline',
          user.userId,
          now.toISOString(),
          now.toISOString(),
          sourceRobotId, // 使用robot_uuid字段存储源机器人ID
        ]
      );

      const newRobot = newRobotResult.rows[0];

      // 添加兼容字段
      const robotWithCompatFields = {
        ...newRobot,
        robot_id: newRobot.bot_id,
        robot_uuid: newRobot.robot_uuid,
        user_id: newRobot.created_by,
        source_robot_id: sourceRobotId,
      };

      console.log('机器人绑定成功:', robotWithCompatFields);

      // 提交事务
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: robotWithCompatFields,
        message: "机器人绑定成功",
      });
    } catch (error) {
      // 回滚事务
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error("创建机器人错误:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "绑定机器人失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
