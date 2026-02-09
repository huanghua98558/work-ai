// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * 初始化管理员（仅用于首次设置管理员）
 * POST /api/init/set-admin
 *
 * 注意：此接口仅用于初始化第一个管理员，之后会禁用
 */
export async function POST(request: NextRequest) {
  console.log('[InitAdmin] 开始处理请求');

  let client;
  try {
    // 解析请求体
    let body;
    try {
      body = await request.json();
      console.log('[InitAdmin] 请求体:', { phone: body?.phone, hasPassword: !!body?.password });
    } catch (parseError) {
      console.error('[InitAdmin] 解析请求体失败:', parseError);
      return NextResponse.json(
        { success: false, error: "请求体格式错误，必须是有效的 JSON" },
        { status: 400 }
      );
    }

    const { phone, password } = body;

    if (!phone || !password) {
      console.error('[InitAdmin] 缺少参数:', { hasPhone: !!phone, hasPassword: !!password });
      return NextResponse.json(
        { success: false, error: "缺少 phone 或 password 参数" },
        { status: 400 }
      );
    }

    // 获取数据库连接池
    console.log('[InitAdmin] 获取数据库连接池...');
    const poolInstance = await getPool();
    client = await poolInstance.connect();
    console.log('[InitAdmin] 数据库连接成功');

    // 检查是否已有管理员
    console.log('[InitAdmin] 检查现有管理员...');
    const adminResult = await client.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'admin'`,
      []
    );

    const adminCount = parseInt(adminResult.rows[0].count);
    console.log('[InitAdmin] 现有管理员数量:', adminCount);

    if (adminCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "系统已有管理员，请使用 /api/admin/set-admin 接口设置新管理员",
          existingAdmins: adminCount,
        },
        { status: 403 }
      );
    }

    // 查找用户
    console.log('[InitAdmin] 查找用户:', phone);
    const userResult = await client.query(
      `SELECT id, phone, role FROM users WHERE phone = $1`,
      [phone]
    );

    console.log('[InitAdmin] 查询结果:', { found: userResult.rows.length > 0 });

    if (userResult.rows.length === 0) {
      // 用户不存在，创建新用户
      console.log('[InitAdmin] 用户不存在，创建新用户...');

      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);
      console.log('[InitAdmin] 密码哈希完成');

      const insertResult = await client.query(
        `INSERT INTO users (phone, password_hash, role, nickname)
         VALUES ($1, $2, 'admin', $3)
         RETURNING id, phone, nickname, role`,
        [phone, passwordHash, phone]
      );

      console.log('[InitAdmin] 新用户创建成功:', insertResult.rows[0]);

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
    console.log('[InitAdmin] 用户已存在，更新角色:', user);

    // 更新为管理员
    await client.query(
      `UPDATE users SET role = 'admin' WHERE id = $1`,
      [user.id]
    );

    console.log('[InitAdmin] 角色更新成功');

    return NextResponse.json({
      success: true,
      message: "用户已设置为管理员",
      data: {
        user: { ...user, role: 'admin' },
        isInitial: false,
      },
    });
  } catch (error: any) {
    console.error('[InitAdmin] 错误:', error);
    console.error('[InitAdmin] 错误堆栈:', error.stack);

    // 确保始终返回有效的 JSON
    return NextResponse.json(
      {
        success: false,
        error: "初始化失败",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
        console.log('[InitAdmin] 数据库连接已释放');
      } catch (releaseError) {
        console.error('[InitAdmin] 释放连接失败:', releaseError);
      }
    }
  }
}
