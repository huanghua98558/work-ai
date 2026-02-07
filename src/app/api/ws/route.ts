import { NextRequest } from "next/server";

// Next.js 15+ 不直接支持在 API Routes 中处理 WebSocket
// 需要使用自定义服务器或者单独的 WebSocket 服务器
// 这里我们先返回说明信息

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const robotId = searchParams.get("robotId");
  const token = searchParams.get("token");

  return new Response(
    JSON.stringify({
      message: "WebSocket endpoint",
      usage: "请使用 WebSocket 客户端连接此端点",
      url: `ws://localhost:5000/api/ws?robotId=${robotId}&token=${token}`,
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
