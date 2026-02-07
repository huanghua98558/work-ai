// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";
import { randomBytes } from "crypto";

/**
 * 创建机器人验证 Schema
 */
const createRobotSchema = z.object({
  name: z.string().min(1).max(100).default("未命名机器人"),
  description: z.string().optional(),
  autoGenerateCode: z.boolean().default(false),
  validityPeriod: z.number().int().positive().optional(),
});

/**
 * 生成8位随机激活码（大写字母+数字）
 */
function generateActivationCode(): string {
  return Array.from({ length: 8 }, () =>
    Math.random() < 0.5
      ? String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
      : String.fromCharCode(48 + Math.floor(Math.random() * 10))  // 0-9
  ).join('').toUpperCase();
}

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
 * 获取机器人列表
 * GET /api/robots
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // 管理员可以查看所有机器人，非管理员只能查看自己的机器人
    if (!isAdmin(user)) {
      conditions.push(`r.created_by = $${paramIndex++}`);
      params.push(user.userId);
    }

    if (status) {
      conditions.push(`r.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // 查询总数
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM robots r ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 查询机器人列表（关联用户信息）
    const query = `
      SELECT
        r.*,
        u.nickname as user_name
      FROM robots r
      LEFT JOIN users u ON r.created_by = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    const result = await client.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("获取机器人列表错误:", error);
    return NextResponse.json(
      { success: false, error: "获取机器人列表失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 创建机器人
 * POST /api/robots
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    // 只有管理员可以创建机器人
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createRobotSchema.parse(body);

    console.log('创建机器人请求:', validatedData);

    // 开始事务
    await client.query('BEGIN');

    try {
      // 生成botId
      const botId = generateBotId();

      const now = new Date();

      // 插入机器人（只插入基本必需字段）
      const newRobotResult = await client.query(
        `INSERT INTO robots (
          bot_id, name, description, status, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          botId,
          validatedData.name,
          validatedData.description || null,
          'offline', // 初始状态为离线
          user.userId,
          now.toISOString(),
          now.toISOString(),
        ]
      );

      const newRobot = newRobotResult.rows[0];

      // 添加兼容字段
      const robotWithCompatFields = {
        ...newRobot,
        robot_id: newRobot.bot_id,
        robot_uuid: null,
        user_id: newRobot.created_by,
      };

      console.log('机器人创建成功:', robotWithCompatFields);

      let activationCodeData = null;

      // 如果需要自动生成激活码
      if (validatedData.autoGenerateCode) {
        const code = generateActivationCode();
        const validityPeriod = validatedData.validityPeriod || 365;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + validityPeriod);

        // 插入激活码
        const activationCodeResult = await client.query(
          `INSERT INTO activation_codes (
            code, status, type, max_uses, used_count, remark,
            created_by, expires_at, robot_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            code,
            'unused',
            'admin_dispatch',
            1,
            0,
            '自动生成',
            user.userId,
            expiresAt.toISOString(),
            botId,
          ]
        );

        activationCodeData = {
          ...activationCodeResult.rows[0],
          robot_name: newRobot.name,
          robot_id: botId,
        };

        console.log('激活码创建成功:', activationCodeData);
      }

      // 提交事务
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          robot: robotWithCompatFields,
          activationCode: activationCodeData,
        },
        message: validatedData.autoGenerateCode 
          ? "机器人和激活码创建成功" 
          : "机器人创建成功",
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
      { success: false, error: "创建机器人失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
