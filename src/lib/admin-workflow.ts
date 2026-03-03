import fs from "fs";
import path from "path";
import { getCoreSummarySystemPrompt } from "@/lib/core-summary-prompts";
import {
    DRAFT_PROMPT_TEMPLATES,
    DRAFT_STUDY_TEMPLATES,
    FIVE_D_CATEGORIES,
    type MonthlyGenerationPreview,
    type MonthlyGenerationPreviewWeek,
    type DraftPromptTemplate,
    type DraftStudyTemplate,
    PAPER_SOURCES,
    type CollaborationSettings,
    type FiveDCategory,
    type MonthlyThemePlan,
    type TaskOperationLog,
    WEEKLY_TASK_TARGET_MAX,
    WEEKLY_TASK_TARGET_MIN,
    WEEKLY_TASK_TARGET_STEP,
    WEEKS_PER_MONTH,
    WEEKLY_ARTICLE_TARGET,
    type PaperCandidate,
    type PaperLibraryItem,
    type PaperSource,
    type SearchSettings,
    type WeekSlotTemplate,
    type WeeklyReview,
    type WorkflowState,
    type WorkflowTask
} from "@/lib/admin-types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DATA_FILE = path.join(DATA_DIR, "admin-workflow.json");

const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
    sourceWhitelist: ["crossref", "pubmed"],
    sinceYear: new Date().getFullYear() - 5,
    maxResultsPerSource: 8,
    minRelevanceScore: 2,
    weeklyTaskTarget: WEEKLY_ARTICLE_TARGET
};

const DEFAULT_COLLABORATION: CollaborationSettings = {
    planningReviewer: "规划管理员",
    paperRetriever: "论文检索编辑",
    draftReviewer: "草稿审议与发布编辑"
};

const DEFAULT_TOPICS: Record<FiveDCategory, string[]> = {
    cardio: [
        "睡眠与心代谢节律",
        "血糖波动与慢性炎症",
        "血压管理与健康寿命",
        "有氧训练与心血管弹性"
    ],
    physical: [
        "力量训练与肌肉衰减",
        "平衡训练与跌倒预防",
        "步行策略与体能维护",
        "抗阻训练与代谢改善"
    ],
    cognitive: [
        "大脑可塑性与学习能力",
        "睡眠与记忆巩固",
        "注意力训练与执行功能",
        "运动与认知保护"
    ],
    nutrition: [
        "蛋白质分配与肌肉健康",
        "地中海饮食与炎症控制",
        "全谷物与代谢稳定",
        "饮食节律与血糖管理"
    ],
    social: [
        "孤独感与炎症水平",
        "社交连接与认知健康",
        "情绪压力与睡眠质量",
        "社区参与与健康寿命"
    ]
};

const DEFAULT_WEEK_SLOTS = [
    "Week 1：确定主题与审稿节奏",
    "Week 2：推进检索与初稿",
    "Week 3：完成草稿审议与修订",
    "Week 4：发布复盘与下月预规划"
];

const CATEGORY_SEARCH_TERMS: Record<FiveDCategory, string[]> = {
    cardio: ["cardiometabolic", "sleep", "blood glucose", "inflammation", "hypertension", "older adults"],
    physical: ["resistance training", "sarcopenia", "muscle", "balance", "fall prevention", "older adults"],
    cognitive: ["cognitive", "memory", "neuroplasticity", "executive function", "aging brain", "older adults"],
    nutrition: ["protein intake", "diet", "nutrition", "mediterranean diet", "metabolic health", "older adults"],
    social: ["loneliness", "social isolation", "social connection", "mental health", "inflammation", "older adults"]
};

const THEME_KEYWORD_MAP: Array<{ pattern: RegExp; token: string }> = [
    { pattern: /衰老|老龄|老化|抗衰/g, token: "aging" },
    { pattern: /衰老|老龄|老化|抗衰/g, token: "geroscience" },
    { pattern: /睡眠|睡不好|失眠/g, token: "sleep" },
    { pattern: /节律|昼夜/g, token: "circadian" },
    { pattern: /心|血压|心血管/g, token: "cardiovascular" },
    { pattern: /代谢|血糖|胰岛素/g, token: "metabolic" },
    { pattern: /炎症/g, token: "inflammation" },
    { pattern: /肌肉|肌少|衰减/g, token: "sarcopenia" },
    { pattern: /力量|抗阻/g, token: "resistance training" },
    { pattern: /平衡|跌倒/g, token: "fall prevention" },
    { pattern: /认知|记忆|注意力/g, token: "cognitive" },
    { pattern: /可塑性|学习/g, token: "neuroplasticity" },
    { pattern: /饮食|营养/g, token: "nutrition" },
    { pattern: /蛋白/g, token: "protein" },
    { pattern: /地中海/g, token: "mediterranean diet" },
    { pattern: /社交|孤独|情绪/g, token: "loneliness" },
    { pattern: /长寿|健康寿命/g, token: "healthspan" }
];

const CATEGORY_LABEL: Record<FiveDCategory, string> = {
    cardio: "心血管与代谢",
    physical: "身体活动",
    cognitive: "认知活力",
    nutrition: "健康饮食",
    social: "社交与情绪"
};

/** 外部论文库检索每批数量（如 PubMed），每批 20 篇列队筛选后再追加下一批 */
const LIBRARY_SEARCH_BATCH_SIZE = 20;

type PaperLibrarySearchCategory = FiveDCategory | "other";

function getIsoDate(date: Date): string {
    return date.toISOString();
}

