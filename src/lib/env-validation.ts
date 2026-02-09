/**
 * 环境变量验证模块
 *
 * 使用 Zod 进行环境变量验证，确保所有必需的环境变量都已正确配置
 */

import { z } from 'zod';

/**
 * 环境变量 Schema
 */
const envSchema = z.object({
  // Node 环境
  NODE_ENV: z.enum(['development', 'production', 'test'], {
    errorMap: () => ({ message: 'NODE_ENV 必须是 development, production 或 test' }),
  }),

  // 服务器配置
  PORT: z.string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),

  // 数据库配置
  DATABASE_URL: z.string()
    .url({ message: 'DATABASE_URL 必须是有效的 URL' })
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      { message: 'DATABASE_URL 必须是 PostgreSQL 连接字符串' }
    ),

  // JWT 配置
  JWT_SECRET: z.string()
    .min(32, { message: 'JWT_SECRET 必须至少 32 个字符以确保安全' })
    .max(256, { message: 'JWT_SECRET 不能超过 256 个字符' }),

  JWT_ACCESS_EXPIRES_IN: z.string()
    .default('24h')
    .refine(
      (val) => /^\d+[smhd]$/.test(val),
      { message: 'JWT_ACCESS_EXPIRES_IN 格式无效（例如: 1h, 24h, 7d）' }
    ),

  JWT_REFRESH_EXPIRES_IN: z.string()
    .default('7d')
    .refine(
      (val) => /^\d+[smhd]$/.test(val),
      { message: 'JWT_REFRESH_EXPIRES_IN 格式无效（例如: 1h, 24h, 7d）' }
    ),

  // WebSocket 配置
  WS_HEARTBEAT_INTERVAL: z.string()
    .default('30000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(5000).max(120000)),

  WS_MAX_CONNECTIONS: z.string()
    .default('1000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(10000)),

  // 可选：告警配置
  ALERT_ENABLED: z.string()
    .default('false')
    .transform((val) => val === 'true'),

  ALERT_WEBHOOK_URL: z.string().url().optional(),
  ALERT_EMAIL: z.string().optional(),

  // 可选：CORS 配置
  CORS_ORIGIN: z.string().default('*'),

  // 可选：API 限流配置
  RATE_LIMIT_ENABLED: z.string()
    .default('true')
    .transform((val) => val === 'true'),

  RATE_LIMIT_WINDOW_MS: z.string()
    .default('60000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1000)),

  RATE_LIMIT_MAX_REQUESTS: z.string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),
});

export type Env = z.infer<typeof envSchema>;

/**
 * 验证环境变量
 *
 * 在应用启动时调用，验证所有必需的环境变量
 * 如果验证失败，会打印错误信息并退出进程
 */
export function validateEnv(): Env {
  try {
    const validated = envSchema.parse(process.env);

    // 生产环境额外检查
    if (validated.NODE_ENV === 'production') {
      // JWT_SECRET 不能使用默认值
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error(
          '生产环境必须配置强 JWT_SECRET（至少 32 个字符）'
        );
      }

      // 检查 DATABASE_URL 是否包含敏感信息
      const dbUrl = validated.DATABASE_URL;
      if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
        console.warn(
          '⚠️  警告: 生产环境数据库 URL 使用 localhost，请确认是否正确'
        );
      }
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ 环境变量配置错误:');
      console.error('');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('');
      console.error('配置方式：');
      console.error('');
      console.error('📖 本地开发：');
      console.error('  在项目根目录创建 .env 文件并配置以上环境变量');
      console.error('');
      console.error('☁️  Coze 平台部署：');
      console.error('  1. 进入 Coze 平台项目设置');
      console.error('  2. 找到"环境变量"或"Secrets"配置页面');
      console.error('  3. 添加以下必需的环境变量：');
      console.error('     - DATABASE_URL: PostgreSQL 数据库连接字符串');
      console.error('     - JWT_SECRET: 至少 32 个字符的随机密钥');
      console.error('  4. 保存配置并重新部署');
      console.error('');
      console.error('📚 详细配置指南请查看：COZE_ENV_SETUP.md');
    } else {
      console.error('❌ 环境变量验证失败:', error instanceof Error ? error.message : error);
    }

    process.exit(1);
  }
}

/**
 * 获取环境变量（带缓存）
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * 开发环境检查
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * 生产环境检查
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * 测试环境检查
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}
