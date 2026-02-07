# WorkBot 最终需求文档 v2.0（扣子云平台版本）

> **版本说明**：v2.0 适配扣子云平台部署环境

---

## 一、系统整体架构

### 技术栈
- 前端：Next.js 16 + React 19 + shadcn/ui + Tailwind CSS 4
- 后端：Next.js 16 (API Routes)
- 数据库：PostgreSQL (通过Database技能提供)
- ORM：Drizzle ORM
- 消息队列：PostgreSQL (替代Redis)
- 实时通讯：WebSocket (与HTTP共享5000端口)
- HTTP服务：HTTPS (5000端口)
- 对象存储：S3兼容 (通过Storage技能提供)
- AI服务：豆包/DeepSeek/Kimi (通过LLM技能提供)
- 部署平台：扣子云平台

### 系统架构
```
┌─────────────────────────────────────────────────────────┐
│                    WorkBot 系统                           │
│                    扣子云平台部署                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  手机APP    │  │  管理后台   │  │  第三方平台 │    │
│  │ (企业微信)  │  │  (Web)      │  │  (WorkTool) │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                 │                 │            │
│         │ WSS (5000)      │ HTTPS (5000)    │ HTTPS      │
│         │                 │                 │            │
│         ▼                 ▼                 ▼            │
│  ┌───────────────────────────────────────────────┐     │
│  │    WorkBot 服务器 (Next.js 16)                 │     │
│  │    端口：5000 (HTTP + WebSocket)              │     │
│  │    域名：your-domain.coze.site                 │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │     │
│  │  │  API层   │  │WebSocket │  │  AI引擎  │   │     │
│  │  └──────────┘  └──────────┘  └──────────┘   │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │     │
│  │  │ 用户管理 │  │ 机器人管理│  │ 回调服务  │   │     │
│  │  └──────────┘  └──────────┘  └──────────┘   │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │     │
│  │  │ 支付系统 │  │ 监控告警  │  │ 消息队列  │   │     │
│  │  └──────────┘  └──────────┘  └──────────┘   │     │
│  └───────────────────┬───────────────────────────┘     │
│                      │                                  │
│        ┌─────────────┼─────────────┐                   │
│        ▼             ▼             ▼                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │PostgreSQL│  │PostgreSQL│  │ 对象存储 │             │
│  │  (主库)  │  │ (消息队列)│  │  (S3)   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                          │
└─────────────────────────────────────────────────────────┘

部署环境：
┌──────────────────────────────────────┐
│     扣子云平台                       │
│  ├─ 自动HTTPS (Let's Encrypt)       │
│  ├─ 域名：your-domain.coze.site      │
│  ├─ 端口：5000 (HTTP + WebSocket)    │
│  ├─ PostgreSQL (Database技能)       │
│  ├─ S3对象存储 (Storage技能)         │
│  └─ LLM服务 (LLM技能)               │
└──────────────────────────────────────┘
```

---

## 二、用户管理系统

### 用户角色
| 角色 | 说明 | 权限 |
|-----|------|------|
| **超级管理员** | 平台管理员 | 管理所有用户、机器人、系统配置、AI配置、激活码管理 |
| **普通用户** | 业务用户 | 管理自己的机器人、配置AI参数、购买激活码、查看统计 |

### 用户注册与登录
- **登录方式**：手机号+短信验证码（主要）
- **可选方式**：微信授权登录（后续扩展）
- **必填信息**：手机号
- **可选信息**：微信昵称、微信头像

### 用户信息字段
```sql
users:
├─ id
├─ nickname (昵称)
├─ avatar (头像)
├─ phone (必填，手机号)
├─ role (超管/普通用户)
├─ status (正常/禁用)
├─ created_at
└─ last_login_at
```

### 注册流程（手机号+验证码）
```
1. 用户输入手机号
2. 点击"发送验证码"
3. 系统发送短信验证码（阿里云SMS）
4. 用户输入验证码
5. 验证验证码
6. 注册/登录成功
```

---

## 三、机器人管理

