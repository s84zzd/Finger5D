# 管理后台改进计划

> 日期：2026-07-13
> 状态：实施中

## 背景

Finger5D 管理后台当前是一个基于论文驱动的 AI 内容生产流水线。需要将其升级为"内容补充平台"，并增加 AI 选题发现能力。

## 当前系统痛点

| 维度 | 现状 | 问题 |
|------|------|------|
| 定位 | 纯内容生产工具 | 缺乏"文章补充平台"属性 |
| 论文搜索 | 子串匹配 + 简单相关性打分 | 无语义理解，召回质量低 |
| 选题发现 | 人工输入主题关键词 | 无 AI 辅助发现热点趋势 |
| 文章管理 | 只有"发布"按钮 | 发布后无法编辑/预览/管理 |

## 改进方案（4 个模块）

### 模块 A：文章管理中心（P0 - 先实施）

将后台从"生产工具"升级为"内容补充平台"。

#### A1. 文章管理 API
- `GET /api/admin/articles` — 列出所有已发布 MDX 文章
- `GET /api/admin/articles/[slug]` — 获取单篇文章完整内容
- `PATCH /api/admin/articles/[slug]` — 更新文章
- `DELETE /api/admin/articles/[slug]` — 删除文章

#### A2. 文章管理 UI
- 新增 `articles` 模块（与 planning/execution/library/settings 并列）
- 文章列表：标题、分类、日期、字数、来源论文
- 筛选：按分类/标签/日期
- 操作：编辑、下架、删除

#### A3. MDX 预览面板
- 使用 `MDXRenderer` 组件直接渲染文章
- 可展开/收起的预览面板
- 样式与前台一致

#### A4. 文章编辑器
- 左右分栏：源码编辑 + 实时预览
- 可编辑 frontmatter 和 MDX 正文
- 保存后写入 MDX 文件

### 模块 B：论文搜索优化（P2）

#### B1. 相关性打分升级
- title 匹配 ×3、abstract ×2、journal ×1
- 排除英文停用词

#### B2. PubMed OA 全文自动获取
- 通过 PubMed Central API 检查 OA 可用性

#### B3. 搜索结果增强
- Crossref 引用次数、期刊影响因子

### 模块 C：AI 热点选题助手（P1）

用 AI 网络搜索（Tavily）发现衰老领域最新研究趋势。

#### C1. Tavily 集成
- 环境变量：`TAVILY_API_KEY`
- 封装搜索函数

#### C2. 选题搜索 API
- `POST /api/admin/trending/search` — 执行搜索 + LLM 分析

#### C3. 选题库管理
- `GET/POST/DELETE /api/admin/trending/topics`
- `POST /api/admin/trending/topics/[id]/create-task`

#### C4. 选题 UI 模块
- 搜索面板 + 选题卡片流 + 选题库

### 模块 D：仪表盘 + 导航调整（P3）

- 导航重排：主页 | 选题 | 规划 | 执行 | 论文库 | 文章库 | 设置
- 仪表盘新增选题统计、论文利用率
- 规划模块联动选题库

## 实施顺序

1. **Phase A**：文章管理中心（API + UI + 预览 + 编辑器）
2. **Phase C**：AI 热点选题（Tavily + LLM 分析 + 选题库）
3. **Phase B**：论文搜索优化（打分 + OA 全文 + 引用次数）
4. **Phase D**：仪表盘 + 导航调整

## 技术决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| Web Search API | Tavily | 专为 AI 设计，结构化结果，免费额度 |
| MDX 预览方式 | 独立预览面板 | 使用 MDXRenderer，与前台样式一致 |
| 实施顺序 | 先 A 后 C | 先落地平台定位，再加新功能 |
