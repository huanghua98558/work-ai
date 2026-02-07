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
  botType: z.string().optional(), // bot_type
  description: z.string().optional(),
});

/**
 * 生成botId：使用 bot_ 前缀
 */
function generateBotId(): string {
  const timestamp = Date.now();
  const randomStr = randomBytes(6).toString('hex');
  return `bot_${timestamp}_${randomStr}`;
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

    // 如果不是管理员，只能查看自己的机器人
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
        u.nickname as user_name,
        r.bot_id as robot_id,
        NULL as robot_uuid
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

    const body = await request.json();
    const validatedData = createRobotSchema.parse(body);

    console.log('创建机器人请求:', validatedData);

    // 生成botId
    const botId = generateBotId();

    const now = new Date();

    // 插入机器人（使用实际存在的字段）
    const newRobotResult = await client.query(
      `INSERT INTO robots (
        bot_id, name, description, bot_type, status, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        botId,
        validatedData.name,
        validatedData.description || null,
        validatedData.botType || 'feishu',
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

    return NextResponse.json({
      success: true,
      data: robotWithCompatFields,
      message: "机器人创建成功",
    });
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