### 机器人数量限制
- 每个用户最多30个机器人

### 机器人设置面板
```
机器人配置：
├─ 基本信息
│   ├─ 机器人ID (robotId)
│   ├─ 机器人名称
│   ├─ 状态 (在线/离线)
│   ├─ 绑定设备信息
│   └─ 激活时间
│
├─ AI回复模式（核心功能）
│   ├─ 模式A：内置客服AI
│   │   ├─ 选择AI模型
│   │   │   ├─ 豆包
│   │   │   ├─ DeepSeek
│   │   │   ├─ Kimi
│   │   │   └─ 自定义（可添加）
│   │   ├─ 温度参数：0.7
│   │   ├─ 最大token数：2000
│   │   ├─ 对话历史保留：10条
│   │   └─ 应用场景选择
│   │       ├─ 咨询
│   │       ├─ 问答
│   │       ├─ 闲聊
│   │       ├─ 售后
│   │       └─ 社群管理
│   │
│   └─ 模式B：第三方智能消息处理平台
│       ├─ 第三方API地址（机器人级别配置）
│       ├─ 消息回调地址配置
│       └─ 回调接口
│           ├─ 消息回调
│           ├─ 结果回调
│           ├─ 群二维码回调
│           └─ 状态回调
│
├─ AI API配置
│   ├─ 用户自己配置API密钥
│   ├─ 支持的AI模型
│   └─ 每个机器人可选择不同AI模型
│
└─ 风控设置
    ├─ 回复延迟：1-3秒（随机）
    ├─ AI调用限制（成本控制）
    └─ 异常检测机制
```

### 机器人状态管理
- 在线：WebSocket连接正常，心跳正常
- 离线：WebSocket断开，心跳超时（30秒）
- 已删除：软删除，30天后永久删除

### 机器人删除处理
- **方案**：软删除
- 流程：
  1. 机器人状态标记为"已删除"
  2. 数据保留30天
  3. 30天后永久删除
  4. 激活码失效，不可重新使用

---

## 四、激活码机制

### 分发方式

#### 方式1：管理员分发
- 超级管理员批量生成激活码
- 选择绑定用户（生成时绑定或生成后手动绑定）
- 通过微信、邮件等方式分发给用户
- 激活码生成时绑定到用户账号

#### 方式2：用户购买
- 用户在管理后台购买激活码
- 选择有效期
- 微信支付
- 支付成功后自动生成激活码
- 激活码自动绑定到用户账号

### 绑定方式
- **自动绑定**：激活码生成时选择绑定用户
- **手动绑定**：激活码生成后，管理员编辑选择绑定用户

### 使用规则
- **一码一设备**：防止滥用
- **同一设备可多次激活**：卸载重装后可以用同一个激活码重新激活
- **不同设备不能使用同一激活码**：激活码只能绑定一个deviceId
- **同一激活码，同一设备，可以无限次激活**：只要deviceId不变

### APP激活流程

