/**
 * WebSocket 客户端自动重连示例
 * 用于 WorkTool App 的 WebSocket 连接管理
 */

/**
 * WebSocket 客户端配置
 */
export interface WSClientConfig {
  url: string; // WebSocket 服务器地址，如：ws://localhost:5000/ws
  robotId: string; // 机器人 ID
  token: string; // JWT Token
  heartbeatInterval?: number; // 心跳间隔（毫秒），默认 30000
  maxReconnectAttempts?: number; // 最大重连次数，默认 5
  reconnectDelay?: number; // 重连延迟（毫秒），默认 5000
  enableAutoReconnect?: boolean; // 是否启用自动重连，默认 true
  debug?: boolean; // 是否开启调试模式，默认 false
}

/**
 * WebSocket 消息类型
 */
export enum WSMessageType {
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  HEARTBEAT = 'heartbeat',
  HEARTBEAT_ACK = 'heartbeat_ack',
  HEARTBEAT_WARNING = 'heartbeat_warning',
  COMMAND_PUSH = 'command_push',
  RESULT = 'result',
  ERROR = 'error',
}

/**
 * WebSocket 消息接口
 */
export interface WSMessage {
  type: WSMessageType | string;
  data: any;
  timestamp: number | string;
  messageId?: string;
}

/**
 * 事件类型
 */
export type WSEventType =
  | 'open'
  | 'close'
  | 'error'
  | 'authenticated'
  | 'heartbeat'
  | 'heartbeat_ack'
  | 'heartbeat_warning'
  | 'message'
  | 'reconnecting'
  | 'reconnect_failed';

/**
 * 事件回调
 */
export type WSEventCallback = (data?: any) => void;

/**
 * WebSocket 客户端类
 */
export class WSClient {
  private config: Required<WSClientConfig>;
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;
  private isAuthenticated = false;
  private eventHandlers: Map<WSEventType, WSEventCallback[]> = new Map();

  constructor(config: WSClientConfig) {
    this.config = {
      url: config.url,
      robotId: config.robotId,
      token: config.token,
      heartbeatInterval: config.heartbeatInterval || 30000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 5000,
      enableAutoReconnect: config.enableAutoReconnect !== false,
      debug: config.debug || false,
    };
  }

