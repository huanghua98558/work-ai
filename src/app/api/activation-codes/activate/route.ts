import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const activateCodeSchema = z.object({
  code: z.string().min(1),
});

// 使用激活码
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const body = await request.json();
    const validatedData = activateCodeSchema.parse(body);

    const db = await getDatabase();

    // 查找激活码
    const codeResult = await db.execute(sql`
      SELECT * FROM activation_codes 
      WHERE code = ${validatedData.code.toUpperCase()} 
      AND status = 'active'
      LIMIT 1
    `);

    if (codeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "激活码不存在或已被使用" },
        { status: 400 }
      );
    }

    const code = codeResult.rows[0];

    // 检查激活码是否过期
    if (code.expires_at && new Date() > new Date(code.expires_at)) {
      await db.execute(sql`
        UPDATE activation_codes 
        SET status = 'expired'
        WHERE id = ${code.id}
      `);

      return NextResponse.json(
        { success: false, error: "激活码已过期" },
        { status: 400 }
      );
    }

    // 检查使用次数是否已达上限
    if (code.used_count >= code.max_uses) {
      return NextResponse.json(
        { success: false, error: "激活码使用次数已达上限" },
        { status: 400 }
      );
    }

    // 更新激活码状态
    const now = new Date();
    const updatedCodeResult = await db.execute(sql`
      UPDATE activation_codes 
      SET status = 'inactive', used_count = used_count + 1
      WHERE id = ${code.id}
      RETURNING *
    `);

    const updatedCode = updatedCodeResult.rows[0];

    // 创建激活记录
    await db.execute(sql`
      INSERT INTO activation_records (user_id, code_id, activated_at, activated_by)
      VALUES (${user.userId}, ${code.id}, ${now.toISOString()}, ${user.userId})
    `);

    // 更新用户角色为管理员
    await db.execute(sql`
      UPDATE users 
      SET role = 'admin', updated_at = NOW()
      WHERE id = ${user.userId}
    `);

    return NextResponse.json({
      success: true,
      data: {
        activationCode: updatedCode,
        message: "激活成功，您已成为管理员",
      },
    });
  } catch (error: any) {
    console.error("激活激活码错误:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "请求参数错误", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "激活激活码失败", details: error.message },
      { status: 500 }
    );
  }
}
