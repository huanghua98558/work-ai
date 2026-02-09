import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import * as schema from "../storage/database/shared/schema";

// 延迟加载的数据库连接池
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;
let _connectionRetries = 0;
let _initializationPromise: Promise<{ pool: Pool; db: ReturnType<typeof drizzle> }> | null = null;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

// 从环境变量获取数据库连接字符串
function getConnectionString(): string {
  // 直接使用 process.env，不依赖 dotenv
  // Coze 平台等云平台会直接将环境变量注入到 process.env 中
  // 本地开发可以手动设置环境变量或使用 .env 文件（由用户自行加载）

  const connectionString = process.env.PGDATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL or PGDATABASE_URL environment variable is required");
  }

  return connectionString;
}

// 根据环境获取连接池配置
function getPoolConfig(): PoolConfig {
  const connectionString = getConnectionString();
  const env = process.env.NODE_ENV || 'development';

  // 根据环境调整连接池大小（优化内存使用）
  let maxConnections, minConnections;

  if (env === 'production') {
    // 生产环境：适中的连接池（减少内存占用）
    maxConnections = 20;
    minConnections = 5;
  } else if (env === 'development') {
    // 开发环境：较小的连接池
    maxConnections = 10;
    minConnections = 1;
  } else {
    // 测试环境：最小的连接池
    maxConnections = 5;
    minConnections = 1;
  }

  return {
    connectionString,
    max: maxConnections,
    min: minConnections,

    // 空闲连接超时（10秒后回收空闲连接，减少内存占用）
    idleTimeoutMillis: 10000,

    // 连接超时（10秒）
    connectionTimeoutMillis: 10000,

    // 查询超时（30秒）
    query_timeout: 30000,

    // 保持连接活跃
    keepAlive: true,

    // 连接活跃初始延迟（5秒）
    keepAliveInitialDelayMillis: 5000,

    // 应用名称（便于在数据库中识别连接）
    application_name: `workbot-${env}`,

    // SSL 配置（根据 DATABASE_URL 自动处理）
    ssl: process.env.DATABASE_URL?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  };
}

// 初始化数据库连接池（延迟执行，带重试）
async function initializeDatabase(retry: boolean = false): Promise<{ pool: Pool; db: ReturnType<typeof drizzle> }> {
  // 如果已经初始化，直接返回
  if (_pool && _db && _initializationPromise) {
    return { pool: _pool, db: _db };
  }

  // 如果正在初始化，等待初始化完成
  if (_initializationPromise) {
    return _initializationPromise;
  }

  // 开始初始化
  _initializationPromise = (async () => {
    const poolConfig = getPoolConfig();

    try {
      _pool = new Pool(poolConfig);

      // 监听连接池事件
      setupPoolEventListeners(_pool);

      // 测试连接
      await _pool.query('SELECT NOW()');

      console.log('[数据库] 连接池初始化成功', {
        max: poolConfig.max,
        min: poolConfig.min,
      });

      _db = drizzle(_pool, { schema });

      // 重置重试计数
      _connectionRetries = 0;

      return { pool: _pool, db: _db };

    } catch (error) {
      console.error('[数据库] 连接池初始化失败:', error);

      if (retry && _connectionRetries < MAX_RETRIES) {
        _connectionRetries++;
        console.log(`[数据库] 第 ${_connectionRetries} 次重试连接...`);

        // 清理失败的连接池
        if (_pool) {
          await _pool.end().catch(() => {});
          _pool = null;
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * _connectionRetries));

        return initializeDatabase(true);
      }

      throw new Error(`数据库连接失败（已重试 ${_connectionRetries} 次）: ${error}`);
    }
  })();

  try {
    return await _initializationPromise;
  } catch (error) {
    _initializationPromise = null;
    throw error;
  }
}

// 设置连接池事件监听器
function setupPoolEventListeners(pool: Pool) {
  pool.on('connect', (client) => {
    console.log('[数据库] 新连接已建立', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    });
  });

  pool.on('acquire', (client) => {
    console.debug('[数据库] 连接已从连接池获取');
  });

  pool.on('release', (client) => {
    console.debug('[数据库] 连接已释放回连接池');
  });

  pool.on('remove', (client) => {
    console.warn('[数据库] 连接已从连接池移除', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
    });
  });

  pool.on('error', (err) => {
    console.error('[数据库] 连接池错误:', err);
  });
}

// 获取数据库连接（异步，兼容现有代码）
export async function getDatabase(): Promise<ReturnType<typeof drizzle>> {
  const { db: database, pool } = await initializeDatabase();

  // 确保 database 不为 null
  if (!database) {
    throw new Error('数据库连接未初始化');
  }

  // 添加连接健康检查
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('[数据库] 连接健康检查失败:', error);

    // 尝试重新初始化连接池
    await closeDatabase();

    try {
      const { db: newDb } = await initializeDatabase();
      return newDb;
    } catch (retryError) {
      throw new Error('数据库连接失败，请检查网络和配置');
    }
  }

  return database;
}

// 检查数据库连接健康状态
export async function checkDatabaseHealth() {
  try {
    const { pool } = await initializeDatabase();
    const result = await pool.query('SELECT 1');

    // 获取连接池统计信息
    const stats = getPoolStats(pool);

    return {
      healthy: true,
      message: '数据库连接正常',
      stats,
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: `数据库连接失败: ${error.message}`,
      stats: null,
    };
  }
}

// 获取连接池统计信息
export function getPoolStats(pool?: Pool) {
  const connectionPool = pool || _pool;

  if (!connectionPool) {
    return null;
  }

  return {
    totalCount: connectionPool.totalCount,
    idleCount: connectionPool.idleCount,
    waitingCount: connectionPool.waitingCount,
  };
}

// 获取连接池供直接使用（异步）
export async function getPool(): Promise<Pool> {
  const { pool: connectionPool } = await initializeDatabase();
  return connectionPool;
}

// 同步获取连接池（用于紧急情况，如果未初始化会抛出错误）
export function getPoolSync(): Pool {
  if (!_pool) {
    throw new Error('数据库连接池未初始化，请先调用 getPool() 或 getDatabase()');
  }
  return _pool;
}

// 向后兼容的 pool 导出（延迟初始化）
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const connectionPool = _pool;
    if (!connectionPool) {
      // 如果连接池未初始化，抛出错误
      throw new Error('数据库连接池未初始化，请先调用 getPool() 或 getDatabase()');
    }
    return connectionPool[prop as keyof Pool];
  },
});

// 向后兼容的 db 导出（延迟初始化）
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const database = _db;
    if (!database) {
      throw new Error('数据库连接未初始化，请先调用 getDatabase()');
    }
    return database[prop as keyof typeof database];
  },
});

// 关闭连接池（用于应用关闭时）
export async function closeDatabase() {
  if (_pool) {
    console.log('[数据库] 正在关闭连接池...');
    await _pool.end();
    _pool = null;
    _db = null;
    _initializationPromise = null;
    console.log('[数据库] 连接池已关闭');
  }
}

// 优雅关闭（处理进程退出信号）
if (typeof process !== 'undefined') {
  const shutdown = async (signal: string) => {
    console.log(`\n[数据库] 收到 ${signal} 信号，开始关闭...`);
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
