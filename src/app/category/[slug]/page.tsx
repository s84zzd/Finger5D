import { getArticlesByCategory } from "@/lib/mdx";
import { ArticleCard } from "@/components/ArticleCard";
import { Heart, Activity, Brain, Utensils, Users, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ slug: string }>;
}

const categoryConfig: Record<string, {
    name: string;
    title: string;
    description: string;
    intro: React.ReactNode;
    features: string[];
    cta: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
}> = {
    cardio: {
        name: "心血管与代谢",
        title: "心血管与代谢：衰老速度的核心引擎",
        description: "心血管系统与代谢健康，是影响衰老速度的关键因素。",
        intro: (
            <>
                <p className="mb-4">心血管系统与代谢健康，是影响衰老速度的关键因素。</p>
                <p>睡眠、血压、血糖、炎症水平……这些看似日常的小变化，都会在身体内部悄悄累积。</p>
                <p className="mt-4 font-medium text-slate-900">我们用清晰、温和、适合 50+ 的方式，带你理解身体最重要的系统之一。</p>
            </>
        ),
        features: [
            "如何通过睡眠改善代谢",
            "为什么炎症是“隐形加速器”",
            "血压、血糖与衰老的关系",
            "科学研究如何解释心血管老化"
        ],
        cta: "阅读心血管与代谢相关文章",
        icon: Heart,
        color: "text-rose-600",
        bg: "bg-rose-50",
    },
    physical: {
        name: "身体活动",
        title: "身体活动：保持独立与活力的关键",
        description: "随着年龄增长，肌肉力量、平衡能力和活动量会自然下降。但科学告诉我们：肌肉可以重新增长。",
        intro: (
            <>
                <p className="mb-4">随着年龄增长，肌肉力量、平衡能力和活动量会自然下降。</p>
                <p>但科学告诉我们：<br /><span className="font-semibold text-slate-900">肌肉可以重新增长，力量可以重新建立，平衡可以重新训练。</span></p>
                <p className="mt-4 text-slate-900">你不需要成为运动达人，只需要从今天开始动一点点。</p>
            </>
        ),
        features: [
            "为什么力量训练是 50+ 的“长寿药物”",
            "如何安全地提升平衡能力",
            "如何减少跌倒风险",
            "肌肉衰减（Sarcopenia）的最新研究"
        ],
        cta: "阅读身体活动相关文章",
        icon: Activity,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
    },
    cognitive: {
        name: "认知活力",
        title: "认知活力：让大脑保持清晰、灵活、有力量",
        description: "记忆力下降、注意力变弱……这些都是自然老化的一部分，但并不意味着无能为力。",
        intro: (
            <>
                <p className="mb-4">记忆力下降、注意力变弱、学习速度变慢……这些都是自然老化的一部分，但并不意味着无能为力。</p>
                <p>科学研究表明：<br /><span className="font-semibold text-slate-900">大脑具有终身可塑性（Neuroplasticity）。它可以通过训练变得更强、更灵活。</span></p>
                <p className="mt-4 text-slate-900">你会发现，大脑比你想象的更有潜力。</p>
            </>
        ),
        features: [
            "如何提升记忆力",
            "如何训练注意力",
            "如何保持学习能力",
            "大脑可塑性的最新研究"
        ],
        cta: "阅读认知活力相关文章",
        icon: Brain,
        color: "text-violet-600",
        bg: "bg-violet-50",
    },
    nutrition: {
        name: "健康饮食",
        title: "健康饮食：最温和、最可持续的抗衰老方式",
        description: "饮食是影响衰老速度最温和、最容易开始的干预方式。",
        intro: (
            <>
                <p className="mb-4">饮食是影响衰老速度最温和、最容易开始的干预方式。</p>
                <p>蛋白质、蔬果、抗炎饮食、地中海饮食……这些选择会在身体内部产生深远影响。</p>
                <p className="mt-4 text-slate-900">你不需要严格节食，只需要做出更聪明的选择。</p>
            </>
        ),
        features: [
            "为什么蛋白质对 50+ 尤其重要",
            "如何吃出更好的肌肉质量",
            "抗炎饮食的科学依据",
            "地中海饮食为何与长寿相关"
        ],
        cta: "阅读健康饮食相关文章",
        icon: Utensils,
        color: "text-amber-600",
        bg: "bg-amber-50",
    },
    social: {
        name: "社交与情绪",
        title: "社交与情绪：长寿中最被低估的力量",
        description: "孤独感、情绪能量、社交关系，对健康寿命的影响不亚于运动和饮食。",
        intro: (
            <>
                <p className="mb-4">科学研究不断提醒我们：<br />孤独感、情绪能量、社交关系，对健康寿命的影响不亚于运动和饮食。</p>
                <p>良好的社交与情绪状态可以：降低炎症、改善睡眠、提升免疫力、延缓认知衰退。</p>
                <p className="mt-4 text-slate-900">你并不需要“变得外向”，只需要保持连接。</p>
            </>
        ),
        features: [
            "如何减少孤独感",
            "如何提升情绪能量",
            "如何建立更稳定的社交联系",
            "社交与长寿的科学证据"
        ],
        cta: "阅读社交与情绪相关文章",
        icon: Users,
        color: "text-blue-600",
        bg: "bg-blue-50",
    },
};

export async function generateStaticParams() {
    return Object.keys(categoryConfig).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
    const { slug } = await params;
    const config = categoryConfig[slug];
    if (!config) return { title: "Category Not Found" };
    return {
        title: `${config.name} - Finger5D`,
        description: config.description,
    };
}

export default async function CategoryPage({ params }: PageProps) {
    const { slug } = await params;
    const config = categoryConfig[slug];

    if (!config) {
        notFound();
    }

    // Fetch articles for this category
    const articles = getArticlesByCategory(slug);

    const Icon = config.icon;

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Header Section */}
            <div className="bg-white pb-24 pt-24 sm:pb-32 sm:pt-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mb-12">
                        <Link
                            href="/"
                            className="flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> 返回首页
                        </Link>
                    </div>
                    <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2">
                            <div>
                                <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${config.bg}`}>
                                    <Icon className={`h-8 w-8 ${config.color}`} />
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-balance">
                                    {config.title}
                                </h1>
                                <div className="mt-6 text-xl leading-8 text-slate-600 text-balance">
                                    {config.intro}
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-3xl p-8 lg:p-12">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">在这里，你会看到：</h3>
                                <ul className="space-y-4">
                                    {config.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <CheckCircle2 className={`h-6 w-6 flex-shrink-0 ${config.color}`} />
                                            <span className="text-slate-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-10">
                                    <a href="#articles" className={`rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity bg-slate-900`}>
                                        {config.cta}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Articles Section */}
            <div id="articles" className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            {config.name}相关文章
                        </h2>
                    </div>
                    {articles.length > 0 ? (
                        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                            {articles.map((article) => (
                                <ArticleCard
                                    key={article.slug}
                                    title={article.frontmatter.title}
                                    excerpt={article.frontmatter.summary}
                                    category={article.frontmatter.category}
                                    date={article.frontmatter.date}
                                    href={`/articles/${article.slug}`}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-slate-500 text-lg">该分类下暂无文章，敬请期待。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