function getWeekKey(date = new Date()): string {
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getMonthKey(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthWeekAnchorDates(date = new Date()): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    return Array.from({ length: WEEKS_PER_MONTH }, (_, index) => new Date(year, month, 1 + (index * 7)));
}

function getWeekSlotIndexInMonth(date = new Date()): number {
    const day = date.getDate();
    return Math.min(WEEKS_PER_MONTH - 1, Math.floor((day - 1) / 7));
}

function ensureDataFile(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        const initial: WorkflowState = {
            version: 1,
            lastSyncedWeekKey: "",
            searchSettings: DEFAULT_SEARCH_SETTINGS,
            collaboration: DEFAULT_COLLABORATION,
            monthlyPlans: [],
            weekSlotTemplates: [],
            weeklyReviews: [],
            paperLibrary: [],
            tasks: []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
    }
}

function normalizeSearchSettings(input: Partial<SearchSettings> | undefined): SearchSettings {
    const sourceWhitelist = Array.isArray(input?.sourceWhitelist)
        ? input.sourceWhitelist.filter((source): source is PaperSource => PAPER_SOURCES.includes(source as PaperSource))
        : DEFAULT_SEARCH_SETTINGS.sourceWhitelist;

    const sinceYearRaw = Number(input?.sinceYear);
    const maxResultsRaw = Number(input?.maxResultsPerSource);
    const minScoreRaw = Number(input?.minRelevanceScore);
    const weeklyTaskTargetRaw = Number(input?.weeklyTaskTarget);

    const currentYear = new Date().getFullYear();
    const sinceYear = Number.isFinite(sinceYearRaw)
        ? Math.min(currentYear, Math.max(1980, Math.trunc(sinceYearRaw)))
        : DEFAULT_SEARCH_SETTINGS.sinceYear;

    const maxResultsPerSource = Number.isFinite(maxResultsRaw)
        ? Math.min(20, Math.max(3, Math.trunc(maxResultsRaw)))
        : DEFAULT_SEARCH_SETTINGS.maxResultsPerSource;

    const minRelevanceScore = Number.isFinite(minScoreRaw)
        ? Math.min(8, Math.max(1, Math.trunc(minScoreRaw)))
        : DEFAULT_SEARCH_SETTINGS.minRelevanceScore;

    const normalizedWeeklyTaskTarget = Number.isFinite(weeklyTaskTargetRaw)
        ? Math.trunc(weeklyTaskTargetRaw)
        : DEFAULT_SEARCH_SETTINGS.weeklyTaskTarget;

    const weeklyTaskTarget = Math.max(
        WEEKLY_TASK_TARGET_MIN,
        Math.min(
            WEEKLY_TASK_TARGET_MAX,
            Math.round(normalizedWeeklyTaskTarget / WEEKLY_TASK_TARGET_STEP) * WEEKLY_TASK_TARGET_STEP
        )
    );

    return {
        sourceWhitelist: sourceWhitelist.length > 0 ? sourceWhitelist : DEFAULT_SEARCH_SETTINGS.sourceWhitelist,
        sinceYear,
        maxResultsPerSource,
        minRelevanceScore,
        weeklyTaskTarget
    };
}

function getCategoryWeeklyTarget(weeklyTaskTarget: number, category: FiveDCategory): number {
    const totalCategories = FIVE_D_CATEGORIES.length;
    const base = Math.floor(weeklyTaskTarget / totalCategories);
    const remainder = weeklyTaskTarget % totalCategories;
    const categoryIndex = FIVE_D_CATEGORIES.indexOf(category);
    return base + (categoryIndex >= 0 && categoryIndex < remainder ? 1 : 0);
}

function normalizeCollaboration(input: Partial<CollaborationSettings> | undefined): CollaborationSettings {
    const legacyRetrievalDraftReviewer = input && "retrievalDraftReviewer" in input
        ? String((input as Record<string, unknown>).retrievalDraftReviewer ?? "").trim()
        : "";

    return {
        planningReviewer: String(input?.planningReviewer ?? DEFAULT_COLLABORATION.planningReviewer).trim() || DEFAULT_COLLABORATION.planningReviewer,
        paperRetriever: String(input?.paperRetriever ?? legacyRetrievalDraftReviewer ?? DEFAULT_COLLABORATION.paperRetriever).trim() || DEFAULT_COLLABORATION.paperRetriever,
        draftReviewer: String(input?.draftReviewer ?? legacyRetrievalDraftReviewer ?? DEFAULT_COLLABORATION.draftReviewer).trim() || DEFAULT_COLLABORATION.draftReviewer
    };
}

function normalizeMonthlyPlans(input: MonthlyThemePlan[] | undefined): MonthlyThemePlan[] {
    return (input ?? []).map((plan) => ({
        ...plan,
        weekSlots: Array.isArray(plan.weekSlots)
            ? [...plan.weekSlots, ...Array.from({ length: WEEKS_PER_MONTH }, () => "")]
                .slice(0, WEEKS_PER_MONTH)
                .map((slot, index) => {
                    const normalized = String(slot ?? "").trim();
                    return normalized || DEFAULT_WEEK_SLOTS[index] || "";
                })
            : [...DEFAULT_WEEK_SLOTS],
        categoryFocus: Array.isArray(plan.categoryFocus)
            ? plan.categoryFocus.filter((cat): cat is FiveDCategory => FIVE_D_CATEGORIES.includes(cat as FiveDCategory))
            : [...FIVE_D_CATEGORIES],
        status: plan.status ?? "draft"
    }));
}

function normalizeWeeklyReviews(input: WeeklyReview[] | undefined): WeeklyReview[] {
    return (input ?? []).map((review) => ({
        ...review,
        retrievalInbox: String(review.retrievalInbox ?? "")
    }));
}

function normalizeWeekSlotTemplates(input: WeekSlotTemplate[] | undefined): WeekSlotTemplate[] {
    return (input ?? []).map((template, index) => ({
        id: String(template.id ?? `template-${index + 1}`),
        name: String(template.name ?? `模板 ${index + 1}`).trim() || `模板 ${index + 1}`,
        weekSlots: Array.isArray(template.weekSlots)
            ? [...template.weekSlots, ...Array.from({ length: WEEKS_PER_MONTH }, () => "")]
                .slice(0, WEEKS_PER_MONTH)
                .map((slot, slotIndex) => {
                    const normalized = String(slot ?? "").trim();
                    return normalized || DEFAULT_WEEK_SLOTS[slotIndex] || "";
                })
            : [...DEFAULT_WEEK_SLOTS],
        createdAt: String(template.createdAt ?? getIsoDate(new Date())),
        updatedAt: String(template.updatedAt ?? getIsoDate(new Date()))
    }));
}

function normalizeTasks(input: WorkflowTask[] | undefined): WorkflowTask[] {
    return (input ?? []).map((task) => ({
        ...task,
        operationLogs: Array.isArray(task.operationLogs)
            ? task.operationLogs.map((log) => ({
                action: log.action,
                actor: String(log.actor ?? ""),
                detail: String(log.detail ?? ""),
                createdAt: String(log.createdAt ?? "")
            }))
            : []
    }));
}

function normalizePaperLibrary(input: PaperLibraryItem[] | undefined): PaperLibraryItem[] {
    return (input ?? []).map((item, index) => ({
        id: String(item.id ?? `paper-${index + 1}`),
        key: String(item.key ?? ""),
        source: item.source,
        title: String(item.title ?? "Untitled paper"),
        titleZh: item.titleZh ? String(item.titleZh) : undefined,
        authors: String(item.authors ?? "Unknown"),
        journal: String(item.journal ?? "Unknown journal"),
        year: String(item.year ?? "Unknown"),
        doi: item.doi ? String(item.doi) : undefined,
        url: String(item.url ?? ""),
        abstract: item.abstract ? String(item.abstract) : undefined,
        abstractEn: item.abstractEn
            ? String(item.abstractEn)
            : (item.abstract ? String(item.abstract) : undefined),
        abstractZh: item.abstractZh ? String(item.abstractZh) : undefined,
        category: item.category,
        themeSeed: String(item.themeSeed ?? ""),
        searchScope: item.searchScope === "other" ? "other" : "category",
        keywords: Array.isArray(item.keywords)
            ? Array.from(new Set(item.keywords.map((keyword) => String(keyword ?? "").trim()).filter(Boolean))).slice(0, 20)
            : [],
        customCategories: Array.isArray(item.customCategories)
            ? Array.from(new Set(item.customCategories.map((value) => String(value ?? "").trim()).filter(Boolean))).slice(0, 20)
            : [],
        referenceTypeCode: String(item.referenceTypeCode ?? "J").trim() || "J",
        volume: item.volume ? String(item.volume) : undefined,
        issue: item.issue ? String(item.issue) : undefined,
        pages: item.pages ? String(item.pages) : undefined,
        gbtCitation: item.gbtCitation ? String(item.gbtCitation) : undefined,
        storageCategory: item.storageCategory ? String(item.storageCategory).trim() : undefined,
        adopted: Boolean(item.adopted),
        adoptedAt: item.adoptedAt ? String(item.adoptedAt) : undefined,
        adoptedWeekKey: item.adoptedWeekKey ? String(item.adoptedWeekKey) : undefined,
        adoptedMonthKey: item.adoptedMonthKey ? String(item.adoptedMonthKey) : undefined,
        localFilePath: item.localFilePath ? String(item.localFilePath) : undefined,
        summaryFilePath: item.summaryFilePath
            ? String(item.summaryFilePath)
            : (item.localFilePath ? String(item.localFilePath) : undefined),
        originalFilePath: item.originalFilePath ? String(item.originalFilePath) : undefined,
        createdAt: String(item.createdAt ?? getIsoDate(new Date())),
        updatedAt: String(item.updatedAt ?? getIsoDate(new Date()))
    }));
}

export function readWorkflowState(): WorkflowState {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkflowState>;

    return {
        version: parsed.version ?? 1,
        lastSyncedWeekKey: parsed.lastSyncedWeekKey ?? "",
        searchSettings: normalizeSearchSettings(parsed.searchSettings),
        collaboration: normalizeCollaboration(parsed.collaboration),
        monthlyPlans: normalizeMonthlyPlans(parsed.monthlyPlans),
        weekSlotTemplates: normalizeWeekSlotTemplates(parsed.weekSlotTemplates),
        weeklyReviews: normalizeWeeklyReviews(parsed.weeklyReviews),
        paperLibrary: normalizePaperLibrary(parsed.paperLibrary),
        tasks: normalizeTasks(parsed.tasks)
    };
}

export function writeWorkflowState(state: WorkflowState): void {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}

function ensureWeekTasksInState(state: WorkflowState, targetDate: Date): void {
    const weekKey = getWeekKey(targetDate);
    const now = getIsoDate(targetDate);
    const weeklyTaskTarget = state.searchSettings.weeklyTaskTarget;

    for (const category of FIVE_D_CATEGORIES) {
        const categoryTarget = getCategoryWeeklyTarget(weeklyTaskTarget, category);
        const existing = state.tasks.filter((task) => task.weekKey === weekKey && task.category === category);
        if (existing.length >= categoryTarget) {
            continue;
        }

        const topicPool = DEFAULT_TOPICS[category];

        for (let sequence = existing.length + 1; sequence <= categoryTarget; sequence += 1) {
            const topic = topicPool[(sequence - 1) % topicPool.length];
            state.tasks.push({
                id: `${weekKey}-${category}-${sequence}`,
                weekKey,
                category,
                sequence,
                theme: `${topic}（第${sequence}篇）`,
                topicNote: `围绕 ${topic} 筛选高质量论文并转写为面向 50+ 的科普文章。`,
                status: "planned",
                paperCandidates: [],
                operationLogs: [],
                createdAt: now,
                updatedAt: now
            });
        }
    }
}

export function appendTaskOperationLog(task: WorkflowTask, input: Omit<TaskOperationLog, "createdAt">): WorkflowTask {
    const nextLog: TaskOperationLog = {
        ...input,
        createdAt: getIsoDate(new Date())
    };

    const operationLogs = [...(task.operationLogs ?? []), nextLog];
    return {
        ...task,
        operationLogs
    };
}

function getWeekGenerationPreview(state: WorkflowState, targetDate: Date): MonthlyGenerationPreviewWeek {
    const weekKey = getWeekKey(targetDate);
    const existingCount = state.tasks.filter((task) => task.weekKey === weekKey).length;
    const targetCount = state.searchSettings.weeklyTaskTarget;
    const willAddCount = Math.max(0, targetCount - existingCount);

    return {
        weekKey,
        existingCount,
        targetCount,
        willAddCount
    };
}

export function ensureWeeklyPlan(date = new Date()): WorkflowState {
    const state = readWorkflowState();
    const weekKey = getWeekKey(date);
    ensureWeekTasksInState(state, date);

    state.tasks.sort((left, right) => left.id.localeCompare(right.id));
    state.lastSyncedWeekKey = weekKey;
    writeWorkflowState(state);
    return state;
}

export function ensureMonthlyPlanTasks(date = new Date()): WorkflowState {
    const state = readWorkflowState();
    const preview = getMonthlyPlanTaskGenerationPreview(date);
    const weekAnchors = getMonthWeekAnchorDates(date);

    for (const week of preview.weeks) {
        if (week.willAddCount > 0) {
            const anchor = weekAnchors.find((dateItem) => getWeekKey(dateItem) === week.weekKey);
            if (anchor) {
                ensureWeekTasksInState(state, anchor);
            }
        }
    }

    state.tasks.sort((left, right) => left.id.localeCompare(right.id));
    state.lastSyncedWeekKey = getWeekKey(date);
    writeWorkflowState(state);
    return state;
}

export function getMonthlyPlanTaskGenerationPreview(date = new Date()): MonthlyGenerationPreview {
    const state = readWorkflowState();
    const monthKey = getMonthKey(date);
    const weekAnchors = getMonthWeekAnchorDates(date);
    const weeks = weekAnchors.map((anchor) => getWeekGenerationPreview(state, anchor));

    const existingTotal = weeks.reduce((sum, item) => sum + item.existingCount, 0);
    const willAddTotal = weeks.reduce((sum, item) => sum + item.willAddCount, 0);
    const monthlyTarget = state.searchSettings.weeklyTaskTarget * WEEKS_PER_MONTH;

    return {
        monthKey,
        targetTotal: monthlyTarget,
        existingTotal,
        willAddTotal,
        weeks
    };
}

export function getTaskById(taskId: string): WorkflowTask | undefined {
    const state = readWorkflowState();
    return state.tasks.find((task) => task.id === taskId);
}

export function updateTask(taskId: string, updater: (task: WorkflowTask) => WorkflowTask): WorkflowState {
    const state = readWorkflowState();
    const index = state.tasks.findIndex((task) => task.id === taskId);

    if (index === -1) {
        throw new Error("Task not found");
    }

    state.tasks[index] = {
        ...updater(state.tasks[index]),
        updatedAt: getIsoDate(new Date())
    };
    writeWorkflowState(state);
    return state;
}

export function updateSearchSettings(settings: Partial<SearchSettings>): WorkflowState {
    const state = readWorkflowState();
    state.searchSettings = normalizeSearchSettings({
        ...state.searchSettings,
        ...settings
    });
    writeWorkflowState(state);
    return state;
}

export function updateCollaborationSettings(settings: Partial<CollaborationSettings>): WorkflowState {
    const state = readWorkflowState();
    state.collaboration = normalizeCollaboration({
        ...state.collaboration,
        ...settings
    });
    writeWorkflowState(state);
    return state;
}

export function createMonthlyPlan(): WorkflowState {
    const state = readWorkflowState();
    const now = new Date();
    const monthKey = getMonthKey(now);

    const existing = state.monthlyPlans.filter((item) => item.monthKey === monthKey);
    if (existing.length > 0) {
        return state;
    }

    const monthlyPlan: MonthlyThemePlan = {
        id: `${monthKey}-plan`,
        monthKey,
        title: `${monthKey} 月度主题规划`,
        objective: `明确当月五维主题优先级，并按周 ${state.searchSettings.weeklyTaskTarget} 篇推进，月度目标 ${state.searchSettings.weeklyTaskTarget * WEEKS_PER_MONTH} 篇。`,
        categoryFocus: [...FIVE_D_CATEGORIES],
        weekSlots: [
            ...DEFAULT_WEEK_SLOTS
        ],
        status: "draft",
        note: "主题规划与审核由同一人负责；论文检索与草稿审议由不同角色负责。",
        createdAt: getIsoDate(now),
        updatedAt: getIsoDate(now)
    };

    state.monthlyPlans.unshift(monthlyPlan);
    writeWorkflowState(state);
    return state;
}

export function updateMonthlyPlan(planId: string, updater: (plan: MonthlyThemePlan) => MonthlyThemePlan): WorkflowState {
    const state = readWorkflowState();
    const index = state.monthlyPlans.findIndex((item) => item.id === planId);

    if (index === -1) {
        throw new Error("Monthly plan not found");
    }

    state.monthlyPlans[index] = {
        ...updater(state.monthlyPlans[index]),
        updatedAt: getIsoDate(new Date())
    };

    writeWorkflowState(state);
    return state;
}

export function saveWeekSlotTemplate(name: string, weekSlots: string[]): WorkflowState {
    const state = readWorkflowState();
    const now = getIsoDate(new Date());

    const normalizedName = name.trim();
    if (!normalizedName) {
        throw new Error("模板名称不能为空");
    }

    const normalizedSlots = [...weekSlots, ...Array.from({ length: WEEKS_PER_MONTH }, () => "")]
        .slice(0, WEEKS_PER_MONTH)
        .map((slot, index) => {
            const normalized = String(slot ?? "").trim();
            return normalized || DEFAULT_WEEK_SLOTS[index] || "";
        });

    const existingIndex = state.weekSlotTemplates.findIndex((item) => item.name === normalizedName);
    if (existingIndex >= 0) {
        state.weekSlotTemplates[existingIndex] = {
            ...state.weekSlotTemplates[existingIndex],
            weekSlots: normalizedSlots,
            updatedAt: now
        };
    } else {
        state.weekSlotTemplates.unshift({
            id: `template-${Date.now()}`,
            name: normalizedName,
            weekSlots: normalizedSlots,
            createdAt: now,
            updatedAt: now
        });
    }

    writeWorkflowState(state);
    return state;
}

export function createWeeklyReview(): WorkflowState {
    const state = readWorkflowState();
    const now = new Date();
    const weekKey = getWeekKey(now);
    const monthKey = getMonthKey(now);

    const existing = state.weeklyReviews.find((item) => item.weekKey === weekKey);
    if (existing) {
        return state;
    }

    const publishedCount = state.tasks.filter((task) => task.weekKey === weekKey && task.status === "published").length;
    const draftedCount = state.tasks.filter((task) => task.weekKey === weekKey && task.status === "drafted").length;

    const review: WeeklyReview = {
        id: `${weekKey}-review`,
        weekKey,
        monthKey,
        summary: `本周发布 ${publishedCount} 篇，草稿待审 ${draftedCount} 篇。`,
        retrievalInbox: "",
        wins: "",
        blockers: "",
        actionItems: `下周优先处理高相关性主题，确保周目标 ${state.searchSettings.weeklyTaskTarget} 篇。`,
        createdAt: getIsoDate(now),
        updatedAt: getIsoDate(now)
    };

    state.weeklyReviews.unshift(review);
    writeWorkflowState(state);
    return state;
}

export function updateWeeklyReview(reviewId: string, updater: (review: WeeklyReview) => WeeklyReview): WorkflowState {
    const state = readWorkflowState();
    const index = state.weeklyReviews.findIndex((item) => item.id === reviewId);

    if (index === -1) {
        throw new Error("Weekly review not found");
    }

    state.weeklyReviews[index] = {
        ...updater(state.weeklyReviews[index]),
        updatedAt: getIsoDate(new Date())
    };

    writeWorkflowState(state);
    return state;
}

export function importWeeklyRetrievalInbox(reviewId: string): WorkflowState {
    const state = readWorkflowState();
    const review = state.weeklyReviews.find((item) => item.id === reviewId);

    if (!review) {
        throw new Error("Weekly review not found");
    }

    const queueLines = state.tasks
        .filter((task) => task.weekKey === review.weekKey)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((task) => `- [${task.category}] ${task.theme}`);

    const inbox = queueLines.join("\n");

    const index = state.weeklyReviews.findIndex((item) => item.id === reviewId);
    state.weeklyReviews[index] = {
        ...state.weeklyReviews[index],
        retrievalInbox: inbox,
        updatedAt: getIsoDate(new Date())
    };

    writeWorkflowState(state);
    return state;
}

export function applyCurrentWeekSlotToTasks(planId: string): WorkflowState {
    const now = new Date();
    const state = ensureWeeklyPlan(now);

    const weekKey = getWeekKey(now);
    const monthKey = getMonthKey(now);
    const slotIndex = getWeekSlotIndexInMonth(now);

    const plan = state.monthlyPlans.find((item) => item.id === planId && item.monthKey === monthKey);
    if (!plan) {
        throw new Error("Monthly plan not found for current month");
    }

    const slotText = String(plan.weekSlots[slotIndex] ?? "").trim();
    if (!slotText) {
        throw new Error(`Week ${slotIndex + 1} 周槽为空，无法应用到任务主题`);
    }

    state.tasks = state.tasks.map((task) => {
        if (task.weekKey !== weekKey) {
            return task;
        }

        const nextTheme = `${slotText} - ${CATEGORY_LABEL[task.category]}（第${task.sequence}篇）`;
        return {
            ...task,
            theme: nextTheme,
            topicNote: `来自月度规划 Week ${slotIndex + 1} 周槽自动应用：${slotText}`,
            updatedAt: getIsoDate(new Date())
        };
    });

    writeWorkflowState(state);
    return state;
}

function stripHtmlTags(input: string): string {
    return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

const SEARCH_THEME_TRANSLATION_MAP: Array<{ pattern: RegExp; token: string }> = [
    { pattern: /衰老|老龄|老化|抗衰/g, token: "aging" },
    { pattern: /睡眠|失眠/g, token: "sleep" },
    { pattern: /节律|昼夜/g, token: "circadian" },
    { pattern: /炎症/g, token: "inflammation" },
    { pattern: /肌肉|肌少|肌肉衰减/g, token: "sarcopenia" },
    { pattern: /力量|抗阻/g, token: "resistance training" },
    { pattern: /认知|记忆|注意力/g, token: "cognitive" },
    { pattern: /饮食|营养/g, token: "nutrition" },
    { pattern: /社交|孤独|情绪/g, token: "social" },
    { pattern: /代谢|血糖|胰岛素/g, token: "metabolic" },
    { pattern: /心血管|血压|心脏/g, token: "cardiovascular" }
];

function mapThemeToEnglishTokens(theme: string): string[] {
    const tokens: string[] = [];

    for (const entry of SEARCH_THEME_TRANSLATION_MAP) {
        entry.pattern.lastIndex = 0;
        if (entry.pattern.test(theme)) {
            tokens.push(entry.token);
        }
    }

    return Array.from(new Set(tokens));
}

async function translateThemeForSearch(theme: string): Promise<string> {
    const source = theme.trim();
    if (!source) {
        return "";
    }

    if (!hasChineseText(source)) {
        return source;
    }

    const mappedTokens = mapThemeToEnglishTokens(source);
    if (mappedTokens.length > 0) {
        return mappedTokens.join(" ");
    }

    const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();

    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return source;
        }

        try {
            const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
            const response = await fetch("https://api.openai.com/v1/responses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    input: `Translate this Chinese health topic into concise English search keywords only (max 12 words): ${source}`
                }),
                cache: "no-store"
            });

            if (!response.ok) {
                return source;
            }

            const payload = await response.json() as { output_text?: string };
            const translated = String(payload.output_text ?? "").replace(/\s+/g, " ").trim();
            return translated || source;
        } catch {
            return source;
        }
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return source;
    }

    try {
        const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content: "You translate Chinese health topics into concise English academic search keywords only."
                    },
                    {
                        role: "user",
                        content: `Translate this topic into concise English search keywords only (max 12 words): ${source}`
                    }
                ],
                temperature: 0.1
            }),
            cache: "no-store"
        });

        if (!response.ok) {
            return source;
        }

        const payload = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        const translated = payload.choices?.[0]?.message?.content?.replace(/\s+/g, " ").trim() ?? "";
        return translated || source;
    } catch {
        return source;
    }
}

function normalizeThemeForQuery(theme: string): string {
    return theme
        .replace(/（第\d+篇）/g, "")
        .replace(/\(第\d+篇\)/g, "")
        .trim();
}

