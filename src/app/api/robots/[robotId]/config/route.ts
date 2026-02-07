import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const configSchema = z.object({
  systemPrompt: z.string().optional(),
  enableKnowledgeBase: z.boolean().optional(),
  knowledgeDataset: z.string().optional(),
  enableStreamResponse: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/**
 * 获取机器人配置
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ robotId: string }> }
) {
  try {
    const { robotId } = await params;

    const db = await getDatabase();

    const result = await db.execute(sql`
      SELECT config FROM device_activations
      WHERE robot_id = ${robotId}
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "机器人不存在",
          code: "ROBOT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const config = result.rows[0].config || {};

    return NextResponse.json({
      success: true,
      data: {
        config,
      },
    });
  } catch (error: any) {
    console.error("获取机器人配置错误:", error);

    return NextResponse.json(
      {
        success: false,
        error: "获取机器人配置失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * 更新机器人配置
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ robotId: string }> }
) {
  try {
    const { robotId } = await params;
    const body = await request.json();
    const validatedData = configSchema.parse(body);

    const db = await getDatabase();

    // 获取当前配置
    const currentResult = await db.execute(sql`
      SELECT config FROM device_activations
      WHERE robot_id = ${robotId}
      LIMIT 1
    `);

    if (currentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "机器人不存在",
          code: "ROBOT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const currentConfig = currentResult.rows[0].config || {};
    const newConfig = { ...currentConfig, ...validatedData };

    // 更新配置
    await db.execute(sql`
      UPDATE device_activations
      SET config = ${JSON.stringify(newConfig)}, updated_at = NOW()
      WHERE robot_id = ${robotId}
    `);

    return NextResponse.json({
      success: true,
      data: {
        config: newConfig,
        message: "机器人配置更新成功",
      },
    });
  } catch (error: any) {
    console.error("更新机器人配置错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "请求参数错误",
          details: error.errors,
          code: "INVALID_PARAMS",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "更新机器人配置失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
