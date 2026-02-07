import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

// 启停机器人
export async function POST(
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

    const robot = existingRobotResult.rows[0];

    // 切换机器人状态
    const newStatus = robot.status === "active" ? "inactive" : "active";
    const now = new Date().toISOString();

    const updatedRobotResult = await db.execute(sql`
      UPDATE robots 
      SET 
        status = ${newStatus},
        last_active_at = ${newStatus === 'active' ? now : robot.last_active_at},
        updated_at = ${now}
      WHERE id = ${robotId}
      RETURNING *
    `);

    const updatedRobot = updatedRobotResult.rows[0];

    return NextResponse.json({
      success: true,
      data: updatedRobot,
      message: newStatus === "active" ? "机器人已启动" : "机器人已停止",
    });
  } catch (error: any) {
    console.error("启停机器人错误:", error);
    return NextResponse.json(
      { success: false, error: "启停机器人失败", details: error.message },
      { status: 500 }
    );
  }
}
