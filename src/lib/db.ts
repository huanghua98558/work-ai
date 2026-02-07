import { getDb } from "coze-coding-dev-sdk";
import * as schema from "../storage/database/shared/schema";

// 使用 coze-coding-dev-sdk 获取数据库连接（异步）
export async function getDatabase() {
  return await getDb(schema);
}

// 直接导出数据库实例供同步使用
export const db = getDb(schema);
