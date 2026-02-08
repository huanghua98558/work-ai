import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users, activationCodes, robots, conversations, knowledgeBases } from '@/storage/database/shared/schema';
import { eq, count } from 'drizzle-orm';

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

/**
 * 系统全面检测 API
 * 测试所有功能和前后端联动
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: TestResult[] = [];

  const runTest = async (
    name: string,
    test: () => Promise<void | { isWarning: boolean; message?: string }>
  ): Promise<TestResult> => {
    const testStart = Date.now();
    try {
      const result = await test();
      const duration = Date.now() - testStart;
      if (result && (result as any).isWarning) {
        return {
          name,
          status: 'warning',
          message: (result as any).message || '需要授权',
          duration,
        };
      }
      return {
        name,
        status: 'success',
        message: '测试通过',
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - testStart;
      return {
        name,
        status: 'error',
        message: error.message || '测试失败',
        duration,
        details: error.stack,
      };
    }
  };

  // 1. 测试数据库连接
  results.push(
    await runTest('数据库连接', async () => {
      const db = await getDatabase();
      await db.execute(`SELECT 1`);
    })
  );

  // 2. 测试环境变量
  results.push(
    await runTest('环境变量检查', async () => {
      const requiredVars = ['DATABASE_URL', 'PGDATABASE_URL', 'JWT_SECRET'];
      const missingVars = requiredVars.filter(
        (v) => !process.env[v as keyof NodeJS.ProcessEnv]
      );
      if (missingVars.length > 0) {
        throw new Error(`缺少环境变量: ${missingVars.join(', ')}`);
      }
    })
  );

  // 3. 测试用户表
  results.push(
    await runTest('用户表', async () => {
      const db = await getDatabase();
      const result = await db.select({ count: count() }).from(users);
      console.log('[系统检测] 用户总数:', result[0].count);
    })
  );

  // 4. 测试激活码表
  results.push(
    await runTest('激活码表', async () => {
      const db = await getDatabase();
      const result = await db.select({ count: count() }).from(activationCodes);
      console.log('[系统检测] 激活码总数:', result[0].count);
    })
  );

  // 5. 测试机器人表
  results.push(
    await runTest('机器人表', async () => {
      const db = await getDatabase();
      const result = await db.select({ count: count() }).from(robots);
      console.log('[系统检测] 机器人总数:', result[0].count);
    })
  );

  // 6. 测试对话表
  results.push(
    await runTest('对话表', async () => {
      const db = await getDatabase();
      const result = await db.select({ count: count() }).from(conversations);
      console.log('[系统检测] 对话总数:', result[0].count);
    })
  );

  // 7. 测试知识库表
  results.push(
    await runTest('知识库表', async () => {
      const db = await getDatabase();
      const result = await db.select({ count: count() }).from(knowledgeBases);
      console.log('[系统检测] 知识库总数:', result[0].count);
    })
  );

  // 8. 测试管理员账号
  results.push(
    await runTest('管理员账号', async () => {
      const db = await getDatabase();
      const admins = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'));
      console.log('[系统检测] 管理员账号数:', admins.length);
      if (admins.length === 0) {
        throw new Error('未找到管理员账号');
      }
    })
  );

  // 9. 测试健康检查API
  results.push(
    await runTest('健康检查API', async () => {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/health`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`健康检查API返回 ${response.status}`);
      }
      const data = await response.json();
      console.log('[系统检测] 健康检查:', data);
    })
  );

  // 10. 测试部署检查API
  results.push(
    await runTest('部署检查API', async () => {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/debug/check-deploy`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`部署检查API返回 ${response.status}`);
      }
      const data = await response.json();
      console.log('[系统检测] 部署检查:', data);
    })
  );

  // 11. 测试WebSocket监控API
  results.push(
    await runTest('WebSocket监控API', async () => {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/websocket/monitor`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`WebSocket监控API返回 ${response.status}`);
      }
      const data = await response.json();
      console.log('[系统检测] WebSocket监控:', data);
    })
  );

  // 12. 测试管理员列表API
  results.push(
    await runTest('管理员列表API', async () => {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/users/admins`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`管理员列表API返回 ${response.status}`);
      }
      const data = await response.json();
      console.log('[系统检测] 管理员列表:', data);
    })
  );

  // 13. 测试激活码列表API（需要授权，401是警告）
  results.push(
    await runTest('激活码列表API', async () => {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/activation-codes`, {
        cache: 'no-store',
      });
      if (response.status === 401) {
        console.log('[系统检测] 激活码列表API需要授权（正常）');
        return { isWarning: true, message: '需要授权' };
      }
      if (!response.ok) {
        throw new Error(`激活码列表API返回 ${response.status}`);
      }
      const data = await response.json();
      console.log('[系统检测] 激活码列表:', data);
    })
  );

  // 14. 测试机器人列表API（需要授权，401是警告）
  results.push(
    await runTest('机器人列表API', async () => {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/robots`, {
        cache: 'no-store',
      });
      if (response.status === 401) {
        console.log('[系统检测] 机器人列表API需要授权（正常）');
        return { isWarning: true, message: '需要授权' };
      }
      if (!response.ok) {
        throw new Error(`机器人列表API返回 ${response.status}`);
      }
      const data = await response.json();
      console.log('[系统检测] 机器人列表:', data);
    })
  );

  // 15. 测试对话列表API（暂未实现，标记为警告）
  results.push(
    await runTest('对话列表API', async () => {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/conversations`, {
        cache: 'no-store',
      });
      if (response.status === 404) {
        console.log('[系统检测] 对话列表API暂未实现（正常）');
        return { isWarning: true, message: 'API暂未实现' };
      }
      if (response.status === 401) {
        console.log('[系统检测] 对话列表API需要授权（正常）');
        return { isWarning: true, message: '需要授权' };
      }
      if (!response.ok) {
        throw new Error(`对话列表API返回 ${response.status}`);
      }
      const data = await response.json();
      console.log('[系统检测] 对话列表:', data);
    })
  );

  // 16. 测试知识库列表API（暂未实现，标记为警告）
  results.push(
    await runTest('知识库列表API', async () => {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/knowledge-bases`, {
        cache: 'no-store',
      });
      if (response.status === 404) {
        console.log('[系统检测] 知识库列表API暂未实现（正常）');
        return { isWarning: true, message: 'API暂未实现' };
      }
      if (response.status === 401) {
        console.log('[系统检测] 知识库列表API需要授权（正常）');
        return { isWarning: true, message: '需要授权' };
      }
      if (!response.ok) {
        throw new Error(`知识库列表API返回 ${response.status}`);
      }
      const data = await response.json();
      console.log('[系统检测] 知识库列表:', data);
    })
  );

  // 17. 测试登录API
  results.push(
    await runTest('登录API', async () => {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: 'hh198752', password: 'hh198752' }),
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`登录API返回 ${response.status}`);
      }
      const data = await response.json();
      console.log('[系统检测] 登录测试:', data);
    })
  );

  // 生成报告
  const summary = {
    total: results.length,
    success: results.filter((r) => r.status === 'success').length,
    error: results.filter((r) => r.status === 'error').length,
    warning: results.filter((r) => r.status === 'warning').length,
  };

  const report: SystemTestReport = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      isDev: process.env.NODE_ENV === 'development',
      isProd: process.env.NODE_ENV === 'production',
    },
    tests: results,
    summary,
  };

  const totalDuration = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    report,
    totalDuration,
  });
}
