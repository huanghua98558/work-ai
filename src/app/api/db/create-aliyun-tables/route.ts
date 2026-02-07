// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    console.log('开始创建数据库表...');

    // 创建激活码表
    await client.query(`
      CREATE TABLE IF NOT EXISTS activation_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(8) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'unused',
        validity_period INTEGER NOT NULL,
        bound_user_id INTEGER,
        price DECIMAL(10, 2),
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        used_at TIMESTAMP,
        notes TEXT
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS activation_codes_code_idx ON activation_codes(code)`);
    await client.query(`CREATE INDEX IF NOT EXISTS activation_codes_status_idx ON activation_codes(status)`);
    console.log('✓ activation_codes 表创建成功');

    // 创建机器人配置表
    await client.query(`
      CREATE TABLE IF NOT EXISTS robots (
        id SERIAL PRIMARY KEY,
        robot_id VARCHAR(255) NOT NULL UNIQUE,
        robot_uuid VARCHAR(255) NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL DEFAULT '未命名机器人',
        status VARCHAR(20) NOT NULL DEFAULT 'offline',
        ai_mode VARCHAR(20) NOT NULL DEFAULT 'builtin',
        ai_provider VARCHAR(50),
        ai_model VARCHAR(100),
        ai_api_key TEXT,
        ai_temperature DECIMAL(3, 2) DEFAULT 0.7,
        ai_max_tokens INTEGER DEFAULT 2000,
        ai_context_length INTEGER DEFAULT 10,
        ai_scenario VARCHAR(50),
        third_party_callback_url TEXT,
        third_party_result_callback_url TEXT,
        third_party_secret_key TEXT,
        total_messages INTEGER DEFAULT 0,
        ai_calls_today INTEGER DEFAULT 0,
        last_reset_at TIMESTAMP,
        last_active_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS robots_robot_id_idx ON robots(robot_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS robots_user_id_idx ON robots(user_id)`);
    console.log('✓ robots 表创建成功');

    // 创建机器人成员表
    await client.query(`
      CREATE TABLE IF NOT EXISTS robot_members (
        id SERIAL PRIMARY KEY,
        robot_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        member_id VARCHAR(255) NOT NULL,
        member_name VARCHAR(100) NOT NULL,
        member_avatar VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        tags TEXT,
        custom_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS robot_members_robot_id_idx ON robot_members(robot_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS robot_members_user_id_idx ON robot_members(user_id)`);
    console.log('✓ robot_members 表创建成功');

    // 创建对话会话表
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(255) NOT NULL UNIQUE,
        robot_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        summary TEXT,
        tags TEXT,
        message_count INTEGER DEFAULT 0,
        last_message_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS conversations_conversation_id_idx ON conversations(conversation_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS conversations_robot_id_idx ON conversations(robot_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS conversations_member_id_idx ON conversations(member_id)`);
    console.log('✓ conversations 表创建成功');

    // 创建消息记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        robot_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        message_type VARCHAR(20) NOT NULL,
        direction VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        media_url TEXT,
        ai_generated BOOLEAN DEFAULT FALSE,
        ai_model VARCHAR(100),
        ai_tokens_used INTEGER,
        ai_cost DECIMAL(10, 4),
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS messages_robot_id_idx ON messages(robot_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at)`);
    console.log('✓ messages 表创建成功');

    // 创建知识库表
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_bases (
        id SERIAL PRIMARY KEY,
        knowledge_base_id VARCHAR(255) NOT NULL UNIQUE,
        robot_id INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        document_count INTEGER DEFAULT 0,
        embedding_model VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS knowledge_bases_knowledge_base_id_idx ON knowledge_bases(knowledge_base_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS knowledge_bases_robot_id_idx ON knowledge_bases(robot_id)`);
    console.log('✓ knowledge_bases 表创建成功');

    // 创建文档表
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255) NOT NULL UNIQUE,
        knowledge_base_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT,
        file_type VARCHAR(50),
        file_size INTEGER,
        file_url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        chunk_count INTEGER DEFAULT 0,
        vectorized BOOLEAN DEFAULT FALSE,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS documents_document_id_idx ON documents(document_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS documents_knowledge_base_id_idx ON documents(knowledge_base_id)`);
    console.log('✓ documents 表创建成功');

    // 创建标签表
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        type VARCHAR(20) NOT NULL,
        color VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name)`);
    console.log('✓ tags 表创建成功');

    // 创建文档标签关联表
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_tags (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS document_tags_document_id_idx ON document_tags(document_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS document_tags_tag_id_idx ON document_tags(tag_id)`);
    console.log('✓ document_tags 表创建成功');

    // 创建 AI 调用日志表
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id SERIAL PRIMARY KEY,
        robot_id INTEGER NOT NULL,
        conversation_id INTEGER NOT NULL,
        message_id INTEGER NOT NULL,
        provider VARCHAR(50) NOT NULL,
        model VARCHAR(100) NOT NULL,
        request_text TEXT NOT NULL,
        response_text TEXT,
        tokens_used INTEGER,
        cost DECIMAL(10, 4),
        latency INTEGER,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS ai_logs_robot_id_idx ON ai_logs(robot_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS ai_logs_conversation_id_idx ON ai_logs(conversation_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS ai_logs_created_at_idx ON ai_logs(created_at)`);
    console.log('✓ ai_logs 表创建成功');

    // 创建统计数据表
    await client.query(`
      CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        robot_id INTEGER NOT NULL,
        stat_date VARCHAR(10) NOT NULL,
        message_type VARCHAR(50),
        message_count INTEGER DEFAULT 0,
        ai_call_count INTEGER DEFAULT 0,
        ai_tokens_used INTEGER DEFAULT 0,
        ai_cost DECIMAL(10, 4) DEFAULT 0,
        active_member_count INTEGER DEFAULT 0,
        new_member_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS statistics_robot_id_date_idx ON statistics(robot_id, stat_date)`);
    console.log('✓ statistics 表创建成功');

    // 创建系统配置表
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_configs (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT,
        config_type VARCHAR(20) NOT NULL DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS system_configs_config_key_idx ON system_configs(config_key)`);
    console.log('✓ system_configs 表创建成功');

    console.log('\n所有数据库表创建完成！');

    return NextResponse.json({
      success: true,
      message: '所有数据库表创建完成',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('创建表时出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
