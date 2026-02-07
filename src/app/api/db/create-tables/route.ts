import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // 获取数据库实例（异步）
    const db = await getDatabase();

    // 1. 创建用户表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nickname VARCHAR(100) NOT NULL DEFAULT '未命名',
        avatar TEXT,
        phone VARCHAR(20) NOT NULL UNIQUE,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login_at TIMESTAMP
      )
    `);

    // 2. 创建激活码表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS activation_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        type VARCHAR(20) NOT NULL DEFAULT 'trial',
        max_uses INTEGER NOT NULL DEFAULT 1,
        used_count INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        creator_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        remark TEXT
      )
    `);

    // 3. 创建激活记录表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS activation_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        code_id INTEGER REFERENCES activation_codes(id),
        activated_at TIMESTAMP DEFAULT NOW(),
        activated_by INTEGER REFERENCES users(id)
      )
    `);

    // 4. 创建机器人配置表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS robots (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        bot_id VARCHAR(50) NOT NULL UNIQUE,
        bot_type VARCHAR(20) NOT NULL DEFAULT 'feishu',
        bot_token TEXT,
        bot_secret TEXT,
        app_id VARCHAR(100),
        app_secret TEXT,
        encrypt_key TEXT,
        verification_token TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_active_at TIMESTAMP
      )
    `);

    // 5. 创建机器人能力配置表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS robot_capabilities (
        id SERIAL PRIMARY KEY,
        robot_id INTEGER REFERENCES robots(id) ON DELETE CASCADE,
        capability VARCHAR(50) NOT NULL,
        config JSONB,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 6. 创建知识库表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_bases (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL DEFAULT 'local',
        remote_id VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 7. 创建知识库文档表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS kb_documents (
        id SERIAL PRIMARY KEY,
        kb_id INTEGER REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT,
        file_url TEXT,
        file_type VARCHAR(50),
        file_size INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 8. 创建对话记录表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        robot_id INTEGER REFERENCES robots(id),
        user_id VARCHAR(100),
        session_id VARCHAR(100),
        message_type VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'success',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 9. 创建用户权限表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(50) NOT NULL,
        resource VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 10. 创建系统配置表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_configs (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 11. 创建操作日志表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        resource VARCHAR(100),
        resource_id INTEGER,
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 12. 创建角色表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(50) NOT NULL,
        description TEXT,
        permissions TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 13. 创建用户角色关联表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    return NextResponse.json({
      success: true,
      data: {
        message: "所有表创建成功",
      },
    });
  } catch (error: any) {
    console.error("创建表错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建表失败",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
