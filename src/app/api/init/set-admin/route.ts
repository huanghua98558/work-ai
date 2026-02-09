// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * 初始化管理员（仅用于首次设置管理员）
 * POST /api/init/set-admin
 *
 * 注意：此接口仅用于初始化第一个管理员，之后会禁用
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: "缺少 phone 或 password 参数" },
        { status: 400 }
      );
    }

    // 检查是否已有管理员
    const adminResult = await client.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'admin'`,
      []
    );

    const adminCount = parseInt(adminResult.rows[0].count);

    if (adminCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "系统已有管理员，请使用 /api/admin/set-admin 接口设置新管理员",
        },
        { status: 403 }
      );
    }

    // 查找用户
    const userResult = await client.query(
      `SELECT id, phone, role FROM users WHERE phone = $1`,
      [phone]
    );

    if (userResult.rows.length === 0) {
      // 用户不存在，创建新用户
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      const insertResult = await client.query(
        `INSERT INTO users (phone, password_hash, role, nickname)
         VALUES ($1, $2, 'admin', $3)
         RETURNING id, phone, nickname, role`,
        [phone, passwordHash, phone]
      );

      return NextResponse.json({
        success: true,
        message: "管理员初始化成功",
        data: {
          user: insertResult.rows[0],
          isInitial: true,
        },
      });
    }

    const user = userResult.rows[0];

    // 更新为管理员
    await client.query(
      `UPDATE users SET role = 'admin' WHERE id = $1`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      message: "用户已设置为管理员",
      data: {
        user: { ...user, role: 'admin' },
        isInitial: false,
      },
    });
  } catch (error: any) {
    console.error("初始化管理员错误:", error);

    return NextResponse.json(
      { success: false, error: "初始化失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
