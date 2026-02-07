import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, robots } from "@/storage/database/shared/schema";

export async function GET() {
  try {
    // 尝试查询用户表
    const userList = await db.select().from(users);
    const robotList = await db.select().from(robots);

    return NextResponse.json({
      success: true,
      data: {
        usersCount: userList.length,
        robotsCount: robotList.length,
        message: "数据库连接成功",
      },
    });
  } catch (error: any) {
    console.error("数据库连接错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
