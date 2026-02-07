import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { robots } from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const updateRobotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["online", "offline", "deleted"]).optional(),
  aiMode: z.enum(["builtin", "third_party"]).optional(),
  aiProvider: z.string().max(50).optional(),
  aiModel: z.string().max(100).optional(),
  aiApiKey: z.string().optional(),
  aiTemperature: z.string().or(z.number()).transform(String).optional(),
  aiMaxTokens: z.number().int().optional(),
  aiContextLength: z.number().int().optional(),
  aiScenario: z.string().max(50).optional(),
  thirdPartyCallbackUrl: z.string().url().optional().or(z.literal("")),
  thirdPartyResultCallbackUrl: z.string().url().optional().or(z.literal("")),
  thirdPartySecretKey: z.string().optional(),
});

// 获取机器人详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;

    const robotList = await db
      .select()
      .from(robots)
      .where(
        and(
          eq(robots.id, parseInt(id)),
          eq(robots.userId, user.userId)
        )
      );

    if (robotList.length === 0) {
      return NextResponse.json(
        { success: false, error: "机器人不存在" },
        { status: 404 }
      );
    }

    const robot = robotList[0];

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

    // 检查机器人是否属于当前用户
    const existingRobots = await db
      .select()
      .from(robots)
      .where(
        and(
          eq(robots.id, parseInt(id)),
          eq(robots.userId, user.userId)
        )
      );

    if (existingRobots.length === 0) {
      return NextResponse.json(
        { success: false, error: "机器人不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateRobotSchema.parse(body);

    const [updatedRobot] = await db
      .update(robots)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(robots.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedRobot,
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

    // 检查机器人是否属于当前用户
    const existingRobots = await db
      .select()
      .from(robots)
      .where(
        and(
          eq(robots.id, parseInt(id)),
          eq(robots.userId, user.userId)
        )
      );

    if (existingRobots.length === 0) {
      return NextResponse.json(
        { success: false, error: "机器人不存在" },
        { status: 404 }
      );
    }

    // 软删除机器人
    const [deletedRobot] = await db
      .update(robots)
      .set({
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(robots.id, parseInt(id)))
      .returning();

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
