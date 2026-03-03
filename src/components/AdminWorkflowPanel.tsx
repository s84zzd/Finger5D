"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import {
    DRAFT_PROMPT_TEMPLATES,
    DRAFT_STUDY_TEMPLATES,
    type DraftPromptTemplate,
    type DraftStudyTemplate,
    type MonthlyGenerationPreview,
    WEEKLY_ARTICLE_TARGET,
    WEEKS_PER_MONTH,
    WEEKLY_TASK_TARGET_MAX,
    WEEKLY_TASK_TARGET_MIN,
    WEEKLY_TASK_TARGET_STEP,
    type WorkflowState,
    type WorkflowTask,
    type FiveDCategory
} from "@/lib/admin-types";

const CATEGORY_LABEL: Record<FiveDCategory, string> = {
    cardio: "心血管与代谢",
    physical: "身体活动",
    cognitive: "认知活力",
    nutrition: "健康饮食",
    social: "社交与情绪"
};

const DEFAULT_WEEK_SLOT_TEXT = [
    "Week 1：确定主题与审稿节奏",
    "Week 2：推进检索与初稿",
    "Week 3：完成草稿审议与修订",
    "Week 4：发布复盘与下月预规划"
];

const WEEK_SLOT_PRESETS: Record<"basic" | "intensive", string[]> = {
    basic: [
        "Week 1：确定主题与审稿节奏",
        "Week 2：推进检索与初稿",
        "Week 3：完成草稿审议与修订",
        "Week 4：发布复盘与下月预规划"
    ],
    intensive: [
        "Week 1：主题冻结 + 检索分工到人，首批候选论文入池",
        "Week 2：完成高相关论文筛选 + 草稿批量生成",
        "Week 3：日清式审议修订 + 未达标草稿重生",
        "Week 4：集中发布 + 全量复盘 + 下月周槽预填"
    ]
};

function buildThemeFocusedWeekSlots(theme: string): string[] {
    const normalized = theme.trim();
    return [
        `Week 1：${normalized} 的核心问题定义与证据边界`,
        `Week 2：${normalized} 的关键机制与高质量论文筛选`,
        `Week 3：${normalized} 的可执行策略与人群分层建议`,
        `Week 4：${normalized} 的常见误区、风险提示与复盘发布`
    ];
}

const STATUS_LABEL: Record<WorkflowTask["status"], string> = {
    planned: "待规划",
    paper_selected: "已选论文",
    drafted: "已生成草稿",
    approved: "审核通过",
    rejected: "驳回",
    published: "已发布"
};

const STATUS_COLOR: Record<WorkflowTask["status"], string> = {
    planned: "bg-slate-100 text-slate-700",
    paper_selected: "bg-blue-100 text-blue-700",
    drafted: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    published: "bg-violet-100 text-violet-700"
};

const DRAFT_TEMPLATE_LABEL: Record<DraftPromptTemplate, string> = {
    layered_progressive: "分层递进式（推荐）",
    qa_dialogue: "问答对话式",
    compare_analysis: "对比辨析式",
    narrative_research: "叙事研究型",
    minimal_cards: "极简卡片式"
};

const DRAFT_STUDY_TEMPLATE_LABEL: Record<DraftStudyTemplate, string> = {
    auto: "自动识别（推荐）",
    rct: "随机对照试验（RCT）",
    meta_analysis: "Meta分析",
    prospective_cohort: "前瞻性队列研究",
    retrospective_cohort: "回顾性队列研究",
    cross_sectional: "横断面研究",
    cohort: "队列研究",
    case_control: "病例对照研究",
    diagnostic_accuracy: "诊断试验准确性研究"
};

type AdminModuleKey = "home" | "planning" | "execution" | "library" | "settings";
type ExecutionStatusFilter = "all" | "in_progress" | WorkflowTask["status"];
type LibraryAdoptionFilter = "all" | "used" | "future";
type LibrarySearchCategory = FiveDCategory | "other";
type LibraryStorageFilter = "all" | "uncategorized" | string;
type LibraryReviewCycleFilter = "all" | "this_week" | "this_month" | "last_7_days" | "last_30_days";

const ADMIN_MODULE_OPTIONS: Array<{ key: AdminModuleKey; label: string; desc: string }> = [
    { key: "home", label: "后台主页", desc: "查看入口与关键进度" },
    { key: "planning", label: "规划模块", desc: "月历规划、周白板与分工" },
    { key: "execution", label: "执行模块", desc: "任务检索、草稿、审核与发布" },
    { key: "library", label: "论文库模块", desc: "论文入库、下载与批量导出" },
    { key: "settings", label: "设置模块", desc: "检索参数与协作配置" }
];

