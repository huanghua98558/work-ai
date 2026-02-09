// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

// 请求体验证
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.union([z.string(), z.array(z.any())]),
  })),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  thinking: z.enum(['enabled', 'disabled']).optional(),
  caching: z.enum(['enabled', 'disabled']).optional(),
  previousResponseId: z.string().optional(),
});

// 聊天 API - 支持流式输出
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = requireAuth(request);
    
    // 提取并转发 headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 解析请求体
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);

    const {
      messages,
      model = 'doubao-seed-1-8-251228',
      temperature = 0.7,
      thinking = 'disabled',
      caching = 'disabled',
      previousResponseId,
    } = validatedData;

    // 创建 LLM 客户端
    const config = new Config();
    const client = new LLMClient(config);

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = client.stream(messages as any, {
      model,
      temperature,
      thinking,
      caching,
    }, previousResponseId, customHeaders);

    // 创建 ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              // 发送 SSE 格式的数据
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          // 发送完成信号
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI服务异常，请稍后重试' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '请求参数错误', 
          details: error.errors 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error.message && error.message.includes('未授权')) {
      return new Response(
        JSON.stringify({ success: false, error: '未授权访问，请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'AI服务异常，请稍后重试' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// OPTIONS 方法支持 CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
