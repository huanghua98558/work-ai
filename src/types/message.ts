/**
 * 消息类型定义
 */
export enum MessageType {
  // 基础消息类型
  TEXT = 'text',                    // 文本消息
  IMAGE = 'image',                  // 图片消息
  VOICE = 'voice',                  // 语音消息
  VIDEO = 'video',                  // 视频消息
  FILE = 'file',                    // 文件消息
  LINK = 'link',                    // 链接消息
  LOCATION = 'location',            // 位置消息
  EMOJI = 'emoji',                  // 表情消息
  MENTION = 'mention',              // @消息
  
  // 群聊相关
  GROUP_TEXT = 'group_text',        // 群文本消息
  GROUP_IMAGE = 'group_image',      // 群图片消息
  GROUP_LINK = 'group_link',        // 群链接消息
  GROUP_FILE = 'group_file',        // 群文件消息
  GROUP_CARD = 'group_card',        // 群名片消息
  GROUP_INVITE = 'group_invite',    // 群邀请消息
  
  // 特殊消息类型
  SYSTEM = 'system',                // 系统消息
  COMMAND = 'command',              // 指令消息
  CALLBACK = 'callback',            // 回调消息
  NOTIFICATION = 'notification',    // 通知消息
  REPLY = 'reply',                  // 回复消息
  FORWARD = 'forward',              // 转发消息
  
  // 收藏消息
  FAVORITE = 'favorite',            // 收藏消息 (type=900)
  
  // 其他
  UNKNOWN = 'unknown',              // 未知消息
}

/**
 * 消息方向
 */
export enum MessageDirection {
  INCOMING = 'incoming',  // 接收消息（APP -> 服务器）
  OUTGOING = 'outgoing',  // 发送消息（服务器 -> APP）
}

/**
 * 消息状态
 */
export enum MessageStatus {
  PENDING = 'pending',    // 待处理
  PROCESSING = 'processing',  // 处理中
  SUCCESS = 'success',    // 成功
  FAILED = 'failed',      // 失败
}

/**
 * 基础消息接口
 */
export interface BaseMessage {
  id?: number;
  robotId: string;
  userId?: string;
  sessionId?: string;
  messageType: MessageType;
  content: string;
  extraData?: Record<string, any>;
  status: MessageStatus;
  direction: MessageDirection;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 文本消息
 */
export interface TextMessage extends BaseMessage {
  messageType: MessageType.TEXT;
  content: string;
}

/**
 * 图片消息
 */
export interface ImageMessage extends BaseMessage {
  messageType: MessageType.IMAGE;
  content: string;  // 图片URL
  extraData?: {
    width?: number;
    height?: number;
    format?: string;
  };
}

/**
 * 语音消息
 */
export interface VoiceMessage extends BaseMessage {
  messageType: MessageType.VOICE;
  content: string;  // 语音URL
  extraData?: {
    duration?: number;  // 时长（秒）
    format?: string;
  };
}

/**
 * 视频消息
 */
export interface VideoMessage extends BaseMessage {
  messageType: MessageType.VIDEO;
  content: string;  // 视频URL
  extraData?: {
    duration?: number;  // 时长（秒）
    width?: number;
    height?: number;
  };
}

/**
 * 文件消息
 */
export interface FileMessage extends BaseMessage {
  messageType: MessageType.FILE;
  content: string;  // 文件URL
  extraData?: {
    fileName?: string;
    fileSize?: number;  // 文件大小（字节）
    fileType?: string;
  };
}

/**
 * 链接消息
 */
export interface LinkMessage extends BaseMessage {
  messageType: MessageType.LINK;
  content: string;  // 链接URL
  extraData?: {
    title?: string;
    description?: string;
    thumbnail?: string;
  };
}

/**
 * 位置消息
 */
export interface LocationMessage extends BaseMessage {
  messageType: MessageType.LOCATION;
  content: string;  // 位置描述
  extraData?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

/**
 * @消息
 */
export interface MentionMessage extends BaseMessage {
  messageType: MessageType.MENTION;
  content: string;  // 消息内容
  extraData?: {
    mentionedUserIds?: string[];  // 被@的用户ID列表
  };
}

/**
 * 系统消息
 */
export interface SystemMessage extends BaseMessage {
  messageType: MessageType.SYSTEM;
  content: string;
}

/**
 * 指令消息
 */
export interface CommandMessage extends BaseMessage {
  messageType: MessageType.COMMAND;
  content: string;  // 指令内容
  extraData?: {
    command?: string;   // 指令名称
    args?: string[];    // 指令参数
  };
}

/**
 * 回复消息
 */
export interface ReplyMessage extends BaseMessage {
  messageType: MessageType.REPLY;
  content: string;
  extraData?: {
    repliedMessageId?: string;  // 回复的消息ID
    repliedTo?: string;         // 回复给谁
  };
}

/**
 * 消息上报请求
 */
export interface MessageReportRequest {
  robotId: string;
  messageId: string;
  messageType: MessageType;
  content: string;
  extraData?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
}

/**
 * 消息发送请求
 */
export interface MessageSendRequest {
  robotId?: string;
  userId?: string;
  sessionId?: string;
  messageType: MessageType;
  content: string;
  extraData?: Record<string, any>;
}
