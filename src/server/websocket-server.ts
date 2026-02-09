import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { getPool } from '@/lib/db';

// 扩展全局类型，支持 WebSocket 连接存储
declare global {
  var __webSocketConnections: Map<string, any> | undefined;
  var __webSocketServerStatus: 'running' | 'stopped' | undefined;
}

console.log('[WebSocket] Module loaded (instance:', Date.now(), ')');

// WebSocket 连接存储
interface WSConnection {
  ws: WebSocket;
  robotId: string;
  userId: number | null;
  deviceId: string;
  lastHeartbeat: number;
  connectedAt: number;
}

// 使用全局变量管理连接，避免开发环境模块多次加载导致状态丢失
let connections = new Map<string, WSConnection>();
if (typeof global !== 'undefined' && global.__webSocketConnections) {
  connections = global.__webSocketConnections;
  console.log('[WebSocket] 从全局变量恢复连接列表，连接数:', connections.size);
}

// 心跳间隔（毫秒）
const HEARTBEAT_INTERVAL = 30 * 1000; // 30秒
// 超时判定（毫秒）
const HEARTBEAT_TIMEOUT = 60 * 1000; // 60秒

// 认证超时时间（毫秒）
const AUTH_TIMEOUT = 30 * 1000; // 30秒

// 最大连接数限制（防止内存耗尽）
const MAX_WS_CONNECTIONS = 100;

// 心跳检测定时器
let heartbeatTimer: NodeJS.Timeout | null = null;

// 全局服务器状态标志（模块加载之间保持一致）
let globalServerStatus: 'running' | 'stopped' = 'stopped';
if (typeof global !== 'undefined' && global.__webSocketServerStatus) {
  globalServerStatus = global.__webSocketServerStatus;
  console.log('[WebSocket] 从全局变量恢复服务器状态:', globalServerStatus);
}

/**
 * 初始化 WebSocket 服务器
 */
