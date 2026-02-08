import { NextRequest, NextResponse } from 'next/server';
import { pushConfig } from '@/server/websocket-server-v3';
import { configManager } from '@/server/websocket/config-manager';
import { ConfigType } from '@/server/websocket/types';
import { z } from 'zod';

/**
 * 推送配置接口
 * POST /api/configs/push
 */
const pushConfigSchema = z.object({
  robotId: z.string().min(1),
  configType: z.enum(['risk_control', 'reply_template', 'behavior_pattern', 'keyword_filter']),
  config: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const body = await req.json();
    const validation = pushConfigSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { robotId, configType, config: customConfig } = validation.data;

    // 保存配置（如果提供了自定义配置）
    let finalConfig = customConfig;

    if (finalConfig) {
      // 验证配置
      const validation = configManager.validateConfig(configType as ConfigType, finalConfig);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid config',
            details: validation.errors,
          },
          { status: 400 }
        );
      }

      // 保存配置到数据库
      await configManager.saveConfig({
        robotId,
        configType: configType as ConfigType,
        config: finalConfig,
        version: 1,
      });
    } else {
      // 使用默认配置
      finalConfig = configManager.getDefaultConfig(configType as ConfigType);
    }

    // 构建配置推送数据
    const configData = {
      robotId,
      configType,
      config: finalConfig,
      version: 1, // TODO: 从数据库获取实际版本
    };

    // 推送配置
    const sent = await pushConfig(robotId, configData);

    return NextResponse.json({
      success: true,
      data: {
        sent,
        config: finalConfig,
        message: sent ? '配置已推送' : '设备未连接，配置已保存',
      },
    });
  } catch (error) {
    console.error('[API] 推送配置失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to push config',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
