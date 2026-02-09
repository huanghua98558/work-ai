// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

/**
 * 消息回退接口
 * 
 * 接口: POST /api/third-party/fallback/message
 * 
 * 使用场景:
 * - APP 发送消息到第三方平台失败后
 * - APP 回退到主服务器发送消息
 * - 主服务器使用内置 AI 或其他方式处理消息
 * 
 * 请求头:
 * - Authorization: Bearer {token}
 * - X-Robot-Id: {robotId}
 */
export async function POST(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  
  try {
    // 1. 验证 Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: '缺少认证信息',
        code: 'MISSING_AUTH'
      }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);
    
    if (!payload || !payload.valid) {
      return NextResponse.json({
        success: false,
        error: payload?.error || 'Token 无效',
        code: 'INVALID_TOKEN'
      }, { status: 401 });
    }
    
    // 2. 解析请求体
    const body = await request.json();
    const { robotId, content, messageType, senderId, senderName } = body;
    
    if (!robotId || !content) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：robotId 或 content',
        code: 'MISSING_PARAMS'
      }, { status: 400 });
    }
    
    console.log(`[Fallback] 收到回退消息: robotId=${robotId}, content=${content.substring(0, 50)}...`);
    
    // 3. 查询机器人配置
    const robotResult = await client.query(
      `SELECT 
        id,
        robot_id,
        ai_mode,
        ai_provider,
        ai_model,
        ai_api_key
      FROM robots
      WHERE robot_id = $1
      LIMIT 1`,
      [robotId]
    );
    
    if (robotResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '机器人不存在',
        code: 'ROBOT_NOT_FOUND'
      }, { status: 404 });
    }
    
    const robot = robotResult.rows[0];
    
    // 4. 保存消息到数据库
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = `session_${robotId}_${senderId || 'unknown'}`;
    
    await client.query(`
      INSERT INTO messages (
        robot_id,
        user_id,
        session_id,
        message_type,
        content,
        extra_data,
        status,
        direction,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'received', 'incoming', NOW())
    `, [
      robotId,
      senderId || null,
      sessionId,
      messageType || 'text',
      content,
      JSON.stringify({
        ...body,
        isFallback: true
      })
    ]);
    
    console.log(`[Fallback] 消息已保存: ${messageId}`);
    
    // 5. 处理消息（使用内置 AI 或其他方式）
    let replyContent = '';
    
    if (robot.ai_mode === 'builtin' && robot.ai_api_key) {
      // 使用内置 AI 生成回复
      replyContent = await generateAIReply(content, robot);
      console.log(`[Fallback] AI 回复生成完成: ${replyContent.substring(0, 50)}...`);
    } else {
      // 使用默认回复
      replyContent = '感谢您的消息，我们会尽快回复。';
      console.log(`[Fallback] 使用默认回复`);
    }
    
    // 6. 保存回复到数据库
    await client.query(`
      INSERT INTO messages (
        robot_id,
        user_id,
        session_id,
        message_type,
        content,
        extra_data,
        status,
        direction,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'sent', 'outgoing', NOW())
    `, [
      robotId,
      null,
      sessionId,
      'text',
      replyContent,
      JSON.stringify({
        isFallback: true,
        aiGenerated: robot.ai_mode === 'builtin'
      })
    ]);
    
    console.log(`[Fallback] 回复已保存`);
    
    // 7. 通过 WebSocket 推送给 APP
    const { sendWebSocketMessage } = await import('@/server/websocket-server');
    
    const wsPayload = {
      type: "command_push",
      data: {
        commandId: `cmd_${Date.now()}`,
        commandType: 203,
        params: {
          target: senderName || '用户',
          content: replyContent,
          messageType: 'text'
        }
      },
      timestamp: Date.now()
    };
    
    sendWebSocketMessage(robotId, wsPayload);
    console.log(`[Fallback] 指令已推送给 APP: ${robotId}`);
    
    return NextResponse.json({
      success: true,
      data: {
        messageId,
        replyContent,
        isFallback: true,
        aiGenerated: robot.ai_mode === 'builtin'
      }
    });
    
  } catch (error: any) {
    console.error('[Fallback] 处理消息失败:', error);
    return NextResponse.json({
      success: false,
      error: '处理消息失败',
      code: 'INTERNAL_ERROR',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * AI 回复生成函数
 * 
 * TODO: 实现具体的 AI 调用逻辑
 * 这里可以调用豆包、DeepSeek、Kimi 等 AI 服务
 * 
 * @param content 用户消息内容
 * @param robot 机器人配置
 * @returns AI 生成的回复
 */
async function generateAIReply(content: string, robot: any): Promise<string> {
  try {
    // TODO: 实现具体的 AI 调用逻辑
    // 示例：
    // const aiResponse = await callAIService({
    //   provider: robot.ai_provider,
    //   model: robot.ai_model,
    //   apiKey: robot.ai_api_key,
    //   prompt: content
    // });
    // return aiResponse.reply;
    
    // 简化实现：返回固定回复
    return `您好！我是 AI 助手，您说"${content}"，很高兴为您服务！`;
    
  } catch (error: any) {
    console.error('[Fallback] AI 回复生成失败:', error);
    return '抱歉，我暂时无法理解您的消息，请稍后再试。';
  }
}
