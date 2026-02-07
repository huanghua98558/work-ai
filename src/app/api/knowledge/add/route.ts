import { NextRequest } from "next/server";
import { getKnowledgeService } from "@/lib/knowledge-service";
import {
  withErrorHandling,
  successResponse,
  validateParams,
  ValidationError,
} from "@/lib/error-handler";
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
 * 添加内容到知识库
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { type } = body;

  if (type === 'url') {
    // 添加 URL
    const validatedData = validateParams(addUrlSchema, body);
    const { url, dataset } = validatedData as z.infer<typeof addUrlSchema>;

    const knowledgeService = getKnowledgeService(dataset);
    const success = await knowledgeService.addUrl(url);

    if (success) {
      return successResponse({
        message: "URL 导入成功",
        url,
        dataset,
      });
    } else {
      throw new ValidationError("URL 导入失败");
    }
  } else {
    // 添加文本
    const validatedData = validateParams(addContentSchema, body);
    const { content, dataset } = validatedData as z.infer<typeof addContentSchema>;

    const knowledgeService = getKnowledgeService(dataset);
    const success = await knowledgeService.addContent(content);

    if (success) {
      return successResponse({
        message: "内容导入成功",
        dataset,
      });
    } else {
      throw new ValidationError("内容导入失败");
    }
  }
});