#### 完整流程
```
1. 用户在APP输入激活码
   ↓
2. APP获取设备信息（deviceInfo）
   ├─ deviceId：系统提供的唯一标识
   │  ├─ Android：Settings.Secure.ANDROID_ID
   │  └─ iOS：UIDevice.current.identifierForVendor
   ├─ model：设备型号（如：Samsung Galaxy S21）
   ├─ os：操作系统（Android/iOS）
   ├─ osVersion：系统版本（如：12）
   ├─ manufacturer：厂商（如：Samsung）
   ├─ network：网络类型（4G/WiFi）
   ├─ appVersion：APP版本（如：1.0.0）
   ├─ totalMemory：内存大小（MB）
   └─ screenResolution：屏幕分辨率（如：1080x2400）
   ↓
3. APP调用 POST /api/robot-ids/activate
   输入：
   {
     "code": "3CQ4Z9LE",
     "deviceInfo": {
       "deviceId": "device-001",
       "model": "Samsung Galaxy S21",
       "os": "Android",
       "osVersion": "12",
       "manufacturer": "Samsung",
       "network": "4G",
       "appVersion": "1.0.0",
       "totalMemory": 8192,
       "screenResolution": "1080x2400"
     }
   }
   ↓
4. 服务器验证激活码 + 设备绑定
   ├─ 检查激活码是否存在
   ├─ 检查激活码是否已过期
   ├─ 检查激活码是否已使用
   ├─ 如果已使用，检查是否绑定到同一个设备（deviceId）
   │  ├─ 如果绑定到不同设备 → ❌ 返回错误："激活码已绑定到其他设备"
   │  └─ 如果绑定到同一个设备 → ✅ 允许重新激活
   ├─ 生成robotId（随机生成）
   ├─ 生成token（JWT）
   ├─ 激活码绑定到该deviceId
   └─ 保存设备信息
   ↓
5. 服务器返回
   输出：
   {
     "success": true,
     "code": 0,
     "data": {
       "robotId": "RBml9n7nikHIMZU0",
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
   }
   ↓
6. APP保存robotId和token到本地
   ↓
7. APP开始与服务器建立正式通讯（WebSocket）
```

### deviceId管理

#### deviceId获取方式
- **Android**：使用 `Settings.Secure.ANDROID_ID`
- **iOS**：使用 `UIDevice.current.identifierForVendor`
- **特点**：系统提供的唯一标识，卸载重装后不变

#### deviceId的作用
- **设备绑定**：实现"一码一设备"
- **设备识别**：区分不同设备
- **防滥用**：防止同一激活码在多个设备上使用
- **设备统计**：统计设备型号分布

### 设备变更处理

#### 场景1：卸载重装
- 用户卸载APP后重新安装
- deviceId不变
- ✅ 可以用同一个激活码重新激活

#### 场景2：刷机、改机、更换设备
- 用户修改了deviceId（使用改机软件、刷机、更换设备）
- 检测到deviceId变化
- ❌ 激活失败："激活码已绑定到其他设备"

#### 解决方案：管理员解绑
1. 用户联系管理员
2. 管理员在后台查看激活码绑定情况
3. 管理员执行"解绑设备"操作
4. 用户可以使用激活码在新设备上激活

### 定价
| 有效期 | 价格 |
|-------|------|
| 1个月 | ¥50 |
| 6个月 | ¥200 |
| 1年 | ¥300 |

### 支付失败处理
- **方案**：保留订单，稍后重试
- 流程：
  1. 创建订单（状态：待支付）
  2. 支付失败，订单状态不变
  3. 用户可在"我的订单"查看
  4. 可以继续支付或取消订单
  5. 24小时未支付，订单自动取消

### 激活码管理功能
```
超级管理员功能：
├─ 激活码列表
│   ├─ 查看所有激活码
│   ├─ 激活码状态（未使用/已使用/已过期）
│   ├─ 绑定的设备信息
│   ├─ 绑定的用户
│   └─ 激活码类型（管理员分发/用户购买）
│
├─ 生成激活码
│   ├─ 批量生成
│   ├─ 设置有效期（1个月/6个月/1年/自定义）
│   ├─ 选择绑定用户（可选）
│   └─ 生成后自动保存
│
├─ 激活码操作
│   ├─ 修改绑定用户（重新分配）
│   ├─ 解绑设备（允许更换设备）
│   │  ├─ 查看绑定的设备信息
│   │  ├─ 执行解绑操作
│   │  └─ 解绑后可在新设备上激活
│   ├─ 查看激活状态
│   └─ 导出激活码列表
│
└─ 激活统计
    ├─ 激活码使用率
    ├─ 活跃设备数量
    └─ 用户绑定数量
```

---

## 五、AI回复系统

### AI模型（平台预置）
- 豆包（Seed, Doubao）
- DeepSeek
- Kimi
- 支持自定义添加

### 应用场景
- 咨询
- 问答
- 闲聊
- 售后
- 社群管理