function getWeekKeyFromDate(date: Date): string {
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function shiftDateByDays(input: Date, days: number): Date {
    const result = new Date(input);
    result.setDate(result.getDate() + days);
    return result;
}

function getMonthKeyFromDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchState(method: "GET" | "POST" = "GET"): Promise<WorkflowState> {
    const response = await fetch("/api/admin/plan", { method });
    if (!response.ok) {
        throw new Error("无法读取后台计划数据");
    }
    return response.json() as Promise<WorkflowState>;
}

export function AdminWorkflowPanel({
    llmProviderName,
    llmProviderReady,
    envWarnings,
    currentUsername
}: {
    llmProviderName: string;
    llmProviderReady: boolean;
    envWarnings: string[];
    currentUsername: string;
}) {
    const [state, setState] = useState<WorkflowState | null>(null);
    const [activeCategory, setActiveCategory] = useState<FiveDCategory | "all">("all");
    const [activeExecutionStatus, setActiveExecutionStatus] = useState<ExecutionStatusFilter>("in_progress");
    const [executionOnlyPriority, setExecutionOnlyPriority] = useState(false);
    const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
    const [loadingCoreSummaryTaskId, setLoadingCoreSummaryTaskId] = useState<string | null>(null);
    const [draftPromptTemplateByTaskId, setDraftPromptTemplateByTaskId] = useState<Record<string, DraftPromptTemplate>>({});
    const [draftStudyTemplateByTaskId, setDraftStudyTemplateByTaskId] = useState<Record<string, DraftStudyTemplate>>({});
    const [monthlyGenerating, setMonthlyGenerating] = useState(false);
    const [monthlyPreviewLoading, setMonthlyPreviewLoading] = useState(false);
    const [monthlyGenerationPreview, setMonthlyGenerationPreview] = useState<MonthlyGenerationPreview | null>(null);
    const [templateName, setTemplateName] = useState("");
    const [themeSeed, setThemeSeed] = useState("");
    const [templateSaving, setTemplateSaving] = useState(false);
    const [libraryThemeSeed, setLibraryThemeSeed] = useState("衰老");
    const [libraryCategory, setLibraryCategory] = useState<LibrarySearchCategory>("other");
    const [librarySearchCustomKeywordText, setLibrarySearchCustomKeywordText] = useState("");
    const [libraryImportTitle, setLibraryImportTitle] = useState("");
    const [libraryImportDoi, setLibraryImportDoi] = useState("");
    const [libraryImportSourceUrl, setLibraryImportSourceUrl] = useState("");
    const [libraryImportPdfUrl, setLibraryImportPdfUrl] = useState("");
    const [libraryImporting, setLibraryImporting] = useState(false);
    const [libraryBulkImportUrls, setLibraryBulkImportUrls] = useState("");
    const [libraryBulkImporting, setLibraryBulkImporting] = useState(false);
    const [librarySearchPage, setLibrarySearchPage] = useState(1);
    const [libraryLastSearchStats, setLibraryLastSearchStats] = useState<{
        page: number;
        matched: number;
        added: number;
        reused: number;
        deleted: number;
    } | null>(null);
    const [librarySaving, setLibrarySaving] = useState(false);
    const [libraryDownloadingId, setLibraryDownloadingId] = useState<string | null>(null);
    const [libraryAdoptingId, setLibraryAdoptingId] = useState<string | null>(null);
    const [libraryCoreSummaryLoadingId, setLibraryCoreSummaryLoadingId] = useState<string | null>(null);
    const [libraryCoreSummaryContentById, setLibraryCoreSummaryContentById] = useState<Record<string, string>>({});
    const [libraryCoreSummaryOpenId, setLibraryCoreSummaryOpenId] = useState<string | null>(null);
    const [libraryPrimaryMode, setLibraryPrimaryMode] = useState<"summary" | "original">("summary");
    const [libraryBatchTopN, setLibraryBatchTopN] = useState(5);
    const [libraryBatchOnlyUnexported, setLibraryBatchOnlyUnexported] = useState(false);
    const [libraryBatchExporting, setLibraryBatchExporting] = useState(false);
    const [librarySelectedIds, setLibrarySelectedIds] = useState<Record<string, boolean>>({});
    const [libraryListPageSize, setLibraryListPageSize] = useState<number>(20);
    const [libraryListPage, setLibraryListPage] = useState<number>(1);
    const [libraryAdoptionFilter, setLibraryAdoptionFilter] = useState<LibraryAdoptionFilter>("all");
    const [libraryReviewCycleFilter, setLibraryReviewCycleFilter] = useState<LibraryReviewCycleFilter>("all");
    const [libraryCustomQuery, setLibraryCustomQuery] = useState("");
    const [libraryStorageFilter, setLibraryStorageFilter] = useState<LibraryStorageFilter>("all");
    const [libraryKeywordFilter, setLibraryKeywordFilter] = useState<string>("all");
    const [libraryKeywordDraftById, setLibraryKeywordDraftById] = useState<Record<string, string>>({});
    const [libraryPreviewOpenId, setLibraryPreviewOpenId] = useState<string | null>(null);
    const [libraryPreviewLoadingId, setLibraryPreviewLoadingId] = useState<string | null>(null);
    const [libraryPreviewFilePathById, setLibraryPreviewFilePathById] = useState<Record<string, string>>({});
    const [libraryPreviewTextById, setLibraryPreviewTextById] = useState<Record<string, string>>({});
    const [libraryDetailOpenById, setLibraryDetailOpenById] = useState<Record<string, boolean>>({});
    const libraryPreviewRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [collaborationSaving, setCollaborationSaving] = useState(false);
    const [exportedTaskFiles, setExportedTaskFiles] = useState<Record<string, string>>({});
    const [draftEditsByTaskId, setDraftEditsByTaskId] = useState<Record<string, { draftTitle: string; draftSummary: string; draftContent: string }>>({});
    const [draftSavingTaskId, setDraftSavingTaskId] = useState<string | null>(null);
    const [activeAdminModule, setActiveAdminModule] = useState<AdminModuleKey>("home");
    const [error, setError] = useState<string>("");

    const currentMonthKey = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }, []);

    const currentWeekKey = useMemo(() => {
        if (!state?.lastSyncedWeekKey) {
            return "";
        }
        return state.lastSyncedWeekKey;
    }, [state?.lastSyncedWeekKey]);

    const currentMonthlyPlan = useMemo(() => {
        if (!state) {
            return null;
        }
        return state.monthlyPlans.find((plan) => plan.monthKey === currentMonthKey) ?? state.monthlyPlans[0] ?? null;
    }, [state, currentMonthKey]);

    const currentWeeklyReview = useMemo(() => {
        if (!state) {
            return null;
        }
        return state.weeklyReviews.find((review) => review.weekKey === currentWeekKey) ?? state.weeklyReviews[0] ?? null;
    }, [state, currentWeekKey]);

    useEffect(() => {
        void (async () => {
            try {
                setError("");
                const nextState = await fetchState("GET");
                setState(nextState);
            } catch (fetchError) {
                setError(fetchError instanceof Error ? fetchError.message : "加载失败");
            }
        })();
    }, []);

    const visibleTasks = useMemo(() => {
        if (!state) {
            return [];
        }

        const categoryFiltered = activeCategory === "all"
            ? state.tasks
            : state.tasks.filter((task) => task.category === activeCategory);

        const statusFiltered = (() => {
            if (activeExecutionStatus === "all") {
                return categoryFiltered;
            }

            if (activeExecutionStatus === "in_progress") {
                return categoryFiltered.filter((task) => ["paper_selected", "drafted", "approved"].includes(task.status));
            }

            return categoryFiltered.filter((task) => task.status === activeExecutionStatus);
        })();

        if (!executionOnlyPriority) {
            return statusFiltered;
        }

        const priorityPaperIds = new Set(
            (state.paperLibrary ?? [])
                .filter((item) => !item.adopted)
                .map((item) => item.id)
        );

        return statusFiltered.filter((task) => Boolean(task.selectedPaperId) && priorityPaperIds.has(task.selectedPaperId as string));
    }, [state, activeCategory, activeExecutionStatus, executionOnlyPriority]);

    const completedAdoptedPaperIds = useMemo(() => {
        return new Set(
            (state?.tasks ?? [])
                .filter((task) => ["drafted", "approved", "published"].includes(task.status))
                .map((task) => task.selectedPaperId)
                .filter((paperId): paperId is string => Boolean(paperId))
        );
    }, [state?.tasks]);

    useEffect(() => {
        if (!state?.paperLibrary) {
            return;
        }

        const allowedIds = new Set(state.paperLibrary.map((item) => item.id));
        setLibrarySelectedIds((prev) => {
            const next = Object.fromEntries(
                Object.entries(prev).filter(([id, selected]) => selected && allowedIds.has(id))
            );
            return next;
        });
    }, [state?.paperLibrary]);

    useEffect(() => {
        if (!libraryPreviewOpenId) {
            return;
        }

        const previewText = libraryPreviewTextById[libraryPreviewOpenId];
        if (!previewText) {
            return;
        }

        const target = libraryPreviewRefs.current[libraryPreviewOpenId];
        if (!target) {
            return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [libraryPreviewOpenId, libraryPreviewTextById]);

    const weeklyProgress = useMemo(() => {
        if (!state) {
            return { published: 0, total: 0 };
        }
        const weeklyTasks = currentWeekKey
            ? state.tasks.filter((task) => task.weekKey === currentWeekKey)
            : [];
        const published = weeklyTasks.filter((task) => task.status === "published").length;
        return { published, total: weeklyTasks.length };
    }, [state, currentWeekKey]);

    const monthlyProgress = useMemo(() => {
        if (!state) {
            return { total: 0 };
        }

        const total = state.tasks.filter((task) => task.createdAt.startsWith(currentMonthKey)).length;
        return { total };
    }, [state, currentMonthKey]);

    const weeklyTaskTarget = state?.searchSettings.weeklyTaskTarget ?? WEEKLY_ARTICLE_TARGET;
    const monthlyTaskTarget = weeklyTaskTarget * WEEKS_PER_MONTH;
    const perCategoryTarget = Math.floor(weeklyTaskTarget / Object.keys(CATEGORY_LABEL).length);

    const allLibraryStorageCategories = useMemo(() => {
        if (!state?.paperLibrary || state.paperLibrary.length === 0) {
            return [] as string[];
        }

        return Array.from(
            new Set(
                state.paperLibrary
                    .map((item) => String(item.storageCategory ?? "").trim())
                    .filter(Boolean)
            )
        ).sort((left, right) => left.localeCompare(right, "zh-CN"));
    }, [state?.paperLibrary]);

    const allLibraryKeywordOptions = useMemo(() => {
        if (!state?.paperLibrary || state.paperLibrary.length === 0) {
            return [] as string[];
        }
        return Array.from(
            new Set(
                state.paperLibrary
                    .flatMap((item) => item.keywords ?? [])
                    .map((k) => String(k).trim())
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b, "zh-CN"));
    }, [state?.paperLibrary]);

    const filteredLibraryItems = useMemo(() => {
        const normalizedCustomQuery = libraryCustomQuery.trim().toLowerCase();
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const getCycleStartDate = () => {
            if (libraryReviewCycleFilter === "last_7_days") {
                return new Date(startOfToday.getTime() - (7 * 24 * 60 * 60 * 1000));
            }
            if (libraryReviewCycleFilter === "last_30_days") {
                return new Date(startOfToday.getTime() - (30 * 24 * 60 * 60 * 1000));
            }
            if (libraryReviewCycleFilter === "this_month") {
                return new Date(now.getFullYear(), now.getMonth(), 1);
            }
            if (libraryReviewCycleFilter === "this_week") {
                const day = now.getDay();
                const mondayOffset = day === 0 ? -6 : 1 - day;
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
            }
            return null;
        };

        const cycleStartDate = getCycleStartDate();
        const source = state?.paperLibrary ?? [];
        const filtered = source.filter((item) => {
            const isCompleted = completedAdoptedPaperIds.has(item.id);

            if (libraryAdoptionFilter === "used") {
                return isCompleted;
            }

            if (libraryAdoptionFilter === "future") {
                return !isCompleted;
            }

            return true;
        }).filter((item) => {
            if (libraryKeywordFilter === "all") {
                return true;
            }
            return (item.keywords ?? []).includes(libraryKeywordFilter);
        }).filter((item) => {
            if (!normalizedCustomQuery) {
                return true;
            }

            const searchableText = [
                item.title,
                item.titleZh,
                item.abstract,
                item.abstractEn,
                item.abstractZh,
                ...(item.keywords ?? [])
            ]
                .map((text) => String(text ?? "").toLowerCase())
                .join("\n");

            return searchableText.includes(normalizedCustomQuery);
        }).filter((item) => {
            if (libraryReviewCycleFilter === "all") {
                return true;
            }

            const isCompleted = completedAdoptedPaperIds.has(item.id);
            if (!isCompleted || !cycleStartDate) {
                return false;
            }

            const referenceDateText = item.adoptedAt ?? item.updatedAt ?? item.createdAt;
            const referenceDate = new Date(referenceDateText);
            if (Number.isNaN(referenceDate.getTime())) {
                return false;
            }

            return referenceDate >= cycleStartDate;
        }).filter((item) => {
            if (libraryStorageFilter === "all") {
                return true;
            }
            if (libraryStorageFilter === "uncategorized") {
                return !String(item.storageCategory ?? "").trim();
            }
            return String(item.storageCategory ?? "").trim() === libraryStorageFilter;
        });

        return filtered;
    }, [state?.paperLibrary, completedAdoptedPaperIds, libraryAdoptionFilter, libraryKeywordFilter, libraryCustomQuery, libraryReviewCycleFilter, libraryStorageFilter]);

    const visibleLibraryItems = useMemo(() => {
        return filteredLibraryItems;
    }, [filteredLibraryItems]);

    const libraryTotalPages = useMemo(() => {
        const total = visibleLibraryItems.length;
        return Math.max(1, Math.ceil(total / libraryListPageSize));
    }, [visibleLibraryItems.length, libraryListPageSize]);

    const pagedLibraryItems = useMemo(() => {
        const safePage = Math.min(Math.max(1, libraryListPage), libraryTotalPages);
        const start = (safePage - 1) * libraryListPageSize;
        return visibleLibraryItems.slice(start, start + libraryListPageSize);
    }, [visibleLibraryItems, libraryListPage, libraryListPageSize, libraryTotalPages]);

    useEffect(() => {
        setLibraryListPage(1);
    }, [libraryAdoptionFilter, libraryKeywordFilter, libraryCustomQuery, libraryStorageFilter, libraryListPageSize]);

    useEffect(() => {
        setLibraryListPage((prev) => Math.min(Math.max(1, prev), libraryTotalPages));
    }, [libraryTotalPages]);

    const selectedLibraryCount = useMemo(() => {
        if (pagedLibraryItems.length === 0) {
            return 0;
        }

        const currentListIds = new Set(pagedLibraryItems.map((item) => item.id));
        return Object.entries(librarySelectedIds)
            .filter(([id, selected]) => selected && currentListIds.has(id))
            .length;
    }, [pagedLibraryItems, librarySelectedIds]);

    const dashboardMetrics = useMemo(() => {
        if (!state) {
            return {
                previousWeekKey: "",
                previousWeekPublished: 0,
                previousWeekTotal: 0,
                previousWeekCompletion: 0,
                previousMonthKey: "",
                previousMonthPublished: 0,
                previousMonthTotal: 0,
                currentWeekTotal: 0,
                currentWeekInProgress: 0,
                currentMonthTotal: 0,
                currentMonthPublished: 0,
                runningTasks: [] as WorkflowTask[]
            };
        }

        const now = new Date();
        const previousWeekKey = getWeekKeyFromDate(shiftDateByDays(now, -7));
        const previousMonthKey = getMonthKeyFromDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));

        const previousWeekTasks = state.tasks.filter((task) => task.weekKey === previousWeekKey);
        const previousWeekPublished = previousWeekTasks.filter((task) => task.status === "published").length;
        const previousWeekTotal = previousWeekTasks.length;
        const previousWeekCompletion = previousWeekTotal > 0
            ? Math.round((previousWeekPublished / previousWeekTotal) * 100)
            : 0;

        const previousMonthTasks = state.tasks.filter((task) => task.createdAt.startsWith(previousMonthKey));
        const previousMonthPublished = previousMonthTasks.filter((task) => task.status === "published").length;
        const previousMonthTotal = previousMonthTasks.length;

        const currentWeekTasks = state.tasks.filter((task) => task.weekKey === currentWeekKey);
        const currentWeekTotal = currentWeekTasks.length;
        const currentWeekInProgress = currentWeekTasks.filter((task) => ["paper_selected", "drafted", "approved"].includes(task.status)).length;

        const currentMonthTasks = state.tasks.filter((task) => task.createdAt.startsWith(currentMonthKey));
        const currentMonthTotal = currentMonthTasks.length;
        const currentMonthPublished = currentMonthTasks.filter((task) => task.status === "published").length;

        const runningTasks = state.tasks
            .filter((task) => ["paper_selected", "drafted", "approved"].includes(task.status))
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .slice(0, 8);

        return {
            previousWeekKey,
            previousWeekPublished,
            previousWeekTotal,
            previousWeekCompletion,
            previousMonthKey,
            previousMonthPublished,
            previousMonthTotal,
            currentWeekTotal,
            currentWeekInProgress,
            currentMonthTotal,
            currentMonthPublished,
            runningTasks
        };
    }, [state, currentWeekKey, currentMonthKey]);

    async function syncPlan() {
        try {
            setError("");
            const nextState = await fetchState("POST");
            setState(nextState);
        } catch (syncError) {
            setError(syncError instanceof Error ? syncError.message : "同步失败");
        }
    }

    async function loadMonthlyGenerationPreview() {
        setMonthlyPreviewLoading(true);
        try {
            setError("");
            const response = await fetch("/api/admin/monthly-plan/generate/preview", {
                method: "GET"
            });

            if (!response.ok) {
                throw new Error("读取预生成预览失败");
            }

            const preview = await response.json() as MonthlyGenerationPreview;
            setMonthlyGenerationPreview(preview);
        } catch (previewError) {
            setError(previewError instanceof Error ? previewError.message : "读取预生成预览失败");
        } finally {
            setMonthlyPreviewLoading(false);
        }
    }

    async function generateMonthlyPlanTasks() {
        setMonthlyGenerating(true);
        try {
            setError("");
            const response = await fetch("/api/admin/monthly-plan/generate", {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error("生成当月任务失败");
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
            setMonthlyGenerationPreview(null);
        } catch (generateError) {
            setError(generateError instanceof Error ? generateError.message : "生成当月任务失败");
        } finally {
            setMonthlyGenerating(false);
        }
    }

    async function patchTask(taskId: string, payload: Record<string, unknown>) {
        setLoadingTaskId(taskId);
        try {
            setError("");
            const response = await fetch(`/api/admin/task/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error("更新任务失败");
            }
            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (patchError) {
            setError(patchError instanceof Error ? patchError.message : "更新失败");
        } finally {
            setLoadingTaskId(null);
        }
    }

    async function patchSettings(payload: Record<string, unknown>) {
        setSettingsSaving(true);
        try {
            setError("");
            const response = await fetch("/api/admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("更新检索设置失败");
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (settingsError) {
            setError(settingsError instanceof Error ? settingsError.message : "设置保存失败");
        } finally {
            setSettingsSaving(false);
        }
    }

    async function patchCollaboration(payload: Record<string, unknown>) {
        setCollaborationSaving(true);
        try {
            setError("");
            const response = await fetch("/api/admin/collaboration", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("更新分工设置失败");
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (collaborationError) {
            setError(collaborationError instanceof Error ? collaborationError.message : "分工设置保存失败");
        } finally {
            setCollaborationSaving(false);
        }
    }

    async function createMonthlyPlanEntry() {
        try {
            setError("");
            const response = await fetch("/api/admin/monthly-plan", { method: "POST" });
            if (!response.ok) {
                throw new Error("创建月度规划失败");
            }
            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (monthlyError) {
            setError(monthlyError instanceof Error ? monthlyError.message : "创建月度规划失败");
        }
    }

    async function applyCurrentWeekSlot(planId: string) {
        try {
            setError("");
            const response = await fetch(`/api/admin/monthly-plan/${planId}/apply-week`, {
                method: "POST"
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "应用周槽失败");
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (monthlyError) {
            setError(monthlyError instanceof Error ? monthlyError.message : "应用周槽失败");
        }
    }

    async function patchMonthlyPlan(planId: string, payload: Record<string, unknown>) {
        try {
            setError("");
            const response = await fetch(`/api/admin/monthly-plan/${planId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error("更新月度规划失败");
            }
            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (monthlyError) {
            setError(monthlyError instanceof Error ? monthlyError.message : "更新月度规划失败");
        }
    }

    async function applyWeekSlotPreset(planId: string, preset: "basic" | "intensive") {
        const label = preset === "basic" ? "基础版" : "强执行版";
        const confirmed = window.confirm(`确认切换到${label}模板吗？将一键替换 Week 1-4。`);
        if (!confirmed) {
            return;
        }

        await patchMonthlyPlan(planId, { weekSlots: WEEK_SLOT_PRESETS[preset] });
    }

    async function applySavedTemplate(planId: string, name: string, weekSlots: string[]) {
        const confirmed = window.confirm(`确认应用模板「${name}」吗？将一键替换 Week 1-4。`);
        if (!confirmed) {
            return;
        }

        await patchMonthlyPlan(planId, { weekSlots });
    }

    async function saveCurrentWeekSlotTemplate(planId: string, weekSlots: string[]) {
        const normalizedName = templateName.trim();
        if (!normalizedName) {
            setError("请输入模板名称");
            return;
        }

        setTemplateSaving(true);
        try {
            setError("");
            const response = await fetch("/api/admin/week-slot-templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: normalizedName, weekSlots })
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "保存模板失败");
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
            setTemplateName("");
            await patchMonthlyPlan(planId, { weekSlots });
        } catch (templateError) {
            setError(templateError instanceof Error ? templateError.message : "保存模板失败");
        } finally {
            setTemplateSaving(false);
        }
    }

    async function applyThemeFocusedTemplate(planId: string) {
        const normalizedTheme = themeSeed.trim();
        if (!normalizedTheme) {
            setError("请输入主题主线，例如：睡眠与衰老");
            return;
        }

        const confirmed = window.confirm(`确认按主题「${normalizedTheme}」展开 Week 1-4 吗？`);
        if (!confirmed) {
            return;
        }

        setError("");
        const nextSlots = buildThemeFocusedWeekSlots(normalizedTheme);
        await patchMonthlyPlan(planId, { weekSlots: nextSlots });

        if (!templateName.trim()) {
            setTemplateName(`${normalizedTheme} 专题`);
        }
    }

    async function savePapersToLibrary(mode: "reset" | "append" = "reset") {
        const normalizedTheme = libraryThemeSeed.trim();
        if (!normalizedTheme) {
            setError("请输入自定义关键字");
            return;
        }

        const targetPage = mode === "append" ? (librarySearchPage + 1) : 1;

        setLibrarySaving(true);
        try {
            setError("");
            const keywords = librarySearchCustomKeywordText
                .split(/[,，\s]+/)
                .map((k) => k.trim())
                .filter(Boolean);
            const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 20);
            const response = await fetch("/api/admin/paper-library", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    theme: normalizedTheme,
                    category: libraryCategory,
                    page: targetPage,
                    keywords: uniqueKeywords.length > 0 ? uniqueKeywords : undefined
                })
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "论文入库失败");
            }

            const payload = await response.json() as WorkflowState & {
                addedCount?: number;
                matchedCount?: number;
                reusedCount?: number;
                requestedPage?: number;
            };
            setState(payload);
            setLibrarySearchPage(payload.requestedPage ?? targetPage);
            const addedCount = payload.addedCount ?? 0;
            const matchedCount = payload.matchedCount ?? 0;
            const reusedCount = payload.reusedCount ?? 0;
            setLibraryLastSearchStats({
                page: payload.requestedPage ?? targetPage,
                matched: matchedCount,
                added: addedCount,
                reused: reusedCount,
                deleted: 0
            });
            if (matchedCount === 0) {
                setError(`第 ${targetPage} 页未检索到论文，请降低相关性阈值或检查来源配置与网络。`);
            } else if (addedCount === 0 && reusedCount > 0) {
                setError(`第 ${targetPage} 页命中 ${matchedCount} 篇，但均已在论文库中（复用 ${reusedCount} 篇），所以新增为 0。`);
            } else {
                setError("");
            }
        } catch (libraryError) {
            setError(libraryError instanceof Error ? libraryError.message : "论文入库失败");
        } finally {
            setLibrarySaving(false);
        }
    }

    async function importPaperToLibraryFromExternal() {
        if (!libraryImportTitle.trim() && !libraryImportDoi.trim() && !libraryImportSourceUrl.trim()) {
            setError("请至少输入标题、DOI 或来源链接之一");
            return;
        }

        setLibraryImporting(true);
        try {
            setError("");
            const importKeywords = librarySearchCustomKeywordText
                .split(/[,，\s]+/)
                .map((k) => k.trim())
                .filter(Boolean);
            const importKeywordsUnique = Array.from(new Set(importKeywords)).slice(0, 20);
            const response = await fetch("/api/admin/paper-library/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: libraryImportTitle,
                    doi: libraryImportDoi,
                    sourceUrl: libraryImportSourceUrl,
                    pdfUrl: libraryImportPdfUrl,
                    category: libraryCategory === "other" ? "cardio" : libraryCategory,
                    themeSeed: libraryThemeSeed,
                    keywords: importKeywordsUnique.length > 0 ? importKeywordsUnique : undefined
                })
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "外部导入失败");
            }

            const payload = await response.json() as WorkflowState & { reused?: boolean };
            setState(payload);
            setLibraryImportTitle("");
            setLibraryImportDoi("");
            setLibraryImportSourceUrl("");
            setLibraryImportPdfUrl("");
            if (payload.reused) {
                setError("检测到已存在同源论文，已自动更新并复用现有条目。");
            }
        } catch (importError) {
            setError(importError instanceof Error ? importError.message : "外部导入失败");
        } finally {
            setLibraryImporting(false);
        }
    }

    async function importPapersToLibraryByUrlsBatch() {
        const urlList = libraryBulkImportUrls
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .filter((line) => /^https?:\/\//i.test(line));

        if (urlList.length === 0) {
            setError("请至少粘贴一个有效网址（每行一个 http/https 链接）");
            return;
        }

        const confirmed = window.confirm(`确认批量导入 ${urlList.length} 个网址到论文留存库吗？`);
        if (!confirmed) {
            return;
        }

        setLibraryBulkImporting(true);
        setError("");

        let successCount = 0;
        let reusedCount = 0;
        let failedCount = 0;

        const bulkKeywords = librarySearchCustomKeywordText
            .split(/[,，\s]+/)
            .map((k) => k.trim())
            .filter(Boolean);
        const bulkKeywordsUnique = Array.from(new Set(bulkKeywords)).slice(0, 20);

        for (const sourceUrl of urlList) {
            try {
                const response = await fetch("/api/admin/paper-library/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sourceUrl,
                        category: libraryCategory === "other" ? "cardio" : libraryCategory,
                        themeSeed: libraryThemeSeed,
                        keywords: bulkKeywordsUnique.length > 0 ? bulkKeywordsUnique : undefined
                    })
                });

                if (!response.ok) {
                    failedCount += 1;
                    continue;
                }

                const payload = await response.json() as WorkflowState & { reused?: boolean };
                setState(payload);
                if (payload.reused) {
                    reusedCount += 1;
                } else {
                    successCount += 1;
                }
            } catch {
                failedCount += 1;
            }
        }

        setLibraryBulkImporting(false);

        if (failedCount > 0) {
            setError(`批量网址导入完成：新增 ${successCount} 篇，复用 ${reusedCount} 篇，失败 ${failedCount} 篇。`);
            return;
        }

        setLibraryBulkImportUrls("");
        window.alert(`批量网址导入完成：新增 ${successCount} 篇，复用 ${reusedCount} 篇。`);
    }

    async function downloadLibraryPaper(itemId: string, mode: "summary" | "original"): Promise<boolean> {
        const downloadingKey = `${itemId}:${mode}`;
        setLibraryDownloadingId(downloadingKey);
        try {
            setError("");
            const response = await fetch(`/api/admin/paper-library/${itemId}/download`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode })
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? (mode === "original" ? "下载原文失败" : "下载摘要失败"));
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
            if (mode === "summary") {
                const previewOpened = await openLibrarySummaryPreview(itemId, {
                    forceOpen: true,
                    bypassCache: true,
                    silentError: true
                });
                if (!previewOpened) {
                    setError("摘要已下载，但自动预览失败；可点击“本页查看摘要”重试。");
                }
            }
            return true;
        } catch (downloadError) {
            setError(downloadError instanceof Error ? downloadError.message : (mode === "original" ? "下载原文失败" : "下载摘要失败"));
            return false;
        } finally {
            setLibraryDownloadingId(null);
        }
    }

    async function adoptLibraryItemToCurrentPeriod(itemId: string) {
        setLibraryAdoptingId(itemId);
        try {
            setError("");
            const response = await fetch(`/api/admin/paper-library/${itemId}/adopt-to-current-period`, { method: "POST" });
            const payload = await response.json() as WorkflowState & { adopted?: boolean; message?: string; taskId?: string };
            setState(payload);
            if (payload.adopted === false && payload.message) {
                setError(payload.message);
            } else if (payload.adopted) {
                setActiveAdminModule("execution");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "入选当期失败");
        } finally {
            setLibraryAdoptingId(null);
        }
    }

    async function generateLibraryItemCoreSummary(itemId: string) {
        setLibraryCoreSummaryLoadingId(itemId);
        try {
            setError("");
            const response = await fetch(`/api/admin/paper-library/${itemId}/generate-core-summary`, { method: "POST" });
            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "预检生成失败");
            }
            const payload = await response.json() as { content: string };
            setLibraryCoreSummaryContentById((prev) => ({ ...prev, [itemId]: payload.content }));
            setLibraryCoreSummaryOpenId(itemId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "预检生成失败");
        } finally {
            setLibraryCoreSummaryLoadingId(null);
        }
    }

    async function exportTopNSummaries() {
        if (!state?.paperLibrary || state.paperLibrary.length === 0) {
            setError("论文库为空，无法批量导出");
            return;
        }

        const sourceList = libraryBatchOnlyUnexported
            ? state.paperLibrary.filter((item) => !item.summaryFilePath)
            : state.paperLibrary;

        if (sourceList.length === 0) {
            setError("没有可导出的未导出摘要论文");
            return;
        }

        const maxExportable = Math.min(20, sourceList.length);
        const normalizedTopN = Math.min(maxExportable, Math.max(1, Math.trunc(libraryBatchTopN || 1)));
        const confirmed = window.confirm(`确认批量导出${libraryBatchOnlyUnexported ? "未导出摘要" : "当前列表"}前 ${normalizedTopN} 篇摘要（含中文翻译）吗？`);
        if (!confirmed) {
            return;
        }

        setLibraryBatchExporting(true);
        setError("");

        let successCount = 0;
        let failedCount = 0;

        const targets = sourceList.slice(0, normalizedTopN);
        for (const item of targets) {
            const ok = await downloadLibraryPaper(item.id, "summary");
            if (ok) {
                successCount += 1;
            } else {
                failedCount += 1;
            }
        }

        setLibraryBatchExporting(false);

        if (failedCount > 0) {
            setError(`批量导出完成：成功 ${successCount} 篇，失败 ${failedCount} 篇。`);
            return;
        }

        window.alert(`批量导出完成：成功 ${successCount} 篇摘要。`);
    }

    async function exportSelectedSummaries() {
        if (!state?.paperLibrary || state.paperLibrary.length === 0) {
            setError("论文库为空，无法批量导出");
            return;
        }

        const selectedTargets = state.paperLibrary.filter((item) => librarySelectedIds[item.id]);
        if (selectedTargets.length === 0) {
            setError("请先勾选要导出的论文");
            return;
        }

        const confirmed = window.confirm(`确认批量导出已选 ${selectedTargets.length} 篇摘要（含中文翻译）吗？`);
        if (!confirmed) {
            return;
        }

        setLibraryBatchExporting(true);
        setError("");

        let successCount = 0;
        let failedCount = 0;

        for (const item of selectedTargets) {
            const ok = await downloadLibraryPaper(item.id, "summary");
            if (ok) {
                successCount += 1;
            } else {
                failedCount += 1;
            }
        }

        setLibraryBatchExporting(false);

        if (failedCount > 0) {
            setError(`选中导出完成：成功 ${successCount} 篇，失败 ${failedCount} 篇。`);
            return;
        }

        window.alert(`选中导出完成：成功 ${successCount} 篇摘要。`);
    }

    function toggleSelectCurrentList(select: boolean) {
        const currentList = pagedLibraryItems;
        if (currentList.length === 0) {
            return;
        }

        setLibrarySelectedIds((prev) => {
            const next = { ...prev };
            for (const item of currentList) {
                if (select) {
                    next[item.id] = true;
                } else {
                    delete next[item.id];
                }
            }
            return next;
        });
    }

    async function openLibrarySummaryPreview(
        itemId: string,
        options?: { forceOpen?: boolean; bypassCache?: boolean; silentError?: boolean }
    ): Promise<boolean> {
        const forceOpen = options?.forceOpen ?? false;
        const bypassCache = options?.bypassCache ?? false;
        const silentError = options?.silentError ?? false;

        if (!forceOpen && libraryPreviewOpenId === itemId) {
            setLibraryPreviewOpenId(null);
            return true;
        }

        const cached = libraryPreviewTextById[itemId];
        if (!bypassCache && cached) {
            setLibraryPreviewOpenId(itemId);
            return true;
        }

        setLibraryPreviewLoadingId(itemId);
        try {
            setError("");
            const response = await fetch(`/api/admin/paper-library/${itemId}/summary`, {
                method: "GET"
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "读取摘要失败");
            }

            const payload = await response.json() as { filePath: string; content: string };
            setLibraryPreviewFilePathById((prev) => ({
                ...prev,
                [itemId]: payload.filePath
            }));
            setLibraryPreviewTextById((prev) => ({
                ...prev,
                [itemId]: payload.content
            }));
            setLibraryPreviewOpenId(itemId);
            return true;
        } catch (previewError) {
            if (!silentError) {
                setError(previewError instanceof Error ? previewError.message : "读取摘要失败");
            }
            return false;
        } finally {
            setLibraryPreviewLoadingId(null);
        }
    }

    async function patchLibraryKeywords(itemId: string, keywords: string[]) {
        try {
            setError("");
            const response = await fetch(`/api/admin/paper-library/${itemId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keywords })
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "更新关键词失败");
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
            return true;
        } catch (keywordError) {
            setError(keywordError instanceof Error ? keywordError.message : "更新关键词失败");
            return false;
        }
    }

    async function patchLibraryMeta(itemId: string, payload: { adopted?: boolean; storageCategory?: string }) {
        try {
            setError("");
            const response = await fetch(`/api/admin/paper-library/${itemId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const result = await response.json() as { message?: string };
                throw new Error(result.message ?? "更新论文元信息失败");
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
            return true;
        } catch (metaError) {
            setError(metaError instanceof Error ? metaError.message : "更新论文元信息失败");
            return false;
        }
    }

    async function removeLibraryItem(itemId: string) {
        if (completedAdoptedPaperIds.has(itemId)) {
            setError("该论文已采纳并进入执行流程，需永久保存，不可删除。");
            return;
        }

        const confirmed = window.confirm("确认删除该入库论文吗？删除后不可恢复。");
        if (!confirmed) {
            return;
        }

        try {
            setError("");
            const response = await fetch(`/api/admin/paper-library/${itemId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "删除论文失败");
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
            setLibraryPreviewOpenId((prev) => (prev === itemId ? null : prev));
            setLibraryLastSearchStats((prev) => prev ? { ...prev, deleted: prev.deleted + 1 } : prev);
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "删除论文失败");
        }
    }

    async function removeSelectedLibraryItems() {
        if (!state?.paperLibrary || state.paperLibrary.length === 0) {
            setError("论文库为空，无法批量删除");
            return;
        }

        const currentVisibleIds = new Set(visibleLibraryItems.map((item) => item.id));
        const selectedTargets = state.paperLibrary.filter((item) => Boolean(librarySelectedIds[item.id]) && currentVisibleIds.has(item.id));
        const deletableTargets = selectedTargets.filter((item) => !completedAdoptedPaperIds.has(item.id));
        const protectedTargets = selectedTargets.length - deletableTargets.length;

        if (selectedTargets.length === 0) {
            setError("请先勾选要删除的论文");
            return;
        }

        if (deletableTargets.length === 0) {
            setError("所选论文均为已采纳归档论文，需永久保存，不可删除。");
            return;
        }

        const confirmed = window.confirm(`确认删除当前勾选中可删除的 ${deletableTargets.length} 篇论文吗？${protectedTargets > 0 ? `（另有 ${protectedTargets} 篇已采纳归档论文将自动跳过）` : ""}`);
        if (!confirmed) {
            return;
        }

        setLibraryBatchExporting(true);
        setError("");

        let successCount = 0;
        let failedCount = 0;

        for (const item of deletableTargets) {
            try {
                const response = await fetch(`/api/admin/paper-library/${item.id}`, {
                    method: "DELETE"
                });

                if (!response.ok) {
                    failedCount += 1;
                    continue;
                }

                const nextState = await response.json() as WorkflowState;
                setState(nextState);
                setLibraryPreviewOpenId((prev) => (prev === item.id ? null : prev));
                setLibrarySelectedIds((prev) => {
                    const next = { ...prev };
                    delete next[item.id];
                    return next;
                });
                successCount += 1;
            } catch {
                failedCount += 1;
            }
        }

        setLibraryBatchExporting(false);

        if (failedCount > 0) {
            if (successCount > 0) {
                setLibraryLastSearchStats((prev) => prev ? { ...prev, deleted: prev.deleted + successCount } : prev);
            }
            setError(`批量删除完成：成功 ${successCount} 篇，失败 ${failedCount} 篇${protectedTargets > 0 ? `，跳过归档论文 ${protectedTargets} 篇` : ""}。`);
            return;
        }

        if (successCount > 0) {
            setLibraryLastSearchStats((prev) => prev ? { ...prev, deleted: prev.deleted + successCount } : prev);
        }

        window.alert(`批量删除完成：已删除 ${successCount} 篇论文。${protectedTargets > 0 ? `已跳过归档论文 ${protectedTargets} 篇。` : ""}`);
    }

    async function addLibraryKeyword(itemId: string, existingKeywords: string[]) {
        const draft = String(libraryKeywordDraftById[itemId] ?? "").trim();
        if (!draft) {
            return;
        }

        const nextKeywords = Array.from(new Set([...existingKeywords, draft]));
        await patchLibraryKeywords(itemId, nextKeywords);
        setLibraryKeywordDraftById((prev) => ({
            ...prev,
            [itemId]: ""
        }));
    }

    async function removeLibraryKeyword(itemId: string, existingKeywords: string[], keyword: string) {
        const nextKeywords = existingKeywords.filter((item) => item !== keyword);
        await patchLibraryKeywords(itemId, nextKeywords);
    }

    async function createWeeklyReviewEntry() {
        try {
            setError("");
            const response = await fetch("/api/admin/weekly-review", { method: "POST" });
            if (!response.ok) {
                throw new Error("创建周实施复盘失败");
            }
            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : "创建周实施复盘失败");
        }
    }

    async function patchWeeklyReview(reviewId: string, payload: Record<string, unknown>) {
        try {
            setError("");
            const response = await fetch(`/api/admin/weekly-review/${reviewId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error("更新周实施复盘失败");
            }
            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : "更新周实施复盘失败");
        }
    }

    async function importWeeklyInbox(reviewId: string) {
        try {
            setError("");
            const response = await fetch(`/api/admin/weekly-review/${reviewId}/import`, {
                method: "POST"
            });
            if (!response.ok) {
                throw new Error("导入检索框失败");
            }
            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : "导入检索框失败");
        }
    }

    async function callTaskAction(taskId: string, action: "papers" | "generate" | "publish" | "export") {
        setLoadingTaskId(taskId);
        try {
            setError("");
            const generatePayload = action === "generate"
                ? {
                    promptTemplate: draftPromptTemplateByTaskId[taskId] ?? "layered_progressive",
                    studyTemplate: draftStudyTemplateByTaskId[taskId] ?? "auto"
                }
                : undefined;
            const response = await fetch(`/api/admin/task/${taskId}/${action}`, {
                method: "POST",
                headers: generatePayload ? { "Content-Type": "application/json" } : undefined,
                body: generatePayload ? JSON.stringify(generatePayload) : undefined
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "操作失败");
            }

            const payload = await response.json() as WorkflowState & { publishedFile?: string; exportedFile?: string };
            setState(payload);
            if (action === "export" && payload.exportedFile) {
                setExportedTaskFiles((prev) => ({
                    ...prev,
                    [taskId]: payload.exportedFile as string
                }));
            }
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "执行失败");
        } finally {
            setLoadingTaskId(null);
        }
    }

    async function callGenerateCoreSummary(taskId: string) {
        setLoadingCoreSummaryTaskId(taskId);
        try {
            setError("");
            const response = await fetch(`/api/admin/task/${taskId}/generate-core-summary`, { method: "POST" });
            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "生成核心内容失败");
            }
            const payload = await response.json() as WorkflowState;
            setState(payload);
        } catch (err) {
            setError(err instanceof Error ? err.message : "生成核心内容失败");
        } finally {
            setLoadingCoreSummaryTaskId(null);
        }
    }

    async function logout() {
        try {
            await fetch("/api/admin/auth/logout", { method: "POST" });
        } finally {
            window.location.href = "/admin/login";
        }
    }

    return (
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">内容管理后台（AI 周更）</h1>
                    <p className="mt-2 text-slate-600">
                        当前周：{state?.lastSyncedWeekKey ?? "--"} · 本周发布进度：{weeklyProgress.published}/{weeklyTaskTarget} · 本月产文进度：{monthlyProgress.total}/{monthlyTaskTarget}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                        当前模型提供商：
                        <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 font-semibold ${llmProviderReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {llmProviderName} · {llmProviderReady ? "已启用" : "未配置，回退模板"}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                        当前用户：{currentUsername}
                    </span>
                    <button
                        onClick={syncPlan}
                        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
                    >
                        同步本周规划（五维各 {perCategoryTarget} 篇，共 {weeklyTaskTarget} 篇）
                    </button>
                    <button
                        onClick={loadMonthlyGenerationPreview}
                        disabled={monthlyGenerating || monthlyPreviewLoading}
                        className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-60"
                    >
                        {monthlyPreviewLoading
                            ? "预览中..."
                            : `预生成前预览（目标 ${monthlyTaskTarget} 篇）`}
                    </button>
                    <button
                        onClick={logout}
                        className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        退出登录
                    </button>
                </div>
            </div>

            {envWarnings.length > 0 ? (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <p className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        环境变量自检提示
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                        {envWarnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                    <p className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        环境变量检查通过
                    </p>
                    <p className="mt-1 text-sm">后台登录与模型生成配置完整，可直接执行“从论文库选取论文 → 生成草稿 → 审核发布”流程。</p>
                </div>
            )}

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">后台主页 · 模块入口</h2>
                <p className="mt-1 text-xs text-slate-500">先选择模块，再进入对应子模块操作，避免整页过长。</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {ADMIN_MODULE_OPTIONS.map((module) => (
                        <button
                            key={module.key}
                            type="button"
                            onClick={() => setActiveAdminModule(module.key)}
                            className={`rounded-full px-4 py-2 text-sm font-medium ${activeAdminModule === module.key ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                        >
                            {module.label}
                        </button>
                    ))}
                </div>

                {activeAdminModule === "home" && (
                    <>
                        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {ADMIN_MODULE_OPTIONS.filter((module) => module.key !== "home").map((module) => (
                                <button
                                    key={`home-card-${module.key}`}
                                    type="button"
                                    onClick={() => setActiveAdminModule(module.key)}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100"
                                >
                                    <p className="text-sm font-semibold text-slate-900">{module.label}</p>
                                    <p className="mt-1 text-xs text-slate-600">{module.desc}</p>
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                <p className="font-semibold text-slate-900">上周运营数据（{dashboardMetrics.previousWeekKey || "--"}）</p>
                                <p className="mt-1 text-slate-700">发布：{dashboardMetrics.previousWeekPublished}/{dashboardMetrics.previousWeekTotal}</p>
                                <p className="text-slate-700">完成率：{dashboardMetrics.previousWeekCompletion}%</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                <p className="font-semibold text-slate-900">上月运营数据（{dashboardMetrics.previousMonthKey || "--"}）</p>
                                <p className="mt-1 text-slate-700">发布：{dashboardMetrics.previousMonthPublished}/{dashboardMetrics.previousMonthTotal}</p>
                                <p className="text-slate-700">月目标参考：{monthlyTaskTarget}</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                <p className="font-semibold text-slate-900">本周/本月计划</p>
                                <p className="mt-1 text-slate-700">本周任务：{dashboardMetrics.currentWeekTotal}/{weeklyTaskTarget}</p>
                                <p className="text-slate-700">本月任务：{dashboardMetrics.currentMonthTotal}/{monthlyTaskTarget}</p>
                                <p className="text-slate-700">本月已发布：{dashboardMetrics.currentMonthPublished}</p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-slate-900">执行中任务</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveAdminModule("execution");
                                        setActiveExecutionStatus("in_progress");
                                    }}
                                    className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                    查看执行中
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">当前执行中：{dashboardMetrics.currentWeekInProgress}（本周） / {dashboardMetrics.runningTasks.length}（最近展示）</p>
                            {dashboardMetrics.runningTasks.length > 0 ? (
                                <ul className="mt-2 space-y-1 text-slate-700">
                                    {dashboardMetrics.runningTasks.map((task) => (
                                        <li key={`running-${task.id}`}>
                                            {task.weekKey} · {CATEGORY_LABEL[task.category]} · {task.theme}（{STATUS_LABEL[task.status]}）
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-2 text-slate-500">暂无执行中的任务。</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                    {error}
                </div>
            )}

            {(activeAdminModule === "home" || activeAdminModule === "planning") && monthlyGenerationPreview && (
                <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
                    <h2 className="text-sm font-semibold">预生成预览（{monthlyGenerationPreview.monthKey}）</h2>
                    <p className="mt-1 text-sm">
                        当前已存在 {monthlyGenerationPreview.existingTotal}/{monthlyGenerationPreview.targetTotal} 篇，
                        本次将新增 {monthlyGenerationPreview.willAddTotal} 篇。
                    </p>
                    <ul className="mt-3 space-y-1 text-sm">
                        {monthlyGenerationPreview.weeks.map((week) => (
                            <li key={week.weekKey}>
                                {week.weekKey}：已存在 {week.existingCount}/{week.targetCount}，将新增 {week.willAddCount}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={generateMonthlyPlanTasks}
                            disabled={monthlyGenerating || monthlyGenerationPreview.willAddTotal === 0}
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                        >
                            {monthlyGenerating ? "执行中..." : "确认预生成"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMonthlyGenerationPreview(null)}
                            disabled={monthlyGenerating}
                            className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                            取消
                        </button>
                    </div>
                    {monthlyGenerationPreview.willAddTotal === 0 && (
                        <p className="mt-2 text-xs text-blue-700">本月任务已齐，不需要再次生成。</p>
                    )}
                </div>
            )}

            {(activeAdminModule === "planning" || activeAdminModule === "settings") && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">协作分工（3 人）</h2>
                <p className="mt-1 text-xs text-slate-500">固定 3 角色：规划管理员、论文检索编辑、草稿审议与发布编辑；其他用户为读者浏览角色。</p>
                <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <label className="text-sm text-slate-700">
                        规划管理员
                        <input
                            defaultValue={state?.collaboration.planningReviewer ?? ""}
                            onBlur={(event) => {
                                const value = event.target.value.trim();
                                if (value && value !== state?.collaboration.planningReviewer) {
                                    void patchCollaboration({ planningReviewer: value });
                                }
                            }}
                            disabled={collaborationSaving || !state}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                        />
                    </label>

                    <label className="text-sm text-slate-700">
                        论文检索编辑
                        <input
                            defaultValue={state?.collaboration.paperRetriever ?? ""}
                            onBlur={(event) => {
                                const value = event.target.value.trim();
                                if (value && value !== state?.collaboration.paperRetriever) {
                                    void patchCollaboration({ paperRetriever: value });
                                }
                            }}
                            disabled={collaborationSaving || !state}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                        />
                    </label>

                    <label className="text-sm text-slate-700">
                        草稿审议与发布编辑
                        <input
                            defaultValue={state?.collaboration.draftReviewer ?? ""}
                            onBlur={(event) => {
                                const value = event.target.value.trim();
                                if (value && value !== state?.collaboration.draftReviewer) {
                                    void patchCollaboration({ draftReviewer: value });
                                }
                            }}
                            disabled={collaborationSaving || !state}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                        />
                    </label>
                </div>
                </div>
            )}

            {activeAdminModule === "planning" && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">月度主题规划月历</h2>
                        <p className="mt-1 text-xs text-slate-500">规划者可预先把当月主题导入 4 个周槽，按当前周目标执行并汇总当月产文目标。</p>
                    </div>
                    {!currentMonthlyPlan && (
                        <button
                            type="button"
                            onClick={createMonthlyPlanEntry}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                            创建当月规划
                        </button>
                    )}
                </div>

                {currentMonthlyPlan ? (
                    <div className="mt-4 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => void applyCurrentWeekSlot(currentMonthlyPlan.id)}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                                应用当周周槽到本周任务
                            </button>
                            <button
                                type="button"
                                onClick={() => void applyWeekSlotPreset(currentMonthlyPlan.id, "basic")}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                预设模板：基础版
                            </button>
                            <button
                                type="button"
                                onClick={() => void applyWeekSlotPreset(currentMonthlyPlan.id, "intensive")}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                预设模板：强执行版
                            </button>
                            <span className="text-xs text-slate-500">会批量更新当前周（{state?.lastSyncedWeekKey ?? "--"}）任务主题</span>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-700">自定义模板（另存为并复用）</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <input
                                    type="text"
                                    value={themeSeed}
                                    onChange={(event) => setThemeSeed(event.target.value)}
                                    placeholder="输入主题主线，例如：睡眠与衰老"
                                    className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => void applyThemeFocusedTemplate(currentMonthlyPlan.id)}
                                    className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                    按主题展开4周
                                </button>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(event) => setTemplateName(event.target.value)}
                                    placeholder="输入模板名称，例如：三月强执行"
                                    className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                />
                                <button
                                    type="button"
                                    disabled={templateSaving}
                                    onClick={() => void saveCurrentWeekSlotTemplate(currentMonthlyPlan.id, currentMonthlyPlan.weekSlots)}
                                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                                >
                                    {templateSaving ? "保存中..." : "另存为模板"}
                                </button>
                            </div>

                            {state?.weekSlotTemplates && state.weekSlotTemplates.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {state.weekSlotTemplates.map((template) => (
                                        <button
                                            key={template.id}
                                            type="button"
                                            onClick={() => void applySavedTemplate(currentMonthlyPlan.id, template.name, template.weekSlots)}
                                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                        >
                                            应用模板：{template.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <label className="text-sm text-slate-700">
                                月度标题
                                <input
                                    defaultValue={currentMonthlyPlan.title}
                                    onBlur={(event) => {
                                        const value = event.target.value.trim();
                                        if (value && value !== currentMonthlyPlan.title) {
                                            void patchMonthlyPlan(currentMonthlyPlan.id, { title: value });
                                        }
                                    }}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                />
                            </label>

                            <label className="text-sm text-slate-700">
                                目标
                                <input
                                    defaultValue={currentMonthlyPlan.objective}
                                    onBlur={(event) => {
                                        const value = event.target.value.trim();
                                        if (value !== currentMonthlyPlan.objective) {
                                            void patchMonthlyPlan(currentMonthlyPlan.id, { objective: value });
                                        }
                                    }}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                />
                            </label>

                            <label className="text-sm text-slate-700">
                                状态
                                <select
                                    value={currentMonthlyPlan.status}
                                    onChange={(event) => {
                                        void patchMonthlyPlan(currentMonthlyPlan.id, { status: event.target.value });
                                    }}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                >
                                    <option value="draft">草稿</option>
                                    <option value="active">进行中</option>
                                    <option value="closed">已关闭</option>
                                </select>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                            {currentMonthlyPlan.weekSlots.map((slot, index) => (
                                <label key={`${currentMonthlyPlan.id}-slot-${index}-${slot}`} className="text-sm text-slate-700">
                                    <span className="flex items-center justify-between">
                                        <span>Week {index + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!slot) {
                                                    return;
                                                }

                                                const confirmed = window.confirm(`确认清空 Week ${index + 1} 吗？`);
                                                if (!confirmed) {
                                                    return;
                                                }

                                                const nextSlots = [...currentMonthlyPlan.weekSlots];
                                                nextSlots[index] = DEFAULT_WEEK_SLOT_TEXT[index] ?? "";
                                                void patchMonthlyPlan(currentMonthlyPlan.id, { weekSlots: nextSlots });
                                            }}
                                            className="rounded border border-rose-200 bg-white px-2 py-0.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                        >
                                            恢复默认
                                        </button>
                                    </span>
                                    <textarea
                                        defaultValue={slot}
                                        onBlur={(event) => {
                                            const nextSlots = [...currentMonthlyPlan.weekSlots];
                                            nextSlots[index] = event.target.value;
                                            void patchMonthlyPlan(currentMonthlyPlan.id, { weekSlots: nextSlots });
                                        }}
                                        className="mt-1 h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-500">尚未创建月度规划。</p>
                )}
                </div>
            )}

            {activeAdminModule === "planning" && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">周实施白板</h2>
                        <p className="mt-1 text-xs text-slate-500">实施人员可将本周任务导入检索框，并记录执行复盘。</p>
                    </div>
                    {!currentWeeklyReview && (
                        <button
                            type="button"
                            onClick={createWeeklyReviewEntry}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                            创建本周白板
                        </button>
                    )}
                </div>

                {currentWeeklyReview ? (
                    <div className="mt-4 space-y-4">
                        <label className="text-sm text-slate-700">
                            本周摘要
                            <input
                                defaultValue={currentWeeklyReview.summary}
                                onBlur={(event) => {
                                    const value = event.target.value.trim();
                                    if (value !== currentWeeklyReview.summary) {
                                        void patchWeeklyReview(currentWeeklyReview.id, { summary: value });
                                    }
                                }}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                            />
                        </label>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => void importWeeklyInbox(currentWeeklyReview.id)}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                                导入本周任务到检索框
                            </button>
                            <span className="text-xs text-slate-500">检索执行人：{state?.collaboration.paperRetriever ?? "-"}</span>
                        </div>

                        <label className="text-sm text-slate-700">
                            检索框（周实施导入）
                            <textarea
                                defaultValue={currentWeeklyReview.retrievalInbox}
                                onBlur={(event) => {
                                    const value = event.target.value;
                                    if (value !== currentWeeklyReview.retrievalInbox) {
                                        void patchWeeklyReview(currentWeeklyReview.id, { retrievalInbox: value });
                                    }
                                }}
                                className="mt-1 h-36 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                            />
                        </label>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <label className="text-sm text-slate-700">
                                本周亮点
                                <textarea
                                    defaultValue={currentWeeklyReview.wins}
                                    onBlur={(event) => {
                                        const value = event.target.value;
                                        if (value !== currentWeeklyReview.wins) {
                                            void patchWeeklyReview(currentWeeklyReview.id, { wins: value });
                                        }
                                    }}
                                    className="mt-1 h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                />
                            </label>

                            <label className="text-sm text-slate-700">
                                本周阻塞
                                <textarea
                                    defaultValue={currentWeeklyReview.blockers}
                                    onBlur={(event) => {
                                        const value = event.target.value;
                                        if (value !== currentWeeklyReview.blockers) {
                                            void patchWeeklyReview(currentWeeklyReview.id, { blockers: value });
                                        }
                                    }}
                                    className="mt-1 h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                />
                            </label>

                            <label className="text-sm text-slate-700">
                                下周行动
                                <textarea
                                    defaultValue={currentWeeklyReview.actionItems}
                                    onBlur={(event) => {
                                        const value = event.target.value;
                                        if (value !== currentWeeklyReview.actionItems) {
                                            void patchWeeklyReview(currentWeeklyReview.id, { actionItems: value });
                                        }
                                    }}
                                    className="mt-1 h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                />
                            </label>
                        </div>
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-500">尚未创建本周实施白板。</p>
                )}
                </div>
            )}

            {activeAdminModule === "settings" && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">论文检索与周目标设置</h2>
                <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-5">
                    <div>
                        <p className="text-sm text-slate-700">来源白名单</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(state?.searchSettings.sourceWhitelist.includes("crossref"))}
                                    onChange={(event) => {
                                        const current = state?.searchSettings.sourceWhitelist ?? ["crossref"];
                                        const next = event.target.checked
                                            ? Array.from(new Set([...current, "crossref"]))
                                            : current.filter((source) => source !== "crossref");
                                        void patchSettings({ sourceWhitelist: next });
                                    }}
                                    disabled={settingsSaving || !state}
                                />
                                Crossref
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(state?.searchSettings.sourceWhitelist.includes("openalex"))}
                                    onChange={(event) => {
                                        const current = state?.searchSettings.sourceWhitelist ?? ["crossref"];
                                        const next = event.target.checked
                                            ? Array.from(new Set([...current, "openalex"]))
                                            : current.filter((source) => source !== "openalex");
                                        void patchSettings({ sourceWhitelist: next });
                                    }}
                                    disabled={settingsSaving || !state}
                                />
                                OpenAlex
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(state?.searchSettings.sourceWhitelist.includes("pubmed"))}
                                    onChange={(event) => {
                                        const current = state?.searchSettings.sourceWhitelist ?? ["crossref"];
                                        const next = event.target.checked
                                            ? Array.from(new Set([...current, "pubmed"]))
                                            : current.filter((source) => source !== "pubmed");
                                        void patchSettings({ sourceWhitelist: next });
                                    }}
                                    disabled={settingsSaving || !state}
                                />
                                PubMed
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(state?.searchSettings.sourceWhitelist.includes("webofscience"))}
                                    onChange={(event) => {
                                        const current = state?.searchSettings.sourceWhitelist ?? ["crossref"];
                                        const next = event.target.checked
                                            ? Array.from(new Set([...current, "webofscience"]))
                                            : current.filter((source) => source !== "webofscience");
                                        void patchSettings({ sourceWhitelist: next });
                                    }}
                                    disabled={settingsSaving || !state}
                                />
                                Web of Science
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(state?.searchSettings.sourceWhitelist.includes("wanfang"))}
                                    onChange={(event) => {
                                        const current = state?.searchSettings.sourceWhitelist ?? ["crossref"];
                                        const next = event.target.checked
                                            ? Array.from(new Set([...current, "wanfang"]))
                                            : current.filter((source) => source !== "wanfang");
                                        void patchSettings({ sourceWhitelist: next });
                                    }}
                                    disabled={settingsSaving || !state}
                                />
                                万方
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(state?.searchSettings.sourceWhitelist.includes("cnki"))}
                                    onChange={(event) => {
                                        const current = state?.searchSettings.sourceWhitelist ?? ["crossref"];
                                        const next = event.target.checked
                                            ? Array.from(new Set([...current, "cnki"]))
                                            : current.filter((source) => source !== "cnki");
                                        void patchSettings({ sourceWhitelist: next });
                                    }}
                                    disabled={settingsSaving || !state}
                                />
                                知网
                            </label>
                        </div>
                    </div>

                    <label className="text-sm text-slate-700">
                        每周任务目标
                        <input
                            type="number"
                            min={WEEKLY_TASK_TARGET_MIN}
                            max={WEEKLY_TASK_TARGET_MAX}
                            step={WEEKLY_TASK_TARGET_STEP}
                            value={state?.searchSettings.weeklyTaskTarget ?? WEEKLY_ARTICLE_TARGET}
                            onChange={(event) => {
                                const nextTarget = Number(event.target.value);
                                if (Number.isFinite(nextTarget)) {
                                    void patchSettings({ weeklyTaskTarget: nextTarget });
                                }
                            }}
                            disabled={settingsSaving || !state}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">按 5 的倍数设置（如 5、10、15）。</p>
                    </label>

                    <label className="text-sm text-slate-700">
                        起始年份
                        <input
                            type="number"
                            min={1980}
                            max={new Date().getFullYear()}
                            value={state?.searchSettings.sinceYear ?? new Date().getFullYear() - 5}
                            onChange={(event) => {
                                const nextYear = Number(event.target.value);
                                if (Number.isFinite(nextYear)) {
                                    void patchSettings({ sinceYear: nextYear });
                                }
                            }}
                            disabled={settingsSaving || !state}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                        />
                    </label>

                    <label className="text-sm text-slate-700">
                        每来源返回数量
                        <input
                            type="number"
                            min={3}
                            max={20}
                            value={state?.searchSettings.maxResultsPerSource ?? 8}
                            onChange={(event) => {
                                const nextSize = Number(event.target.value);
                                if (Number.isFinite(nextSize)) {
                                    void patchSettings({ maxResultsPerSource: nextSize });
                                }
                            }}
                            disabled={settingsSaving || !state}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                        />
                    </label>

                    <label className="text-sm text-slate-700">
                        最低相关性阈值
                        <input
                            type="range"
                            min={1}
                            max={8}
                            step={1}
                            value={state?.searchSettings.minRelevanceScore ?? 2}
                            onChange={(event) => {
                                const nextScore = Number(event.target.value);
                                if (Number.isFinite(nextScore)) {
                                    void patchSettings({ minRelevanceScore: nextScore });
                                }
                            }}
                            disabled={settingsSaving || !state}
                            className="mt-3 w-full"
                        />
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                            <span>宽松</span>
                            <span className="font-semibold text-slate-700">当前：{state?.searchSettings.minRelevanceScore ?? 2}</span>
                            <span>严格</span>
                        </div>
                    </label>
                </div>

                </div>
            )}

            {activeAdminModule === "library" && (
                <div className="mb-6 space-y-6">
                <p className="text-xs text-slate-500">论文库：从外部论文库（如 PubMed）检索或通过 URL/DOI/全文导入入库，在库内浏览筛选后确认采纳进入执行模块。仅已下载全文的论文可入选当期。</p>

                {/* 一、外部检索入库：每批 20 篇，可筛选后再追加 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h2 className="text-sm font-semibold text-slate-900">一、外部检索入库</h2>
                    <p className="mt-1 text-xs text-slate-500">从 PubMed、Crossref 等外部论文库按自定义关键字检索，每批 20 篇列队；可先筛选删除不需要的条目，再「继续检索追加」下一批 20 篇。按 DOI/URL/标题自动去重。</p>
                    <p className="mt-0.5 text-xs text-slate-600">当前检索来源：{(state?.searchSettings.sourceWhitelist ?? ["crossref", "pubmed"]).join("、")}（在「设置」中可勾选/取消来源）</p>
                    <p className="mt-0.5 text-xs text-slate-500">入库前请选择大类（6 类）并填写关键字（可选），便于入库后留用。</p>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                        <label className="text-sm text-slate-700">
                            自定义关键字
                            <input
                                type="text"
                                value={libraryThemeSeed}
                                onChange={(event) => setLibraryThemeSeed(event.target.value)}
                                placeholder="如：睡眠 昼夜节律"
                                className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                            />
                        </label>
                        <label className="text-sm text-slate-700">
                            大类（入库分类）
                            <select
                                value={libraryCategory}
                                onChange={(event) => setLibraryCategory(event.target.value as LibrarySearchCategory)}
                                className="mt-1 w-44 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                            >
                                {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                                <option value="other">其他（不限范围）</option>
                            </select>
                        </label>
                        <label className="text-sm text-slate-700">
                            关键字（可选，逗号/空格分隔）
                            <input
                                type="text"
                                value={librarySearchCustomKeywordText}
                                onChange={(event) => setLibrarySearchCustomKeywordText(event.target.value)}
                                placeholder="例如：睡眠、昼夜节律"
                                className="mt-1 w-56 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => void savePapersToLibrary("reset")}
                            disabled={librarySaving || libraryBatchExporting}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                        >
                            {librarySaving ? "入库中..." : "检索并入库（每批 20 篇）"}
                        </button>
                        <button
                            type="button"
                            onClick={() => void savePapersToLibrary("append")}
                            disabled={librarySaving || libraryBatchExporting}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                            {librarySaving ? "追加中..." : `继续检索追加（第 ${librarySearchPage + 1} 批，每批 20 篇）`}
                        </button>
                    </div>
                    {libraryLastSearchStats && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">本轮页码：{libraryLastSearchStats.page}</span>
                            <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">命中：{libraryLastSearchStats.matched}</span>
                            <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">新增：{libraryLastSearchStats.added}</span>
                            <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">复用：{libraryLastSearchStats.reused}</span>
                            <span className="rounded bg-rose-100 px-2 py-1 text-rose-700">删除：{libraryLastSearchStats.deleted}</span>
                        </div>
                    )}
                </div>

                {/* 二、导入入库：URL/DOI/全文直链或批量网址 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h2 className="text-sm font-semibold text-slate-900">二、导入入库</h2>
                    <p className="mt-1 text-xs text-slate-500">已下载的全文或通过 URL/DOI 自动拉取元数据；提供 PDF 直链时可直接全文落库。支持批量网址导入（每行一个）。入库大类与关键字使用上方「一、外部检索入库」中的设置。</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        <input
                            type="text"
                            value={libraryImportTitle}
                            onChange={(event) => setLibraryImportTitle(event.target.value)}
                            placeholder="论文标题（可选，推荐）"
                            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                        />
                        <input
                            type="text"
                            value={libraryImportDoi}
                            onChange={(event) => setLibraryImportDoi(event.target.value)}
                            placeholder="DOI（可选）"
                            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                        />
                        <input
                            type="text"
                            value={libraryImportSourceUrl}
                            onChange={(event) => setLibraryImportSourceUrl(event.target.value)}
                            placeholder="来源网址（可选）"
                            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                        />
                        <input
                            type="text"
                            value={libraryImportPdfUrl}
                            onChange={(event) => setLibraryImportPdfUrl(event.target.value)}
                            placeholder="PDF 直链（可选，优先全文落库）"
                            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void importPaperToLibraryFromExternal()}
                            disabled={libraryImporting || libraryBulkImporting || librarySaving || libraryBatchExporting}
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                            {libraryImporting ? "导入中..." : "导入到论文库"}
                        </button>
                        <span className="text-xs text-slate-500">仅标题也可反查；有 PDF 直链时直接落库原文。</span>
                    </div>
                    <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-700">批量网址导入</p>
                        <textarea
                            aria-label="批量网址导入"
                            value={libraryBulkImportUrls}
                            onChange={(event) => setLibraryBulkImportUrls(event.target.value)}
                            placeholder={"每行一个论文来源网址，例如：\nhttps://doi.org/10.xxxx/xxxx\nhttps://pubmed.ncbi.nlm.nih.gov/xxxxxx/"}
                            className="mt-2 h-24 w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                            disabled={libraryBulkImporting}
                        />
                        <div className="mt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void importPapersToLibraryByUrlsBatch()}
                                disabled={libraryBulkImporting || libraryImporting || librarySaving || libraryBatchExporting}
                                className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                            >
                                {libraryBulkImporting ? "批量导入中..." : "批量网址导入"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 三、浏览入库论文：每页 20 篇，筛选后确认采纳 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h2 className="text-sm font-semibold text-slate-900">三、浏览入库论文</h2>
                    <p className="mt-1 text-xs text-slate-500">在已入库论文中按分类、关键字或自定义关键字查找；每页 20 篇。确认采纳后进入执行模块当期。可先「下载摘要」再「下载全文」；仅已下载全文的论文可「确认入选当期」。</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                            type="checkbox"
                            checked={libraryPrimaryMode === "summary"}
                            onChange={(event) => setLibraryPrimaryMode(event.target.checked ? "summary" : "original")}
                            disabled={libraryBatchExporting}
                        />
                        主下载按钮：摘要（含中文）
                    </label>

                    <label className="inline-flex items-center gap-2 text-slate-700">
                        批量导出前
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={libraryBatchTopN}
                            onChange={(event) => setLibraryBatchTopN(Number(event.target.value || 1))}
                            disabled={libraryBatchExporting}
                            className="w-16 rounded border border-slate-300 px-2 py-1 text-slate-900 outline-none focus:border-blue-500"
                        />
                        篇摘要
                    </label>

                    <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                            type="checkbox"
                            checked={libraryBatchOnlyUnexported}
                            onChange={(event) => setLibraryBatchOnlyUnexported(event.target.checked)}
                            disabled={libraryBatchExporting}
                        />
                        只导出未导出过摘要
                    </label>

                    <button
                        type="button"
                        onClick={() => void exportTopNSummaries()}
                        disabled={libraryBatchExporting || !state?.paperLibrary || state.paperLibrary.length === 0}
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        {libraryBatchExporting ? "批量导出中..." : "批量导出"}
                    </button>

                    <button
                        type="button"
                        onClick={() => toggleSelectCurrentList(true)}
                        disabled={libraryBatchExporting || pagedLibraryItems.length === 0}
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        全选当前页
                    </button>

                    <button
                        type="button"
                        onClick={() => toggleSelectCurrentList(false)}
                        disabled={libraryBatchExporting || pagedLibraryItems.length === 0}
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        取消当前页全选
                    </button>

                    <button
                        type="button"
                        onClick={() => void exportSelectedSummaries()}
                        disabled={libraryBatchExporting || !Object.values(librarySelectedIds).some(Boolean)}
                        className="rounded border border-blue-300 bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                    >
                        导出选中摘要
                    </button>

                    <button
                        type="button"
                        onClick={() => void removeSelectedLibraryItems()}
                        disabled={libraryBatchExporting || !Object.values(librarySelectedIds).some(Boolean)}
                        className="rounded border border-rose-300 bg-rose-50 px-2 py-1 font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                        删除选中论文
                    </button>

                    <span className="text-slate-600">已选 {selectedLibraryCount} 篇</span>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-800">浏览入库论文</h3>
                <p className="mt-1 text-xs text-slate-600">
                    在已入库论文中按分类、关键字或自定义关键字查找；确认采纳后进入执行模块当期。
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600">使用状态筛选：</span>
                    <button
                        type="button"
                        onClick={() => setLibraryAdoptionFilter("all")}
                        className={`rounded px-2 py-1 font-semibold ${libraryAdoptionFilter === "all" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                        全部
                    </button>
                    <button
                        type="button"
                        onClick={() => setLibraryAdoptionFilter("used")}
                        className={`rounded px-2 py-1 font-semibold ${libraryAdoptionFilter === "used" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                        已采纳使用
                    </button>
                    <button
                        type="button"
                        onClick={() => setLibraryAdoptionFilter("future")}
                        className={`rounded px-2 py-1 font-semibold ${libraryAdoptionFilter === "future" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                        留待后续使用
                    </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600">复核周期：</span>
                    <select
                        aria-label="论文库复核周期筛选"
                        value={libraryReviewCycleFilter}
                        onChange={(event) => setLibraryReviewCycleFilter(event.target.value as LibraryReviewCycleFilter)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none focus:border-blue-500"
                    >
                        <option value="all">全部周期</option>
                        <option value="this_week">本周</option>
                        <option value="this_month">本月</option>
                        <option value="last_7_days">近 7 天</option>
                        <option value="last_30_days">近 30 天</option>
                    </select>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600">自定义检索：</span>
                    <input
                        type="text"
                        value={libraryCustomQuery}
                        onChange={(event) => setLibraryCustomQuery(event.target.value)}
                        placeholder="输入关键字，支持标题/摘要/关键词"
                        className="w-72 rounded border border-slate-300 px-2 py-1 text-slate-700 outline-none focus:border-blue-500"
                    />
                    <button
                        type="button"
                        onClick={() => setLibraryCustomQuery("")}
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                        清空检索
                    </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600">入库分类筛选：</span>
                    <select
                        aria-label="论文库入库分类筛选"
                        value={libraryStorageFilter}
                        onChange={(event) => setLibraryStorageFilter(event.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none focus:border-blue-500"
                    >
                        <option value="all">全部分类</option>
                        <option value="uncategorized">未分类</option>
                        {allLibraryStorageCategories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600">关键字筛选：</span>
                    <select
                        aria-label="论文库关键字筛选"
                        value={libraryKeywordFilter}
                        onChange={(event) => setLibraryKeywordFilter(event.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none focus:border-blue-500"
                    >
                        <option value="all">全部关键字</option>
                        {allLibraryKeywordOptions.map((kw) => (
                            <option key={kw} value={kw}>{kw}</option>
                        ))}
                    </select>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600">浏览分页：</span>
                    <select
                        aria-label="论文库每页数量"
                        value={String(libraryListPageSize)}
                        onChange={(event) => setLibraryListPageSize(Number(event.target.value))}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none focus:border-blue-500"
                    >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                        <option value="50">50</option>
                    </select>
                    <span className="text-slate-600">每页，共 {visibleLibraryItems.length} 篇</span>
                    <button
                        type="button"
                        onClick={() => setLibraryListPage((prev) => Math.max(1, prev - 1))}
                        disabled={libraryListPage <= 1}
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        上一页
                    </button>
                    <span className="text-slate-600">第 {libraryListPage} / {libraryTotalPages} 页</span>
                    <button
                        type="button"
                        onClick={() => setLibraryListPage((prev) => Math.min(libraryTotalPages, prev + 1))}
                        disabled={libraryListPage >= libraryTotalPages}
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        下一页
                    </button>
                </div>

                {visibleLibraryItems.length > 0 ? (
                    <div className="mt-4 space-y-2">
                        {pagedLibraryItems.map((item) => (
                            (() => {
                                const isCompleted = completedAdoptedPaperIds.has(item.id);
                                const isFutureUse = !isCompleted;
                                return (
                            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                {isCompleted && (
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            disabled
                                            className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
                                        >
                                            已采纳使用（已进入草稿/发布流程，永久存库）
                                        </button>
                                        {(item.adoptedAt ?? item.adoptedWeekKey ?? item.adoptedMonthKey) && (
                                            <span className="text-xs text-slate-500" title="运营复盘用">
                                                采纳：{item.adoptedAt ? new Date(item.adoptedAt).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" }) : ""}
                                                {item.adoptedWeekKey ? ` · ${item.adoptedWeekKey}` : ""}
                                                {item.adoptedMonthKey ? ` · ${item.adoptedMonthKey}` : ""}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {isFutureUse && (
                                    <div className="mb-2">
                                        <button
                                            type="button"
                                            disabled
                                            className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700"
                                        >
                                            留待后续使用
                                        </button>
                                    </div>
                                )}
                                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(librarySelectedIds[item.id])}
                                        onChange={(event) => {
                                            const checked = event.target.checked;
                                            setLibrarySelectedIds((prev) => {
                                                const next = { ...prev };
                                                if (checked) {
                                                    next[item.id] = true;
                                                } else {
                                                    delete next[item.id];
                                                }
                                                return next;
                                            });
                                        }}
                                        disabled={libraryBatchExporting}
                                    />
                                    选中用于批量导出
                                </label>
                                <p className="font-medium text-slate-900">{item.titleZh ?? item.title}</p>
                                {item.titleZh && item.titleZh !== item.title && (
                                    <p className="mt-1 text-xs text-slate-500">EN: {item.title}</p>
                                )}
                                <p className="mt-1 text-xs text-slate-600">
                                    {item.searchScope === "other" ? "其他（关键词优先）" : CATEGORY_LABEL[item.category]} · {item.source} · {item.year}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                    摘要速览：{(item.abstractZh ?? item.abstractEn ?? item.abstract ?? "暂无摘要").slice(0, 160)}
                                    {(item.abstractZh ?? item.abstractEn ?? item.abstract ?? "").length > 160 ? "..." : ""}
                                </p>
                                <div className="mt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLibraryDetailOpenById((prev) => ({
                                                ...prev,
                                                [item.id]: !prev[item.id]
                                            }));
                                        }}
                                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                        {libraryDetailOpenById[item.id] ? "收起详情" : "展开详情"}
                                    </button>
                                </div>
                                {libraryDetailOpenById[item.id] && (
                                    <>
                                        <p className="mt-1 text-xs text-slate-600">
                                            GB/T 7714-2015：{item.gbtCitation ?? "未生成"}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            英文摘要：{(item.abstractEn ?? item.abstract ?? "暂无").slice(0, 180)}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            中文摘要：{(item.abstractZh ?? "暂无").slice(0, 180)}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            自定义分类：{(item.customCategories ?? []).length > 0 ? (item.customCategories ?? []).join("、") : "暂无"}
                                        </p>
                                    </>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-slate-500">入库分类：</span>
                                    <select
                                        aria-label="论文入库分类"
                                        value={item.storageCategory ?? ""}
                                        className="w-44 rounded border border-slate-300 px-2 py-1 text-slate-700 outline-none focus:border-blue-500"
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setState((prev) => {
                                                if (!prev) {
                                                    return prev;
                                                }
                                                return {
                                                    ...prev,
                                                    paperLibrary: prev.paperLibrary.map((paper) => (
                                                        paper.id === item.id
                                                            ? { ...paper, storageCategory: value || undefined }
                                                            : paper
                                                    ))
                                                };
                                            });
                                            void patchLibraryMeta(item.id, { storageCategory: value });
                                        }}
                                    >
                                        <option value="">未分类</option>
                                        {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                                            <option key={`storage-${key}`} value={label}>{label}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isCompleted) {
                                                return;
                                            }
                                            void patchLibraryMeta(item.id, { adopted: !Boolean(item.adopted) });
                                        }}
                                        disabled={isCompleted}
                                        className={`rounded px-2 py-1 font-semibold ${isCompleted
                                            ? "bg-slate-200 text-slate-500"
                                            : item.adopted
                                                ? "bg-blue-100 text-blue-700"
                                                : "border border-blue-300 bg-white text-blue-700 hover:bg-blue-50"}`}
                                    >
                                        {isCompleted ? "已采纳使用（入选执行）" : (item.adopted ? "留用（仅存库）" : "设为本期优先（当期采纳）")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void removeLibraryItem(item.id)}
                                        disabled={isCompleted}
                                        title={isCompleted ? "已采纳归档论文需永久保存，不可删除" : undefined}
                                        className={`rounded px-2 py-1 font-semibold ${isCompleted
                                            ? "bg-slate-200 text-slate-500"
                                            : "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50"}`}
                                    >
                                        删除
                                    </button>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-slate-500">关键词：</span>
                                    {(item.keywords ?? []).length > 0 ? (
                                        (item.keywords ?? []).map((keyword) => (
                                            <button
                                                key={`${item.id}-keyword-${keyword}`}
                                                type="button"
                                                onClick={() => void removeLibraryKeyword(item.id, item.keywords ?? [], keyword)}
                                                className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-slate-700 hover:bg-slate-100"
                                                title="点击移除该关键词"
                                            >
                                                {keyword} ×
                                            </button>
                                        ))
                                    ) : (
                                        <span className="text-slate-400">暂无</span>
                                    )}
                                    <input
                                        type="text"
                                        value={libraryKeywordDraftById[item.id] ?? ""}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setLibraryKeywordDraftById((prev) => ({
                                                ...prev,
                                                [item.id]: value
                                            }));
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                void addLibraryKeyword(item.id, item.keywords ?? []);
                                            }
                                        }}
                                        list="library-keyword-options"
                                        placeholder="新增关键词，如：衰老"
                                        className="w-44 rounded border border-slate-300 px-2 py-1 text-slate-700 outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void addLibraryKeyword(item.id, item.keywords ?? [])}
                                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                        添加关键词
                                    </button>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                                    <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">查看来源</a>
                                    <span className={`rounded px-2 py-1 ${String(item.abstractZh ?? item.abstractEn ?? item.abstract ?? "").trim() ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {String(item.abstractZh ?? item.abstractEn ?? item.abstract ?? "").trim() ? "摘要可用" : "摘要缺失"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => void downloadLibraryPaper(item.id, "summary")}
                                        disabled={libraryBatchExporting || libraryDownloadingId === `${item.id}:summary`}
                                        className="rounded bg-slate-900 px-2 py-1 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                                    >
                                        {libraryDownloadingId === `${item.id}:summary`
                                            ? "下载中..."
                                            : "下载摘要（用于筛查）"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void downloadLibraryPaper(item.id, "original")}
                                        disabled={libraryBatchExporting || libraryDownloadingId === `${item.id}:original`}
                                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                                    >
                                        {libraryDownloadingId === `${item.id}:original`
                                            ? "下载中..."
                                            : (String(item.abstractZh ?? item.abstractEn ?? item.abstract ?? "").trim() ? "下载全文（入库存放）" : "无摘要也可尝试下载全文（入库存放）")}
                                    </button>
                                    {item.originalFilePath && !isCompleted && (
                                        <button
                                            type="button"
                                            onClick={() => void adoptLibraryItemToCurrentPeriod(item.id)}
                                            disabled={libraryBatchExporting || libraryAdoptingId === item.id}
                                            className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                        >
                                            {libraryAdoptingId === item.id ? "入选中…" : "确认入选当期"}
                                        </button>
                                    )}
                                    {item.originalFilePath && (
                                        <button
                                            type="button"
                                            onClick={() => (libraryCoreSummaryOpenId === item.id ? setLibraryCoreSummaryOpenId(null) : void generateLibraryItemCoreSummary(item.id))}
                                            disabled={libraryCoreSummaryLoadingId === item.id}
                                            className="rounded border border-violet-300 bg-violet-50 px-2 py-1 font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
                                        >
                                            {libraryCoreSummaryLoadingId === item.id ? "预检生成中…" : (libraryCoreSummaryOpenId === item.id ? "收起预检" : "预检")}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => void openLibrarySummaryPreview(item.id)}
                                        disabled={libraryBatchExporting || libraryPreviewLoadingId === item.id}
                                        className="rounded border border-blue-300 bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                    >
                                        {libraryPreviewLoadingId === item.id
                                            ? "读取中..."
                                            : (libraryPreviewOpenId === item.id ? "收起摘要" : "本页查看摘要")}
                                    </button>
                                    {(item.summaryFilePath || item.localFilePath) && (
                                        <span className="text-emerald-700">摘要：{item.summaryFilePath ?? item.localFilePath}</span>
                                    )}
                                    {item.originalFilePath && <span className="text-emerald-700">原文：{item.originalFilePath}</span>}
                                </div>
                                {libraryCoreSummaryOpenId === item.id && libraryCoreSummaryContentById[item.id] && (
                                    <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
                                        <p className="text-xs font-semibold text-slate-900">核心内容摘要（预检）</p>
                                        <div className="mt-2 max-h-80 overflow-auto rounded border border-slate-200 bg-white p-3 text-xs text-slate-700 whitespace-pre-wrap">
                                            {libraryCoreSummaryContentById[item.id]}
                                        </div>
                                    </div>
                                )}
                                {libraryPreviewOpenId === item.id && libraryPreviewTextById[item.id] && (
                                    <div
                                        ref={(element) => {
                                            libraryPreviewRefs.current[item.id] = element;
                                        }}
                                        className="mt-3 rounded-lg border border-slate-200 bg-white p-3"
                                    >
                                        <p className="text-xs text-slate-500">
                                            摘要预览：{libraryPreviewFilePathById[item.id] ?? item.summaryFilePath ?? item.localFilePath ?? "-"}
                                        </p>
                                        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-6 text-slate-700">{libraryPreviewTextById[item.id]}</pre>
                                    </div>
                                )}
                            </div>
                                );
                            })()
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-500">当前筛选条件下暂无论文。</p>
                )}
                </div>
                </div>
            )}

            {activeAdminModule === "execution" && (
                <>
                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm text-slate-700">
                            当期入选的论文直接在下方案务卡片中显示。本期不足时，可
                            <button
                                type="button"
                                onClick={() => setActiveAdminModule("library")}
                                className="mx-1 font-semibold text-blue-600 underline hover:text-blue-700"
                            >
                                前往论文库检索
                            </button>
                            入库后再回到本模块选取。
                        </p>
                    </div>
                    <div className="mb-6 flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveExecutionStatus("all")}
                            className={`rounded-full px-4 py-2 text-sm font-medium ${activeExecutionStatus === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
                        >
                            全状态
                        </button>
                        <button
                            onClick={() => setActiveExecutionStatus("in_progress")}
                            className={`rounded-full px-4 py-2 text-sm font-medium ${activeExecutionStatus === "in_progress" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
                        >
                            执行中
                        </button>
                        <button
                            onClick={() => setActiveExecutionStatus("published")}
                            className={`rounded-full px-4 py-2 text-sm font-medium ${activeExecutionStatus === "published" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
                        >
                            已发布
                        </button>
                        <button
                            onClick={() => setActiveExecutionStatus("rejected")}
                            className={`rounded-full px-4 py-2 text-sm font-medium ${activeExecutionStatus === "rejected" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
                        >
                            已驳回
                        </button>
                        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={executionOnlyPriority}
                                onChange={(event) => setExecutionOnlyPriority(event.target.checked)}
                            />
                            仅看本期优先
                        </label>
                    </div>

                    <div className="mb-6 flex flex-wrap gap-2">
                <button
                    onClick={() => setActiveCategory("all")}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${activeCategory === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
                >
                    全部
                </button>
                {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setActiveCategory(key as FiveDCategory)}
                        className={`rounded-full px-4 py-2 text-sm font-medium ${activeCategory === key ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
                    >
                        {label}
                    </button>
                ))}
                    </div>

                    <div className="space-y-6">
                {visibleTasks.map((task) => {
                    const selectedPaper = task.paperCandidates.find((paper) => paper.id === task.selectedPaperId);
                    const libItemForSelected = selectedPaper ? state?.paperLibrary?.find((p) => p.id === selectedPaper.id) : undefined;
                    const selectedPaperNoFullText = !!selectedPaper && !!libItemForSelected && !libItemForSelected.originalFilePath;
                    const disabled = loadingTaskId === task.id;
                    const exportedFilename = exportedTaskFiles[task.id];
                    const recentOperationLogs = [...(task.operationLogs ?? [])].slice(-5).reverse();

                    return (
                        <section key={task.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm text-slate-500">{CATEGORY_LABEL[task.category]} · 第 {task.sequence} 篇</p>
                                    <h2 className="text-lg font-semibold text-slate-900">{task.theme}</h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        规划管理员：{state?.collaboration.planningReviewer ?? "-"} ·
                                        论文检索：{state?.collaboration.paperRetriever ?? "-"} ·
                                        草稿审议与发布：{state?.collaboration.draftReviewer ?? "-"}
                                    </p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[task.status]}`}>
                                    {STATUS_LABEL[task.status]}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <label className="text-sm text-slate-700">
                                    主题（可编辑）
                                    <input
                                        defaultValue={task.theme}
                                        onBlur={(event) => {
                                            const value = event.target.value.trim();
                                            if (value && value !== task.theme) {
                                                void patchTask(task.id, { theme: value });
                                            }
                                        }}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                    />
                                </label>
                                <label className="text-sm text-slate-700">
                                    规划说明
                                    <input
                                        defaultValue={task.topicNote}
                                        onBlur={(event) => {
                                            const value = event.target.value.trim();
                                            if (value !== task.topicNote) {
                                                void patchTask(task.id, { topicNote: value });
                                            }
                                        }}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                    />
                                </label>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    disabled={disabled}
                                    onClick={() => void callTaskAction(task.id, "papers")}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                                >
                                    1) 从论文库选取
                                </button>
                                <button
                                    disabled={disabled || !task.selectedPaperId || selectedPaperNoFullText || loadingCoreSummaryTaskId === task.id}
                                    onClick={() => void callGenerateCoreSummary(task.id)}
                                    title={selectedPaperNoFullText ? "请先下载全文后再生成" : undefined}
                                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                                >
                                    {loadingCoreSummaryTaskId === task.id ? "生成中…" : "核心内容"}
                                </button>
                                <button
                                    disabled={disabled || !task.selectedPaperId || selectedPaperNoFullText}
                                    onClick={() => void callTaskAction(task.id, "generate")}
                                    title={selectedPaperNoFullText ? "请先下载全文后再生成草稿" : undefined}
                                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                                >
                                    2) 生成草稿
                                </button>
                                <button
                                    disabled={disabled || !task.draftContent}
                                    onClick={() => void patchTask(task.id, { status: "approved" })}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                >
                                    3) 审核通过
                                </button>
                                <button
                                    disabled={disabled || !task.draftContent}
                                    onClick={() => void patchTask(task.id, { status: "rejected" })}
                                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                                >
                                    驳回
                                </button>
                                <button
                                    disabled={disabled || task.status !== "approved"}
                                    onClick={() => void callTaskAction(task.id, "publish")}
                                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                                >
                                    4) 发布到文章库
                                </button>
                                <button
                                    disabled={disabled || (task.status !== "approved" && task.status !== "published")}
                                    onClick={() => void callTaskAction(task.id, "export")}
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    导出草稿（不发布）
                                </button>
                            </div>
                            {selectedPaper && (
                                <p className="mt-2 text-xs text-slate-500">
                                    建议先点击「核心内容」核对论文关键信息与证据等级，再点击「2) 生成草稿」。
                                </p>
                            )}

                            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div className="text-sm text-slate-700">
                                    <p className="font-medium text-slate-800">执行论文（仅显示当前）</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        排列的论文标题（本期执行）；当前候选池（论文库）{task.paperCandidates.length} 篇。
                                    </p>
                                    <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 font-medium">
                                        {selectedPaper ? (selectedPaper.titleZh ?? selectedPaper.title) : "尚未选择论文，请先点击「1) 从论文库选取」"}
                                    </p>
                                    {selectedPaper && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            原文标题：{selectedPaper.title}
                                        </p>
                                    )}
                                    {selectedPaper && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            {state?.paperLibrary?.some((p) => p.id === selectedPaper.id) ? (
                                                <button
                                                    type="button"
                                                    disabled={disabled || libraryBatchExporting || Boolean(libraryDownloadingId)}
                                                    onClick={() => void downloadLibraryPaper(selectedPaper.id, "summary")}
                                                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                                                >
                                                    {libraryDownloadingId === `${selectedPaper.id}:summary` ? "下载中…" : "下载选中论文摘要"}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-amber-700">
                                                    当前选中论文来自检索未入库，仅论文库中的论文可下载摘要；请先在
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveAdminModule("library")}
                                                        className="mx-0.5 font-semibold text-amber-800 underline hover:text-amber-900"
                                                    >
                                                        论文库
                                                    </button>
                                                    模块预检索入库后再下载。
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="mt-3">
                                        <label className="text-xs text-slate-500">草稿生成模板</label>
                                        <select
                                            value={draftPromptTemplateByTaskId[task.id] ?? task.draftPromptTemplate ?? "layered_progressive"}
                                            onChange={(event) => {
                                                const next = event.target.value as DraftPromptTemplate;
                                                if (!DRAFT_PROMPT_TEMPLATES.includes(next)) {
                                                    return;
                                                }
                                                setDraftPromptTemplateByTaskId((prev) => ({
                                                    ...prev,
                                                    [task.id]: next
                                                }));
                                            }}
                                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                                        >
                                            {DRAFT_PROMPT_TEMPLATES.map((template) => (
                                                <option key={`draft-template-${task.id}-${template}`} value={template}>
                                                    {DRAFT_TEMPLATE_LABEL[template]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mt-3">
                                        <label className="text-xs text-slate-500">研究类型模板</label>
                                        <select
                                            value={draftStudyTemplateByTaskId[task.id] ?? task.draftStudyTemplate ?? "auto"}
                                            onChange={(event) => {
                                                const next = event.target.value as DraftStudyTemplate;
                                                if (!DRAFT_STUDY_TEMPLATES.includes(next)) {
                                                    return;
                                                }
                                                setDraftStudyTemplateByTaskId((prev) => ({
                                                    ...prev,
                                                    [task.id]: next
                                                }));
                                            }}
                                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                                        >
                                            {DRAFT_STUDY_TEMPLATES.map((template) => (
                                                <option key={`draft-study-template-${task.id}-${template}`} value={template}>
                                                    {DRAFT_STUDY_TEMPLATE_LABEL[template]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <label className="text-sm text-slate-700">
                                    审核备注
                                    <input
                                        defaultValue={task.reviewComment ?? ""}
                                        onBlur={(event) => {
                                            void patchTask(task.id, { reviewComment: event.target.value.trim() });
                                        }}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                    />
                                </label>
                            </div>

                            {recentOperationLogs.length > 0 && (
                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                    <p className="font-semibold text-slate-900">操作日志（最近 5 条）</p>
                                    <ul className="mt-2 space-y-1 text-slate-600">
                                        {recentOperationLogs.map((log, index) => (
                                            <li key={`${task.id}-oplog-${index}`}>
                                                {new Date(log.createdAt).toLocaleString("zh-CN", { hour12: false })} · {log.actor} · {log.detail}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {task.coreSummary && (
                                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
                                    <p className="text-sm font-semibold text-slate-900">核心内容摘要</p>
                                    <p className="mt-1 text-xs text-slate-500">为生成草稿提供的内容预检：按研究类型模板生成的结构化摘要，用于核对关键信息与证据等级后再生成草稿。</p>
                                    <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 whitespace-pre-wrap">
                                        {task.coreSummary}
                                    </div>
                                </div>
                            )}

                            {task.draftContent && (
                                <div className="mt-4 space-y-3">
                                    <p className="text-sm font-semibold text-slate-900">修改草稿（审议修订后再审核通过/驳回）</p>
                                    <label className="block text-xs text-slate-600">
                                        草稿标题
                                        <input
                                            value={draftEditsByTaskId[task.id]?.draftTitle ?? task.draftTitle ?? ""}
                                            onChange={(e) => setDraftEditsByTaskId((prev) => ({
                                                ...prev,
                                                [task.id]: {
                                                    draftTitle: e.target.value,
                                                    draftSummary: prev[task.id]?.draftSummary ?? task.draftSummary ?? "",
                                                    draftContent: prev[task.id]?.draftContent ?? task.draftContent ?? ""
                                                }
                                            }))}
                                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                                        />
                                    </label>
                                    <label className="block text-xs text-slate-600">
                                        草稿摘要
                                        <input
                                            value={draftEditsByTaskId[task.id]?.draftSummary ?? task.draftSummary ?? ""}
                                            onChange={(e) => setDraftEditsByTaskId((prev) => ({
                                                ...prev,
                                                [task.id]: {
                                                    draftTitle: prev[task.id]?.draftTitle ?? task.draftTitle ?? "",
                                                    draftSummary: e.target.value,
                                                    draftContent: prev[task.id]?.draftContent ?? task.draftContent ?? ""
                                                }
                                            }))}
                                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                                        />
                                    </label>
                                    <label className="block text-xs text-slate-600">
                                        草稿正文（MDX）
                                        <textarea
                                            aria-label="草稿正文"
                                            value={draftEditsByTaskId[task.id]?.draftContent ?? task.draftContent ?? ""}
                                            onChange={(e) => setDraftEditsByTaskId((prev) => ({
                                                ...prev,
                                                [task.id]: {
                                                    draftTitle: prev[task.id]?.draftTitle ?? task.draftTitle ?? "",
                                                    draftSummary: prev[task.id]?.draftSummary ?? task.draftSummary ?? "",
                                                    draftContent: e.target.value
                                                }
                                            }))}
                                            className="mt-1 h-56 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-700 outline-none focus:border-blue-500"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        disabled={disabled || draftSavingTaskId === task.id}
                                        onClick={async () => {
                                            setDraftSavingTaskId(task.id);
                                            setError("");
                                            const title = draftEditsByTaskId[task.id]?.draftTitle ?? task.draftTitle ?? "";
                                            const summary = draftEditsByTaskId[task.id]?.draftSummary ?? task.draftSummary ?? "";
                                            const content = draftEditsByTaskId[task.id]?.draftContent ?? task.draftContent ?? "";
                                            try {
                                                await patchTask(task.id, { draftTitle: title, draftSummary: summary, draftContent: content });
                                                setDraftEditsByTaskId((prev) => {
                                                    const next = { ...prev };
                                                    delete next[task.id];
                                                    return next;
                                                });
                                            } catch (err) {
                                                setError(err instanceof Error ? err.message : "保存草稿失败");
                                            } finally {
                                                setDraftSavingTaskId(null);
                                            }
                                        }}
                                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        {draftSavingTaskId === task.id ? "保存中…" : "保存草稿修改"}
                                    </button>
                                </div>
                            )}

                            {exportedFilename && (
                                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                    <p className="font-semibold">草稿导出成功：{exportedFilename}</p>
                                    <Link href="/admin/drafts" className="mt-1 inline-block text-emerald-700 underline">
                                        打开导出目录
                                    </Link>
                                </div>
                            )}
                        </section>
                    );
                })}
                    </div>
                </>
            )}
        </div>
    );
}
