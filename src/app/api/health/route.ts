import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { users } from "@/storage/database/shared/schema";

export async function GET() {
  try {
    // 获取数据库实例（异步）
    const db = await getDatabase();

    // 测试数据库连接 - 查询用户表
    const result = await db.select().from(users).limit(1);

    return NextResponse.json({
      success: true,
      data: {
        message: "数据库连接成功",
        userCount: result.length,
      },
    });
  } catch (error: any) {
    console.error("健康检查错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "健康检查失败",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