  /**
   * 连接到服务器
   */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      this.log('WebSocket 已连接或正在连接');
      return;
    }

    this.log(`正在连接到 ${this.config.url}...`);

    try {
      this.ws = new WebSocket(this.config.url);

      // 连接打开
      this.ws.onopen = () => {
        this.log('WebSocket 连接成功');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('open');

        // 发送认证消息
        this.authenticate();
      };

      // 收到消息
      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          this.log('解析消息失败:', error);
        }
      };

      // 连接关闭
      this.ws.onclose = (event) => {
        this.log(`WebSocket 连接关闭: code=${event.code}, reason=${event.reason}`);
        this.isConnected = false;
        this.isAuthenticated = false;
        this.stopHeartbeat();
        this.emit('close', { code: event.code, reason: event.reason });

        // 自动重连
        if (this.config.enableAutoReconnect && event.code !== 1000) {
          this.scheduleReconnect();
        }
      };

      // 连接错误
      this.ws.onerror = (error) => {
        this.log('WebSocket 连接错误:', error);
        this.emit('error', error);
      };
    } catch (error) {
      this.log('创建 WebSocket 连接失败:', error);
      this.emit('error', error);

      // 自动重连
      if (this.config.enableAutoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.log('主动断开 WebSocket 连接');
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.isAuthenticated = false;
  }

  /**
   * 发送认证消息
   */
  private authenticate(): void {
    const authMessage: WSMessage = {
      type: WSMessageType.AUTHENTICATE,
      data: {
        robotId: this.config.robotId,
        token: this.config.token,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.send(authMessage);
    this.log('已发送认证消息');
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat(): void {
    const heartbeatMessage: WSMessage = {
      type: WSMessageType.HEARTBEAT,
      data: {
        robotId: this.config.robotId,
        status: 'running',
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.send(heartbeatMessage);
    this.log('已发送心跳');
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.sendHeartbeat();
      }
    }, this.config.heartbeatInterval);

    this.log(`心跳已启动，间隔: ${this.config.heartbeatInterval}ms`);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      this.log('心跳已停止');
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(message: WSMessage): void {
    this.log(`收到消息: type=${message.type}`);

    switch (message.type) {
      case WSMessageType.AUTHENTICATED:
        this.isAuthenticated = true;
        this.emit('authenticated', message.data);
        this.log('认证成功');
        this.startHeartbeat();
        break;

      case WSMessageType.HEARTBEAT_ACK:
        this.emit('heartbeat_ack', message.data);
        this.log('收到心跳 ACK');
        break;

      case WSMessageType.HEARTBEAT_WARNING:
        this.emit('heartbeat_warning', message.data);
        this.log('收到心跳警告:', message.data);
        break;

      case WSMessageType.COMMAND_PUSH:
        this.emit('message', message);
        this.log('收到指令:', message.data);
        break;

      case WSMessageType.ERROR:
        this.log('收到错误消息:', message.data);
        this.emit('error', message.data);
        break;

      default:
        this.emit('message', message);
        this.log('收到未知消息类型:', message.type);
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log(`重连失败，已达到最大重连次数 (${this.config.maxReconnectAttempts})`);
      this.emit('reconnect_failed');
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * this.reconnectAttempts; // 指数退避

    this.log(
      `${delay / 1000}秒后重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );
    this.emit('reconnecting', { attempt: this.reconnectAttempts, maxAttempts: this.config.maxReconnectAttempts });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * 发送消息
   */
  send(message: WSMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('WebSocket 未连接，无法发送消息');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.log('发送消息失败:', error);
      return false;
    }
  }

  /**
   * 发送结果上报
   */
  sendResult(commandId: string, status: 'success' | 'failed', result?: any, errorMessage?: string): boolean {
    const message: WSMessage = {
      type: WSMessageType.RESULT,
      data: {
        commandId,
        status,
        result,
        errorMessage,
        executedAt: Date.now(),
      },
      timestamp: Date.now(),
    };

    return this.send(message);
  }

  /**
   * 注册事件监听器
   */
  on(event: WSEventType, callback: WSEventCallback): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: WSEventType, callback: WSEventCallback): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: WSEventType, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          this.log(`事件处理器错误 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 获取连接状态
   */
  getStatus(): {
    connected: boolean;
    authenticated: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * 日志输出
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WSClient]', ...args);
    }
  }
}

/**
 * 使用示例
 */
export function createWSClientExample() {
  const client = new WSClient({
    url: 'ws://localhost:5000/ws',
    robotId: 'robot123',
    token: 'your-jwt-token',
    debug: true,
  });

  // 监听连接打开
  client.on('open', () => {
    console.log('✅ WebSocket 已连接');
  });

  // 监听认证成功
  client.on('authenticated', (data) => {
    console.log('✅ 认证成功:', data);
  });

  // 监听心跳 ACK
  client.on('heartbeat_ack', (data) => {
    console.log('💓 心跳 ACK:', data);
  });

  // 监听心跳警告
  client.on('heartbeat_warning', (data) => {
    console.warn('⚠️ 心跳警告:', data);
  });

  // 监听重连中
  client.on('reconnecting', (data) => {
    console.log('🔄 正在重连...', data);
  });

  // 监听重连失败
  client.on('reconnect_failed', () => {
    console.error('❌ 重连失败，请检查网络连接');
  });

  // 监听消息
  client.on('message', (message) => {
    console.log('📨 收到消息:', message);

    // 如果是指令推送，处理指令
    if (message.type === WSMessageType.COMMAND_PUSH) {
      const { commandId, commandType, params } = message.data;

      console.log(`处理指令: ${commandId}, 类型: ${commandType}`);

      // 模拟执行指令
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% 成功率

        if (success) {
          client.sendResult(commandId, 'success', { result: 'OK' });
        } else {
          client.sendResult(commandId, 'failed', undefined, '模拟失败');
        }
      }, 1000);
    }
  });

  // 监听错误
  client.on('error', (error) => {
    console.error('❌ WebSocket 错误:', error);
  });

  // 监听连接关闭
  client.on('close', (data) => {
    console.log('🔌 连接关闭:', data);
  });

  // 启动连接
  client.connect();

  // 30分钟后主动断开
  setTimeout(() => {
    console.log('30分钟已过，主动断开连接');
    client.disconnect();
  }, 30 * 60 * 1000);

  return client;
}

// 导出客户端类和示例
export { WSClient };
export default WSClient;
