# WorkBot 管理后台使用指南

## 概述

WorkBot 管理后台提供了一个统一的界面，用于管理和监控 WorkBot 系统。

## 访问地址

- **管理后台首页**: http://localhost:5000/admin
- **错误监控页面**: http://localhost:5000/admin/errors

## 功能模块

### 1. 错误监控 (`/admin/errors`)

实时查看和分析系统错误日志。

#### 功能特性
- ✅ 实时错误列表
- ✅ 错误级别分类（error、warn、info）
- ✅ 错误详情查看（堆栈跟踪、上下文信息）
- ✅ 自动刷新（每 30 秒）
- ✅ 统计信息展示

#### 使用方法
1. 访问 http://localhost:5000/admin/errors
2. 查看最近的错误日志
3. 点击错误条目查看详细信息
4. 点击右上角"刷新"按钮手动刷新

#### 错误级别说明
- **ERROR** (红色): 严重错误，需要立即处理
- **WARN** (黄色): 警告信息，需要注意
- **INFO** (蓝色): 一般信息

### 2. 管理后台首页 (`/admin`)

管理后台的导航中心，提供各个功能模块的快速访问。

#### 可用模块
- 错误监控: 查看和分析系统错误日志
- 激活码管理: 管理和生成激活码
- 机器人管理: 配置和管理机器人
- 用户管理: 查看和管理用户账户
- 对话管理: 查看和管理对话记录
- 系统设置: 配置系统参数和选项

#### 系统状态
- API 服务: 显示 API 服务运行状态
- 数据库连接: 显示数据库连接状态
- WebSocket 服务: 显示 WebSocket 服务状态

## API 接口

### 获取错误日志

**请求**:
```http
GET /api/admin/errors?limit=100
```

**参数**:
- `limit`: 返回的错误数量（可选，默认 100）

**响应**:
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "id": "uuid",
        "level": "error",
        "message": "错误消息",
        "stack": "堆栈跟踪",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "context": {
          "key": "value"
        }
      }
    ],
    "total": 1
  }
}
```

## 权限要求

目前管理后台不需要特殊权限，任何登录用户都可以访问。

未来版本可能会添加权限控制：
- 管理员: 可以访问所有功能
- 普通用户: 只能查看部分信息

## 开发说明

### 添加新的管理页面

1. 在 `src/app/admin/` 下创建新页面目录
2. 创建 `page.tsx` 文件
3. 添加必要的组件和样式
4. 在首页 `/admin/page.tsx` 中添加导航卡片

示例：
```typescript
// src/app/admin/feature/page.tsx
export default function FeaturePage() {
  return (
    <div>
      <h1>功能页面</h1>
    </div>
  );
}
```

### 创建 API 路由

在 `src/app/api/admin/` 下创建 API 路由：

```typescript
// src/app/api/admin/feature/route.ts
export async function GET(request: NextRequest) {
  // 处理请求
  return NextResponse.json({ success: true, data: {} });
}
```

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI 组件**: shadcn/ui
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **状态管理**: React Hooks

## 性能优化

1. **自动刷新**: 每 30 秒自动刷新错误列表
2. **懒加载**: 错误详情按需加载
3. **缓存**: API 响应缓存
4. **分页**: 大量数据时使用分页

## 常见问题

### Q: 为什么看不到错误？

A: 如果系统运行正常，错误列表可能为空。这是正常的。

### Q: 错误列表多久刷新一次？

A: 自动每 30 秒刷新一次，也可以手动点击刷新按钮。

### Q: WebSocket 服务显示"开发模式不可用"是什么意思？

A: 在开发模式下，WebSocket 功能不可用。在生产环境中会正常工作。

### Q: 如何查看更多错误？

A: 点击刷新按钮或等待自动刷新。API 默认返回最近 100 条错误。

## 后续计划

- [ ] 添加错误过滤和搜索功能
- [ ] 添加错误导出功能
- [ ] 添加错误统计图表
- [ ] 添加实时告警功能
- [ ] 添加权限控制
- [ ] 添加操作日志

## 相关文档

- [服务稳定性优化方案](./SERVICE_STABILITY.md)
- [开发模式修复](./DEV_MODE_FIX.md)
- [故障排查指南](./TROUBLESHOOTING.md)

## 支持

如果遇到问题或有建议，请：
1. 查看本文档
2. 检查系统日志
3. 联系技术支持
