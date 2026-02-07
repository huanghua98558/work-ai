import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import * as schema from "@/storage/database/shared/schema";

export async function GET() {
  try {
    // 测试 getDb 函数
    const db = getDb(schema);

    // 检查 db 对象的属性
    const dbProps = Object.getOwnPropertyNames(db);
    const dbMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(db));

    return NextResponse.json({
      success: true,
      data: {
        message: "getDb 测试",
        dbType: typeof db,
        dbProps: dbProps.slice(0, 20),
        dbMethods: dbMethods.slice(0, 20),
        hasQuery: "query" in db,
        hasSelect: "select" in db,
        hasInsert: "insert" in db,
        hasExecute: "execute" in db,
      },
    });
  } catch (error: any) {
    console.error("getDb 测试错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "getDb 测试失败",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