function buildSearchTerms(category: PaperLibrarySearchCategory, theme: string): string[] {
    const normalizedTheme = normalizeThemeForQuery(theme);
    const mapped = THEME_KEYWORD_MAP
        .filter((entry) => {
            entry.pattern.lastIndex = 0;
            return entry.pattern.test(normalizedTheme);
        })
        .map((entry) => entry.token);

    const freeTextTheme = normalizedTheme.toLowerCase();
    const categoryTerms = category === "other" ? [] : (CATEGORY_SEARCH_TERMS[category] ?? []);

    const allTerms: string[] = [];
    for (const term of categoryTerms) {
        allTerms.push(term);
    }
    for (const term of mapped) {
        allTerms.push(term);
    }
    if (freeTextTheme) {
        allTerms.push(freeTextTheme);
    }

    const hasThemeSignal = mapped.length > 0 || /[a-z0-9]/i.test(freeTextTheme);
    if (hasThemeSignal) {
        allTerms.push("older adults");
    } else {
        allTerms.push("aging", "healthspan", "older adults", "longevity");
    }

    return Array.from(new Set(allTerms));
}

function parsePublicationYear(value: unknown): number | null {
    const currentYear = new Date().getFullYear();

    if (typeof value === "number" && value >= 1900 && value <= currentYear + 1) {
        return value;
    }

    if (typeof value === "string") {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric >= 1900 && numeric <= currentYear + 1) {
            return Math.trunc(numeric);
        }
        return null;
    }

    if (Array.isArray(value) && value.length > 0) {
        return parsePublicationYear(value[0]);
    }

    if (typeof value === "object" && value) {
        const candidate = value as Record<string, unknown>;
        if ("date-parts" in candidate) {
            return parsePublicationYear(candidate["date-parts"]);
        }
    }

    return null;
}

function buildRelevanceScore(candidate: PaperCandidate, terms: string[]): number {
    const haystack = `${candidate.title} ${candidate.abstract ?? ""} ${candidate.journal}`.toLowerCase();
    const score = terms.reduce((sum, term) => {
        const normalized = term.toLowerCase();
        return haystack.includes(normalized) ? sum + 1 : sum;
    }, 0);

    return score;
}

function rankCandidatesByRelevance(
    candidates: PaperCandidate[],
    terms: string[],
    settings: SearchSettings
): PaperCandidate[] {
    const recent = candidates.filter((candidate) => {
        const yearNum = Number(candidate.year);
        return Number.isFinite(yearNum) ? yearNum >= settings.sinceYear : false;
    });

    const scored = recent.map((candidate) => ({ candidate, score: buildRelevanceScore(candidate, terms) }));
    let filtered = scored.filter((item) => item.score >= settings.minRelevanceScore);

    if (filtered.length === 0 && scored.length > 0 && settings.minRelevanceScore > 1) {
        filtered = scored.filter((item) => item.score >= 1);
    }

    if (filtered.length === 0) {
        filtered = scored;
    }

    return filtered
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            return Number(right.candidate.year) - Number(left.candidate.year);
        })
        .slice(0, settings.maxResultsPerSource)
        .map((item) => item.candidate);
}

function parseCrossrefAuthors(authorField: unknown): string {
    if (!Array.isArray(authorField)) {
        return "Unknown";
    }

    const names = authorField
        .slice(0, 6)
        .map((author) => {
            const family = typeof author === "object" && author && "family" in author ? String(author.family ?? "") : "";
            const given = typeof author === "object" && author && "given" in author ? String(author.given ?? "") : "";
            return `${given} ${family}`.trim();
        })
        .filter(Boolean);

    return names.length > 0 ? names.join(", ") : "Unknown";
}

async function searchCrossrefByTheme(
    category: PaperLibrarySearchCategory,
    theme: string,
    settings: SearchSettings,
    page = 1
): Promise<PaperCandidate[]> {
    const terms = buildSearchTerms(category, theme);
    const query = encodeURIComponent(terms.join(" "));
    const rows = Math.min(100, settings.maxResultsPerSource * 4);
    const safePage = Math.max(1, Math.trunc(page));
    const offset = Math.max(0, (safePage - 1) * settings.maxResultsPerSource);
    const url = `https://api.crossref.org/works?rows=${rows}&offset=${offset}&sort=published&order=desc&filter=from-pub-date:${settings.sinceYear}-01-01,type:journal-article&query.bibliographic=${query}`;

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Finger5D-Admin/1.0 (mailto:contact@finger5d.com)"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            return [];
        }

        const payload = await response.json() as {
            message?: {
                items?: Array<Record<string, unknown>>;
            };
        };

        const items = payload.message?.items ?? [];

        const mapped = items.map((item, index) => {
            const titleArray = item.title;
            const title = Array.isArray(titleArray) && titleArray.length > 0 ? String(titleArray[0]) : "Untitled paper";
            const publishedYear = parsePublicationYear(item.issued)
                ?? parsePublicationYear(item["published-print"])
                ?? parsePublicationYear(item["published-online"]);
            const year = publishedYear ? String(publishedYear) : "Unknown";
            const doi = typeof item.DOI === "string" ? item.DOI : undefined;
            const abstract = typeof item.abstract === "string" ? stripHtmlTags(item.abstract) : undefined;
            const paperUrl = typeof item.URL === "string"
                ? item.URL
                : (doi ? `https://doi.org/${doi}` : "https://www.crossref.org/");

            return {
                id: `crossref-${doi ?? `idx-${index}`}`,
                source: "crossref",
                title,
                authors: parseCrossrefAuthors(item.author),
                journal: Array.isArray(item["container-title"]) && item["container-title"].length > 0
                    ? String(item["container-title"][0])
                    : "Unknown journal",
                year,
                doi,
                url: paperUrl,
                abstract
            } satisfies PaperCandidate;
        });

        return rankCandidatesByRelevance(mapped, terms, settings);
    } catch {
        return [];
    }
}

function parseOpenAlexAuthors(authorships: unknown): string {
    if (!Array.isArray(authorships)) {
        return "Unknown";
    }

    const names = authorships
        .slice(0, 6)
        .map((authorShip) => {
            if (typeof authorShip !== "object" || !authorShip || !("author" in authorShip)) {
                return "";
            }
            const author = authorShip.author;
            if (typeof author !== "object" || !author || !("display_name" in author)) {
                return "";
            }
            return String(author.display_name ?? "");
        })
        .filter(Boolean);

    return names.length > 0 ? names.join(", ") : "Unknown";
}

function parseOpenAlexAbstract(abstractIndex: unknown): string | undefined {
    if (!abstractIndex || typeof abstractIndex !== "object") {
        return undefined;
    }

    const positionMap = new Map<number, string>();
    Object.entries(abstractIndex as Record<string, unknown>).forEach(([word, positions]) => {
        if (!Array.isArray(positions)) {
            return;
        }
        positions.forEach((position) => {
            if (typeof position === "number") {
                positionMap.set(position, word);
            }
        });
    });

    if (positionMap.size === 0) {
        return undefined;
    }

    return [...positionMap.entries()]
        .sort((left, right) => left[0] - right[0])
        .map((entry) => entry[1])
        .join(" ");
}

async function searchOpenAlexByTheme(
    category: PaperLibrarySearchCategory,
    theme: string,
    settings: SearchSettings,
    page = 1
): Promise<PaperCandidate[]> {
    const terms = buildSearchTerms(category, theme);
    const query = encodeURIComponent(terms.join(" "));
    const rows = Math.min(100, settings.maxResultsPerSource * 4);
    const safePage = Math.max(1, Math.trunc(page));
    const url = `https://api.openalex.org/works?search=${query}&filter=from_publication_date:${settings.sinceYear}-01-01,type:article,is_retracted:false&sort=publication_date:desc&per-page=${rows}&page=${safePage}`;

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Finger5D-Admin/1.0 (mailto:contact@finger5d.com)"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            return [];
        }

        const payload = await response.json() as {
            results?: Array<Record<string, unknown>>;
        };

        const items = payload.results ?? [];

        const mapped = items.map((item, index) => {
            const doiRaw = typeof item.doi === "string" ? item.doi : undefined;
            const doi = doiRaw?.replace(/^https?:\/\/doi.org\//, "");

            const primaryLocation = item.primary_location;
            const sourceName = typeof primaryLocation === "object" && primaryLocation && "source" in primaryLocation
                ? primaryLocation.source
                : undefined;
            const journal = typeof sourceName === "object" && sourceName && "display_name" in sourceName
                ? String(sourceName.display_name ?? "Unknown journal")
                : "Unknown journal";

            const year = item.publication_year ? String(item.publication_year) : "Unknown";

            return {
                id: `openalex-${doi ?? item.id ?? `idx-${index}`}`,
                source: "openalex",
                title: typeof item.display_name === "string" ? item.display_name : "Untitled paper",
                authors: parseOpenAlexAuthors(item.authorships),
                journal,
                year,
                doi,
                url: typeof item.id === "string" ? item.id : (doi ? `https://doi.org/${doi}` : "https://api.openalex.org"),
                abstract: parseOpenAlexAbstract(item.abstract_inverted_index)
            } satisfies PaperCandidate;
        });

        return rankCandidatesByRelevance(mapped, terms, settings);
    } catch {
        return [];
    }
}

function parsePubMedYear(pubDate: string): string {
    const match = String(pubDate ?? "").match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : "Unknown";
}

/** 通过 efetch 拉取 PubMed 摘要（esummary 不包含摘要），一次请求多篇 */
async function fetchPubMedAbstracts(pmids: string[]): Promise<Map<string, string>> {
    if (pmids.length === 0) {
        return new Map();
    }
    const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
    const apiKey = process.env.NCBI_API_KEY ?? process.env.PUBMED_API_KEY;
    const apiKeySuffix = apiKey ? `&api_key=${encodeURIComponent(apiKey.trim())}` : "";
    const idParam = pmids.slice(0, 200).join(",");

    try {
        const res = await fetch(`${base}/efetch.fcgi?db=pubmed&id=${encodeURIComponent(idParam)}&retmode=xml${apiKeySuffix}`, {
            cache: "no-store"
        });
        if (!res.ok) {
            return new Map();
        }
        const xml = await res.text();
        const map = new Map<string, string>();
        const articleBlocks = xml.split(/<PubmedArticle>/i);
        for (let i = 1; i < articleBlocks.length; i++) {
            const block = articleBlocks[i];
            const pmIdMatch = block.match(/<ArticleId\s+IdType="pubmed">(\d+)<\/ArticleId>/);
            const pmid = pmIdMatch ? pmIdMatch[1] : "";
            const abstractMatch = block.match(/<Abstract>([\s\S]*?)<\/Abstract>/);
            if (!pmid || !abstractMatch) {
                continue;
            }
            const raw = abstractMatch[1]
                .replace(/<AbstractText[^>]*>/g, " ")
                .replace(/<\/AbstractText>/g, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            if (raw) {
                map.set(pmid, raw);
            }
        }
        return map;
    } catch {
        return new Map();
    }
}

async function searchPubMedByTheme(
    category: PaperLibrarySearchCategory,
    theme: string,
    settings: SearchSettings,
    page = 1
): Promise<PaperCandidate[]> {
    const terms = buildSearchTerms(category, theme);
    const queryText = `${terms.join(" ")} AND ("${settings.sinceYear}"[Date - Publication] : "3000"[Date - Publication])`;
    const query = encodeURIComponent(queryText);
    const rows = Math.min(100, settings.maxResultsPerSource * 4);
    const safePage = Math.max(1, Math.trunc(page));
    const retStart = Math.max(0, (safePage - 1) * settings.maxResultsPerSource);
    const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
    const apiKey = process.env.NCBI_API_KEY ?? process.env.PUBMED_API_KEY;
    const apiKeySuffix = apiKey ? `&api_key=${encodeURIComponent(apiKey.trim())}` : "";

    try {
        const searchResponse = await fetch(`${base}/esearch.fcgi?db=pubmed&retmode=json&retmax=${rows}&retstart=${retStart}&sort=pub+date&term=${query}${apiKeySuffix}`, {
            cache: "no-store"
        });

        if (!searchResponse.ok) {
            return [];
        }

        const searchPayload = await searchResponse.json() as {
            esearchresult?: {
                idlist?: string[];
            };
        };

        const idList = searchPayload.esearchresult?.idlist ?? [];
        if (idList.length === 0) {
            return [];
        }

        const [summaryResponse, abstractMap] = await Promise.all([
            fetch(`${base}/esummary.fcgi?db=pubmed&retmode=json&id=${encodeURIComponent(idList.join(","))}${apiKeySuffix}`, {
                cache: "no-store"
            }),
            fetchPubMedAbstracts(idList)
        ]);

        if (!summaryResponse.ok) {
            return [];
        }

        const summaryPayload = await summaryResponse.json() as {
            result?: Record<string, unknown> & {
                uids?: string[];
            };
        };

        const resultMap = summaryPayload.result ?? {};
        const uids = Array.isArray(resultMap.uids) ? resultMap.uids : idList;

        const mapped = uids.flatMap((uid, index) => {
            const item = resultMap[uid] as Record<string, unknown> | undefined;
            if (!item) {
                return [];
            }

            const authors = Array.isArray(item.authors)
                ? item.authors
                    .slice(0, 6)
                    .map((author) => (typeof author === "object" && author && "name" in author ? String((author as { name?: unknown }).name ?? "") : ""))
                    .filter(Boolean)
                    .join(", ")
                : "";

            const title = String(item.title ?? "Untitled paper").trim() || "Untitled paper";
            const pubdate = String(item.pubdate ?? item.sortpubdate ?? "");
            const year = parsePubMedYear(pubdate);

            return [{
                id: `pubmed-${uid || `idx-${index}`}`,
                source: "pubmed",
                title,
                authors: authors || "Unknown",
                journal: String(item.fulljournalname ?? item.source ?? "Unknown journal"),
                year,
                doi: undefined,
                url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
                abstract: abstractMap.get(String(uid)) ?? undefined
            } satisfies PaperCandidate];
        });

        return rankCandidatesByRelevance(mapped, terms, settings);
    } catch {
        return [];
    }
}

async function searchByExternalConnector(
    source: "webofscience" | "wanfang" | "cnki",
    category: PaperLibrarySearchCategory,
    theme: string,
    settings: SearchSettings,
    page = 1
): Promise<PaperCandidate[]> {
    const terms = buildSearchTerms(category, theme);
    const endpointBySource: Record<typeof source, string | undefined> = {
        webofscience: process.env.WOS_API_ENDPOINT,
        wanfang: process.env.WANFANG_API_ENDPOINT,
        cnki: process.env.CNKI_API_ENDPOINT
    };

    const tokenBySource: Record<typeof source, string | undefined> = {
        webofscience: process.env.WOS_API_KEY,
        wanfang: process.env.WANFANG_API_KEY,
        cnki: process.env.CNKI_API_KEY
    };

    const endpoint = endpointBySource[source];
    if (!endpoint) {
        return [];
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(tokenBySource[source] ? { Authorization: `Bearer ${tokenBySource[source]}` } : {})
            },
            body: JSON.stringify({
                terms,
                theme,
                page: Math.max(1, Math.trunc(page)),
                sinceYear: settings.sinceYear,
                maxResults: settings.maxResultsPerSource * 3
            }),
            cache: "no-store"
        });

        if (!response.ok) {
            return [];
        }

        const payload = await response.json() as {
            items?: Array<{
                title?: string;
                authors?: string;
                journal?: string;
                year?: string | number;
                doi?: string;
                url?: string;
                abstract?: string;
            }>;
        };

        const mapped = (payload.items ?? []).map((item, index) => ({
            id: `${source}-${item.doi ?? item.url ?? `idx-${index}`}`,
            source,
            title: String(item.title ?? "Untitled paper"),
            authors: String(item.authors ?? "Unknown"),
            journal: String(item.journal ?? "Unknown journal"),
            year: String(item.year ?? "Unknown"),
            doi: item.doi ? String(item.doi) : undefined,
            url: String(item.url ?? ""),
            abstract: item.abstract ? String(item.abstract) : undefined
        } satisfies PaperCandidate));

        return rankCandidatesByRelevance(mapped, terms, settings);
    } catch {
        return [];
    }
}

