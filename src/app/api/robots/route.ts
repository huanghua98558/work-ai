import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { robots } from "@/storage/database/shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { nanoid } from "nanoid";

const createRobotSchema = z.object({
  name: z.string().min(1).max(100),
  aiMode: z.enum(["builtin", "third_party"]).default("third_party"),
  aiProvider: z.string().max(50),
  aiModel: z.string().max(100),
  aiApiKey: z.string(),
  aiTemperature: z.string().or(z.number()).transform(String).default("0.7"),
  aiMaxTokens: z.number().int().default(2000),
  aiContextLength: z.number().int().default(10),
  aiScenario: z.string().max(50),
  thirdPartyCallbackUrl: z.string().url().optional().or(z.literal("")),
  thirdPartyResultCallbackUrl: z.string().url().optional().or(z.literal("")),
  thirdPartySecretKey: z.string().optional(),
});

// 获取机器列表
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereConditions = [eq(robots.userId, user.userId)];

    if (status) {
      whereConditions.push(eq(robots.status, status));
    }

    const robotList = await db
      .select()
      .from(robots)
      .where(and(...whereConditions))
      .orderBy(desc(robots.createdAt));

    return NextResponse.json({
      success: true,
      data: robotList,
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

    // 生成机器人ID和UUID
    const robotId = `robot_${nanoid(16).toLowerCase()}`;
    const robotUuid = nanoid(32);

    const [newRobot] = await db
      .insert(robots)
      .values({
        robotId,
        robotUuid,
        userId: user.userId,
        name: validatedData.name,
        status: "offline",
        aiMode: validatedData.aiMode,
        aiProvider: validatedData.aiProvider || "custom",
        aiModel: validatedData.aiModel,
        aiApiKey: validatedData.aiApiKey,
        aiTemperature: validatedData.aiTemperature,
        aiMaxTokens: validatedData.aiMaxTokens,
        aiContextLength: validatedData.aiContextLength,
        aiScenario: validatedData.aiScenario,
        thirdPartyCallbackUrl: validatedData.thirdPartyCallbackUrl || null,
        thirdPartyResultCallbackUrl: validatedData.thirdPartyResultCallbackUrl || null,
        thirdPartySecretKey: validatedData.thirdPartySecretKey || null,
      })
      .returning();

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