### 成本控制
- **方案**：免费额度 + 付费扩展
- 新用户赠送100次免费AI调用（用于调试）
- 用完后：
  - 停止AI功能，提示充值
  - 或切换到第三方平台
- 用户可以购买更多调用次数

### AI配置
```
AI配置：
├─ 选择AI模型
├─ 输入API密钥（用户自己配置）
├─ 温度：0.7（默认，可调整）
├─ 最大token数：2000（默认，可调整）
├─ 系统提示词：可配置
└─ 应用场景：咨询/问答/闲聊/售后/社群管理
```

### AI上下文连贯性
- **方案**：对话会话管理
- 会话超时时间：30分钟
- 上下文保留条数：10条
- 最大token数：2000
- 会话划分规则：
  - 同一个发送者
  - 连续对话（间隔不超过30分钟）
  - 未切换到其他聊天对象

### AI调用流程
```
用户发送消息
  ↓
1. 检查AI回复模式
  ├─ 内置AI → 调用AI引擎
  └─ 第三方平台 → 推送到第三方
  ↓
2. 构建AI请求（内置AI）
  ├─ 获取会话的最近10条消息
  ├─ 构建上下文消息列表
  ├─ 检查token数，如果超过2000，删除最早的消息
  └─ 调用AI API
  ↓
3. 保存AI回复到会话
  ↓
4. 下发指令给APP
  ↓
5. APP发送回复到企业微信
```

---

## 六、第三方通讯协议

### WorkBot提供给第三方的接口（4个核心接口）

#### 1. 发送消息
- **方法**：POST
- **路径**：`/wework/sendRawMessage?robotId={robotId}`
- **认证**：无需验证，只需robotId正确
- **请求体**：
```json
{
  "target": "张三",
  "content": "您好，有什么可以帮您？",
  "messageType": "text"
}
```

#### 2. 更新机器人信息
- **方法**：POST
- **路径**：`/robot/robotInfo/update?robotId={robotId}`
- **认证**：无需验证，只需robotId正确

#### 3. 获取机器人信息
- **方法**：GET
- **路径**：`/robot/robotInfo/get?robotId={robotId}`
- **认证**：无需验证，只需robotId正确

#### 4. 查询机器人在线状态
- **方法**：GET
- **路径**：`/robot/robotInfo/online?robotId={robotId}`
- **认证**：无需验证，只需robotId正确

### API限流策略
- 所有限制：每分钟60次
- 超限返回：429 Too Many Requests

### 第三方回调失败处理
- **方案**：自动重试3次
- 流程：
  1. 第一次推送失败
  2. 1秒后重试
  3. 3秒后重试
  4. 5秒后重试
  5. 3次都失败，记录日志，通知用户

### 第三方回调接口（机器人级别配置）

每个机器人单独配置第三方回调地址：

| 回调类型 | 方法 | 路径（示例） | 说明 |
|---------|------|------|------|
| 消息回调 | POST | `/api/worktool/callback/message?robotId={robotId}` | WorkBot推送消息到第三方 |
| 结果回调 | POST | `/api/worktool/callback/result?robotId={robotId}` | WorkBot推送执行结果到第三方 |
| 群二维码回调 | POST | `/api/worktool/callback/qrcode?robotId={robotId}` | WorkBot推送群二维码到第三方 |
| 状态回调 | POST | `/api/worktool/callback/status?robotId={robotId}` | WorkBot推送机器人状态到第三方 |

### 双向通讯流程
```
用户发消息 → APP → WorkBot → 判断AI模式
  ├─ 内置AI → AI生成回复 → WorkBot → APP → 企业微信
  └─ 第三方平台 → 回调第三方 → 第三方处理 → WorkBot → APP → 企业微信
```

---

## 七、APP与服务器通讯

### HTTP接口

