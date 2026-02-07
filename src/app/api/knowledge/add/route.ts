import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeService } from "@/lib/knowledge-service";
import { z } from "zod";

const addContentSchema = z.object({
  content: z.string().min(1),
  dataset: z.string().optional().default('workbot_knowledge'),
});

const addUrlSchema = z.object({
  url: z.string().url(),
  dataset: z.string().optional().default('workbot_knowledge'),
});

/**
 * 添加文本内容到知识库
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'url') {
      // 添加 URL
      const validatedData = addUrlSchema.parse(body);
      const { url, dataset } = validatedData;

      const knowledgeService = getKnowledgeService(dataset);
      const success = await knowledgeService.addUrl(url);

      if (success) {
        return NextResponse.json({
          success: true,
          data: {
            message: "URL 导入成功",
            url,
            dataset,
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "URL 导入失败",
            code: "IMPORT_FAILED",
          },
          { status: 500 }
        );
      }
    } else {
      // 添加文本
      const validatedData = addContentSchema.parse(body);
      const { content, dataset } = validatedData;

      const knowledgeService = getKnowledgeService(dataset);
      const success = await knowledgeService.addContent(content);

      if (success) {
        return NextResponse.json({
          success: true,
          data: {
            message: "内容导入成功",
            dataset,
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "内容导入失败",
            code: "IMPORT_FAILED",
          },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error("知识库导入错误:", error);

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
        error: "知识库导入失败",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
