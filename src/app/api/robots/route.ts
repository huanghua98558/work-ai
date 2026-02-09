// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { cache } from "@/lib/memory-cache";

/**
 * 绑定机器人验证 Schema
 */
const bindRobotSchema = z.object({
  // 激活码（可选）
  activationCode: z.string().optional(),
  // 机器人ID（可选）
  robotId: z.string().optional(),
  // 用户自定义名称（可选）
  name: z.string().max(100).optional(),
  // 描述（可选）
  description: z.string().optional(),
}).refine(
  (data) => data.activationCode || data.robotId,
  { message: "必须提供激活码或机器人ID" }
).refine(
  (data) => !(data.activationCode && data.robotId),
  { message: "只能提供激活码或机器人ID之一" }
);

/**
 * 获取用户的机器人列表
 * GET /api/robots
 *
 * 优化：
 * 1. 使用窗口函数一次查询获取数据和总数
 * 2. 使用内存缓存（5分钟）
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const status = searchParams.get("status");

    // 生成缓存键
    const cacheKey = `robots:user:${user.userId}:page:${page}:limit:${limit}:status:${status || 'all'}`;

    // 使用缓存（5分钟）
    const cachedData = await cache(cacheKey, async () => {
      const poolInstance = await getPool();
      const client = await poolInstance.connect();

      try {
        // 构建查询条件
        const conditions: string[] = ["ur.user_id = $1"];
        const params: any[] = [user.userId];
        let paramIndex = 2;

        if (status) {
          conditions.push(`r.status = $${paramIndex++}`);
          params.push(status);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        // 使用窗口函数一次查询获取数据和总数
        const query = `
          SELECT
            r.*,
            ur.nickname as user_nickname,
            ur.created_at as bound_at,
            COUNT(*) OVER() as total_count
          FROM robots r
          JOIN user_robots ur ON r.bot_id = ur.robot_id
          ${whereClause}
          ORDER BY ur.created_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        params.push(limit, offset);
        const result = await client.query(query);

        // 从第一条记录获取总数
        const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        // 移除 total_count 字段
        const data = result.rows.map((row: any) => {
          const { total_count, ...rest } = row;
          return rest;
        });

        return {
          data,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      } finally {
        client.release();
      }
    }, 5 * 60 * 1000); // 5分钟缓存

    return NextResponse.json({
      success: true,
      data: cachedData.data,
      pagination: cachedData.pagination,
    });
  } catch (error: any) {
    console.error("获取机器人列表错误:", error);

    if (error.message && error.message.includes("未授权")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "获取机器人列表失败", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * 绑定机器人到用户账户
 * POST /api/robots
 *
 * 用户可以通过激活码或机器人ID绑定机器人到自己的账户
 * 二选一，激活码或机器人ID
 */
