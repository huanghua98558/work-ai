import { MessageType } from '@/types/message';
import { getDatabase } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * 消息处理器接口
 */
export interface MessageProcessor {
  messageType: MessageType;
  process(message: any): Promise<any>;
}

/**
 * 文本消息处理器
 */
class TextMessageProcessor implements MessageProcessor {
  messageType = MessageType.TEXT;

  async process(message: any) {
    // 文本消息可能需要处理敏感词、特殊字符等
    const content = message.content || '';
    const processedContent = content.trim();
    
    return {
      type: 'text',
      content: processedContent,
      plainText: true,
    };
  }
}

/**
 * 图片消息处理器
 */
class ImageMessageProcessor implements MessageProcessor {
  messageType = MessageType.IMAGE;

  async process(message: any) {
    const extraData = message.extraData || {};
    
    return {
      type: 'image',
      imageUrl: extraData.url || '',
      thumbnailUrl: extraData.thumbnail || '',
      width: extraData.width || 0,
      height: extraData.height || 0,
      size: extraData.size || 0,
    };
  }
}

/**
 * 语音消息处理器
 */
class VoiceMessageProcessor implements MessageProcessor {
  messageType = MessageType.VOICE;

  async process(message: any) {
    const extraData = message.extraData || {};
    
    return {
      type: 'voice',
      voiceUrl: extraData.url || '',
      duration: extraData.duration || 0,
      size: extraData.size || 0,
      format: extraData.format || 'mp3',
    };
  }
}

/**
 * 视频消息处理器
 */
class VideoMessageProcessor implements MessageProcessor {
  messageType = MessageType.VIDEO;

  async process(message: any) {
    const extraData = message.extraData || {};
    
    return {
      type: 'video',
      videoUrl: extraData.url || '',
      thumbnailUrl: extraData.thumbnail || '',
      duration: extraData.duration || 0,
      width: extraData.width || 0,
      height: extraData.height || 0,
      size: extraData.size || 0,
    };
  }
}

/**
 * 文件消息处理器
 */
class FileMessageProcessor implements MessageProcessor {
  messageType = MessageType.FILE;

  async process(message: any) {
    const extraData = message.extraData || {};
    const content = message.content || '';
    
    return {
      type: 'file',
      fileName: content,
      fileUrl: extraData.url || '',
      size: extraData.size || 0,
      mimeType: extraData.mimeType || '',
    };
  }
}

/**
 * 链接消息处理器
 */
class LinkMessageProcessor implements MessageProcessor {
  messageType = MessageType.LINK;

  async process(message: any) {
    const extraData = message.extraData || {};
    const content = message.content || '';
    
    return {
      type: 'link',
      url: content,
      title: extraData.title || '',
      description: extraData.description || '',
      thumbnailUrl: extraData.thumbnail || '',
    };
  }
}

/**
 * 位置消息处理器
 */
class LocationMessageProcessor implements MessageProcessor {
  messageType = MessageType.LOCATION;

  async process(message: any) {
    const extraData = message.extraData || {};
    
    return {
      type: 'location',
      latitude: extraData.latitude || 0,
      longitude: extraData.longitude || 0,
      address: extraData.address || '',
      poiName: extraData.poiName || '',
    };
  }
}

/**
 * 表情消息处理器
 */
class EmojiMessageProcessor implements MessageProcessor {
  messageType = MessageType.EMOJI;

  async process(message: any) {
    const extraData = message.extraData || {};
    
    return {
      type: 'emoji',
      emojiType: extraData.type || 'image',
      imageUrl: extraData.url || '',
      emojiCode: extraData.code || '',
      width: extraData.width || 0,
      height: extraData.height || 0,
    };
  }
}

/**
 * @消息处理器
 */
class MentionMessageProcessor implements MessageProcessor {
  messageType = MessageType.MENTION;

  async process(message: any) {
    const extraData = message.extraData || {};
    const content = message.content || '';
    
    return {
      type: 'mention',
      content,
      mentions: extraData.mentions || [],
      mentionedUsers: extraData.mentionedUsers || [],
    };
  }
}

/**
 * 指令消息处理器
 */
