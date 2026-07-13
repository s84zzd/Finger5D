# AGENTS.md — Finger5D 项目开发指南

本文档供 AI 编程助手阅读，用于快速了解项目架构、开发规范和关键实现细节。

---

## 1. 项目概述

**Finger5D**（芬格健康模型）是一个面向 50+ 人群的科学衰老科普平台，基于 **Next.js 16 App Router** 构建。平台整合了衰老科学前沿（Geroscience）研究成果，以 Finger5D 五维健康模型为框架，提供科学严谨、适老化、高可读性的抗衰老内容。

### 1.1 核心理念
- **目标用户**: 50+ 中老年人群
- **内容定位**: 科学严谨、适老化阅读、可执行建议
- **技术目标**: Making longevity science accessible（让学术突破触手可及）

### 1.2 五维分类系统（Finger5D）

| 维度 | Slug | 内容范围 |
|------|------|----------|
| **心血管与代谢** | `cardio` | 睡眠、炎症、代谢、血压、血糖 |
| **身体活动** | `physical` | 力量训练、平衡、肌肉衰减 |
| **认知活力** | `cognitive` | 记忆、注意力、学习、神经可塑性 |
| **健康饮食** | `nutrition` | 蛋白质、地中海饮食、抗炎饮食 |
| **社交与情绪** | `social` | 孤独、情绪能量、社交活动 |
| **科学前沿** | `frontier` | 跨维度前沿研究 |

---

## 2. 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16.1.6 (App Router) |
| **语言** | TypeScript 5.x |
| **样式** | Tailwind CSS 4.x + @tailwindcss/typography |
| **字体** | Geist (Sans + Mono) via next/font/google |
| **UI 组件** | Lucide React (Icons) |
| **内容** | MDX (next-mdx-remote) + gray-matter |
| **构建** | Next.js Build (SSG/SSR 混合) |
| **部署** | Vercel (推荐) 或本地 LAN 部署 |

---

## 3. 项目结构

```
/src
  /app                          # Next.js App Router 路由
    /page.tsx                   # 首页
    /layout.tsx                 # 根布局（含字体、全局 Provider）
    /globals.css                # 全局样式 + Tailwind 配置
    /articles/page.tsx          # 文章列表页
    /articles/[slug]/page.tsx   # 文章详情页（MDX 渲染）
    /articles/[slug]/opengraph-image.tsx  # OG 图片生成
    /category/[slug]/page.tsx   # 五维分类页
    /frontiers/page.tsx         # 科学前沿列表
    /assessment/page.tsx        # 轻量评估（5题问卷）
    /assessment/result/page.tsx # 评估结果页
    /about/page.tsx             # 关于我们
    /admin/page.tsx             # 管理后台主页（运营看板）
    /admin/login/page.tsx       # 后台登录页
    /admin/drafts/page.tsx      # 草稿列表
    /api                        # API 路由
      /api/health               # 健康检查
      /api/admin/*              # 后台管理 API（见下方）
  
  /components                   # React 组件
    /Navbar.tsx                 # 导航栏（含适老化 A+ 按钮）
    /Footer.tsx                 # 页脚
    /ArticleCard.tsx            # 文章卡片
    /ArticleList.tsx            # 文章列表
    /MDXRenderer.tsx            # MDX 渲染器（含自定义组件）
    /Citation.tsx               # 引用组件
    /Tag.tsx                    # 标签组件
    /CategoryGrid.tsx           # 五维分类网格
    /AssessmentForm.tsx         # 评估表单
    /AssessmentResultCard.tsx   # 评估结果卡片
    /AccessibilityProvider.tsx  # 可访问性上下文（字体大小）
    /AdminLoginForm.tsx         # 后台登录表单
    /AdminWorkflowPanel.tsx     # 后台工作流面板
  
  /content                      # 内容文件（MDX）
    /articles/*.mdx             # 已发布文章
    /drafts/*.mdx               # 导出草稿（不发布）
  
  /lib                          # 工具库
    /mdx.ts                     # MDX 文件读取工具
    /admin-types.ts             # 后台类型定义
    /admin-auth.ts              # 后台认证逻辑
    /admin-workflow.ts          # 工作流核心逻辑（草稿生成等）
    /core-summary-prompts.ts    # 核心摘要生成提示词
    /pubmed-config.ts           # PubMed 配置
  
  /data                         # 数据存储（JSON/本地文件）
    /admin-workflow.json        # 工作流状态（任务、论文库等）
    /paper-library/             # 下载的论文摘要/全文

/docs                           # 项目文档
  /DRAFT-GENERATION.md          # 草稿生成流程与模板说明
  /DRAFT-GENERATION-FLOW.md     # 草稿生成现有逻辑详细说明

/scripts                        # 工具脚本
  /print-lan-url.mjs            # 打印局域网访问地址

/public                         # 静态资源
  /images/                      # 图片资源
```

