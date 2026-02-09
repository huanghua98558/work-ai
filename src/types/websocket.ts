/**
 * WebSocket 消息类型定义
 */

/**
 * 基础消息类型
 */
export interface BaseMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

/**
 * 认证消息
 */
export interface AuthenticateMessage extends BaseMessage {
  type: 'authenticate';
  data: {
    robotId: string;
    token: string;
    timestamp: number;
  };
}

/**
 * 认证成功消息
 */
export interface AuthenticatedMessage extends BaseMessage {
  type: 'authenticated';
  data: {
    authenticated: boolean;
    robotId: string;
    deviceId: string;
    userId: number;
    timestamp: number;
  };
}

/**
 * 心跳消息
 */
export interface PingMessage extends BaseMessage {
  type: 'ping';
  timestamp: number;
}

/**
 * 心跳响应消息
 */
export interface PongMessage extends BaseMessage {
  type: 'pong';
  timestamp: number;
}

/**
 * 上报消息
 */
export interface MessageMessage extends BaseMessage {
  type: 'message';
  data: {
    messageId: string;
    senderId: string;
    senderName: string;
    messageType: string;
    content: string;
    chatType: string;
    groupName?: string;
    timestamp: string;
    extraData?: any;
  };
}

/**
 * 消息确认
 */
export interface MessageAckMessage extends BaseMessage {
  type: 'message_ack';
  data: {
    messageId: string;
    timestamp: number;
  };
}

/**
 * 状态更新消息
 */
export interface StatusMessage extends BaseMessage {
  type: 'status';
  data: {
    status: string;
    lastSeenAt: string;
  };
}

/**
 * 状态确认
 */
export interface StatusAckMessage extends BaseMessage {
  type: 'status_ack';
  timestamp: number;
}

/**
 * 配置推送消息（服务器 → 客户端）
 */
export interface ConfigPushMessage extends BaseMessage {
  type: 'config_push';
  data: {
    robotId: string;
    configVersion: string;
    config: {
      aiMode?: string;
      aiProvider?: string;
      aiModel?: string;
      apiEndpoint?: string;
      apiKey?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      thirdPartyEnabled?: boolean;
      thirdPartyCallbackUrl?: string;
      thirdPartySecretKey?: string;
      thirdPartyFallbackEnabled?: boolean;
      [key: string]: any;
    };
    timestamp: number;
  };
}

/**
 * 配置确认消息（客户端 → 服务器）
 */
export interface ConfigAckMessage extends BaseMessage {
  type: 'config_ack';
  data: {
    robotId: string;
    configVersion: string;
    deviceId: string;
    timestamp: number;
  };
}

/**
 * 配置拒绝消息（客户端 → 服务器）
 */
export interface ConfigNackMessage extends BaseMessage {
  type: 'config_nack';
  data: {
    robotId: string;
    configVersion: string;
    deviceId: string;
    error: string;
    errorCode?: string;
    timestamp: number;
  };
}

/**
 * 第三方回调消息（服务器 → 客户端）
 */
export interface CallbackMessage extends BaseMessage {
  type: 'callback';
  data: {
    callbackId: string;
    callbackType: string;
    payload: any;
    timestamp: number;
  };
}

/**
 * 消息日志上报（客户端 → 服务器）
 */
export interface MessageLogMessage extends BaseMessage {
  type: 'message_log';
  data: {
    messageId: string;
    robotId: string;
    thirdPartyUrl: string;
    status: 'success' | 'failed';
    error?: string;
    reportedAt: string;
  };
}

/**
 * 错误消息
 */
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  data: {
    code: number;
    message: string;
  };
}

/**
 * 订阅消息
 */
export interface SubscribeMessage extends BaseMessage {
  type: 'subscribe';
  data: {
    robotId: string;
  };
}

/**
 * 订阅成功
 */
export interface SubscribedMessage extends BaseMessage {
  type: 'subscribed';
  message: string;
  data: {
    robotId: string;
    timestamp: number;
  };
}

/**
 * 取消订阅
 */
export interface UnsubscribeMessage extends BaseMessage {
  type: 'unsubscribe';
  data: {
    robotId: string;
  };
}

/**
 * 取消订阅成功
 */
export interface UnsubscribedMessage extends BaseMessage {
  type: 'unsubscribed';
  message: string;
  data: {
    robotId: string;
    timestamp: number;
  };
}

/**
 * 所有消息类型的联合类型
 */
export type WSMessage =
  | BaseMessage
  | AuthenticateMessage
  | AuthenticatedMessage
  | PingMessage
  | PongMessage
  | MessageMessage
  | MessageAckMessage
  | StatusMessage
  | StatusAckMessage
  | ConfigPushMessage
  | ConfigAckMessage
  | ConfigNackMessage
  | CallbackMessage
  | MessageLogMessage
  | ErrorMessage
  | SubscribeMessage
  | SubscribedMessage
  | UnsubscribeMessage
  | UnsubscribedMessage;

/**
 * 消息类型枚举
 */
export enum MessageType {
  // 认证相关
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  
  // 心跳
  PING = 'ping',
  PONG = 'pong',
  
  // 消息
  MESSAGE = 'message',
  MESSAGE_ACK = 'message_ack',
  
  // 状态
  STATUS = 'status',
  STATUS_ACK = 'status_ack',
  
  // 配置
  CONFIG_PUSH = 'config_push',
  CONFIG_ACK = 'config_ack',
  CONFIG_NACK = 'config_nack',
  
  // 第三方回调
  CALLBACK = 'callback',
  
  // 日志
  MESSAGE_LOG = 'message_log',
  
  // 订阅
  SUBSCRIBE = 'subscribe',
  SUBSCRIBED = 'subscribed',
  UNSUBSCRIBE = 'unsubscribe',
  UNSUBSCRIBED = 'unsubscribed',
  
  // 错误
  ERROR = 'error',
}
