import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDatabase();
    
    // 查询所有表
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    return NextResponse.json({
      success: true,
      data: {
        tables: result.rows,
      },
    });
  } catch (error: any) {
    console.error("查询表错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "查询表失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
