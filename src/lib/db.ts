import { getDb } from "coze-coding-dev-sdk";
import * as schema from "../storage/database/shared/schema";

// 使用 coze-coding-dev-sdk 获取数据库连接（异步）
export async function getDatabase() {
  return getDb(schema);
}

// 为了向后兼容，提供一个同步的版本（不推荐）
export const db = getDb(schema);
