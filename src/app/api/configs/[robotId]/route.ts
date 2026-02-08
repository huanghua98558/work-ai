import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '@/server/websocket/config-manager';
import { ConfigType } from '@/server/websocket/types';

/**
 * 获取配置
 * GET /api/configs/[robotId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ robotId: string }> }
) {
  try {
    const { robotId } = await params;
    const { searchParams } = new URL(req.url);
    const configType = searchParams.get('type') as ConfigType;

    if (!configType) {
      // 获取所有配置
      const configs = await configManager.getAllConfigs(robotId);

      return NextResponse.json({
        success: true,
        data: {
          robotId,
          configs: Object.fromEntries(configs),
        },
      });
    } else {
      // 获取指定类型的配置
      const config = await configManager.getConfig(robotId, configType);

      if (!config) {
        // 返回默认配置
        const defaultConfig = configManager.getDefaultConfig(configType);
        return NextResponse.json({
          success: true,
          data: {
            robotId,
            configType,
            config: defaultConfig,
            isDefault: true,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          robotId,
          configType,
          config: config.config,
          version: config.version,
        },
      });
    }
  } catch (error) {
    console.error('[API] 获取配置失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get config',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
