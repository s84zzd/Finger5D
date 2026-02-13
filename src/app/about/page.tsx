import { ShieldCheck, HeartHandshake, Eye, Target, Activity, Brain, Utensils, Users, Microscope, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { CategoryGrid } from "@/components/CategoryGrid";

export const metadata = {
    title: "关于我们 - Finger5D",
    description: "了解 Finger5D 的愿景与团队，致力于为50+人群提供科学的抗衰老解决方案。",
};

export default function AboutPage() {
    return (
        <div className="bg-white">
            {/* 🌱 Who We Are - Hero */}
            <div className="relative isolate overflow-hidden bg-slate-900 py-24 sm:py-32">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.900),theme(colors.slate.900))] opacity-50" />
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:mx-0">
                        <div className="flex items-center gap-2 text-blue-400 font-semibold mb-4">
                            <HeartHandshake className="h-5 w-5" />
                            <span>关于我们</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                            我们是谁
                        </h1>
                        <p className="mt-6 text-xl leading-8 text-slate-300">
                            Finger5D 是一个基于 <span className="text-white font-semibold">芬格健康模型（Finger5D）</span> 与 <span className="text-white font-semibold">衰老科学前沿（Geroscience）</span> 打造的科普平台。
                        </p>
                        <p className="mt-4 text-lg text-slate-400">
                            我们关注 50+ 人群的真实需求，希望让每个人都能以更科学、更温和、更可持续的方式理解衰老、延缓衰老、提升健康寿命（Healthspan）。
                        </p>
                        <blockquote className="mt-8 border-l-4 border-blue-500 pl-4 text-white italic">
                            “科学应该被看见，也应该被理解。”
                        </blockquote>
                    </div>
                </div>
            </div>

            {/* 🎯 Our Mission */}
            <div className="py-24 sm:py-32 bg-slate-50">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">我们的使命</h2>
                        <p className="mt-4 text-2xl font-semibold text-slate-900">让学术突破触手可及。</p>
                        <p className="mt-4 text-lg text-slate-600">
                            我们将复杂的研究成果转化为清晰、可信、易读的内容，让你在第一时间理解科学如何改变未来的健康。
                        </p>
                    </div>

                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-4 lg:gap-y-16">
                        {[
                            "科学严谨",
                            "温和表达",
                            "适老化阅读",
                            "可执行建议"
                        ].map((text, i) => (
                            <div key={i} className="flex flex-col items-center bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                <CheckCircle2 className="h-8 w-8 text-blue-500 mb-4" />
                                <span className="font-bold text-lg text-slate-900">{text}</span>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>

            {/* 🖐 Our Framework */}
            <div className="py-24 sm:py-32 bg-white">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center mb-12">
                        <h2 className="text-base font-semibold leading-7 text-blue-600">我们的框架</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            Finger5D 健康模型
                        </p>
                        <p className="mt-6 text-lg leading-8 text-slate-600">
                            Finger5D 是一个基于国际研究的五维健康框架，帮助你从全局理解衰老。
                            五维共同影响你的健康寿命，而不是单一因素。
                        </p>
                    </div>
                    <CategoryGrid />
                </div>
            </div>

            {/* 🔬 Scientific Fields */}
            <div className="py-24 sm:py-32 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.900),theme(colors.slate.900))] opacity-50" />
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center mb-16">
                        <Microscope className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            我们关注的科学领域
                        </h2>
                        <p className="mt-4 text-lg text-slate-300">
                            我们持续追踪全球衰老研究的最新进展，用最易懂的方式呈现给你。
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            "衰老细胞 (Senolytics)",
                            "端粒与表观遗传时钟",
                            "肌肉衰减 (Sarcopenia)",
                            "炎症衰老 (Inflammaging)",
                            "GLP‑1、mTOR、NAD+ 等机制",
                            "认知衰退与神经可塑性",
                            "营养干预与生活方式研究"
                        ].map((item, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center">
                                <div className="h-2 w-2 rounded-full bg-blue-400 mr-3"></div>
                                <span className="text-slate-200">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 📚 What We Provide & Values */}
            <div className="py-24 sm:py-32 bg-slate-50">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        {/* Provide */}
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Eye className="h-6 w-6 text-blue-600" />
                                我们提供什么
                            </h3>
                            <ul className="space-y-4">
                                {[
                                    "高质量的前沿科学解读",
                                    "五维健康指南",
                                    "适合 50+ 的生活方式建议",
                                    "轻量评估工具 (Assessment)",
                                    "可执行的每日行动建议",
                                    "温和、不焦虑的表达方式"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                                        <span className="text-slate-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-6 text-slate-600 italic">“你会在这里看到科学，也会看到生活。”</p>
                        </div>

                        {/* Values */}
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <ShieldCheck className="h-6 w-6 text-blue-600" />
                                我们的价值观
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { title: "尊重", desc: "尊重每个人的节奏与选择" },
                                    { title: "温和", desc: "不制造焦虑，不夸大研究" },
                                    { title: "真实", desc: "所有内容基于同行评审研究" },
                                    { title: "陪伴", desc: "让你在理解衰老的路上不再孤单" }
                                ].map((val, i) => (
                                    <div key={i} className="border-l-4 border-blue-200 pl-4 py-1">
                                        <div className="font-bold text-slate-900">{val.title}</div>
                                        <div className="text-slate-600">{val.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🌍 Why & Contact */}
            <div className="py-24 sm:py-32 bg-white text-center">
                <div className="mx-auto max-w-3xl px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">为什么我们做这件事</h2>
                    <p className="text-xl text-slate-600 mb-8">
                        “衰老不是终点，而是一个可以被理解、被管理、被改善的过程。<br />
                        科学正在改变我们对衰老的认知，而你值得拥有这些知识。”
                    </p>

                    <div className="mt-16 bg-slate-50 rounded-2xl p-8 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">联系我们</h3>
                        <p className="text-slate-600 mb-6">
                            如果你有任何建议、合作意向或想了解更多内容，欢迎随时与我们联系。
                        </p>
                        <a href="mailto:contact@finger5d.com" className="text-blue-600 font-semibold hover:underline">
                            contact@finger5d.com
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
