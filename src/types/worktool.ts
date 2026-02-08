/**
 * WorkTool 第三方平台类型定义
 */

/**
 * 消息回调类型
 */
export type CallbackType = 'message' | 'result' | 'qrcode' | 'online' | 'offline' | 'image';

/**
 * 消息回调请求体
 */
export interface MessageCallbackRequest {
  messageId: string;
  senderId: string;
  senderName: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'card';
  content: string;
  chatType: 'single' | 'group';
  extraData?: Record<string, any> | null;
  timestamp: string;
}

/**
 * 结果回调请求体
 */
export interface ResultCallbackRequest {
  commandId: string;
  commandType: string;
  status: 'success' | 'failed' | 'pending';
  result?: {
    message?: string;
    messageId?: string;
    [key: string]: any;
  };
  errorMessage?: string | null;
  executedAt: string;
}

/**
 * 二维码回调请求体
 */
export interface QRCodeCallbackRequest {
  groupChatId: string;
  qrcodeUrl: string;
  groupName: string;
  timestamp: string;
}

/**
 * 状态回调请求体
 */
export interface StatusCallbackRequest {
  status: 'online' | 'offline';
  deviceInfo?: {
    model: string;
    os: string;
    appVersion: string;
  };
  timestamp: string;
}

/**
 * 图片回调请求体
 */
export interface ImageCallbackRequest {
  messageId: string;
  senderId: string;
  senderName: string;
  imageUrl: string;
  imageBase64: string;
  timestamp: string;
}

/**
 * 统一回调响应
 */
export interface CallbackResponse {
  code: number;
  message: string;
  data?: {
    messageId?: string;
    robotId?: string;
    receivedAt?: string;
    commandId?: string;
    status?: string;
    updatedAt?: string;
    groupChatId?: string;
    qrcodeUrl?: string;
    imageUrl?: string;
  };
}

/**
 * 发送指令请求体
 */
export interface SendMessageRequest {
  robotId: string;
  commandType: string;
  params: {
    target: string;
    content: string;
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
  };
}

/**
 * 指令响应
 */
export interface CommandResponse {
  success: boolean;
  code: number;
  data: {
    commandId: string;
    status: 'pending' | 'success' | 'failed';
    createdAt: string;
  };
}

/**
 * 指令详情响应
 */
export interface CommandDetailResponse {
  success: boolean;
  code: number;
  data: {
    commandId: string;
    robotId: string;
    commandType: string;
    status: 'pending' | 'success' | 'failed';
    result?: {
      messageId?: string;
      [key: string]: any;
    };
    createdAt: string;
    executedAt?: string;
  };
}
