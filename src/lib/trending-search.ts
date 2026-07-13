import crypto from "crypto";
import type { DraftPromptTemplate, FiveDCategory, TrendingTopic, WorkflowState, WorkflowTask } from "@/lib/admin-types";
import { searchPapersByTheme, readWorkflowState, writeWorkflowState, importPaperLibraryItemFromExternal } from "@/lib/admin-workflow";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

interface TavilyResult {
    title: string;
    url: string;
    content: string;
    published_date?: string;
    score: number;
}

interface TavilyResponse {
    results: TavilyResult[];
    answer?: string;
}

interface TrendingSearchParams {
    topic: string;
    timeRange: "week" | "month" | "quarter" | "year";
    sourceType: "all" | "academic" | "news" | "review";
    dimensions: FiveDCategory[];
}

interface TrendingSearchResult {
    topics: TrendingTopic[];
    searchQuery: string;
    rawResultCount: number;
}

function buildTavilyQuery(params: TrendingSearchParams): string {
    const parts: string[] = [];
    parts.push(params.topic);
    parts.push("aging research 2025 2026");
    if (params.sourceType === "academic") parts.push("peer-reviewed study");
    if (params.sourceType === "review") parts.push("review article");
    if (params.sourceType === "news") parts.push("latest news");
    return parts.join(" ");
}

function tavilyTimeRange(range: TrendingSearchParams["timeRange"]): string {
    switch (range) {
        case "week": return "week";
        case "month": return "month";
        case "quarter": return "month";
        case "year": return "year";
    }
}

async function searchTavily(params: TrendingSearchParams): Promise<TavilyResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error("TAVILY_API_KEY 未配置");
    }

    const query = buildTavilyQuery(params);
    const response = await fetch(TAVILY_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: "advanced",
            max_results: 10,
            topic: "news",
            days: params.timeRange === "week" ? 7 : params.timeRange === "month" ? 30 : params.timeRange === "quarter" ? 90 : 365,
            include_answer: true
        }),
        cache: "no-store"
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Tavily 搜索失败 (${response.status}): ${errText}`);
    }

    const data = await response.json() as TavilyResponse;
    return data.results ?? [];
}

async function analyzeTopicsWithLLM(
    searchResults: TavilyResult[],
    params: TrendingSearchParams
): Promise<Omit<TrendingTopic, "id" | "status" | "createdAt">[]> {
    const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();

    const resultsText = searchResults
        .map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    Date: ${r.published_date ?? "unknown"}\n    Snippet: ${r.content.slice(0, 500)}`)
        .join("\n\n");

    const dimensionLabels: Record<FiveDCategory, string> = {
        cardio: "心血管与代谢",
        physical: "身体活动",
        cognitive: "认知活力",
        nutrition: "健康饮食",
        social: "社交与情绪"
    };
    const dimensionList = params.dimensions.map((d) => `${d}(${dimensionLabels[d]})`).join("、");

    const systemPrompt = `你是衰老科学（Geroscience）领域的科普选题专家。根据搜索结果，为面向50+人群的中文科普平台"Finger5D"推荐选题方向。

规则：
1. 每个选题必须对应一个 Finger5D 五维度（${dimensionList}）
2. 选题必须基于搜索结果中的真实研究，不可杜撰
3. 标题要有吸引力但不夸大
4. 推荐理由要说明为什么适合科普化

输出格式（严格 JSON 数组，不要 markdown 代码块）：
[
  {
    "titleEn": "英文简短标题",
    "titleZh": "中文科普标题",
    "summary": "2-3句话概括核心发现",
    "sourceUrl": "原文URL",
    "sourceDate": "YYYY-MM-DD",
    "dimension": "维度代码（cardio/physical/cognitive/nutrition/social）",
    "suggestedStyle": "推荐文风（layered_progressive/qa_dialogue/compare_analysis/narrative_research/minimal_cards）",
    "rationale": "推荐理由：为什么适合科普化，目标读者能获得什么"
  }
]`;

    const userPrompt = `搜索主题：${params.topic}
搜索结果（共 ${searchResults.length} 条）：

${resultsText}

请推荐 3-5 个选题方向，严格按 JSON 数组格式输出。`;

    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OPENAI_API_KEY 未配置");
        const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, input: `${systemPrompt}\n\n${userPrompt}` }),
            cache: "no-store"
        });
        if (!response.ok) throw new Error(`OpenAI 调用失败 (${response.status})`);
        const payload = await response.json() as { output_text?: string };
        return parseTopicsJSON(payload.output_text ?? "");
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY 未配置");
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3
        }),
        cache: "no-store"
    });
    if (!response.ok) throw new Error(`DeepSeek 调用失败 (${response.status})`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return parseTopicsJSON(payload.choices?.[0]?.message?.content ?? "");
}

function parseTopicsJSON(text: string): Omit<TrendingTopic, "id" | "status" | "createdAt">[] {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    try {
        const raw = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
        return raw.map((item) => ({
            titleEn: String(item.titleEn ?? ""),
            titleZh: String(item.titleZh ?? item.titleEn ?? ""),
            summary: String(item.summary ?? ""),
            sourceUrl: String(item.sourceUrl ?? item.url ?? ""),
            sourceDate: String(item.sourceDate ?? ""),
            dimension: (["cardio", "physical", "cognitive", "nutrition", "social"].includes(String(item.dimension))
                ? String(item.dimension) as FiveDCategory
                : "cognitive"),
            suggestedStyle: (["layered_progressive", "qa_dialogue", "compare_analysis", "narrative_research", "minimal_cards"].includes(String(item.suggestedStyle))
                ? String(item.suggestedStyle) as DraftPromptTemplate
                : "layered_progressive"),
            rationale: String(item.rationale ?? "")
        }));
    } catch {
        return [];
    }
}

