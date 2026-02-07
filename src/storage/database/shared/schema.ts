import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  serial,
  integer,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// 用户表
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    nickname: varchar("nickname", { length: 100 }).notNull().default("未命名"),
    avatar: text("avatar"),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    passwordHash: text("password_hash"),
    role: varchar("role", { length: 20 }).notNull().default("user"), // admin, user
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, disabled
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (table) => ({
    phoneIdx: index("users_phone_idx").on(table.phone),
  })
);

// 激活码表
export const activationCodes = pgTable(
  "activation_codes",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 8 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().default("unused"), // unused, used, expired, disabled
    validityPeriod: integer("validity_period").notNull(), // 有效期（天数）
    boundUserId: integer("bound_user_id"), // 绑定的用户ID
    price: decimal("price", { precision: 10, scale: 2 }), // 价格
    createdBy: integer("created_by"), // 创建人ID
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at"), // 激活码过期时间
    usedAt: timestamp("used_at"), // 首次使用时间
    notes: text("notes"),
  },
  (table) => ({
    codeIdx: index("activation_codes_code_idx").on(table.code),
    statusIdx: index("activation_codes_status_idx").on(table.status),
  })
);

// 机器人配置表
export const robots = pgTable(
  "robots",
  {
    id: serial("id").primaryKey(),
    robotId: varchar("robot_id", { length: 255 }).notNull().unique(),
    robotUuid: varchar("robot_uuid", { length: 255 }).notNull().unique(),
    userId: integer("user_id").notNull(),
    name: varchar("name", { length: 100 }).notNull().default("未命名机器人"),
    status: varchar("status", { length: 20 }).notNull().default("offline"), // online, offline, deleted

    // AI回复模式
    aiMode: varchar("ai_mode", { length: 20 }).notNull().default("builtin"), // builtin, third_party
    aiProvider: varchar("ai_provider", { length: 50 }), // doubao, deepseek, kimi, custom
    aiModel: varchar("ai_model", { length: 100 }),
    aiApiKey: text("ai_api_key"),
    aiTemperature: decimal("ai_temperature", { precision: 3, scale: 2 }).default("0.7"),
    aiMaxTokens: integer("ai_max_tokens").default(2000),
    aiContextLength: integer("ai_context_length").default(10), // 上下文保留条数
    aiScenario: varchar("ai_scenario", { length: 50 }), // 咨询, 问答, 闲聊, 售后, 社群管理

    // 第三方平台配置
    thirdPartyCallbackUrl: text("third_party_callback_url"),
    thirdPartyResultCallbackUrl: text("third_party_result_callback_url"),
    thirdPartySecretKey: text("third_party_secret_key"),

    // 统计信息
    totalMessages: integer("total_messages").default(0),
    aiCallsToday: integer("ai_calls_today").default(0),
    lastResetAt: timestamp("last_reset_at"),
    lastActiveAt: timestamp("last_active_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    robotIdIdx: index("robots_robot_id_idx").on(table.robotId),
    userIdIdx: index("robots_user_id_idx").on(table.userId),
  })
);

// 机器人成员表
export const robotMembers = pgTable(
  "robot_members",
  {
    id: serial("id").primaryKey(),
    robotId: integer("robot_id").notNull(),
    userId: integer("user_id").notNull(),
    memberId: varchar("member_id", { length: 255 }).notNull(),
    memberName: varchar("member_name", { length: 100 }).notNull(),
    memberAvatar: varchar("member_avatar", { length: 500 }),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive
    role: varchar("role", { length: 20 }).notNull().default("member"), // member, admin
    tags: text("tags"), // JSON 格式存储标签
    customData: text("custom_data"), // JSON 格式存储自定义字段
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    robotIdIdx: index("robot_members_robot_id_idx").on(table.robotId),
    userIdIdx: index("robot_members_user_id_idx").on(table.userId),
  })
);

// 对话会话表
export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    conversationId: varchar("conversation_id", { length: 255 }).notNull().unique(),
    robotId: integer("robot_id").notNull(),
    memberId: integer("member_id").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, closed, archived
    summary: text("summary"), // 对话摘要
    tags: text("tags"), // JSON 格式存储标签
    messageCount: integer("message_count").default(0),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    closedAt: timestamp("closed_at"),
  },
  (table) => ({
    conversationIdIdx: index("conversations_conversation_id_idx").on(table.conversationId),
    robotIdIdx: index("conversations_robot_id_idx").on(table.robotId),
    memberIdIdx: index("conversations_member_id_idx").on(table.memberId),
  })
);

