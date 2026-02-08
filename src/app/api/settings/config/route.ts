// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase, checkDatabaseHealth } from "@/lib/db";

export async function GET() {
  try {
    // 检查数据库连接
    const dbHealth = await checkDatabaseHealth();

    // 获取环境变量配置
    const hasJwtSecret = !!process.env.JWT_SECRET;

    const config = {
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: {
        host: process.env.PGDATABASE_HOST || 'localhost',
        port: parseInt(process.env.PGDATABASE_PORT || '5432'),
        database: process.env.PGDATABASE_NAME || 'workbot',
        status: dbHealth.healthy ? 'connected' : 'error',
      },
      websocket: {
        enabled: true,
        port: 5000,
        status: 'running', // 简化处理，实际应该检查 WebSocket 服务状态
      },
      features: {
        knowledgeBase: true,
        fileUpload: true,
        realtimeChat: true,
        logManagement: true,
      },
      security: {
        jwtConfigured: hasJwtSecret,
        bcryptRounds: 10,
        sessionTimeout: 86400, // 24小时
      },
    };

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "获取配置失败", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 这里可以实现配置的保存逻辑
    // 注意：环境变量通常在部署时配置，不支持运行时修改

    return NextResponse.json({
      success: true,
      message: "配置已保存（模拟）",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "保存配置失败", details: error.message },
      { status: 500 }
    );
  }
}