function dedupeCandidates(candidates: PaperCandidate[]): PaperCandidate[] {
    const seen = new Set<string>();
    const output: PaperCandidate[] = [];

    for (const candidate of candidates) {
        const key = (candidate.doi ? `doi:${candidate.doi.toLowerCase()}` : `title:${candidate.title.toLowerCase()}`).trim();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        output.push(candidate);
    }

    return output.sort((left, right) => {
        const leftYear = Number(left.year);
        const rightYear = Number(right.year);
        if (Number.isFinite(leftYear) && Number.isFinite(rightYear)) {
            return rightYear - leftYear;
        }
        if (Number.isFinite(rightYear)) {
            return 1;
        }
        if (Number.isFinite(leftYear)) {
            return -1;
        }
        return 0;
    });
}

async function fetchCrossrefMetadataByDoi(doiInput: string): Promise<PaperCandidate | null> {
    const doi = normalizeDoi(doiInput);
    if (!doi) {
        return null;
    }

    const endpoint = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    try {
        const response = await fetch(endpoint, {
            headers: {
                "User-Agent": "Finger5D-Admin/1.0 (mailto:contact@finger5d.com)"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json() as { message?: Record<string, unknown> };
        const item = payload.message;
        if (!item) {
            return null;
        }

        const titleArray = item.title;
        const title = Array.isArray(titleArray) && titleArray.length > 0 ? String(titleArray[0]) : "Untitled paper";
        const publishedYear = parsePublicationYear(item.issued)
            ?? parsePublicationYear(item["published-print"])
            ?? parsePublicationYear(item["published-online"]);
        const year = publishedYear ? String(publishedYear) : "Unknown";
        const abstract = typeof item.abstract === "string" ? stripHtmlTags(item.abstract) : undefined;
        const paperUrl = typeof item.URL === "string"
            ? item.URL
            : `https://doi.org/${doi}`;

        return {
            id: `crossref-${doi}`,
            source: "crossref",
            title,
            authors: parseCrossrefAuthors(item.author),
            journal: Array.isArray(item["container-title"]) && item["container-title"].length > 0
                ? String(item["container-title"][0])
                : "Unknown journal",
            year,
            doi,
            url: paperUrl,
            abstract
        } satisfies PaperCandidate;
    } catch {
        return null;
    }
}

async function fetchCrossrefMetadataByTitle(title: string): Promise<PaperCandidate | null> {
    const normalizedTitle = String(title ?? "").trim();
    if (!normalizedTitle) {
        return null;
    }

    const endpoint = `https://api.crossref.org/works?rows=1&sort=score&order=desc&query.title=${encodeURIComponent(normalizedTitle)}`;
    try {
        const response = await fetch(endpoint, {
            headers: {
                "User-Agent": "Finger5D-Admin/1.0 (mailto:contact@finger5d.com)"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json() as {
            message?: {
                items?: Array<Record<string, unknown>>;
            };
        };

        const item = payload.message?.items?.[0];
        if (!item) {
            return null;
        }

        const doi = typeof item.DOI === "string" ? item.DOI : "";
        if (!doi) {
            return null;
        }

        return fetchCrossrefMetadataByDoi(doi);
    } catch {
        return null;
    }
}

async function saveOriginalPdfToLibrary(pdfUrl: string, titleOrFallback: string): Promise<string | null> {
    const normalizedUrl = String(pdfUrl ?? "").trim();
    if (!normalizedUrl) {
        return null;
    }

    const response = await fetch(normalizedUrl, { cache: "no-store" });
    if (!response.ok) {
        return null;
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const extension = contentType.includes("application/pdf") ? ".pdf" : ".txt";

    const libraryDir = path.join(DATA_DIR, "paper-library");
    if (!fs.existsSync(libraryDir)) {
        fs.mkdirSync(libraryDir, { recursive: true });
    }

    const safeName = sanitizeFileName(titleOrFallback, `external-${Date.now()}`);
    const fileName = `${safeName}-原文${extension}`;
    const filePath = path.join(libraryDir, fileName);

    if (extension === ".pdf") {
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
    } else {
        const text = await response.text();
        fs.writeFileSync(filePath, text, "utf8");
    }

    return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function extractDoiFromText(input: string): string {
    const normalized = String(input ?? "").trim();
    if (!normalized) {
        return "";
    }

    const direct = normalizeDoi(normalized);
    if (direct) {
        return direct;
    }

    const matched = normalized.match(/10\.\d{4,9}\/[\-._;()/:A-Z0-9]+/i);
    return normalizeDoi(matched?.[0] ?? "");
}

function inferTitleFromUrlPath(url: string): string {
    try {
        const parsed = new URL(url);
        const rawName = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
        const withoutExt = rawName.replace(/\.[a-z0-9]{2,6}$/i, "");
        const decoded = decodeURIComponent(withoutExt)
            .replace(/[_+\-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return decoded;
    } catch {
        return "";
    }
}

async function inferTitleFromSourceUrl(url: string): Promise<string> {
    const normalizedUrl = String(url ?? "").trim();
    if (!normalizedUrl) {
        return "";
    }

    try {
        const response = await fetch(normalizedUrl, { cache: "no-store" });
        if (!response.ok) {
            return inferTitleFromUrlPath(normalizedUrl);
        }

        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        if (contentType.includes("text/html")) {
            const html = await response.text();
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const pageTitle = String(titleMatch?.[1] ?? "")
                .replace(/\s+/g, " ")
                .trim();
            if (pageTitle) {
                return pageTitle;
            }
        }

        return inferTitleFromUrlPath(normalizedUrl);
    } catch {
        return inferTitleFromUrlPath(normalizedUrl);
    }
}

export async function importPaperLibraryItemFromExternal(input: {
    title?: string;
    doi?: string;
    sourceUrl?: string;
    pdfUrl?: string;
    category?: FiveDCategory;
    themeSeed?: string;
    keywords?: string[];
}): Promise<{ state: WorkflowState; reused: boolean; importedId: string }> {
    const state = readWorkflowState();
    const titleInput = String(input.title ?? "").trim();
    const doiInput = normalizeDoi(String(input.doi ?? ""));
    const sourceUrlInput = String(input.sourceUrl ?? "").trim();
    const pdfUrlInput = String(input.pdfUrl ?? "").trim();

    if (!titleInput && !doiInput && !sourceUrlInput) {
        throw new Error("请至少提供标题、DOI 或来源链接之一");
    }

    const doiFromUrl = extractDoiFromText(sourceUrlInput);
    const effectiveDoi = doiInput || doiFromUrl;

    const metadata = effectiveDoi
        ? await fetchCrossrefMetadataByDoi(effectiveDoi)
        : await fetchCrossrefMetadataByTitle(titleInput);

    const inferredTitleFromUrl = (!metadata?.title && !titleInput && sourceUrlInput)
        ? await inferTitleFromSourceUrl(sourceUrlInput)
        : "";

    const now = getIsoDate(new Date());
    const normalizedCategory = input.category ?? "cardio";
    const themeSeed = String(input.themeSeed ?? "外部导入").trim() || "外部导入";
    const importedKeywords = Array.from(
        new Set((input.keywords ?? []).map((k) => String(k).trim()).filter(Boolean))
    ).slice(0, 20);

    const candidate: PaperCandidate = {
        id: `external-${Date.now()}`,
        source: metadata?.source ?? "crossref",
        title: metadata?.title ?? (titleInput || inferredTitleFromUrl || "Untitled paper"),
        authors: metadata?.authors ?? "Unknown",
        journal: metadata?.journal ?? "Unknown journal",
        year: metadata?.year ?? "Unknown",
        doi: metadata?.doi ?? (effectiveDoi || undefined),
        url: sourceUrlInput || metadata?.url || (effectiveDoi ? `https://doi.org/${effectiveDoi}` : ""),
        abstract: metadata?.abstract
    };

    const key = getPaperLibraryKey(candidate);
    const existingIndex = state.paperLibrary.findIndex((item) => getExistingPaperLibraryItemKey(item) === key);

    const downloadedOriginalPath = await saveOriginalPdfToLibrary(pdfUrlInput || candidate.url, candidate.title);

    if (existingIndex >= 0) {
        const existing = state.paperLibrary[existingIndex];
        const mergedKeywords = importedKeywords.length > 0
            ? Array.from(new Set([...(existing.keywords ?? []), ...importedKeywords])).slice(0, 20)
            : existing.keywords;
        const merged: PaperLibraryItem = {
            ...existing,
            title: existing.title || candidate.title,
            authors: existing.authors === "Unknown" ? candidate.authors : existing.authors,
            journal: existing.journal === "Unknown journal" ? candidate.journal : existing.journal,
            year: existing.year === "Unknown" ? candidate.year : existing.year,
            doi: existing.doi ?? candidate.doi,
            url: existing.url || candidate.url,
            abstract: existing.abstract ?? candidate.abstract,
            abstractEn: existing.abstractEn ?? candidate.abstract,
            category: normalizedCategory,
            themeSeed,
            searchScope: "other",
            keywords: mergedKeywords,
            originalFilePath: existing.originalFilePath ?? downloadedOriginalPath ?? undefined,
            updatedAt: now
        };

        merged.gbtCitation = buildGbt7714Citation({
            authors: merged.authors,
            title: merged.title,
            journal: merged.journal,
            year: merged.year,
            referenceTypeCode: merged.referenceTypeCode ?? "J",
            doi: merged.doi,
            url: merged.url
        });

        state.paperLibrary[existingIndex] = merged;
        writeWorkflowState(state);
        return { state, reused: true, importedId: merged.id };
    }

    const item: PaperLibraryItem = {
        ...candidate,
        id: `library-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        key,
        category: normalizedCategory,
        themeSeed,
        searchScope: "other",
        keywords: importedKeywords,
        abstractEn: candidate.abstract,
        abstractZh: undefined,
        referenceTypeCode: "J",
        gbtCitation: buildGbt7714Citation({
            authors: candidate.authors,
            title: candidate.title,
            journal: candidate.journal,
            year: candidate.year,
            referenceTypeCode: "J",
            doi: candidate.doi,
            url: candidate.url
        }),
        adopted: false,
        originalFilePath: downloadedOriginalPath ?? undefined,
        createdAt: now,
        updatedAt: now
    };

    state.paperLibrary.unshift(item);
    writeWorkflowState(state);
    return { state, reused: false, importedId: item.id };
}

function hasChineseText(input: string): boolean {
    return /[\u4e00-\u9fff]/.test(input);
}

function stripJsonCodeFence(input: string): string {
    return input
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();
}

function parseTranslatedTitles(raw: string, expectedLength: number): Map<number, string> {
    const cleaned = stripJsonCodeFence(raw);
    const parsed = JSON.parse(cleaned) as Array<{ index?: number; zhTitle?: string }>;

    if (!Array.isArray(parsed)) {
        return new Map();
    }

    const output = new Map<number, string>();

    for (const item of parsed) {
        const index = Number(item.index);
        const zhTitle = String(item.zhTitle ?? "").trim();
        if (!Number.isFinite(index) || index < 0 || index >= expectedLength || !zhTitle) {
            continue;
        }
        output.set(index, zhTitle);
    }

    return output;
}

async function translatePaperTitlesToChinese(candidates: PaperCandidate[]): Promise<PaperCandidate[]> {
    const translateTargets = candidates
        .map((candidate, index) => ({ candidate, index }))
        .filter(({ candidate }) => !hasChineseText(candidate.title));

    if (translateTargets.length === 0) {
        return candidates.map((candidate) => ({
            ...candidate,
            titleZh: candidate.titleZh ?? candidate.title
        }));
    }

    const promptLines = translateTargets
        .map(({ candidate, index }) => `${index}: ${candidate.title}`)
        .join("\n");

    const prompt = `请将以下英文论文标题翻译为简体中文，只返回 JSON 数组，不要额外说明。\n\n格式：[{\"index\":0,\"zhTitle\":\"...\"}]\n要求：\n1) index 必须与输入一致。\n2) 术语准确，不夸张。\n3) 保留医学/科研语义。\n\n标题列表：\n${promptLines}`;

    const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
    let translatedMap = new Map<number, string>();

    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            try {
                const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
                const response = await fetch("https://api.openai.com/v1/responses", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model,
                        input: prompt
                    }),
                    cache: "no-store"
                });

                if (response.ok) {
                    const payload = await response.json() as { output_text?: string };
                    const text = String(payload.output_text ?? "").trim();
                    if (text) {
                        translatedMap = parseTranslatedTitles(text, candidates.length);
                    }
                }
            } catch {
                translatedMap = new Map();
            }
        }
    } else {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (apiKey) {
            try {
                const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
                const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            {
                                role: "system",
                                content: "你是严谨的学术翻译助手，只输出用户要求的 JSON。"
                            },
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.2
                    }),
                    cache: "no-store"
                });

                if (response.ok) {
                    const payload = await response.json() as {
                        choices?: Array<{ message?: { content?: string } }>;
                    };
                    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
                    if (text) {
                        translatedMap = parseTranslatedTitles(text, candidates.length);
                    }
                }
            } catch {
                translatedMap = new Map();
            }
        }
    }

    return candidates.map((candidate, index) => ({
        ...candidate,
        titleZh: translatedMap.get(index) || candidate.titleZh || candidate.title
    }));
}

export async function searchPapersByTheme(
    category: PaperLibrarySearchCategory,
    theme: string,
    settings: SearchSettings,
    page = 1
): Promise<PaperCandidate[]> {
    const translatedTheme = await translateThemeForSearch(theme);
    const effectiveTheme = translatedTheme && translatedTheme !== theme
        ? `${theme} ${translatedTheme}`
        : theme;

    const jobs: Array<Promise<PaperCandidate[]>> = [];

    if (settings.sourceWhitelist.includes("crossref")) {
        jobs.push(searchCrossrefByTheme(category, effectiveTheme, settings, page));
    }

    if (settings.sourceWhitelist.includes("openalex")) {
        jobs.push(searchOpenAlexByTheme(category, effectiveTheme, settings, page));
    }

    if (settings.sourceWhitelist.includes("pubmed")) {
        jobs.push(searchPubMedByTheme(category, effectiveTheme, settings, page));
    }

    if (settings.sourceWhitelist.includes("webofscience")) {
        jobs.push(searchByExternalConnector("webofscience", category, effectiveTheme, settings, page));
    }

    if (settings.sourceWhitelist.includes("wanfang")) {
        jobs.push(searchByExternalConnector("wanfang", category, effectiveTheme, settings, page));
    }

    if (settings.sourceWhitelist.includes("cnki")) {
        jobs.push(searchByExternalConnector("cnki", category, effectiveTheme, settings, page));
    }

    if (jobs.length === 0) {
        return [];
    }

    const results = await Promise.all(jobs);
    const deduped = dedupeCandidates(results.flat());
    return translatePaperTitlesToChinese(deduped);
}

function normalizeDoi(value: string | undefined): string {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\/doi\.org\//, "");
}

function getPaperLibraryKey(candidate: Pick<PaperCandidate, "doi" | "url" | "title">): string {
    const doi = normalizeDoi(candidate.doi);
    if (doi) {
        return `doi:${doi}`;
    }

    const url = String(candidate.url ?? "").trim().toLowerCase();
    if (url) {
        return `url:${url}`;
    }

    return `title:${candidate.title.trim().toLowerCase()}`;
}

function getExistingPaperLibraryItemKey(item: PaperLibraryItem): string {
    const key = String(item.key ?? "").trim().toLowerCase();
    if (key) {
        return key;
    }

    return getPaperLibraryKey({
        doi: item.doi,
        url: item.url,
        title: item.title
    });
}

function buildGbt7714Citation(input: {
    authors: string;
    title: string;
    journal: string;
    year: string;
    referenceTypeCode?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
    url?: string;
}): string {
    const authors = String(input.authors ?? "").trim() || "佚名";
    const title = String(input.title ?? "").trim() || "未命名文献";
    const journal = String(input.journal ?? "").trim() || "未知刊物";
    const year = String(input.year ?? "").trim() || "n.d.";
    const typeCode = String(input.referenceTypeCode ?? "J").trim().toUpperCase() || "J";
    const volume = String(input.volume ?? "").trim();
    const issue = String(input.issue ?? "").trim();
    const pages = String(input.pages ?? "").trim();
    const doi = String(input.doi ?? "").trim();
    const url = String(input.url ?? "").trim();

    const periodicalDetail = [
        year,
        volume ? (issue ? `${volume}(${issue})` : volume) : (issue ? `(${issue})` : ""),
        pages ? `:${pages}` : ""
    ].filter(Boolean).join(", ");

    const base = `${authors}. ${title}[${typeCode}]. ${journal}, ${periodicalDetail}.`;
    if (doi) {
        return `${base} DOI:${doi}.`;
    }
    if (url) {
        return `${base} ${url}`;
    }
    return base;
}

export function getPaperLibrary(): PaperLibraryItem[] {
    const state = readWorkflowState();
    return state.paperLibrary;
}

export function updatePaperLibraryKeywords(itemId: string, keywords: string[]): WorkflowState {
    const state = readWorkflowState();
    const index = state.paperLibrary.findIndex((item) => item.id === itemId);

    if (index < 0) {
        throw new Error("论文库条目不存在");
    }

    const normalizedKeywords = Array.from(
        new Set(
            (keywords ?? [])
                .map((keyword) => String(keyword ?? "").trim())
                .filter(Boolean)
        )
    ).slice(0, 20);

    state.paperLibrary[index] = {
        ...state.paperLibrary[index],
        keywords: normalizedKeywords,
        updatedAt: getIsoDate(new Date())
    };

    writeWorkflowState(state);
    return state;
}

export function updatePaperLibraryMeta(
    itemId: string,
    updates: { adopted?: boolean; storageCategory?: string }
): WorkflowState {
    const state = readWorkflowState();
    const index = state.paperLibrary.findIndex((item) => item.id === itemId);

    if (index < 0) {
        throw new Error("论文库条目不存在");
    }

    const now = getIsoDate(new Date());
    const current = state.paperLibrary[index];
    const normalizedStorageCategory = updates.storageCategory === undefined
        ? current.storageCategory
        : (String(updates.storageCategory).trim() || undefined);
    const nextAdopted = updates.adopted === undefined ? current.adopted : updates.adopted;

    state.paperLibrary[index] = {
        ...current,
        storageCategory: normalizedStorageCategory,
        adopted: Boolean(nextAdopted),
        adoptedAt: nextAdopted ? (current.adoptedAt ?? now) : undefined,
        updatedAt: now
    };

    writeWorkflowState(state);
    return state;
}

/** 生成草稿时标记论文采纳并永久保存，记录采纳日期、周、月供运营复盘 */
export function markPaperLibraryItemAdoptedOnDraftGeneration(
    state: WorkflowState,
    itemId: string
): WorkflowState {
    const index = state.paperLibrary.findIndex((item) => item.id === itemId);
    if (index < 0) {
        return state;
    }
    const now = new Date();
    state.paperLibrary[index] = {
        ...state.paperLibrary[index],
        adopted: true,
        adoptedAt: getIsoDate(now),
        adoptedWeekKey: getWeekKey(now),
        adoptedMonthKey: getMonthKey(now),
        updatedAt: getIsoDate(now)
    };
    writeWorkflowState(state);
    return state;
}

export function updatePaperLibraryRecord(
    itemId: string,
    updates: {
        title?: string;
        titleZh?: string;
        authors?: string;
        journal?: string;
        year?: string;
        doi?: string;
        url?: string;
        abstractEn?: string;
        abstractZh?: string;
        customCategories?: string[];
        referenceTypeCode?: string;
        volume?: string;
        issue?: string;
        pages?: string;
    }
): WorkflowState {
    const state = readWorkflowState();
    const index = state.paperLibrary.findIndex((item) => item.id === itemId);

    if (index < 0) {
        throw new Error("论文库条目不存在");
    }

    const current = state.paperLibrary[index];
    const nextCustomCategories = Array.isArray(updates.customCategories)
        ? Array.from(new Set(updates.customCategories.map((value) => String(value ?? "").trim()).filter(Boolean))).slice(0, 20)
        : current.customCategories;

    const next: PaperLibraryItem = {
        ...current,
        title: updates.title === undefined ? current.title : String(updates.title ?? "").trim() || current.title,
        titleZh: updates.titleZh === undefined ? current.titleZh : (String(updates.titleZh ?? "").trim() || undefined),
        authors: updates.authors === undefined ? current.authors : String(updates.authors ?? "").trim() || current.authors,
        journal: updates.journal === undefined ? current.journal : String(updates.journal ?? "").trim() || current.journal,
        year: updates.year === undefined ? current.year : String(updates.year ?? "").trim() || current.year,
        doi: updates.doi === undefined ? current.doi : (String(updates.doi ?? "").trim() || undefined),
        url: updates.url === undefined ? current.url : String(updates.url ?? "").trim() || current.url,
        abstractEn: updates.abstractEn === undefined ? current.abstractEn : (String(updates.abstractEn ?? "").trim() || undefined),
        abstractZh: updates.abstractZh === undefined ? current.abstractZh : (String(updates.abstractZh ?? "").trim() || undefined),
        customCategories: nextCustomCategories,
        referenceTypeCode: updates.referenceTypeCode === undefined
            ? (current.referenceTypeCode ?? "J")
            : (String(updates.referenceTypeCode ?? "").trim().toUpperCase() || "J"),
        volume: updates.volume === undefined ? current.volume : (String(updates.volume ?? "").trim() || undefined),
        issue: updates.issue === undefined ? current.issue : (String(updates.issue ?? "").trim() || undefined),
        pages: updates.pages === undefined ? current.pages : (String(updates.pages ?? "").trim() || undefined),
        updatedAt: getIsoDate(new Date())
    };

    next.gbtCitation = buildGbt7714Citation({
        authors: next.authors,
        title: next.title,
        journal: next.journal,
        year: next.year,
        referenceTypeCode: next.referenceTypeCode,
        volume: next.volume,
        issue: next.issue,
        pages: next.pages,
        doi: next.doi,
        url: next.url
    });

    state.paperLibrary[index] = next;
    writeWorkflowState(state);
    return state;
}

export function deletePaperLibraryItem(itemId: string): WorkflowState {
    const state = readWorkflowState();
    const index = state.paperLibrary.findIndex((item) => item.id === itemId);

    if (index < 0) {
        throw new Error("论文库条目不存在");
    }

    const adoptedTask = state.tasks.find((task) =>
        ["drafted", "approved", "published"].includes(task.status)
        && task.selectedPaperId === itemId
    );
    if (adoptedTask) {
        throw new Error("该论文已采纳并进入执行流程，需永久保存，不可删除");
    }

    state.paperLibrary.splice(index, 1);
    writeWorkflowState(state);
    return state;
}

/**
 * 从论文库取可入选当期的候选论文。按产品逻辑「论文入库即为全文已下载并保存」，
 * 仅返回已保存全文（originalFilePath）的条目，供执行模块选取。
 */
export function getPaperLibraryCandidates(category: FiveDCategory, theme: string): PaperCandidate[] {
    const state = readWorkflowState();
    const normalizedTheme = theme.trim().toLowerCase();

    const matched = state.paperLibrary.filter((item) => {
        if (!item.originalFilePath) {
            return false;
        }
        if (item.searchScope === "other") {
            return true;
        }

        if (item.category === category) {
            return true;
        }

        if (!normalizedTheme) {
            return false;
        }

        return item.title.toLowerCase().includes(normalizedTheme)
            || item.themeSeed.toLowerCase().includes(normalizedTheme);
    });

    return matched.map((item) => ({
        id: item.id,
        source: item.source,
        title: item.title,
        titleZh: item.titleZh,
        authors: item.authors,
        journal: item.journal,
        year: item.year,
        doi: item.doi,
        url: item.url,
        abstract: item.abstract
    }));
}

/**
 * 从论文库确认入选当期：将已下载全文的论文填入本周第一个未选论文的任务槽。
 * 执行模块当期最多 10 篇（由 weeklyTaskTarget 决定），超出则保留在库留用。
 */
export function adoptLibraryItemToCurrentPeriod(itemId: string): {
    state: WorkflowState;
    adopted: boolean;
    message?: string;
    taskId?: string;
} {
    const state = readWorkflowState();
    const libraryItem = state.paperLibrary.find((item) => item.id === itemId);
    if (!libraryItem) {
        throw new Error("论文库条目不存在");
    }
    if (!libraryItem.originalFilePath) {
        throw new Error("仅已下载全文的论文可入选当期，请先在库内下载全文");
    }

    const currentWeekKey = state.lastSyncedWeekKey;
    if (!currentWeekKey) {
        throw new Error("请先在执行模块同步本周规划后再入选当期");
    }

    const weekTasks = state.tasks
        .filter((task) => task.weekKey === currentWeekKey)
        .sort((a, b) => {
            const catOrder = FIVE_D_CATEGORIES.indexOf(a.category) - FIVE_D_CATEGORIES.indexOf(b.category);
            return catOrder !== 0 ? catOrder : a.sequence - b.sequence;
        });
    const emptyTask = weekTasks.find((task) => !task.selectedPaperId);
    if (!emptyTask) {
        return {
            state,
            adopted: false,
            message: "当期已满（最多10篇），论文将保留在库留用"
        };
    }

    const candidate: PaperCandidate = {
        id: libraryItem.id,
        source: libraryItem.source,
        title: libraryItem.title,
        titleZh: libraryItem.titleZh,
        authors: libraryItem.authors,
        journal: libraryItem.journal,
        year: libraryItem.year,
        doi: libraryItem.doi,
        url: libraryItem.url,
        abstract: libraryItem.abstract,
        abstractEn: libraryItem.abstractEn,
        abstractZh: libraryItem.abstractZh
    };

    const nextState = updateTask(emptyTask.id, (task) =>
        appendTaskOperationLog(
            {
                ...task,
                paperCandidates: [candidate],
                selectedPaperId: libraryItem.id,
                status: "paper_selected"
            },
            {
                action: "adopt_to_period",
                actor: "系统",
                detail: "从论文库确认入选当期"
            }
        )
    );

    return { state: nextState, adopted: true, taskId: emptyTask.id };
}

/**
 * 按自定义关键字检索外部文献并写入论文库。
 * @param themeSeed 检索用自定义关键字（用户输入的查询词）
 * @param category 入库分类（打标用）
 * @param page 页码
 * @param initialKeywords 可选，入库时的关键字打标
 */
export async function searchAndSavePaperLibrary(
    themeSeed: string,
    category: PaperLibrarySearchCategory,
    page = 1,
    initialKeywords?: string[]
): Promise<{ state: WorkflowState; addedCount: number; matchedCount: number; reusedCount: number; requestedPage: number }> {
    const state = readWorkflowState();
    const normalizedTheme = themeSeed.trim();
    const safePage = Math.max(1, Math.trunc(page));
    const librarySearchSettings: SearchSettings = {
        ...state.searchSettings,
        maxResultsPerSource: LIBRARY_SEARCH_BATCH_SIZE
    };

    if (!normalizedTheme) {
        throw new Error("主题不能为空");
    }

    const rawCandidates = category === "other"
        ? dedupeCandidates(
            (
                await Promise.all(
                    FIVE_D_CATEGORIES.map((cat) => searchPapersByTheme(cat, normalizedTheme, librarySearchSettings, safePage))
                )
            ).flat()
        )
        : await searchPapersByTheme(category, normalizedTheme, librarySearchSettings, safePage);
    const deduped = dedupeCandidates(rawCandidates).slice(0, LIBRARY_SEARCH_BATCH_SIZE);
    // 符合检索条件的先下载标题并同时翻译标题，再进入论文库做待筛查
    const candidates = await translatePaperTitlesToChinese(deduped);
    const normalizedCategory: FiveDCategory = category === "other" ? "cardio" : category;
    const searchScope: "category" | "other" = category === "other" ? "other" : "category";
    const now = getIsoDate(new Date());
    const existingIndexByKey = new Map<string, number>();

    state.paperLibrary.forEach((item, index) => {
        existingIndexByKey.set(getExistingPaperLibraryItemKey(item), index);
    });

    let addedCount = 0;
    let reusedCount = 0;

    for (const candidate of candidates) {
        const key = getPaperLibraryKey(candidate);
        const existingIndex = existingIndexByKey.get(key);

        const normalizedKeywords = Array.from(
            new Set((initialKeywords ?? []).map((k) => String(k).trim()).filter(Boolean))
        ).slice(0, 20);

        if (existingIndex !== undefined) {
            const existing = state.paperLibrary[existingIndex];
            const mergedKeywords = Array.from(
                new Set([...(existing.keywords ?? []), ...normalizedKeywords])
            ).slice(0, 20);
            state.paperLibrary[existingIndex] = {
                ...existing,
                category: normalizedCategory,
                themeSeed: normalizedTheme,
                searchScope,
                keywords: mergedKeywords.length > 0 ? mergedKeywords : existing.keywords,
                updatedAt: now
            };
            reusedCount += 1;
            continue;
        }

        const item: PaperLibraryItem = {
            ...candidate,
            id: `library-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            key,
            category: normalizedCategory,
            themeSeed: normalizedTheme,
            searchScope,
            keywords: normalizedKeywords,
            abstractEn: candidate.abstractEn ?? candidate.abstract,
            abstractZh: candidate.abstractZh,
            referenceTypeCode: "J",
            gbtCitation: buildGbt7714Citation({
                authors: candidate.authors,
                title: candidate.title,
                journal: candidate.journal,
                year: candidate.year,
                referenceTypeCode: "J",
                doi: candidate.doi,
                url: candidate.url
            }),
            adopted: false,
            createdAt: now,
            updatedAt: now
        };

        state.paperLibrary.unshift(item);
        existingIndexByKey.set(key, 0);
        addedCount += 1;
    }

    writeWorkflowState(state);
    return { state, addedCount, matchedCount: candidates.length, reusedCount, requestedPage: safePage };
}

function estimateReadingTime(content: string): string {
    const plainText = content.replace(/[#*_`>\-\[\]()]/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = plainText.length;
    const minutes = Math.max(6, Math.round(wordCount / 350));
    return `${minutes} min`;
}

const DRAFT_TEMPLATE_LABEL: Record<DraftPromptTemplate, string> = {
    layered_progressive: "分层递进式",
    qa_dialogue: "问答对话式",
    compare_analysis: "对比辨析式",
    narrative_research: "叙事研究型",
    minimal_cards: "极简卡片式"
};

const DRAFT_STUDY_TEMPLATE_LABEL: Record<DraftStudyTemplate, string> = {
    auto: "自动识别",
    rct: "随机对照试验（RCT）",
    meta_analysis: "Meta分析",
    prospective_cohort: "前瞻性队列研究",
    retrospective_cohort: "回顾性队列研究",
    cross_sectional: "横断面研究",
    cohort: "队列研究",
    case_control: "病例对照研究",
    diagnostic_accuracy: "诊断试验准确性研究"
};

function detectStudyTemplateFromEvidence(paper: PaperCandidate, evidenceText: string): Exclude<DraftStudyTemplate, "auto"> {
    return detectStudyTemplateWithRule(paper, evidenceText).template;
}

function detectStudyTemplateWithRule(
    paper: PaperCandidate,
    evidenceText: string
): { template: Exclude<DraftStudyTemplate, "auto">; rule: string } {
    const corpus = `${paper.title}\n${paper.abstract ?? ""}\n${evidenceText.slice(0, 5000)}`.toLowerCase();

    if (/randomi[sz]ed|rct|double[- ]blind|placebo|trial|意向性治疗|itt|随机对照|双盲|安慰剂/.test(corpus)) {
        return { template: "rct", rule: "命中随机试验关键词（rct/randomized/double-blind/placebo）" };
    }

    if (/meta[- ]analysis|systematic review|forest plot|i\^?2|heterogeneity|publication bias|grade|系统综述|荟萃|异质性|漏斗图/.test(corpus)) {
        return { template: "meta_analysis", rule: "命中综述/异质性关键词（meta-analysis/systematic review/I²/heterogeneity）" };
    }

    if (/prospective\s+cohort|prospective\b|baseline|follow-up|time-to-event|person-years|cox\s+proportional\s+hazards|survival\s+analysis/.test(corpus)) {
        return { template: "prospective_cohort", rule: "命中前瞻队列关键词（prospective/follow-up/person-years/Cox）" };
    }

    if (/retrospective\s+cohort|retrospective\b|historical\s+cohort|registry\s+cohort/.test(corpus)) {
        return { template: "retrospective_cohort", rule: "命中回顾队列关键词（retrospective/historical cohort）" };
    }

    if (/cross-sectional|cross\s+sectional|prevalence|survey|single\s+time\s+point|snapshot/.test(corpus)) {
        return { template: "cross_sectional", rule: "命中横断面关键词（cross-sectional/prevalence/survey）" };
    }

    if (/cohort|longitudinal|hazard ratio|hr\b|队列|随访|纵向/.test(corpus)) {
        return { template: "cohort", rule: "命中泛队列关键词（cohort/longitudinal/HR）" };
    }

    if (/case[- ]control|odds ratio|\bor\b|matched|病例对照|回顾性|匹配/.test(corpus)) {
        return { template: "case_control", rule: "命中病例对照关键词（case-control/OR/matched）" };
    }

    if (/sensitivity|specificity|auc|roc|ppv|npv|diagnostic|screening|gold standard|灵敏度|特异度|诊断|筛查|金标准/.test(corpus)) {
        return { template: "diagnostic_accuracy", rule: "命中诊断准确性关键词（sensitivity/specificity/AUC/ROC/PPV/NPV）" };
    }

    return { template: "cohort", rule: "未命中强特征，按默认规则归类为队列研究（待人工复核）" };
}

function extractStudyDetectionEvidence(
    template: Exclude<DraftStudyTemplate, "auto">,
    paper: PaperCandidate,
    evidenceText: string
): string[] {
    const sourceText = `${paper.title}. ${paper.abstract ?? ""}. ${evidenceText}`;
    const sentences = sourceText
        .split(/(?<=[.!?])\s+|\n+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => /[a-zA-Z]/.test(item));

    const patternMap: Record<Exclude<DraftStudyTemplate, "auto">, RegExp> = {
        rct: /randomized controlled trial|randomly assigned|allocation|intervention group|control group|placebo|double-blind|single-blind|open-label|intention-to-treat|per-protocol/i,
        meta_analysis: /systematic review|meta-analysis|pooled estimate|forest plot|i²|heterogeneity|prisma|cochrane|prospero|grade/i,
        prospective_cohort: /prospective cohort|baseline|follow-up|incidence rate|person-years|cox proportional hazards|time-to-event|survival analysis/i,
        retrospective_cohort: /retrospective cohort|historical cohort|registry-based cohort/i,
        cross_sectional: /cross-sectional|prevalence|survey|single time point|snapshot|representative sample/i,
        cohort: /cohort|follow-up|longitudinal|hazard ratio|time-to-event|survival analysis/i,
        case_control: /case-control|cases and controls|matched pairs|odds ratio|conditional logistic regression|exposure history/i,
        diagnostic_accuracy: /sensitivity|specificity|roc curve|auc|gold standard|reference standard|positive predictive value|negative predictive value|ppv|npv/i
    };

    const directMatches = sentences
        .filter((sentence) => patternMap[template].test(sentence))
        .slice(0, 5);

    if (directMatches.length >= 3) {
        return directMatches;
    }

    const fallback = sentences
        .filter((sentence) => sentence.length >= 40)
        .slice(0, Math.max(3, 5 - directMatches.length));

    return Array.from(new Set([...directMatches, ...fallback])).slice(0, 5);
}

async function detectStudyTemplateByLLM(
    paper: PaperCandidate,
    evidenceText: string
): Promise<{ template: Exclude<DraftStudyTemplate, "auto">; rule: string } | null> {
    const prompt = `Read the paper information and classify study design.\n\nReturn ONE label only from:\n- rct\n- meta_analysis\n- prospective_cohort\n- retrospective_cohort\n- cross_sectional\n- cohort\n- case_control\n- diagnostic_accuracy\n\nEnglish design signals:\n- rct: randomized controlled trial, randomly assigned, allocation, intervention group, control group, placebo, double-blind, single-blind, open-label, intention-to-treat, per-protocol\n- meta_analysis: systematic review, meta-analysis, pooled estimate, forest plot, I² statistic, heterogeneity, PRISMA, Cochrane, PROSPERO, GRADE\n- prospective_cohort: prospective cohort, baseline, follow-up, incidence rate, person-years, Cox proportional hazards, time-to-event, survival analysis\n- retrospective_cohort: retrospective cohort, historical cohort, registry-based cohort\n- cross_sectional: cross-sectional, prevalence, survey, single time point, snapshot, representative sample\n- case_control: case-control, cases and controls, matched pairs, odds ratio, conditional logistic regression, retrospective exposure history\n- diagnostic_accuracy: sensitivity, specificity, ROC curve, AUC, gold/reference standard, PPV, NPV\n\nTitle: ${paper.title}\nAbstract: ${paper.abstract ?? ""}\nEvidence snippet: ${evidenceText.slice(0, 4000)}`;

    const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
    const normalize = (value: string): Exclude<DraftStudyTemplate, "auto"> | null => {
        const label = value.trim().toLowerCase().replace(/[`"'\s]/g, "");
        if (
            label === "rct"
            || label === "meta_analysis"
            || label === "prospective_cohort"
            || label === "retrospective_cohort"
            || label === "cross_sectional"
            || label === "cohort"
            || label === "case_control"
            || label === "diagnostic_accuracy"
        ) {
            return label;
        }
        return null;
    };

    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return null;
        }

        try {
            const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
            const response = await fetch("https://api.openai.com/v1/responses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    input: prompt,
                    temperature: 0
                }),
                cache: "no-store"
            });

            if (!response.ok) {
                return null;
            }

            const payload = await response.json() as { output_text?: string };
            const normalized = normalize(String(payload.output_text ?? ""));
            if (!normalized) {
                return null;
            }
            return { template: normalized, rule: `LLM识别（${model}）` };
        } catch {
            return null;
        }
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return null;
    }

    try {
        const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content: "You are a medical study-design classifier. Output exactly one label: rct/meta_analysis/prospective_cohort/retrospective_cohort/cross_sectional/cohort/case_control/diagnostic_accuracy"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0
            }),
            cache: "no-store"
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        const normalized = normalize(String(payload.choices?.[0]?.message?.content ?? ""));
        if (!normalized) {
            return null;
        }
        return { template: normalized, rule: `LLM识别（${model}）` };
    } catch {
        return null;
    }
}

function buildStudyTemplateInstructions(template: Exclude<DraftStudyTemplate, "auto">): string {
    const instructions: Record<Exclude<DraftStudyTemplate, "auto">, string> = {
        rct: `\n【研究类型专项要求：RCT】\n- 开篇必须写明“随机对照试验，证据等级较高”，解释随机分组（可用“抽签分组”类比）\n- 使用 PICO 表格/分点清晰呈现：研究对象、干预、对照、结局\n- 关键数字优先解读 ARR 与 NNT，RRR 仅作补充\n- 解释置信区间，不夸大显著性\n- 必须评估内部真实性：随机化、盲法、失访率、ITT\n- 必须评估外部真实性：人群可比性、现实可行性、随访时长\n- 强调“统计学显著不等于临床显著”\n- 必须加入警示：严格控制条件下效果在现实中可能不同。`,
        meta_analysis: `\n【研究类型专项要求：Meta分析】\n- 开篇解释“研究的研究”，并提示纳入研究质量决定上限\n- 展示证据地图：研究数、类型、总样本量、时间跨度、地理分布\n- 用通俗方式解释合并效应与森林图结论方向\n- 核心解释异质性 I² 及其含义，并给出可能来源（设计/人群/剂量）\n- 必须讨论发表偏倚风险（漏斗图思路）\n- 给出 GRADE 质量分级与降级原因\n- 输出“建议强度”（强推荐/弱推荐）并说明条件。`,
        prospective_cohort: `\n【研究类型专项要求：前瞻性队列】\n- 强调“先测暴露再随访结局”，说明时间顺序优势\n- 必须写清 baseline、follow-up 时长、失访率\n- 解释 HR/RR 的临床含义与剂量-反应关系\n- 必须说明混杂控制与残余混杂\n- 必须加入警示：观察性关联不等于因果。`,
        retrospective_cohort: `\n【研究类型专项要求：回顾性队列】\n- 说明使用历史数据/登记队列，强调效率与信息偏倚风险\n- 必须写清队列来源、暴露与结局定义、随访窗口\n- 解释 HR/RR 的临床意义并讨论数据缺失影响\n- 必须加入警示：回顾性证据受记录质量与未测混杂影响。`,
        cross_sectional: `\n【研究类型专项要求：横断面】\n- 明确“单时间点快照”，强调只能说明相关性\n- 必须报告样本量、应答率、代表性\n- 解释 prevalence/OR 等指标，不做因果化表述\n- 必须加入警示：无法确定时间先后，不能推断谁导致谁。`,
        cohort: `\n【研究类型专项要求：队列研究】\n- 开篇解释“追踪观察”设计，并明确其与 RCT 的差异\n- 必须写出队列类型（前瞻/回顾）、随访时长、失访情况\n- 解释暴露定义与测量方式（客观 vs 自报）\n- 详细说明混杂因素控制与残余混杂可能\n- 若有剂量-反应或阈值/U 型关系，必须单列说明\n- 简要采用 Bradford Hill 框架评估因果推断边界\n- 必须使用警示语：观察性证据支持“相关”而非“因果”。`,
        case_control: `\n【研究类型专项要求：病例对照】\n- 开篇解释为何采用病例对照（罕见病/长潜伏期）\n- 说明病例定义、对照来源、匹配因素及其合理性\n- 解释 OR 的意义，并提醒 OR≠风险（罕见病时近似 RR）\n- 必须评估三类偏倚：回忆偏倚、选择偏倚、生存偏倚\n- 对结论强度保持保守，强调需队列/RCT/Meta 进一步验证\n- 必须加入警示语：无法直接估计真实发病风险。`,
        diagnostic_accuracy: `\n【研究类型专项要求：诊断试验准确性】\n- 开篇明确目标疾病、现有金标准与新检测的临床定位\n- 用四格表逻辑解释真阳性/假阴性/假阳性/真阴性\n- 必须解读灵敏度、特异度、PPV、NPV、AUC，并说明受患病率影响\n- 按场景判断：筛查（偏重灵敏度）vs 确诊（偏重特异度）\n- 说明是否采用金标准对照、是否盲法判读\n- 必须讨论“准确性 ≠ 临床有效性/结局改善”与成本可及性。`
    };

    return instructions[template];
}

function buildDraftPromptByTemplate(input: {
    task: WorkflowTask;
    paper: PaperCandidate;
    evidenceType: "fulltext" | "abstract";
    evidenceText: string;
    promptTemplate: DraftPromptTemplate;
    studyTemplate: DraftStudyTemplate;
}): string {
    const { task, paper, evidenceType, evidenceText, promptTemplate, studyTemplate } = input;
    const templateLabel = DRAFT_TEMPLATE_LABEL[promptTemplate];
    const resolvedStudyTemplate = studyTemplate === "auto"
        ? detectStudyTemplateFromEvidence(paper, evidenceText)
        : studyTemplate;
    const studyTemplateLabel = DRAFT_STUDY_TEMPLATE_LABEL[resolvedStudyTemplate];
    const studyInstructions = buildStudyTemplateInstructions(resolvedStudyTemplate);
    const sharedHeader = `你是一位精通医学文献的科普专家。请基于英文医学论文证据，完成“研究类型识别 + 关键信息提取 + 中文科普生成 + 质量自检”一体化输出。\n\n【输出总原则】\n- 严格基于原文，不补充论文外事实\n- 区分事实与判断，避免因果夸大\n- 统计量保留原始格式（HR/OR/RR + 95% CI）并做中文临床意义转化\n- 局限部分不少于正文约 10%\n- 必须包含“非医疗建议”声明与 Citation 组件\n\n主题：${task.theme}\n当前主维度：${CATEGORY_LABEL[task.category]}\n写作模板：${templateLabel}\n证据来源类型：${evidenceType === "fulltext" ? "全文" : "摘要"}\n\n【任务一：研究类型识别】\n- 先给出研究类型（rct/meta_analysis/prospective_cohort/retrospective_cohort/cross_sectional/cohort/case_control/diagnostic_accuracy）\n- 给出 3-5 条识别依据（英文原文短语）\n- 给出识别置信度（High/Medium/Low）\n\n【任务二：关键信息提取】\n- 按研究类型抽取对应字段（PICO / 异质性I² / 随访与混杂 / OR / 灵敏度特异度等）\n- 关键条目用“英文原文 + 中文翻译 + 通俗解释”表达\n\n【术语中英对照（至少覆盖文中出现项）】\nRandomization=随机化；Blinding/Masking=盲法；Allocation concealment=分配隐藏；Intention-to-treat=意向性治疗分析；Confidence interval=置信区间；Hazard ratio=风险比；Odds ratio=比值比；Risk ratio=相对风险；Number needed to treat=需治疗人数；I² statistic=I²统计量；Publication bias=发表偏倚；Confounding=混杂；Selection bias=选择偏倚；Recall bias=回忆偏倚；Sensitivity=灵敏度；Specificity=特异度；PPV=阳性预测值；NPV=阴性预测值。\n\n【任务三：中文科普文章结构】\n- 标题（主标题+副标题：期刊与年份）\n- 开篇（研究类型与证据等级 + 一句话核心发现）\n- 研究背景\n- 研究是怎么做的（解释关键方法）\n- 发现了什么（保留统计量 + 临床转化）\n- 这说明了什么（与既往证据一致性）\n- 需要注意的局限（类型固有限制 + 作者自述限制）\n- 对您意味着什么（分人群建议）\n- 原文信息（完整引用、DOI、术语表）\n\n【任务四：质量自检清单】\n- 研究类型识别准确\n- 数据与原文一致\n- 统计量有临床解释\n- 类型警示语已包含\n- 局限比例达标\n- 非医疗建议声明已包含\n\n【类型专用警示语】\n- RCT：严格控制条件下效果，临床实践可能不同\n- Meta分析：纳入研究质量参差不齐，结论受异质性影响\n- 队列：观察性关联，不等于因果\n- 病例对照：回忆偏倚风险高，需其他设计验证\n- 横断面：单时间点观察，无法判定时间先后\n- 诊断研究：准确性不等于临床有效性\n\n【论文元信息】\n标题：${paper.title}\n作者：${paper.authors}\n期刊：${paper.journal}\n年份：${paper.year}\n链接：${paper.url}\n\n【证据正文】\n${evidenceText}\n`;

    const templateInstructions: Record<DraftPromptTemplate, string> = {
        layered_progressive: `\n【输出结构（分层递进式）】\n1) 先读要点（30秒速览）：1-2条引用式结论，必须含证据等级提示（如“观察性研究，关联非因果”）\n2) 研究背景与价值：说明为何值得关注，以及该研究在已有知识中的位置\n3) 关键概念解释：用类比解释关键方法，避免公式堆砌\n4) 证据分层呈现：按时间/剂量/人群组织，每层都写“通俗数据转化 + 临床意义 + 适用边界”\n5) 研究者的坦诚：局限部分不少于全文 10%\n6) 个体化建议：用“如果您...那么...”给出行动建议与检查清单\n7) 原文信息与免责声明\n\n【语言】\n- 风格温和、克制、可执行\n- 段落适配手机阅读，每段不宜过长\n- 必须包含“五维联动”小节：心血管与代谢、身体活动、认知活力、健康饮食、社交与情绪各 1 条建议，其中主维度更深入\n\n请直接输出 MDX 正文，不要 frontmatter。`,
        qa_dialogue: `\n【输出结构（问答对话式）】\n采用“虚拟访谈”写法，模拟资深医生回答中老年读者提问。\n- 设计 5-7 个问题，至少覆盖：研究价值、方法可信度、核心数字、个体应用、局限警示、明日行动\n- 回答使用第一人称“我们研究发现...”\n- 每个回答约 120-180 字\n- 关键数字用【】强调\n- 保持“关联非因果”的审慎语气\n\n结尾必须有：\n- 专家名片（基于论文作者信息）\n- 原文 DOI/链接\n- 非医疗建议声明\n- Citation 组件\n\n请直接输出 MDX 正文，不要 frontmatter。`,
        compare_analysis: `\n【输出结构（对比辨析式）】\n标题格式：\n【澄清】关于“${task.theme}”的常见说法与科学证据\n\n正文至少包含：\n1) 流行说法 vs 研究证据（表格或分点对照）\n2) 证据如何产生（研究类型、样本、方法特点）\n3) 哪些说法有支持\n4) 哪些说法被高估\n5) 哪些说法明显误读\n6) 理性行动建议（可以做/不必做/谨慎做）\n\n语气要求：不嘲讽读者，纠偏时给出原文依据，持续强调证据边界。\n文末附：非医疗建议声明 + Citation 组件。\n\n请直接输出 MDX 正文，不要 frontmatter。`,
        narrative_research: `\n【输出结构（叙事研究型）】\n写成“科学探秘故事”，按时间线展开：\n- 问题如何产生\n- 研究者如何设计\n- 数据揭示了什么\n- 学界如何审慎看待（局限与争议）\n\n写作要点：\n- 可以提及论文作者姓名与研究场景\n- 关键方法用“为了验证这个，他们不得不...”自然引出\n- 情感弧线：问题紧迫性 → 探索曲折 → 审慎希望\n- 局限不能作为附录，需融入主叙事\n\n结尾必须包含：\n- 可执行建议（分层人群）\n- 非医疗建议声明\n- Citation 组件\n\n请直接输出 MDX 正文，不要 frontmatter。`,
        minimal_cards: `\n【输出结构（极简卡片式）】\n总字数目标 600-900 字，阅读时间标注“约3分钟”。\n固定模块：\n📌 一句话结论（最保守表述）\n📊 关键数字（最多 3 个，含通俗转化）\n🔍 研究是怎么回事（研究类型/样本量/方法，各 1 句）\n💡 对您意味着什么（值得关注/暂无需担心）\n⚠️ 重要提醒（局限 + 不适用人群）\n📚 原文信息（作者、期刊、年份、DOI/链接）\n\n额外要求：\n- 保持克制，不夸大\n- 至少点出 1 条“五维联动”建议\n- 文末加入非医疗建议声明与 Citation 组件\n\n请直接输出 MDX 正文，不要 frontmatter。`
    };

    const headerWithStudyTemplate = sharedHeader.replace(
        `写作模板：${templateLabel}`,
        `写作模板：${templateLabel}\n研究类型模板：${studyTemplateLabel}`
    );

    return `${headerWithStudyTemplate}\n${studyInstructions}\n${templateInstructions[promptTemplate]}`;
}

function buildFallbackDraft(task: WorkflowTask, paper: PaperCandidate): { title: string; summary: string; content: string } {
    const title = `${task.theme}：基于最新研究的科普解读`;
    const summary = `基于论文《${paper.title}》梳理 ${task.category} 维度的关键发现、适用边界与可执行建议。`;

    const content = `## 为什么这个主题值得关注\n\n${task.theme} 与健康寿命密切相关。本文基于最新研究进行通俗解读，帮助你理解“证据说了什么、你今天能做什么”。\n\n## 研究来源\n\n- 论文标题：${paper.title}\n- 作者：${paper.authors}\n- 期刊：${paper.journal}（${paper.year}）\n- 原文链接：${paper.url}\n\n## 核心发现（通俗版）\n\n1. 研究显示该主题与健康结局存在显著关联，但关联不等于因果。\n2. 对 50+ 人群而言，风险并非由单一因素决定，而是生活方式与基础疾病共同作用。\n3. 最稳妥的策略是“低风险、可长期坚持”的组合干预。\n\n## 适用边界与误区\n\n- 单篇论文不能代表全部结论，需要结合多项研究综合判断。\n- 不建议在缺乏专业指导下自行使用高风险干预。\n- 过度追求短期“立竿见影”常常不可持续。\n\n## 今日行动清单\n\n- 从今天开始执行 1 项最小可持续改变（如 20 分钟步行）。\n- 连续 7 天记录一个关键行为（睡眠、运动或饮食）。\n- 在 2 周后复盘变化，再决定下一步升级策略。\n\n<Citation title="${paper.title}" authors="${paper.authors}" journal="${paper.journal}" year="${paper.year}" url="${paper.url}" />`;

    return { title, summary, content };
}