export async function initializeWebSocketServer(server: any) {
  console.log('[WebSocket] Initializing WebSocket server...');

  try {
    // 初始化数据库连接池
    console.log('[WebSocket] Initializing database connection pool...');
    await getPool();
    console.log('[WebSocket] Database connection pool initialized');

    // 立即更新服务器状态为运行中
    globalServerStatus = 'running';
    if (typeof global !== 'undefined') {
      global.__webSocketServerStatus = 'running';
      console.log('[WebSocket] 已设置全局服务器状态为 running');
    }

    const wss = new (WebSocket as any).Server({ noServer: true });

    // 处理 HTTP 升级请求
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      try {
        const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

        // 处理 /ws 路径（机器人连接）
        if (pathname === '/ws') {
          wss.handleUpgrade(request, socket, head, (ws: any) => {
            wss.emit('connection', ws, request);
          });
        } else if (pathname === '/api/v1/logs/stream') {
          // 处理日志流 WebSocket 连接
          wss.handleUpgrade(request, socket, head, (ws: any) => {
            wss.emit('logStreamConnection', ws, request);
          });
        } else {
          socket.destroy();
        }
      } catch (err) {
        console.error('[WebSocket] Error handling upgrade:', err);
        socket.destroy();
      }
    });

    // 处理机器人连接
    wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
      let isAuthenticated = false;
      let robotId: string | null = null;
      let authTimeoutTimer: NodeJS.Timeout | null = null;
      let connection: WSConnection | null = null;

      console.log(`[WebSocket] 新连接尝试，等待认证消息...`);

      // 设置认证超时（30秒内必须发送认证消息）
      authTimeoutTimer = setTimeout(() => {
        if (!isAuthenticated) {
          console.log(`[WebSocket] 认证超时，断开连接`);
          const errorMsg = {
            type: 'error',
            code: 4006,
            message: '认证超时',
          };
          try {
            ws.send(JSON.stringify(errorMsg));
            ws.close(4006, '认证超时');
          } catch (e) {
            // 忽略发送错误
          }
        }
      }, AUTH_TIMEOUT);

      // 处理消息
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          const { type, data: msgData } = message;

          // 如果未认证，只接受 authenticate 类型的消息
          if (!isAuthenticated) {
            if (type === 'authenticate') {
              // 处理认证
              await handleAuthenticate(ws, msgData, request, (authResult: any) => {
                if (authResult.success) {
                  // 认证成功
                  isAuthenticated = true;
                  robotId = authResult.robotId;
                  if (authTimeoutTimer) clearTimeout(authTimeoutTimer);

                  // 创建连接记录
                  connection = {
                    ws,
                    robotId: authResult.robotId,
                    userId: authResult.userId,
                    deviceId: authResult.deviceId,
                    lastHeartbeat: Date.now(),
                    connectedAt: Date.now(),
                  };

                  connections.set(authResult.robotId, connection);

                  // 保存到全局变量
                  if (typeof global !== 'undefined') {
                    global.__webSocketConnections = connections;
                  }

                  console.log(`[WebSocket] 机器人 ${robotId} 已认证并连接，当前连接数: ${connections.size}`);

                  // 发送认证成功消息
                  ws.send(JSON.stringify({
                    type: 'authenticated',
                    data: {
                      authenticated: true,
                      robotId,
                      deviceId: authResult.deviceId,
                      userId: authResult.userId,
                      timestamp: Date.now(),
                    },
                  }));
                } else {
                  // 认证失败
                  if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
                  const errorMsg = {
                    type: 'error',
                    code: authResult.code || 4001,
                    message: authResult.message || '认证失败',
                  };
                  try {
                    ws.send(JSON.stringify(errorMsg));
                    ws.close(authResult.code || 4001, authResult.message || '认证失败');
                  } catch (e) {
                    // 忽略发送错误
                  }
                }
              });
            } else {
              // 未认证且不是认证消息，返回错误
              const errorMsg = {
                type: 'error',
                code: 4001,
                message: '请先进行认证',
              };
              try {
                ws.send(JSON.stringify(errorMsg));
              } catch (e) {
                // 忽略发送错误
              }
            }
            return;
          }

          // 已认证，处理其他消息
          await handleWsMessage(robotId!, message, connection!);

        } catch (error) {
          console.error(`[WebSocket] 消息处理错误:`, error);
          try {
            ws.send(JSON.stringify({
              type: 'error',
              code: 4000,
              message: '消息格式错误',
            }));
          } catch (e) {
            // 忽略发送错误
          }
        }
      });

      // 处理心跳
      ws.on('pong', () => {
        if (robotId && connections.has(robotId)) {
          const conn = connections.get(robotId)!;
          conn.lastHeartbeat = Date.now();
        }
      });

      // 处理关闭
      ws.on('close', () => {
        if (robotId && connections.has(robotId)) {
          connections.delete(robotId);

          // 保存到全局变量，避免开发环境模块多次加载导致状态丢失
          if (typeof global !== 'undefined') {
            global.__webSocketConnections = connections;
          }

          console.log(`[WebSocket] 机器人 ${robotId} 已断开，当前连接数: ${connections.size}`);
        }

        // 清理认证超时定时器
        if (authTimeoutTimer) {
          clearTimeout(authTimeoutTimer);
        }
      });

      // 处理错误
      ws.on('error', (error) => {
        console.error(`[WebSocket] 连接错误:`, error);
        if (robotId && connections.has(robotId)) {
          connections.delete(robotId);

          // 保存到全局变量，避免开发环境模块多次加载导致状态丢失
          if (typeof global !== 'undefined') {
            global.__webSocketConnections = connections;
          }
        }

        // 清理认证超时定时器
        if (authTimeoutTimer) {
          clearTimeout(authTimeoutTimer);
        }
      });
    });

    // 处理日志流连接
    wss.on('logStreamConnection', async (ws: WebSocket, request: IncomingMessage) => {
      let isAuthenticated = false;
      let authTimeoutTimer: NodeJS.Timeout | null = null;
      let authenticatedRobotId: string | null = null;
      let authenticatedUserId: number | null = null;

      try {
        const { searchParams } = new URL(request.url || '', `http://${request.headers.host}`);
        const robotId = searchParams.get('robotId');
        const token = searchParams.get('token');

        console.log(`[LogStream] 新连接尝试: robotId=${robotId}`);

        // 验证参数
        if (!robotId || !token) {
          const errorMsg = {
            type: 'error',
            code: 4001,
            message: '缺少必要参数：robotId 和 token',
          };
          ws.send(JSON.stringify(errorMsg));
          ws.close(4001, '缺少必要参数');
          return;
        }

        // 设置认证超时
        authTimeoutTimer = setTimeout(() => {
          if (!isAuthenticated) {
            console.log(`[LogStream] 机器人 ${robotId} 认证超时`);
            const errorMsg = {
              type: 'error',
              code: 4006,
              message: '认证超时',
            };
            ws.send(JSON.stringify(errorMsg));
            ws.close(4006, '认证超时');
          }
        }, AUTH_TIMEOUT);

        // 验证 Token
        const poolInstance = await getPool();
        const client = await poolInstance.connect();
        try {
          const tokenResult = await client.query(
            `SELECT * FROM device_tokens WHERE access_token = $1 AND robot_id = $2`,
            [token, robotId]
          );

          if (tokenResult.rows.length === 0) {
            if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
            const errorMsg = {
              type: 'error',
              code: 4001,
              message: 'Token 无效',
            };
            ws.send(JSON.stringify(errorMsg));
            ws.close(4001, 'Token 无效');
            return;
          }

          const tokenRecord = tokenResult.rows[0];

          if (new Date() > new Date(tokenRecord.expires_at)) {
            if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
            const errorMsg = {
              type: 'error',
              code: 4007,
              message: 'Token 已过期',
            };
            ws.send(JSON.stringify(errorMsg));
            ws.close(4007, 'Token 已过期');
            return;
          }

          // 认证成功
          isAuthenticated = true;
          authenticatedRobotId = robotId;
          if (authTimeoutTimer) clearTimeout(authTimeoutTimer);

          console.log(`[LogStream] 机器人 ${robotId} 已认证并连接到日志流`);

          // 发送认证成功消息
          ws.send(JSON.stringify({
            type: 'authenticated',
            message: '认证成功',
            data: {
              robotId,
              timestamp: Date.now(),
            },
          }));

          // 处理消息
          ws.on('message', async (data: Buffer) => {
            try {
              const message = JSON.parse(data.toString());
              await handleLogStreamMessage(robotId, message, ws);
            } catch (error) {
              console.error(`[LogStream] 消息处理错误:`, error);
              ws.send(JSON.stringify({
                type: 'error',
                code: 4000,
                message: '消息格式错误',
              }));
            }
          });

          // 处理关闭
          ws.on('close', () => {
            console.log(`[LogStream] 机器人 ${robotId} 已断开日志流`);
          });

          // 处理错误
          ws.on('error', (error) => {
            console.error(`[LogStream] 机器人 ${robotId} 连接错误:`, error);
          });

        } finally {
          client.release();
        }
      } catch (error) {
        console.error('[LogStream] 连接处理错误:', error);
        if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
        ws.close(1000, '连接处理失败');
      }
    });

    // 启动心跳检测
    try {
      startHeartbeatCheck();
    } catch (error) {
      console.error('[WebSocket] 启动心跳检测失败:', error);
    }

    console.log('[WebSocket] 服务器已启动');
  } catch (err) {
    console.error('[WebSocket] 初始化失败:', err);
    throw err;
  }
}

