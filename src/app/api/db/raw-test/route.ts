// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET() {
  try {
    // 获取数据库实例（异步）
    const db = await getDatabase();

    // 执行原始 SQL 查询
    const result = await db.execute(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);

    return NextResponse.json({
      success: true,
      data: {
        message: "数据库查询成功",
        tables: result,
      },
    });
  } catch (error: any) {
    console.error("原始测试错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "原始测试失败",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
