# 草稿生成：现有逻辑（一步一步）

本文档只描述**当前**草稿生成的完整调用链与数据流，便于先理解现状，再分步推进复杂机制的改造。

---

## 入口（用户操作 → 接口）

1. **前端**：用户在执行模块某任务下点击「2) 生成草稿」。
2. **请求**：`callTaskAction(taskId, "generate")` 发 `POST /api/admin/task/[id]/generate`，body 为：
   - `promptTemplate`：当前任务选的「草稿生成模板」（默认 `layered_progressive`）
   - `studyTemplate`：当前任务选的「研究类型模板」（默认 `auto`）
3. **接口**：`src/app/api/admin/task/[id]/generate/route.ts`
   - 从 body 解析并校验 `promptTemplate`、`studyTemplate`，非法则用默认值。
   - `task = getTaskById(id)`，无则 404。
   - 调用 `generateDraftForTask(task, { promptTemplate, studyTemplate })` 得到 `draft`。
   - 用 `updateTask` 把任务的 `draftTitle/draftSummary/draftContent`、`status: "drafted"`、操作日志等写回。
   - 若有 `task.selectedPaperId`，再调用 `markPaperLibraryItemAdoptedOnDraftGeneration(state, selectedPaperId)` 标记论文采纳并写回 state。
   - 返回最新 `state` 给前端。

---

## 第一步：generateDraftForTask（总控）

**位置**：`src/lib/admin-workflow.ts` 的 `generateDraftForTask`。

1. 从 `task.paperCandidates` 里用 `task.selectedPaperId` 取出 **selectedPaper**，没有则抛错。
2. 确定本次使用的两个模板：
   - **promptTemplate**：若入参有则用入参，否则用 `task.draftPromptTemplate ?? "layered_progressive"`。
   - **studyTemplate**：若入参有则用入参，否则用 `task.draftStudyTemplate ?? "auto"`。
3. 调用 **callLLMForDraft(task, selectedPaper, promptTemplate, studyTemplate)**。
4. 若返回值非 null，直接 return 该结果（含 title、summary、content、resolvedStudyTemplate、studyDetectionRule、studyDetectionEvidence 等）。
5. 若为 null（LLM 未配置或调用失败），return **buildFallbackDraft(task, selectedPaper)**（固定标题/摘要/正文，无研究类型与文风细分）。

---

## 第二步：callLLMForDraft（证据 → 类型识别 → 拼 prompt → 调 LLM）

**位置**：同文件 `callLLMForDraft`。

### 2.1 取证据（全文 or 摘要）

- 调用 **buildDraftEvidenceContext(task, paper)**：
  - 在 `state.paperLibrary` 里找到 `paper.id` 对应的条目，看是否有 **originalFilePath**（即该论文是否已下载全文到论文库）。
  - 若有：用 **extractTextFromOriginalFile(originalPath)** 读本地文件（支持 PDF/HTML/纯文本），取前 24000 字，返回 `{ evidenceType: "fulltext", evidenceText }`。
  - 若无或读失败：返回 `{ evidenceType: "abstract", evidenceText: paper.abstract ?? "(无摘要)" }`。
- 后续所有步骤（规则识别、LLM 识别、拼 prompt、生成）都用这份 **evidenceText**。

### 2.2 研究类型解析（仅影响“按哪种类型写”）

- **规则识别**：`fallbackDetection = detectStudyTemplateWithRule(paper, evidence.evidenceText)`  
  - 在 `标题 + 摘要 + evidenceText 前 5000 字` 里按固定关键词顺序匹配（如 RCT → meta_analysis → prospective_cohort → …），返回一个 `{ template, rule }`。
- **LLM 识别**（仅当 `studyTemplate === "auto"` 时）：
  - `llmDetection = await detectStudyTemplateByLLM(paper, evidence.evidenceText)`  
  - 内部用标题 + 摘要 + evidenceText 前 4000 字拼一段“分类” prompt，调当前配置的 LLM（DeepSeek 或 OpenAI），要求只返回一个类型标签；解析失败或未配置 API 则返回 null。
- **最终类型**：
  - 若 `studyTemplate !== "auto"`：`resolvedStudyTemplate = studyTemplate`（用户指定）。
  - 若 `studyTemplate === "auto"`：`resolvedStudyTemplate = llmDetection?.template ?? fallbackDetection.template`（LLM 优先，否则规则）。
