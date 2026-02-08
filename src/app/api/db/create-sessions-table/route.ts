// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * 创建 sessions 表
 * 用于管理对话会话
 */
export async function POST() {
  try {
    const pool = await getPool();
    const client = await pool.connect();

    try {
      // 创建 sessions 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL UNIQUE,
          robot_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          metadata JSONB,
          message_count INTEGER DEFAULT 0,
          last_message_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 创建索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sessions_robot_id ON sessions(robot_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC)
      `);

      // 创建更新时间触发器
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions
      `);

      await client.query(`
        CREATE TRIGGER update_sessions_updated_at
        BEFORE UPDATE ON sessions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `);

      return NextResponse.json({
        success: true,
        message: "sessions 表创建成功",
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("创建sessions表失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建sessions表失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
