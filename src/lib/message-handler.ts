import { getAIService, ChatMessage, AIConfig, extractHeadersFromRequest } from './ai-service';
import { getKnowledgeService } from './knowledge-service';
import { processMessage } from './message-processor';
import { MessageType } from '@/types/message';
import { getDatabase } from './db';
import { sql } from 'drizzle-orm';
import { sendWebSocketMessage } from '@/server/websocket-server';

// 机器人配置
export interface RobotConfig {
  robotId: string;
  systemPrompt?: string;
  enableKnowledgeBase?: boolean;
  knowledgeDataset?: string;
  enableStreamResponse?: boolean;
  temperature?: number;
}

// 消息处理结果
export interface ProcessResult {
  success: boolean;
  response?: string;
  error?: string;
  usedKnowledgeBase?: boolean;
}

/**
 * 消息处理器类
 */
export class MessageHandler {
  private aiService: ReturnType<typeof getAIService>;
  private knowledgeService: ReturnType<typeof getKnowledgeService>;

  constructor() {
    this.aiService = getAIService();
    this.knowledgeService = getKnowledgeService();
  }

  /**
   * 处理消息（核心链路）
   */
  async handleMessage(
    robotId: string,
    userMessage: string,
    messageType: MessageType,
    sessionId?: string,
    userId?: string,
    customHeaders?: Record<string, string>
  ): Promise<ProcessResult> {
    try {
      // 1. 获取机器人配置
      const robotConfig = await this.getRobotConfig(robotId);
      
      // 2. 处理消息内容
      const processedMessage = await processMessage(
        { content: userMessage },
        messageType
      );
      
      const content = typeof processedMessage.content === 'string' 
        ? processedMessage.content 
        : userMessage;

      // 3. 构建对话历史
      const history = await this.getConversationHistory(sessionId || '', 5);

      // 4. 检查是否使用知识库
      let knowledgeContext = '';
      let usedKnowledgeBase = false;

      if (robotConfig.enableKnowledgeBase && robotConfig.knowledgeDataset) {
        knowledgeContext = await this.knowledgeService.getContext(content, 3);
        if (knowledgeContext) {
          usedKnowledgeBase = true;
        }
      }

      // 5. 构建系统提示
      let systemPrompt = robotConfig.systemPrompt || this.getDefaultSystemPrompt();
      
      if (knowledgeContext) {
        systemPrompt += `\n\n以下是有用的参考信息，请基于这些信息回答问题：\n${knowledgeContext}`;
      }

      // 6. 构建消息列表
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content },
      ];

      // 7. 调用 AI 生成回复
      const aiConfig: AIConfig = {
        temperature: robotConfig.temperature || 0.7,
        caching: 'disabled',
      };

      if (robotConfig.enableStreamResponse) {
        // 流式回复
        let fullResponse = '';
        
        await this.aiService.chatStream(
          content,
          (chunk) => {
            fullResponse += chunk;
            // 实时推送部分回复
            this.streamChunk(robotId, sessionId, chunk);
          },
          systemPrompt,
          aiConfig,
          customHeaders
        );

        // 保存回复到会话上下文
        if (sessionId) {
          await this.saveMessage(sessionId, 'assistant', fullResponse);
        }

        return {
          success: true,
          response: fullResponse,
          usedKnowledgeBase,
        };
      } else {
        // 非流式回复
        const response = await this.aiService.chatWithHistory(
          messages,
          aiConfig,
          customHeaders
        );

        // 保存回复到会话上下文
        if (sessionId) {
          await this.saveMessage(sessionId, 'assistant', response.content);
        }

        return {
          success: true,
          response: response.content,
          usedKnowledgeBase,
        };
      }
    } catch (error: any) {
      console.error('消息处理失败:', error);
      return {
        success: false,
        error: error.message || '消息处理失败',
      };
    }
  }

  /**
   * 获取机器人配置
   */
  private async getRobotConfig(robotId: string): Promise<RobotConfig> {
    try {
      const db = await getDatabase();
      
      const result = await db.execute(sql`
        SELECT 
          robot_id,
          config,
          status
        FROM device_activations
        WHERE robot_id = ${robotId}
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        const config = result.rows[0].config || {};
        return {
          robotId,
          systemPrompt: config.systemPrompt,
          enableKnowledgeBase: config.enableKnowledgeBase || false,
          knowledgeDataset: config.knowledgeDataset || 'workbot_knowledge',
          enableStreamResponse: config.enableStreamResponse || true,
          temperature: config.temperature || 0.7,
        };
      }

      return {
        robotId,
        enableKnowledgeBase: false,
        enableStreamResponse: true,
        temperature: 0.7,
      };
    } catch (error) {
      console.error('获取机器人配置失败:', error);
      return {
        robotId,
        enableKnowledgeBase: false,
        enableStreamResponse: true,
        temperature: 0.7,
      };
    }
  }

  /**
   * 获取对话历史
   */
  private async getConversationHistory(
    sessionId: string,
    maxCount: number = 5
  ): Promise<ChatMessage[]> {
    if (!sessionId) {
      return [];
    }

    try {
      const db = await getDatabase();
      
      const result = await db.execute(sql`
        SELECT role, content
        FROM session_contexts
        WHERE session_id = ${sessionId}
        ORDER BY created_at DESC
        LIMIT ${maxCount * 2}
      `);

      const history: ChatMessage[] = result.rows
        .reverse()
        .map((row: any) => ({
          role: row.role as 'user' | 'assistant',
          content: row.content,
        }));

      return history;
    } catch (error) {
      console.error('获取对话历史失败:', error);
      return [];
    }
  }

  /**
   * 保存消息到会话上下文
   */
  private async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    try {
      const db = await getDatabase();
      
      // 先保存用户消息
      const messagesResult = await db.execute(sql`
        SELECT id FROM messages
        WHERE session_id = ${sessionId}
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const messageId = messagesResult.rows.length > 0 
        ? messagesResult.rows[0].id 
        : null;

      // 插入会话上下文
      await db.execute(sql`
        INSERT INTO session_contexts (session_id, message_id, role, content)
        VALUES (${sessionId}, ${messageId}, ${role}, ${content})
      `);

      // 更新会话消息数和最后消息时间
      await db.execute(sql`
        UPDATE sessions
        SET 
          message_count = message_count + 1,
          last_message_at = NOW(),
          updated_at = NOW()
        WHERE session_id = ${sessionId}
      `);
    } catch (error) {
      console.error('保存消息失败:', error);
    }
  }

  /**
   * 流式推送回复
   */
  private streamChunk(
    robotId: string,
    sessionId: string | undefined,
    chunk: string
  ): void {
    const payload = {
      type: 'stream_chunk',
      data: {
        robotId,
        sessionId,
        content: chunk,
        timestamp: Date.now(),
      },
    };

    sendWebSocketMessage(robotId, payload);
  }

  /**
   * 获取默认系统提示
   */
  private getDefaultSystemPrompt(): string {
    return `你是一个专业、友好、乐于助人的 AI 助手。你的目标是：

1. 理解用户的需求和问题
2. 提供准确、有用的回答
3. 保持礼貌和专业的态度
4. 如果不确定答案，诚实地说出来
5. 尽量用简洁明了的语言回复

请根据用户的问题，提供最好的回答。`;
  }
}

// 默认消息处理器实例
let defaultMessageHandler: MessageHandler | null = null;

/**
 * 获取默认消息处理器实例
 */
export function getMessageHandler(): MessageHandler {
  if (!defaultMessageHandler) {
    defaultMessageHandler = new MessageHandler();
  }
  return defaultMessageHandler;
}
