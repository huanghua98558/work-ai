// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";

// Next.js 15+ 不直接支持在 API Routes 中处理 WebSocket
// 需要使用自定义服务器或者单独的 WebSocket 服务器
// 这里我们先返回说明信息

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const robotId = searchParams.get("robotId");
  const token = searchParams.get("token");

  // 动态生成 WebSocket 地址
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol;
  const host = request.headers.get('x-forwarded-host') || request.nextUrl.host;
  // x-forwarded-proto 可能是 "https" 或 "https:"，需要统一处理
  const wsProtocol = protocol.includes('https') ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${host}/ws?robotId=${robotId}&token=${token}`;

  return new Response(
    JSON.stringify({
      message: "WebSocket endpoint",
      usage: "请使用 WebSocket 客户端连接此端点",
      url: wsUrl,
      note: "Next.js 需要自定义服务器支持 WebSocket",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
