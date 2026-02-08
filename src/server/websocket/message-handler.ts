/**
 * WebSocket 消息处理器
 * 负责处理各种类型的 WebSocket 消息
 */

import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { commandQueue } from './command-queue';
import { configManager } from './config-manager';
import {
  WSMessage,
  WSMessageType,
  AuthenticateRequest,
  AuthenticateResponse,
  HeartbeatMessage,
  ResultMessage,
  ConfigPushMessage,
  StatusQueryMessage,
  StatusResponseMessage,
  ErrorMessage,
  isAuthenticateMessage,
  isHeartbeatMessage,
  isResultMessage,
  isConfigPushMessage,
  isStatusQueryMessage,
  CommandPushData,
  CommandPriority,
  ConfigType,
} from './types';
import { getPool } from '@/lib/db';

export interface WebSocketConnection {
  ws: WebSocket;
  robotId?: string;
  userId?: number;
  deviceId?: string;
  authenticated: boolean;
  lastHeartbeatAt?: Date;
}

export interface MessageHandler {
  (message: WSMessage, connection: WebSocketConnection): Promise<void>;
}

/**
 * 消息处理器类
 */
export class MessageHandlerImpl {
  private handlers: Map<WSMessageType, MessageHandler> = new Map();

  constructor() {
    this.registerHandlers();
  }

  /**
   * 注册消息处理器
   */
  private registerHandlers(): void {
    // 认证消息
    this.handlers.set(WSMessageType.AUTHENTICATE, this.handleAuthenticate.bind(this));

    // 心跳消息
    this.handlers.set(WSMessageType.HEARTBEAT, this.handleHeartbeat.bind(this));

    // 兼容旧版本：ping 消息
    this.handlers.set(WSMessageType.PING, this.handlePing.bind(this));

    // 结果上报消息
    this.handlers.set(WSMessageType.RESULT, this.handleResult.bind(this));

    // 状态查询消息
    this.handlers.set(WSMessageType.STATUS_QUERY, this.handleStatusQuery.bind(this));
  }

