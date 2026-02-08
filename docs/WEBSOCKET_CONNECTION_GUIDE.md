# WebSocket 连接验证指南

## ✅ 当前状态

WebSocket 服务已经成功启动并运行！

### 服务信息
- **服务器 IP**: `9.129.28.93`
- **HTTP 端口**: `5000`
- **WebSocket 端点**: `ws://9.129.28.93:5000/ws`
- **服务状态**: ✅ 正常运行

### 诊断结果
- ✅ WebSocket 服务器进程运行中
- ✅ 端口 5000 正在监听
- ✅ HTTP API 正常工作
- ✅ WebSocket 端点响应正常（握手成功）

---

## 📱 如何连接

### 1. 在 APP 中配置服务器地址

```
服务器地址: 9.129.28.93:5000
```

### 2. 确保使用正确的凭证

WebSocket 连接需要以下参数：
- **robotId**: 机器人 ID（在激活时获取）
- **token**: 访问令牌（在激活时获取）

完整的 WebSocket URL 格式：
```
ws://9.129.28.93:5000/ws?robotId=<您的机器人ID>&token=<您的访问令牌>
```

### 3. APP 连接流程

1. **激活设备**: APP 首先会调用激活 API，获取 robotId 和 token
2. **建立连接**: APP 使用 robotId 和 token 连接 WebSocket
3. **认证成功**: WebSocket 服务器验证 token 并建立持久连接
4. **实时通讯**: 通过 WebSocket 进行实时消息推送

---

## 🔧 故障排查

### 问题 1: APP 显示"连接失败"

**可能原因**：
- 服务器地址配置错误
- 网络不通（防火墙、安全组）
- token 无效或已过期
- robotId 不存在

**解决步骤**：

1. **检查网络连接**
   ```bash
   # 测试服务器是否可达
   curl http://9.129.28.93:5000/api/health
   ```

   预期输出：
   ```json
   {"status":"ok","timestamp":...}
   ```

2. **检查 WebSocket 端点**
   ```bash
   # 使用 wscat 测试（需要先安装）
   # npm install -g wscat
   wscat -c "ws://9.129.28.93:5000/ws?robotId=test&token=test"
   ```

   预期输出（认证失败是正常的）：
   ```
   Connected (press CTRL+C to quit)
   < {"type":"error","code":4001,"message":"Token 无效"}
   < <disconnected>
   ```

3. **检查服务器日志**
   ```bash
   tail -f /app/work/logs/bypass/dev.log
   ```

   寻找类似这样的日志：
   ```
   [WebSocket] 新连接尝试: robotId=xxx
   [WebSocket] 机器人 xxx 已认证并连接
   ```

### 问题 2: WebSocket 连接后立即断开

**可能原因**：
- token 过期
- 设备未绑定
- 服务器配置错误

**解决步骤**：

1. **检查 token 是否过期**
   ```bash
   # 查询数据库中的 token
   psql $DATABASE_URL -c "SELECT robot_id, access_token, expires_at FROM device_tokens WHERE robot_id = '<你的机器人ID>';"
   ```

2. **检查设备绑定状态**
   ```bash
   # 查询设备绑定
   psql $DATABASE_URL -c "SELECT * FROM device_bindings WHERE robot_id = '<你的机器人ID>';"
   ```

3. **重新激活设备**
   - 在 APP 中重新激活设备
   - 获取新的 robotId 和 token

### 问题 3: WebSocket 连接不稳定

**可能原因**：
- 网络不稳定
- 服务器资源不足
- 连接超时设置过短

**解决步骤**：

1. **检查服务器资源**
   ```bash
   # 运行诊断脚本
   bash scripts/diagnose-websocket.sh
   ```

2. **调整心跳设置**（需要修改代码）
   - 编辑 `src/server/websocket-server.ts`
   - 修改 `HEARTBEAT_INTERVAL` 和 `HEARTBEAT_TIMEOUT` 常量

3. **检查网络连接**
   - 使用网络诊断工具检查丢包率
   - 检查 NAT 穿透问题

---

## 🧪 测试工具

### 使用 wscat 测试

```bash
# 安装 wscat
npm install -g wscat

# 测试连接（使用真实的 robotId 和 token）
wscat -c "ws://9.129.28.93:5000/ws?robotId=<机器人ID>&token=<令牌>"
```

**预期结果**：
- 如果 token 有效，应该看到：
  ```
  Connected (press CTRL+C to quit)
  < {"type":"authenticated","data":{"authenticated":true,"robotId":"...","deviceId":"...","userId":...,"timestamp":...}}
  ```

- 如果 token 无效，应该看到：
  ```
  Connected (press CTRL+C to quit)
  < {"type":"error","code":4001,"message":"Token 无效"}
  < <disconnected>
  ```

### 使用在线工具测试

访问以下在线 WebSocket 测试工具：
- https://www.piesocket.com/websocket-tester
- https://websocket.org/echo.html

配置：
- **WebSocket URL**: `ws://9.129.28.93:5000/ws`
- **Query Parameters**: `robotId=<机器人ID>&token=<令牌>`

---

## 📊 监控 WebSocket 连接

### 查看实时连接

```bash
# 查看日志
tail -f /app/work/logs/bypass/dev.log | grep "\[WebSocket\]"
```

### 查看连接统计

连接数统计包含在日志中：
```
[WebSocket] 机器人 <robotId> 已认证并连接，当前连接数: <连接数>
[WebSocket] 机器人 <robotId> 已断开，当前连接数: <连接数>
```

### 性能监控

服务器会定期输出系统状态：
```
[Monitor] System Stats: {
  memory: "XXXMB/YYYMB (ZZ%)",
  load: [0.1, 0.2, 0.3]
}
```

---

## 🚀 下一步

1. **在 APP 中输入服务器地址**
   ```
   9.129.28.93:5000
   ```

2. **激活设备**（如果还未激活）
   - APP 会调用激活 API
   - 获取 robotId 和 token

3. **连接 WebSocket**
   - APP 会自动连接到 WebSocket
   - 查看服务器日志确认连接成功

4. **验证功能**
   - 发送测试消息
   - 检查消息是否实时推送

---

## 📞 技术支持

如果问题仍未解决，请提供以下信息：

1. **APP 版本**: [你的 APP 版本]
2. **错误信息**: [APP 显示的错误信息]
3. **服务器日志**: 运行 `tail -n 50 /app/work/logs/bypass/dev.log`
4. **诊断结果**: 运行 `bash scripts/diagnose-websocket.sh`
5. **网络环境**: [内网/公网，是否有代理/防火墙]

---

## 📚 相关文档

- [WebSocket 问题诊断与解决方案](./WEBSOCKET_CONNECTION_ISSUE.md)
- [部署修复文档](./DEPLOYMENT_FIX_V2.md)
- [数据库设计文档](./workbot_database_design.md)
