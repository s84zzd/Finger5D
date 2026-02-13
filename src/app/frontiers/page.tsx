import { getArticlesByCategory } from "@/lib/mdx";
import { ArticleCard } from "@/components/ArticleCard";
import { Microscope, ArrowLeft, Dna, Activity, Brain, Utensils, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { CategoryGrid } from "@/components/CategoryGrid";

export const metadata = {
    title: "前沿科学 (Geroscience) - Finger5D",
    description: "全球衰老研究的最新突破，从分子机制到临床应用。",
};

export default function FrontiersPage() {
    const articles = getArticlesByCategory("frontier");

    return (
        <div className="bg-white">
            {/* 🌟 Hero Section - Dark Theme */}
            <div className="relative isolate overflow-hidden bg-slate-900 py-24 sm:py-32 text-white">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.900),theme(colors.slate.900))] opacity-50" />
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mb-8">
                        <Link
                            href="/"
                            className="flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> 返回首页
                        </Link>
                    </div>
                    <div className="mx-auto max-w-3xl lg:mx-0">
                        <div className="flex items-center gap-2 text-blue-400 font-semibold mb-4">
                            <Microscope className="h-5 w-5" />
                            <span>Geroscience Frontiers</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                            前沿科学：探索衰老的最新突破
                        </h1>
                        <p className="mt-6 text-xl leading-8 text-slate-300 text-balance">
                            全球衰老研究正在以惊人的速度发展。
                            <br />
                            我们将复杂的学术成果转化为清晰、可信、易读的内容，让你在第一时间理解科学如何改变未来的健康寿命。
                        </p>
                    </div>
                </div>
            </div>

            {/* 🔬 Intro & Value Section */}
            <div className="py-24 sm:py-32 bg-slate-50">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">为什么要关注衰老科学？</h2>
                        <p className="mt-4 text-lg text-slate-600">因为它正在改变我们对健康的理解。</p>
                    </div>

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2">
                        {[
                            {
                                title: "衰老是可调节的",
                                desc: "越来越多研究表明，衰老速度可以被影响，而非不可逆转的命运。",
                                icon: Activity
                            },
                            {
                                title: "生活方式干预比想象更强大",
                                desc: "睡眠、运动、饮食、社交都能直接影响细胞层面的衰老标记物。",
                                icon: Zap
                            },
                            {
                                title: "药物与营养干预快速发展",
                                desc: "GLP‑1、mTOR、NAD+、Senolytics 等正成为延长健康寿命的热门方向。",
                                icon: Dna
                            },
                            {
                                title: "重新定义“可逆性”",
                                desc: "透过科学手段，大脑、肌肉、免疫系统都有机会重获年轻活力。",
                                icon: Brain
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-4 p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex-shrink-0">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                                    <p className="mt-2 text-slate-600">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 🧬 Content Structure (What you will find) */}
            <div className="py-24 sm:py-32 bg-white">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center mb-16">
                        <h2 className="text-base font-semibold leading-7 text-blue-600">内容结构</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            在这里，你会看到
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="bg-slate-50 p-8 rounded-2xl">
                            <Dna className="h-8 w-8 text-rose-600 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-4">细胞与分子层面的突破</h3>
                            <ul className="space-y-2 text-slate-600">
                                <li>• 衰老细胞 (Senescent Cells)</li>
                                <li>• 端粒与表观遗传时钟</li>
                                <li>• NAD+、mTOR、AMPK 通路</li>
                            </ul>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-2xl">
                            <Activity className="h-8 w-8 text-emerald-600 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-4">身体功能相关研究</h3>
                            <ul className="space-y-2 text-slate-600">
                                <li>• 肌肉衰减 (Sarcopenia)</li>
                                <li>• 代谢健康优化</li>
                                <li>• 炎症衰老 (Inflammaging)</li>
                            </ul>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-2xl">
                            <Brain className="h-8 w-8 text-violet-600 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-4">大脑与认知科学</h3>
                            <ul className="space-y-2 text-slate-600">
                                <li>• 神经可塑性</li>
                                <li>• 认知衰退机制</li>
                                <li>• 记忆与学习能力的维持</li>
                            </ul>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-2xl">
                            <Utensils className="h-8 w-8 text-amber-600 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-4">前沿干预技术</h3>
                            <ul className="space-y-2 text-slate-600">
                                <li>• GLP‑1 与代谢药物</li>
                                <li>• Senolytics 疗法</li>
                                <li>• 断食与热量限制 (CR)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* 📚 Articles Section */}
            <div className="py-24 sm:py-32 bg-slate-50" id="articles">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-12">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            最新前沿研究文章
                        </h2>
                    </div>

                    {articles.length > 0 ? (
                        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                            {articles.map((article) => (
                                <ArticleCard
                                    key={article.slug}
                                    title={article.frontmatter.title}
                                    excerpt={article.frontmatter.summary}
                                    category="Geroscience"
                                    date={article.frontmatter.date}
                                    href={`/articles/${article.slug}`}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-slate-500">更多前沿内容正在编译中，敬请期待。</p>
                        </div>
                    )}
                </div>
            </div>


            {/* 🤝 Promise Section */}
            <div className="py-24 sm:py-32 bg-slate-900 text-white">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center mb-12">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            我们的承诺
                        </h2>
                    </div>
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-4 lg:gap-y-16">
                        {[
                            "科学严谨：基于同行评审研究",
                            "温和表达：不夸大、不焦虑",
                            "适老化阅读：易读、易懂",
                            "可执行建议：今天就能做出的改变"
                        ].map((text, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-4 pl-6">
                                <CheckCircle2 className="h-6 w-6 text-blue-400 flex-shrink-0" />
                                <span className="font-semibold text-white">{text}</span>
                            </div>
                        ))}
                    </dl>

                    <div className="mt-16 flex justify-center gap-6">
                        <Link
                            href="#articles"
                            className="rounded-full bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
                        >
                            阅读最新研究
                        </Link>
                        <Link
                            href="/category/cardio"
                            className="rounded-full bg-white/10 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-white/20 transition-colors"
                        >
                            了解五维健康模型
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
