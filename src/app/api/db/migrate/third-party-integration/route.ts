// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from '@/lib/db';

/**
 * 执行第三方集成数据库迁移
 * 
 * 接口: POST /api/db/migrate/third-party-integration
 * 
 * 说明:
 * - 创建 device_activations 表
 * - 创建 config_sync_logs 表
 * - 创建 message_fail_logs 表
 * - 创建 sessions 表
 */
export async function POST(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  try {
    console.log('[Migration] 开始执行第三方集成数据库迁移...');

    // 读取迁移脚本
    const migrationScript = readFileSync(
      join(process.cwd(), 'src/db/migrations/create-third-party-integration-tables.sql'),
      'utf-8'
    );

    // 分割SQL语句（按分号分割）
    const statements = migrationScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // 执行每个SQL语句
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const statement of statements) {
      try {
        await client.query(statement);
        successCount++;
        console.log(`[Migration] ✓ 执行成功: ${statement.substring(0, 50)}...`);
      } catch (error: any) {
        // 忽略 "already exists" 错误
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`[Migration] ⊘ 已存在，跳过: ${statement.substring(0, 50)}...`);
          successCount++;
        } else {
          errorCount++;
          errors.push(error.message);
          console.error(`[Migration] ✗ 执行失败: ${statement.substring(0, 50)}...`, error);
        }
      }
    }

    // 验证表是否创建成功
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'device_activations',
          'config_sync_logs',
          'message_fail_logs',
          'sessions'
        )
    `);

    const createdTables = tablesResult.rows.map(row => row.table_name);

    // 验证索引是否创建成功
    const indexesResult = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN (
        'device_activations',
        'config_sync_logs',
        'message_fail_logs',
        'sessions'
      )
    `);

    const createdIndexes = indexesResult.rows.map(row => ({
      indexName: row.indexname,
      tableName: row.tablename
    }));

    console.log('[Migration] 数据库迁移完成');
    console.log(`[Migration] 成功: ${successCount}, 失败: ${errorCount}`);
    console.log(`[Migration] 创建的表: ${createdTables.join(', ')}`);
    console.log(`[Migration] 创建的索引: ${createdIndexes.length} 个`);

    return NextResponse.json({
      success: true,
      message: '数据库迁移完成',
      data: {
        successCount,
        errorCount,
        createdTables,
        createdIndexes,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: any) {
    console.error('[Migration] 数据库迁移失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '数据库迁移失败',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 查询迁移状态
 */
export async function GET(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  try {
    // 查询表是否存在
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'device_activations',
          'config_sync_logs',
          'message_fail_logs',
          'sessions'
        )
    `);

    const existingTables = tablesResult.rows.map(row => row.table_name);

    // 查询记录数
    const counts: Record<string, number> = {};
    for (const table of ['device_activations', 'config_sync_logs', 'message_fail_logs', 'sessions']) {
      if (existingTables.includes(table)) {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(countResult.rows[0].count);
      } else {
        counts[table] = 0;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        migrated: existingTables.length === 4,
        existingTables,
        counts
      }
    });

  } catch (error: any) {
    console.error('[Migration] 查询迁移状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '查询迁移状态失败',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
