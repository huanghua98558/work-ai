import { NextRequest } from "next/server";
import {
  withErrorHandling,
  successResponse,
  ValidationError,
  NotFoundError,
  BusinessError,
  InternalServerError,
} from "@/lib/error-handler";

/**
 * 测试错误处理接口
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { type, message } = body;

  switch (type) {
    case 'validation':
      throw new ValidationError(message || '测试验证错误');
    case 'notFound':
      throw new NotFoundError(message || '测试资源不存在');
    case 'business':
      throw new BusinessError(
        'TEST_ERROR' as any,
        message || '测试业务错误'
      );
    case 'internal':
      throw new InternalServerError(message || '测试内部错误');
    case 'unknown':
      throw new Error(message || '测试未知错误');
    default:
      return successResponse({
        message: '测试成功',
        availableTypes: ['validation', 'notFound', 'business', 'internal', 'unknown'],
      });
  }
});
