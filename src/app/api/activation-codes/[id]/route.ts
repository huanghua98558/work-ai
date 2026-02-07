// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/auth";
import { z } from "zod";

const updateActivationCodeSchema = z.object({
  status: z.enum(["active", "inactive", "expired", "disabled"]).optional(),
  expiresAt: z.coerce.date().optional(),
  remark: z.string().optional(),
});

// 获取单个激活码详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    const { id } = await params;
    const codeId = parseInt(id);

    const db = await getDatabase();

    const codeResult = await db.execute(sql`
      SELECT * FROM activation_codes 
      WHERE id = ${codeId}
      LIMIT 1
    `);

    if (codeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    const code = codeResult.rows[0];

    // 只有管理员可以查看
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: code,
    });
  } catch (error: any) {
    console.error("获取激活码详情错误:", error);
    return NextResponse.json(
      { success: false, error: "获取激活码详情失败", details: error.message },
      { status: 500 }
    );
  }
}

// 更新激活码
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以更新激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const codeId = parseInt(id);
    const body = await request.json();
    const validatedData = updateActivationCodeSchema.parse(body);

    const db = await getDatabase();

    // 构建 SET 子句
    const setClauses = [];
    const values = [];

    if (validatedData.status !== undefined) {
      setClauses.push(`status = $${values.length + 1}`);
      values.push(validatedData.status);
    }
    if (validatedData.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${values.length + 1}`);
      values.push(validatedData.expiresAt.toISOString());
    }
    if (validatedData.remark !== undefined) {
      setClauses.push(`remark = $${values.length + 1}`);
      values.push(validatedData.remark);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有提供更新字段" },
        { status: 400 }
      );
    }

    values.push(codeId);

    const updateQuery = sql`
      UPDATE activation_codes 
      SET ${sql.raw(setClauses.join(", "))}, updated_at = NOW()
      WHERE id = ${codeId}
      RETURNING *
    `;

    const updatedCodeResult = await db.execute(updateQuery);

    if (updatedCodeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCodeResult.rows[0],
    });
  } catch (error: any) {
    console.error("更新激活码错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "更新激活码失败", details: error.message },
      { status: 500 }
    );
  }
}

// 删除激活码
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);

    // 只有管理员可以删除激活码
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const codeId = parseInt(id);

    const db = await getDatabase();

    const deletedCodeResult = await db.execute(sql`
      DELETE FROM activation_codes 
      WHERE id = ${codeId}
      RETURNING *
    `);

    if (deletedCodeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "删除成功" },
    });
  } catch (error: any) {
    console.error("删除激活码错误:", error);
    return NextResponse.json(
      { success: false, error: "删除激活码失败", details: error.message },
      { status: 500 }
    );
  }
}
