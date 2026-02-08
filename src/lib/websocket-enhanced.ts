/**
 * WebSocket 增强工具
 *
 * 提供消息队列、自动重连、离线消息缓存等功能
 */

export interface WSMessage {
  type: string;
  data?: any;
  messageId?: string;
  timestamp: number;
}

export interface WSMessageQueue {
  messages: WSMessage[];
  maxSize: number;
  onFull?: 'drop_oldest' | 'drop_newest' | 'error';
}

export interface WSConnectionEnhanced {
  // 原有连接属性
  ws: any;
  robotId: string;
  userId: number | null;
  deviceId: string;
  lastHeartbeat: number;
  connectedAt: number;

  // 新增属性
  messageQueue: WSMessage[];
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  messageQueueMaxSize: number;
}

/**
 * 消息队列管理器
 */
export class MessageQueueManager {
  private queues: Map<string, WSMessageQueue> = new Map();
  private readonly defaultMaxSize = 100;

  /**
   * 创建消息队列
   */
  createQueue(robotId: string, maxSize: number = this.defaultMaxSize): void {
    this.queues.set(robotId, {
      messages: [],
      maxSize,
      onFull: 'drop_oldest',
    });
  }

  /**
   * 添加消息到队列
   */
  addMessage(robotId: string, message: WSMessage): boolean {
    const queue = this.queues.get(robotId);

    if (!queue) {
      console.warn(`[MessageQueue] 队列不存在: ${robotId}`);
      return false;
    }

    // 检查队列是否已满
    if (queue.messages.length >= queue.maxSize) {
      switch (queue.onFull) {
        case 'drop_oldest':
          queue.messages.shift();
          break;
        case 'drop_newest':
          return false;
        case 'error':
          console.error(`[MessageQueue] 队列已满: ${robotId}`);
          return false;
      }
    }

    queue.messages.push(message);
    return true;
  }

  /**
   * 获取并清空队列中的所有消息
   */
  drainQueue(robotId: string): WSMessage[] {
    const queue = this.queues.get(robotId);

    if (!queue) {
      return [];
    }

    const messages = [...queue.messages];
    queue.messages = [];

    return messages;
  }

  /**
   * 获取队列大小
   */
  getQueueSize(robotId: string): number {
    const queue = this.queues.get(robotId);
    return queue ? queue.messages.length : 0;
  }

  /**
   * 移除队列
   */
  removeQueue(robotId: string): void {
    this.queues.delete(robotId);
  }

  /**
   * 清空所有队列
   */
  clearAll(): void {
    this.queues.clear();
  }
}

/**
 * WebSocket 心跳增强
 */
export class HeartbeatManager {
  private static instance: HeartbeatManager;
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private missedBeats: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): HeartbeatManager {
    if (!HeartbeatManager.instance) {
      HeartbeatManager.instance = new HeartbeatManager();
    }
    return HeartbeatManager.instance;
  }

  /**
   * 启动心跳监控
   */
  startHeartbeat(
    robotId: string,
    ws: any,
    onTimeout: () => void,
    interval: number = 20000, // 默认20秒
    timeout: number = 60000 // 默认60秒
  ): void {
    // 清除现有的心跳
    this.stopHeartbeat(robotId);

    let lastPingTime = Date.now();
    let beatCount = 0;

    const heartbeatInterval = setInterval(() => {
      try {
        // 检查连接状态
        if (ws.readyState !== 1) {
          this.stopHeartbeat(robotId);
          onTimeout();
          return;
        }

        // 发送 ping
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now(),
          sequence: beatCount,
        }));

        beatCount++;
        lastPingTime = Date.now();

        // 记录发送时间
        const missed = this.missedBeats.get(robotId) || 0;
        this.missedBeats.set(robotId, missed);

      } catch (error) {
        console.error(`[Heartbeat] 发送心跳失败 (${robotId}):`, error);
        this.stopHeartbeat(robotId);
        onTimeout();
      }
    }, interval);

    this.heartbeatIntervals.set(robotId, heartbeatInterval);
    console.log(`[Heartbeat] 启动心跳监控: ${robotId}, 间隔: ${interval}ms`);
  }

  /**
   * 处理 pong 响应
   */
  handlePong(robotId: string): void {
    const missed = this.missedBeats.get(robotId) || 0;
    this.missedBeats.set(robotId, Math.max(0, missed - 1));
  }

  /**
   * 检查是否超时
   */
  isTimeout(robotId: string): boolean {
    const missed = this.missedBeats.get(robotId) || 0;
    return missed > 3; // 连续3次未响应视为超时
  }

  /**
   * 停止心跳
   */
  stopHeartbeat(robotId: string): void {
    const interval = this.heartbeatIntervals.get(robotId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(robotId);
      this.missedBeats.delete(robotId);
      console.log(`[Heartbeat] 停止心跳监控: ${robotId}`);
    }
  }

  /**
   * 停止所有心跳
   */
  stopAll(): void {
    this.heartbeatIntervals.forEach((interval, robotId) => {
      clearInterval(interval);
      console.log(`[Heartbeat] 停止心跳监控: ${robotId}`);
    });
    this.heartbeatIntervals.clear();
    this.missedBeats.clear();
  }
}

