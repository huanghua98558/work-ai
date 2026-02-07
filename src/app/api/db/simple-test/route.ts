import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 测试 1: 检查环境变量
    const pgUrl = process.env.PGDATABASE_URL || process.env.DATABASE_URL;

    return NextResponse.json({
      success: true,
      data: {
        message: "环境变量检查",
        pgUrlExists: !!pgUrl,
        pgUrlStart: pgUrl ? pgUrl.substring(0, 20) + "..." : "N/A",
        allEnv: Object.keys(process.env)
          .filter(key => key.includes("DATABASE") || key.includes("PG"))
          .reduce((acc, key) => {
            acc[key] = process.env[key]?.substring(0, 20) + "...";
            return acc;
          }, {} as any),
      },
    });
  } catch (error: any) {
    console.error("简单测试错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "简单测试失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
