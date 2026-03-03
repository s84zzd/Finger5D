# Finger5D — 科学衰老科普平台

基于 **芬格健康模型 (Finger5D)** 与 **衰老科学前沿 (Geroscience)** 的工程化科普平台。
目标用户为 50+ 人群，提供科学严谨、适老化、高可读性的抗衰老内容。

> **核心理念**: Making longevity science accessible（让学术突破触手可及）

## ✨ 项目亮点 (Highlights)
*   **现代化架构**: 基于 Next.js 14 App Router 的高性能内容平台。
*   **科学内容体系**: 使用 MDX 构建可扩展的科普文章系统。
*   **Finger5D 五维分类**: 完整覆盖心血管、运动、认知、营养、社交五大维度。
*   **轻量评估引擎**: 内置隐私优先的客户端评估模块 (Assessment Engine)。
*   **适老化设计**: 
    *   18–20px 正文字号
    *   WCAG AAA 高对比度
    *   一键字号放大 (A+)
*   **未来扩展**: AI Agent、推荐系统、用户系统接口预留。

## 📐 技术栈 (Tech Stack)
*   [Next.js 16](https://nextjs.org) (App Router)
*   [Tailwind CSS](https://tailwindcss.com) (Custom Design System)
*   [MDX](https://mdxjs.com) (Markdown + React Components)
*   [Lucide React](https://lucide.dev) (Icons)
*   [Vercel](https://vercel.com) (Deployment)

## 📁 项目结构 (Project Structure)
```text
/src
  /app
    /page.tsx                     # 首页
    /articles/page.tsx            # 文章列表
    /articles/[slug]/page.tsx     # 文章详情
    /category/[slug]/page.tsx     # 五维分类页
    /frontiers/page.tsx           # 前沿科学
    /assessment/page.tsx          # 轻量评估
    /assessment/result/page.tsx   # 评估结果
    /about/page.tsx               # 关于我们

  /components
    Navbar.tsx
    Footer.tsx
    ArticleCard.tsx
    MDXRenderer.tsx
    Citation.tsx
    Tag.tsx
    AssessmentForm.tsx (Planned)
    AssessmentResultCard.tsx (Planned)

  /content
    /articles/*.mdx
    /frontiers/*.mdx
    /categories/*.mdx

  /lib
    mdx.ts
    getArticles.ts
    getFrontmatter.ts
```

## 🧠 内容模型 (MDX Frontmatter)
每篇文章必须包含以下元数据：
```yaml
---
title: "Article Title"
date: "YYYY-MM-DD"
category: "cardio | physical | cognitive | nutrition | social | frontier"
tags: ["tag1", "tag2"]
summary: "Brief summary"
readingTime: "5 min"
---
```

## 🧭 Finger5D 五维分类系统
| 维度 | Slug | 内容类型 |
|Data|------|----------|
| **心血管与代谢** | `cardio` | 睡眠、炎症、代谢、血压、血糖 |
| **身体活动** | `physical` | 力量训练、平衡、肌肉衰减 |
| **认知活力** | `cognitive` | 记忆、注意力、学习、神经可塑性 |
| **健康饮食** | `nutrition` | 蛋白质、地中海饮食、抗炎饮食 |
| **社交与情绪** | `social` | 孤独、情绪能量、社交活动 |

## 📝 轻量评估模块 (Assessment Engine)
*   **入口**: `/assessment`
*   **实现**: 客户端计算（隐私数据不上传），基于 Zustand 或 URL Search Params。
*   **功能**: 五维雷达图打分 + 个性化文章推荐。

## 🚀 开发与部署
### 安装 (Installation)
```bash
npm install
npm run dev
# 访问 http://localhost:3000
```

### 部署 (Deployment)
推荐使用 Vercel，自动支持 SSR/SSG 和 Edge Functions。

### 端口冲突快速处理（Windows）
当 `npm run dev` 或 `npm run start` 报错 `EADDRINUSE`（端口被占用）时，可直接使用备用脚本：

```bash
# 开发模式
npm run dev:3001
npm run dev:3010

# 生产模式（需先 build）
npm run start:3001
npm run start:3010
```

也可使用原生命令临时指定端口：

```bash
npm run start -- -p 3001
npm run dev -- -p 3010
```

### 局域网运营部署（LAN）
适用于公司/家庭内网环境，服务器与访问终端在同一局域网。

1. **首次准备**
```bash
npm install
npm run build
```

2. **查看可访问内网地址**
```bash
npm run lan:url
```

3. **以内网模式启动（生产）**
```bash
npm run lan:start
# 或一次完成构建+启动
npm run lan:prod
```

4. **其他终端访问**
*   使用 `http://<服务器内网IP>:3000` 访问站点。
*   健康检查地址：`http://<服务器内网IP>:3000/api/health`。

5. **Windows 防火墙（如无法访问）**
*   放行 `3000/TCP` 入站端口。
*   允许 Node.js 在专用网络通信。

6. **后台最小安全建议（内网也建议开启）**
*   在 `.env.local` 配置个人账号（`ADMIN_USERS` 或 `ADMIN_USERS_JSON`）。
*   仅在可信局域网内开放访问，避免端口映射到公网。

#### 运行模式：当前电脑做服务器，其他电脑做终端

**A. 服务器端（当前这台电脑）**
1. 打开项目目录：`E:\ZenDev\Finger5D`
2. 安装并构建：
```bash
npm install
npm run build
```
3. 查看本机局域网地址：
```bash
npm run lan:url
```
4. 启动服务（保持窗口不要关闭）：
```bash
npm run lan:start
```

**B. 终端端（局域网内其他电脑）**
1. 打开浏览器访问：`http://<服务器IP>:3000`
2. 后台访问：`http://<服务器IP>:3000/admin`
3. 健康检查：`http://<服务器IP>:3000/api/health`

**C. 稳定运行建议**
*   建议给服务器电脑设置固定内网 IP（避免重启后地址变化）。
*   Windows 防火墙放行 `3000/TCP` 入站规则。
*   服务器电脑进入睡眠会导致终端不可访问，建议关闭自动睡眠。

## 🔧 最近修复（2026-03-02）
*   修复可访问性状态初始化逻辑，移除 effect 内同步 `setState`，避免级联渲染风险。
*   将文档语言标记调整为中文（`zh-CN`），提升 SEO 与读屏语义一致性。
*   加固评估结果参数解析：支持数组参数，防止 `NaN`，并将分值限制在 `0-5`。
*   导航栏搜索与移动端菜单由占位改为最小可用功能（可跳转 / 可展开）。
*   刷新 `lint_output.txt`，使仓库内 lint 快照与当前代码一致。

## ✅ 验证命令
```bash
npm run lint
npm run build
```

最近一次本地验证结果：以上命令均通过。

## 🗺️ 下一步计划（Roadmap）
*   **搜索体验升级**：从“跳转文章列表”升级为站内关键词搜索（标题/摘要/标签）。
*   **移动端导航完善**：补充打开/关闭动效与焦点管理，优化键盘可访问性。
*   **评估结果可视化**：在结果页增加五维分数图（保持本地计算，不上传隐私数据）。
*   **内容生产工具化**：补充 MDX 模板与 Frontmatter 校验脚本，降低发布错误率。
*   **质量门禁自动化**：接入 CI，在 PR 中自动执行 `lint + build`。

## 🛠 内容管理后台（Admin）
### 入口
*   路由：`/admin`
*   后台采用“主页 + 模块入口”方式：先在主页选择模块，再进入子模块操作（规划 / 执行 / 论文库 / 设置）。
*   后台主页提供运营看板：展示上周/上月运营数据、本周/本月计划进度、执行中任务列表。
*   运营看板支持点击跳转：可从“执行中任务”一键跳转到执行模块，并自动按“执行中”状态筛选。

### 角色分工（3 人）
*   **规划管理员（1 人）**：设定月度目标、维护周槽主题、审核发布节奏。
*   **论文检索编辑（1 人）**：根据主题执行论文检索、筛选并确定候选论文。
*   **草稿审议与发布编辑（1 人）**：审议 AI 草稿质量，执行发布或导出。
*   **读者浏览人员（多人）**：仅访问前台内容页面，不进入后台运营流程。

### 产能目标（可配置）
*   后台可设置“每周任务目标”（按 5 的倍数，如 `5`、`10`、`15`）。
*   默认目标为 **10 篇/周**，月度目标按 `周目标 × 4` 自动计算（默认 **40 篇/月**）。

### 标准工作流（SOP）
1. **月初规划**
  *   创建当月月历规划，填写 4 个周槽主题。
  *   支持“按主题展开 4 周”：输入单一主题主线（如睡眠与衰老）后自动生成 4 周递进周槽。
  *   可一键切换周槽预设模板（基础版 / 强执行版）快速覆盖 Week 1-4。
  *   支持“自定义模板另存为”，保存后可在后续月份一键复用。
  *   使用“预生成前预览”查看将新增的周与任务数量。
  *   二次确认后执行“预生成当月任务（按当前月目标）”。
2. **每周启动**
  *   点击“同步本周规划（按当前周目标）”，确保本周任务完整。
  *   将“当周周槽”批量应用到本周任务主题。
  *   创建/更新周实施白板，并导入本周任务到检索框。
3. **任务执行（每篇）**
  *   编辑主题与规划说明。
  *   执行“从论文库选取”并选择论文（执行模块仅从论文库选稿，不对外部检索）。
  *   执行“生成草稿”，进入人工审议（可先修改草稿再审核）。草稿生成依赖**写作模板**（文风）与**研究类型模板**（证据类型），流程较复杂，详见 [草稿生成流程与模板](docs/DRAFT-GENERATION.md)。
  *   审核通过后：发布到文章库，或导出到草稿目录（不发布）。
  *   系统会在任务“操作日志”中记录完整链路的操作人用户名与时间。

### 论文库（预检索）
*   可按“主题关键词 + 维度”提前检索并入库，形成可复用论文池。
*   来源支持 Crossref、OpenAlex、PubMed、Web of Science、万方、知网（可在设置模块白名单勾选）。
*   Web of Science / 万方 / 知网通过外部连接器接入，需在环境变量配置对应 Endpoint 与 API Key（`WOS_API_ENDPOINT`、`WOS_API_KEY`、`WANFANG_API_ENDPOINT`、`WANFANG_API_KEY`、`CNKI_API_ENDPOINT`、`CNKI_API_KEY`）。
*   维度支持“其他（不限范围）”，检索时不按五维限定，主要依据关键词匹配。
*   支持下载“摘要（含中文翻译）”到本地目录（`src/data/paper-library/`），用于轻量审稿与选题。
*   下载摘要后可在论文库列表点击“本页查看摘要”，直接在当前页面展开阅读。
*   同时保留“下载原文”按钮，按需拉取 PDF/网页全文到本地目录。
*   支持设置“主下载按钮”模式（默认摘要），并可批量导出当前列表前 N 篇摘要。
*   批量导出支持“仅导出未导出过摘要”选项，减少重复下载。
*   支持在论文列表中勾选条目并“导出选中摘要”，实现选择性批量导出。
*   支持为单篇论文持续添加关键词标签（如“衰老”“睡眠”），并可按关键词筛选论文列表。
*   支持“批量给当前筛选结果加关键词”，便于快速统一打标。
*   后续任务执行“检索论文”时会优先调用论文库，并继续执行去重过滤。
4. **周末复盘**
  *   更新白板：本周亮点、阻塞、下周行动。
  *   检查周目标达成（当前周目标）与月目标进度（当前周目标 × 4）。

### 防误触机制
*   月度预生成采用两步：**先预览（周明细 + 新增数量）→ 再确认执行**。
*   若本月任务已齐，确认按钮会被禁用并提示无需新增。

### 运营看板口径（周会版）
> 统计周期默认按自然周（`weekKey`）聚合，月度按自然月（`monthKey`）汇总。

| 指标 | 口径定义 | 计算公式 | 目标值（建议） |
|------|----------|----------|----------------|
| 本周计划量 | 本周应完成任务数 | `weeklyTaskTarget` | 与配置一致 |
| 本周发布量 | 本周状态为 `published` 的任务数 | `count(status="published")` | `>= weeklyTaskTarget` |
| 本周完成率 | 本周发布达成程度 | `本周发布量 / weeklyTaskTarget` | `>= 100%` |
| 月度累计发布量 | 当月已发布任务数 | `count(monthKey 当月且 status="published")` | `>= weeklyTaskTarget × 4` |
| 月度进度率 | 月目标达成程度 | `月度累计发布量 / (weeklyTaskTarget × 4)` | 按周递增 |
| 审核通过率 | 进入审核后通过比例 | `审核通过数 / (审核通过数 + 驳回数)` | `>= 80%` |
| 驳回率 | 审核被驳回比例 | `驳回数 / (审核通过数 + 驳回数)` | `<= 20%` |
| 草稿产出率 | 已选论文后成功生成草稿比例 | `drafted 数 / paper_selected 数` | `>= 95%` |
| 发布转化率 | 已生成草稿到最终发布转化 | `published 数 / drafted 数` | `>= 85%` |
| 导出替代率 | 不发布而导出草稿占比 | `export 数 / approved 数` | 跟踪观察 |

#### 数据来源映射
*   任务状态来源：`WorkflowTask.status`（`planned/paper_selected/drafted/approved/rejected/published`）。
*   周维度来源：`WorkflowTask.weekKey`。
*   月维度来源：`WorkflowTask.createdAt`（或月度规划 `monthKey` 作为辅助核对）。
*   复盘补充来源：`WeeklyReview`（亮点、阻塞、下周行动）。

#### 周会复盘顺序（建议 15 分钟）
1. 先看产能：本周发布量、完成率、月度进度率。
2. 再看质量：审核通过率、驳回率。
3. 再看效率：草稿产出率、发布转化率。
4. 最后看阻塞：结合周白板输出下周行动与责任人。

#### 异常阈值（建议告警）
*   连续 2 周完成率 `< 80%`：收紧主题范围，优先完成高相关性题目。
*   单周驳回率 `> 30%`：增加“生成前提纲审议”环节。
*   草稿产出率 `< 90%`：检查模型配置、论文选择质量与 API 稳定性。
*   发布转化率 `< 70%`：复盘审议标准是否不一致，统一审核口径。

### API 路由
*   `GET/POST /api/admin/plan`：同步/读取本周计划。
*   `GET/PATCH /api/admin/collaboration`：读取/更新 3 人分工角色。
*   `GET/POST /api/admin/paper-library`：读取论文库 / 按主题预检索并入库。
*   `POST /api/admin/paper-library/[id]/download`：下载论文原文到本地目录。
*   `GET/POST /api/admin/week-slot-templates`：读取/保存自定义周槽模板。
*   `GET/POST /api/admin/monthly-plan`：读取/创建当月主题规划。
*   `GET /api/admin/monthly-plan/generate/preview`：预览当月将新增哪些周、每周新增多少任务。
*   `POST /api/admin/monthly-plan/generate`：一键预生成当月 4 周任务（按当前周目标计算月总量）。
*   `PATCH /api/admin/monthly-plan/[id]`：更新月历周槽、目标与状态。
*   `POST /api/admin/monthly-plan/[id]/apply-week`：将“当周周槽”批量应用到本周任务主题。
*   `GET/POST /api/admin/weekly-review`：读取/创建本周实施白板。
*   `PATCH /api/admin/weekly-review/[id]`：更新周实施复盘内容。
*   `POST /api/admin/weekly-review/[id]/import`：将本周任务导入“检索框”。
*   `PATCH /api/admin/task/[id]`：更新主题、备注、状态。
*   `POST /api/admin/task/[id]/papers`：检索候选论文。
*   `POST /api/admin/task/[id]/generate`：生成草稿。
*   `POST /api/admin/task/[id]/export`：导出已审核草稿到 `src/content/drafts/`（不发布）。
*   `POST /api/admin/task/[id]/publish`：发布文章。

导出成功后可在后台快捷打开目录页：`/admin/drafts`。

### 可选环境变量（启用大模型生成）
```bash
ADMIN_TOKEN=your_admin_token
ADMIN_USERS=planner:your_password_1,retriever:your_password_2,publisher:your_password_3
# 或使用 JSON（优先于 ADMIN_USERS）
# ADMIN_USERS_JSON=[{"username":"planner","password":"your_password_1"},{"username":"retriever","password":"your_password_2"},{"username":"publisher","password":"your_password_3"}]
LLM_PROVIDER=deepseek   # deepseek | openai
DEEPSEEK_API_KEY=your_key
DEEPSEEK_MODEL=deepseek-chat
OPENAI_API_KEY=your_key_if_openai
OPENAI_MODEL=gpt-4.1-mini
```

未配置 `ADMIN_USERS`/`ADMIN_USERS_JSON` 且未配置 `ADMIN_TOKEN` 时，`/admin` 与 `/api/admin/*` 会被保护层拦截（不可用）。

当 `LLM_PROVIDER=deepseek` 且未配置 `DEEPSEEK_API_KEY` 时，系统会自动使用内置模板生成可编辑草稿，不会阻塞流程。

当 `LLM_PROVIDER=openai` 且未配置 `OPENAI_API_KEY` 时，同样会自动回退到内置模板草稿。

## 📄 许可证
MIT License
