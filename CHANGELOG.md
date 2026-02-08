# WorkBot 更新日志

本文件记录 WorkBot 项目的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [2.0.0] - 2024-01-XX

### 新增

#### 部署和文档
- ✅ 添加环境变量检查脚本 (`scripts/check-env.sh`)
- ✅ 创建详细的部署指南 (`docs/DEPLOYMENT_GUIDE.md`)
- ✅ 创建环境变量说明文档 (`docs/ENVIRONMENT_VARIABLES.md`)
- ✅ 创建快速开始指南 (`docs/QUICKSTART.md`)
- ✅ 创建故障排查指南 (`docs/TROUBLESHOOTING.md`)
- ✅ 创建 API 文档 (`docs/API.md`)
- ✅ 创建贡献指南 (`docs/CONTRIBUTING.md`)
- ✅ 创建 `.env.example` 示例文件
- ✅ 更新启动脚本，添加环境变量预检查
- ✅ 更新 `.coze` 配置，添加构建前环境检查

#### 功能特性
- ✅ 完整的激活码管理系统
  - 支持生成、查看、编辑、删除激活码
  - 支持批量生成（1-100个）
  - 支持有效期设置（1个月/6个月/1年）
  - 支持两种激活模式（绑定机器人/纯激活码）
  - 支持设备解绑和跨设备保护

- ✅ 机器人管理系统
  - 创建和管理机器人
  - 绑定激活码
  - 支持 AI 配置（内置/第三方）
  - 支持多种提供商（豆包、DeepSeek、Kimi）
  - 支持参数配置（温度、tokens、上下文）
  - 支持场景选择和知识库绑定

- ✅ 对话管理系统
  - 会话列表和详情查看
  - 完整的对话记录
  - 支持会话搜索和过滤

- ✅ 用户管理系统
  - 用户注册和登录
  - JWT 认证
  - 角色权限管理

- ✅ 知识库管理
  - 知识库创建和管理
  - 文档上传和管理（待实现）

### 改进

- 🔧 修复数据库连接池初始化逻辑
- 🔧 优化 WebSocket 服务器启动流程
- 🔧 改进环境变量验证和错误提示
- 🔧 增强部署脚本的健壮性
- 🔧 优化数据库表结构

### 修复

- 🐛 修复 `getPool()` 重复初始化问题
- 🐛 修复所有 API 路由中的 `pool` 导入方式
- 🐛 修复生产环境部署时缺少环境变量的错误提示

### 技术栈

- Next.js 15.5.12 (App Router)
- React 19
- TypeScript 5
- Drizzle ORM 0.45.1
- PostgreSQL 18
- WebSocket (ws 库)
- shadcn/ui 组件库
- Tailwind CSS 3.4

## [1.0.0] - 2024-01-XX

### 新增

- ✅ 项目初始化
- ✅ 基础架构搭建
- ✅ Next.js 配置
- ✅ 数据库表结构设计
- ✅ 认证系统（JWT）
- ✅ 基础 UI 组件
- ✅ 激活码基础功能
- ✅ 机器人基础功能

---

## 即将发布

### 计划中的功能

- 📝 知识库文档上传功能
- 📝 知识库文档管理功能
- 📝 系统设置持久化
- 📝 日志远程调度功能
- 📝 多语言支持
- 📝 数据导入/导出功能

---

## 版本说明

### 版本号格式

- `MAJOR.MINOR.PATCH`
- `MAJOR`: 不兼容的 API 更改
- `MINOR`: 向后兼容的新功能
- `PATCH`: 向后兼容的 Bug 修复

### 更新类型

- `新增` - 新功能
- `改进` - 现有功能的改进
- `修复` - Bug 修复
- `删除` - 功能删除
- `安全` - 安全相关更改

---

## 链接

- [GitHub Releases](https://github.com/your-username/workbot/releases)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [API 文档](./API.md)
- [贡献指南](./CONTRIBUTING.md)
