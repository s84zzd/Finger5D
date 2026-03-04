# 草稿生成流程与模板梳理

执行模块中「2) 生成草稿」依赖**两套模板**与**证据上下文**，流程较复杂。本文档梳理整体过程与各模板含义。

---

## 现状检查（与设计预期对照）

| 预期 | 现状 | 说明 |
|------|------|------|
| 草稿**基于论文全文** | ✅ 有条件满足 | 当该论文在论文库中且已下载全文（存在 `originalFilePath`）时，使用全文（PDF/HTML/文本，前 24000 字）；否则退化为**摘要**。若希望始终基于全文，需先在论文库对该条执行「下载全文」后再生成。 |
| 通过 **LLM 不同模板** 生成 | ✅ 满足 | 提示词由「写作模板」（5 种文风）+「研究类型模板」（8 种方法学）拼装，每种研究类型有专项说明与警示语（`buildStudyTemplateInstructions`），LLM 一次调用生成。 |
| **LLM 具备识别论文类型**的机制 | ✅ 满足 | 研究类型选「自动」时：先用规则在标题+摘要+证据中匹配（`detectStudyTemplateWithRule`），再调用 LLM 分类（`detectStudyTemplateByLLM`，传入标题+摘要+证据前 4000 字）；LLM 结果优先，失败则用规则结果。识别出的类型用于后续拼装「研究类型专项要求」并写入草稿元信息。 |

结论：当前实现与「基于全文 + 按论文类型用不同模板 + LLM 识别类型」一致；唯一前提是**全文需已在论文库下载**，否则会使用摘要生成。

**逐步了解现有生成逻辑**：参见 [草稿生成现有逻辑（一步一步）](./DRAFT-GENERATION-FLOW.md)，按调用顺序说明从点击「生成草稿」到写回任务与论文库的完整数据流。

---

## 一、整体流程概览

```
任务 + 选中论文
    ↓
① 构建证据上下文（全文 or 摘要）
    ↓
② 研究类型识别（若选「自动」：规则 + 可选 LLM）
    ↓
③ 按「写作模板」+「研究类型模板」拼装提示词
    ↓
④ 调用 LLM 生成 MDX 草稿（失败则用内置兜底草稿）
    ↓
⑤ 写回任务（draftTitle / draftSummary / draftContent）并标记论文采纳
```

---

## 二、两套模板

### 1. 写作模板（文风 / 输出结构）— `DraftPromptTemplate`

决定**文章体裁与结构**，面向 50+ 读者的科普写法。

| 取值 | 中文名 | 说明 |
|------|--------|------|
| `layered_progressive` | 分层递进式 | 先读要点 → 背景 → 概念解释 → 证据分层 → 局限 → 个体建议 → 五维联动；默认模板 |
| `qa_dialogue` | 问答对话式 | 虚拟访谈，5–7 问，医生口吻回答，含专家名片与 Citation |
| `compare_analysis` | 对比辨析式 | 流行说法 vs 研究证据对照，澄清误区，理性行动建议 |
| `narrative_research` | 叙事研究型 | 按时间线写成「科学探秘故事」，情感弧线 + 局限融入叙事 |
| `minimal_cards` | 极简卡片式 | 600–900 字，固定模块：一句话结论、关键数字、研究怎么回事、对您意味着什么、重要提醒、原文信息 |

- **代码位置**：`admin-types.ts` 的 `DRAFT_PROMPT_TEMPLATES`，提示词片段在 `admin-workflow.ts` 的 `buildDraftPromptByTemplate` 中 `templateInstructions`。
- **执行模块**：每个任务可选「草稿生成模板」，未选时默认 `layered_progressive`。

### 2. 研究类型模板（证据类型 / 方法学）— `DraftStudyTemplate`

决定**按哪种研究设计**来写（影响提示词里的方法学要求与警示语）。

| 取值 | 中文名 | 说明 |
|------|--------|------|
| `auto` | 自动识别 | 先规则匹配（标题+摘要+证据前 5000 字），可选再调用 LLM 分类；默认 |
| `rct` | 随机对照试验（RCT） | PICO、ARR/NNT、盲法、ITT、内外真实性 |
| `meta_analysis` | Meta分析 | 证据地图、I²、发表偏倚、GRADE、建议强度 |
| `prospective_cohort` | 前瞻性队列研究 | 暴露→随访、HR/RR、混杂控制 |
| `retrospective_cohort` | 回顾性队列研究 | 历史数据、登记队列、信息偏倚警示 |
| `cross_sectional` | 横断面研究 | 单时间点、相关性、无因果表述 |
| `cohort` | 队列研究 | 泛队列说明、剂量-反应、Bradford Hill 边界 |
| `case_control` | 病例对照研究 | 病例/对照定义、OR、回忆/选择/生存偏倚 |
| `diagnostic_accuracy` | 诊断试验准确性研究 | 四格表、灵敏度/特异度/PPV/NPV、金标准 |

