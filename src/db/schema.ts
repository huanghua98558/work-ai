import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal } from 'drizzle-orm/pg-core'

// 用户表
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  nickname: varchar('nickname', { length: 100 }).notNull().default('未命名'),
  avatar: text('avatar'),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  role: varchar('role', { length: 20 }).notNull().default('user'), // admin, user
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, disabled
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
})

// 激活码表
export const activationCodes = pgTable('activation_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 8 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('unused'), // unused, used, expired, disabled
  validityPeriod: integer('validity_period').notNull(), // 有效期（天数）
  boundUserId: integer('bound_user_id'), // 绑定的用户ID
  price: decimal('price', { precision: 10, scale: 2 }), // 价格
  createdBy: integer('created_by'), // 创建人ID
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // 激活码过期时间
  usedAt: timestamp('used_at'), // 首次使用时间
  notes: text('notes'),
  robotId: varchar('robot_id'), // 绑定的机器人ID
  type: varchar('type', { length: 50 }).default('admin_dispatch'), // admin_dispatch, pure_code
  maxUses: integer('max_uses').default(1), // 最大使用次数
  usedCount: integer('used_count').default(0), // 已使用次数
})

// 机器人配置表
export const robots = pgTable('robots', {
  id: serial('id').primaryKey(),
  robotId: varchar('robot_id', { length: 255 }).notNull().unique(),
  robotUuid: varchar('robot_uuid', { length: 255 }).notNull().unique(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull().default('未命名机器人'),
  status: varchar('status', { length: 20 }).notNull().default('offline'), // online, offline, deleted
  
  // AI回复模式
  aiMode: varchar('ai_mode', { length: 20 }).notNull().default('builtin'), // builtin, third_party
  aiProvider: varchar('ai_provider', { length: 50 }), // doubao, deepseek, kimi, custom
  aiModel: varchar('ai_model', { length: 100 }),
  aiApiKey: text('ai_api_key'),
  aiTemperature: decimal('ai_temperature', { precision: 3, scale: 2 }).default('0.7'),
  aiMaxTokens: integer('ai_max_tokens').default(2000),
  aiContextLength: integer('ai_context_length').default(10), // 上下文保留条数
  aiScenario: varchar('ai_scenario', { length: 50 }), // 咨询, 问答, 闲聊, 售后, 社群管理
  
  // 第三方平台配置
  thirdPartyCallbackUrl: text('third_party_callback_url'),
  thirdPartyResultCallbackUrl: text('third_party_result_callback_url'),
  thirdPartySecretKey: text('third_party_secret_key'),
  
  // 统计信息
  totalMessages: integer('total_messages').default(0),
  aiCallsToday: integer('ai_calls_today').default(0),
  lastResetAt: timestamp('last_reset_at'),
  lastActiveAt: timestamp('last_active_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
