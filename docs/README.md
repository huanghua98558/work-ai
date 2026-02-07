# WorkBot 项目文档

> WorkBot 企业微信机器人管理系统 - 技术文档

---

## 📁 文档说明

### 主要文档

#### 1. WorkBot 最终需求文档 v2.0（扣子云平台版本）
- **文件名**：`workbot_final_requirements_v2.md`
- **说明**：完整的技术需求文档，适配扣子云平台部署
- **包含内容**：
  - 系统整体架构
  - 技术栈详解
  - 数据库设计
  - API接口规范
  - WebSocket通讯协议
  - 第三方集成方案
  - 部署流程
  - 环境变量配置
- **用途**：⭐️ 开发的主要参考文档

#### 2. WorkBot 技术文档版本对比
- **文件名**：`workbot_version_comparison.md`
- **说明**：v1.0与v2.0版本的详细对比
- **包含内容**：
  - 版本变更列表
  - 主要差异说明
  - 迁移指南
  - 影响分析
- **用途**：了解版本差异，参考迁移指南

---

## 🎯 开发参考指南

### 首次开发
1. 先阅读 `workbot_final_requirements_v2.md`
2. 了解系统架构和技术栈
3. 确认数据库表结构
4. 开始编码

### 版本升级
1. 阅读 `workbot_version_comparison.md`
2. 了解主要变更
3. 按照迁移指南修改配置
4. 测试验证

---

## 📋 关键技术栈

- **前端**：Next.js 16 + React 19 + shadcn/ui + Tailwind CSS 4
- **后端**：Next.js 16 API Routes
- **数据库**：PostgreSQL (Database技能)
- **ORM**：Drizzle ORM
- **消息队列**：PostgreSQL (替代Redis)
- **WebSocket**：与HTTP共享5000端口
- **对象存储**：S3兼容 (Storage技能)
- **AI服务**：豆包/DeepSeek/Kimi (LLM技能)
- **部署平台**：扣子云平台

---

## 🚀 快速开始

### 环境要求
- Node.js 24
- pnpm 包管理器
- 扣子云平台账号

### 初始化项目
```bash
# 初始化Next.js项目
coze init /workspace/projects --template nextjs

# 安装依赖
pnpm install

# 启动开发环境
coze dev
```

---

## 📞 文档更新

- **v2.0** (2025-02-07)：适配扣子云平台，WebSocket与HTTP共享5000端口
- **v1.0** (2025-02-06)：初始版本，基于自建服务器

---

**最后更新**：2025-02-07
