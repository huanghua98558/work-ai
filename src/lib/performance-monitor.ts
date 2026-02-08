/**
 * 性能监控系统
 *
 * 用于收集和分析应用性能指标
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceData {
  // 页面加载指标
  pageLoad: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  };
  // 资源加载指标
  resources: {
    totalSize: number;
    count: number;
    byType: Record<string, { count: number; size: number }>;
  };
  // API 请求指标
  api: {
    totalRequests: number;
    totalDuration: number;
    averageDuration: number;
    errors: number;
  };
  // 自定义指标
  custom: PerformanceMetric[];
}

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private apiRequests: Array<{ url: string; duration: number; status: number; timestamp: number }> = [];
  private customMetrics: PerformanceMetric[] = [];
  private initialized = false;

  /**
   * 初始化性能监控
   */
  init() {
    if (this.initialized) return;

    if (typeof window === 'undefined') return;

    // 监听页面加载性能
    if ('PerformanceObserver' in window) {
      // 监听核心 Web Vitals
      this.observeWebVitals();
      // 监听资源加载
      this.observeResources();
    }

    this.initialized = true;
    console.log('[PerformanceMonitor] 性能监控已启动');
  }

  /**
   * 监听核心 Web Vitals
   */
  private observeWebVitals() {
    // 监听 LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.recordMetric('lcp', lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('[PerformanceMonitor] 无法监听 LCP:', e);
      }
    }

    // 监听 FCP (First Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            this.recordMetric('fcp', fcpEntry.startTime);
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('[PerformanceMonitor] 无法监听 FCP:', e);
      }
    }
  }

  /**
   * 监听资源加载
   */
  private observeResources() {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const resourceType = entry.initiatorType;
          const size = entry.transferSize || entry.encodedBodySize || 0;

          this.recordMetric(`resource_${resourceType}_size`, size);
          this.recordMetric(`resource_${resourceType}_duration`, entry.duration);
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('[PerformanceMonitor] 无法监听资源:', e);
    }
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // 只保留最近的 100 个数据点
    if (values.length > 100) {
      values.shift();
    }

    // 同时记录到自定义指标
    this.customMetrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata,
    });

    // 限制自定义指标数量
    if (this.customMetrics.length > 1000) {
      this.customMetrics.shift();
    }
  }

  /**
   * 记录 API 请求
   */
  recordApiRequest(url: string, duration: number, status: number) {
    this.apiRequests.push({
      url,
      duration,
      status,
      timestamp: Date.now(),
    });

    // 记录成功/失败
    const metricName = status >= 200 && status < 300 ? 'api_success' : 'api_error';
    this.recordMetric(metricName, 1);
    this.recordMetric('api_duration', duration);

    // 只保留最近的 1000 条记录
    if (this.apiRequests.length > 1000) {
      this.apiRequests.shift();
    }
  }

  /**
   * 获取指标统计
   */
  getMetricStats(name: string): { avg: number; min: number; max: number; count: number; p50: number; p95: number; p99: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      avg: sorted.reduce((sum, v) => sum + v, 0) / count,
      min: sorted[0],
      max: sorted[count - 1],
      count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): Map<string, number[]> {
    return new Map(this.metrics);
  }

  /**
   * 获取性能数据摘要
   */
  getPerformanceData(): PerformanceData {
    // 页面加载指标
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    const pageLoad = {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
      firstPaint: this.getMetricStats('first-paint')?.avg || 0,
      firstContentfulPaint: this.getMetricStats('fcp')?.avg || 0,
      largestContentfulPaint: this.getMetricStats('lcp')?.avg || 0,
    };

    // 资源加载指标
    const resources = performance.getEntriesByType('resource') as any[];
    let totalSize = 0;
    const byType: Record<string, { count: number; size: number }> = {};

    resources.forEach((resource) => {
      const size = resource.transferSize || resource.encodedBodySize || 0;
      const type = resource.initiatorType;

      totalSize += size;

      if (!byType[type]) {
        byType[type] = { count: 0, size: 0 };
      }
      byType[type].count++;
      byType[type].size += size;
    });

    // API 请求指标
    const successfulRequests = this.apiRequests.filter(r => r.status >= 200 && r.status < 300);
    const failedRequests = this.apiRequests.filter(r => r.status >= 400);
    const totalDuration = this.apiRequests.reduce((sum, r) => sum + r.duration, 0);

    return {
      pageLoad,
      resources: {
        totalSize,
        count: resources.length,
        byType,
      },
      api: {
        totalRequests: this.apiRequests.length,
        totalDuration,
        averageDuration: this.apiRequests.length > 0 ? totalDuration / this.apiRequests.length : 0,
        errors: failedRequests.length,
      },
      custom: [...this.customMetrics],
    };
  }

  /**
   * 检查是否超过阈值
   */
  checkThreshold(name: string, threshold: number): boolean {
    const stats = this.getMetricStats(name);
    if (!stats) return false;

    return stats.avg > threshold;
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const data = this.getPerformanceData();

    return `
=== 性能报告 ===
生成时间: ${new Date().toISOString()}

页面加载性能:
  - DOM 加载完成: ${data.pageLoad.domContentLoaded.toFixed(2)}ms
  - 页面完全加载: ${data.pageLoad.loadComplete.toFixed(2)}ms
  - 首次绘制: ${data.pageLoad.firstPaint.toFixed(2)}ms
  - 首次内容绘制: ${data.pageLoad.firstContentfulPaint.toFixed(2)}ms
  - 最大内容绘制: ${data.pageLoad.largestContentfulPaint.toFixed(2)}ms

资源加载:
  - 总大小: ${(data.resources.totalSize / 1024 / 1024).toFixed(2)}MB
  - 资源数量: ${data.resources.count}

API 请求:
  - 总请求数: ${data.api.totalRequests}
  - 错误数: ${data.api.errors}
  - 平均响应时间: ${data.api.averageDuration.toFixed(2)}ms
`;
  }

  /**
   * 清除所有指标
   */
  clear() {
    this.metrics.clear();
    this.apiRequests = [];
    this.customMetrics = [];
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();

// 在客户端初始化
if (typeof window !== 'undefined') {
  // 在页面加载后初始化
  if (document.readyState === 'complete') {
    performanceMonitor.init();
  } else {
    window.addEventListener('load', () => {
      performanceMonitor.init();
    });
  }
}

/**
 * API 请求包装器（自动记录性能）
 */
export async function withPerformanceTracking<T>(
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let status = 200;

  try {
    const result = await fn();
    status = 200;
    return result;
  } catch (error: any) {
    status = error.status || 500;
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    performanceMonitor.recordApiRequest(url, duration, status);
  }
}
