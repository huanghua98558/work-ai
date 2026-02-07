// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  withErrorHandling,
  successResponse,
  validateParams,
  NotFoundError,
} from "@/lib/error-handler";
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
export const GET = withErrorHandling(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ robotId: string }> }
  ) => {
    const { robotId } = await params;

    const db = await getDatabase();

    const result = await db.execute(sql`
      SELECT config FROM device_activations
      WHERE robot_id = ${robotId}
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      throw new NotFoundError('机器人');
    }

    const config = result.rows[0].config || {};

    return successResponse({ config });
  }
);

/**
 * 更新机器人配置
 */
export const PUT = withErrorHandling(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ robotId: string }> }
  ) => {
    const { robotId } = await params;
    const body = await request.json();
    const validatedData = validateParams(configSchema, body);

    const db = await getDatabase();

    // 获取当前配置
    const currentResult = await db.execute(sql`
      SELECT config FROM device_activations
      WHERE robot_id = ${robotId}
      LIMIT 1
    `);

    if (currentResult.rows.length === 0) {
      throw new NotFoundError('机器人');
    }

    const currentConfig = currentResult.rows[0].config || {};
    const newConfig = { ...currentConfig, ...(validatedData as Record<string, any>) };

    // 更新配置
    await db.execute(sql`
      UPDATE device_activations
      SET config = ${JSON.stringify(newConfig)}, updated_at = NOW()
      WHERE robot_id = ${robotId}
    `);

    return successResponse({
      config: newConfig,
      message: "机器人配置更新成功",
    });
  }
);
