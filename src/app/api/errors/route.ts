// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * 错误上报 API
 * POST /api/errors
 *
 * 用于接收客户端错误信息并记录到日志
 */
export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();

    console.error('[客户端错误报告]', {
      timestamp: new Date().toISOString(),
      url: errorData.url,
      error: errorData.error,
      userAgent: errorData.userAgent,
    });

    // 如果有堆栈信息，也记录下来
    if (errorData.stack) {
      console.error('[客户端错误堆栈]', errorData.stack);
    }

    if (errorData.componentStack) {
      console.error('[客户端组件堆栈]', errorData.componentStack);
    }

    return NextResponse.json({
      success: true,
      message: '错误已记录',
    });
  } catch (error: any) {
    console.error('[错误上报 API] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: '记录错误失败',
      },
      { status: 500 }
    );
  }
}
