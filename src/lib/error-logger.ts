import fs from 'fs';
import path from 'path';
import { AppError, ErrorLevel, ErrorCode } from './errors';

// 导出 ErrorLevel
export { ErrorLevel };

// 日志目录
const LOG_DIR = '/app/work/logs/bypass';

// 日志级别颜色
const COLORS = {
  debug: '\x1b[36m',    // 青色
  info: '\x1b[32m',     // 绿色
  warn: '\x1b[33m',     // 黄色
  error: '\x1b[31m',    // 红色
  critical: '\x1b[35m', // 紫色
  reset: '\x1b[0m',     // 重置
};

// 日志文件映射
const LOG_FILES = {
  debug: 'debug.log',
  info: 'info.log',
  warn: 'warn.log',
  error: 'error.log',
  critical: 'critical.log',
};

/**
 * 日志条目
 */
export interface LogEntry {
  level: ErrorLevel;
  code?: ErrorCode;
  message: string;
  details?: any;
  requestId?: string;
  userId?: number;
  robotId?: string;
  sessionId?: string;
  timestamp: Date;
  stack?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  statusCode?: number;
  responseTime?: number;
}

/**
 * 错误日志记录器
 */
export class ErrorLogger {
  private static instance: ErrorLogger;

  private constructor() {}

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * 记录日志
   */
  public log(entry: LogEntry): void {
    // 控制台输出（带颜色）
    this.logToConsole(entry);

    // 写入文件
    this.logToFile(entry);

    // 严重错误触发告警
    if (entry.level === ErrorLevel.CRITICAL) {
      this.triggerAlert(entry);
    }
  }

  /**
   * 记录错误
   */
  public logError(error: AppError | Error, context?: Partial<LogEntry>): void {
    let entry: LogEntry;

    if (error instanceof AppError) {
      entry = {
        level: error.level,
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: error.requestId,
        timestamp: error.timestamp,
        stack: error.stack,
        ...context,
      };
    } else {
      entry = {
        level: ErrorLevel.ERROR,
        code: ErrorCode.UNKNOWN_ERROR,
        message: error.message,
        timestamp: new Date(),
        stack: error.stack,
        ...context,
      };
    }

    this.log(entry);
  }

  /**
   * 记录调试信息
   */
  public debug(message: string, context?: Partial<LogEntry>): void {
    this.log({
      level: ErrorLevel.DEBUG,
      message,
      timestamp: new Date(),
      ...context,
    });
  }

  /**
   * 记录信息
   */
  public info(message: string, context?: Partial<LogEntry>): void {
    this.log({
      level: ErrorLevel.INFO,
      message,
      timestamp: new Date(),
      ...context,
    });
  }

  /**
   * 记录警告
   */
  public warn(message: string, context?: Partial<LogEntry>): void {
    this.log({
      level: ErrorLevel.WARN,
      message,
      timestamp: new Date(),
      ...context,
    });
  }

  /**
   * 控制台输出
   */
  private logToConsole(entry: LogEntry): void {
    const color = COLORS[entry.level];
    const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}]`;
    const context = this.formatContext(entry);
    const message = `${color}${prefix} ${entry.message}${COLORS.reset}${context}`;

    switch (entry.level) {
      case ErrorLevel.DEBUG:
        console.debug(message);
        break;
      case ErrorLevel.INFO:
        console.info(message);
        break;
      case ErrorLevel.WARN:
        console.warn(message);
        break;
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
        console.error(message);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * 写入文件
   */
  private logToFile(entry: LogEntry): void {
    try {
      const logFile = LOG_FILES[entry.level] || 'error.log';
      const filePath = path.join(LOG_DIR, logFile);
      const logLine = this.formatLogLine(entry);

      fs.appendFileSync(filePath, logLine + '\n');
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  /**
   * 格式化日志行
   */
  private formatLogLine(entry: LogEntry): string {
    const parts = [
      entry.timestamp.toISOString(),
      entry.level.toUpperCase(),
      entry.code || '',
      entry.message,
      entry.requestId || '',
      entry.userId || '',
      entry.robotId || '',
      entry.sessionId || '',
      entry.path || '',
      entry.method || '',
    ];

    // 添加详细信息
    if (entry.details) {
      parts.push(JSON.stringify(entry.details));
    }

    // 添加堆栈信息（仅错误级别）
    if (entry.stack && (entry.level === ErrorLevel.ERROR || entry.level === ErrorLevel.CRITICAL)) {
      parts.push(entry.stack.replace(/\n/g, ' '));
    }

    return parts.join(' | ');
  }

  /**
   * 格式化上下文
   */
  private formatContext(entry: LogEntry): string {
    const contextParts: string[] = [];

    if (entry.requestId) {
      contextParts.push(`reqId=${entry.requestId}`);
    }
    if (entry.userId) {
      contextParts.push(`userId=${entry.userId}`);
    }
    if (entry.robotId) {
      contextParts.push(`robotId=${entry.robotId}`);
    }
    if (entry.sessionId) {
      contextParts.push(`sessionId=${entry.sessionId}`);
    }
    if (entry.path) {
      contextParts.push(`path=${entry.path}`);
    }
    if (entry.method) {
      contextParts.push(`method=${entry.method}`);
    }

    return contextParts.length > 0 ? ` (${contextParts.join(', ')})` : '';
  }

  /**
   * 触发告警
   */
  private triggerAlert(entry: LogEntry): void {
    // TODO: 实现告警机制（邮件、短信、钉钉等）
    console.error(`🚨 CRITICAL ALERT: ${entry.message}`, entry);
  }

  /**
   * 获取最近的错误日志
   */
  public getRecentErrors(limit: number = 100): LogEntry[] {
    try {
      const filePath = path.join(LOG_DIR, LOG_FILES.error);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines
        .slice(-limit)
        .map(line => this.parseLogLine(line))
        .filter(entry => entry !== null) as LogEntry[];
    } catch (error) {
      console.error('读取错误日志失败:', error);
      return [];
    }
  }

  /**
   * 解析日志行
   */
  private parseLogLine(line: string): LogEntry | null {
    try {
      const parts = line.split(' | ');
      if (parts.length < 3) return null;

      return {
        timestamp: new Date(parts[0]),
        level: parts[1].toLowerCase() as ErrorLevel,
        code: parts[2] ? (parts[2] as ErrorCode) : undefined,
        message: parts[3] || '',
        requestId: parts[4] || undefined,
        details: parts[6] ? JSON.parse(parts[6]) : undefined,
      };
    } catch (error) {
      return null;
    }
  }
}

// 导出单例
export const logger = ErrorLogger.getInstance();