async function extractTextFromOriginalFile(relativePath: string): Promise<string | null> {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const libraryDir = path.resolve(path.join(DATA_DIR, "paper-library"));

    if (!absolutePath.startsWith(libraryDir) || !fs.existsSync(absolutePath)) {
        return null;
    }

    const extension = path.extname(absolutePath).toLowerCase();

    try {
        if (extension === ".pdf") {
            const buffer = fs.readFileSync(absolutePath);
            const { PDFParse } = await import("pdf-parse");
            const parser = new PDFParse({ data: buffer });
            const parsed = await parser.getText();
            const parsedText = typeof parsed === "string"
                ? parsed
                : String((parsed as { text?: string })?.text ?? "");
            const text = parsedText.replace(/\s+/g, " ").trim();
            await parser.destroy();
            return text || null;
        }

        const raw = fs.readFileSync(absolutePath, "utf8");
        if (extension === ".html" || extension === ".htm") {
            return stripHtmlTags(raw).replace(/\s+/g, " ").trim() || null;
        }

        return raw.replace(/\s+/g, " ").trim() || null;
    } catch {
        return null;
    }
}

async function buildDraftEvidenceContext(task: WorkflowTask, paper: PaperCandidate): Promise<{ evidenceType: "fulltext" | "abstract"; evidenceText: string }> {
    const state = readWorkflowState();
    const libraryItem = state.paperLibrary.find((item) => item.id === paper.id);
    const originalPath = libraryItem?.originalFilePath;

    if (originalPath) {
        const fullText = await extractTextFromOriginalFile(originalPath);
        if (fullText) {
            return {
                evidenceType: "fulltext",
                evidenceText: fullText.slice(0, 24000)
            };
        }
    }

    return {
        evidenceType: "abstract",
        evidenceText: paper.abstract ?? "(无摘要)"
    };
}