export async function POST(request: NextRequest) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    const body = await request.json();
    const validatedData = bindRobotSchema.parse(body);

    console.log('绑定机器人请求:', {
      userId: user.userId,
      activationCode: validatedData.activationCode,
      robotId: validatedData.robotId,
      name: validatedData.name,
    });

    let robotId = null;

    // 模式1：通过激活码绑定
    if (validatedData.activationCode) {
      const codeResult = await client.query(
        `SELECT * FROM activation_codes
         WHERE code = $1
         LIMIT 1`,
        [validatedData.activationCode.toUpperCase()]
      );

      if (codeResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "激活码不存在" },
          { status: 404 }
        );
      }

      const code = codeResult.rows[0];

      if (!code.robot_id) {
        return NextResponse.json(
          { success: false, error: "激活码未绑定机器人" },
          { status: 400 }
        );
      }

      robotId = code.robot_id;
    } else if (validatedData.robotId) {
      // 模式2：通过机器人ID绑定
      const robotResult = await client.query(
        `SELECT * FROM robots WHERE bot_id = $1 LIMIT 1`,
        [validatedData.robotId]
      );

      if (robotResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "指定的机器人不存在" },
          { status: 404 }
        );
      }

      robotId = validatedData.robotId;
    }

    if (!robotId) {
      return NextResponse.json(
        { success: false, error: "无法确定机器人ID" },
        { status: 500 }
      );
    }

    // 获取机器人信息
    const robotResult = await client.query(
      `SELECT * FROM robots WHERE bot_id = $1`,
      [robotId]
    );

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "机器人不存在" },
        { status: 404 }
      );
    }

    const robot = robotResult.rows[0];

    // 检查用户是否已绑定该机器人
    const existingBinding = await client.query(
      `SELECT * FROM user_robots WHERE user_id = $1 AND robot_id = $2`,
      [user.userId, robot.bot_id]
    );

    if (existingBinding.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "您已绑定该机器人" },
        { status: 400 }
      );
    }

    // 绑定机器人到用户
    const now = new Date();
    await client.query(
      `INSERT INTO user_robots (user_id, robot_id, nickname, created_at)
       VALUES ($1, $2, $3, $4)`,
      [
        user.userId,
        robot.bot_id,
        validatedData.name || robot.name, // 使用自定义名称或机器人原始名称
        now.toISOString(),
      ]
    );

    // 创建激活记录（记录绑定行为）
    await client.query(
      `INSERT INTO activation_records (user_id, robot_id, activated_at, activated_by, source)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.userId, robot.bot_id, now.toISOString(), user.userId, 'web']
    );

    return NextResponse.json({
      success: true,
      data: {
        robotId: robot.bot_id,
        name: robot.name,
        nickname: validatedData.name || robot.name,
        status: robot.status,
        description: robot.description,
        message: "绑定机器人成功",
      },
    });
  } catch (error: any) {
    console.error("绑定机器人错误:", error);

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

    return NextResponse.json(
      { success: false, error: "绑定机器人失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 更新机器人信息
 * PUT /api/robots/:id
 */
export async function PUT(request: NextRequest) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get("id");

    if (!robotId) {
      return NextResponse.json(
        { success: false, error: "缺少机器人ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, nickname } = body;

    // 检查用户是否绑定了该机器人
    const binding = await client.query(
      `SELECT * FROM user_robots WHERE user_id = $1 AND robot_id = $2`,
      [user.userId, robotId]
    );

    if (binding.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "您未绑定该机器人" },
        { status: 403 }
      );
    }

    // 更新机器人信息（只有管理员可以更新机器人本身的名称和描述）
    // 普通用户只能更新自己的昵称
    if (user.role === 'admin') {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(name);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description);
      }

      if (updates.length > 0) {
        params.push(new Date().toISOString(), robotId);
        await client.query(
          `UPDATE robots SET ${updates.join(', ')}, updated_at = $${paramIndex++} WHERE bot_id = $${paramIndex}`,
          params
        );
      }
    }

    // 更新用户的昵称
    if (nickname !== undefined) {
      await client.query(
        `UPDATE user_robots SET nickname = $1 WHERE user_id = $2 AND robot_id = $3`,
        [nickname, user.userId, robotId]
      );
    }

    return NextResponse.json({
      success: true,
      message: "更新成功",
    });
  } catch (error: any) {
    console.error("更新机器人错误:", error);

    if (error.message && error.message.includes("未授权")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "更新机器人失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 解绑机器人
 * DELETE /api/robots/:id
 */
export async function DELETE(request: NextRequest) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get("id");

    if (!robotId) {
      return NextResponse.json(
        { success: false, error: "缺少机器人ID" },
        { status: 400 }
      );
    }

    // 检查用户是否绑定了该机器人
    const binding = await client.query(
      `SELECT * FROM user_robots WHERE user_id = $1 AND robot_id = $2`,
      [user.userId, robotId]
    );

    if (binding.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "您未绑定该机器人" },
        { status: 403 }
      );
    }

    // 解绑机器人
    await client.query(
      `DELETE FROM user_robots WHERE user_id = $1 AND robot_id = $2`,
      [user.userId, robotId]
    );

    return NextResponse.json({
      success: true,
      message: "解绑成功",
    });
  } catch (error: any) {
    console.error("解绑机器人错误:", error);

    if (error.message && error.message.includes("未授权")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "解绑机器人失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
