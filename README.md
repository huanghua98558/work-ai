# WorkBot 企业微信机器人管理系统

> 基于 Next.js 16 + 扣子云平台的企业微信机器人管理系统

---

## 📖 项目文档

完整的技术文档请查看 `docs/` 目录：

- **主要文档**：[docs/workbot_final_requirements_v2.md](docs/workbot_final_requirements_v2.md)
- **版本对比**：[docs/workbot_version_comparison.md](docs/workbot_version_comparison.md)
- **文档说明**：[docs/README.md](docs/README.md)

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