export async function searchTrendingTopics(params: TrendingSearchParams): Promise<TrendingSearchResult> {
    const searchQuery = buildTavilyQuery(params);
    const rawResults = await searchTavily(params);

    if (rawResults.length === 0) {
        return { topics: [], searchQuery, rawResultCount: 0 };
    }

    const analyzed = await analyzeTopicsWithLLM(rawResults, params);

    const topics: TrendingTopic[] = analyzed.map((item) => ({
        id: crypto.randomUUID(),
        ...item,
        status: "suggested" as const,
        createdAt: new Date().toISOString()
    }));

    return { topics, searchQuery, rawResultCount: rawResults.length };
}

export function getTrendingTopicsFromState(state: { trendingTopics?: TrendingTopic[] }): TrendingTopic[] {
    return state.trendingTopics ?? [];
}

export function saveTrendingTopic(state: WorkflowState, topic: TrendingTopic): WorkflowState {
    const existing = state.trendingTopics ?? [];
    const exists = existing.some((t) => t.id === topic.id);
    if (exists) {
        return {
            ...state,
            trendingTopics: existing.map((t) => t.id === topic.id ? { ...t, status: "saved" as const } : t)
        };
    }
    return {
        ...state,
        trendingTopics: [...existing, { ...topic, status: "saved" as const }]
    };
}

export function ignoreTrendingTopic(state: WorkflowState, topicId: string): WorkflowState {
    return {
        ...state,
        trendingTopics: (state.trendingTopics ?? []).map((t) =>
            t.id === topicId ? { ...t, status: "ignored" as const } : t
        )
    };
}

export async function createTaskFromTopic(
    state: WorkflowState,
    topicId: string
): Promise<{ state: WorkflowState; taskId: string; importedCount: number }> {
    const topic = (state.trendingTopics ?? []).find((t) => t.id === topicId);
    if (!topic) {
        throw new Error("选题不存在");
    }

    const weekKey = state.lastSyncedWeekKey || (() => {
        const now = new Date();
        const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const day = target.getUTCDay() || 7;
        target.setUTCDate(target.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
        const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
    })();

    const existingTasks = state.tasks.filter((t) => t.weekKey === weekKey && t.category === topic.dimension);
    const sequence = existingTasks.length + 1;
    const taskId = crypto.randomUUID();

    const newTask = {
        id: taskId,
        weekKey,
        category: topic.dimension,
        sequence,
        theme: topic.titleZh,
        topicNote: topic.rationale,
        status: "planned" as const,
        paperCandidates: [],
        selectedPaperId: undefined,
        draftTitle: undefined,
        draftSummary: undefined,
        draftContent: undefined,
        draftPromptTemplate: topic.suggestedStyle,
        draftStudyTemplate: "auto" as const,
        coreSummary: undefined,
        reviewComment: undefined,
        operationLogs: [{
            action: "search_papers" as const,
            actor: "AI选题助手",
            detail: `从选题库创建：${topic.titleZh}`,
            createdAt: new Date().toISOString()
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    let workingState: WorkflowState = {
        ...state,
        tasks: [...state.tasks, newTask],
        trendingTopics: (state.trendingTopics ?? []).map((t) =>
            t.id === topicId ? { ...t, status: "task_created" as const } : t
        )
    };

    // Auto-search and import papers
    let importedCount = 0;
    try {
        const searchSettings = workingState.searchSettings;
        const externalPapers = await searchPapersByTheme(topic.dimension, topic.titleZh, searchSettings);

        for (const paper of externalPapers.slice(0, 3)) {
            try {
                const result = await importPaperLibraryItemFromExternal({
                    title: paper.title,
                    doi: paper.doi,
                    sourceUrl: paper.url,
                    category: topic.dimension,
                    themeSeed: topic.titleZh,
                    keywords: [topic.dimension, topic.titleZh]
                });
                workingState = result.state;
                importedCount++;
            } catch {
                // Skip failed imports silently
            }
        }
    } catch {
        // External search failed; task is still created without papers
    }

    // Populate task's paperCandidates from library
    const { getPaperLibraryCandidates } = await import("@/lib/admin-workflow");
    const candidates = getPaperLibraryCandidates(topic.dimension, topic.titleZh);
    const usedPaperKeys = new Set<string>();
    const publishedPaperKeys = new Set<string>();
    for (const t of workingState.tasks) {
        if (t.selectedPaperId && t.id !== taskId) {
            const lib = workingState.paperLibrary.find((p) => p.id === t.selectedPaperId);
            if (lib) usedPaperKeys.add(lib.doi ?? lib.url ?? lib.title);
        }
    }
    const filtered = candidates.filter((c) => {
        const key = c.doi ?? c.url ?? c.title;
        return !usedPaperKeys.has(key) && !publishedPaperKeys.has(key);
    });

    if (filtered.length > 0) {
        const taskIndex = workingState.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex >= 0) {
            workingState.tasks[taskIndex] = {
                ...workingState.tasks[taskIndex],
                paperCandidates: filtered,
                selectedPaperId: filtered[0].id,
                status: "paper_selected" as const,
                operationLogs: [
                    ...(workingState.tasks[taskIndex].operationLogs ?? []),
                    {
                        action: "search_papers" as const,
                        actor: "AI选题助手",
                        detail: `自动检索导入 ${importedCount} 篇论文，匹配 ${filtered.length} 篇候选`,
                        createdAt: new Date().toISOString()
                    }
                ],
                updatedAt: new Date().toISOString()
            };
        }
    }

    return { state: workingState, taskId, importedCount };
}
