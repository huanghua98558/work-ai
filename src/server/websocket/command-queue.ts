/**
 * 指令队列管理器
 * 负责管理指令的排队、优先级排序和状态跟踪
 */

import { getPool } from '@/lib/db';
import {
  CommandPushData,
  CommandStatus,
  CommandPriority,
  CommandType,
  COMMAND_CODE_MAP,
} from './types';

export interface QueuedCommand extends CommandPushData {
  status: CommandStatus;
  createdAt: Date;
  updatedAt: Date;
  executedAt?: Date;
  result?: any;
  errorMessage?: string;
}

/**
 * 指令队列管理器
 */
export class CommandQueue {
  private static instance: CommandQueue;
  private queue: Map<string, QueuedCommand> = new Map();
  private processing: Set<string> = new Set();

  private constructor() {}

  static getInstance(): CommandQueue {
    if (!CommandQueue.instance) {
      CommandQueue.instance = new CommandQueue();
    }
    return CommandQueue.instance;
  }

  /**
   * 添加指令到队列
   */
  async addCommand(command: CommandPushData): Promise<QueuedCommand> {
    const queuedCommand: QueuedCommand = {
      ...command,
      status: CommandStatus.PENDING,
      commandCode: COMMAND_CODE_MAP[command.commandType as CommandType],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 保存到队列
    this.queue.set(command.commandId, queuedCommand);

    // 保存到数据库
    await this.saveToDatabase(queuedCommand);

    console.log(`[CommandQueue] 指令已添加到队列: ${command.commandId}, 类型: ${command.commandType}, 优先级: ${command.priority}`);

    return queuedCommand;
  }

  /**
   * 获取下一个待执行的指令
   */
  getNextCommand(robotId: string): QueuedCommand | null {
    // 筛选出指定机器人的待执行指令
    const commands = Array.from(this.queue.values())
      .filter(cmd => !this.processing.has(cmd.commandId))
      .filter(cmd => !robotId || this.isCommandForRobot(cmd, robotId))
      .filter(cmd => cmd.status === CommandStatus.PENDING)
      .sort((a, b) => {
        // 按优先级排序（高优先级在前）
        const priorityDiff = (b.priority || CommandPriority.NORMAL) - (a.priority || CommandPriority.NORMAL);
        if (priorityDiff !== 0) return priorityDiff;

        // 优先级相同，按创建时间排序（早的在前）
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return commands.length > 0 ? commands[0] : null;
  }

  /**
   * 标记指令为执行中
   */
  async markExecuting(commandId: string): Promise<void> {
    const command = this.queue.get(commandId);
    if (!command) {
      throw new Error(`指令不存在: ${commandId}`);
    }

    command.status = CommandStatus.EXECUTING;
    command.updatedAt = new Date();
    this.processing.add(commandId);

    await this.updateInDatabase(command);

    console.log(`[CommandQueue] 指令标记为执行中: ${commandId}`);
  }

  /**
   * 标记指令为成功
   */
  async markSuccess(commandId: string, result: any): Promise<void> {
    const command = this.queue.get(commandId);
    if (!command) {
      throw new Error(`指令不存在: ${commandId}`);
    }

    command.status = CommandStatus.SUCCESS;
    command.result = result;
    command.executedAt = new Date();
    command.updatedAt = new Date();
    this.processing.delete(commandId);

    await this.updateInDatabase(command);

    console.log(`[CommandQueue] 指令执行成功: ${commandId}, 结果:`, result);
  }

  /**
   * 标记指令为失败
   */
  async markFailed(commandId: string, errorMessage: string): Promise<void> {
    const command = this.queue.get(commandId);
    if (!command) {
      throw new Error(`指令不存在: ${commandId}`);
    }

    command.status = CommandStatus.FAILED;
    command.errorMessage = errorMessage;
    command.executedAt = new Date();
    command.updatedAt = new Date();
    this.processing.delete(commandId);

    await this.updateInDatabase(command);

    console.error(`[CommandQueue] 指令执行失败: ${commandId}, 错误: ${errorMessage}`);
  }

  /**
   * 获取指令状态
   */
  getCommand(commandId: string): QueuedCommand | undefined {
    return this.queue.get(commandId);
  }

  /**
   * 获取机器人的所有指令
   */
  getRobotCommands(robotId: string): QueuedCommand[] {
    return Array.from(this.queue.values()).filter(cmd =>
      this.isCommandForRobot(cmd, robotId)
    );
  }

  /**
   * 清理已完成的指令
   */
  cleanCompletedCommands(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    const toDelete: string[] = [];

    for (const [commandId, command] of this.queue.entries()) {
      const isCompleted = command.status === CommandStatus.SUCCESS || command.status === CommandStatus.FAILED;
      const isOld = command.executedAt && (now.getTime() - command.executedAt.getTime()) > maxAge;

      if (isCompleted && isOld) {
        toDelete.push(commandId);
      }
    }

    toDelete.forEach(commandId => {
      this.queue.delete(commandId);
    });

    if (toDelete.length > 0) {
      console.log(`[CommandQueue] 清理了 ${toDelete.length} 个已完成的指令`);
    }
  }

  /**
   * 从数据库保存指令
   */
  private async saveToDatabase(command: QueuedCommand): Promise<void> {
    try {
      const poolInstance = await getPool();
      const client = await poolInstance.connect();

      try {
        await client.query(
          `INSERT INTO commands (
            id, robot_id, command_type, command_code, target, params,
            priority, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at`,
          [
            command.commandId,
            'unknown', // TODO: 从 params 或其他地方获取 robotId
            command.commandType,
            command.commandCode,
            command.target || null,
            JSON.stringify(command.params),
            command.priority || CommandPriority.NORMAL,
            command.status,
            command.createdAt,
            command.updatedAt,
          ]
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[CommandQueue] 保存指令到数据库失败:', error);
    }
  }

  /**
   * 更新数据库中的指令
   */
  private async updateInDatabase(command: QueuedCommand): Promise<void> {
    try {
      const poolInstance = await getPool();
      const client = await poolInstance.connect();

      try {
        await client.query(
          `UPDATE commands SET
            status = $1,
            result = $2,
            error_message = $3,
            executed_at = $4,
            updated_at = $5
          WHERE id = $6`,
          [
            command.status,
            command.result ? JSON.stringify(command.result) : null,
            command.errorMessage || null,
            command.executedAt || null,
            command.updatedAt,
            command.commandId,
          ]
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[CommandQueue] 更新指令到数据库失败:', error);
    }
  }

  /**
   * 判断指令是否属于指定机器人
   */
  private isCommandForRobot(command: QueuedCommand, robotId: string): boolean {
    // TODO: 需要从指令中提取 robotId
    // 当前简单实现：假设 robotId 在某个地方
    return true;
  }

  /**
   * 获取队列统计信息
   */
  getStats(): { total: number; pending: number; executing: number; success: number; failed: number } {
    const commands = Array.from(this.queue.values());

    return {
      total: commands.length,
      pending: commands.filter(c => c.status === CommandStatus.PENDING).length,
      executing: commands.filter(c => c.status === CommandStatus.EXECUTING).length,
      success: commands.filter(c => c.status === CommandStatus.SUCCESS).length,
      failed: commands.filter(c => c.status === CommandStatus.FAILED).length,
    };
  }
}

// 导出单例实例
export const commandQueue = CommandQueue.getInstance();