async function callLLMForDraft(
    task: WorkflowTask,
    paper: PaperCandidate,
    promptTemplate: DraftPromptTemplate,
    studyTemplate: DraftStudyTemplate
): Promise<{
    title: string;
    summary: string;
    content: string;
    requestedStudyTemplate: DraftStudyTemplate;
    resolvedStudyTemplate: Exclude<DraftStudyTemplate, "auto">;
    studyDetectionRule: string;
    studyDetectionEvidence: string[];
} | null> {
    const evidence = await buildDraftEvidenceContext(task, paper);
    const fallbackDetection = detectStudyTemplateWithRule(paper, evidence.evidenceText);
    const llmDetection = studyTemplate === "auto"
        ? await detectStudyTemplateByLLM(paper, evidence.evidenceText)
        : null;
    const resolvedStudyTemplate = studyTemplate === "auto"
        ? (llmDetection?.template ?? fallbackDetection.template)
        : studyTemplate;
    const detectionRule = studyTemplate === "auto"
        ? (llmDetection?.rule ?? `规则兜底：${fallbackDetection.rule}`)
        : "手动指定";
    const resolvedStudyLabel = DRAFT_STUDY_TEMPLATE_LABEL[resolvedStudyTemplate];
    const studyDisplayLabel = studyTemplate === "auto"
        ? `${DRAFT_STUDY_TEMPLATE_LABEL.auto}→${resolvedStudyLabel}`
        : resolvedStudyLabel;
    const studyDetectionEvidence = extractStudyDetectionEvidence(resolvedStudyTemplate, paper, evidence.evidenceText);

    const prompt = buildDraftPromptByTemplate({
        task,
        paper,
        evidenceType: evidence.evidenceType,
        evidenceText: evidence.evidenceText,
        promptTemplate,
        studyTemplate: resolvedStudyTemplate
    });

    const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();

    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return null;
        }

        const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

        try {
            const response = await fetch("https://api.openai.com/v1/responses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    input: prompt
                }),
                cache: "no-store"
            });

            if (!response.ok) {
                return null;
            }

            const payload = await response.json() as {
                output_text?: string;
            };

            const content = payload.output_text?.trim();
            if (!content) {
                return null;
            }

            const title = `${task.theme}：${DRAFT_TEMPLATE_LABEL[promptTemplate]}科普解读`;
            const summary = `文风：${DRAFT_TEMPLATE_LABEL[promptTemplate]}；研究类型：${studyDisplayLabel}；围绕 ${task.theme}，基于${evidence.evidenceType === "fulltext" ? "全文" : "摘要"}证据整理关键发现与行动建议。`;
            const contentWithMeta = `> 生成信息：文风=${DRAFT_TEMPLATE_LABEL[promptTemplate]}；研究类型=${studyDisplayLabel}；识别依据=${detectionRule}；证据来源=${evidence.evidenceType === "fulltext" ? "全文" : "摘要"}\n\n${content}`;
            return {
                title,
                summary,
                content: contentWithMeta,
                requestedStudyTemplate: studyTemplate,
                resolvedStudyTemplate,
                studyDetectionRule: detectionRule,
                studyDetectionEvidence
            };
        } catch {
            return null;
        }
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return null;
    }

    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

    try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content: "你是一位严谨的医学科普写作者，擅长将科研论文转写为面向 50+ 人群的中文可执行科普内容。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.5
            }),
            cache: "no-store"
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json() as {
            choices?: Array<{
                message?: {
                    content?: string;
                };
            }>;
        };

        const content = payload.choices?.[0]?.message?.content?.trim();
        if (!content) {
            return null;
        }

        const title = `${task.theme}：${DRAFT_TEMPLATE_LABEL[promptTemplate]}科普解读`;
        const summary = `文风：${DRAFT_TEMPLATE_LABEL[promptTemplate]}；研究类型：${studyDisplayLabel}；围绕 ${task.theme}，基于${evidence.evidenceType === "fulltext" ? "全文" : "摘要"}证据整理关键发现与行动建议。`;
        const contentWithMeta = `> 生成信息：文风=${DRAFT_TEMPLATE_LABEL[promptTemplate]}；研究类型=${studyDisplayLabel}；识别依据=${detectionRule}；证据来源=${evidence.evidenceType === "fulltext" ? "全文" : "摘要"}\n\n${content}`;
        return {
            title,
            summary,
            content: contentWithMeta,
            requestedStudyTemplate: studyTemplate,
            resolvedStudyTemplate,
            studyDetectionRule: detectionRule,
            studyDetectionEvidence
        };
    } catch {
        return null;
    }
}

