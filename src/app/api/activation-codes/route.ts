// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";
import { randomBytes } from "crypto";

/**
 * 创建激活码验证 Schema
 * 支持模式A：激活码绑定机器人
 */
const createActivationCodeSchema = z.object({
  // 激活码有效期（天）
  validityPeriod: z.number().int().positive().default(365),
  // 价格
  price: z.string().or(z.number()).transform(String).optional(),
  // 备注
  notes: z.string().optional(),
  // 激活码类型：admin_dispatch（管理员分发）或 pure_code（纯激活码）
  type: z.enum(['admin_dispatch', 'pure_code']).default('admin_dispatch'),
  // 最大使用次数（默认1，表示一对一）
  maxUses: z.number().int().positive().default(1),
  // 如果选择绑定已有机器人，提供 robot_id
  robotId: z.string().optional(),
});

/**
 * 获取激活码列表
 * GET /api/activation-codes
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    // 只有管理员可以查看所有激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // 查询激活码总数
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM activation_codes ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 查询激活码列表（关联机器人和设备信息）
    const query = `
      SELECT
        ac.*,
        u.nickname as creator_name,
        r.name as robot_name,
        r.status as robot_status,
        r.bot_id as robot_id,
        da.device_id,
        da.device_info
      FROM activation_codes ac
      LEFT JOIN users u ON ac.created_by = u.id
      LEFT JOIN robots r ON ac.robot_id = r.bot_id
      LEFT JOIN device_activations da ON ac.id = da.activation_code_id
      ${whereClause}
      ORDER BY ac.created_at DESC
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
    console.error("获取激活码列表错误:", error);
    return NextResponse.json(
      { success: false, error: "获取激活码列表失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 创建激活码
 * POST /api/activation-codes
 *
 * 支持两种模式：
 * 1. 管理员预配置机器人后生成激活码（type=admin_dispatch）
 * 2. 纯激活码激活时自动创建机器人（type=pure_code）
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    // 只有管理员可以创建激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createActivationCodeSchema.parse(body);

    console.log('创建激活码请求:', validatedData);

    // 模式A：如果选择了绑定机器人，验证机器人是否存在且未被绑定
    if (validatedData.robotId) {
      // 检查机器人是否存在（使用 bot_id 字段）
      const robotResult = await client.query(
        `SELECT bot_id, created_by FROM robots WHERE bot_id = $1`,
        [validatedData.robotId]
      );

      if (robotResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "指定的机器人不存在" },
          { status: 400 }
        );
      }

      // 检查机器人是否已被其他激活码绑定
      const existingBind = await client.query(
        `SELECT id FROM activation_codes WHERE robot_id = $1 AND status != 'expired'`,
        [validatedData.robotId]
      );

      if (existingBind.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: "该机器人已被其他激活码绑定" },
          { status: 400 }
        );
      }
    }

    // 生成8位随机激活码（大写字母+数字）
    const code = Array.from({ length: 8 }, () =>
      Math.random() < 0.5
        ? String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
        : String.fromCharCode(48 + Math.floor(Math.random() * 10))  // 0-9
    ).join('').toUpperCase();

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validatedData.validityPeriod);

    // 插入激活码（使用实际存在的字段）
    const newCodeResult = await client.query(
      `INSERT INTO activation_codes (
        code, status, type, max_uses, used_count,
        remark, created_by, expires_at, robot_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        code,
        'unused', // 状态：unused（未使用）
        validatedData.type,
        validatedData.maxUses,
        0, // 已使用次数
        validatedData.notes || null, // 使用 remark 字段存储 notes
        user.userId,
        expiresAt.toISOString(),
        validatedData.robotId || null,
      ]
    );

    const newCode = newCodeResult.rows[0];

    console.log('激活码创建成功:', newCode);

    return NextResponse.json({
      success: true,
      data: newCode,
      message: validatedData.robotId
        ? "激活码创建成功，已绑定机器人"
        : "激活码创建成功，激活时将自动创建机器人",
    });
  } catch (error: any) {
    console.error("创建激活码错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "创建激活码失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