class CommandMessageProcessor implements MessageProcessor {
  messageType = MessageType.COMMAND;

  async process(message: any) {
    const content = message.content || '';
    const parts = content.split(/\s+/);
    const command = parts[0] || '';
    const args = parts.slice(1);
    
    return {
      type: 'command',
      command,
      args,
      rawContent: content,
    };
  }
}

/**
 * 回复消息处理器
 */
class ReplyMessageProcessor implements MessageProcessor {
  messageType = MessageType.REPLY;

  async process(message: any) {
    const extraData = message.extraData || {};
    
    return {
      type: 'reply',
      originalMessageId: extraData.originalMessageId,
      originalContent: extraData.originalContent || '',
      replyContent: message.content || '',
    };
  }
}

/**
 * 转发消息处理器
 */
class ForwardMessageProcessor implements MessageProcessor {
  messageType = MessageType.FORWARD;

  async process(message: any) {
    const extraData = message.extraData || {};
    
    return {
      type: 'forward',
      originalMessageId: extraData.originalMessageId,
      originalSenderId: extraData.originalSenderId,
      originalSenderName: extraData.originalSenderName || '',
      forwardTime: extraData.forwardTime || Date.now(),
    };
  }
}

/**
 * 系统消息处理器
 */
class SystemMessageProcessor implements MessageProcessor {
  messageType = MessageType.SYSTEM;

  async process(message: any) {
    const extraData = message.extraData || {};
    
    return {
      type: 'system',
      systemType: extraData.systemType || 'info',
      message: message.content || '',
      data: extraData.data || {},
    };
  }
}

/**
 * 消息处理器注册表
 */
const messageProcessors: Record<MessageType, MessageProcessor> = {
  [MessageType.TEXT]: new TextMessageProcessor(),
  [MessageType.IMAGE]: new ImageMessageProcessor(),
  [MessageType.VOICE]: new VoiceMessageProcessor(),
  [MessageType.VIDEO]: new VideoMessageProcessor(),
  [MessageType.FILE]: new FileMessageProcessor(),
  [MessageType.LINK]: new LinkMessageProcessor(),
  [MessageType.LOCATION]: new LocationMessageProcessor(),
  [MessageType.EMOJI]: new EmojiMessageProcessor(),
  [MessageType.MENTION]: new MentionMessageProcessor(),
  [MessageType.GROUP_TEXT]: new TextMessageProcessor(),
  [MessageType.GROUP_IMAGE]: new ImageMessageProcessor(),
  [MessageType.GROUP_LINK]: new LinkMessageProcessor(),
  [MessageType.GROUP_FILE]: new FileMessageProcessor(),
  [MessageType.COMMAND]: new CommandMessageProcessor(),
  [MessageType.SYSTEM]: new SystemMessageProcessor(),
  [MessageType.REPLY]: new ReplyMessageProcessor(),
  [MessageType.FORWARD]: new ForwardMessageProcessor(),
  [MessageType.UNKNOWN]: new TextMessageProcessor(),
  [MessageType.NOTIFICATION]: new SystemMessageProcessor(),
  [MessageType.CALLBACK]: new SystemMessageProcessor(),
  [MessageType.FAVORITE]: new SystemMessageProcessor(),
  [MessageType.GROUP_CARD]: new SystemMessageProcessor(),
  [MessageType.GROUP_INVITE]: new SystemMessageProcessor(),
};

/**
 * 处理消息
 */
export async function processMessage(message: any, messageType: MessageType) {
  const processor = messageProcessors[messageType];
  
  if (!processor) {
    console.warn(`未找到消息类型 ${messageType} 的处理器，使用文本处理器`);
    return await new TextMessageProcessor().process(message);
  }
  
  try {
    return await processor.process(message);
  } catch (error) {
    console.error(`处理消息 ${messageType} 失败:`, error);
    throw error;
  }
}

/**
 * 获取支持的处理器列表
 */
export function getSupportedProcessors(): MessageType[] {
  return Object.keys(messageProcessors) as MessageType[];
}

/**
 * 注册自定义消息处理器
 */
export function registerMessageProcessor(messageType: MessageType, processor: MessageProcessor) {
  messageProcessors[messageType] = processor;
}