/**
 * 处理认证消息
 */
async function handleAuthenticate(
  ws: WebSocket,
  data: any,
  request: IncomingMessage,
  callback: (result: { success: boolean; robotId?: string; userId?: number; deviceId?: string; code?: number; message?: string }) => void
) {
  try {
    const { robotId, token, timestamp } = data;

    console.log(`[WebSocket] 收到认证请求: robotId=${robotId}, timestamp=${timestamp}`);

    // 验证必要参数
    if (!robotId || !token) {
      return callback({
        success: false,
        code: 4001,
        message: '缺少必要参数：robotId 和 token',
      });
    }

    // 检查连接数限制
    if (connections.size >= MAX_WS_CONNECTIONS) {
      console.warn(`[WebSocket] 连接数已达上限 (${MAX_WS_CONNECTIONS})，拒绝新连接`);
      return callback({
        success: false,
        code: 4029,
        message: `服务器连接数已达上限 (${MAX_WS_CONNECTIONS})`,
      });
    }

    // 验证 Token 和设备绑定
    const poolInstance = await getPool();
    const client = await poolInstance.connect();
    try {
      // 查找 token 记录
      const tokenResult = await client.query(
        `SELECT * FROM device_tokens WHERE access_token = $1 AND robot_id = $2`,
        [token, robotId]
      );

      if (tokenResult.rows.length === 0) {
        console.warn(`[WebSocket] Token 无效: robotId=${robotId}`);
        return callback({
          success: false,
          code: 4001,
          message: 'Token 无效',
        });
      }

      const tokenRecord = tokenResult.rows[0];

      // 检查 token 是否过期
      if (new Date() > new Date(tokenRecord.expires_at)) {
        console.warn(`[WebSocket] Token 已过期: robotId=${robotId}`);
        return callback({
          success: false,
          code: 4007,
          message: 'Token 已过期',
        });
      }

      // 检查设备绑定是否有效
      const deviceBindingResult = await client.query(
        `SELECT * FROM device_bindings WHERE robot_id = $1`,
        [robotId]
      );

      if (deviceBindingResult.rows.length === 0) {
        console.warn(`[WebSocket] 设备未绑定: robotId=${robotId}`);
        return callback({
          success: false,
          code: 4001,
          message: '设备未绑定',
        });
      }

      const deviceBinding = deviceBindingResult.rows[0];

      // 认证成功
      callback({
        success: true,
        robotId,
        userId: deviceBinding.user_id,
        deviceId: deviceBinding.device_id,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[WebSocket] 认证处理错误:', error);
    callback({
      success: false,
      code: 4000,
      message: '认证处理失败',
    });
  }
}

/**
 * 处理 WebSocket 消息
 */
async function handleWsMessage(robotId: string, message: any, connection: WSConnection) {
  const { type, data } = message;

  switch (type) {
    case 'ping':
      // 心跳响应
      connection.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now(),
      }));
      connection.lastHeartbeat = Date.now();
      break;

    case 'message':
      // 消息上报
      console.log(`[WebSocket] 收到消息:`, data);
      await handleIncomingMessage(robotId, data, connection);
      connection.ws.send(JSON.stringify({
        type: 'message_ack',
        messageId: data.messageId,
        timestamp: Date.now(),
      }));
      break;

    case 'status':
      // 状态更新
      console.log(`[WebSocket] 状态更新:`, data);
      await updateRobotStatus(robotId, data);
      connection.ws.send(JSON.stringify({
        type: 'status_ack',
        timestamp: Date.now(),
      }));
      break;

    case 'config_ack':
      // 配置确认
      console.log(`[WebSocket] 收到配置确认: robotId=${robotId}`, data);
      await handleConfigAck(robotId, data);
      break;

    case 'config_nack':
      // 配置拒绝
      console.log(`[WebSocket] 收到配置拒绝: robotId=${robotId}`, data);
      await handleConfigNack(robotId, data);
      break;

    case 'message_log':
      // 消息日志上报
      console.log(`[WebSocket] 收到消息日志: robotId=${robotId}`, data);
      await handleMessageLog(robotId, data);
      break;

    default:
      connection.ws.send(JSON.stringify({
        type: 'error',
        code: 4000,
        message: `未知的消息类型: ${type}`,
      }));
  }
}

