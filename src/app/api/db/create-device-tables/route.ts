import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDatabase();

    // 创建设备激活记录表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS device_activations (
        id SERIAL PRIMARY KEY,
        robot_id VARCHAR(100) NOT NULL UNIQUE,
        robot_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        activation_code_id INTEGER REFERENCES activation_codes(id),
        device_id VARCHAR(200) NOT NULL,
        device_info JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_active_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 创建设备解绑历史表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS device_unbindings (
        id SERIAL PRIMARY KEY,
        robot_id VARCHAR(100) NOT NULL,
        activation_code_id INTEGER REFERENCES activation_codes(id),
        old_device_id VARCHAR(200) NOT NULL,
        reason TEXT,
        unbound_by INTEGER REFERENCES users(id),
        unbound_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 创建索引
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_device_activations_device_id ON device_activations(device_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_device_activations_robot_id ON device_activations(robot_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_device_activations_code_id ON device_activations(activation_code_id)
    `);

    return NextResponse.json({
      success: true,
      data: {
        message: "设备激活表创建成功",
      },
    });
  } catch (error: any) {
    console.error("创建设备激活表错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建设备激活表失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
