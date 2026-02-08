'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw, Activity, Database, Server, Globe, Shield, Users, Key, MessageCircle, BookOpen, Zap } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  duration: number;
  details?: any;
}

interface SystemTestReport {
  timestamp: string;
  environment: {
    nodeEnv: string;
    isDev: boolean;
    isProd: boolean;
  };
  tests: TestResult[];
  summary: {
    total: number;
    success: number;
    error: number;
    warning: number;
  };
}

export default function SystemCheckPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SystemTestReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);

  const runSystemCheck = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch('/api/system/check', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`系统检测API返回 ${response.status}`);
      }

      const data = await response.json();
      setReport(data.report);
      setTotalDuration(data.totalDuration);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSystemCheck();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600">成功</Badge>;
      case 'error':
        return <Badge variant="destructive">失败</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-600">警告</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const getTestCategoryIcon = (name: string) => {
    if (name.includes('数据库') || name.includes('表')) return <Database className="h-5 w-5 text-blue-600" />;
    if (name.includes('API') || name.includes('接口')) return <Globe className="h-5 w-5 text-green-600" />;
    if (name.includes('WebSocket')) return <Zap className="h-5 w-5 text-yellow-600" />;
    if (name.includes('环境')) return <Server className="h-5 w-5 text-purple-600" />;
    if (name.includes('管理员') || name.includes('用户')) return <Users className="h-5 w-5 text-indigo-600" />;
    if (name.includes('激活码')) return <Key className="h-5 w-5 text-orange-600" />;
    if (name.includes('对话')) return <MessageCircle className="h-5 w-5 text-pink-600" />;
    if (name.includes('知识库')) return <BookOpen className="h-5 w-5 text-teal-600" />;
    if (name.includes('登录') || name.includes('认证')) return <Shield className="h-5 w-5 text-red-600" />;
    return <Activity className="h-5 w-5 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                正在检测系统...
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                请稍候，这可能需要几秒钟
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              系统全面检测
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              检测所有功能和前后端联动
            </p>
          </div>
          <Button onClick={runSystemCheck} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            重新检测
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900 dark:text-red-200">
                    检测失败
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {report && (
          <>
            {/* 环境信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-purple-600" />
                  环境信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      环境
                    </p>
                    <Badge variant={report.environment.isDev ? 'default' : 'secondary'}>
                      {report.environment.nodeEnv}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      检测时间
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(report.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      总耗时
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {totalDuration}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      检测状态
                    </p>
                    <Badge variant={report.summary.error === 0 ? 'default' : 'destructive'}>
                      {report.summary.error === 0 ? '通过' : '失败'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 检测摘要 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  检测摘要
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                      {report.summary.total}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      总检测项
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                      {report.summary.success}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      成功
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-900 dark:text-red-200">
                      {report.summary.error}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      失败
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">
                      {report.summary.warning}
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      警告
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 检测结果详情 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  检测结果详情
                </CardTitle>
                <CardDescription>
                  各项功能的检测结果
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.tests.map((test, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        test.status === 'success'
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                          : test.status === 'error'
                          ? 'border-red-200 bg-red-50 dark:bg-red-900/20'
                          : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-0.5">
                            {getTestCategoryIcon(test.name)}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {test.name}
                              </span>
                              {getStatusBadge(test.status)}
                            </div>
                            <div className="text-sm">
                              <p className="font-medium">消息：</p>
                              <p className="text-gray-700 dark:text-gray-300">
                                {test.message}
                              </p>
                            </div>
                            <div className="text-sm">
                              <p className="font-medium">耗时：</p>
                              <p className="text-gray-700 dark:text-gray-300">
                                {test.duration}ms
                              </p>
                            </div>
                            {test.details && (
                              <details className="text-sm">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                  查看详细信息
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-xs">
                                  {JSON.stringify(test.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          {getStatusIcon(test.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 检测总结 */}
            <Card>
              <CardHeader>
                <CardTitle>检测总结</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  {report.summary.error === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className="text-gray-900 dark:text-white">
                    {report.summary.error === 0
                      ? '所有检测项均通过，系统运行正常'
                      : `${report.summary.error} 个检测项失败，需要修复`}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-gray-900 dark:text-white">
                    数据库状态：{report.summary.success > 0 ? '正常' : '异常'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-gray-900 dark:text-white">
                    API接口状态：{' '}
                    {report.summary.error === 0 ? '正常' : '部分异常'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