#### 1. 激活机器人
- **接口**：`POST /api/robot-ids/activate`
- **请求**：
```json
{
  "code": "3CQ4Z9LE",
  "deviceInfo": {
    "deviceId": "device-001",
    "model": "Samsung Galaxy S21",
    "os": "Android",
    "osVersion": "12",
    "manufacturer": "Samsung",
    "network": "4G",
    "appVersion": "1.0.0",
    "totalMemory": 8192,
    "screenResolution": "1080x2400"
  }
}
```
- **响应**：
```json
{
  "success": true,
  "code": 0,
  "data": {
    "robotId": "RBml9n7nikHIMZU0",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. 发送心跳
- **接口**：`POST /api/heartbeat`
- **请求头**：`Authorization: Bearer {token}`
- **请求**：
```json
{
  "timestamp": 1770341503000,
  "memoryUsage": 1024,
  "cpuUsage": 50,
  "batteryLevel": 80,
  "networkType": "wifi"
}
```

#### 3. 上报结果
- **接口**：`POST /api/result`
- **请求头**：`Authorization: Bearer {token}`
- **请求**：
```json
{
  "commandId": "cmd-001",
  "status": "success",
  "result": {
    "message": "执行成功",
    "messageId": "msg-002"
  }
}
```

### WebSocket通讯

#### 连接地址
- **地址**：`wss://your-domain.coze.site/ws/connect?token={token}`
- **协议**：WSS
- **端口**：5000（与HTTP共享）

#### 消息类型

| 方向 | type | 说明 |
|-----|------|------|
| APP → Server | heartbeat | 心跳 |
| APP → Server | message | 消息上报 |
| APP → Server | result | 结果上报 |
| APP → Server | error | 错误上报 |
| Server → APP | command | 指令下发 |
| Server → APP | config | 配置推送 |
| Server → APP | heartbeat_response | 心跳响应 |

#### 心跳机制
- APP每30秒发送一次心跳
- 服务器检测心跳，30秒无心跳判定离线

#### 指令下发与结果上报

**下发指令（Server → APP）**：
```json
{
  "type": "command",
  "data": {
    "commandId": "cmd-001",
    "commandType": "send_message",
    "params": {
      "target": "张三",
      "content": "您好，有什么可以帮您？",
      "messageType": "text"
    },
    "priority": 0
  },
  "timestamp": 1770341504000,
  "messageId": "cmd-001"
}
```

**结果上报（APP → Server）**：
```json
{
  "type": "result",
  "data": {
    "commandId": "cmd-001",
    "status": "success",
    "result": {
      "messageId": "msg-002"
    }
  },
  "timestamp": 1770341505000,
  "messageId": "res-001"
}
```

### 消息发送失败重试机制

#### 情况1：下达失败（APP离线、连接失败）
- **方案**：放入PostgreSQL消息队列
- 流程：
  1. 服务器尝试下发指令
  2. 检测到APP离线（或下达失败）
  3. 把指令写入`offline_commands`表
  4. APP上线后，从表读取待处理指令
  5. 队列消息保留24小时

#### 情况2：下达成功，但执行失败
- **方案**：自动重试3次
- 流程：
  1. APP返回"执行失败"
  2. 服务器等待1秒，重新下发指令
  3. APP再次执行
  4. 如果还失败，再重试（最多3次）
  5. 3次都失败，记录日志，通知用户

---

## 八、消息管理

### 消息历史保存
- **默认**：30天
- **可配置**：后台可设置（7天/30天/90天/180天/永久）
- **自动清理**：定时任务每天凌晨3点清理过期消息

### 消息类型
- text（文本）
- image（图片）
- video（视频）
- audio（音频）
- file（文件）
- card（卡片）

### 对话会话管理
- 会话超时：30分钟
- 上下文保留：10条消息
- 最大token数：2000

---

## 九、支付系统

### 支付方式
- 微信支付（主要）
- 支付宝（可选）
- 余额充值（可选）

### 支付流程
```
1. 用户选择有效期（1个月/6个月/1年）
2. 创建订单（状态：待支付）
3. 跳转微信支付
4. 支付成功 → 生成激活码 → 自动绑定到用户
5. 支付失败 → 订单状态不变，可稍后重试
6. 24小时未支付 → 订单自动取消
```

