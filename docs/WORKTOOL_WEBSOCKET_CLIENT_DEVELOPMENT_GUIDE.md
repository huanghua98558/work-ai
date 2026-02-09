# WorkTool WebSocket 客户端开发文档

> **版本**: v3.0
> **最后更新**: 2026-02-09
> **适用对象**: WorkTool App 开发者
> **协议**: WebSocket

---

## 目录

- [1. 概述](#1-概述)
- [2. 连接方式](#2-连接方式)
- [3. 认证流程](#3-认证流程)
- [4. 消息协议](#4-消息协议)
- [5. 心跳机制](#5-心跳机制)
- [6. 指令处理](#6-指令处理)
- [7. 错误处理](#7-错误处理)
- [8. 代码示例](#8-代码示例)
- [9. 最佳实践](#9-最佳实践)
- [10. 常见问题](#10-常见问题)

---

## 1. 概述

### 1.1 什么是 WebSocket？

WebSocket 是一种在单个 TCP 连接上进行全双工通信的协议。WorkTool 使用 WebSocket 与服务器保持长连接，实现实时指令推送和状态同步。

### 1.2 为什么使用 WebSocket？

- ✅ **实时性低延迟**: 指令可以实时推送到设备
- ✅ **双向通信**: 客户端和服务端可以互相发送消息
- ✅ **减少开销**: 复用同一个连接，无需频繁建立连接
- ✅ **自动重连**: 支持断线自动重连

### 1.3 适用场景

- 指令推送（发送消息、转发消息等）
- 配置更新（风控配置、回复模板等）
- 状态上报（设备状态、心跳等）
- 实时通知（系统消息、警告等）

---

## 2. 连接方式

### 2.1 连接地址

```
开发环境: ws://localhost:5000/ws
生产环境: wss://your-domain.com/ws
```

### 2.2 连接要求

- **协议**: WebSocket (ws://) 或 WebSocket Secure (wss://)
- **路径**: `/ws`
- **子协议**: 不需要
- **认证**: 需要发送认证消息

### 2.3 连接流程

```
1. 建立 WebSocket 连接
2. 发送认证消息 (authenticate)
3. 等待认证成功 (authenticated)
4. 启动心跳机制
5. 处理推送的指令
6. 上报执行结果
```

---

## 3. 认证流程

### 3.1 认证消息格式

**客户端 → 服务端**

```json
{
  "type": "authenticate",
  "data": {
    "robotId": "robot123",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "timestamp": 1739085600000
  },
  "timestamp": 1739085600000
}
```

### 3.2 认证成功响应

**服务端 → 客户端**

```json
{
  "type": "authenticated",
  "data": {
    "authenticated": true,
    "robotId": "robot123",
    "deviceId": "device_abc123",
    "userId": 1001
  },
  "timestamp": 1739085601000
}
```

### 3.3 认证失败响应

**服务端 → 客户端**

```json
{
  "type": "error",
  "data": {
    "code": 401,
    "message": "Token 无效或已过期",
    "robotId": "robot123"
  },
  "timestamp": 1739085601000
}
```

### 3.4 认证注意事项

⚠️ **重要**:
- 连接建立后必须在 **30 秒内** 完成认证
- 认证超时后连接会被断开
- Token 需要从 `device_activations` 表获取
- Token 有效期为 30 天

---

## 4. 消息协议

### 4.1 消息格式

所有消息都遵循以下格式：

```typescript
{
  type: string;        // 消息类型（必填）
  data: any;          // 消息数据（必填）
  timestamp: number;  // 时间戳（必填，毫秒）
  messageId?: string; // 消息ID（可选）
}
```

### 4.2 消息类型

| 类型 | 方向 | 说明 |
|------|------|------|
| `authenticate` | C → S | 认证消息 |
| `authenticated` | S → C | 认证成功 |
| `heartbeat` | C → S | 心跳消息 |
| `heartbeat_ack` | S → C | 心跳确认 |
| `heartbeat_warning` | S → C | 心跳警告 |
| `command_push` | S → C | 指令推送 |
| `result` | C → S | 结果上报 |
| `config_push` | S → C | 配置推送 |
| `error` | S → C | 错误消息 |

### 4.3 时间戳

- 所有消息必须包含 `timestamp` 字段
- 时间戳使用 Unix 毫秒时间戳
- 客户端应使用 UTC 时间

---

## 5. 心跳机制

### 5.1 心跳配置

```
心跳间隔: 30 秒
心跳超时: 60 秒
警告阈值: 50 秒
```

### 5.2 心跳消息格式

**客户端 → 服务端**

```json
{
  "type": "heartbeat",
  "data": {
    "robotId": "robot123",
    "status": "running",
    "battery": 85,
    "signal": 4,
    "memoryUsage": 512,
    "cpuUsage": 45,
    "networkType": "wifi",
    "timestamp": 1739085600000
  },
  "timestamp": 1739085600000
}
```

### 5.3 心跳确认

**服务端 → 客户端**

```json
{
  "type": "heartbeat_ack",
  "data": {
    "serverTime": 1739085601500,
    "nextHeartbeat": 1739085630000,
    "receivedAt": 1739085601000
  },
  "timestamp": 1739085601500
}
```

**字段说明**:
- `serverTime`: 服务器时间（可用于时间同步）
- `nextHeartbeat`: 下次心跳时间（30秒后）
- `receivedAt`: 服务器接收时间

### 5.4 心跳警告

**服务端 → 客户端**

```json
{
  "type": "heartbeat_warning",
  "data": {
    "warningType": "timeout_soon",
    "remainingTime": 10000,
    "lastHeartbeatAt": 1739085590000,
    "timeoutTime": 1739085650000
  },
  "timestamp": 1739085640000
}
```

**警告类型**:
- `timeout_soon`: 即将超时（剩余时间 < 10秒）
- `last_heartbeat_missed`: 上次心跳未收到

### 5.5 心跳流程图

```
客户端                              服务端
  │                                   │
  │ ←──────── 连接建立 ────────────────┤
  │                                   │
  ├─ authenticate ──────────────────→ │
  │ ←────── authenticated ────────────┤
  │                                   │
  ├─ heartbeat (0s) ─────────────────→ │
  │ ←────── heartbeat_ack ────────────┤
  │                                   │
  ├─ heartbeat (30s) ────────────────→ │
  │ ←────── heartbeat_ack ────────────┤
  │                                   │
  ├─ heartbeat (60s) ────────────────→ │
  │ ←────── heartbeat_ack ────────────┤
  │                                   │
  │ (80s - 未收到心跳)                  │
  │ ←────── heartbeat_warning ─────────┤
  │ (警告: 剩余10秒)                    │
  │                                   │
  │ (90s - 收到心跳)                    │
  ├─ heartbeat ─────────────────────→ │
  │ ←────── heartbeat_ack ────────────┤
  │ (恢复正常)                          │
  │                                   │
  │ (120s - 仍未收到心跳)               │
  │ ←────── error (1000) ─────────────┤
  │ ←────── close (1000) ──────────────┤
  │ (连接断开)                          │
  │                                   │
```

### 5.6 心跳实现建议

```javascript
// 启动心跳
function startHeartbeat() {
  // 立即发送一次心跳
  sendHeartbeat();

  // 每30秒发送一次
  setInterval(() => {
    sendHeartbeat();
  }, 30000);
}

// 发送心跳
function sendHeartbeat() {
  const message = {
    type: 'heartbeat',
    data: {
      robotId: config.robotId,
      status: getDeviceStatus(),
      battery: getBatteryLevel(),
      signal: getSignalStrength(),
      memoryUsage: getMemoryUsage(),
      cpuUsage: getCpuUsage(),
      networkType: getNetworkType(),
    },
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(message));
}
```

---

## 6. 指令处理

### 6.1 指令推送格式

**服务端 → 客户端**

```json
{
  "type": "command_push",
  "data": {
    "commandId": "cmd_123456",
    "commandType": "send_message",
    "commandCode": 203,
    "target": "user_789",
    "params": {
      "content": "你好，这是一条测试消息",
      "type": "text"
    },
    "priority": 1
  },
  "timestamp": 1739085600000
}
```

### 6.2 指令类型

| 指令类型 | 指令码 | 说明 |
|---------|--------|------|
| `send_message` | 203 | 发送消息 |
| `forward_message` | 205 | 转发消息 |
| `create_group` | 206 | 创建群聊 |
| `update_group` | 207 | 更新群聊 |
| `send_file` | 218 | 发送文件 |
| `dissolve_group` | 219 | 解散群聊 |
| `send_favorite` | 900 | 发送收藏 |

### 6.3 指令优先级

| 优先级 | 值 | 说明 |
|-------|---|------|
| 低 | 0 | 普通指令 |
| 正常 | 1 | 默认优先级 |
| 高 | 2 | 重要指令 |
| 紧急 | 3 | 最优先执行 |

### 6.4 结果上报格式

**客户端 → 服务端**

成功：
```json
{
  "type": "result",
  "data": {
    "commandId": "cmd_123456",
    "status": "success",
    "result": {
      "messageId": "msg_789",
      "sentAt": 1739085605000
    },
    "executedAt": 1739085605000
  },
  "timestamp": 1739085605000
}
```

失败：
```json
{
  "type": "result",
  "data": {
    "commandId": "cmd_123456",
    "status": "failed",
    "errorMessage": "发送失败：用户不存在",
    "executedAt": 1739085605000
  },
  "timestamp": 1739085605000
}
```

### 6.5 指令处理流程

```
1. 收到指令推送
2. 解析指令类型和参数
3. 验证指令参数
4. 执行指令
5. 上报执行结果
```

### 6.6 指令处理示例

```javascript
// 处理指令推送
function handleCommandPush(message) {
  const { commandId, commandType, params } = message.data;

  console.log(`收到指令: ${commandId}, 类型: ${commandType}`);

  // 执行指令
  executeCommand(commandId, commandType, params)
    .then(result => {
      // 上报成功结果
      sendResult(commandId, 'success', result);
    })
    .catch(error => {
      // 上报失败结果
      sendResult(commandId, 'failed', null, error.message);
    });
}

// 执行指令
async function executeCommand(commandId, commandType, params) {
  switch (commandType) {
    case 'send_message':
      return await sendMessage(params);
    case 'forward_message':
      return await forwardMessage(params);
    case 'create_group':
      return await createGroup(params);
    default:
      throw new Error(`未知的指令类型: ${commandType}`);
  }
}

// 发送消息
async function sendMessage(params) {
  // 调用 WorkTool API 发送消息
  const result = await workToolAPI.send(params);

  return {
    messageId: result.messageId,
    sentAt: result.sentAt,
  };
}

// 上报结果
function sendResult(commandId, status, result, errorMessage) {
  const message = {
    type: 'result',
    data: {
      commandId,
      status,
      result,
      errorMessage,
      executedAt: Date.now(),
    },
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(message));
}
```

---

## 7. 错误处理

### 7.1 错误消息格式

**服务端 → 客户端**

```json
{
  "type": "error",
  "data": {
    "code": 1000,
    "message": "心跳超时，连接已断开",
    "details": {
      "elapsed": 65000,
      "lastHeartbeatAt": 1739085590000
    },
    "robotId": "robot123"
  },
  "timestamp": 1739085650000
}
```

### 7.2 错误码

| 错误码 | 说明 | 处理建议 |
|-------|------|---------|
| 1000 | 正常关闭 | 重新连接 |
| 1001 | 端点离开 | 重新连接 |
| 1002 | 协议错误 | 检查消息格式 |
| 1003 | 不支持的数据类型 | 检查数据格式 |
| 1006 | 异常关闭 | 重新连接 |
| 4000 | 消息格式错误 | 检查 JSON 格式 |
| 4001 | 参数错误 | 检查参数完整性 |
| 4006 | 认证超时 | 重新连接并认证 |
| 4010 | Token 无效 | 重新获取 Token |
| 4011 | Token 已过期 | 刷新 Token |
| 4029 | 连接数已达上限 | 等待后重试 |
| 5000 | 服务器内部错误 | 稍后重试 |

### 7.3 错误处理建议

```javascript
// 处理错误消息
function handleError(message) {
  const { code, message: errorMsg, details } = message.data;

  console.error(`收到错误: ${code} - ${errorMsg}`);

  switch (code) {
    case 1000:
    case 1001:
    case 1006:
      // 连接断开，尝试重连
      scheduleReconnect();
      break;

    case 4006:
      // 认证超时，重新认证
      reconnect();
      break;

    case 4010:
    case 4011:
      // Token 无效，需要重新获取
      refreshToken();
      break;

    case 4029:
      // 连接数已达上限，延迟重试
      setTimeout(() => reconnect(), 60000);
      break;

    default:
      // 其他错误，记录日志
      logError(code, errorMsg, details);
  }
}
```

---

## 8. 代码示例

### 8.1 JavaScript/TypeScript

```typescript
// src/worktool-websocket.ts
import WebSocket from 'ws';

interface Config {
  url: string;
  robotId: string;
  token: string;
}

export class WorkToolWebSocket {
  private ws: WebSocket | null = null;
  private config: Config;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isAuthenticated = false;

  constructor(config: Config) {
    this.config = config;
  }

  connect() {
    this.ws = new WebSocket(this.config.url);

    this.ws.on('open', () => {
      console.log('✅ WebSocket 已连接');
      this.authenticate();
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });

    this.ws.on('close', (code, reason) => {
      console.log(`🔌 连接关闭: ${code} - ${reason}`);
      this.isAuthenticated = false;
      this.stopHeartbeat();
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket 错误:', error);
    });
  }

  private authenticate() {
    const message = {
      type: 'authenticate',
      data: {
        robotId: this.config.robotId,
        token: this.config.token,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.ws?.send(JSON.stringify(message));
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'authenticated':
        this.isAuthenticated = true;
        console.log('✅ 认证成功');
        this.startHeartbeat();
        break;

      case 'heartbeat_ack':
        console.log('💓 心跳 ACK');
        break;

      case 'command_push':
        this.handleCommand(message);
        break;

      case 'error':
        this.handleError(message);
        break;

      default:
        console.log('📨 收到消息:', message.type);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendHeartbeat();
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendHeartbeat() {
    const message = {
      type: 'heartbeat',
      data: {
        robotId: this.config.robotId,
        status: 'running',
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.ws?.send(JSON.stringify(message));
  }

  private handleCommand(message: any) {
    const { commandId, commandType, params } = message.data;

    console.log(`📋 收到指令: ${commandId}, 类型: ${commandType}`);

    // 执行指令并上报结果
    this.executeCommand(commandId, commandType, params)
      .then(result => {
        this.sendResult(commandId, 'success', result);
      })
      .catch(error => {
        this.sendResult(commandId, 'failed', null, error.message);
      });
  }

  private async executeCommand(commandId: string, commandType: string, params: any) {
    // 实现具体的指令执行逻辑
    return { success: true };
  }

  private sendResult(commandId: string, status: 'success' | 'failed', result?: any, errorMessage?: string) {
    const message = {
      type: 'result',
      data: {
        commandId,
        status,
        result,
        errorMessage,
        executedAt: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.ws?.send(JSON.stringify(message));
  }

  private handleError(message: any) {
    console.error('❌ 错误:', message.data);
  }

  disconnect() {
    this.stopHeartbeat();
    this.ws?.close();
  }
}

// 使用示例
const client = new WorkToolWebSocket({
  url: 'ws://localhost:5000/ws',
  robotId: 'robot123',
  token: 'your-jwt-token',
});

client.connect();
```

### 8.2 Python

```python
# worktool_websocket.py
import asyncio
import json
import websockets
from typing import Dict, Any

class WorkToolWebSocket:
    def __init__(self, url: str, robot_id: str, token: str):
        self.url = url
        self.robot_id = robot_id
        self.token = token
        self.websocket = None
        self.heartbeat_task = None
        self.is_authenticated = False

    async def connect(self):
        """连接到 WebSocket 服务器"""
        try:
            self.websocket = await websockets.connect(self.url)
            print("✅ WebSocket 已连接")

            # 启动消息处理
            asyncio.create_task(self.handle_messages())

            # 发送认证
            await self.authenticate()

        except Exception as e:
            print(f"❌ 连接失败: {e}")

    async def authenticate(self):
        """发送认证消息"""
        message = {
            "type": "authenticate",
            "data": {
                "robotId": self.robot_id,
                "token": self.token,
                "timestamp": int(time.time() * 1000)
            },
            "timestamp": int(time.time() * 1000)
        }

        await self.websocket.send(json.dumps(message))
        print("📤 已发送认证消息")

    async def handle_messages(self):
        """处理接收到的消息"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                await self.process_message(data)
        except websockets.exceptions.ConnectionClosed:
            print("🔌 连接已关闭")
            self.is_authenticated = False
            if self.heartbeat_task:
                self.heartbeat_task.cancel()

    async def process_message(self, message: Dict[str, Any]):
        """处理消息"""
        msg_type = message.get("type")

        if msg_type == "authenticated":
            self.is_authenticated = True
            print("✅ 认证成功")
            # 启动心跳
            self.heartbeat_task = asyncio.create_task(self.send_heartbeat())

        elif msg_type == "heartbeat_ack":
            print("💓 心跳 ACK")

        elif msg_type == "command_push":
            await self.handle_command(message)

        elif msg_type == "error":
            self.handle_error(message)

        else:
            print(f"📨 收到消息: {msg_type}")

    async def send_heartbeat(self):
        """发送心跳"""
        while self.is_authenticated:
            try:
                message = {
                    "type": "heartbeat",
                    "data": {
                        "robotId": self.robot_id,
                        "status": "running",
                        "timestamp": int(time.time() * 1000)
                    },
                    "timestamp": int(time.time() * 1000)
                }

                await self.websocket.send(json.dumps(message))
                print("💓 已发送心跳")

                # 等待 30 秒
                await asyncio.sleep(30)

            except Exception as e:
                print(f"❌ 发送心跳失败: {e}")
                break

    async def handle_command(self, message: Dict[str, Any]):
        """处理指令"""
        data = message.get("data", {})
        command_id = data.get("commandId")
        command_type = data.get("commandType")
        params = data.get("params", {})

        print(f"📋 收到指令: {command_id}, 类型: {command_type}")

        try:
            # 执行指令
            result = await self.execute_command(command_type, params)

            # 上报成功结果
            await self.send_result(command_id, "success", result)

        except Exception as e:
            # 上报失败结果
            await self.send_result(command_id, "failed", None, str(e))

    async def execute_command(self, command_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """执行指令"""
        # 实现具体的指令执行逻辑
        return {"success": True}

    async def send_result(self, command_id: str, status: str, result: Any = None, error_message: str = None):
        """上报结果"""
        message = {
            "type": "result",
            "data": {
                "commandId": command_id,
                "status": status,
                "result": result,
                "errorMessage": error_message,
                "executedAt": int(time.time() * 1000)
            },
            "timestamp": int(time.time() * 1000)
        }

        await self.websocket.send(json.dumps(message))
        print(f"📤 已上报结果: {status}")

    def handle_error(self, message: Dict[str, Any]):
        """处理错误"""
        data = message.get("data", {})
        code = data.get("code")
        error_message = data.get("message")
        print(f"❌ 错误: {code} - {error_message}")

    async def disconnect(self):
        """断开连接"""
        self.is_authenticated = False
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
        if self.websocket:
            await self.websocket.close()
        print("🔌 已断开连接")

# 使用示例
import time

async def main():
    client = WorkToolWebSocket(
        url="ws://localhost:5000/ws",
        robot_id="robot123",
        token="your-jwt-token"
    )

    await client.connect()

    # 保持运行
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

### 8.3 Java

```java
// WorkToolWebSocket.java
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.json.JSONObject;
import org.json.JSONException;

import java.net.URI;
import java.util.Timer;
import java.util.TimerTask;

public class WorkToolWebSocket {
    private WebSocketClient wsClient;
    private String robotId;
    private String token;
    private boolean isAuthenticated = false;
    private Timer heartbeatTimer;

    public WorkToolWebSocket(String url, String robotId, String token) {
        this.robotId = robotId;
        this.token = token;

        wsClient = new WebSocketClient(URI.create(url)) {
            @Override
            public void onOpen(ServerHandshake handshakedata) {
                System.out.println("✅ WebSocket 已连接");
                authenticate();
            }

            @Override
            public void onMessage(String message) {
                handleMessage(message);
            }

            @Override
            public void onClose(int code, String reason, boolean remote) {
                System.out.println("🔌 连接关闭: " + code + " - " + reason);
                isAuthenticated = false;
                stopHeartbeat();
            }

            @Override
            public void onError(Exception ex) {
                System.err.println("❌ WebSocket 错误: " + ex.getMessage());
            }
        };
    }

    public void connect() {
        wsClient.connect();
    }

    private void authenticate() {
        JSONObject message = new JSONObject();
        JSONObject data = new JSONObject();

        data.put("robotId", robotId);
        data.put("token", token);
        data.put("timestamp", System.currentTimeMillis());

        message.put("type", "authenticate");
        message.put("data", data);
        message.put("timestamp", System.currentTimeMillis());

        wsClient.send(message.toString());
        System.out.println("📤 已发送认证消息");
    }

    private void handleMessage(String messageStr) {
        try {
            JSONObject message = new JSONObject(messageStr);
            String type = message.getString("type");

            switch (type) {
                case "authenticated":
                    isAuthenticated = true;
                    System.out.println("✅ 认证成功");
                    startHeartbeat();
                    break;

                case "heartbeat_ack":
                    System.out.println("💓 心跳 ACK");
                    break;

                case "command_push":
                    handleCommand(message);
                    break;

                case "error":
                    handleError(message);
                    break;

                default:
                    System.out.println("📨 收到消息: " + type);
            }
        } catch (JSONException e) {
            System.err.println("❌ 解析消息失败: " + e.getMessage());
        }
    }

    private void startHeartbeat() {
        stopHeartbeat();

        heartbeatTimer = new Timer();
        heartbeatTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                if (wsClient.isOpen()) {
                    sendHeartbeat();
                }
            }
        }, 0, 30000); // 30秒
    }

    private void stopHeartbeat() {
        if (heartbeatTimer != null) {
            heartbeatTimer.cancel();
            heartbeatTimer = null;
        }
    }

    private void sendHeartbeat() {
        JSONObject message = new JSONObject();
        JSONObject data = new JSONObject();

        data.put("robotId", robotId);
        data.put("status", "running");
        data.put("timestamp", System.currentTimeMillis());

        message.put("type", "heartbeat");
        message.put("data", data);
        message.put("timestamp", System.currentTimeMillis());

        wsClient.send(message.toString());
        System.out.println("💓 已发送心跳");
    }

    private void handleCommand(JSONObject message) {
        JSONObject data = message.getJSONObject("data");
        String commandId = data.getString("commandId");
        String commandType = data.getString("commandType");
        JSONObject params = data.optJSONObject("params");

        System.out.println("📋 收到指令: " + commandId + ", 类型: " + commandType);

        try {
            // 执行指令
            JSONObject result = executeCommand(commandType, params);

            // 上报成功结果
            sendResult(commandId, "success", result, null);

        } catch (Exception e) {
            // 上报失败结果
            sendResult(commandId, "failed", null, e.getMessage());
        }
    }

    private JSONObject executeCommand(String commandType, JSONObject params) {
        // 实现具体的指令执行逻辑
        JSONObject result = new JSONObject();
        result.put("success", true);
        return result;
    }

    private void sendResult(String commandId, String status, JSONObject result, String errorMessage) {
        JSONObject message = new JSONObject();
        JSONObject data = new JSONObject();

        data.put("commandId", commandId);
        data.put("status", status);
        data.put("result", result);
        data.put("errorMessage", errorMessage);
        data.put("executedAt", System.currentTimeMillis());

        message.put("type", "result");
        message.put("data", data);
        message.put("timestamp", System.currentTimeMillis());

        wsClient.send(message.toString());
        System.out.println("📤 已上报结果: " + status);
    }

    private void handleError(JSONObject message) {
        JSONObject data = message.getJSONObject("data");
        int code = data.getInt("code");
        String errorMessage = data.getString("message");
        System.err.println("❌ 错误: " + code + " - " + errorMessage);
    }

    public void disconnect() {
        isAuthenticated = false;
        stopHeartbeat();
        wsClient.close();
        System.out.println("🔌 已断开连接");
    }

    // 使用示例
    public static void main(String[] args) {
        WorkToolWebSocket client = new WorkToolWebSocket(
            "ws://localhost:5000/ws",
            "robot123",
            "your-jwt-token"
        );

        client.connect();

        // 保持运行
        try {
            Thread.sleep(Long.MAX_VALUE);
        } catch (InterruptedException e) {
            client.disconnect();
        }
    }
}
```

### 8.4 Go

```go
// worktool_websocket.go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Config WebSocket 配置
type Config struct {
	URL     string
	RobotID string
	Token   string
}

// Message WebSocket 消息
type Message struct {
	Type      string                 `json:"type"`
	Data      map[string]interface{} `json:"data"`
	Timestamp int64                  `json:"timestamp"`
	MessageID string                 `json:"messageId,omitempty"`
}

// WorkToolWebSocket WebSocket 客户端
type WorkToolWebSocket struct {
	config          Config
	conn            *websocket.Conn
	mu              sync.Mutex
	isAuthenticated bool
	heartbeatTicker *time.Ticker
	done            chan struct{}
}

// NewWorkToolWebSocket 创建新的 WebSocket 客户端
func NewWorkToolWebSocket(config Config) *WorkToolWebSocket {
	return &WorkToolWebSocket{
		config: config,
		done:   make(chan struct{}),
	}
}

// Connect 连接到服务器
func (ws *WorkToolWebSocket) Connect() error {
	u, err := url.Parse(ws.config.URL)
	if err != nil {
		return fmt.Errorf("解析 URL 失败: %w", err)
	}

	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}

	ws.conn = conn
	log.Println("✅ WebSocket 已连接")

	// 启动消息处理
	go ws.handleMessages()

	// 发送认证
	ws.authenticate()

	return nil
}

// authenticate 发送认证消息
func (ws *WorkToolWebSocket) authenticate() {
	message := Message{
		Type: "authenticate",
		Data: map[string]interface{}{
			"robotId":   ws.config.RobotID,
			"token":     ws.config.Token,
			"timestamp": time.Now().UnixMilli(),
		},
		Timestamp: time.Now().UnixMilli(),
	}

	ws.send(message)
	log.Println("📤 已发送认证消息")
}

// handleMessages 处理接收到的消息
func (ws *WorkToolWebSocket) handleMessages() {
	defer ws.Close()

	for {
		select {
		case <-ws.done:
			return
		default:
			_, message, err := ws.conn.ReadMessage()
			if err != nil {
				log.Printf("❌ 读取消息失败: %v", err)
				return
			}

			var msg Message
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("❌ 解析消息失败: %v", err)
				continue
			}

			ws.processMessage(msg)
		}
	}
}

// processMessage 处理消息
func (ws *WorkToolWebSocket) processMessage(msg Message) {
	switch msg.Type {
	case "authenticated":
		ws.isAuthenticated = true
		log.Println("✅ 认证成功")
		ws.startHeartbeat()

	case "heartbeat_ack":
		log.Println("💓 心跳 ACK")

	case "command_push":
		ws.handleCommand(msg)

	case "error":
		ws.handleError(msg)

	default:
		log.Printf("📨 收到消息: %s", msg.Type)
	}
}

// startHeartbeat 启动心跳
func (ws *WorkToolWebSocket) startHeartbeat() {
	ws.stopHeartbeat()

	ws.heartbeatTicker = time.NewTicker(30 * time.Second)
	go func() {
		for {
			select {
			case <-ws.heartbeatTicker.C:
				if ws.isAuthenticated {
					ws.sendHeartbeat()
				}
			case <-ws.done:
				return
			}
		}
	}()
}

// stopHeartbeat 停止心跳
func (ws *WorkToolWebSocket) stopHeartbeat() {
	if ws.heartbeatTicker != nil {
		ws.heartbeatTicker.Stop()
		ws.heartbeatTicker = nil
	}
}

// sendHeartbeat 发送心跳
func (ws *WorkToolWebSocket) sendHeartbeat() {
	message := Message{
		Type: "heartbeat",
		Data: map[string]interface{}{
			"robotId":   ws.config.RobotID,
			"status":    "running",
			"timestamp": time.Now().UnixMilli(),
		},
		Timestamp: time.Now().UnixMilli(),
	}

	ws.send(message)
	log.Println("💓 已发送心跳")
}

// handleCommand 处理指令
func (ws *WorkToolWebSocket) handleCommand(msg Message) {
	data := msg.Data
	commandID := data["commandId"].(string)
	commandType := data["commandType"].(string)
	params := data["params"].(map[string]interface{})

	log.Printf("📋 收到指令: %s, 类型: %s", commandID, commandType)

	// 执行指令
	result, err := ws.executeCommand(commandType, params)
	if err != nil {
		// 上报失败结果
		ws.sendResult(commandID, "failed", nil, err.Error())
		return
	}

	// 上报成功结果
	ws.sendResult(commandID, "success", result, "")
}

// executeCommand 执行指令
func (ws *WorkToolWebSocket) executeCommand(commandType string, params map[string]interface{}) (map[string]interface{}, error) {
	// 实现具体的指令执行逻辑
	result := map[string]interface{}{
		"success": true,
	}
	return result, nil
}

// sendResult 上报结果
func (ws *WorkToolWebSocket) sendResult(commandID, status string, result map[string]interface{}, errorMessage string) {
	data := map[string]interface{}{
		"commandId":    commandID,
		"status":       status,
		"result":       result,
		"errorMessage": errorMessage,
		"executedAt":   time.Now().UnixMilli(),
	}

	message := Message{
		Type:      "result",
		Data:      data,
		Timestamp: time.Now().UnixMilli(),
	}

	ws.send(message)
	log.Printf("📤 已上报结果: %s", status)
}

// handleError 处理错误
func (ws *WorkToolWebSocket) handleError(msg Message) {
	data := msg.Data
	code := int(data["code"].(float64))
	errorMessage := data["message"].(string)
	log.Printf("❌ 错误: %d - %s", code, errorMessage)
}

// send 发送消息
func (ws *WorkToolWebSocket) send(message Message) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	if ws.conn == nil {
		log.Println("❌ 连接未建立")
		return
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("❌ 编码消息失败: %v", err)
		return
	}

	if err := ws.conn.WriteMessage(websocket.TextMessage, messageBytes); err != nil {
		log.Printf("❌ 发送消息失败: %v", err)
	}
}

// Close 关闭连接
func (ws *WorkToolWebSocket) Close() {
	ws.isAuthenticated = false
	ws.stopHeartbeat()
	close(ws.done)

	if ws.conn != nil {
		ws.conn.Close()
	}

	log.Println("🔌 已断开连接")
}

// 使用示例
func main() {
	client := NewWorkToolWebSocket(Config{
		URL:     "ws://localhost:5000/ws",
		RobotID: "robot123",
		Token:   "your-jwt-token",
	})

	if err := client.Connect(); err != nil {
		log.Fatalf("连接失败: %v", err)
	}

	// 保持运行
	select {}
}
```

---

## 9. 最佳实践

### 9.1 连接管理

✅ **建议**:
- 使用指数退避策略进行重连
- 记录连接失败的原因
- 实现连接状态监控
- 提供连接状态回调

❌ **避免**:
- 频繁建立和断开连接
- 无限重连（设置最大重连次数）
- 阻塞主线程处理 WebSocket 消息

### 9.2 心跳管理

✅ **建议**:
- 严格按照 30 秒间隔发送心跳
- 处理心跳 ACK，计算网络延迟
- 监听心跳警告，提前处理网络问题
- 在后台线程发送心跳

❌ **避免**:
- 发送过于频繁的心跳
- 忽略心跳警告
- 在主线程阻塞等待心跳响应

### 9.3 指令处理

✅ **建议**:
- 立即确认收到指令
- 异步执行指令
- 记录指令执行日志
- 正确上报执行结果

❌ **避免**:
- 阻塞处理指令
- 忘记上报结果
- 上报格式错误的结果

### 9.4 错误处理

✅ **建议**:
- 区分不同的错误类型
- 记录详细的错误日志
- 实现自动重连机制
- 提供错误回调

❌ **避免**:
- 忽略所有错误
- 无限重试失败的操作
- 不记录错误信息

### 9.5 性能优化

✅ **建议**:
- 使用连接池（多实例场景）
- 批量处理指令
- 压缩消息数据
- 使用 JSON 替代 XML

❌ **避免**:
- 频繁创建连接
- 发送过大的消息
- 不必要的序列化/反序列化

### 9.6 安全考虑

✅ **建议**:
- 使用 WSS（WebSocket Secure）
- 验证服务器证书
- 不在消息中发送敏感信息
- 定期刷新 Token

❌ **避免**:
- 使用明文传输
- 在 URL 中传递 Token
- 不验证服务器身份

---

## 10. 常见问题

### Q1: 连接后多久需要认证？

**答**: 必须在 **30 秒内** 完成认证，否则连接会被断开。

### Q2: 心跳超时后会怎样？

**答**: 
- 50 秒时收到警告消息
- 60 秒时连接被断开
- 客户端应实现自动重连机制

### Q3: 如何处理网络波动？

**答**:
- 监听心跳警告
- 收到警告后尝试发送保活包
- 实现自动重连（指数退避）
- 记录网络质量数据

### Q4: Token 过期了怎么办？

**答**:
- 收到 4011 错误（Token 已过期）
- 使用 Refresh Token 刷新
- 刷新失败后重新获取 Token
- 重新连接并认证

### Q5: 指令执行失败需要上报吗？

**答**: 需要！无论成功还是失败，都必须上报执行结果。

### Q6: 可以同时处理多个指令吗？

**答**: 可以。建议使用消息队列异步处理多个指令。

### Q7: 如何测试 WebSocket 连接？

**答**: 可以使用以下工具：
- Chrome DevTools (Network → WS)
- Postman (WebSocket 功能)
- wscat 命令行工具
- 在线 WebSocket 测试工具

### Q8: 支持多实例吗？

**答**: 支持。但每个实例需要使用不同的 robotId。

### Q9: 如何监控连接状态？

**答**:
- 记录连接事件（open, close, error）
- 统计心跳延迟
- 监控指令执行情况
- 实现健康检查接口

### Q10: 断线后如何恢复？

**答**:
- 自动重连（指数退避）
- 重新认证
- 获取待处理的指令
- 恢复正常工作

---

## 附录

### A. 完整错误码列表

```
WebSocket 标准错误码:
1000 - 正常关闭
1001 - 端点离开
1002 - 协议错误
1003 - 不支持的数据类型
1005 - 无状态码
1006 - 异常关闭
1007 - 不一致的数据类型
1008 - 违反策略
1009 - 消息过大
1010 - 缺少扩展
1011 - 内部错误
1015 - TLS 握手失败

自定义错误码:
4000 - 消息格式错误
4001 - 参数错误
4006 - 认证超时
4010 - Token 无效
4011 - Token 已过期
4029 - 连接数已达上限
5000 - 服务器内部错误
```

### B. 技术支持

如有问题，请联系：
- 技术文档: https://docs.workbot.com
- 开发者社区: https://community.workbot.com
- 技术支持: support@workbot.com

### C. 更新日志

**v3.0** (2026-02-09)
- 新增心跳 ACK 确认机制
- 新增心跳超时警告
- 优化错误处理
- 添加多语言示例

**v2.0** (2026-01-15)
- 重构消息协议
- 添加配置推送
- 优化指令处理

**v1.0** (2025-12-01)
- 初始版本
- 基础连接和认证
- 指令推送和结果上报

---

*文档版本: v3.0*
*最后更新: 2026-02-09*
