import { MessageType } from '@/types/message';

/**
 * 判断是否为群消息
 */
export function isGroupMessage(messageType: MessageType): boolean {
  return [
    MessageType.GROUP_TEXT,
    MessageType.GROUP_IMAGE,
    MessageType.GROUP_LINK,
    MessageType.GROUP_FILE,
    MessageType.GROUP_CARD,
    MessageType.GROUP_INVITE,
  ].includes(messageType);
}

/**
 * 判断是否为媒体消息
 */
export function isMediaMessage(messageType: MessageType): boolean {
  return [
    MessageType.IMAGE,
    MessageType.VOICE,
    MessageType.VIDEO,
    MessageType.FILE,
  ].includes(messageType);
}

/**
 * 判断消息是否需要回复
 */
export function needsReply(messageType: MessageType): boolean {
  return [
    MessageType.TEXT,
    MessageType.IMAGE,
    MessageType.VOICE,
    MessageType.COMMAND,
  ].includes(messageType);
}

/**
 * 获取消息类型名称
 */
export function getMessageTypeName(messageType: MessageType): string {
  const names: Record<MessageType, string> = {
    [MessageType.TEXT]: '文本消息',
    [MessageType.IMAGE]: '图片消息',
    [MessageType.VOICE]: '语音消息',
    [MessageType.VIDEO]: '视频消息',
    [MessageType.FILE]: '文件消息',
    [MessageType.LINK]: '链接消息',
    [MessageType.LOCATION]: '位置消息',
    [MessageType.EMOJI]: '表情消息',
    [MessageType.MENTION]: '@消息',
    [MessageType.GROUP_TEXT]: '群文本消息',
    [MessageType.GROUP_IMAGE]: '群图片消息',
    [MessageType.GROUP_LINK]: '群链接消息',
    [MessageType.GROUP_FILE]: '群文件消息',
    [MessageType.GROUP_CARD]: '群名片消息',
    [MessageType.GROUP_INVITE]: '群邀请消息',
    [MessageType.SYSTEM]: '系统消息',
    [MessageType.COMMAND]: '指令消息',
    [MessageType.CALLBACK]: '回调消息',
    [MessageType.NOTIFICATION]: '通知消息',
    [MessageType.REPLY]: '回复消息',
    [MessageType.FORWARD]: '转发消息',
    [MessageType.FAVORITE]: '收藏消息',
    [MessageType.UNKNOWN]: '未知消息',
  };
  return names[messageType] || '未知消息';
}

/**
 * 验证消息类型
 */
export function validateMessageType(messageType: string): messageType is MessageType {
  return Object.values(MessageType).includes(messageType as MessageType);
}

/**
 * 生成消息ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 生成会话ID
 */
export function generateSessionId(robotId: string, userId?: string): string {
  return `session_${robotId}_${userId || 'default'}`;
}
