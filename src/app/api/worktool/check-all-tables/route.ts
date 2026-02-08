import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * 检查所有表中的 robot_id 字段
 */
export async function GET(request: NextRequest) {
  try {
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      // 获取所有包含 robot_id 字段的表
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'robot_id'
        ORDER BY table_name
      `);

      const tables = result.rows;

      if (tables.length === 0) {
        return NextResponse.json({
          code: 200,
          message: '未找到包含 robot_id 字段的表',
          data: {
            tables: [],
          },
        });
      }

      // 获取每个表的详细信息
      const tableDetails: any[] = [];

      for (const table of tables) {
        const tableName = table.table_name;

        // 获取表中的 robot_id 相关信息
        const columnInfo = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        // 获取表中的数据数量
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = countResult.rows[0].count;

        tableDetails.push({
          tableName,
          rowCount: count,
          columns: columnInfo.rows,
        });
      }

      return NextResponse.json({
        code: 200,
        message: '查询成功',
        data: {
          tableCount: tableDetails.length,
          tables: tableDetails,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[WorkTool Check All Tables] 查询失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: '查询失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