export async function generateDraftForTask(
    task: WorkflowTask,
    options?: { promptTemplate?: DraftPromptTemplate; studyTemplate?: DraftStudyTemplate }
): Promise<{
    title: string;
    summary: string;
    content: string;
    requestedStudyTemplate?: DraftStudyTemplate;
    resolvedStudyTemplate?: Exclude<DraftStudyTemplate, "auto">;
    studyDetectionRule?: string;
    studyDetectionEvidence?: string[];
}> {
    const selectedPaper = task.paperCandidates.find((paper) => paper.id === task.selectedPaperId);
    if (!selectedPaper) {
        throw new Error("No selected paper for this task");
    }

    const state = readWorkflowState();
    const libraryItem = state.paperLibrary.find((item) => item.id === selectedPaper.id);
    if (libraryItem && !libraryItem.originalFilePath) {
        throw new Error("请先下载全文后再生成草稿");
    }

    const promptTemplate = DRAFT_PROMPT_TEMPLATES.includes(options?.promptTemplate as DraftPromptTemplate)
        ? options?.promptTemplate as DraftPromptTemplate
        : (task.draftPromptTemplate ?? "layered_progressive");
    const studyTemplate = DRAFT_STUDY_TEMPLATES.includes(options?.studyTemplate as DraftStudyTemplate)
        ? options?.studyTemplate as DraftStudyTemplate
        : (task.draftStudyTemplate ?? "auto");

    const llmResult = await callLLMForDraft(task, selectedPaper, promptTemplate, studyTemplate);
    if (llmResult) {
        return llmResult;
    }

    return buildFallbackDraft(task, selectedPaper);
}

