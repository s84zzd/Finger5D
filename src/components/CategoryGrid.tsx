import Link from "next/link";
import Image from "next/image";
import { Heart, Activity, Brain, Utensils, Users, ArrowRight } from "lucide-react";

const categories = [
    {
        name: "心血管与代谢",
        slug: "cardio",
        icon: Heart,
        description: "关注血压、血糖与血管健康",
        color: "text-rose-600",
        bg: "bg-rose-50",
        image: "/images/category-cardio.jpeg"
    },
    {
        name: "身体活动",
        slug: "physical",
        icon: Activity,
        description: "力量训练与平衡能力",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        image: "/images/category-physical.jpeg"
    },
    {
        name: "认知活力",
        slug: "cognitive",
        icon: Brain,
        description: "记忆力与神经可塑性",
        color: "text-violet-600",
        bg: "bg-violet-50",
        image: "/images/category-cognitive.jpeg"
    },
    {
        name: "健康饮食",
        slug: "nutrition",
        icon: Utensils,
        description: "地中海饮食与营养干预",
        color: "text-amber-600",
        bg: "bg-amber-50",
        image: "/images/category-nutrition.jpeg"
    },
    {
        name: "社交与情绪",
        slug: "social",
        icon: Users,
        description: "社会连接与心理韧性",
        color: "text-blue-600",
        bg: "bg-blue-50",
        image: "/images/category-social.jpeg"
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
                {/* 5-Column Grid on Large Screens, 1-Column on Mobile */}
                <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-5">
                    {categories.map((category) => (
                        <Link
                            key={category.slug}
                            href={`/category/${category.slug}`}
                            className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg"
                        >
                            {/* Card Header / Image */}
                            <div className={`aspect-[4/3] w-full ${category.bg} flex items-center justify-center relative overflow-hidden`}>
                                <Image
                                    src={category.image}
                                    alt={category.name}
                                    fill
                                    className="object-cover transition-transform group-hover:scale-105 duration-500 opacity-90 group-hover:opacity-100"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />

                                {/* Icon Overlay */}
                                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm z-10">
                                    <category.icon className={`h-5 w-5 ${category.color}`} />
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="flex flex-1 flex-col p-6">
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {category.name}
                                </h3>
                                <p className="mt-3 text-base leading-relaxed text-slate-600 flex-1">
                                    {category.description}
                                </p>
                                <div className="mt-6 flex items-center text-sm font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 duration-300">
                                    查看维度 <ArrowRight className="ml-1 h-4 w-4" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