---

## 4. 开发命令

```bash
# 开发模式
npm run dev              # 默认端口 3000
npm run dev:3001         # 端口 3001（备用）
npm run dev:3010         # 端口 3010（备用）

# 生产构建与启动
npm run build            # 构建生产版本
npm run start            # 启动生产服务器（需先 build）
npm run start:3001       # 端口 3001
npm run start:3010       # 端口 3010

# 代码检查
npm run lint             # ESLint 检查

# 局域网部署（LAN）
npm run lan:url          # 查看本机局域网 IP
npm run lan:dev          # 开发模式监听 0.0.0.0
npm run lan:start        # 生产模式监听 0.0.0.0
npm run lan:prod         # 构建 + 启动生产（一次性）
```

---

## 5. 代码风格规范

### 5.1 TypeScript 规范
- 严格模式启用 (`"strict": true`)
- 所有函数参数和返回值显式标注类型
- 使用 `interface` 定义对象类型
- 使用 `const` + `as const` 定义常量数组

### 5.2 React 组件规范
- 使用函数组件 + Hooks
- Props 类型显式定义
- 客户端组件使用 `"use client"` 指令
- 服务端组件（默认）直接获取数据

### 5.3 样式规范
- 优先使用 Tailwind CSS 工具类
- 颜色使用 Slate 色系为主
- 品牌色：`--color-brand-primary: #1e3a8a` (Blue 900)
- 强调色：`--color-brand-accent: #f97316` (Orange 500)

### 5.4 文件命名
- 组件文件：PascalCase（如 `Navbar.tsx`）
- 工具文件：camelCase（如 `admin-auth.ts`）
- 路由文件：`page.tsx`, `layout.tsx`, `route.ts`

### 5.5 导入规范
- 使用 `@/` 别名指向 `src/` 目录
- 第三方库优先，内部模块次之
- 类型导入使用 `import type`

---

## 6. 内容管理（MDX）

### 6.1 Frontmatter 格式
每篇 MDX 文章必须包含以下元数据：

```yaml
---
title: "文章标题"
date: "YYYY-MM-DD"
category: "cardio | physical | cognitive | nutrition | social | frontier"
tags: ["tag1", "tag2"]
summary: "文章摘要"
readingTime: "5 min"
---
```

### 6.2 MDX 可用组件
- `<Callout type="info|warning|tip">` - 提示框
- `<Citation title="..." authors="..." journal="..." year="..." url="..." />` - 引用
- `<Tag label="..." href="..." />` - 标签
- 外部链接自动添加 `target="_blank"`

### 6.3 内容位置
- 已发布：`src/content/articles/*.mdx`
- 草稿：`src/content/drafts/*.mdx`

---

## 7. 后台管理系统

### 7.1 角色分工
- **规划管理员**：设定月度目标、维护周槽主题
- **论文检索编辑**：执行论文检索、筛选候选论文
- **草稿审议与发布编辑**：审议 AI 草稿、执行发布/导出

### 7.2 环境变量配置
```bash
# 认证（必须配置，否则后台不可用）
ADMIN_TOKEN=your_admin_token
ADMIN_USERS=planner:password1,retriever:password2,publisher:password3
# 或 JSON 格式（优先）
ADMIN_USERS_JSON=[{"username":"...","password":"..."}]

# LLM 配置（用于草稿生成）
LLM_PROVIDER=deepseek  # 或 openai
DEEPSEEK_API_KEY=your_key
DEEPSEEK_MODEL=deepseek-chat
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4.1-mini

# 论文库外部连接器（可选）
WOS_API_ENDPOINT=...
WOS_API_KEY=...
WANFANG_API_ENDPOINT=...
WANFANG_API_KEY=...
CNKI_API_ENDPOINT=...
CNKI_API_KEY=...
```

