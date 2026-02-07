import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDatabase();

    const result = await db.execute(sql`
      SELECT * FROM sms_verification_codes
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      data: {
        codes: result.rows,
        count: result.rows.length,
      },
    });
  } catch (error: any) {
    console.error("查询验证码错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "查询验证码失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
