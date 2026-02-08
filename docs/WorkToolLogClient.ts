/**
 * WorkToolBot 日志远程调度客户端 SDK
 *
 * 提供日志上传、查询、配置和实时推送功能
 */

// ==================== 类型定义 ====================

export enum LogLevel {
  VERBOSE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  FAILED = 'failed',
  IGNORED = 'ignored',
}

export interface LogExtraInfo {
  operation?: string;
  target?: string;
  result?: any;
  apiUrl?: string;
  httpStatus?: number;
  latency?: number;
  batteryLevel?: number;
  networkType?: string;
  memoryUsage?: number;
  [key: string]: any;
}

export interface LogEntry {
  id: string;
  robotId: string;
  timestamp: number;
  level: LogLevel;
  tag: string;
  message: string;
  extra?: LogExtraInfo;
  stackTrace?: string;
  syncStatus: SyncStatus;
  syncTime?: number;
  deviceId?: string;
}

export interface LogConfig {
  robotId: string;
  logLevel: LogLevel;
  uploadEnabled: boolean;
  uploadInterval: number;
  uploadOnWifiOnly: boolean;
  maxLogEntries: number;
  retentionDays: number;
  tags: Record<string, LogLevel>;
  updatedAt: number;
}

export interface UploadLogsRequest {
  robotId: string;
  logs: Partial<LogEntry>[];
}

export interface UploadLogsResponse {
  success: boolean;
  message: string;
  data: {
    uploaded: number;
    failed: number;
    failedIds: string[];
  };
}

export interface QueryLogsRequest {
  robotId: string;
  level?: LogLevel;
  tag?: string;
  startTime?: number;
  endTime?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface QueryLogsResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    page: number;
    pageSize: number;
    logs: LogEntry[];
    totalPages: number;
  };
}

export interface GetLogConfigResponse {
  success: boolean;
  message: string;
  data: LogConfig;
}

export interface UpdateLogConfigRequest {
  robotId: string;
  logLevel?: LogLevel;
  uploadEnabled?: boolean;
  uploadInterval?: number;
  uploadOnWifiOnly?: boolean;
  maxLogEntries?: number;
  retentionDays?: number;
  tags?: Record<string, LogLevel>;
}

export interface UpdateLogConfigResponse {
  success: boolean;
  message: string;
  data: {
    configId: string;
    updatedAt: number;
  };
}

// ==================== 日志客户端 ====================

export class WorkToolLogClient {
  private baseUrl: string;
  private token: string;
  private robotId: string;

  constructor(config: { baseUrl: string; token: string; robotId: string }) {
    this.baseUrl = config.baseUrl;
    this.token = config.token;
    this.robotId = config.robotId;
  }

  /**
   * 批量上传日志
   */
  async uploadLogs(logs: Partial<LogEntry>[]): Promise<UploadLogsResponse> {
    const url = `${this.baseUrl}/api/v1/logs/upload`;
    const body: UploadLogsRequest = {
      robotId: this.robotId,
      logs,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'X-Robot-Id': this.robotId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 查询日志
   */
  async queryLogs(params: QueryLogsRequest): Promise<QueryLogsResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/logs/query`);
    url.searchParams.append('robotId', params.robotId || this.robotId);

    if (params.level !== undefined) {
      url.searchParams.append('level', params.level.toString());
    }
    if (params.tag) {
      url.searchParams.append('tag', params.tag);
    }
    if (params.startTime) {
      url.searchParams.append('startTime', params.startTime.toString());
    }
    if (params.endTime) {
      url.searchParams.append('endTime', params.endTime.toString());
    }
    if (params.keyword) {
      url.searchParams.append('keyword', params.keyword);
    }
    if (params.page) {
      url.searchParams.append('page', params.page.toString());
    }
    if (params.pageSize) {
      url.searchParams.append('pageSize', params.pageSize.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Robot-Id': this.robotId,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 获取日志配置
   */
  async getLogConfig(): Promise<GetLogConfigResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/logs/config`);
    url.searchParams.append('robotId', this.robotId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Robot-Id': this.robotId,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 更新日志配置
   */
  async updateLogConfig(
    config: Partial<UpdateLogConfigRequest>
  ): Promise<UpdateLogConfigResponse> {
    const url = `${this.baseUrl}/api/v1/logs/config`;
    const body: UpdateLogConfigRequest = {
      robotId: this.robotId,
      ...config,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'X-Robot-Id': this.robotId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

// ==================== WebSocket 日志流客户端 ====================

export class LogStreamClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private robotId: string;
  private messageHandlers: Map<string, (data: any) => void>;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;

  constructor(config: { baseUrl: string; token: string; robotId: string }) {
    const protocol = config.baseUrl.startsWith('https') ? 'wss' : 'ws';
    this.url = `${protocol}${config.baseUrl.replace(/^https?:\/\//, '')}/api/v1/logs/stream`;
    this.token = config.token;
    this.robotId = config.robotId;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * 连接 WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(this.url);
        wsUrl.searchParams.append('robotId', this.robotId);
        wsUrl.searchParams.append('token', this.token);

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          console.log('[LogStream] WebSocket 连接已建立');
          this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[LogStream] 消息解析失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[LogStream] WebSocket 连接已关闭:', event.code, event.reason);
          this.reconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[LogStream] WebSocket 错误:', error);
          reject(error);
        };

        // 监听认证成功消息
        this.on('authenticated', (data) => {
          console.log('[LogStream] 认证成功:', data);
          resolve();
        });

        // 超时处理
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket 连接超时'));
          }
        }, 30000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 发送消息
   */
  send(type: string, data?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.error('[LogStream] WebSocket 未连接');
    }
  }

  /**
   * 注册消息处理器
   */
  on(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 移除消息处理器
   */
  off(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * 订阅实时日志推送
   */
  subscribe(): void {
    this.send('subscribe', { robotId: this.robotId });
  }

  /**
   * 取消订阅
   */
  unsubscribe(): void {
    this.send('unsubscribe', { robotId: this.robotId });
  }

  /**
   * 处理消息
   */
  private handleMessage(message: any): void {
    const { type, data } = message;
    const handler = this.messageHandlers.get(type);

    if (handler) {
      handler(data);
    } else {
      console.log('[LogStream] 未处理的消息类型:', type);
    }
  }

  /**
   * 重连
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[LogStream] 达到最大重连次数，停止重连');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[LogStream] 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[LogStream] 重连失败:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }
}

// ==================== 导出 ====================

export default {
  WorkToolLogClient,
  LogStreamClient,
  LogLevel,
  SyncStatus,
};
