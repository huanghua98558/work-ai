// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDatabase();

    // 清理所有验证码记录
    const result = await db.execute(sql`
      DELETE FROM sms_verification_codes
      RETURNING id
    `);

    return NextResponse.json({
      success: true,
      data: {
        message: `清理了 ${result.rowCount || 0} 条验证码记录`,
      },
    });
  } catch (error: any) {
    console.error("清理验证码错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "清理验证码失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