/**
 * 处理收到的消息
 */
async function handleIncomingMessage(robotId: string, messageData: any, connection: WSConnection) {
  try {
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      // 检查消息是否已存在
      const existingMessageResult = await client.query(
        `SELECT id FROM messages WHERE robot_id = $1 AND content = $2 LIMIT 1`,
        [robotId, messageData.messageId || `msg-${Date.now()}`]
      );

      if (existingMessageResult.rows.length > 0) {
        console.log(`[WebSocket] 消息已存在: ${messageData.messageId}`);
        return;
      }

      // 保存消息到数据库（适配现有表结构）
      const insertResult = await client.query(
        `INSERT INTO messages (
          robot_id,
          user_id,
          session_id,
          message_type,
          content,
          extra_data,
          status,
          direction,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          robotId,
          messageData.senderId || 'unknown',
          `session-${robotId}-${Date.now()}`,
          messageData.messageType || 'text',
          messageData.messageId || `msg-${Date.now()}`,
          JSON.stringify({
            originalContent: messageData.content || '',
            senderId: messageData.senderId || 'unknown',
            senderName: messageData.senderName || 'Unknown',
            chatType: messageData.chatType || 'single',
            groupName: messageData.groupName || null,
            timestamp: messageData.timestamp || new Date().toISOString(),
            ...messageData.extraData,
          }),
          'received',
          'incoming',
          new Date(messageData.timestamp || Date.now()),
        ]
      );

      const messageId = insertResult.rows[0].id;

      // 查询机器人配置
      const robotResult = await client.query(
        `SELECT
          r.id,
          r.name,
          r.ai_mode,
          r.third_party_callback_url,
          r.third_party_callback_secret_key,
          r.ai_provider,
          r.ai_model
        FROM robots r
        WHERE r.robot_id = $1`,
        [robotId]
      );

      if (robotResult.rows.length === 0) {
        console.warn(`[WebSocket] 机器人不存在: ${robotId}`);
        return;
      }

      const robot = robotResult.rows[0];

      // 根据配置处理消息
      // 优先级：第三方回调 > 内置 AI
      if (robot.third_party_callback_url && robot.third_party_callback_url.trim() !== '') {
        // 第三方回调模式：转发消息到第三方回调地址
        console.log(`[WebSocket] 转发消息到第三方回调: ${robot.third_party_callback_url}`);
        await forwardMessageToThirdParty(robotId, messageData, robot.third_party_callback_url, robot.third_party_callback_secret_key);
      } else if (robot.ai_mode === 'builtin') {
        // 内置 AI 模式：调用内置 AI 生成回复
        console.log(`[WebSocket] 内置 AI 模式: provider=${robot.ai_provider}, model=${robot.ai_model}`);
        // TODO: 实现内置 AI 逻辑
        // await callBuiltinAI(robotId, messageData, robot);
      } else {
        console.log(`[WebSocket] 未配置 AI 模式或第三方回调，消息已保存`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[WebSocket] 处理收到的消息失败:`, error);
  }
}

