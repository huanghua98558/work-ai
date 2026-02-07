import { NextRequest } from "next/server";
import { logger } from "@/lib/error-logger";
import { withErrorHandling, successResponse, validateParams } from "@/lib/error-handler";
import { z } from "zod";

const getErrorsSchema = z.object({
  limit: z.number().optional().default(100),
});

/**
 * 获取最近的错误日志
 */
export const GET = withErrorHandling<NextRequest>(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const validatedData = validateParams(getErrorsSchema, {
    limit: parseInt(searchParams.get('limit') || '100'),
  });

  const { limit } = validatedData as z.infer<typeof getErrorsSchema>;

  const errors = logger.getRecentErrors(limit);

  return successResponse({
    errors,
    total: errors.length,
  });
});
