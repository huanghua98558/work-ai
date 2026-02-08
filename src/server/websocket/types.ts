/**
 * WebSocket 消息类型定义
 * 基于 WorkBot WebSocket 通讯技术文档 v3.0
 */

/**
 * 消息类型常量
 */
export enum WSMessageType {
  // 认证相关
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',

  // 心跳相关
  HEARTBEAT = 'heartbeat',

  // 指令相关
  COMMAND_PUSH = 'command_push',
  RESULT = 'result',

  // 配置相关
  CONFIG_PUSH = 'config_push',

  // 状态相关
  STATUS_QUERY = 'status_query',
  STATUS_RESPONSE = 'status_response',

  // 错误
  ERROR = 'error',

  // 保留旧类型（兼容性）
  PING = 'ping',
  PONG = 'pong',
  MESSAGE = 'message',
  MESSAGE_ACK = 'message_ack',
  STATUS = 'status',
  STATUS_ACK = 'status_ack',
  COMMAND = 'command',
  AUTO_REPLY = 'auto_reply',
}

/**
 * 指令类型常量
 */
export enum CommandType {
  SEND_MESSAGE = 'send_message',           // 203
  FORWARD_MESSAGE = 'forward_message',     // 205
  CREATE_GROUP = 'create_group',           // 206
  UPDATE_GROUP = 'update_group',           // 207
  SEND_FILE = 'send_file',                 // 218
  DISSOLVE_GROUP = 'dissolve_group',       // 219
  SEND_FAVORITE = 'send_favorite',         // 900
}

/**
 * 指令编码映射
 */
export const COMMAND_CODE_MAP: Record<CommandType, number> = {
  [CommandType.SEND_MESSAGE]: 203,
  [CommandType.FORWARD_MESSAGE]: 205,
  [CommandType.CREATE_GROUP]: 206,
  [CommandType.UPDATE_GROUP]: 207,
  [CommandType.SEND_FILE]: 218,
  [CommandType.DISSOLVE_GROUP]: 219,
  [CommandType.SEND_FAVORITE]: 900,
};

/**
 * 配置类型常量
 */
export enum ConfigType {
  RISK_CONTROL = 'risk_control',
  REPLY_TEMPLATE = 'reply_template',
  BEHAVIOR_PATTERN = 'behavior_pattern',
  KEYWORD_FILTER = 'keyword_filter',
}

/**
 * 设备状态常量
 */
export enum DeviceStatus {
  RUNNING = 'running',
  IDLE = 'idle',
  ERROR = 'error',
}

/**
 * 指令状态常量
 */
export enum CommandStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

/**
 * 指令优先级常量
 */
export enum CommandPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

/**
 * 基础消息结构
 */
export interface WSMessage {
  type: string;
  data: any;
  timestamp: string | number;
  messageId?: string;
}

/**
 * 认证请求消息
 */
export interface AuthenticateRequestData {
  robotId: string;
  token: string;
  timestamp?: number;
}

export interface AuthenticateRequest extends WSMessage {
  type: WSMessageType.AUTHENTICATE;
  data: AuthenticateRequestData;
}

/**
 * 认证响应消息
 */
export interface AuthenticateResponseData {
  authenticated: boolean;
  robotId: string;
  deviceId?: string;
  userId?: number;
  timestamp?: number;
}

export interface AuthenticateResponse extends WSMessage {
  type: WSMessageType.AUTHENTICATED;
  data: AuthenticateResponseData;
}

/**
 * 心跳消息数据
 */
export interface HeartbeatData {
  robotId?: string;
  status?: DeviceStatus;
  battery?: number;
  signal?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkType?: string;
  timestamp?: number;
}

export interface HeartbeatMessage extends WSMessage {
  type: WSMessageType.HEARTBEAT;
  data: HeartbeatData;
}

/**
 * 指令推送消息
 */
export interface CommandPushData {
  commandId: string;
  commandType: CommandType;
  commandCode?: number;
  target?: string;
  params: Record<string, any>;
  priority?: CommandPriority;
}

export interface CommandPushMessage extends WSMessage {
  type: WSMessageType.COMMAND_PUSH;
  data: CommandPushData;
}

/**
 * 结果上报消息
 */
export interface ResultData {
  commandId: string;
  status: CommandStatus;
  result?: Record<string, any>;
  errorMessage?: string;
  executedAt: string | number;
}

export interface ResultMessage extends WSMessage {
  type: WSMessageType.RESULT;
  data: ResultData;
}

/**
 * 配置推送消息
 */
export interface ConfigPushData {
  robotId: string;
  configType: ConfigType;
  config: Record<string, any>;
  version: number;
}

export interface ConfigPushMessage extends WSMessage {
  type: WSMessageType.CONFIG_PUSH;
  data: ConfigPushData;
}

/**
 * 状态查询消息
 */
export interface StatusQueryData {
  queryId: string;
}

export interface StatusQueryMessage extends WSMessage {
  type: WSMessageType.STATUS_QUERY;
  data: StatusQueryData;
}

/**
 * 状态响应消息
 */
export interface DeviceInfo {
  robotId: string;
  deviceModel: string;
  androidVersion: string;
  battery: number;
  signal: number;
  memoryUsage: number;
  cpuUsage: number;
  networkType: string;
  weworkVersion: string;
}

export interface StatusResponseData {
  queryId: string;
  status: DeviceStatus;
  deviceInfo: DeviceInfo;
}

export interface StatusResponseMessage extends WSMessage {
  type: WSMessageType.STATUS_RESPONSE;
  data: StatusResponseData;
}

/**
 * 错误消息
 */
export interface ErrorData {
  code: number;
  message: string;
  details?: Record<string, any>;
  robotId?: string;
}

export interface ErrorMessage extends WSMessage {
  type: WSMessageType.ERROR;
  data: ErrorData;
}

/**
 * 消息类型守卫
 */
export function isAuthenticateMessage(msg: WSMessage): msg is AuthenticateRequest {
  return msg.type === WSMessageType.AUTHENTICATE;
}

export function isHeartbeatMessage(msg: WSMessage): msg is HeartbeatMessage {
  return msg.type === WSMessageType.HEARTBEAT;
}

export function isCommandPushMessage(msg: WSMessage): msg is CommandPushMessage {
  return msg.type === WSMessageType.COMMAND_PUSH;
}

export function isResultMessage(msg: WSMessage): msg is ResultMessage {
  return msg.type === WSMessageType.RESULT;
}

export function isConfigPushMessage(msg: WSMessage): msg is ConfigPushMessage {
  return msg.type === WSMessageType.CONFIG_PUSH;
}

export function isStatusQueryMessage(msg: WSMessage): msg is StatusQueryMessage {
  return msg.type === WSMessageType.STATUS_QUERY;
}

export function isStatusResponseMessage(msg: WSMessage): msg is StatusResponseMessage {
  return msg.type === WSMessageType.STATUS_RESPONSE;
}

export function isErrorMessage(msg: WSMessage): msg is ErrorMessage {
  return msg.type === WSMessageType.ERROR;
}
