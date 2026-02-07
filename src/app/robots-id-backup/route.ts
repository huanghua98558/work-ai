import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const updateRobotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["active", "inactive", "deleted"]).optional(),
  description: z.string().optional(),
  bot_type: z.string().max(20).optional(),
  app_id: z.string().optional(),
  app_secret: z.string().optional(),
  bot_token: z.string().optional(),
  bot_secret: z.string().optional(),
  encrypt_key: z.string().optional(),
  verification_token: z.string().optional(),
});

// 获取机器人详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;
    const robotId = parseInt(id);

    const db = await getDatabase();

    const robotResult = await db.execute(sql`
      SELECT * FROM robots 
      WHERE id = ${robotId} AND created_by = ${user.userId}
      LIMIT 1
    `);

    if (robotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "机器人不存在" },
        { status: 404 }
      );
    }

    const robot = robotResult.rows[0];

    return NextResponse.json({
      success: true,
      data: robot,
    });
  } catch (error: any) {
    console.error("获取机器人详情错误:", error);
    return NextResponse.json(
      { success: false, error: "获取机器人详情失败", details: error.message },
      { status: 500 }
    );
  }
}

// 更新机器人配置
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;
    const robotId = parseInt(id);

    const db = await getDatabase();

    // 检查机器人是否属于当前用户
    const existingRobotResult = await db.execute(sql`
      SELECT * FROM robots 
      WHERE id = ${robotId} AND created_by = ${user.userId}
      LIMIT 1
    `);

    if (existingRobotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "机器人不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateRobotSchema.parse(body);

    // 构建 SET 子句
    const setClauses = [];
    const values = [];

    if (validatedData.name !== undefined) {
      setClauses.push(`name = $${values.length + 1}`);
      values.push(validatedData.name);
    }
    if (validatedData.status !== undefined) {
      setClauses.push(`status = $${values.length + 1}`);
      values.push(validatedData.status);
    }
    if (validatedData.description !== undefined) {
      setClauses.push(`description = $${values.length + 1}`);
      values.push(validatedData.description);
    }
    if (validatedData.bot_type !== undefined) {
      setClauses.push(`bot_type = $${values.length + 1}`);
      values.push(validatedData.bot_type);
    }
    if (validatedData.app_id !== undefined) {
      setClauses.push(`app_id = $${values.length + 1}`);
      values.push(validatedData.app_id);
    }
    if (validatedData.app_secret !== undefined) {
      setClauses.push(`app_secret = $${values.length + 1}`);
      values.push(validatedData.app_secret);
    }
    if (validatedData.bot_token !== undefined) {
      setClauses.push(`bot_token = $${values.length + 1}`);
      values.push(validatedData.bot_token);
    }
    if (validatedData.bot_secret !== undefined) {
      setClauses.push(`bot_secret = $${values.length + 1}`);
      values.push(validatedData.bot_secret);
    }
    if (validatedData.encrypt_key !== undefined) {
      setClauses.push(`encrypt_key = $${values.length + 1}`);
      values.push(validatedData.encrypt_key);
    }
    if (validatedData.verification_token !== undefined) {
      setClauses.push(`verification_token = $${values.length + 1}`);
      values.push(validatedData.verification_token);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有提供更新字段" },
        { status: 400 }
      );
    }

    setClauses.push(`updated_at = NOW()`);

    const updateQuery = sql`
      UPDATE robots 
      SET ${sql.raw(setClauses.join(", "))}
      WHERE id = ${robotId}
      RETURNING *
    `;

    const updatedRobotResult = await db.execute(updateQuery);

    return NextResponse.json({
      success: true,
      data: updatedRobotResult.rows[0],
    });
  } catch (error: any) {
    console.error("更新机器人错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "更新机器人失败", details: error.message },
      { status: 500 }
    );
  }
}

// 删除机器人
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;
    const robotId = parseInt(id);

    const db = await getDatabase();

    // 检查机器人是否属于当前用户
    const existingRobotResult = await db.execute(sql`
      SELECT * FROM robots 
      WHERE id = ${robotId} AND created_by = ${user.userId}
      LIMIT 1
    `);

    if (existingRobotResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "机器人不存在" },
        { status: 404 }
      );
    }

    // 软删除机器人
    const deletedRobotResult = await db.execute(sql`
      UPDATE robots 
      SET status = 'deleted', updated_at = NOW()
      WHERE id = ${robotId}
      RETURNING *
    `);

    return NextResponse.json({
      success: true,
      data: { message: "删除成功" },
    });
  } catch (error: any) {
    console.error("删除机器人错误:", error);
    return NextResponse.json(
      { success: false, error: "删除机器人失败", details: error.message },
      { status: 500 }
    );
  }
}
