// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * 数据库迁移：添加激活码缺失字段
 * POST /api/db/migrate/activation-codes
 */
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    console.log('开始迁移 activation_codes 表...');

    // 1. 添加 robot_id 字段（绑定机器人ID）
    await client.query(`
      ALTER TABLE activation_codes
      ADD COLUMN IF NOT EXISTS robot_id VARCHAR(255)
    `);
    console.log('✓ 添加 robot_id 字段');

    // 2. 添加外键约束
    try {
      await client.query(`
        ALTER TABLE activation_codes
        ADD CONSTRAINT fk_activation_codes_robot
        FOREIGN KEY (robot_id) REFERENCES robots(robot_id)
        ON DELETE SET NULL
      `);
      console.log('✓ 添加外键约束');
    } catch (error) {
      console.log('⚠ 外键约束可能已存在，跳过');
    }

    // 3. 添加索引
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activation_codes_robot_id
      ON activation_codes(robot_id)
    `);
    console.log('✓ 添加索引');

    // 4. 添加 type 字段（激活码类型）
    await client.query(`
      ALTER TABLE activation_codes
      ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'admin_dispatch'
    `);
    console.log('✓ 添加 type 字段');

    // 5. 添加 max_uses 字段（最大使用次数）
    await client.query(`
      ALTER TABLE activation_codes
      ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1
    `);
    console.log('✓ 添加 max_uses 字段');

    // 6. 添加 used_count 字段（已使用次数）
    await client.query(`
      ALTER TABLE activation_codes
      ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0
    `);
    console.log('✓ 添加 used_count 字段');

    // 7. 更新现有数据的 status 字段（兼容旧数据）
    await client.query(`
      UPDATE activation_codes
      SET status = CASE
        WHEN status = 'active' THEN 'unused'
        WHEN status = 'inactive' THEN 'used'
        ELSE status
      END
      WHERE status IN ('active', 'inactive')
    `);
    console.log('✓ 更新现有数据状态');

    // 8. 添加索引（如果不存在）
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activation_codes_type
      ON activation_codes(type)
    `);
    console.log('✓ 添加 type 索引');

    return NextResponse.json({
      success: true,
      message: '数据库迁移完成',
      details: {
        addedColumns: ['robot_id', 'type', 'max_uses', 'used_count'],
        addedIndexes: ['idx_activation_codes_robot_id', 'idx_activation_codes_type'],
      },
    });
  } catch (error: any) {
    console.error('数据库迁移错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: '数据库迁移失败',
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