- **代码位置**：`admin-types.ts` 的 `DRAFT_STUDY_TEMPLATES`，规则在 `detectStudyTemplateWithRule`，LLM 在 `detectStudyTemplateByLLM`，类型专用说明在 `buildStudyTemplateInstructions`。
- **执行模块**：每个任务可选「研究类型模板」；选 `auto` 时会在生成前做识别，并把「识别结果」写入草稿元信息与操作日志。

---

## 三、证据上下文（全文 vs 摘要）

- **入口**：`buildDraftEvidenceContext(task, paper)`。
- **逻辑**：
  1. 若该论文在论文库中且存在 `originalFilePath`（已下载全文），则尝试读取该文件（支持 PDF / HTML / 文本），取前 24000 字作为 `evidenceText`，`evidenceType = "fulltext"`。
  2. 否则使用 `paper.abstract` 作为 `evidenceText`，`evidenceType = "abstract"`。
- **影响**：提示词中会标明「证据来源类型：全文/摘要」，并影响草稿头部的「生成信息」与统计量解读深度。

---

## 四、研究类型识别（仅当研究类型模板 = 自动）

1. **规则优先**：`detectStudyTemplateWithRule(paper, evidenceText)` 在标题 + 摘要 + 证据前 5000 字中按关键词匹配（如 RCT、meta-analysis、prospective cohort 等），命中即返回对应类型与规则说明。
2. **可选 LLM**：若配置了 `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`，会再调 `detectStudyTemplateByLLM` 做分类；LLM 结果优先，失败或未配置则用规则结果。
3. **兜底**：规则未命中时默认 `cohort`，并注明「待人工复核」。
4. **证据句**：`extractStudyDetectionEvidence` 按最终类型从证据中抽 3–5 句支撑句，用于日志与元信息。

---

## 五、提示词拼装与 LLM 调用

- **拼装**：`buildDraftPromptByTemplate` 会：
  - 写入通用头（主题、维度、写作模板名、证据来源类型、任务一～四、术语表、论文元信息、证据正文）。
  - 若为「自动」识别，先解析出 `resolvedStudyTemplate`，再拼上 `buildStudyTemplateInstructions(resolvedStudyTemplate)`（该类型的专项要求与警示语）。
  - 拼上当前写作模板的 `templateInstructions[promptTemplate]`（结构、语言、MDX 要求）。
- **调用**：`callLLMForDraft` 用上述 prompt 调 DeepSeek 或 OpenAI；成功则返回 `title / summary / content`（content 前会加一行「生成信息」元数据），并带上 `resolvedStudyTemplate`、`studyDetectionRule`、`studyDetectionEvidence`。
- **失败兜底**：LLM 失败或未配置时，`generateDraftForTask` 返回 `buildFallbackDraft(task, paper)`，即固定结构的简易科普模板（无研究类型与文风细分）。

---

## 六、执行模块中的使用方式

- **草稿生成模板**：对应 `DraftPromptTemplate`，选「分层递进式 / 问答对话式 / …」。
- **研究类型模板**：对应 `DraftStudyTemplate`，选「自动识别」或某一具体类型。
- 每次点击「2) 生成草稿」会带当前任务所选的两个模板（或任务已保存的默认值）请求 `POST /api/admin/task/[id]/generate`；生成完成后可在此页面「修改草稿」再审核/发布。

---

## 七、相关代码位置速查

| 内容 | 文件 | 符号/位置 |
|------|------|-----------|
| 写作/研究类型枚举与类型定义 | `src/lib/admin-types.ts` | `DRAFT_PROMPT_TEMPLATES`, `DRAFT_STUDY_TEMPLATES` |
| 写作/研究类型中文标签 | `src/lib/admin-workflow.ts` | `DRAFT_TEMPLATE_LABEL`, `DRAFT_STUDY_TEMPLATE_LABEL` |
| 规则识别 + LLM 识别 | `src/lib/admin-workflow.ts` | `detectStudyTemplateWithRule`, `detectStudyTemplateByLLM` |
| 研究类型专项说明 | `src/lib/admin-workflow.ts` | `buildStudyTemplateInstructions` |
| 证据上下文 | `src/lib/admin-workflow.ts` | `buildDraftEvidenceContext`, `extractTextFromOriginalFile` |
| 提示词拼装 | `src/lib/admin-workflow.ts` | `buildDraftPromptByTemplate` |
| 调用 LLM + 兜底 | `src/lib/admin-workflow.ts` | `callLLMForDraft`, `generateDraftForTask`, `buildFallbackDraft` |
| 生成接口 | `src/app/api/admin/task/[id]/generate/route.ts` | `POST` |

---

## 八、小结

- **写作模板**：管「怎么写」（分层/问答/对比/叙事/极简卡片）。
- **研究类型模板**：管「按哪种研究设计写」（RCT/Meta/队列/病例对照/诊断等）；选「自动」时先规则后可选 LLM 识别，再套对应方法学说明与警示语。
- **证据**：有全文用全文（论文库已下载），否则用摘要；两者在提示词中会区分并影响生成深度。
- 整体是「证据 → 研究类型识别（若自动）→ 写作模板 + 研究类型说明 → 单次 LLM 生成 → 失败则固定兜底」的流水线。
