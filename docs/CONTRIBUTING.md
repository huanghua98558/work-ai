# WorkBot 贡献指南

感谢你对 WorkBot 项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请：

1. 检查 [Issues](https://github.com/your-username/workbot/issues) 是否已有相同问题
2. 如果没有，创建新的 Issue，包含：
   - 清晰的标题
   - 详细的问题描述
   - 重现步骤
   - 预期行为
   - 实际行为
   - 环境信息（操作系统、Node.js 版本等）
   - 错误日志或截图

### 提出新功能

如果你有新功能的想法，请：

1. 检查 [Issues](https://github.com/your-username/workbot/issues) 是否已有类似建议
2. 如果没有，创建新的 Issue，包含：
   - 清晰的功能描述
   - 使用场景
   - 预期效果
   - 可能的实现方案

### 提交代码

#### 开发流程

1. **Fork 项目**

   点击 GitHub 仓库右上角的 "Fork" 按钮。

2. **克隆你的 Fork**

   ```bash
   git clone https://github.com/your-username/workbot.git
   cd workbot
   ```

3. **添加上游仓库**

   ```bash
   git remote add upstream https://github.com/original-username/workbot.git
   ```

4. **创建功能分支**

   ```bash
   git checkout -b feature/your-feature-name
   ```

   分支命名规范：
   - `feature/xxx` - 新功能
   - `fix/xxx` - 修复 Bug
   - `docs/xxx` - 文档更新
   - `refactor/xxx` - 代码重构
   - `test/xxx` - 测试相关

5. **进行开发**

   遵循代码规范，编写清晰的代码。

6. **测试你的更改**

   ```bash
   # 安装依赖
   pnpm install

   # 运行开发服务器
   pnpm dev

   # 运行类型检查
   pnpm run check-types

   # 运行代码检查
   pnpm lint
   ```

7. **提交更改**

   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

   Commit 消息规范（遵循 [Conventional Commits](https://www.conventionalcommits.org/)）：

   - `feat:` - 新功能
   - `fix:` - 修复 Bug
   - `docs:` - 文档更新
   - `style:` - 代码格式调整
   - `refactor:` - 代码重构
   - `perf:` - 性能优化
   - `test:` - 测试相关
   - `chore:` - 构建/工具链相关

8. **同步上游代码**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

9. **推送到你的 Fork**

   ```bash
   git push origin feature/your-feature-name
   ```

10. **创建 Pull Request**

    - 访问你的 GitHub 仓库
    - 点击 "New Pull Request"
    - 选择你的分支
    - 填写 PR 描述：
      - 清晰的标题（使用与 commit 相同的格式）
      - 详细的描述
      - 关联的 Issue
      - 截图或演示（如果适用）

## 代码规范

### TypeScript

- 使用 TypeScript 类型
- 避免使用 `any`
- 使用接口定义数据结构
- 添加适当的注释

### React/Next.js

- 使用函数组件
- 使用 Hooks
- 避免不必要的重新渲染
- 使用 `useMemo` 和 `useCallback` 优化性能
- 保持组件简洁和单一职责

### 命名规范

- **文件名**: kebab-case（如 `user-profile.tsx`）
- **组件名**: PascalCase（如 `UserProfile`）
- **变量/函数**: camelCase（如 `userName`）
- **常量**: UPPER_SNAKE_CASE（如 `API_BASE_URL`）
- **类型/接口**: PascalCase（如 `UserType`）

### 样式

- 使用 Tailwind CSS
- 保持样式一致性
- 避免内联样式
- 使用 shadcn/ui 组件

### 注释

- 复杂逻辑必须添加注释
- 使用清晰的变量名减少注释需求
- 函数应该有 JSDoc 注释

```typescript
/**
 * 用户登录
 * @param phone 手机号
 * @param password 密码
 * @returns 包含 token 和用户信息的对象
 */
async function login(phone: string, password: string) {
  // 实现逻辑
}
```

## 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API 路由
│   ├── pages/          # 页面组件
│   └── layout/         # 布局组件
├── components/         # React 组件
│   ├── ui/            # shadcn/ui 组件
│   └── layout/        # 布局组件
├── lib/               # 工具库
│   ├── db.ts          # 数据库相关
│   ├── auth.ts        # 认证相关
│   └── utils.ts       # 通用工具
└── storage/           # 数据存储
```

## 测试

### 单元测试

```bash
pnpm test
```

### 集成测试

```bash
pnpm test:integration
```

### E2E 测试

```bash
pnpm test:e2e
```

## 文档

### 更新文档

当你添加新功能或修改现有功能时，请同时更新相关文档：

- [README.md](../README.md) - 项目说明
- [docs/API.md](./API.md) - API 文档
- [docs/DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南

### 文档规范

- 使用 Markdown 格式
- 提供清晰的示例
- 保持文档简洁和准确
- 添加必要的截图

## 代码审查

### Pull Request 要求

- 所有 CI 检查必须通过
- 至少一个维护者批准
- 解决所有请求的更改
- 遵循代码规范

### 审查准则

- 代码质量和可读性
- 是否符合项目规范
- 是否有充分的测试
- 是否有足够的文档
- 是否有潜在的安全问题

## 发布流程

### 版本号

遵循 [Semantic Versioning](https://semver.org/)：

- `MAJOR.MINOR.PATCH`
- `MAJOR`: 不兼容的 API 更改
- `MINOR`: 向后兼容的新功能
- `PATCH`: 向后兼容的 Bug 修复

### 发布步骤

1. 更新版本号（在 `package.json` 中）
2. 更新 CHANGELOG.md
3. 创建 Git tag
4. 推送 tag
5. 自动构建和发布

## 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺：

- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 人身攻击或侮辱性言论
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他不专业或不适当的行为

## 社区

- GitHub Issues: 报告问题和讨论
- GitHub Discussions: 功能讨论和问答
- Pull Requests: 代码贡献

## 许可证

通过贡献代码，你同意你的代码将在项目的 [MIT License](../LICENSE) 下发布。

## 联系方式

如果你有任何问题，可以通过以下方式联系我们：

- GitHub Issues
- Email: your-email@example.com

---

再次感谢你的贡献！
