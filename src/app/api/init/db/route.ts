// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * 初始化数据库表
 * POST /api/init/db
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const results: any[] = [];

    // 创建 device_bindings 表（设备绑定表）
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS device_bindings (
          id SERIAL PRIMARY KEY,
          robot_id VARCHAR(50) NOT NULL UNIQUE,
          device_id VARCHAR(100) NOT NULL,
          device_info JSONB,
          bound_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push({ action: 'create_table', table: 'device_bindings', status: 'success' });
    } catch (error: any) {
      results.push({ action: 'create_table', table: 'device_bindings', status: 'error', message: error.message });
    }

    // 创建 device_tokens 表（设备token表）
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS device_tokens (
          id SERIAL PRIMARY KEY,
          robot_id VARCHAR(50) NOT NULL,
          device_id VARCHAR(100) NOT NULL,
          access_token VARCHAR(255) NOT NULL,
          refresh_token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push({ action: 'create_table', table: 'device_tokens', status: 'success' });
    } catch (error: any) {
      results.push({ action: 'create_table', table: 'device_tokens', status: 'error', message: error.message });
    }

    // 创建索引
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_device_bindings_robot_id ON device_bindings(robot_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_device_bindings_device_id ON device_bindings(device_id)`);
      results.push({ action: 'create_index', index: 'device_bindings indexes', status: 'success' });
    } catch (error: any) {
      results.push({ action: 'create_index', index: 'device_bindings indexes', status: 'error', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_device_tokens_robot_id ON device_tokens(robot_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_device_tokens_access_token ON device_tokens(access_token)`);
      results.push({ action: 'create_index', index: 'device_tokens indexes', status: 'success' });
    } catch (error: any) {
      results.push({ action: 'create_index', index: 'device_tokens indexes', status: 'error', message: error.message });
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
