// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";
import { randomBytes } from "crypto";

/**
 * 创建激活码验证 Schema
 */
const createActivationCodeSchema = z.object({
  // 激活码有效期（天）
  validityPeriod: z.number().int().positive().default(365),
  // 备注
  notes: z.string().optional(),
  // 批量生成数量（默认1）
  batchCount: z.number().int().positive().max(100).default(1),
  // 最大使用次数（默认1）
  maxUses: z.number().int().positive().default(1),
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
 * 获取激活码列表
 * GET /api/activation-codes
 */
export async function GET(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`ac.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // 查询激活码总数
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM activation_codes ac ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 查询激活码列表（关联机器人、设备绑定、用户绑定信息）
    const query = `
      SELECT
        ac.*,
        u.nickname as creator_name,
        r.name as robot_name,
        r.status as robot_status,
        r.bot_id as robot_id,
        r.created_at as robot_created_at,
        -- 设备绑定信息
        db.device_id as bound_device_id,
        db.device_info,
        db.bound_at as device_bound_at,
        -- 用户绑定信息
        ur.user_id as bound_user_id,
        ur.nickname as user_nickname,
        ur.created_at as user_bound_at
      FROM activation_codes ac
      LEFT JOIN users u ON ac.created_by = u.id
      LEFT JOIN robots r ON ac.robot_id = r.bot_id
      LEFT JOIN device_bindings db ON r.bot_id = db.robot_id
      LEFT JOIN user_robots ur ON r.bot_id = ur.robot_id
      ${whereClause}
      ORDER BY ac.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    const result = await client.query(query, params);

    // 格式化返回数据
    const formattedData = result.rows.map((row: any) => ({
      ...row,
      isActivated: !!row.bound_device_id, // 是否已激活（绑定了设备）
      isBound: !!row.bound_user_id,       // 是否已绑定用户
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("获取激活码列表错误:", error);

    if (error.message && error.message.includes("未授权")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

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
 * 生成激活码时，同时创建机器人
 * 返回：激活码 + 机器人ID
 */
export async function POST(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
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

    // 批量生成数量
    const batchCount = validatedData.batchCount || 1;

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validatedData.validityPeriod);

    // 批量生成激活码
    const createdCodes: any[] = [];

    for (let i = 0; i < batchCount; i++) {
      // 生成激活码
      const code = generateActivationCode();

      // 生成机器人ID
      const botId = generateBotId();

      // 创建机器人
      const now = new Date();
      const robotResult = await client.query(
        `INSERT INTO robots (
          bot_id, name, description, status, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          botId,
          '新机器人', // 默认名称
          '通过激活码创建',
          'offline',
          user.userId,
          now.toISOString(),
          now.toISOString(),
        ]
      );

      const robot = robotResult.rows[0];

      // 插入激活码（绑定到机器人）
      const newCodeResult = await client.query(
        `INSERT INTO activation_codes (
          code, status, max_uses, used_count,
          remark, created_by, expires_at, robot_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          code,
          'unused', // 状态：unused（未使用）
          validatedData.maxUses,
          0, // 已使用次数
          validatedData.notes || null,
          user.userId,
          expiresAt.toISOString(),
          botId, // 绑定到机器人
        ]
      );

      createdCodes.push({
        ...newCodeResult.rows[0],
        robotId: botId,
        robotName: robot.name,
        isActivated: false, // 初始未激活
        isBound: false,     // 初始未绑定
      });
    }

    console.log('激活码创建成功:', createdCodes.length, '个');

    return NextResponse.json({
      success: true,
      data: createdCodes,
      message: `成功创建 ${createdCodes.length} 个激活码`,
    });
  } catch (error: any) {
    console.error("创建激活码错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    if (error.message && error.message.includes("未授权")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    if (error.message && error.message.includes("权限不足")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
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
