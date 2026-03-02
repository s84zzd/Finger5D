import fs from "fs";
import path from "path";
import {
    FIVE_D_CATEGORIES,
    type MonthlyGenerationPreview,
    type MonthlyGenerationPreviewWeek,
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
    sourceWhitelist: ["crossref"],
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
        category: item.category,
        themeSeed: String(item.themeSeed ?? ""),
        searchScope: item.searchScope === "other" ? "other" : "category",
        keywords: Array.isArray(item.keywords)
            ? Array.from(new Set(item.keywords.map((keyword) => String(keyword ?? "").trim()).filter(Boolean))).slice(0, 20)
            : [],
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
    allTerms.push("aging", "healthspan", "older adults", "longevity");

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

async function searchCrossrefByTheme(category: PaperLibrarySearchCategory, theme: string, settings: SearchSettings): Promise<PaperCandidate[]> {
    const terms = buildSearchTerms(category, theme);
    const query = encodeURIComponent(terms.join(" "));
    const rows = Math.min(30, settings.maxResultsPerSource * 4);
    const url = `https://api.crossref.org/works?rows=${rows}&sort=published&order=desc&filter=from-pub-date:${settings.sinceYear}-01-01,type:journal-article&query.bibliographic=${query}`;

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

        return mapped
            .filter((candidate) => {
                const yearNum = Number(candidate.year);
                return Number.isFinite(yearNum) ? yearNum >= settings.sinceYear : false;
            })
            .map((candidate) => ({ candidate, score: buildRelevanceScore(candidate, terms) }))
            .filter((item) => item.score >= settings.minRelevanceScore)
            .sort((left, right) => {
                if (right.score !== left.score) {
                    return right.score - left.score;
                }
                return Number(right.candidate.year) - Number(left.candidate.year);
            })
            .slice(0, settings.maxResultsPerSource)
            .map((item) => item.candidate);
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

async function searchOpenAlexByTheme(category: PaperLibrarySearchCategory, theme: string, settings: SearchSettings): Promise<PaperCandidate[]> {
    const terms = buildSearchTerms(category, theme);
    const query = encodeURIComponent(terms.join(" "));
    const rows = Math.min(30, settings.maxResultsPerSource * 4);
    const url = `https://api.openalex.org/works?search=${query}&filter=from_publication_date:${settings.sinceYear}-01-01,type:article,is_retracted:false&sort=publication_date:desc&per-page=${rows}`;

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

        return mapped
            .filter((candidate) => {
                const yearNum = Number(candidate.year);
                return Number.isFinite(yearNum) ? yearNum >= settings.sinceYear : false;
            })
            .map((candidate) => ({ candidate, score: buildRelevanceScore(candidate, terms) }))
            .filter((item) => item.score >= settings.minRelevanceScore)
            .sort((left, right) => {
                if (right.score !== left.score) {
                    return right.score - left.score;
                }
                return Number(right.candidate.year) - Number(left.candidate.year);
            })
            .slice(0, settings.maxResultsPerSource)
            .map((item) => item.candidate);
    } catch {
        return [];
    }
}

function parsePubMedYear(pubDate: string): string {
    const match = String(pubDate ?? "").match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : "Unknown";
}

async function searchPubMedByTheme(category: PaperLibrarySearchCategory, theme: string, settings: SearchSettings): Promise<PaperCandidate[]> {
    const terms = buildSearchTerms(category, theme);
    const queryText = `${terms.join(" ")} AND ("${settings.sinceYear}"[Date - Publication] : "3000"[Date - Publication])`;
    const query = encodeURIComponent(queryText);
    const rows = Math.min(30, settings.maxResultsPerSource * 4);
    const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

    try {
        const searchResponse = await fetch(`${base}/esearch.fcgi?db=pubmed&retmode=json&retmax=${rows}&sort=pub+date&term=${query}`, {
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

        const summaryResponse = await fetch(`${base}/esummary.fcgi?db=pubmed&retmode=json&id=${encodeURIComponent(idList.join(","))}`, {
            cache: "no-store"
        });

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
                abstract: undefined
            } satisfies PaperCandidate];
        });

        return mapped
            .filter((candidate) => {
                const yearNum = Number(candidate.year);
                return Number.isFinite(yearNum) ? yearNum >= settings.sinceYear : false;
            })
            .map((candidate) => ({ candidate, score: buildRelevanceScore(candidate, terms) }))
            .filter((item) => item.score >= settings.minRelevanceScore)
            .sort((left, right) => {
                if (right.score !== left.score) {
                    return right.score - left.score;
                }
                return Number(right.candidate.year) - Number(left.candidate.year);
            })
            .slice(0, settings.maxResultsPerSource)
            .map((item) => item.candidate);
    } catch {
        return [];
    }
}