// 消息记录表
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").notNull(),
    robotId: integer("robot_id").notNull(),
    memberId: integer("member_id").notNull(),
    messageType: varchar("message_type", { length: 20 }).notNull(), // text, image, voice, video, file, link, system
    direction: varchar("direction", { length: 20 }).notNull(), // inbound, outbound
    content: text("content").notNull(),
    mediaUrl: text("media_url"), // 媒体文件URL
    aiGenerated: boolean("ai_generated").default(false),
    aiModel: varchar("ai_model", { length: 100 }),
    aiTokensUsed: integer("ai_tokens_used"),
    aiCost: decimal("ai_cost", { precision: 10, scale: 4 }),
    metadata: text("metadata"), // JSON 格式存储额外信息
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index("messages_conversation_id_idx").on(table.conversationId),
    robotIdIdx: index("messages_robot_id_idx").on(table.robotId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);

// 知识库表
export const knowledgeBases = pgTable(
  "knowledge_bases",
  {
    id: serial("id").primaryKey(),
    knowledgeBaseId: varchar("knowledge_base_id", { length: 255 }).notNull().unique(),
    robotId: integer("robot_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, disabled
    documentCount: integer("document_count").default(0),
    embeddingModel: varchar("embedding_model", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    knowledgeBaseIdIdx: index("knowledge_bases_knowledge_base_id_idx").on(table.knowledgeBaseId),
    robotIdIdx: index("knowledge_bases_robot_id_idx").on(table.robotId),
  })
);

// 文档表
export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    documentId: varchar("document_id", { length: 255 }).notNull().unique(),
    knowledgeBaseId: integer("knowledge_base_id").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content"),
    fileType: varchar("file_type", { length: 50 }),
    fileSize: integer("file_size"),
    fileUrl: text("file_url"),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
    chunkCount: integer("chunk_count").default(0),
    vectorized: boolean("vectorized").default(false),
    metadata: text("metadata"), // JSON 格式存储额外信息
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    documentIdIdx: index("documents_document_id_idx").on(table.documentId),
    knowledgeBaseIdIdx: index("documents_knowledge_base_id_idx").on(table.knowledgeBaseId),
  })
);

// 标签表
export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    type: varchar("type", { length: 20 }).notNull(), // user, conversation, document
    color: varchar("color", { length: 7 }), // hex 颜色代码
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    nameIdx: index("tags_name_idx").on(table.name),
  })
);

// 文档标签关联表
export const documentTags = pgTable(
  "document_tags",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id").notNull(),
    tagId: integer("tag_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    documentIdIdx: index("document_tags_document_id_idx").on(table.documentId),
    tagIdIdx: index("document_tags_tag_id_idx").on(table.tagId),
  })
);

// AI调用日志表
export const aiLogs = pgTable(
  "ai_logs",
  {
    id: serial("id").primaryKey(),
    robotId: integer("robot_id").notNull(),
    conversationId: integer("conversation_id").notNull(),
    messageId: integer("message_id").notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // doubao, deepseek, kimi, custom
    model: varchar("model", { length: 100 }).notNull(),
    requestText: text("request_text").notNull(),
    responseText: text("response_text"),
    tokensUsed: integer("tokens_used"),
    cost: decimal("cost", { precision: 10, scale: 4 }),
    latency: integer("latency"), // 响应时间（毫秒）
    status: varchar("status", { length: 20 }).notNull(), // success, failed
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    robotIdIdx: index("ai_logs_robot_id_idx").on(table.robotId),
    conversationIdIdx: index("ai_logs_conversation_id_idx").on(table.conversationId),
    createdAtIdx: index("ai_logs_created_at_idx").on(table.createdAt),
  })
);

// 统计数据表
export const statistics = pgTable(
  "statistics",
  {
    id: serial("id").primaryKey(),
    robotId: integer("robot_id").notNull(),
    statDate: varchar("stat_date", { length: 10 }).notNull(), // YYYY-MM-DD
    messageType: varchar("message_type", { length: 50 }), // text, image, voice, etc.
    messageCount: integer("message_count").default(0),
    aiCallCount: integer("ai_call_count").default(0),
    aiTokensUsed: integer("ai_tokens_used").default(0),
    aiCost: decimal("ai_cost", { precision: 10, scale: 4 }).default("0"),
    activeMemberCount: integer("active_member_count").default(0),
    newMemberCount: integer("new_member_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    robotIdDateIdx: index("statistics_robot_id_date_idx").on(table.robotId, table.statDate),
  })
);