type CoreSummaryStudyKey = "base" | "rct" | "meta" | "cohort" | "diagnostic";

function mapStudyTemplateToCoreSummaryKey(template: Exclude<DraftStudyTemplate, "auto">): CoreSummaryStudyKey {
    switch (template) {
        case "rct":
            return "rct";
        case "meta_analysis":
            return "meta";
        case "prospective_cohort":
        case "retrospective_cohort":
        case "cohort":
            return "cohort";
        case "diagnostic_accuracy":
            return "diagnostic";
        default:
            return "base";
    }
}

export async function generateCoreSummaryForTask(task: WorkflowTask): Promise<string> {
    const selectedPaper = task.paperCandidates.find((paper) => paper.id === task.selectedPaperId);
    if (!selectedPaper) {
        throw new Error("未选择论文，无法生成核心内容摘要");
    }

    const state = readWorkflowState();
    const libraryItem = state.paperLibrary.find((item) => item.id === selectedPaper.id);
    if (libraryItem && !libraryItem.originalFilePath) {
        throw new Error("请先下载全文后再生成核心内容摘要");
    }

    const evidence = await buildDraftEvidenceContext(task, selectedPaper);
    if (evidence.evidenceType !== "fulltext") {
        throw new Error("请先下载全文后再生成核心内容摘要");
    }

    const resolvedStudyTemplate: Exclude<DraftStudyTemplate, "auto"> =
        task.draftStudyTemplate === "auto"
            ? detectStudyTemplateFromEvidence(selectedPaper, evidence.evidenceText)
            : DRAFT_STUDY_TEMPLATES.includes(task.draftStudyTemplate as DraftStudyTemplate)
                ? (task.draftStudyTemplate as Exclude<DraftStudyTemplate, "auto">)
                : detectStudyTemplateFromEvidence(selectedPaper, evidence.evidenceText);
    const promptKey = mapStudyTemplateToCoreSummaryKey(resolvedStudyTemplate);
    const systemPrompt = getCoreSummarySystemPrompt(promptKey);
    const userMessage = `【论文元信息】\n标题：${selectedPaper.title}\n${selectedPaper.titleZh ? `中文标题：${selectedPaper.titleZh}\n` : ""}作者：${selectedPaper.authors}\n期刊：${selectedPaper.journal}\n年份：${selectedPaper.year}\nDOI：${selectedPaper.doi ?? ""}\n链接：${selectedPaper.url}\n\n【证据正文（全文）】\n${evidence.evidenceText}`;

    const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();

    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("未配置 OPENAI_API_KEY，无法生成核心内容摘要");
        }
        const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                input: `系统指令：\n${systemPrompt}\n\n用户输入：\n${userMessage}`
            }),
            cache: "no-store"
        });
        if (!response.ok) {
            throw new Error(`LLM 请求失败: ${response.status}`);
        }
        const payload = await response.json() as { output_text?: string };
        const content = payload.output_text?.trim();
        if (!content) {
            throw new Error("LLM 未返回有效内容");
        }
        return content;
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        throw new Error("未配置 DEEPSEEK_API_KEY，无法生成核心内容摘要");
    }
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: 0.3
        }),
        cache: "no-store"
    });
    if (!response.ok) {
        throw new Error(`LLM 请求失败: ${response.status}`);
    }
    const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
        throw new Error("LLM 未返回有效内容");
    }
    return content;
}

/** 论文库内单篇预检：根据全文生成核心内容摘要（不依赖任务） */
export async function generateCoreSummaryForLibraryItem(itemId: string): Promise<string> {
    const state = readWorkflowState();
    const item = state.paperLibrary.find((entry) => entry.id === itemId);
    if (!item) {
        throw new Error("论文库条目不存在");
    }
    if (!item.originalFilePath) {
        throw new Error("请先下载全文后再预检");
    }

    const fullText = await extractTextFromOriginalFile(item.originalFilePath);
    if (!fullText) {
        throw new Error("无法读取全文文件");
    }
    const evidenceText = fullText.slice(0, 24000);
    const resolvedStudyTemplate = detectStudyTemplateFromEvidence(item, evidenceText);
    const promptKey = mapStudyTemplateToCoreSummaryKey(resolvedStudyTemplate);
    const systemPrompt = getCoreSummarySystemPrompt(promptKey);
    const userMessage = `【论文元信息】\n标题：${item.title}\n${item.titleZh ? `中文标题：${item.titleZh}\n` : ""}作者：${item.authors}\n期刊：${item.journal}\n年份：${item.year}\nDOI：${item.doi ?? ""}\n链接：${item.url}\n\n【证据正文（全文）】\n${evidenceText}`;

    const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("未配置 OPENAI_API_KEY，无法预检");
        }
        const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                input: `系统指令：\n${systemPrompt}\n\n用户输入：\n${userMessage}`
            }),
            cache: "no-store"
        });
        if (!response.ok) {
            throw new Error(`LLM 请求失败: ${response.status}`);
        }
        const payload = await response.json() as { output_text?: string };
        const content = payload.output_text?.trim();
        if (!content) {
            throw new Error("LLM 未返回有效内容");
        }
        return content;
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        throw new Error("未配置 DEEPSEEK_API_KEY，无法预检");
    }
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: 0.3
        }),
        cache: "no-store"
    });
    if (!response.ok) {
        throw new Error(`LLM 请求失败: ${response.status}`);
    }
    const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
        throw new Error("LLM 未返回有效内容");
    }
    return content;
}

function sanitizeFileName(name: string, fallback: string): string {
    const normalized = name
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);

    return normalized || fallback;
}

function normalizeAbstractText(input: string): string {
    return input
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

async function translateTextToChinese(text: string): Promise<string | null> {
    const source = text.trim();
    if (!source || hasChineseText(source)) {
        return source || null;
    }

    const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();

    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return null;
        }

        try {
            const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
            const response = await fetch("https://api.openai.com/v1/responses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    input: `请将以下英文论文摘要翻译为简体中文，保持学术语义准确，不要添加未提供信息。\n\n${source}`
                }),
                cache: "no-store"
            });

            if (!response.ok) {
                return null;
            }

            const payload = await response.json() as { output_text?: string };
            const translated = String(payload.output_text ?? "").trim();
            return translated || null;
        } catch {
            return null;
        }
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return null;
    }

    try {
        const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content: "你是严谨的学术翻译助手，仅输出翻译后的中文文本。"
                    },
                    {
                        role: "user",
                        content: `请将以下英文论文摘要翻译为简体中文，保持学术语义准确，不要添加未提供信息。\n\n${source}`
                    }
                ],
                temperature: 0.2
            }),
            cache: "no-store"
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        const translated = payload.choices?.[0]?.message?.content?.trim() ?? "";
        return translated || null;
    } catch {
        return null;
    }
}

async function buildSummaryExportText(item: PaperLibraryItem): Promise<string> {
    const titleZh = item.titleZh ?? item.title;
    const rawAbstract = (item.abstract ?? item.abstractEn ?? "").trim();
    const abstractEn = rawAbstract ? normalizeAbstractText(rawAbstract) : "";
    const translatedAbstract = abstractEn ? await translateTextToChinese(abstractEn) : null;

    const lines: string[] = [
        `标题（中文）：${titleZh}`,
        `标题（英文）：${item.title}`,
        `来源：${item.source}`,
        `作者：${item.authors}`,
        `期刊：${item.journal}`,
        `年份：${item.year}`,
        `DOI：${item.doi ?? "-"}`,
        `链接：${item.url}`,
        "",
        "--- 摘要（英文） ---",
        abstractEn || "暂无摘要",
        "",
        "--- 摘要（中文翻译） ---",
        abstractEn
            ? (translatedAbstract ?? "翻译暂不可用（请检查模型配置），可先使用英文摘要。")
            : "暂无可翻译摘要",
        "",
        `导出时间：${getIsoDate(new Date())}`
    ];

    return `${lines.join("\n")}\n`;
}

/** 从 PubMed 条目 id 或 url 解析出 PMID */
function extractPmidFromPubmedItem(item: PaperLibraryItem): string | null {
    const idMatch = item.id.match(/^pubmed-(\d+)$/i);
    if (idMatch) {
        return idMatch[1];
    }
    const urlMatch = String(item.url ?? "").match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
    return urlMatch ? urlMatch[1] : null;
}

/** 若库内条目缺少摘要，则根据 DOI/PubMed 再次拉取元数据并回写，用于后续摘要筛查与下载摘要 */
async function enrichPaperLibraryItemAbstractIfMissing(
    state: WorkflowState,
    index: number
): Promise<void> {
    const item = state.paperLibrary[index];
    const hasAbstract = (item.abstract ?? item.abstractEn ?? "").trim().length > 0;
    if (hasAbstract) {
        return;
    }

    const pmid = extractPmidFromPubmedItem(item);
    if (pmid) {
        const abstractMap = await fetchPubMedAbstracts([pmid]);
        const abstract = abstractMap.get(pmid)?.trim();
        if (abstract) {
            const now = getIsoDate(new Date());
            state.paperLibrary[index] = {
                ...item,
                abstract,
                abstractEn: abstract,
                updatedAt: now
            };
            return;
        }
    }

    const effectiveDoi = normalizeDoi(item.doi) || extractDoiFromText(item.url);
    if (!effectiveDoi) {
        return;
    }

    const metadata = await fetchCrossrefMetadataByDoi(effectiveDoi);
    if (!metadata?.abstract) {
        return;
    }

    const now = getIsoDate(new Date());
    const updated: PaperLibraryItem = {
        ...item,
        abstract: metadata.abstract,
        abstractEn: metadata.abstract,
        updatedAt: now
    };
    state.paperLibrary[index] = updated;
}

export async function downloadPaperLibraryItem(
    itemId: string,
    mode: "summary" | "original" = "summary"
): Promise<{ state: WorkflowState; localFilePath: string }> {
    const state = readWorkflowState();
    const index = state.paperLibrary.findIndex((item) => item.id === itemId);

    if (index === -1) {
        throw new Error("论文库条目不存在");
    }

    if (mode === "summary") {
        await enrichPaperLibraryItemAbstractIfMissing(state, index);
    }

    const item = state.paperLibrary[index];
    const libraryDir = path.join(DATA_DIR, "paper-library");
    if (!fs.existsSync(libraryDir)) {
        fs.mkdirSync(libraryDir, { recursive: true });
    }

    const safeName = sanitizeFileName(item.titleZh ?? item.title, item.id);
    let relativePath = "";

    if (mode === "summary") {
        const fileName = `${safeName}-摘要.txt`;
        const filePath = path.join(libraryDir, fileName);
        const content = await buildSummaryExportText(item);
        fs.writeFileSync(filePath, content, "utf8");
        relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    } else {
        const response = await fetch(item.url, { cache: "no-store" });

        if (!response.ok) {
            throw new Error("下载原文失败：来源可能仅提供元数据/摘要，或链接不可直接抓取全文");
        }

        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        let fileName = `${safeName}-原文.txt`;
        if (contentType.includes("application/pdf")) {
            fileName = `${safeName}-原文.pdf`;
        }

        const filePath = path.join(libraryDir, fileName);

        if (contentType.includes("application/pdf")) {
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(filePath, buffer);
        } else {
            const text = await response.text();
            fs.writeFileSync(filePath, text, "utf8");
        }

        relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    }

    state.paperLibrary[index] = {
        ...state.paperLibrary[index],
        localFilePath: relativePath,
        summaryFilePath: mode === "summary" ? relativePath : state.paperLibrary[index].summaryFilePath,
        originalFilePath: mode === "original" ? relativePath : state.paperLibrary[index].originalFilePath,
        updatedAt: getIsoDate(new Date())
    };

    writeWorkflowState(state);
    return { state, localFilePath: relativePath };
}

export function getPaperLibrarySummaryPreview(itemId: string): { filePath: string; content: string } {
    const state = readWorkflowState();
    const item = state.paperLibrary.find((entry) => entry.id === itemId);

    if (!item) {
        throw new Error("论文库条目不存在");
    }

    const relativePath = item.summaryFilePath ?? item.localFilePath;
    if (!relativePath) {
        throw new Error("请先下载摘要，再进行本页查看");
    }

    const absolutePath = path.resolve(process.cwd(), relativePath);
    const libraryDir = path.resolve(path.join(DATA_DIR, "paper-library"));
    if (!absolutePath.startsWith(libraryDir)) {
        throw new Error("摘要文件路径不合法");
    }

    if (!fs.existsSync(absolutePath)) {
        throw new Error("摘要文件不存在，请重新下载摘要");
    }

    const content = fs.readFileSync(absolutePath, "utf8");
    return {
        filePath: relativePath,
        content
    };
}

function toSlugPart(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 48);
}

function escapeQuote(input: string): string {
    return input.replace(/"/g, '\\"');
}

export function publishTaskToArticle(task: WorkflowTask): string {
    if (!task.draftContent || !task.draftTitle || !task.draftSummary) {
        throw new Error("任务草稿内容不完整，无法发布");
    }

    const articleDir = path.join(process.cwd(), "src", "content", "articles");
    if (!fs.existsSync(articleDir)) {
        fs.mkdirSync(articleDir, { recursive: true });
    }

    const date = new Date().toISOString().slice(0, 10);
    const slug = `${task.category}-${toSlugPart(task.theme)}-${task.id.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    const fileName = `${slug}.mdx`;
    const filePath = path.join(articleDir, fileName);
    const readingTime = estimateReadingTime(task.draftContent);

    const frontmatter = `---\n` +
        `title: "${escapeQuote(task.draftTitle)}"\n` +
        `date: "${date}"\n` +
        `category: "${task.category}"\n` +
        `tags: ["ai-generated", "${task.category}"]\n` +
        `summary: "${escapeQuote(task.draftSummary)}"\n` +
        `readingTime: "${readingTime}"\n` +
        `---\n\n`;

    fs.writeFileSync(filePath, `${frontmatter}${task.draftContent.trim()}\n`, "utf8");
    return fileName;
}

export function exportTaskDraft(task: WorkflowTask): string {
    if (!task.draftContent || !task.draftTitle || !task.draftSummary) {
        throw new Error("任务草稿内容不完整，无法导出");
    }

    const draftDir = path.join(process.cwd(), "src", "content", "drafts");
    if (!fs.existsSync(draftDir)) {
        fs.mkdirSync(draftDir, { recursive: true });
    }

    const date = new Date().toISOString().slice(0, 10);
    const slug = `${task.category}-${toSlugPart(task.theme)}-${task.id.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    const fileName = `${slug}.mdx`;
    const filePath = path.join(draftDir, fileName);
    const readingTime = estimateReadingTime(task.draftContent);

    const frontmatter = `---\n` +
        `title: "${escapeQuote(task.draftTitle)}"\n` +
        `date: "${date}"\n` +
        `category: "${task.category}"\n` +
        `tags: ["draft", "${task.category}"]\n` +
        `summary: "${escapeQuote(task.draftSummary)}"\n` +
        `readingTime: "${readingTime}"\n` +
        `---\n\n`;

    fs.writeFileSync(filePath, `${frontmatter}${task.draftContent.trim()}\n`, "utf8");
    return fileName;
}
