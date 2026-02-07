import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { nanoid } from "nanoid";

const createRobotSchema = z.object({
  name: z.string().min(1).max(100),
  bot_type: z.string().max(20).optional(),
  app_id: z.string().optional(),
  app_secret: z.string().optional(),
  description: z.string().optional(),
});

// 获取机器列表
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const db = await getDatabase();

    let robotList;
    if (status) {
      robotList = await db.execute(sql`
        SELECT * FROM robots 
        WHERE created_by = ${user.userId} AND status = ${status}
        ORDER BY created_at DESC
      `);
    } else {
      robotList = await db.execute(sql`
        SELECT * FROM robots 
        WHERE created_by = ${user.userId}
        ORDER BY created_at DESC
      `);
    }

    return NextResponse.json({
      success: true,
      data: robotList.rows,
    });
  } catch (error: any) {
    console.error("获取机器列表错误:", error);
    return NextResponse.json(
      { success: false, error: "获取机器列表失败", details: error.message },
      { status: 500 }
    );
  }
}

// 创建机器人
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const body = await request.json();
    const validatedData = createRobotSchema.parse(body);

    const db = await getDatabase();

    // 生成机器人ID
    const botId = `bot_${nanoid(16).toLowerCase()}`;

    const newRobotResult = await db.execute(sql`
      INSERT INTO robots (name, description, bot_id, bot_type, app_id, app_secret, status, created_by)
      VALUES (
        ${validatedData.name}, 
        ${validatedData.description || null}, 
        ${botId},
        ${validatedData.bot_type || 'feishu'},
        ${validatedData.app_id || null},
        ${validatedData.app_secret || null},
        'active',
        ${user.userId}
      )
      RETURNING *
    `);

    const newRobot = newRobotResult.rows[0];

    return NextResponse.json({
      success: true,
      data: newRobot,
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
  }
}