/**
 * 消息发送器（带队列）
 */
export class MessageSender {
  private queueManager: MessageQueueManager;
  private sending: Map<string, boolean> = new Map();

  constructor(queueManager: MessageQueueManager) {
    this.queueManager = queueManager;
  }

  /**
   * 发送消息（如果连接断开，加入队列）
   */
  send(robotId: string, ws: any, message: WSMessage): boolean {
    // 检查连接状态
    if (ws.readyState !== 1) {
      // 连接断开，加入队列
      console.warn(`[MessageSender] 连接断开，加入队列: ${robotId}`);
      return this.queueManager.addMessage(robotId, message);
    }

    // 正在发送中，加入队列
    if (this.sending.get(robotId)) {
      return this.queueManager.addMessage(robotId, message);
    }

    try {
      // 标记为发送中
      this.sending.set(robotId, true);

      // 发送消息
      ws.send(JSON.stringify(message));

      // 标记为发送完成
      this.sending.set(robotId, false);

      // 检查是否有队列消息待发送
      this.flushQueue(robotId, ws);

      return true;
    } catch (error) {
      console.error(`[MessageSender] 发送失败:`, error);
      this.sending.set(robotId, false);
      // 发送失败，加入队列
      return this.queueManager.addMessage(robotId, message);
    }
  }

  /**
   * 刷新队列（发送队列中的所有消息）
   */
  flushQueue(robotId: string, ws: any): void {
    if (ws.readyState !== 1) {
      return;
    }

    const messages = this.queueManager.drainQueue(robotId);
    if (messages.length === 0) {
      return;
    }

    console.log(`[MessageSender] 刷新队列: ${robotId}, ${messages.length} 条消息`);

    messages.forEach((message, index) => {
      setTimeout(() => {
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`[MessageSender] 刷新队列消息失败 (${index}):`, error);
          // 发送失败，重新加入队列
          this.queueManager.addMessage(robotId, message);
        }
      }, index * 10); // 每条消息间隔10ms，避免拥塞
    });
  }

  /**
   * 获取队列统计
   */
  getQueueStats(robotId: string): { size: number; isSending: boolean } {
    return {
      size: this.queueManager.getQueueSize(robotId),
      isSending: this.sending.get(robotId) || false,
    };
  }
}

/**
 * 自动重连管理器
 */
export class ReconnectManager {
  private reconnecting: Set<string> = new Set();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private attempts: Map<string, number> = new Map();

