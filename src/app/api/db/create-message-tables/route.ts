// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDatabase();

    // 创建消息表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        robot_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100),
        session_id VARCHAR(100),
        message_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        extra_data JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        direction VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 创建会话表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL UNIQUE,
        robot_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100),
        platform VARCHAR(50),
        platform_user_id VARCHAR(200),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_message_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 创建会话上下文表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS session_contexts (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        context_key VARCHAR(100) NOT NULL,
        context_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(session_id, context_key)
      )
    `);

    // 创建索引
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_robot_id ON messages(robot_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_robot_id ON sessions(robot_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_session_contexts_session_id ON session_contexts(session_id)
    `);

    return NextResponse.json({
      success: true,
      data: {
        message: "消息相关表创建成功",
      },
    });
  } catch (error: any) {
    console.error("创建消息表错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建消息表失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
