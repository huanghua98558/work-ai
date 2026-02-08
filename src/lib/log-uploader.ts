/**
 * 日志上传工具函数
 * 用于客户端（机器人端）上传日志到服务器
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  VERBOSE = 'VERBOSE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  timestamp?: number;
  extras?: any;
  stackTrace?: string;
}

/**
 * 日志上传请求接口
 */
export interface LogUploadRequest {
  robotId: string;
  deviceId?: string;
  logs: LogEntry[];
}

/**
 * 日志上传响应接口
 */
export interface LogUploadResponse {
  code: number;
  message: string;
  data: {
    successCount: number;
    failedCount: number;
    failedIds: number[];
  };
}

/**
 * 日志上传配置接口
 */
export interface LogUploaderConfig {
  /**
   * 服务器地址
   */
  serverUrl: string;
  /**
   * 机器人 ID
   */
  robotId: string;
  /**
   * 设备 ID（可选）
   */
  deviceId?: string;
  /**
   * 上传间隔（毫秒）
   */
  uploadInterval?: number;
  /**
   * 批量大小（每次上传的日志数量）
   */
  batchSize?: number;
  /**
   * 最大重试次数
   */
  maxRetries?: number;
  /**
   * 是否仅 WiFi 上传
   */
  wifiOnly?: boolean;
}

/**
 * 日志上传器类
 */
export class LogUploader {
  private config: Required<LogUploaderConfig>;
  private logBuffer: LogEntry[] = [];
  private uploadTimer: NodeJS.Timeout | null = null;
  private isUploading = false;
  private retryCount = 0;

  constructor(config: LogUploaderConfig) {
    this.config = {
      serverUrl: config.serverUrl,
      robotId: config.robotId,
      deviceId: config.deviceId || '',
      uploadInterval: config.uploadInterval || 300000, // 默认 5 分钟
      batchSize: config.batchSize || 100, // 默认每批 100 条
      maxRetries: config.maxRetries || 3,
      wifiOnly: config.wifiOnly || false,
    };
  }

  /**
   * 添加日志到缓冲区
   */
  public addLog(level: LogLevel, tag: string, message: string, extras?: any): void {
    const logEntry: LogEntry = {
      level,
      tag,
      message,
      timestamp: Date.now(),
      extras,
    };

    this.logBuffer.push(logEntry);

    // 检查是否达到批量大小
    if (this.logBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * 立即上传所有缓冲的日志
   */
  public async flush(): Promise<void> {
    if (this.isUploading || this.logBuffer.length === 0) {
      return;
    }

    // 检查 WiFi 限制
    if (this.config.wifiOnly && !this.isWifiConnected()) {
      console.log('[LogUploader] 非 WiFi 环境，跳过上传');
      return;
    }

    this.isUploading = true;
    const logsToUpload = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const response = await this.uploadLogs(logsToUpload);

      if (response.code === 200) {
        console.log(`[LogUploader] 上传成功: ${response.data.successCount} 条`);

        // 检查是否有失败
        if (response.data.failedCount > 0) {
          console.warn(`[LogUploader] 上传失败: ${response.data.failedCount} 条`, response.data.failedIds);
        }

        // 重置重试计数
        this.retryCount = 0;
      } else {
        throw new Error(response.message);
      }

    } catch (error: any) {
      console.error('[LogUploader] 上传失败:', error);

      // 重试失败的日志
      this.retryCount++;
      if (this.retryCount <= this.config.maxRetries) {
        console.log(`[LogUploader] 重试上传 (${this.retryCount}/${this.config.maxRetries})`);
        this.logBuffer = [...logsToUpload, ...this.logBuffer];
        setTimeout(() => this.flush(), 1000 * this.retryCount);
      } else {
        console.error('[LogUploader] 上传失败，已达最大重试次数');
      }

    } finally {
      this.isUploading = false;
    }
  }

  /**
   * 上传日志到服务器
   */
  private async uploadLogs(logs: LogEntry[]): Promise<LogUploadResponse> {
    const requestBody: LogUploadRequest = {
      robotId: this.config.robotId,
      deviceId: this.config.deviceId,
      logs,
    };

    const response = await fetch(`${this.config.serverUrl}/api/v1/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * 启动定时上传
   */
  public start(): void {
    if (this.uploadTimer) {
      console.warn('[LogUploader] 定时器已启动');
      return;
    }

    console.log(`[LogUploader] 启动定时上传，间隔: ${this.config.uploadInterval}ms`);

    this.uploadTimer = setInterval(() => {
      this.flush();
    }, this.config.uploadInterval);
  }

  /**
   * 停止定时上传
   */
  public stop(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
      console.log('[LogUploader] 定时上传已停止');
    }
  }

  /**
   * 销毁上传器（上传剩余日志并停止定时器）
   */
  public async destroy(): Promise<void> {
    this.stop();
    await this.flush();
    console.log('[LogUploader] 上传器已销毁');
  }

  /**
   * 检查是否连接 WiFi
   * (需要根据实际平台实现)
   */
  private isWifiConnected(): boolean {
    // 这里需要根据实际平台实现
    // 例如：使用navigator.connection API 或平台特定的网络状态 API
    return true;
  }

  /**
   * 获取缓冲区大小
   */
  public getBufferSize(): number {
    return this.logBuffer.length;
  }
}

/**
 * 便捷方法：直接上传日志
 */
export async function uploadLogs(
  robotId: string,
  logs: LogEntry[],
  deviceId?: string,
  serverUrl: string = 'http://localhost:5000'
): Promise<LogUploadResponse> {
  const requestBody: LogUploadRequest = {
    robotId,
    deviceId,
    logs,
  };

  const response = await fetch(`${serverUrl}/api/v1/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * 便捷方法：查询日志
 */
export async function queryLogs(
  robotId: string,
  options: {
    level?: LogLevel | number;
    limit?: number;
    offset?: number;
  } = {},
  serverUrl: string = 'http://localhost:5000'
): Promise<any> {
  const params = new URLSearchParams();
  params.append('robotId', robotId);

  if (options.level !== undefined) {
    params.append('level', options.level.toString());
  }

  if (options.limit !== undefined) {
    params.append('limit', options.limit.toString());
  }

  if (options.offset !== undefined) {
    params.append('offset', options.offset.toString());
  }

  const response = await fetch(`${serverUrl}/api/v1/logs?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}
