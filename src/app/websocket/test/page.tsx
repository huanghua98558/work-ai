'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WebSocketTestPage() {
  const { toast } = useToast();
  const [wsAddress, setWsAddress] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // 动态生成 WebSocket 地址
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5000';
    const address = `${protocol}//${host}/ws`;
    setWsAddress(address);
    addLog(`当前页面地址: ${window.location.href}`);
    addLog(`WebSocket 地址: ${address}`);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testConnection = () => {
    if (!wsAddress) {
      toast({
        title: '错误',
        description: 'WebSocket 地址未生成',
        variant: 'destructive',
      });
      return;
    }

    addLog(`开始连接到 ${wsAddress}...`);
    setConnectionStatus('connecting');

    // 创建 WebSocket 连接（不携带认证信息，仅测试连接）
    const socket = new WebSocket(wsAddress);

    socket.onopen = () => {
      addLog('WebSocket 连接成功！');
      setConnectionStatus('connected');
      toast({
        title: '连接成功',
        description: 'WebSocket 服务器正常运行',
        variant: 'success',
      });
      // 1 秒后关闭连接
      setTimeout(() => {
        socket.close();
      }, 1000);
    };

    socket.onmessage = (event) => {
      addLog(`收到消息: ${event.data}`);
    };

    socket.onerror = (error) => {
      addLog('WebSocket 连接失败（这可能是因为需要认证）');
      addLog('注意：实际连接需要携带 robotId 和 token 参数');
      setConnectionStatus('failed');
    };

    socket.onclose = (event) => {
      addLog(`连接关闭: code=${event.code}, reason=${event.reason || '无'}`);
      if (connectionStatus === 'connecting') {
        setConnectionStatus('failed');
      } else {
        setConnectionStatus('idle');
      }
      setWs(null);
    };

    setWs(socket);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyAddress = () => {
    if (wsAddress) {
      navigator.clipboard.writeText(wsAddress);
      toast({
        title: '复制成功',
        description: 'WebSocket 地址已复制到剪贴板',
        variant: 'success',
      });
    }
  };

  const getFullAddress = () => {
    const params = new URLSearchParams({
      robotId: 'YOUR_ROBOT_ID',
      token: 'YOUR_TOKEN',
    });
    return `${wsAddress}?${params.toString()}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            WebSocket 连接测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            测试 WebSocket 服务器连接状态
          </p>
        </div>

        {/* WebSocket 地址卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              WebSocket 地址
            </CardTitle>
            <CardDescription>
              根据当前页面环境自动生成的 WebSocket 连接地址
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <code className="text-sm text-gray-900 dark:text-white break-all">
                  {wsAddress || '生成中...'}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyAddress}
                  disabled={!wsAddress}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                完整连接地址（带认证参数）
              </h4>
              <code className="text-xs text-blue-800 dark:text-blue-200 break-all block">
                {getFullAddress()}
              </code>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={testConnection}
                disabled={connectionStatus === 'connecting'}
                className="flex-1"
              >
                {connectionStatus === 'connecting' ? (
                  <>连接中...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    测试连接
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={clearLogs}
              >
                清除日志
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 连接状态卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>连接状态</CardTitle>
            <CardDescription>当前 WebSocket 连接状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  connectionStatus === 'connected'
                    ? 'bg-green-100 dark:bg-green-900'
                    : connectionStatus === 'connecting'
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : connectionStatus === 'failed'
                    ? 'bg-red-100 dark:bg-red-900'
                    : 'bg-gray-100 dark:bg-gray-900'
                }`}
              >
                {connectionStatus === 'connected' ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : connectionStatus === 'connecting' ? (
                  <Wifi className="h-6 w-6 text-blue-600 animate-pulse" />
                ) : connectionStatus === 'failed' ? (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                ) : (
                  <Wifi className="h-6 w-6 text-gray-600" />
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">状态</div>
                <div className="text-lg font-semibold">
                  {connectionStatus === 'connected' ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      已连接
                    </Badge>
                  ) : connectionStatus === 'connecting' ? (
                    <Badge variant="default" className="bg-blue-100 text-blue-800">
                      连接中
                    </Badge>
                  ) : connectionStatus === 'failed' ? (
                    <Badge variant="destructive">连接失败</Badge>
                  ) : (
                    <Badge variant="outline">未连接</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 连接日志 */}
        <Card>
          <CardHeader>
            <CardTitle>连接日志</CardTitle>
            <CardDescription>WebSocket 连接过程日志</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="text-sm text-green-400 font-mono mb-1">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  点击&quot;测试连接&quot;开始测试
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              使用说明
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200">
                <strong>重要提示：</strong>
              </p>
              <ul className="list-disc list-inside mt-2 text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>当前地址根据页面环境自动生成（HTTP → ws://，HTTPS → wss://）</li>
                <li>实际连接时需要携带 <code>robotId</code> 和 <code>token</code> 参数</li>
                <li>测试连接可能失败，因为缺少认证参数，这是正常现象</li>
                <li>只要服务器响应就说明 WebSocket 服务正常运行</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
