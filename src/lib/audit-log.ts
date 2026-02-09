import { headers } from 'next/headers';

/**
 * 审计日志记录函数
 * 用于记录管理员的关键操作
 */
export async function logAuditEvent(params: {
  user: {
    userId: number;
    phone: string;
    role: string;
  };
  actionType: string;
  resourceType: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const headersList = headers();

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': headersList.get('x-forwarded-for') || '',
        'user-agent': headersList.get('user-agent') || '',
      },
      body: JSON.stringify({
        actionType: params.actionType,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        description: params.description,
        metadata: params.metadata || {},
      }),
    });

    // 不抛出错误，避免影响主流程
    if (!response.ok) {
      console.error('审计日志记录失败:', await response.text());
    }
  } catch (error) {
    console.error('审计日志记录错误:', error);
  }
}

/**
 * 操作类型常量
 */
export const AuditActionTypes = {
  // 用户操作
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ENABLE: 'user.enable',
  USER_DISABLE: 'user.disable',
  USER_PROMOTE_ADMIN: 'user.promote_admin',
  USER_DEMOTE_ADMIN: 'user.demote_admin',

  // 机器人操作
  ROBOT_CREATE: 'robot.create',
  ROBOT_UPDATE: 'robot.update',
  ROBOT_DELETE: 'robot.delete',
  ROBOT_CONFIG_UPDATE: 'robot.config_update',

  // 激活码操作
  ACTIVATION_CODE_CREATE: 'activation_code.create',
  ACTIVATION_CODE_UPDATE: 'activation_code.update',
  ACTIVATION_CODE_DELETE: 'activation_code.delete',
  ACTIVATION_CODE_USE: 'activation_code.use',
  DEVICE_UNBIND: 'device.unbind',

  // 知识库操作
  KNOWLEDGE_BASE_CREATE: 'knowledge_base.create',
  KNOWLEDGE_BASE_UPDATE: 'knowledge_base.update',
  KNOWLEDGE_BASE_DELETE: 'knowledge_base.delete',
  KNOWLEDGE_ADD: 'knowledge.add',
  KNOWLEDGE_DELETE: 'knowledge.delete',

  // 系统操作
  SYSTEM_CONFIG_UPDATE: 'system.config_update',
  SYSTEM_SETTINGS_UPDATE: 'system.settings_update',
  DATA_EXPORT: 'data.export',

  // 批量操作
  BATCH_DELETE: 'batch.delete',
  BATCH_UPDATE: 'batch.update',
  BATCH_EXPORT: 'batch.export',
} as const;

/**
 * 资源类型常量
 */
export const ResourceTypes = {
  USER: 'user',
  ROBOT: 'robot',
  ACTIVATION_CODE: 'activation_code',
  KNOWLEDGE_BASE: 'knowledge_base',
  KNOWLEDGE: 'knowledge',
  SESSION: 'session',
  MESSAGE: 'message',
  SYSTEM_CONFIG: 'system_config',
  AUDIT_LOG: 'audit_log',
} as const;
