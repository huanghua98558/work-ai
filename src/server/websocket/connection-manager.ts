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
}

/**
 * 连接管理器实现
 */
class ConnectionManagerImpl implements ConnectionManager {
  private connections: Map<WebSocket, WebSocketConnection> = new Map();
  private robotIdMap: Map<string, WebSocket> = new Map();

  /**
   * 添加连接
   */
  addConnection(ws: WebSocket): void {
    const connection: WebSocketConnection = {
      ws,
      authenticated: false,
    };

    this.connections.set(ws, connection);

    ws.on('close', () => {
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
      console.log(`[ConnectionManager] 连接已移除: ${connection.robotId}`);
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

    for (const connection of this.connections.values()) {
      if (!connection.authenticated || !connection.robotId) {
        continue;
      }

      if (excludeRobotIds.includes(connection.robotId)) {
        continue;
      }

      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
        sentCount++;
      }
    }

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
   * 清理超时连接
   */
  cleanupTimeoutConnections(timeoutMs: number = 60 * 1000): void {
    const now = Date.now();
    const toRemove: WebSocket[] = [];
    const timeoutInfo: Array<{ robotId: string; elapsed: number }> = [];

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
        timeoutInfo.push({
          robotId: connection.robotId || 'unknown',
          elapsed,
        });
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
      const totalTimeout = timeoutInfo.reduce((sum, info) => sum + info.elapsed, 0);
      const avgTimeout = totalTimeout / timeoutInfo.length;

      console.log(
        `[ConnectionManager] 清理了 ${toRemove.length} 个超时连接, ` +
          `平均超时时间: ${Math.round(avgTimeout / 1000)}秒, ` +
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
