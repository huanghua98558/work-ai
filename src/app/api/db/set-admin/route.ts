// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // 将第一个用户设置为管理员
    const result = await db.execute(sql`
      UPDATE users 
      SET role = 'admin', updated_at = NOW()
      WHERE id = 1
      RETURNING id, phone, nickname, role
    `);

    return NextResponse.json({
      success: true,
      data: {
        message: "用户已设置为管理员",
        user: result.rows[0],
      },
    });
  } catch (error: any) {
    console.error("设置管理员错误:", error);
    return NextResponse.json(
      { success: false, error: "设置管理员失败", details: error.message },
      { status: 500 }
    );
  }
}
