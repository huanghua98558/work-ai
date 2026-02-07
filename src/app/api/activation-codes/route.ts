// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/auth";
import { nanoid } from "nanoid";
import { z } from "zod";

const createActivationCodeSchema = z.object({
  validityPeriod: z.number().int().positive(),
  price: z.string().or(z.number()).transform(String).optional(),
  notes: z.string().optional(),
});

// 获取激活码列表
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以查看所有激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const db = await getDatabase();

    let codes;
    if (status) {
      codes = await db.execute(sql`
        SELECT * FROM activation_codes 
        WHERE status = ${status}
        ORDER BY created_at DESC
      `);
    } else {
      codes = await db.execute(sql`
        SELECT * FROM activation_codes 
        ORDER BY created_at DESC
      `);
    }

    return NextResponse.json({
      success: true,
      data: codes.rows,
    });
  } catch (error: any) {
    console.error("获取激活码列表错误:", error);
    return NextResponse.json(
      { success: false, error: "获取激活码列表失败", details: error.message },
      { status: 500 }
    );
  }
}

// 创建激活码
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以创建激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createActivationCodeSchema.parse(body);

    // 生成8位随机激活码
    const code = nanoid(8).toUpperCase();

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validatedData.validityPeriod);

    const db = await getDatabase();

    const newCodeResult = await db.execute(sql`
      INSERT INTO activation_codes (code, status, type, max_uses, used_count, remark, creator_id, expires_at)
      VALUES (${code}, 'active', 'trial', 1, 0, ${validatedData.notes || null}, ${user.userId}, ${expiresAt.toISOString()})
      RETURNING *
    `);

    const newCode = newCodeResult.rows[0];

    return NextResponse.json({
      success: true,
      data: newCode,
    });
  } catch (error: any) {
    console.error("创建激活码错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "创建激活码失败", details: error.message },
      { status: 500 }
    );
  }
}
