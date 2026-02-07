import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeService } from "@/lib/knowledge-service";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(1),
  topK: z.number().optional().default(5),
  dataset: z.string().optional().default('workbot_knowledge'),
});

/**
 * 知识库搜索接口
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validatedData = searchSchema.parse({
      query: searchParams.get('query'),
      topK: parseInt(searchParams.get('topK') || '5'),
      dataset: searchParams.get('dataset') || 'workbot_knowledge',
    });

    const { query, topK, dataset } = validatedData;

    const knowledgeService = getKnowledgeService(dataset);
    const results = await knowledgeService.search(query, { topK, dataset });

    return NextResponse.json({
      success: true,
      data: {
        results,
        total: results.length,
        query,
      },
    });
  } catch (error: any) {
    console.error("知识库搜索错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "请求参数错误",
          details: error.errors,
          code: "INVALID_PARAMS",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "知识库搜索失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