### 订单管理
```
我的订单：
├─ 订单列表
├─ 订单状态（待支付/已支付/已取消）
├─ 支付方式
├─ 支付时间
├─ 激活码（已支付后显示）
└─ 操作（继续支付/取消订单）
```

---

## 十、管理后台功能

### 超级管理员功能
```
超管后台：
├─ 用户管理
│   ├─ 用户列表
│   ├─ 新增/编辑/删除用户
│   ├─ 分配角色（超管/普通用户）
│   └─ 查看用户统计
│
├─ 机器人管理
│   ├─ 所有机器人列表
│   ├─ 机器人状态监控
│   ├─ 查看机器人配置
│   └─ 强制下线/删除机器人
│
├─ 激活码管理
│   ├─ 激活码列表
│   ├─ 批量生成激活码
│   ├─ 修改绑定用户
│   ├─ 查看激活状态
│   └─ 激活统计
│
├─ AI配置管理
│   ├─ 预置AI模型列表
│   ├─ 添加/编辑/删除AI模型
│   ├─ 设置默认参数
│   └─ 应用场景模板管理
│
├─ 订单管理
│   ├─ 所有订单列表
│   ├─ 订单状态查询
│   └─ 订单统计
│
├─ 系统配置
│   ├─ 消息历史保存周期
│   ├─ 自动清理配置
│   ├─ 回调地址管理
│   └─ 系统参数设置
│
└─ 数据统计
    ├─ 用户活跃度
    ├─ 机器人在线统计
    ├─ AI调用统计
    ├─ 消息发送量
    └─ 成本统计
```

### 普通用户功能
```
用户后台：
├─ 我的机器人
│   ├─ 机器人列表
│   ├─ 购买激活码
│   ├─ 查看机器人状态
│   └─ 解绑机器人
│
├─ 机器人设置
│   ├─ AI回复模式选择
│   ├─ 内置AI配置
│   ├─ 第三方平台配置
│   └─ 风控设置
│
├─ AI配置
│   ├─ 我的AI密钥管理
│   ├─ API密钥配置
│   └─ 查看调用统计
│
├─ 我的订单
│   ├─ 订单列表
│   ├─ 订单状态
│   └─ 操作（继续支付/取消）
│
└─ 数据统计
    ├─ AI调用次数
    ├─ 剩余额度
    └─ 消息记录
```

---

## 十一、系统监控与告警

### 监控指标
- 机器人在线数量
- WebSocket连接数
- AI调用次数
- 消息发送成功率
- 第三方回调成功率
- 系统响应时间
- API调用频率
- 错误率

### 告警方式
- 后台展示异常
- 邮件通知（可选）
- 短信通知（可选）

### 告警规则
- 机器人离线超过5分钟
- AI调用失败率超过10%
- 第三方回调失败率超过10%
- 系统响应时间超过3秒
- 错误率超过5%

---

## 十二、数据备份策略

### 自动备份
- 数据库备份：
  - 每天凌晨3点自动备份
  - 保留最近7天的备份
  - 备份文件存储到对象存储（S3）
- 对象存储备份：
  - 定期备份重要文件
  - 跨区域复制

---

## 十三、日志保留策略

| 日志类型 | 保留时间 | 说明 |
|---------|---------|------|
| 应用日志 | 7天 | 开发调试用 |
| 接口访问日志 | 30天 | 统计分析 |
| 错误日志 | 90天 | 问题排查 |
| 审计日志 | 永久 | 关键操作记录 |
| WebSocket通讯日志 | 7天 | 调试通讯问题 |
| AI调用日志 | 90天 | 成本统计 |

### 日志清理
- 定时任务每天清理过期日志
- 审计日志永久保存
- 错误日志可配置导出

---

## 十四、技术实现要点

### JWT Token
- Access Token有效期：7天
- Refresh Token有效期：30天
- 用于API请求和WebSocket连接验证

### WebSocket连接管理
- 连接池：Map<robotId, WebSocket>
- 心跳检测：30秒
- 断线重连：指数退避策略（1s/2s/5s/10s/30s）

