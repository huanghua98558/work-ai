// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

/**
 * 诊断 API
 * GET /api/diagnose
 *
 * 检查环境变量和数据库连接状态
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasPgDatabaseUrl: !!process.env.PGDATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
    },
    database: {
      status: 'unknown',
      error: null as string | null,
    },
  };

  // 测试数据库连接
  try {
    // 动态导入避免构建时执行
    const { pool } = await import('@/lib/db');
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time');
      diagnostics.database = {
        status: 'connected',
        error: null,
        serverTime: result.rows[0].current_time,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    diagnostics.database = {
      status: 'failed',
      error: error.message,
    };
  }

  return NextResponse.json({
    success: true,
    data: diagnostics,
  });
}
