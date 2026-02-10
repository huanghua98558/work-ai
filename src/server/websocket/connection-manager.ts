/**
 * WebSocket 连接管理器
 * 负责管理所有 WebSocket 连接的生命周期
 */

import { WebSocket } from 'ws';
import { messageHandler, WebSocketConnection } from './message-handler';

export interface ConnectionManager {
  addConnection(ws: WebSocket): void;
  removeConnection(ws: WebSocket): void;
  getConnection(robotId: string): WebSocketConnection | undefined;
  getAllConnections(): WebSocketConnection[];
  getConnectionCount(): number;
  broadcast(message: any, excludeRobotIds?: string[]): void;
  startHeartbeatCheck(): void;
  stopHeartbeatCheck(): void;
}

/**
 * 连接管理器实现
 */
class ConnectionManagerImpl implements ConnectionManager {
  private connections: Map<WebSocket, WebSocketConnection> = new Map();
  private robotIdMap: Map<string, WebSocket> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒检查一次
  private readonly HEARTBEAT_TIMEOUT = 60000; // 60秒超时

  /**
   * 添加连接
   */
  addConnection(ws: WebSocket): void {
    const connection: WebSocketConnection = {
      ws,
      authenticated: false,
      lastHeartbeatAt: new Date(),
      connectedAt: Date.now(),
    };

    this.connections.set(ws, connection);

    ws.on('close', () => {
      this.removeConnection(ws);
    });

    ws.on('error', (error) => {
      console.error(`[ConnectionManager] 连接错误:`, error);
      this.removeConnection(ws);
    });

    console.log(`[ConnectionManager] 新连接已添加，当前连接数: ${this.connections.size}`);
  }

  /**
   * 移除连接
   */
  removeConnection(ws: WebSocket): void {
    const connection = this.connections.get(ws);

    if (connection && connection.robotId) {
      this.robotIdMap.delete(connection.robotId);
      const connectionDuration = Date.now() - connection.connectedAt;
      console.log(
        `[ConnectionManager] 连接已移除: ${connection.robotId}, 连接时长: ${Math.round(connectionDuration / 1000)}s`
      );
    }

    this.connections.delete(ws);
    console.log(`[ConnectionManager] 当前连接数: ${this.connections.size}`);
  }

  /**
   * 根据 robotId 获取连接
   */
  getConnection(robotId: string): WebSocketConnection | undefined {
    const ws = this.robotIdMap.get(robotId);
    if (!ws) {
      return undefined;
    }
    return this.connections.get(ws);
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 获取连接数
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 广播消息
   */
  broadcast(message: any, excludeRobotIds: string[] = []): void {
    let sentCount = 0;
    const deadConnections: WebSocket[] = [];

    for (const [ws, connection] of this.connections.entries()) {
      if (!connection.authenticated || !connection.robotId) {
        continue;
      }

      if (excludeRobotIds.includes(connection.robotId)) {
        continue;
      }

      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
          sentCount++;
        } else {
          // 连接已关闭，标记为需要清理
          deadConnections.push(ws);
        }
      } catch (error) {
        console.error(`[ConnectionManager] 发送消息失败: ${connection.robotId}`, error);
        deadConnections.push(ws);
      }
    }

    // 清理死连接
    deadConnections.forEach(ws => this.removeConnection(ws));

