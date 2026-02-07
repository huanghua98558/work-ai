# WorkBot 项目文档

> WorkBot 企业微信机器人管理系统 - 完整技术文档

## 📚 文档目录

### 核心文档

1. **[WorkBot 最终需求文档 v2.0（扣子云平台版本）](./workbot_final_requirements_v2.md)**
   - 系统整体架构
   - 用户管理系统
   - 机器人管理
   - 激活码机制与APP通讯
   - 第三方通讯协议
   - 消息处理详细流程
   - 支付系统
   - 监控告警

2. **[WorkBot 数据库设计文档](./workbot_database_design.md)**
   - 13张核心表结构设计
   - 索引优化
   - 数据库视图
   - 数据清理策略
   - 备份与监控
   - 性能优化建议

3. **[WorkBot API 接口文档](./workbot_api_reference.md)**
   - 用户管理接口
   - 激活管理接口
   - 机器人管理接口
   - 消息处理接口
   - 第三方集成接口
   - 管理员接口
   - WebSocket连接
   - 限流策略与错误码

4. **[WorkBot 第三方AI平台集成文档](./workbot_third_party_integration.md)**
   - 系统架构与通讯流程
   - APP激活流程
   - 消息回调流程
   - AI回复下发流程
   - 指令执行结果回调
   - 安全机制
   - 消息类型说明
   - 完整示例

5. **[激活码管理逻辑详细文档](./activation_code_logic.md)**
   - 激活码生成规则
   - 一码一设备机制
   - 设备ID管理
   - 设备变更处理
   - 管理员解绑流程
   - 异常处理

6. **[WorkBot 项目分析与开发计划](./workbot_project_analysis_and_plan.md)**
   - 项目现状分析
   - 技术栈总结
   - 功能模块分析
   - 十阶段开发计划（16周）
   - 风险评估
   - 测试计划
   - 部署计划
   - 上线后维护计划

### 辅助文档

| 文档 | 说明 |
|------|------|
| **[文档总览](./docs/README.md)** | 文档导航、快速指南 |
| **[版本对比](./workbot_version_comparison.md)** | v1.0 vs v2.0 版本差异 |
   - 消息处理接口
   - 第三方集成接口
   - 管理员接口
   - WebSocket连接
   - 限流策略与错误码

4. **[WorkBot 第三方AI平台集成文档](./workbot_third_party_integration.md)**
   - 系统架构与通讯流程
   - APP激活流程
   - 消息回调流程
   - AI回复下发流程
   - 指令执行结果回调
   - 安全机制
   - 消息类型说明
   - 完整示例

5. **[激活码管理逻辑详细文档](./activation_code_logic.md)**
   - 激活码生成规则
   - 一码一设备机制
   - 设备ID管理
   - 设备变更处理
   - 管理员解绑流程
   - 异常处理

### 辅助文档

6. **[WorkBot 版本对比文档](./workbot_version_comparison.md)**
   - v1.0 vs v2.0 版本差异
   - 技术栈变更
   - 功能优化

7. **[项目主 README](../README.md)**
   - 项目概述
   - 快速开始
   - 开发指南

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

## 🎯 核心功能

### 1. 用户管理
- 手机号+短信验证码登录
- 用户角色管理（超级管理员/普通用户）
- 用户信息管理

### 2. 机器人管理
- 最多30个机器人/用户
- AI回复模式（内置AI/第三方平台）
- AI模型配置（豆包/DeepSeek/Kimi）
- 机器人状态管理

### 3. 激活码管理
- 管理员批量生成
- 用户在线购买
- 一码一设备机制
- 设备解绑功能

### 4. 消息处理
- APP接收企业微信消息
- 服务器转发到第三方AI平台
- AI回复下发到APP
- 完整的消息处理流程

### 5. 第三方集成
- 消息回调接口
- 结果回调接口
- 群二维码回调接口
- 状态回调接口

## 🚀 技术栈

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | Next.js 16 + React 19 + shadcn/ui | 管理后台 |
| 后端 | Next.js 16 (API Routes) | 服务器 |
| 数据库 | PostgreSQL | 主库 + 消息队列 |
| ORM | Drizzle ORM | 数据库操作 |
| 实时通讯 | WebSocket | 与HTTP共享5000端口 |
| 对象存储 | S3兼容 | 文件存储 |
| AI服务 | 豆包/DeepSeek/Kimi | AI能力 |
| 部署平台 | 扣子云平台 | 云端部署 |

## 📖 快速导航

### 开发者

- 如果你想了解**系统整体设计**，请阅读 [WorkBot 最终需求文档 v2.0](./workbot_final_requirements_v2.md)
- 如果你想了解**数据库设计**，请阅读 [WorkBot 数据库设计文档](./workbot_database_design.md)
- 如果你想了解**API接口**，请阅读 [WorkBot API 接口文档](./workbot_api_reference.md)
- 如果你想了解**第三方集成**，请阅读 [WorkBot 第三方AI平台集成文档](./workbot_third_party_integration.md)
- 如果你想了解**激活码逻辑**，请阅读 [激活码管理逻辑详细文档](./activation_code_logic.md)

### 第三方开发者

- 如果你想开发**与WorkBot集成的第三方AI平台**，请阅读 [WorkBot 第三方AI平台集成文档](./workbot_third_party_integration.md)
- 如果你想了解**消息回调接口**，请阅读 [WorkBot API 接口文档](./workbot_api_reference.md) 第四、五章

### 运维人员

- 如果你想了解**数据库表结构**，请阅读 [WorkBot 数据库设计文档](./workbot_database_design.md)
- 如果你想了解**系统监控与日志**，请阅读 [WorkBot 最终需求文档 v2.0](./workbot_final_requirements_v2.md) 第十一节
- 如果你想了解**部署配置**，请阅读 [WorkBot 最终需求文档 v2.0](./workbot_final_requirements_v2.md) 第一节

## 🔐 安全机制

### 认证与授权
- Token认证（Access Token + Refresh Token）
- 用户角色权限控制
- 激活码绑定验证

### 数据安全
- 敏感数据加密（API密钥、Token）
- 数据库连接池管理
- SQL注入防护

### 接口安全
- 回调签名验证
- 频率限制（60 QPM）
- 参数验证

## 📊 监控与告警

### 关键指标
- 机器人在线率
- 消息处理成功率
- AI调用成功率
- API响应时间

### 日志类型
- Application日志（保留30天）
- API日志（保留7天）
- Error日志（永久保留）
- Audit日志（永久保留）
- WebSocket日志（保留7天）
- AI调用日志（保留30天）

## 🔗 相关链接

- [扣子云平台](https://coze.site)
- [PostgreSQL](https://www.postgresql.org/)
- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Drizzle ORM](https://orm.drizzle.team/)

## 📝 版本说明

- **当前版本**：v2.0
- **适配平台**：扣子云平台
- **更新日期**：2024-12
- **主要变更**：
  - 适配扣子云平台部署
  - WebSocket与HTTP共享5000端口
  - 使用PostgreSQL替代Redis
  - 完善第三方AI平台集成

## 📞 技术支持

如有问题，请联系技术支持团队。

---

**最后更新**：2024-12-01
