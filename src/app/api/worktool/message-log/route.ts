// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * 消息日志上报接口
 * 
 * 接口: POST /api/worktool/message-log
 * 
 * 说明: APP 发送消息到第三方平台后，上报发送日志
 */
export async function POST(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  
  try {
    const body = await request.json();
    const { messageId, robotId, thirdPartyUrl, status, error, reportedAt } = body;
    
    console.log(`[Message Log] 收到日志上报: robotId=${robotId}, messageId=${messageId}, status=${status}`);
    
    // 1. 验证必要参数
    if (!messageId || !robotId || !thirdPartyUrl || !status) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：messageId, robotId, thirdPartyUrl 或 status',
        code: 'MISSING_PARAMS'
      }, { status: 400 });
    }
    
    // 2. 保存日志到数据库
    await client.query(`
      INSERT INTO message_fail_logs (
        robot_id,
        message_id,
        third_party_url,
        error_message,
        error_type,
        failed_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      robotId,
      messageId,
      thirdPartyUrl,
      error || 'Unknown error',
      status === 'failed' ? 'client_error' : 'success',
      reportedAt || new Date()
    ]);
    
    console.log(`[Message Log] 日志已保存: ${messageId}`);
    
    return NextResponse.json({
      success: true,
      message: '日志已记录'
    });
    
  } catch (error: any) {
    console.error('[Message Log] 记录消息日志失败:', error);
    return NextResponse.json({
      success: false,
      error: '记录日志失败',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}
