"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssessmentForm() {
    const router = useRouter();

    const [answers, setAnswers] = useState<Record<string, string>>({
        cardio: "",
        physical: "",
        cognitive: "",
        nutrition: "",
        social: "",
    });

    const questions = [
        {
            key: "cardio",
            label: "过去两周，你的睡眠质量如何？",
        },
        {
            key: "physical",
            label: "你每周运动几天？",
        },
        {
            key: "cognitive",
            label: "你是否经常忘记刚发生的事情？",
        },
        {
            key: "nutrition",
            label: "你每天是否吃至少 1 份蔬果？",
        },
        {
            key: "social",
            label: "你每周是否与朋友或家人交流？",
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const params = new URLSearchParams();

        Object.entries(answers).forEach(([key, value]) => {
            params.set(key, value || "0");
        });

        router.push(`/assessment/result?${params.toString()}`);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {questions.map((q) => (
                <div key={q.key} className="p-6 border border-slate-200 rounded-xl bg-slate-50">
                    <label className="text-lg font-medium text-slate-900">
                        {q.label}
                    </label>

                    <select
                        className="mt-3 w-full p-3 border border-slate-300 rounded-lg text-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={answers[q.key]}
                        onChange={(e) =>
                            setAnswers({ ...answers, [q.key]: e.target.value })
                        }
                        required
                    >
                        <option value="">请选择</option>
                        <option value="1">很少 / 几乎没有</option>
                        <option value="2">偶尔</option>
                        <option value="3">有时</option>
                        <option value="4">经常</option>
                        <option value="5">总是 / 每天</option>
                    </select>
                </div>
            ))}

            <button
                type="submit"
                className="w-full py-4 text-xl font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-colors"
            >
                查看评估结果
            </button>
        </form>
    );
}
