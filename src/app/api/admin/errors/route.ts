// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { logger } from "@/lib/error-logger";
import { withErrorHandling, successResponse, validateParams } from "@/lib/error-handler";
import { requireAuth, requireRole } from "@/lib/auth";
import { z } from "zod";

const getErrorsSchema = z.object({
  limit: z.number().optional().default(100),
});

/**
 * 获取最近的错误日志（仅管理员）
 */
export const GET = withErrorHandling<NextRequest>(async (request: NextRequest) => {
  // 验证用户身份
  const user = requireAuth(request);

  // 验证管理员权限
  requireRole(user, ["admin"]);

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
