import { NextRequest, NextResponse } from 'next/server';

/**
 * 简化的测试接口
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[WorkTool Test] 收到请求:', body);

    return NextResponse.json({
      code: 200,
      message: '测试成功',
      data: {
        receivedAt: new Date().toISOString(),
        body,
      },
    });
  } catch (error) {
    console.error('[WorkTool Test] 处理失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: '处理失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