  /**
   * 启动自动重连
   */
  startReconnect(
    robotId: string,
    connectFn: () => Promise<boolean>,
    options: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
    } = {}
  ): void {
    if (this.reconnecting.has(robotId)) {
      console.log(`[Reconnect] 已在重连中: ${robotId}`);
      return;
    }

    const {
      maxAttempts = 5,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
    } = options;

    let attempt = 0;
    let delay = initialDelay;

    const reconnect = async (): Promise<void> => {
      if (attempt >= maxAttempts) {
        console.error(`[Reconnect] 重连失败，已达最大尝试次数: ${robotId}`);
        this.stopReconnect(robotId);
        return;
      }

      attempt++;
      this.attempts.set(robotId, attempt);

      console.log(`[Reconnect] 第 ${attempt} 次尝试重连: ${robotId}, 延迟: ${delay}ms`);

      try {
        const success = await connectFn();

        if (success) {
          console.log(`[Reconnect] 重连成功: ${robotId}`);
          this.stopReconnect(robotId);
          return;
        }

        // 重连失败，继续重试
        scheduleNextRetry();

      } catch (error) {
        console.error(`[Reconnect] 重连异常:`, error);
        scheduleNextRetry();
      }
    };

    const scheduleNextRetry = (): void => {
      // 计算下次延迟（指数退避）
      delay = Math.min(delay * backoffMultiplier, maxDelay);

      const timer = setTimeout(reconnect, delay);
      this.timers.set(robotId, timer);
    };

    this.reconnecting.add(robotId);
    reconnect();
  }

  /**
   * 停止重连
   */
  stopReconnect(robotId: string): void {
    const timer = this.timers.get(robotId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(robotId);
    }
    this.reconnecting.delete(robotId);
    this.attempts.delete(robotId);
    console.log(`[Reconnect] 停止重连: ${robotId}`);
  }

  /**
   * 检查是否正在重连
   */
  isReconnecting(robotId: string): boolean {
    return this.reconnecting.has(robotId);
  }

  /**
   * 获取重连尝试次数
   */
  getAttempts(robotId: string): number {
    return this.attempts.get(robotId) || 0;
  }

  /**
   * 停止所有重连
   */
  stopAll(): void {
    this.timers.forEach((timer, robotId) => {
      clearTimeout(timer);
      console.log(`[Reconnect] 停止重连: ${robotId}`);
    });
    this.reconnecting.clear();
    this.timers.clear();
    this.attempts.clear();
  }
}

/**
 * WebSocket 统计信息
 */
export class WebSocketStats {
  private stats: Map<string, {
    connectedAt: number;
    messagesSent: number;
    messagesReceived: number;
    bytesSent: number;
    bytesReceived: number;
    lastMessageTime: number;
  }> = new Map();

  /**
   * 记录连接
   */
  recordConnection(robotId: string): void {
    this.stats.set(robotId, {
      connectedAt: Date.now(),
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      lastMessageTime: Date.now(),
    });
  }

  /**
   * 记录消息发送
   */
  recordMessageSent(robotId: string, message: WSMessage): void {
    const stat = this.stats.get(robotId);
    if (stat) {
      stat.messagesSent++;
      stat.bytesSent += JSON.stringify(message).length;
      stat.lastMessageTime = Date.now();
    }
  }

  /**
   * 记录消息接收
   */
  recordMessageReceived(robotId: string, message: WSMessage): void {
    const stat = this.stats.get(robotId);
    if (stat) {
      stat.messagesReceived++;
      stat.bytesReceived += JSON.stringify(message).length;
      stat.lastMessageTime = Date.now();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(robotId: string): any | null {
    const stat = this.stats.get(robotId);
    if (!stat) {
      return null;
    }

    return {
      connectedAt: stat.connectedAt,
      connectedDuration: Date.now() - stat.connectedAt,
      messagesSent: stat.messagesSent,
      messagesReceived: stat.messagesReceived,
      bytesSent: stat.bytesSent,
      bytesReceived: stat.bytesReceived,
      lastMessageTime: stat.lastMessageTime,
      lastMessageAge: Date.now() - stat.lastMessageTime,
    };
  }

  /**
   * 移除统计信息
   */
  removeStats(robotId: string): void {
    this.stats.delete(robotId);
  }

  /**
   * 获取所有统计信息
   */
  getAllStats(): Map<string, any> {
    const allStats = new Map();
    this.stats.forEach((stat, robotId) => {
      allStats.set(robotId, this.getStats(robotId));
    });
    return allStats;
  }
}

// 导出单例
export const messageQueueManager = new MessageQueueManager();
export const heartbeatManager = HeartbeatManager.getInstance();
export const webSocketStats = new WebSocketStats();
