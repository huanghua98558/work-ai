// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * 修复激活码表结构（添加缺失的 created_by 字段）
 * POST /api/db/migrate/fix-activation-codes
 */
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    console.log('开始修复激活码表结构...');

    // 添加 created_by 字段（如果不存在）
    await client.query(`
      ALTER TABLE activation_codes
      ADD COLUMN IF NOT EXISTS created_by INTEGER
    `);
    console.log('✓ 添加 created_by 字段');

    // 添加外键约束
    try {
      await client.query(`
        ALTER TABLE activation_codes
        ADD CONSTRAINT fk_activation_codes_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL
      `);
      console.log('✓ 添加外键约束');
    } catch (error) {
      console.log('⚠ 外键约束可能已存在，跳过');
    }

    // 修正现有数据（为没有 created_by 的记录设置默认值）
    await client.query(`
      UPDATE activation_codes
      SET created_by = 1
      WHERE created_by IS NULL
    `);
    console.log('✓ 更新现有数据');

    return NextResponse.json({
      success: true,
      message: '表结构修复完成',
    });
  } catch (error: any) {
    console.error('修复表结构错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: '修复表结构失败',
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