    console.log(`[ConnectionManager] 广播消息到 ${sentCount} 个连接`);
  }

  /**
   * 更新连接的 robotId
   */
  updateRobotId(ws: WebSocket, robotId: string): void {
    const connection = this.connections.get(ws);
    if (!connection) {
      return;
    }

    // 如果已有 robotId，先删除旧映射
    if (connection.robotId) {
      this.robotIdMap.delete(connection.robotId);
    }

    // 更新 robotId
    connection.robotId = robotId;
    this.robotIdMap.set(robotId, ws);

    console.log(`[ConnectionManager] 连接已绑定 robotId: ${robotId}`);
  }

  /**
   * 更新心跳时间
   */
  updateHeartbeat(ws: WebSocket): void {
    const connection = this.connections.get(ws);
    if (connection) {
      connection.lastHeartbeatAt = new Date();
    }
  }

  /**
   * 根据 WebSocket 获取连接
   */
  getConnectionByWs(ws: WebSocket): WebSocketConnection | undefined {
    return this.connections.get(ws);
  }

  /**
   * 获取已认证的连接
   */
  getAuthenticatedConnections(): WebSocketConnection[] {
    return this.getAllConnections().filter(conn => conn.authenticated);
  }

  /**
   * 启动心跳检查
   */
  startHeartbeatCheck(): void {
    if (this.heartbeatInterval) {
      return;
    }

    console.log('[ConnectionManager] 启动心跳检查');

    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * 停止心跳检查
   */
  stopHeartbeatCheck(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('[ConnectionManager] 停止心跳检查');
    }
  }

  /**
   * 检查心跳
   */
  private checkHeartbeats(): void {
    const now = new Date();
    const timeoutConnections: Array<{ ws: WebSocket; connection: WebSocketConnection; elapsed: number }> = [];

    for (const [ws, connection] of this.connections.entries()) {
      const elapsed = now.getTime() - connection.lastHeartbeatAt.getTime();

      if (elapsed > this.HEARTBEAT_TIMEOUT) {
        timeoutConnections.push({ ws, connection, elapsed });
      }
    }

    // 处理超时连接
    if (timeoutConnections.length > 0) {
      console.warn(
        `[ConnectionManager] 发现 ${timeoutConnections.length} 个超时连接，开始清理`
      );

      timeoutConnections.forEach(({ ws, connection, elapsed }) => {
        console.warn(
          `[ConnectionManager] 关闭超时连接: ${connection.robotId || 'unknown'}, 超时时间: ${Math.round(elapsed / 1000)}s`
        );

        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'HEARTBEAT_TIMEOUT',
              message: '心跳超时，连接已断开'
            }));
            ws.close(1000, 'Heartbeat timeout');
          }
        } catch (error) {
          console.error('[ConnectionManager] 关闭超时连接失败:', error);
        }

        this.removeConnection(ws);
      });
    }
  }

  /**
   * 清理超时连接
   */
  cleanupTimeoutConnections(timeoutMs: number = 60 * 1000): number {
    const now = Date.now();
    const toRemove: WebSocket[] = [];

    for (const [ws, connection] of this.connections.entries()) {
      if (!connection.lastHeartbeatAt) {
        continue;
      }

      const elapsed = now - connection.lastHeartbeatAt.getTime();
      if (elapsed > timeoutMs) {
        console.log(
          `[ConnectionManager] 发现超时连接: ${connection.robotId}, 超时时间: ${Math.round(elapsed / 1000)}秒`
        );
        toRemove.push(ws);
      }
    }

    // 关闭超时连接
    toRemove.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Connection timeout');
        }
      } catch (error) {
        console.error('[ConnectionManager] 关闭超时连接失败:', error);
      }
    });

    // 记录清理日志
    if (toRemove.length > 0) {
      console.log(
        `[ConnectionManager] 清理了 ${toRemove.length} 个超时连接, ` +
          `总连接数: ${this.connections.size}`
      );
    }

    return toRemove.length;
  }

  /**
   * 获取心跳统计信息
   */
  getHeartbeatStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    activeConnections: number;
    warningConnections: number;
    timeoutConnections: number;
  } {
    const now = Date.now();
    const connections = this.getAuthenticatedConnections();
    const WARNING_THRESHOLD = 50 * 1000; // 50秒
    const TIMEOUT_THRESHOLD = 60 * 1000; // 60秒

    let activeConnections = 0;
    let warningConnections = 0;
    let timeoutConnections = 0;

    for (const connection of connections) {
      if (!connection.lastHeartbeatAt) {
        continue;
      }

      const elapsed = now - connection.lastHeartbeatAt.getTime();

      if (elapsed < WARNING_THRESHOLD) {
        activeConnections++;
      } else if (elapsed < TIMEOUT_THRESHOLD) {
        warningConnections++;
      } else {
        timeoutConnections++;
      }
    }

    return {
      totalConnections: this.connections.size,
      authenticatedConnections: connections.length,
      activeConnections,
      warningConnections,
      timeoutConnections,
    };
  }
}

// 导出单例实例
export const connectionManager = new ConnectionManagerImpl();

// 启动心跳检查
connectionManager.startHeartbeatCheck();

