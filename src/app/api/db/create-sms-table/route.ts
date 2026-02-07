import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDatabase();

    // 创建短信验证码表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sms_verification_codes (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(10) NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'login',
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        used_at TIMESTAMP
      )
    `);

    // 创建索引
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_verification_codes(phone)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_verification_codes(expires_at)
    `);

    return NextResponse.json({
      success: true,
      data: {
        message: "短信验证码表创建成功",
      },
    });
  } catch (error: any) {
    console.error("创建短信验证码表错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建短信验证码表失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
