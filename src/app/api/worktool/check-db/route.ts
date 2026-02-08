import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * 检查数据库表结构
 */
export async function GET(request: NextRequest) {
  try {
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      // 检查 robots 表是否存在
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'robots'
        )
      `);

      const tableExists = tableCheck.rows[0].exists;

      let columns: any[] = [];

      if (tableExists) {
        // 获取表的列信息
        const columnsQuery = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'robots'
          ORDER BY ordinal_position
        `);

        columns = columnsQuery.rows;

        // 获取表中的数据数量
        const countQuery = await client.query('SELECT COUNT(*) as count FROM robots');
        const count = countQuery.rows[0].count;

        return NextResponse.json({
          code: 200,
          message: '检查成功',
          data: {
            tableExists,
            columnCount: columns.length,
            rowCount: count,
            columns,
          },
        });
      } else {
        return NextResponse.json({
          code: 404,
          message: 'robots 表不存在',
          data: {
            tableExists,
          },
        });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[WorkTool Check DB] 检查失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: '检查失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
