export const FIVE_D_CATEGORIES = ["cardio", "physical", "cognitive", "nutrition", "social"] as const;

export const ARTICLES_PER_CATEGORY_PER_WEEK = 2;
export const WEEKS_PER_MONTH = 4;
export const WEEKLY_ARTICLE_TARGET = FIVE_D_CATEGORIES.length * ARTICLES_PER_CATEGORY_PER_WEEK;
export const MONTHLY_ARTICLE_TARGET = WEEKLY_ARTICLE_TARGET * WEEKS_PER_MONTH;
export const WEEKLY_TASK_TARGET_STEP = FIVE_D_CATEGORIES.length;
export const WEEKLY_TASK_TARGET_MIN = FIVE_D_CATEGORIES.length;
export const WEEKLY_TASK_TARGET_MAX = 40;

export type FiveDCategory = (typeof FIVE_D_CATEGORIES)[number];

export const PAPER_SOURCES = ["crossref", "openalex", "pubmed", "webofscience", "wanfang", "cnki"] as const;

export type PaperSource = (typeof PAPER_SOURCES)[number];

export const DRAFT_PROMPT_TEMPLATES = [
    "layered_progressive",
    "qa_dialogue",
    "compare_analysis",
    "narrative_research",
    "minimal_cards"
] as const;

export type DraftPromptTemplate = (typeof DRAFT_PROMPT_TEMPLATES)[number];

export const DRAFT_STUDY_TEMPLATES = [
    "auto",
    "rct",
    "meta_analysis",
    "prospective_cohort",
    "retrospective_cohort",
    "cross_sectional",
    "cohort",
    "case_control",
    "diagnostic_accuracy"
] as const;

export type DraftStudyTemplate = (typeof DRAFT_STUDY_TEMPLATES)[number];

export interface SearchSettings {
    sourceWhitelist: PaperSource[];
    sinceYear: number;
    maxResultsPerSource: number;
    minRelevanceScore: number;
    weeklyTaskTarget: number;
}

export interface CollaborationSettings {
    planningReviewer: string;
    paperRetriever: string;
    draftReviewer: string;
}

export interface MonthlyThemePlan {
    id: string;
    monthKey: string;
    title: string;
    objective: string;
    categoryFocus: FiveDCategory[];
    weekSlots: string[];
    status: "draft" | "active" | "closed";
    note: string;
    createdAt: string;
    updatedAt: string;
}

export interface WeekSlotTemplate {
    id: string;
    name: string;
    weekSlots: string[];
    createdAt: string;
    updatedAt: string;
}

export interface WeeklyReview {
    id: string;
    weekKey: string;
    monthKey: string;
    summary: string;
    retrievalInbox: string;
    wins: string;
    blockers: string;
    actionItems: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaperCandidate {
    id: string;
    source: PaperSource;
    title: string;
    titleZh?: string;
    authors: string;
    journal: string;
    year: string;
    doi?: string;
    url: string;
    abstract?: string;
    abstractEn?: string;
    abstractZh?: string;
}

export interface PaperLibraryItem extends PaperCandidate {
    key: string;
    category: FiveDCategory;
    themeSeed: string;
    searchScope?: "category" | "other";
    keywords?: string[];
    customCategories?: string[];
    referenceTypeCode?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    gbtCitation?: string;
    storageCategory?: string;
    adopted?: boolean;
    adoptedAt?: string;
    localFilePath?: string;
    summaryFilePath?: string;
    originalFilePath?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TaskOperationLog {
    action: "search_papers" | "generate_draft" | "approve" | "reject" | "publish" | "export";
    actor: string;
    detail: string;
    createdAt: string;
}

export interface WorkflowTask {
    id: string;
    weekKey: string;
    category: FiveDCategory;
    sequence: number;
    theme: string;
    topicNote: string;
    status: "planned" | "paper_selected" | "drafted" | "approved" | "rejected" | "published";
    paperCandidates: PaperCandidate[];
    selectedPaperId?: string;
    draftTitle?: string;
    draftSummary?: string;
    draftContent?: string;
    draftPromptTemplate?: DraftPromptTemplate;
    draftStudyTemplate?: DraftStudyTemplate;
    reviewComment?: string;
    operationLogs?: TaskOperationLog[];
    createdAt: string;
    updatedAt: string;
}

export interface WorkflowState {
    version: number;
    lastSyncedWeekKey: string;
    searchSettings: SearchSettings;
    collaboration: CollaborationSettings;
    monthlyPlans: MonthlyThemePlan[];
    weekSlotTemplates: WeekSlotTemplate[];
    weeklyReviews: WeeklyReview[];
    paperLibrary: PaperLibraryItem[];
    tasks: WorkflowTask[];
}

export interface MonthlyGenerationPreviewWeek {
    weekKey: string;
    existingCount: number;
    targetCount: number;
    willAddCount: number;
}

export interface MonthlyGenerationPreview {
    monthKey: string;
    targetTotal: number;
    existingTotal: number;
    willAddTotal: number;
    weeks: MonthlyGenerationPreviewWeek[];
}