/**
 * 转发消息到第三方回调地址
 */
async function forwardMessageToThirdParty(
  robotId: string,
  messageData: any,
  callbackUrl: string,
  secretKey?: string | null
) {
  try {
    const payload = {
      messageId: messageData.messageId || `msg-${Date.now()}`,
      senderId: messageData.senderId || 'unknown',
      senderName: messageData.senderName || 'Unknown',
      messageType: messageData.messageType || 'text',
      content: messageData.content || '',
      chatType: messageData.chatType || 'single',
      extraData: messageData.extraData || null,
      timestamp: messageData.timestamp || new Date().toISOString(),
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 如果有密钥，计算签名
    if (secretKey) {
      const timestamp = Date.now().toString();
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(`${robotId}:${JSON.stringify(payload)}:${timestamp}`)
        .digest('hex');

      headers['X-Robot-Id'] = robotId;
      headers['X-Timestamp'] = timestamp;
      headers['X-Signature'] = signature;
    }

    // 发送 POST 请求（不等待响应）
    fetch(callbackUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error(`[WebSocket] 第三方回调失败: ${callbackUrl}`, error);
    });

    console.log(`[WebSocket] 消息已转发到第三方回调`);
  } catch (error) {
    console.error('[WebSocket] 转发消息到第三方失败:', error);
  }
}

/**
 * 处理日志流消息
 */
async function handleLogStreamMessage(robotId: string, message: any, ws: WebSocket) {
  const { type, data } = message;

  switch (type) {
    case 'ping':
      // 心跳响应
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now(),
      }));
      break;

    case 'subscribe':
      // 订阅实时日志推送
      console.log(`[LogStream] 机器人 ${robotId} 订阅实时日志推送`);
      ws.send(JSON.stringify({
        type: 'subscribed',
        message: '订阅成功',
        data: {
          robotId,
          timestamp: Date.now(),
        },
      }));
      break;

    case 'unsubscribe':
      // 取消订阅
      console.log(`[LogStream] 机器人 ${robotId} 取消订阅实时日志推送`);
      ws.send(JSON.stringify({
        type: 'unsubscribed',
        message: '取消订阅成功',
        data: {
          robotId,
          timestamp: Date.now(),
        },
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        code: 4000,
        message: `未知的消息类型: ${type}`,
      }));
  }
}

