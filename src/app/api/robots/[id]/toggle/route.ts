import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { robots } from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

// 启停机器人
export async function POST(
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

    const robot = existingRobots[0];

    // 切换机器人状态
    const newStatus = robot.status === "online" ? "offline" : "online";

    const [updatedRobot] = await db
      .update(robots)
      .set({
        status: newStatus,
        lastActiveAt: newStatus === "online" ? new Date() : robot.lastActiveAt,
        updatedAt: new Date(),
      })
      .where(eq(robots.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedRobot,
      message: newStatus === "online" ? "机器人已启动" : "机器人已停止",
    });
  } catch (error: any) {
    console.error("启停机器人错误:", error);
    return NextResponse.json(
      { success: false, error: "启停机器人失败", details: error.message },
      { status: 500 }
    );
  }
}