### 7.3 核心 API 路由
- `GET/POST /api/admin/plan` - 任务计划
- `GET/POST /api/admin/paper-library` - 论文库
- `POST /api/admin/task/[id]/generate` - 生成草稿
- `POST /api/admin/task/[id]/publish` - 发布文章
- `POST /api/admin/task/[id]/export` - 导出草稿
- `GET/POST /api/admin/monthly-plan` - 月度规划

### 7.4 草稿生成流程
1. 从论文库选取论文
2. 选择「写作模板」（5种文风）和「研究类型模板」（8种方法学或自动识别）
3. 系统读取论文全文（如有下载）或摘要
4. 自动识别研究类型（规则+LLM）
5. 拼装提示词调用 LLM 生成 MDX
6. 写回任务状态，标记论文已采纳

详细流程见 `docs/DRAFT-GENERATION.md` 和 `docs/DRAFT-GENERATION-FLOW.md`。

---

## 8. 可访问性（Accessibility）

### 8.1 适老化设计
- **正文字号**: 18px（基础），22px（A+ 模式）
- **行高**: 1.8
- **对比度**: WCAG AAA 高对比度
- **一键放大**: 导航栏提供 A+ 按钮切换

### 8.2 实现方式
- 使用 `AccessibilityProvider` Context 管理状态
- CSS 变量 `--font-size-base` 和 `.text-enlarged` 类
- 字体使用 Geist（清晰易读）

---

## 9. 部署与安全

### 9.1 Vercel 部署（推荐）
```bash
npm run build
# 或使用 Vercel CLI
vercel --prod
```

### 9.2 局域网部署（LAN）
适用于公司/家庭内网环境：
```bash
npm run build
npm run lan:url    # 查看可访问地址
npm run lan:start  # 启动服务
```

### 9.3 安全注意事项
- **必须配置** `ADMIN_USERS` 或 `ADMIN_TOKEN`，否则后台接口返回 503
- `.env.local` 包含敏感信息，**不要提交到 Git**
- Windows 防火墙需放行 3000/TCP（如局域网无法访问）
- 内网部署建议关闭服务器自动睡眠

---

## 10. 开发注意事项

### 10.1 新增文章
1. 在 `src/content/articles/` 创建 `.mdx` 文件
2. 填写完整 Frontmatter
3. 使用 MDX 组件增强可读性
4. 运行 `npm run lint && npm run build` 验证

### 10.2 修改后台逻辑
- 类型定义：`src/lib/admin-types.ts`
- 业务逻辑：`src/lib/admin-workflow.ts`
- API 路由：`src/app/api/admin/*/route.ts`
- 更新后检查 `docs/` 文档是否需要同步

### 10.3 调试 LLM 生成
- 未配置 API Key 时会自动使用内置模板兜底
- 查看任务操作日志了解生成过程
- 论文库需先「下载全文」才能基于全文生成

### 10.4 端口冲突处理
若 3000 端口被占用：
```bash
npm run dev:3001    # 使用 3001 端口开发
npm run start:3001  # 使用 3001 端口启动生产
```

---

## 11. 相关文档索引

| 文档 | 位置 | 内容 |
|------|------|------|
| 项目说明 | `README.md` | 完整功能说明、部署指南、SOP |
| 草稿生成流程 | `docs/DRAFT-GENERATION.md` | 模板系统、研究类型、生成流程 |
| 草稿生成逻辑 | `docs/DRAFT-GENERATION-FLOW.md` | 调用链与数据流详细说明 |
| 环境变量示例 | `.env.example` | 配置项说明 |
| Lint 输出 | `lint_output.txt` | 代码检查快照 |

---

## 12. 快速检查清单

修改代码前确认：
- [ ] 是否遵循现有文件命名规范？
- [ ] TypeScript 类型是否完整？
- [ ] 客户端组件是否添加 `"use client"`？
- [ ] 样式是否优先使用 Tailwind 工具类？
- [ ] 新文章 Frontmatter 是否完整？
- [ ] 后台相关修改是否更新 `docs/` 文档？

提交前运行：
```bash
npm run lint
npm run build
```