/**
 * 更新机器人状态
 */
async function updateRobotStatus(robotId: string, status: any) {
  try {
    const poolInstance = await getPool();
    const client = await poolInstance.connect();
    try {
      await client.query(
        'UPDATE device_bindings SET last_active_at = NOW() WHERE robot_id = $1',
        [robotId]
      );
      console.log(`[WebSocket] 机器人 ${robotId} 状态已更新:`, status);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[WebSocket] 更新机器人状态失败:`, error);
  }
}

/**
 * 启动心跳检测
 */
function startHeartbeatCheck() {
  if (heartbeatTimer) {
    console.log('[WebSocket] 心跳检测已经在运行');
    return;
  }

  console.log('[WebSocket] 启动心跳检测...');
  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    const timeoutConnections: string[] = [];

    connections.forEach((conn, robotId) => {
      // 检查是否超时
      if (now - conn.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        timeoutConnections.push(robotId);
      } else {
        // 发送 ping
        conn.ws.ping();
      }
    });

    // 关闭超时连接
    timeoutConnections.forEach(robotId => {
      const conn = connections.get(robotId);
      if (conn) {
        console.log(`[WebSocket] 机器人 ${robotId} 心跳超时，断开连接`);
        conn.ws.close(1000, '心跳超时');
        connections.delete(robotId);

        // 保存到全局变量
        if (typeof global !== 'undefined') {
          global.__webSocketConnections = connections;
        }
      }
    });
  }, HEARTBEAT_INTERVAL);

  globalServerStatus = 'running';
  if (typeof global !== 'undefined') {
    global.__webSocketServerStatus = 'running';
    console.log('[WebSocket] 已设置全局服务器状态为 running');
  }

  console.log('[WebSocket] 心跳检测已启动');
}

/**
 * 停止心跳检测
 */
function stopHeartbeatCheck() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log('[WebSocket] 心跳检测已停止');
  }
}

/**
 * 发送消息到指定机器人
 */
export function sendToRobot(robotId: string, message: any) {
  const connection = connections.get(robotId);
  if (connection && connection.ws.readyState === WebSocket.OPEN) {
    connection.ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

/**
 * 广播消息到所有连接
 */
export function broadcast(message: any) {
  connections.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(message));
    }
  });
}

/**
 * 获取在线机器人列表
 */
export function getOnlineRobots(): string[] {
  return Array.from(connections.keys());
}

/**
 * 处理配置确认
 */
async function handleConfigAck(robotId: string, data: any) {
  try {
    const { configVersion, deviceId, timestamp } = data;

    const poolInstance = await getPool();
    const client = await poolInstance.connect();
    try {
      // 更新配置同步状态
      await client.query(`
        UPDATE device_activations
        SET 
          config_synced = true,
          config_synced_at = $1,
          config_error = NULL,
          updated_at = NOW()
        WHERE robot_id = $2 AND device_id = $3
      `, [new Date(timestamp || Date.now()), robotId, deviceId]);

      // 记录配置同步日志
      await client.query(`
        INSERT INTO config_sync_logs (
          robot_id,
          device_id,
          config_version,
          sync_status,
          error_message,
          synced_at,
          created_at
        )
        VALUES ($1, $2, $3, 'success', NULL, $4, NOW())
      `, [robotId, deviceId, configVersion, new Date(timestamp || Date.now())]);

      console.log(`[WebSocket] 配置同步成功: robotId=${robotId}, version=${configVersion}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[WebSocket] 处理配置确认失败:`, error);
  }
}

/**
 * 处理配置拒绝
 */
async function handleConfigNack(robotId: string, data: any) {
  try {
    const { configVersion, deviceId, error, errorCode, timestamp } = data;

    const poolInstance = await getPool();
    const client = await poolInstance.connect();
    try {
      // 更新配置同步状态
      await client.query(`
        UPDATE device_activations
        SET 
          config_synced = false,
          config_error = $1,
          updated_at = NOW()
        WHERE robot_id = $2 AND device_id = $3
      `, [error, robotId, deviceId]);

      // 记录配置同步日志
      await client.query(`
        INSERT INTO config_sync_logs (
          robot_id,
          device_id,
          config_version,
          sync_status,
          error_message,
          error_code,
          synced_at,
          created_at
        )
        VALUES ($1, $2, $3, 'failed', $4, $5, $6, NOW())
      `, [robotId, deviceId, configVersion, error, errorCode, new Date(timestamp || Date.now())]);

      console.log(`[WebSocket] 配置同步失败: robotId=${robotId}, version=${configVersion}, error=${error}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[WebSocket] 处理配置拒绝失败:`, error);
  }
}

/**
 * 处理消息日志上报
 */
async function handleMessageLog(robotId: string, data: any) {
  try {
    const { messageId, thirdPartyUrl, status, error, reportedAt } = data;

    const poolInstance = await getPool();
    const client = await poolInstance.connect();
    try {
      // 保存日志到数据库
      await client.query(`
        INSERT INTO message_fail_logs (
          robot_id,
          message_id,
          third_party_url,
          error_message,
          error_type,
          failed_at,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        robotId,
        messageId,
        thirdPartyUrl,
        error || 'Unknown error',
        status === 'failed' ? 'client_error' : 'success',
        reportedAt || new Date()
      ]);

      console.log(`[WebSocket] 消息日志已记录: ${messageId}`);

      // 如果发送失败，更新消息状态
      if (status === 'failed') {
        await client.query(`
          UPDATE messages
          SET status = 'failed',
              error_message = $1,
              updated_at = NOW()
          WHERE message_id = $2
        `, [error, messageId]);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[WebSocket] 处理消息日志失败:`, error);
  }
}

/**
 * 获取连接数
 */
export function getConnectionCount(): number {
  return connections.size;
}

/**
 * 获取指定机器人的连接信息
 */
export function getConnectionInfo(robotId: string): WSConnection | undefined {
  return connections.get(robotId);
}

/**
 * 获取服务器状态
 */
export function getServerStatus(): 'running' | 'stopped' {
  if (globalServerStatus === 'stopped' && connections.size > 0) {
    console.log(`[WebSocket] 状态为 stopped 但有 ${connections.size} 个连接，修正为 running`);
    return 'running';
  }

  const status = globalServerStatus;
  console.log(`[WebSocket] 获取服务器状态: ${status}，连接数: ${connections.size}`);
  return status;
}

/**
 * 发送 WebSocket 消息（给其他模块使用）
 */
export function sendWebSocketMessage(robotId: string, message: any): boolean {
  return sendToRobot(robotId, message);
}

/**
 * 推送配置到机器人
 */
export async function pushConfigToRobot(robotId: string, config: any, configVersion: string): Promise<boolean> {
  const connection = connections.get(robotId);
  
  if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
    console.log(`[WebSocket] 机器人 ${robotId} 未在线，无法推送配置`);
    return false;
  }

  const message = {
    type: 'config_push',
    data: {
      robotId,
      configVersion,
      config,
      timestamp: Date.now(),
    },
  };

  try {
    connection.ws.send(JSON.stringify(message));
    console.log(`[WebSocket] 配置已推送到机器人 ${robotId}`);
    return true;
  } catch (error) {
    console.error(`[WebSocket] 推送配置失败:`, error);
    return false;
  }
}

/**
 * 发送第三方回调消息到机器人
 */
export function sendCallbackToRobot(robotId: string, callbackId: string, callbackType: string, payload: any): boolean {
  const connection = connections.get(robotId);
  
  if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
    console.log(`[WebSocket] 机器人 ${robotId} 未在线，无法发送回调消息`);
    return false;
  }

  const message = {
    type: 'callback',
    data: {
      callbackId,
      callbackType,
      payload,
      timestamp: Date.now(),
    },
  };

  try {
    connection.ws.send(JSON.stringify(message));
    console.log(`[WebSocket] 回调消息已发送到机器人 ${robotId}`);
    return true;
  } catch (error) {
    console.error(`[WebSocket] 发送回调消息失败:`, error);
    return false;
  }
}

