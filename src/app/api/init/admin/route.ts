// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * 初始化默认管理员账户
 * POST /api/init/admin
 *
 * 在首次部署或重置时使用
 */
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { phone, password, nickname } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 检查用户是否已存在
    const existingUser = await client.query(
      `SELECT id, phone, role, status FROM users WHERE phone = $1`,
      [phone]
    );

    if (existingUser.rows.length > 0) {
      // 如果用户已存在，更新为管理员
      await client.query(
        `UPDATE users SET role = 'admin', status = 'active', nickname = $1 WHERE phone = $2`,
        [nickname || '管理员', phone]
      );
      return NextResponse.json({
        success: true,
        message: "管理员账户已更新",
        data: existingUser.rows[0],
      });
    }

    // 创建新管理员账户（密码暂时存储为明文，生产环境应使用bcrypt）
    const newUserResult = await client.query(
      `INSERT INTO users (phone, nickname, role, status, password_hash)
      VALUES ($1, $2, 'admin', 'active', $3)
      RETURNING id, phone, nickname, role, status, created_at`,
      [phone, nickname || '管理员', password]
    );

    return NextResponse.json({
      success: true,
      message: "管理员账户创建成功",
      data: newUserResult.rows[0],
    });
  } catch (error: any) {
    console.error("初始化管理员账户错误:", error);
    return NextResponse.json(
      { success: false, error: "初始化失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 获取初始化状态
 * GET /api/init/admin
 */
export async function GET(request: Request) {
  const client = await pool.connect();
  try {
    // 检查是否有管理员账户
    const result = await client.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'`
    );

    const hasAdmin = parseInt(result.rows[0].count) > 0;

    return NextResponse.json({
      success: true,
      data: {
        hasAdmin,
        adminCount: parseInt(result.rows[0].count),
      },
    });
  } catch (error: any) {
    console.error("获取初始化状态错误:", error);
    return NextResponse.json(
      { success: false, error: "获取状态失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