// 系统配置表
export const systemConfigs = pgTable(
  "system_configs",
  {
    id: serial("id").primaryKey(),
    configKey: varchar("config_key", { length: 100 }).notNull().unique(),
    configValue: text("config_value"),
    configType: varchar("config_type", { length: 20 }).notNull(), // string, number, boolean, json
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    configKeyIdx: index("system_configs_config_key_idx").on(table.configKey),
  })
);

// Zod schemas for validation
export const insertUserSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  avatar: z.string().optional(),
  phone: z.string().min(1).max(20),
  role: z.enum(["admin", "user"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const updateUserSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  avatar: z.string().optional(),
  role: z.enum(["admin", "user"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  lastLoginAt: z.coerce.date().optional(),
});

export const insertActivationCodeSchema = z.object({
  code: z.string().min(1).max(8),
  status: z.enum(["unused", "used", "expired", "disabled"]).optional(),
  validityPeriod: z.number().int().positive(),
  boundUserId: z.number().int().optional(),
  price: z.string().or(z.number()).transform(String).optional(),
  createdBy: z.number().int().optional(),
  expiresAt: z.coerce.date().optional(),
  usedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateActivationCodeSchema = z.object({
  status: z.enum(["unused", "used", "expired", "disabled"]).optional(),
  boundUserId: z.number().int().optional(),
  expiresAt: z.coerce.date().optional(),
  usedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const insertRobotSchema = z.object({
  robotId: z.string().min(1).max(255),
  robotUuid: z.string().min(1).max(255),
  userId: z.number().int(),
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["online", "offline", "deleted"]).optional(),
  aiMode: z.enum(["builtin", "third_party"]).optional(),
  aiProvider: z.string().max(50).optional(),
  aiModel: z.string().max(100).optional(),
  aiApiKey: z.string().optional(),
  aiTemperature: z.string().or(z.number()).transform(String).optional(),
  aiMaxTokens: z.number().int().optional(),
  aiContextLength: z.number().int().optional(),
  aiScenario: z.string().max(50).optional(),
  thirdPartyCallbackUrl: z.string().url().optional().or(z.literal("")),
  thirdPartyResultCallbackUrl: z.string().url().optional().or(z.literal("")),
  thirdPartySecretKey: z.string().optional(),
});

export const updateRobotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["online", "offline", "deleted"]).optional(),
  aiMode: z.enum(["builtin", "third_party"]).optional(),
  aiProvider: z.string().max(50).optional(),
  aiModel: z.string().max(100).optional(),
  aiApiKey: z.string().optional(),
  aiTemperature: z.string().or(z.number()).transform(String).optional(),
  aiMaxTokens: z.number().int().optional(),
  aiContextLength: z.number().int().optional(),
  aiScenario: z.string().max(50).optional(),
  thirdPartyCallbackUrl: z.string().url().optional().or(z.literal("")),
  thirdPartyResultCallbackUrl: z.string().url().optional().or(z.literal("")),
  thirdPartySecretKey: z.string().optional(),
});

export const insertConversationSchema = z.object({
  conversationId: z.string().min(1).max(255),
  robotId: z.number().int(),
  memberId: z.number().int(),
  status: z.enum(["active", "closed", "archived"]).optional(),
  summary: z.string().optional(),
  tags: z.string().optional(),
});

export const insertMessageSchema = z.object({
  conversationId: z.number().int(),
  robotId: z.number().int(),
  memberId: z.number().int(),
  messageType: z.enum(["text", "image", "voice", "video", "file", "link", "system"]),
  direction: z.enum(["inbound", "outbound"]),
  content: z.string().min(1),
  mediaUrl: z.string().optional(),
  aiGenerated: z.boolean().optional(),
  aiModel: z.string().max(100).optional(),
  aiTokensUsed: z.number().int().optional(),
  aiCost: z.string().or(z.number()).transform(String).optional(),
  metadata: z.string().optional(),
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type ActivationCode = typeof activationCodes.$inferSelect;
export type InsertActivationCode = z.infer<typeof insertActivationCodeSchema>;
export type UpdateActivationCode = z.infer<typeof updateActivationCodeSchema>;

export type Robot = typeof robots.$inferSelect;
export type InsertRobot = z.infer<typeof insertRobotSchema>;
export type UpdateRobot = z.infer<typeof updateRobotSchema>;

export type RobotMember = typeof robotMembers.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type DocumentTag = typeof documentTags.$inferSelect;
export type AiLog = typeof aiLogs.$inferSelect;
export type Statistics = typeof statistics.$inferSelect;
export type SystemConfig = typeof systemConfigs.$inferSelect;
