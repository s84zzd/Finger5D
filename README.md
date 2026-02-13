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
*   [Next.js 14](https://nextjs.org) (App Router)
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

## 📄 许可证
MIT License