### 消息队列（PostgreSQL替代Redis）
- 使用`offline_commands`表存储离线指令
- 支持消息优先级
- 消息保留24小时
- 支持批量读取

### 缓存策略
- 机器人状态缓存（PostgreSQL）
- 用户配置缓存（PostgreSQL）
- AI对话历史缓存（PostgreSQL）

### 数据库优化
- 索引优化
- 定期清理过期数据
- 监控慢查询

---

## 十五、安全与性能

### HTTPS强制
- 所有HTTP接口强制使用HTTPS
- WebSocket使用WSS
- 扣子平台自动提供HTTPS（Let's Encrypt）

### API限流
- 所有限制：每分钟60次
- 超限返回：429 Too Many Requests

### IP白名单（可选）
- 可配置IP白名单限制第三方访问

### 性能要求
- 支持1000个机器人并发
- 支持10000个在线连接
- 消息响应时间<1秒

---

## 十六、部署架构（扣子云平台）

### 端口配置
- API服务：5000端口（HTTPS）
- WebSocket服务：5000端口（与HTTP共享，WSS）
- 数据库：PostgreSQL（Database技能提供）
- 消息队列：PostgreSQL（与数据库共享）

### 域名配置
```
生产环境域名：
- HTTP: https://your-domain.coze.site
- WebSocket: wss://your-domain.coze.site/ws/connect

开发环境：
- HTTP: http://localhost:5000
- WebSocket: ws://localhost:5000/ws/connect
```

### 环境变量
```bash
# 数据库（扣子自动提供）
PGDATABASE_URL=postgresql://...（自动配置）

# 对象存储（扣子自动提供）
COZE_BUCKET_ENDPOINT_URL=https://integration.coze.cn/coze-coding-s3proxy/v1
COZE_BUCKET_NAME=bucket_xxxxxx

# JWT
JWT_SECRET=your-secret-key

# 微信支付
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret
WECHAT_MCH_ID=your-mch-id
WECHAT_API_KEY=your-api-key

# 微信开放平台（可选）
WECHAT_OPEN_APP_ID=your-open-app-id
WECHAT_OPEN_APP_SECRET=your-open-app-secret

# 阿里云短信（验证码）
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_SMS_SIGN_NAME=your-sign-name
ALIYUN_SMS_TEMPLATE_CODE=your-template-code

# AI服务配置
DOUBAO_API_KEY=your-doubao-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
KIMI_API_KEY=your-kimi-api-key

# 扣子平台（自动配置）
COZE_PROJECT_DOMAIN=https://your-domain.coze.site
DEPLOY_RUN_PORT=5000
```

### 部署流程
```bash
# 1. 初始化项目
coze init /workspace/projects --template nextjs

# 2. 安装依赖
pnpm install

# 3. 开发环境
coze dev

# 4. 构建生产版本
pnpm run build

# 5. 部署到扣子
coze build
coze start
```

### 数据库表结构（PostgreSQL）

