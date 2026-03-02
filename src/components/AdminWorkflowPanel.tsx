"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import {
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

type AdminModuleKey = "home" | "planning" | "execution" | "library" | "settings";
type ExecutionStatusFilter = "all" | "in_progress" | WorkflowTask["status"];
type LibraryAdoptionFilter = "all" | "adopted" | "unadopted";
type LibrarySearchCategory = FiveDCategory | "other";

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
    const [activeExecutionStatus, setActiveExecutionStatus] = useState<ExecutionStatusFilter>("all");
    const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
    const [monthlyGenerating, setMonthlyGenerating] = useState(false);
    const [monthlyPreviewLoading, setMonthlyPreviewLoading] = useState(false);
    const [monthlyGenerationPreview, setMonthlyGenerationPreview] = useState<MonthlyGenerationPreview | null>(null);
    const [templateName, setTemplateName] = useState("");
    const [themeSeed, setThemeSeed] = useState("");
    const [templateSaving, setTemplateSaving] = useState(false);
    const [libraryThemeSeed, setLibraryThemeSeed] = useState("衰老");
    const [libraryCategory, setLibraryCategory] = useState<LibrarySearchCategory>("other");
    const [librarySaving, setLibrarySaving] = useState(false);
    const [libraryDownloadingId, setLibraryDownloadingId] = useState<string | null>(null);
    const [libraryPrimaryMode, setLibraryPrimaryMode] = useState<"summary" | "original">("summary");
    const [libraryBatchTopN, setLibraryBatchTopN] = useState(5);
    const [libraryBatchOnlyUnexported, setLibraryBatchOnlyUnexported] = useState(false);
    const [libraryBatchExporting, setLibraryBatchExporting] = useState(false);
    const [librarySelectedIds, setLibrarySelectedIds] = useState<Record<string, boolean>>({});
    const [libraryAdoptionFilter, setLibraryAdoptionFilter] = useState<LibraryAdoptionFilter>("all");
    const [libraryKeywordFilter, setLibraryKeywordFilter] = useState<string>("all");
    const [libraryBatchKeywordDraft, setLibraryBatchKeywordDraft] = useState("");
    const [libraryBatchKeywordApplying, setLibraryBatchKeywordApplying] = useState(false);
    const [libraryKeywordDraftById, setLibraryKeywordDraftById] = useState<Record<string, string>>({});
    const [libraryPreviewOpenId, setLibraryPreviewOpenId] = useState<string | null>(null);
    const [libraryPreviewLoadingId, setLibraryPreviewLoadingId] = useState<string | null>(null);
    const [libraryPreviewFilePathById, setLibraryPreviewFilePathById] = useState<Record<string, string>>({});
    const [libraryPreviewTextById, setLibraryPreviewTextById] = useState<Record<string, string>>({});
    const libraryPreviewRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [collaborationSaving, setCollaborationSaving] = useState(false);
    const [exportedTaskFiles, setExportedTaskFiles] = useState<Record<string, string>>({});
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

        if (activeExecutionStatus === "all") {
            return categoryFiltered;
        }

        if (activeExecutionStatus === "in_progress") {
            return categoryFiltered.filter((task) => ["paper_selected", "drafted", "approved"].includes(task.status));
        }

        return categoryFiltered.filter((task) => task.status === activeExecutionStatus);
    }, [state, activeCategory, activeExecutionStatus]);

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

    const adoptedLibraryPaperIds = useMemo(() => {
        if (!state?.tasks || state.tasks.length === 0) {
            return new Set<string>();
        }

        return new Set(
            state.tasks
                .map((task) => task.selectedPaperId)
                .filter((paperId): paperId is string => Boolean(paperId))
        );
    }, [state?.tasks]);

    const allLibraryKeywords = useMemo(() => {
        if (!state?.paperLibrary || state.paperLibrary.length === 0) {
            return [] as string[];
        }

        return Array.from(
            new Set(
                state.paperLibrary
                    .flatMap((item) => item.keywords ?? [])
                    .map((keyword) => keyword.trim())
                    .filter(Boolean)
            )
        ).sort((left, right) => left.localeCompare(right, "zh-CN"));
    }, [state?.paperLibrary]);

    const filteredLibraryItems = useMemo(() => {
        const source = state?.paperLibrary ?? [];
        const filtered = source.filter((item) => {
            if (libraryAdoptionFilter === "adopted") {
                return adoptedLibraryPaperIds.has(item.id);
            }

            if (libraryAdoptionFilter === "unadopted") {
                return !adoptedLibraryPaperIds.has(item.id);
            }

            return true;
        }).filter((item) => {
            if (libraryKeywordFilter === "all") {
                return true;
            }

            return (item.keywords ?? []).includes(libraryKeywordFilter);
        });

        return filtered;
    }, [state?.paperLibrary, adoptedLibraryPaperIds, libraryAdoptionFilter, libraryKeywordFilter]);

    const visibleLibraryItems = useMemo(() => {
        return filteredLibraryItems.slice(0, 20);
    }, [filteredLibraryItems]);

    const selectedLibraryCount = useMemo(() => {
        if (visibleLibraryItems.length === 0) {
            return 0;
        }

        const currentListIds = new Set(visibleLibraryItems.map((item) => item.id));
        return Object.entries(librarySelectedIds)
            .filter(([id, selected]) => selected && currentListIds.has(id))
            .length;
    }, [visibleLibraryItems, librarySelectedIds]);

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

    async function savePapersToLibrary() {
        const normalizedTheme = libraryThemeSeed.trim();
        if (!normalizedTheme) {
            setError("请输入论文库主题关键词");
            return;
        }

        setLibrarySaving(true);
        try {
            setError("");
            const response = await fetch("/api/admin/paper-library", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme: normalizedTheme, category: libraryCategory })
            });

            if (!response.ok) {
                const payload = await response.json() as { message?: string };
                throw new Error(payload.message ?? "论文入库失败");
            }

            const nextState = await response.json() as WorkflowState;
            setState(nextState);
        } catch (libraryError) {
            setError(libraryError instanceof Error ? libraryError.message : "论文入库失败");
        } finally {
            setLibrarySaving(false);
        }
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
                await openLibrarySummaryPreview(itemId, { forceOpen: true, bypassCache: true });
            }
            return true;
        } catch (downloadError) {
            setError(downloadError instanceof Error ? downloadError.message : (mode === "original" ? "下载原文失败" : "下载摘要失败"));
            return false;
        } finally {
            setLibraryDownloadingId(null);
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
        const currentList = visibleLibraryItems;
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
        options?: { forceOpen?: boolean; bypassCache?: boolean }
    ) {
        const forceOpen = options?.forceOpen ?? false;
        const bypassCache = options?.bypassCache ?? false;

        if (!forceOpen && libraryPreviewOpenId === itemId) {
            setLibraryPreviewOpenId(null);
            return;
        }

        const cached = libraryPreviewTextById[itemId];
        if (!bypassCache && cached) {
            setLibraryPreviewOpenId(itemId);
            return;
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
        } catch (previewError) {
            setError(previewError instanceof Error ? previewError.message : "读取摘要失败");
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

    async function addBatchKeywordToFilteredList() {
        const keyword = libraryBatchKeywordDraft.trim();
        if (!keyword) {
            setError("请输入要批量添加的关键词");
            return;
        }

        if (filteredLibraryItems.length === 0) {
            setError("当前筛选结果为空，无法批量添加关键词");
            return;
        }

        const confirmed = window.confirm(`确认将关键词「${keyword}」批量添加到当前筛选结果（共 ${filteredLibraryItems.length} 篇）吗？`);
        if (!confirmed) {
            return;
        }

        setLibraryBatchKeywordApplying(true);
        setError("");

        let successCount = 0;
        for (const item of filteredLibraryItems) {
            const nextKeywords = Array.from(new Set([...(item.keywords ?? []), keyword]));
            const ok = await patchLibraryKeywords(item.id, nextKeywords);
            if (ok) {
                successCount += 1;
            }
        }

        setLibraryBatchKeywordApplying(false);

        if (successCount < filteredLibraryItems.length) {
            setError(`批量关键词添加完成：成功 ${successCount} 篇，失败 ${filteredLibraryItems.length - successCount} 篇。`);
            return;
        }

        setLibraryBatchKeywordDraft("");
        window.alert(`批量关键词添加完成：成功 ${successCount} 篇。`);
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
            const response = await fetch(`/api/admin/task/${taskId}/${action}`, {
                method: "POST"
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
                    <p className="mt-1 text-sm">后台登录与模型生成配置完整，可直接执行“检索论文 → 生成草稿 → 审核发布”流程。</p>
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
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">论文库（预检索与复用）</h2>
                <p className="mt-1 text-xs text-slate-500">可按主题提前检索并入库，后续任务检索会优先调用库内论文；同一论文不会重复引用。</p>

                <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="text-sm text-slate-700">
                        主题关键词
                        <input
                            type="text"
                            value={libraryThemeSeed}
                            onChange={(event) => setLibraryThemeSeed(event.target.value)}
                            placeholder="例如：睡眠与衰老"
                            className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                        />
                    </label>

                    <label className="text-sm text-slate-700">
                        维度
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

                    <button
                        type="button"
                        onClick={() => void savePapersToLibrary()}
                        disabled={librarySaving || libraryBatchExporting}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                    >
                        {librarySaving ? "入库中..." : "检索并入库"}
                    </button>
                </div>

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
                        disabled={libraryBatchExporting || visibleLibraryItems.length === 0}
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        全选当前列表
                    </button>

                    <button
                        type="button"
                        onClick={() => toggleSelectCurrentList(false)}
                        disabled={libraryBatchExporting || visibleLibraryItems.length === 0}
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        取消全选
                    </button>

                    <button
                        type="button"
                        onClick={() => void exportSelectedSummaries()}
                        disabled={libraryBatchExporting || !Object.values(librarySelectedIds).some(Boolean)}
                        className="rounded border border-blue-300 bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                    >
                        导出选中摘要
                    </button>

                    <span className="text-slate-600">已选 {selectedLibraryCount} 篇</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600">采纳状态筛选：</span>
                    <button
                        type="button"
                        onClick={() => setLibraryAdoptionFilter("all")}
                        className={`rounded px-2 py-1 font-semibold ${libraryAdoptionFilter === "all" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                        全部
                    </button>
                    <button
                        type="button"
                        onClick={() => setLibraryAdoptionFilter("adopted")}
                        className={`rounded px-2 py-1 font-semibold ${libraryAdoptionFilter === "adopted" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                        已被采纳
                    </button>
                    <button
                        type="button"
                        onClick={() => setLibraryAdoptionFilter("unadopted")}
                        className={`rounded px-2 py-1 font-semibold ${libraryAdoptionFilter === "unadopted" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                        未被采纳
                    </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600">关键词筛选：</span>
                    <select
                        value={libraryKeywordFilter}
                        onChange={(event) => setLibraryKeywordFilter(event.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none focus:border-blue-500"
                    >
                        <option value="all">全部关键词</option>
                        {allLibraryKeywords.map((keyword) => (
                            <option key={keyword} value={keyword}>{keyword}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={libraryBatchKeywordDraft}
                        onChange={(event) => setLibraryBatchKeywordDraft(event.target.value)}
                        placeholder="批量添加关键词，如：睡眠"
                        className="w-44 rounded border border-slate-300 px-2 py-1 text-slate-700 outline-none focus:border-blue-500"
                        disabled={libraryBatchKeywordApplying}
                    />
                    <button
                        type="button"
                        onClick={() => void addBatchKeywordToFilteredList()}
                        disabled={libraryBatchKeywordApplying || filteredLibraryItems.length === 0}
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        {libraryBatchKeywordApplying ? "批量添加中..." : "批量给当前筛选结果加关键词"}
                    </button>
                </div>

                {visibleLibraryItems.length > 0 ? (
                    <div className="mt-4 space-y-2">
                        {visibleLibraryItems.map((item) => (
                            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                {adoptedLibraryPaperIds.has(item.id) && (
                                    <div className="mb-2">
                                        <button
                                            type="button"
                                            disabled
                                            className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
                                        >
                                            已被采纳
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
                                    <button
                                        type="button"
                                        onClick={() => void downloadLibraryPaper(item.id, libraryPrimaryMode)}
                                        disabled={libraryBatchExporting || libraryDownloadingId === `${item.id}:${libraryPrimaryMode}`}
                                        className="rounded bg-slate-900 px-2 py-1 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                                    >
                                        {libraryDownloadingId === `${item.id}:${libraryPrimaryMode}`
                                            ? "下载中..."
                                            : (libraryPrimaryMode === "summary" ? "下载摘要（含中文）" : "下载原文")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void downloadLibraryPaper(item.id, libraryPrimaryMode === "summary" ? "original" : "summary")}
                                        disabled={libraryBatchExporting || libraryDownloadingId === `${item.id}:${libraryPrimaryMode === "summary" ? "original" : "summary"}`}
                                        className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                                    >
                                        {libraryDownloadingId === `${item.id}:${libraryPrimaryMode === "summary" ? "original" : "summary"}`
                                            ? "下载中..."
                                            : (libraryPrimaryMode === "summary" ? "下载原文" : "下载摘要（含中文）")}
                                    </button>
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
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-500">当前筛选条件下暂无论文。</p>
                )}
                </div>
            )}

            {activeAdminModule === "execution" && (
                <>
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
                                    1) 检索论文
                                </button>
                                <button
                                    disabled={disabled || !task.selectedPaperId}
                                    onClick={() => void callTaskAction(task.id, "generate")}
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

                            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <label className="text-sm text-slate-700">
                                    论文候选
                                    <select
                                        value={task.selectedPaperId ?? ""}
                                        onChange={(event) => {
                                            const nextValue = event.target.value;
                                            void patchTask(task.id, {
                                                selectedPaperId: nextValue,
                                                status: nextValue ? "paper_selected" : "planned"
                                            });
                                        }}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                    >
                                        <option value="">请选择论文</option>
                                        {task.paperCandidates.map((paper) => (
                                            <option key={paper.id} value={paper.id}>
                                                {paper.titleZh ?? paper.title}
                                            </option>
                                        ))}
                                    </select>
                                </label>

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

                            {selectedPaper && (
                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                    <p className="font-semibold text-slate-900">已选论文</p>
                                    <p className="mt-1 text-slate-700">{selectedPaper.titleZh ?? selectedPaper.title}</p>
                                    {selectedPaper.titleZh && selectedPaper.titleZh !== selectedPaper.title && (
                                        <p className="mt-1 text-xs text-slate-500">EN: {selectedPaper.title}</p>
                                    )}
                                    <p className="mt-1 text-slate-500">来源：{selectedPaper.source} · {selectedPaper.authors} · {selectedPaper.journal} · {selectedPaper.year}</p>
                                    <a href={selectedPaper.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-blue-600 underline">
                                        查看论文链接
                                    </a>
                                </div>
                            )}

                            {task.draftContent && (
                                <div className="mt-4">
                                    <p className="mb-2 text-sm font-semibold text-slate-900">AI 草稿预览（可复制到编辑器人工调整）</p>
                                    <textarea
                                        aria-label="AI 草稿预览"
                                        readOnly
                                        value={task.draftContent}
                                        className="h-56 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
                                    />
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