  /**
   * 处理消息
   */
  async handleMessage(message: WSMessage, connection: WebSocketConnection): Promise<void> {
    const handler = this.handlers.get(message.type as WSMessageType);

    if (!handler) {
      console.warn(`[MessageHandler] 未知的消息类型: ${message.type}`);
      this.sendError(connection, 400, `未知的消息类型: ${message.type}`);
      return;
    }

    try {
      await handler(message, connection);
    } catch (error) {
      console.error('[MessageHandler] 处理消息失败:', error);
      this.sendError(connection, 500, '消息处理失败', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理认证消息
   */
  private async handleAuthenticate(message: WSMessage, connection: WebSocketConnection): Promise<void> {
    console.log('[MessageHandler] 处理认证消息...');

    const authMessage = message as AuthenticateRequest;

    if (!authMessage.data || !authMessage.data.robotId || !authMessage.data.token) {
      this.sendError(connection, 401, '认证参数不完整');
      return;
    }

    const { robotId, token } = authMessage.data;

    try {
      // 验证 JWT Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
        id: number;
        robotId: string;
      };

      // 验证 robotId 是否匹配
      if (decoded.robotId !== robotId) {
        this.sendError(connection, 403, 'robotId 不匹配');
        return;
      }

      // 查询激活信息
      const poolInstance = await getPool();
      const client = await poolInstance.connect();

      try {
        const result = await client.query(
          'SELECT robot_id, user_id, device_id, status FROM device_activations WHERE robot_id = $1 AND status = $2',
          [robotId, 'active']
        );

        if (result.rows.length === 0) {
          this.sendError(connection, 404, '设备未激活或已失效');
          return;
        }

        const activation = result.rows[0];

        // 更新连接信息
        connection.robotId = robotId;
        connection.userId = activation.user_id;
        connection.deviceId = activation.device_id;
        connection.authenticated = true;

        // 发送认证成功响应
        this.sendAuthenticated(connection, true, robotId, activation.device_id, activation.user_id);

        console.log(`[MessageHandler] 认证成功: ${robotId}`);

        // 推送待处理的指令
        await this.pushPendingCommands(connection);
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        this.sendError(connection, 401, '无效的 Token');
      } else if (error instanceof jwt.TokenExpiredError) {
        this.sendError(connection, 401, 'Token 已过期');
      } else {
        console.error('[MessageHandler] 认证失败:', error);
        this.sendError(connection, 500, '认证失败');
      }
    }
  }

  /**
   * 处理心跳消息
   */
  private async handleHeartbeat(message: WSMessage, connection: WebSocketConnection): Promise<void> {
    if (!connection.authenticated || !connection.robotId) {
      this.sendError(connection, 401, '未认证');
      return;
    }

    const heartbeat = message as HeartbeatMessage;
    const { data } = heartbeat;

    // 更新最后心跳时间
    connection.lastHeartbeatAt = new Date();

    // 更新设备状态到数据库
    try {
      const poolInstance = await getPool();
      const client = await poolInstance.connect();

      try {
        await client.query(
          `INSERT INTO device_status (
            robot_id, status, device_info, battery, signal,
            memory_usage, cpu_usage, network_type, last_heartbeat_at, last_updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (robot_id) DO UPDATE SET
            status = EXCLUDED.status,
            device_info = EXCLUDED.device_info,
            battery = EXCLUDED.battery,
            signal = EXCLUDED.signal,
            memory_usage = EXCLUDED.memory_usage,
            cpu_usage = EXCLUDED.cpu_usage,
            network_type = EXCLUDED.network_type,
            last_heartbeat_at = EXCLUDED.last_heartbeat_at,
            last_updated_at = EXCLUDED.last_updated_at`,
          [
            connection.robotId,
            data.status || 'idle',
            data ? JSON.stringify(data) : null,
            data.battery,
            data.signal,
            data.memoryUsage,
            data.cpuUsage,
            data.networkType,
            new Date(),
            new Date(),
          ]
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[MessageHandler] 更新设备状态失败:', error);
    }

    // 回复心跳（可选，根据文档不需要响应）
    console.log(`[MessageHandler] 收到心跳: ${connection.robotId}`);
  }

  /**
   * 处理 Ping 消息（兼容旧版本）
   */
  private async handlePing(message: WSMessage, connection: WebSocketConnection): Promise<void> {
    // 更新最后心跳时间
    connection.lastHeartbeatAt = new Date();

    // 回复 Pong
    this.sendMessage(connection, {
      type: WSMessageType.PONG,
      data: {},
      timestamp: Date.now(),
    });
  }

  /**
   * 处理结果上报消息
   */
  private async handleResult(message: WSMessage, connection: WebSocketConnection): Promise<void> {
    if (!connection.authenticated || !connection.robotId) {
      this.sendError(connection, 401, '未认证');
      return;
    }

    const resultMessage = message as ResultMessage;
    const { commandId, status, result, errorMessage, executedAt } = resultMessage.data;

    console.log(`[MessageHandler] 收到结果上报: ${commandId}, 状态: ${status}`);

    try {
      if (status === 'success') {
        await commandQueue.markSuccess(commandId, result);
      } else if (status === 'failed') {
        await commandQueue.markFailed(commandId, errorMessage || '执行失败');
      } else {
        console.warn(`[MessageHandler] 未知的结果状态: ${status}`);
      }
    } catch (error) {
      console.error('[MessageHandler] 处理结果上报失败:', error);
      this.sendError(connection, 500, '处理结果上报失败');
    }
  }

  /**
   * 处理状态查询消息
   */
  private async handleStatusQuery(message: WSMessage, connection: WebSocketConnection): Promise<void> {
    if (!connection.authenticated || !connection.robotId) {
      this.sendError(connection, 401, '未认证');
      return;
    }

    const queryMessage = message as StatusQueryMessage;
    const { queryId } = queryMessage.data;

    console.log(`[MessageHandler] 收到状态查询: ${queryId}`);

    try {
      // 从数据库查询设备状态
      const poolInstance = await getPool();
      const client = await poolInstance.connect();

      try {
        const result = await client.query(
          'SELECT * FROM device_status WHERE robot_id = $1',
          [connection.robotId]
        );

        if (result.rows.length > 0) {
          const status = result.rows[0];

          this.sendStatusResponse(connection, queryId, {
            status: status.status,
            deviceInfo: status.device_info,
          });
        } else {
          this.sendError(connection, 404, '设备状态不存在');
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[MessageHandler] 处理状态查询失败:', error);
      this.sendError(connection, 500, '处理状态查询失败');
    }
  }

  /**
   * 推送待处理的指令
   */
  private async pushPendingCommands(connection: WebSocketConnection): Promise<void> {
    if (!connection.robotId) {
      return;
    }

    const commands = commandQueue.getRobotCommands(connection.robotId);
    const pendingCommands = commands.filter(cmd => cmd.status === 'pending');

    console.log(`[MessageHandler] 推送 ${pendingCommands.length} 个待处理指令`);

    for (const command of pendingCommands) {
      try {
        await this.sendCommand(connection, command);
        await commandQueue.markExecuting(command.commandId);
      } catch (error) {
        console.error(`[MessageHandler] 推送指令失败: ${command.commandId}`, error);
      }
    }
  }

  /**
   * 发送认证响应
   */
  private sendAuthenticated(
    connection: WebSocketConnection,
    authenticated: boolean,
    robotId: string,
    deviceId?: string,
    userId?: number
  ): void {
    this.sendMessage(connection, {
      type: WSMessageType.AUTHENTICATED,
      data: {
        authenticated,
        robotId,
        deviceId,
        userId,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * 发送指令
   */
  private sendCommand(connection: WebSocketConnection, command: CommandPushData): void {
    this.sendMessage(connection, {
      type: WSMessageType.COMMAND_PUSH,
      data: command,
      timestamp: Date.now(),
    });
  }

  /**
   * 发送配置
   */
  sendConfig(connection: WebSocketConnection, config: any): void {
    this.sendMessage(connection, {
      type: WSMessageType.CONFIG_PUSH,
      data: config,
      timestamp: Date.now(),
    });
  }

  /**
   * 发送状态响应
   */
  private sendStatusResponse(connection: WebSocketConnection, queryId: string, data: any): void {
    this.sendMessage(connection, {
      type: WSMessageType.STATUS_RESPONSE,
      data: {
        queryId,
        ...data,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * 发送错误消息
   */
  private sendError(
    connection: WebSocketConnection,
    code: number,
    message: string,
    details?: Record<string, any>
  ): void {
    this.sendMessage(connection, {
      type: WSMessageType.ERROR,
      data: {
        code,
        message,
        details,
        robotId: connection.robotId,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * 发送消息
   */
  private sendMessage(connection: WebSocketConnection, message: WSMessage): void {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    } else {
      console.warn('[MessageHandler] WebSocket 连接未打开，无法发送消息');
    }
  }
}

// 导出消息处理器实例
export const messageHandler = new MessageHandlerImpl();
