/**
 * 错误告警系统
 *
 * 用于捕获和发送错误告警通知
 */

export interface AlertConfig {
  enabled: boolean;
  webhookUrl?: string;
  email?: string[];
  environment?: string;
  appName?: string;
}

export interface Alert {
  level: 'error' | 'warning' | 'info';
  message: string;
  context?: any;
  timestamp: string;
  stack?: string;
}

export interface AlertResponse {
  success: boolean;
  error?: string;
}

class AlertManager {
  private config: AlertConfig;
  private alertQueue: Alert[] = [];
  private batchSendTimer: NodeJS.Timeout | null = null;
  private batchSize = 10;
  private batchInterval = 5000; // 5秒

  constructor() {
    this.config = {
      enabled: process.env.ALERT_ENABLED === 'true',
      webhookUrl: process.env.ALERT_WEBHOOK_URL,
      email: process.env.ALERT_EMAIL?.split(',').map(e => e.trim()),
      environment: process.env.NODE_ENV || 'development',
      appName: 'WorkBot',
    };
  }

  /**
   * 发送告警
   */
  async sendAlert(level: Alert['level'], message: string, context?: any): Promise<AlertResponse> {
    if (!this.config.enabled) {
      return { success: true };
    }

    const alert: Alert = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    // 添加堆栈信息（如果是错误）
    if (context instanceof Error) {
      alert.stack = context.stack;
    }

    // 添加到队列
    this.alertQueue.push(alert);

    console.error(`[Alert] ${level.toUpperCase()}:`, message, context);

    // 如果队列达到批量大小，立即发送
    if (this.alertQueue.length >= this.batchSize) {
      await this.flushAlertQueue();
    } else if (!this.batchSendTimer) {
      // 设置定时批量发送
      this.batchSendTimer = setTimeout(() => {
        this.flushAlertQueue();
      }, this.batchInterval);
    }

    return { success: true };
  }

  /**
   * 刷新告警队列
   */
  private async flushAlertQueue(): Promise<void> {
    if (this.alertQueue.length === 0) {
      return;
    }

    const alerts = [...this.alertQueue];
    this.alertQueue = [];

    if (this.batchSendTimer) {
      clearTimeout(this.batchSendTimer);
      this.batchSendTimer = null;
    }

    try {
      // 发送到 Webhook
      if (this.config.webhookUrl) {
        await this.sendToWebhook(alerts);
      }

      // 发送邮件（待实现）
      if (this.config.email && this.config.email.length > 0) {
        await this.sendToEmail(alerts);
      }

      console.log(`[Alert] 成功发送 ${alerts.length} 条告警`);
    } catch (error) {
      console.error('[Alert] 发送告警失败:', error);
      // 发送失败，重新加入队列
      this.alertQueue.unshift(...alerts);
    }
  }

  /**
   * 发送到 Webhook
   */
  private async sendToWebhook(alerts: Alert[]): Promise<void> {
    if (!this.config.webhookUrl) return;

    const payload = {
      app: this.config.appName,
      environment: this.config.environment,
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook 请求失败: ${response.status}`);
    }
  }

  /**
   * 发送到邮件（待实现）
   */
  private async sendToEmail(alerts: Alert[]): Promise<void> {
    if (!this.config.email || this.config.email.length === 0) return;

    // TODO: 实现邮件发送功能
    console.log('[Alert] 邮件发送功能待实现');
  }

  /**
   * 记录错误
   */
  error(message: string, error?: Error): Promise<AlertResponse> {
    return this.sendAlert('error', message, error);
  }

  /**
   * 记录警告
   */
  warning(message: string, context?: any): Promise<AlertResponse> {
    return this.sendAlert('warning', message, context);
  }

  /**
   * 记录信息
   */
  info(message: string, context?: any): Promise<AlertResponse> {
    return this.sendAlert('info', message, context);
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }
}

// 导出单例
export const alertManager = new AlertManager();

/**
 * 全局错误处理器
 */
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  // 捕获未处理的错误
  window.addEventListener('error', (event) => {
    alertManager.error(
      event.message || '未捕获的错误',
      event.error
    );
  });

  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    alertManager.error(
      '未处理的 Promise 拒绝',
      event.reason
    );
  });

  console.log('[Alert] 全局错误处理器已设置');
}

/**
 * API 错误包装器
 */
export async function withErrorAlert<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    await alertManager.error(
      `${operation} 失败`,
      error
    );
    throw error;
  }
}
