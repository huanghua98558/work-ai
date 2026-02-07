# WorkBot 企业微信机器人管理系统

> 基于 Next.js 16 + 扣子云平台的企业微信机器人管理系统

---

## 📚 项目文档

完整的技术文档请查看 [`docs/`](./docs/) 目录：

### 核心文档

| 文档 | 说明 |
|------|------|
| **[WorkBot 最终需求文档 v2.0](./docs/workbot_final_requirements_v2.md)** | 系统整体架构、用户管理、机器人管理、激活码机制、第三方通讯协议、消息处理流程、支付系统、监控告警 |
| **[WorkBot 数据库设计文档](./docs/workbot_database_design.md)** | 13张核心表结构、索引优化、数据库视图、数据清理策略、备份与监控 |
| **[WorkBot API 接口文档](./docs/workbot_api_reference.md)** | 用户管理、激活管理、机器人管理、消息处理、第三方集成、管理员接口、WebSocket连接 |
| **[WorkBot 第三方AI平台集成文档](./docs/workbot_third_party_integration.md)** | 系统架构、APP激活流程、消息回调、AI回复下发、安全机制、完整示例 |
| **[激活码管理逻辑详细文档](./docs/activation_code_logic.md)** | 激活码生成规则、一码一设备机制、设备ID管理、设备变更处理 |

### 辅助文档

| 文档 | 说明 |
|------|------|
| **[文档总览](./docs/README.md)** | 文档导航、快速指南 |
| **[版本对比](./docs/workbot_version_comparison.md)** | v1.0 vs v2.0 版本差异 |

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    WorkBot 系统                           │
│                    扣子云平台部署                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  手机APP    │  │  管理后台   │  │  第三方平台 │    │
│  │ (企业微信)  │  │  (Web)      │  │ (Dify/豆包) │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                 │                 │            │
│         │ WSS (5000)      │ HTTPS (5000)    │ HTTPS      │
│         │                 │                 │            │
│         ▼                 ▼                 ▼            │
│  ┌───────────────────────────────────────────────┐     │
│  │    WorkBot 服务器 (Next.js 16)                 │     │
│  │    端口：5000 (HTTP + WebSocket)              │     │
│  │    域名：your-domain.coze.site                 │     │
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
```

## 🔄 消息处理流程

```
1. 用户发消息 → 企业微信
   ↓
2. WorkBot APP接收消息
   ↓
3. APP上报到WorkBot服务器
   ↓
4. 服务器判断AI回复模式
   ├─ 内置AI：调用LLM技能生成回复
   └─ 第三方平台：转发消息到第三方回调地址
   ↓
5. AI生成回复
   ↓
6. 服务器下发指令到APP
   ↓
7. APP发送消息到企业微信
   ↓
8. 服务器回调执行结果（可选）
```

## 📖 快速导航

### 开发者

- 📋 [系统整体设计](./docs/workbot_final_requirements_v2.md) - 了解系统架构和功能
- 💾 [数据库设计](./docs/workbot_database_design.md) - 查看表结构和索引
- 🔌 [API接口文档](./docs/workbot_api_reference.md) - 了解所有API接口
- 🔗 [第三方集成](./docs/workbot_third_party_integration.md) - 学习如何集成第三方AI平台
- 🔑 [激活码逻辑](./docs/activation_code_logic.md) - 理解激活码机制

### 第三方开发者

- 🔗 [WorkBot 第三方AI平台集成文档](./docs/workbot_third_party_integration.md) - 开发与WorkBot集成的第三方AI平台
- 🔌 [WorkBot API 接口文档](./docs/workbot_api_reference.md) - 查看消息回调接口和发送接口

### 运维人员

- 💾 [数据库设计](./docs/workbot_database_design.md) - 数据库表结构和维护
- 📊 [系统监控](./docs/workbot_final_requirements_v2.md#十一-监控告警) - 监控指标和告警规则
- 🚀 [部署配置](./docs/workbot_final_requirements_v2.md#一-系统整体架构) - 部署环境配置

---

## 🚀 快速开始

### 环境要求
- Node.js 24
- pnpm
- 扣子云平台账号

### 安装依赖
```bash
pnpm install
```

### 开发环境
```bash
coze dev
```

### 构建
```bash
pnpm run build
```

### 部署
```bash
coze build
coze start
```

---

## 📋 核心功能

- ✅ 用户管理（手机号+验证码登录）
- ✅ 机器人管理（最多30个/用户）
- ✅ 激活码管理（管理员分发/用户购买）
- ✅ AI回复系统（豆包/DeepSeek/Kimi）
- ✅ 第三方平台集成
- ✅ WebSocket实时通讯
- ✅ 消息队列（PostgreSQL）
- ✅ 支付系统（微信支付）

---

## 🛠️ 技术栈

- **前端**：Next.js 16 + React 19 + shadcn/ui + Tailwind CSS 4
- **后端**：Next.js 16 API Routes
- **数据库**：PostgreSQL (Database技能)
- **ORM**：Drizzle ORM
- **WebSocket**：与HTTP共享5000端口
- **对象存储**：S3兼容 (Storage技能)
- **AI服务**：豆包/DeepSeek/Kimi (LLM技能)
- **部署**：扣子云平台

---

## 📝 许可证

MIT

---

**最后更新**：2025-02-07
