// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    console.log('开始创建设备激活表...');

    // 创建设备激活记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_activations (
        id SERIAL PRIMARY KEY,
        robot_id VARCHAR(100) NOT NULL UNIQUE,
        robot_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        activation_code_id INTEGER,
        device_id VARCHAR(200) NOT NULL,
        device_info JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_active_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 创建设备解绑历史表
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_unbindings (
        id SERIAL PRIMARY KEY,
        robot_id VARCHAR(100) NOT NULL,
        activation_code_id INTEGER,
        old_device_id VARCHAR(200) NOT NULL,
        reason TEXT,
        unbound_by INTEGER,
        unbound_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 创建索引
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_activations_device_id 
      ON device_activations(device_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_activations_robot_id 
      ON device_activations(robot_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_activations_code_id 
      ON device_activations(activation_code_id)
    `);

    console.log('✓ device_activations 表创建成功');
    console.log('✓ device_unbindings 表创建成功');

    return NextResponse.json({
      success: true,
      message: '设备激活表创建完成',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('创建设备激活表时出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
