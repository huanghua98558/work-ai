// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * 初始化数据库表
 * POST /api/init/db
 *
 * 创建必要的数据库表和字段
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const results: any[] = [];

    // 创建 user_robots 表
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_robots (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          robot_id VARCHAR(50) NOT NULL,
          nickname VARCHAR(100),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, robot_id)
        )
      `);
      results.push({ action: 'create_table', table: 'user_robots', status: 'success' });
    } catch (error: any) {
      results.push({ action: 'create_table', table: 'user_robots', status: 'error', message: error.message });
    }

    // 创建索引
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_user_robots_user_id ON user_robots(user_id)`);
      results.push({ action: 'create_index', index: 'idx_user_robots_user_id', status: 'success' });
    } catch (error: any) {
      results.push({ action: 'create_index', index: 'idx_user_robots_user_id', status: 'error', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_user_robots_robot_id ON user_robots(robot_id)`);
      results.push({ action: 'create_index', index: 'idx_user_robots_robot_id', status: 'success' });
    } catch (error: any) {
      results.push({ action: 'create_index', index: 'idx_user_robots_robot_id', status: 'error', message: error.message });
    }

    // 更新 activation_records 表
    try {
      await client.query(`ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS robot_id VARCHAR(50)`);
      results.push({ action: 'add_column', table: 'activation_records', column: 'robot_id', status: 'success' });
    } catch (error: any) {
      results.push({ action: 'add_column', table: 'activation_records', column: 'robot_id', status: 'error', message: error.message });
    }

    try {
      await client.query(`ALTER TABLE activation_records ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'unknown'`);
      results.push({ action: 'add_column', table: 'activation_records', column: 'source', status: 'success' });
    } catch (error: any) {
      results.push({ action: 'add_column', table: 'activation_records', column: 'source', status: 'error', message: error.message });
    }

    return NextResponse.json({
      success: true,
      message: '数据库初始化完成',
      results,
    });
  } catch (error: any) {
    console.error("数据库初始化错误:", error);
    return NextResponse.json(
      { success: false, error: "数据库初始化失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
