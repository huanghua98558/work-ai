import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { HeaderUtils } from 'coze-coding-dev-sdk';

// 消息类型
export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

// AI 配置
export interface AIConfig {
  model?: string;
  temperature?: number;
  thinking?: 'enabled' | 'disabled';
  caching?: 'enabled' | 'disabled';
}

// 流式响应回调
export type StreamCallback = (content: string) => void;

// AI 响应
export interface AIResponse {
  content: string;
  model?: string;
}

/**
 * AI 服务类
 */
export class AIService {
  private client: LLMClient;
  private defaultConfig: AIConfig;

  constructor(config?: AIConfig) {
    const sdkConfig = new Config();
    this.client = new LLMClient(sdkConfig);
    this.defaultConfig = config || {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
      thinking: 'disabled',
      caching: 'disabled',
    };
  }

  /**
   * 发送消息（非流式）
   */
  async sendMessage(
    messages: ChatMessage[],
    config?: AIConfig,
    customHeaders?: Record<string, string>
  ): Promise<AIResponse> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    const response = await this.client.invoke(
      messages,
      {
        model: mergedConfig.model,
        temperature: mergedConfig.temperature,
        thinking: mergedConfig.thinking,
        caching: mergedConfig.caching,
      },
      undefined,
      customHeaders
    );

    return {
      content: response.content,
      model: mergedConfig.model,
    };
  }

  /**
   * 发送消息（流式）
   */
  async sendMessageStream(
    messages: ChatMessage[],
    callback: StreamCallback,
    config?: AIConfig,
    customHeaders?: Record<string, string>
  ): Promise<void> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    const stream = this.client.stream(
      messages,
      {
        model: mergedConfig.model,
        temperature: mergedConfig.temperature,
        thinking: mergedConfig.thinking,
        caching: mergedConfig.caching,
      },
      undefined,
      customHeaders
    );

    for await (const chunk of stream) {
      if (chunk.content) {
        const content = chunk.content.toString();
        callback(content);
      }
    }
  }

  /**
   * 简单对话（单轮）
   */
  async chat(
    userMessage: string,
    systemPrompt?: string,
    config?: AIConfig,
    customHeaders?: Record<string, string>
  ): Promise<AIResponse> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    return this.sendMessage(messages, config, customHeaders);
  }

  /**
   * 流式对话（单轮）
   */
  async chatStream(
    userMessage: string,
    callback: StreamCallback,
    systemPrompt?: string,
    config?: AIConfig,
    customHeaders?: Record<string, string>
  ): Promise<void> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    return this.sendMessageStream(messages, callback, config, customHeaders);
  }

  /**
   * 多轮对话
   */
  async chatWithHistory(
    history: ChatMessage[],
    config?: AIConfig,
    customHeaders?: Record<string, string>
  ): Promise<AIResponse> {
    return this.sendMessage(history, config, customHeaders);
  }

  /**
   * 流式多轮对话
   */
  async chatWithHistoryStream(
    history: ChatMessage[],
    callback: StreamCallback,
    config?: AIConfig,
    customHeaders?: Record<string, string>
  ): Promise<void> {
    return this.sendMessageStream(history, callback, config, customHeaders);
  }
}

// 默认 AI 服务实例
let defaultAIService: AIService | null = null;

/**
 * 获取默认 AI 服务实例
 */
export function getAIService(config?: AIConfig): AIService {
  if (!defaultAIService) {
    defaultAIService = new AIService(config);
  }
  return defaultAIService;
}

/**
 * 从请求中提取 headers
 */
export function extractHeadersFromRequest(headers: Headers): Record<string, string> {
  return HeaderUtils.extractForwardHeaders(headers as unknown as Record<string, string>);
}
