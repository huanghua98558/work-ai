/**
 * 配置管理器
 * 负责管理客户端配置的存储和推送
 */

import { getPool } from '@/lib/db';
import { ConfigType } from './types';

export interface RobotConfig {
  id?: number;
  robotId: string;
  configType: ConfigType;
  config: Record<string, any>;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 风控配置
 */
export interface RiskControlConfig {
  enabled: boolean;
  maxMessagesPerMinute?: number;
  maxMessagesPerHour?: number;
  replyDelayMin?: number;
  replyDelayMax?: number;
  blockKeywords?: string[];
  allowlist?: string[];
}

/**
 * 回复模板配置
 */
export interface ReplyTemplateConfig {
  templates: Array<{
    keyword: string;
    response: string;
    enabled: boolean;
  }>;
}

/**
 * 行为模式配置
 */
export interface BehaviorPatternConfig {
  autoReply: boolean;
    keywordMatch: boolean;
    groupReply: boolean;
    privateReply: boolean;
  smartReply: boolean;
}

/**
 * 关键词过滤配置
 */
export interface KeywordFilterConfig {
  enabled: boolean;
  blockedKeywords: string[];
  replacement?: string;
}

/**
 * 配置管理器
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private configCache: Map<string, Map<ConfigType, RobotConfig>> = new Map();

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 保存配置
   */
  async saveConfig(config: RobotConfig): Promise<RobotConfig> {
    try {
      const poolInstance = await getPool();
      const client = await poolInstance.connect();

      try {
        // 检查是否已存在
        const existing = await client.query(
          'SELECT id, version FROM robot_configs WHERE robot_id = $1 AND config_type = $2',
          [config.robotId, config.configType]
        );

        const newVersion = existing.rows.length > 0 ? existing.rows[0].version + 1 : 1;

        const result = await client.query(
          `INSERT INTO robot_configs (robot_id, config_type, config, version)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (robot_id, config_type) DO UPDATE SET
            config = EXCLUDED.config,
            version = EXCLUDED.version,
            updated_at = NOW()
          RETURNING id, robot_id, config_type, config, version, created_at, updated_at`,
          [config.robotId, config.configType, JSON.stringify(config.config), newVersion]
        );

        const savedConfig = result.rows[0];

        // 更新缓存
        this.updateCache({
          id: savedConfig.id,
          robotId: savedConfig.robot_id,
          configType: savedConfig.config_type,
          config: savedConfig.config,
          version: savedConfig.version,
          createdAt: savedConfig.created_at,
          updatedAt: savedConfig.updated_at,
        });

        console.log(`[ConfigManager] 配置已保存: ${config.robotId} - ${config.configType} - v${newVersion}`);

        return {
          id: savedConfig.id,
          robotId: savedConfig.robot_id,
          configType: savedConfig.config_type,
          config: savedConfig.config,
          version: savedConfig.version,
          createdAt: savedConfig.created_at,
          updatedAt: savedConfig.updated_at,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[ConfigManager] 保存配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置
   */
  async getConfig(robotId: string, configType: ConfigType): Promise<RobotConfig | null> {
    try {
      // 先从缓存获取
      const cached = this.getFromCache(robotId, configType);
      if (cached) {
        return cached;
      }

      // 从数据库获取
      const poolInstance = await getPool();
      const client = await poolInstance.connect();

      try {
        const result = await client.query(
          'SELECT id, robot_id, config_type, config, version, created_at, updated_at FROM robot_configs WHERE robot_id = $1 AND config_type = $2',
          [robotId, configType]
        );

        if (result.rows.length === 0) {
          return null;
        }

        const config = {
          id: result.rows[0].id,
          robotId: result.rows[0].robot_id,
          configType: result.rows[0].config_type,
          config: result.rows[0].config,
          version: result.rows[0].version,
          createdAt: result.rows[0].created_at,
          updatedAt: result.rows[0].updated_at,
        };

        // 更新缓存
        this.updateCache(config);

        return config;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[ConfigManager] 获取配置失败:', error);
      return null;
    }
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(robotId: string): Promise<Map<ConfigType, RobotConfig>> {
    const configs = new Map<ConfigType, RobotConfig>();

    for (const configType of Object.values(ConfigType)) {
      const config = await this.getConfig(robotId, configType as ConfigType);
      if (config) {
        configs.set(configType, config);
      }
    }

    return configs;
  }

  /**
   * 删除配置
   */
  async deleteConfig(robotId: string, configType: ConfigType): Promise<boolean> {
    try {
      const poolInstance = await getPool();
      const client = await poolInstance.connect();

      try {
        const result = await client.query(
          'DELETE FROM robot_configs WHERE robot_id = $1 AND config_type = $2',
          [robotId, configType]
        );

        // 从缓存删除
        this.removeFromCache(robotId, configType);

        console.log(`[ConfigManager] 配置已删除: ${robotId} - ${configType}`);

        return (result.rowCount ?? 0) > 0;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[ConfigManager] 删除配置失败:', error);
      return false;
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(configType: ConfigType): Record<string, any> {
    switch (configType) {
      case ConfigType.RISK_CONTROL:
        return {
          enabled: true,
          maxMessagesPerMinute: 60,
          maxMessagesPerHour: 1000,
          replyDelayMin: 0,
          replyDelayMax: 3,
          blockKeywords: [],
          allowlist: [],
        } as RiskControlConfig;

      case ConfigType.REPLY_TEMPLATE:
        return {
          templates: [],
        } as ReplyTemplateConfig;

      case ConfigType.BEHAVIOR_PATTERN:
        return {
          autoReply: false,
          keywordMatch: true,
          groupReply: true,
          privateReply: true,
          smartReply: false,
        } as BehaviorPatternConfig;

      case ConfigType.KEYWORD_FILTER:
        return {
          enabled: false,
          blockedKeywords: [],
          replacement: '***',
        } as KeywordFilterConfig;

      default:
        return {};
    }
  }

  /**
   * 更新缓存
   */
  private updateCache(config: RobotConfig): void {
    if (!this.configCache.has(config.robotId)) {
      this.configCache.set(config.robotId, new Map());
    }

    const robotConfigs = this.configCache.get(config.robotId)!;
    robotConfigs.set(config.configType, config);
  }

  /**
   * 从缓存获取
   */
  private getFromCache(robotId: string, configType: ConfigType): RobotConfig | null {
    const robotConfigs = this.configCache.get(robotId);
    if (!robotConfigs) {
      return null;
    }

    return robotConfigs.get(configType) || null;
  }

  /**
   * 从缓存删除
   */
  private removeFromCache(robotId: string, configType: ConfigType): void {
    const robotConfigs = this.configCache.get(robotId);
    if (robotConfigs) {
      robotConfigs.delete(configType);

      // 如果该机器人的所有配置都被删除，则删除缓存条目
      if (robotConfigs.size === 0) {
        this.configCache.delete(robotId);
      }
    }
  }

  /**
   * 清除缓存
   */
  clearCache(robotId?: string): void {
    if (robotId) {
      this.configCache.delete(robotId);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * 验证配置
   */
  validateConfig(configType: ConfigType, config: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (configType) {
      case ConfigType.RISK_CONTROL:
        const riskControl = config as RiskControlConfig;
        if (riskControl.maxMessagesPerMinute && riskControl.maxMessagesPerMinute < 1) {
          errors.push('maxMessagesPerMinute 必须大于 0');
        }
        if (riskControl.replyDelayMin && riskControl.replyDelayMin < 0) {
          errors.push('replyDelayMin 不能为负数');
        }
        if (riskControl.replyDelayMax && riskControl.replyDelayMax < 0) {
          errors.push('replyDelayMax 不能为负数');
        }
        if (riskControl.replyDelayMin && riskControl.replyDelayMax && riskControl.replyDelayMin > riskControl.replyDelayMax) {
          errors.push('replyDelayMin 不能大于 replyDelayMax');
        }
        break;

      default:
        // 其他配置类型暂不验证
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();