#### 核心表
```sql
-- 用户表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(128),
  avatar TEXT,
  phone VARCHAR(20) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- 机器人表
CREATE TABLE robots (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id VARCHAR(64) UNIQUE NOT NULL,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  name VARCHAR(128) NOT NULL,
  status VARCHAR(20) DEFAULT 'offline',
  ai_mode VARCHAR(20) DEFAULT 'builtin',
  ai_model VARCHAR(64),
  ai_api_key TEXT,
  ai_temperature DECIMAL(3,2) DEFAULT 0.7,
  ai_max_tokens INTEGER DEFAULT 2000,
  ai_scenario VARCHAR(64),
  third_party_url TEXT,
  third_party_callback_url TEXT,
  reply_delay_min INTEGER DEFAULT 1,
  reply_delay_max INTEGER DEFAULT 3,
  device_id VARCHAR(128),
  device_info JSONB,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 激活码表
CREATE TABLE activation_codes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  user_id VARCHAR(36) REFERENCES users(id),
  robot_id VARCHAR(36) REFERENCES robots(id),
  device_id VARCHAR(128),
  status VARCHAR(20) DEFAULT 'unused',
  valid_days INTEGER NOT NULL,
  expires_at TIMESTAMP,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 离线指令表（消息队列）
CREATE TABLE offline_commands (
  id SERIAL PRIMARY KEY,
  robot_id VARCHAR(36) NOT NULL REFERENCES robots(id),
  command JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- 订单表
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  order_no VARCHAR(64) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(20),
  payment_time TIMESTAMP,
  expired_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 消息历史表
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id VARCHAR(36) NOT NULL REFERENCES robots(id),
  conversation_id VARCHAR(64),
  sender VARCHAR(128),
  sender_type VARCHAR(20), -- user/contact/group
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  direction VARCHAR(20), -- incoming/outgoing
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI调用记录表
CREATE TABLE ai_calls (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id VARCHAR(36) NOT NULL REFERENCES robots(id),
  model VARCHAR(64) NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 索引优化
```sql
-- 机器人表索引
CREATE INDEX idx_robots_user_id ON robots(user_id);
CREATE INDEX idx_robots_status ON robots(status);
CREATE INDEX idx_robots_device_id ON robots(device_id);

-- 激活码表索引
CREATE INDEX idx_activation_codes_code ON activation_codes(code);
CREATE INDEX idx_activation_codes_user_id ON activation_codes(user_id);
CREATE INDEX idx_activation_codes_status ON activation_codes(status);

-- 离线指令表索引
CREATE INDEX idx_offline_commands_robot_id ON offline_commands(robot_id);
CREATE INDEX idx_offline_commands_processed ON offline_commands(processed, created_at);

-- 消息历史表索引
CREATE INDEX idx_messages_robot_id ON messages(robot_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- AI调用记录表索引
CREATE INDEX idx_ai_calls_robot_id ON ai_calls(robot_id);
CREATE INDEX idx_ai_calls_created_at ON ai_calls(created_at);
```

---

## 十七、API接口规范

### 基础URL
```
开发环境：http://localhost:5000/api
生产环境：https://your-domain.coze.site/api
```

### 通用响应格式
```json
{
  "success": true,
  "code": 0,
  "message": "操作成功",
  "data": {}
}
```

### 错误码定义
| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| 1001 | 参数错误 |
| 1002 | 未登录 |
| 1003 | 权限不足 |
| 2001 | 激活码无效 |
| 2002 | 激活码已使用 |
| 2003 | 激活码已过期 |
| 2004 | 激活码已绑定到其他设备 |
| 3001 | 机器人不存在 |
| 3002 | 机器人已激活 |
| 3003 | 设备不匹配 |
| 4001 | AI调用失败 |
| 4002 | AI额度不足 |
| 5001 | 系统错误 |

---

## 十八、版本历史

| 版本 | 日期 | 说明 |
|-----|------|------|
| v2.0 | 2025-02-07 | 适配扣子云平台，WebSocket与HTTP共享5000端口，使用PostgreSQL替代Redis |
| v1.0 | 2025-02-06 | 初始版本 |

---

## 附录：扣子云平台特性说明

### 1. 自动HTTPS
- 扣子平台自动提供Let's Encrypt证书
- 无需手动配置SSL证书
- 支持自动续期

### 2. 域名配置
- 默认域名：`your-id.dev.coze.site`（开发环境）
- 默认域名：`your-id.coze.site`（生产环境）
- 支持自定义域名（CNAME配置）

### 3. 端口限制
- 只暴露5000端口
- HTTP和WebSocket必须共享5000端口
- WebSocket自动升级为WSS

### 4. 服务限制
- 无Nginx配置
- 无Redis服务
- PostgreSQL通过Database技能提供
- 对象存储通过Storage技能提供
- LLM服务通过LLM技能提供

### 5. 部署命令
```bash
# 开发环境
coze dev

# 构建生产版本
coze build

# 启动生产环境
coze start
```

---

**文档结束**
