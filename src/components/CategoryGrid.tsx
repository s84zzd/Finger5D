import Link from "next/link";
import { Heart, Activity, Brain, Utensils, Users } from "lucide-react";

const categories = [
    {
        name: "心血管与代谢",
        slug: "cardio",
        icon: Heart,
        description: "关注血压、血糖与血管健康",
        color: "text-rose-600",
        bg: "bg-rose-50",
    },
    {
        name: "身体活动",
        slug: "physical",
        icon: Activity,
        description: "力量训练与平衡能力",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
    },
    {
        name: "认知活力",
        slug: "cognitive",
        icon: Brain,
        description: "记忆力与神经可塑性",
        color: "text-violet-600",
        bg: "bg-violet-50",
    },
    {
        name: "健康饮食",
        slug: "nutrition",
        icon: Utensils,
        description: "地中海饮食与营养干预",
        color: "text-amber-600",
        bg: "bg-amber-50",
    },
    {
        name: "社交与情绪",
        slug: "social",
        icon: Users,
        description: "社会连接与心理韧性",
        color: "text-blue-600",
        bg: "bg-blue-50",
    },
];

export function CategoryGrid() {
    return (
        <section className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Finger5D 五维健康模型
                    </h2>
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                        全方位管理您的衰老进程，从这五个关键维度开始。
                    </p>
                </div>
                <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-5">
                    {categories.map((category) => (
                        <Link
                            key={category.slug}
                            href={`/category/${category.slug}`}
                            className="group relative flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                        >
                            <div className={`mb-4 rounded-full p-4 ${category.bg}`}>
                                <category.icon className={`h-8 w-8 ${category.color}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {category.name}
                            </h3>
                            <p className="mt-2 text-sm text-slate-500">{category.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