- **detectionRule**：自动时用 `llmDetection?.rule ?? "规则兜底："+ fallbackDetection.rule`，否则 `"手动指定"`。
- **studyDetectionEvidence**：`extractStudyDetectionEvidence(resolvedStudyTemplate, paper, evidence.evidenceText)` 从证据里按该类型抽 3～5 句支撑句，用于日志与元信息。

### 2.3 拼装生成用 prompt

- 调用 **buildDraftPromptByTemplate({ task, paper, evidenceType, evidenceText, promptTemplate, studyTemplate: resolvedStudyTemplate })**。  
  注意：这里传入的已是 **resolvedStudyTemplate**（不会是 `"auto"`），所以 prompt 里不会再做一次“自动识别”，而是直接按该类型写。
- 拼装内容大致为：
  - **通用头**：角色、总原则、主题、维度、写作模板名、研究类型模板名、证据来源类型（全文/摘要）、任务一～四、术语表、论文元信息、**证据正文（evidenceText）**。
  - **研究类型专项说明**：`buildStudyTemplateInstructions(resolvedStudyTemplate)`，即该类型的方法学要求与警示语（RCT / Meta / 队列 / 病例对照 / 诊断等 8 种之一）。
  - **写作模板**：`templateInstructions[promptTemplate]`，即 5 种文风之一的结构与语言要求（分层递进 / 问答对话 / 对比辨析 / 叙事研究 / 极简卡片）。
- 得到一条长 **prompt** 字符串。

### 2.4 调用 LLM 生成正文

- 按 `process.env.LLM_PROVIDER` 选 **OpenAI** 或 **DeepSeek**。
- 若有对应 API Key，则用该 prompt 调一次 LLM（OpenAI 用 `input`，DeepSeek 用 `messages`），取返回的 content 作为正文。
- 成功则：
  - 用 `promptTemplate` 和 `resolvedStudyTemplate` 的标签拼 **title**、**summary**；
  - 在正文前加一行元信息：文风、研究类型、识别依据、证据来源；
  - return `{ title, summary, content, requestedStudyTemplate, resolvedStudyTemplate, studyDetectionRule, studyDetectionEvidence }`。
- 无 Key 或请求失败：return **null**，由上层走兜底。

---

## 第三步：API 层写回任务与论文库

- 用 `updateTask(id, …)` 把 `draft.title/summary/content`、`draftPromptTemplate`、`draftStudyTemplate`（用 resolved）、`status: "drafted"` 以及一条「生成草稿」操作日志写入该任务。
- 若 `task.selectedPaperId` 存在，再对论文库该条执行 **markPaperLibraryItemAdoptedOnDraftGeneration**，写入采纳时间、采纳周、采纳月，并 `adopted: true`。

---

## 数据流小结（现有逻辑）

```
前端选中的 promptTemplate / studyTemplate
         ↓
generateDraftForTask(task, options)
         ↓
callLLMForDraft(task, paper, promptTemplate, studyTemplate)
  ├─ buildDraftEvidenceContext(task, paper)  → 全文(有下载) or 摘要
  ├─ detectStudyTemplateWithRule(paper, evidenceText)  → 规则类型
  ├─ [若 studyTemplate===auto] detectStudyTemplateByLLM(paper, evidenceText)  → LLM 类型
  ├─ resolvedStudyTemplate = LLM ?? 规则 ?? 手动
  ├─ extractStudyDetectionEvidence(resolvedStudyTemplate, …)
  ├─ buildDraftPromptByTemplate(…, resolvedStudyTemplate)  → 整段 prompt
  └─ 一次 LLM 调用 → title, summary, content（或 null → buildFallbackDraft）
         ↓
API：updateTask(草稿+状态+日志) + markPaperLibraryItemAdoptedOnDraftGeneration(若已选论文)
         ↓
返回 state 给前端
```

---

## 关键点（便于后续改机制）

- **证据只取一次**：全文与否在 `buildDraftEvidenceContext` 里定死，后面类型识别和生成都用同一份 `evidenceText`。
- **研究类型**：只用于选“方法学说明”和日志展示，不改变证据内容；识别顺序为「规则 →（自动时）LLM」，再参与拼 prompt。
- **生成**：一次 LLM 调用完成“研究类型识别 + 关键信息提取 + 中文科普”的整段提示，没有分多步调用。
- **兜底**：LLM 不可用或失败时，直接返回固定模板的 buildFallbackDraft，无研究类型、无文风区分。

后续若要“一步一步推进”复杂机制（例如分步生成、多轮校验、强制全文等），可以在上述每一步上做扩展或替换，而不影响对现有逻辑的理解。
