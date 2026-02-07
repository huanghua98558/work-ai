// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * 获取仪表盘统计数据
 * GET /api/dashboard/stats
 *
 * 返回数据包括：
 * - 总体统计（机器人总数、激活码数量、对话总数、消息总数）
 * - 在线机器人统计
 * - 今日消息统计
 * - 最近活跃的机器人
 * - 最近的激活码
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    // 并行查询所有统计数据
    const [
      robotsResult,
      activationCodesResult,
      onlineRobotsResult,
    ] = await Promise.all([
      // 机器人总数
      client.query(
        `SELECT COUNT(*) as total FROM robots WHERE status != 'deleted'`
      ),

      // 激活码总数和统计
      client.query(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'unused' THEN 1 END) as unused,
          COUNT(CASE WHEN status = 'used' THEN 1 END) as used,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
         FROM activation_codes`
      ),

      // 在线机器人数量
      client.query(
        `SELECT COUNT(*) as total FROM robots WHERE status = 'online'`
      ),
    ]);

    // 获取最近活跃的机器人（按最后活跃时间排序）
    const recentRobotsResult = await client.query(
      `SELECT
         r.id,
         r.bot_id as robot_id,
         r.name,
         r.status,
         0 as total_messages,
         0 as today_messages,
         r.last_active_at,
         r.created_at
       FROM robots r
       WHERE r.status != 'deleted'
       ORDER BY r.last_active_at DESC NULLS LAST
       LIMIT 5`
    );

    // 获取最近创建的激活码
    const recentActivationCodesResult = await client.query(
      `SELECT
         ac.id,
         ac.code,
         ac.status,
         ac.type,
         ac.created_at,
         r.name as robot_name,
         r.bot_id as robot_id
       FROM activation_codes ac
       LEFT JOIN robots r ON ac.robot_id = r.bot_id
       ORDER BY ac.created_at DESC
       LIMIT 5`
    );

    // 格式化返回数据
    const stats = {
      totalRobots: parseInt(robotsResult.rows[0].total),
      totalActivationCodes: parseInt(activationCodesResult.rows[0].total),
      unusedActivationCodes: parseInt(activationCodesResult.rows[0].unused),
      usedActivationCodes: parseInt(activationCodesResult.rows[0].used),
      expiredActivationCodes: parseInt(activationCodesResult.rows[0].expired),
      totalConversations: 0, // 暂时不统计对话数
      totalMessages: 0, // 暂时不统计消息数
      activeRobots: parseInt(onlineRobotsResult.rows[0].total),
      todayMessages: 0, // 暂时不统计今日消息数
      activeUsers: 0, // 暂时不统计活跃用户数
    };

    // 格式化最近机器人数据
    const recentRobots = recentRobotsResult.rows.map((row: any) => ({
      id: row.id,
      robot_id: row.robot_id,
      name: row.name,
      status: row.status === 'online' ? 'online' : 'offline',
      messages: parseInt(row.total_messages || 0),
      todayMessages: parseInt(row.today_messages || 0),
      lastActive: row.last_active_at ? formatTimeAgo(row.last_active_at) : '从未活跃',
      lastActiveAt: row.last_active_at,
    }));

    // 格式化最近激活码数据
    const recentActivationCodes = recentActivationCodesResult.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      status: row.status,
      type: row.type,
      robotName: row.robot_name || '-',
      robotId: row.robot_id || '-',
      createdAt: row.created_at,
      timeAgo: formatTimeAgo(row.created_at),
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentRobots,
        recentActivationCodes,
        recentConversations: [], // 暂时不返回对话列表
      },
    });
  } catch (error: any) {
    console.error("获取仪表盘统计错误:", error);
    return NextResponse.json(
      { success: false, error: "获取仪表盘统计失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * 格式化时间差为人类可读格式
 */
function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}秒前`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分钟前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}小时前`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}
