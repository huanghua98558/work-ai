// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDatabase();

    // 重建短信验证码表（使用TIMESTAMP WITH TIME ZONE）
    await db.execute(sql`
      DROP TABLE IF EXISTS sms_verification_codes
    `);

    await db.execute(sql`
      CREATE TABLE sms_verification_codes (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(10) NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'login',
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        ip_address VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 创建索引
    await db.execute(sql`
      CREATE INDEX idx_sms_codes_phone ON sms_verification_codes(phone)
    `);

    await db.execute(sql`
      CREATE INDEX idx_sms_codes_expires ON sms_verification_codes(expires_at)
    `);

    return NextResponse.json({
      success: true,
      data: {
        message: "短信验证码表已重建（使用TIMESTAMP WITH TIME ZONE）",
      },
    });
  } catch (error: any) {
    console.error("重建短信验证码表错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "重建短信验证码表失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