async function searchByExternalConnector(
    source: "webofscience" | "wanfang" | "cnki",
    category: PaperLibrarySearchCategory,
    theme: string,
    settings: SearchSettings
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
                sinceYear: settings.sinceYear,
                maxResults: settings.maxResultsPerSource * 2
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

        return mapped
            .filter((candidate) => {
                const yearNum = Number(candidate.year);
                return Number.isFinite(yearNum) ? yearNum >= settings.sinceYear : false;
            })
            .map((candidate) => ({ candidate, score: buildRelevanceScore(candidate, terms) }))
            .filter((item) => item.score >= settings.minRelevanceScore)
            .sort((left, right) => {
                if (right.score !== left.score) {
                    return right.score - left.score;
                }
                return Number(right.candidate.year) - Number(left.candidate.year);
            })
            .slice(0, settings.maxResultsPerSource)
            .map((item) => item.candidate);
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

export async function searchPapersByTheme(category: PaperLibrarySearchCategory, theme: string, settings: SearchSettings): Promise<PaperCandidate[]> {
    const jobs: Array<Promise<PaperCandidate[]>> = [];

    if (settings.sourceWhitelist.includes("crossref")) {
        jobs.push(searchCrossrefByTheme(category, theme, settings));
    }

    if (settings.sourceWhitelist.includes("openalex")) {
        jobs.push(searchOpenAlexByTheme(category, theme, settings));
    }

    if (settings.sourceWhitelist.includes("pubmed")) {
        jobs.push(searchPubMedByTheme(category, theme, settings));
    }

    if (settings.sourceWhitelist.includes("webofscience")) {
        jobs.push(searchByExternalConnector("webofscience", category, theme, settings));
    }

    if (settings.sourceWhitelist.includes("wanfang")) {
        jobs.push(searchByExternalConnector("wanfang", category, theme, settings));
    }

    if (settings.sourceWhitelist.includes("cnki")) {
        jobs.push(searchByExternalConnector("cnki", category, theme, settings));
    }

    if (jobs.length === 0) {
        return [];
    }

    const results = await Promise.all(jobs);
    const deduped = dedupeCandidates(results.flat());
    return translatePaperTitlesToChinese(deduped);
}

function getPaperLibraryKey(candidate: PaperCandidate): string {
    const doi = String(candidate.doi ?? "").trim().toLowerCase();
    if (doi) {
        return `doi:${doi}`;
    }

    const url = String(candidate.url ?? "").trim().toLowerCase();
    if (url) {
        return `url:${url}`;
    }

    return `title:${candidate.title.trim().toLowerCase()}`;
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

export function getPaperLibraryCandidates(category: FiveDCategory, theme: string): PaperCandidate[] {
    const state = readWorkflowState();
    const normalizedTheme = theme.trim().toLowerCase();

    const matched = state.paperLibrary.filter((item) => {
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

export async function searchAndSavePaperLibrary(themeSeed: string, category: PaperLibrarySearchCategory): Promise<{ state: WorkflowState; addedCount: number }> {
    const state = readWorkflowState();
    const normalizedTheme = themeSeed.trim();

    if (!normalizedTheme) {
        throw new Error("主题不能为空");
    }

    const candidates = category === "other"
        ? dedupeCandidates(
            (
                await Promise.all(
                    FIVE_D_CATEGORIES.map((cat) => searchPapersByTheme(cat, normalizedTheme, state.searchSettings))
                )
            ).flat()
        )
        : await searchPapersByTheme(category, normalizedTheme, state.searchSettings);
    const normalizedCategory: FiveDCategory = category === "other" ? "cardio" : category;
    const searchScope: "category" | "other" = category === "other" ? "other" : "category";
    const now = getIsoDate(new Date());
    const existingIndexByKey = new Map<string, number>();

    state.paperLibrary.forEach((item, index) => {
        existingIndexByKey.set(item.key, index);
    });

    let addedCount = 0;

    for (const candidate of candidates) {
        const key = getPaperLibraryKey(candidate);
        const existingIndex = existingIndexByKey.get(key);

        if (existingIndex !== undefined) {
            const existing = state.paperLibrary[existingIndex];
            state.paperLibrary[existingIndex] = {
                ...existing,
                category: normalizedCategory,
                themeSeed: normalizedTheme,
                searchScope,
                updatedAt: now
            };
            continue;
        }

        const item: PaperLibraryItem = {
            ...candidate,
            id: `library-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            key,
            category: normalizedCategory,
            themeSeed: normalizedTheme,
            searchScope,
            createdAt: now,
            updatedAt: now
        };

        state.paperLibrary.unshift(item);
        existingIndexByKey.set(key, 0);
        addedCount += 1;
    }

    writeWorkflowState(state);
    return { state, addedCount };
}

function estimateReadingTime(content: string): string {
    const plainText = content.replace(/[#*_`>\-\[\]()]/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = plainText.length;
    const minutes = Math.max(6, Math.round(wordCount / 350));
    return `${minutes} min`;
}

function buildFallbackDraft(task: WorkflowTask, paper: PaperCandidate): { title: string; summary: string; content: string } {
    const title = `${task.theme}：基于最新研究的科普解读`;
    const summary = `基于论文《${paper.title}》梳理 ${task.category} 维度的关键发现、适用边界与可执行建议。`;

    const content = `## 为什么这个主题值得关注\n\n${task.theme} 与健康寿命密切相关。本文基于最新研究进行通俗解读，帮助你理解“证据说了什么、你今天能做什么”。\n\n## 研究来源\n\n- 论文标题：${paper.title}\n- 作者：${paper.authors}\n- 期刊：${paper.journal}（${paper.year}）\n- 原文链接：${paper.url}\n\n## 核心发现（通俗版）\n\n1. 研究显示该主题与健康结局存在显著关联，但关联不等于因果。\n2. 对 50+ 人群而言，风险并非由单一因素决定，而是生活方式与基础疾病共同作用。\n3. 最稳妥的策略是“低风险、可长期坚持”的组合干预。\n\n## 适用边界与误区\n\n- 单篇论文不能代表全部结论，需要结合多项研究综合判断。\n- 不建议在缺乏专业指导下自行使用高风险干预。\n- 过度追求短期“立竿见影”常常不可持续。\n\n## 今日行动清单\n\n- 从今天开始执行 1 项最小可持续改变（如 20 分钟步行）。\n- 连续 7 天记录一个关键行为（睡眠、运动或饮食）。\n- 在 2 周后复盘变化，再决定下一步升级策略。\n\n<Citation title="${paper.title}" authors="${paper.authors}" journal="${paper.journal}" year="${paper.year}" url="${paper.url}" />`;

    return { title, summary, content };
}

async function callLLMForDraft(task: WorkflowTask, paper: PaperCandidate): Promise<{ title: string; summary: string; content: string } | null> {
    const prompt = `你是资深医学科普编辑。请基于以下论文信息，生成一篇中文科普稿（MDX 正文，不包含 frontmatter）。\n\n要求：\n1) 面向 50+ 人群，语气温和、严谨、可执行。\n2) 结构包含：背景、机制解释、证据强弱、常见误区、行动清单。\n3) 不夸大疗效，明确研究边界。\n4) 在文末添加一条 Citation 组件：<Citation title=... authors=... journal=... year=... url=... />。\n5) 正文长度约 1200~1800 中文字。\n6) 必须围绕一个主题主线（即“主题”字段），并从 Finger5D 五个维度展开：心血管与代谢、身体活动、认知活力、健康饮食、社交与情绪。\n7) 其中“维度”字段是当前任务主维度，需要写得更深入；其余 4 个维度写关联影响与协同建议。\n8) 输出中必须有“\"五维联动\"”小节，按五个维度分别给出 1 条可执行建议。\n\n主题：${task.theme}\n维度：${task.category}\n论文标题：${paper.title}\n作者：${paper.authors}\n期刊：${paper.journal}\n年份：${paper.year}\n摘要：${paper.abstract ?? "(无摘要)"}\n链接：${paper.url}`;

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

            const title = `${task.theme}：科学证据与实践建议`;
            const summary = `围绕 ${task.theme}，结合最新论文证据整理机制、边界与可执行建议。`;
            return { title, summary, content };
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

        const title = `${task.theme}：科学证据与实践建议`;
        const summary = `围绕 ${task.theme}，结合最新论文证据整理机制、边界与可执行建议。`;
        return { title, summary, content };
    } catch {
        return null;
    }
}

export async function generateDraftForTask(task: WorkflowTask): Promise<{ title: string; summary: string; content: string }> {
    const selectedPaper = task.paperCandidates.find((paper) => paper.id === task.selectedPaperId);
    if (!selectedPaper) {
        throw new Error("No selected paper for this task");
    }

    const llmResult = await callLLMForDraft(task, selectedPaper);
    if (llmResult) {
        return llmResult;
    }

    return buildFallbackDraft(task, selectedPaper);
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
    const abstractEn = item.abstract ? normalizeAbstractText(item.abstract) : "";
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

export async function downloadPaperLibraryItem(
    itemId: string,
    mode: "summary" | "original" = "summary"
): Promise<{ state: WorkflowState; localFilePath: string }> {
    const state = readWorkflowState();
    const index = state.paperLibrary.findIndex((item) => item.id === itemId);

    if (index === -1) {
        throw new Error("论文库条目不存在");
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
            throw new Error("下载原文失败，请检查链接可用性");
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
