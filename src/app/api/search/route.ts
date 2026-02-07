// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { SearchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

/**
 * 搜索 API
 * POST /api/search
 *
 * 使用 web-search 技能搜索网络信息
 */
export async function POST(request: NextRequest) {
  try {
    const { query, count = 10, needSummary = true } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "query 参数是必需的" },
        { status: 400 }
      );
    }

    // 提取请求头并转发
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 初始化搜索客户端
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    // 执行搜索
    const response = await client.webSearch(
      query,
      count,
      needSummary,
    );

    return NextResponse.json({
      success: true,
      summary: response.summary,
      results: response.web_items?.map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        site_name: item.site_name,
        publish_time: item.publish_time,
      })) || [],
    });
  } catch (error: any) {
    console.error("搜索失败:", error);
    return NextResponse.json(
      {
        error: error.message || "搜索失败",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
