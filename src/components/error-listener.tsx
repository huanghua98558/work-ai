'use client';

import { useEffect } from 'react';

/**
 * 全局错误监听器
 * 捕获并上报客户端运行时错误
 */
export function ErrorListener() {
  useEffect(() => {
    // 处理未捕获的 Promise 错误
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[未捕获的 Promise 错误]', event.reason);

      // 上报错误
      reportError({
        type: 'unhandledrejection',
        error: event.reason?.toString() || 'Unknown Promise rejection',
        stack: event.reason?.stack,
      });
    };

    // 处理全局错误
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[全局错误]', event.error);

      // 上报错误
      reportError({
        type: 'error',
        message: event.message,
        error: event.error?.toString(),
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return null;
}

/**
 * 上报错误到服务器
 */
async function reportError(errorData: any) {
  try {
    await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...errorData,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    // 如果上报失败，只在控制台记录
    console.error('[错误上报失败]', e);
  }
}
