import Link from "next/link";
export default function AssessmentResultCard({ scores }: { scores: Record<string, number> }) {
    // Sort scores to find the lowest one. 
    // Object.entries returns [key, value]. Sort by value (a[1] - b[1]).
    const sortedScores = Object.entries(scores).sort((a, b) => a[1] - b[1]);
    const lowestEntry = sortedScores[0];
    const lowest = lowestEntry ? lowestEntry[0] : "cardio"; // Default fallback

    const feedbackMap: Record<string, string> = {
        cardio: "你的睡眠与代谢可能需要更多关注。",
        physical: "你的身体活动量偏低，可以从小步开始。",
        cognitive: "你的认知状态可能受到压力或疲劳影响。",
        nutrition: "你的饮食结构可能需要更多蔬果与蛋白质。",
        social: "你的社交与情绪能量可能偏低。",
    };

    const actionMap: Record<string, string[]> = {
        cardio: ["睡前减少电子设备", "保持固定睡眠时间"],
        physical: ["每天步行 10 分钟", "每周 2 次力量训练"],
        cognitive: ["每天阅读 10 分钟", "做 3 分钟深呼吸"],
        nutrition: ["每餐加入一份蛋白质", "每天吃 1 份深色蔬菜"],
        social: ["每周与朋友通话一次", "参加一个兴趣小组"],
    };

    return (
        <div className="p-6 border rounded-xl bg-slate-50 border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900">
                你的最弱维度：<span className="capitalize text-blue-600">{lowest}</span>
            </h2>

            <p className="mt-3 text-lg text-slate-700">{feedbackMap[lowest]}</p>

            <h3 className="mt-6 text-xl font-semibold text-slate-900">今日行动建议</h3>
            <ul className="mt-3 list-disc pl-6 text-slate-700 text-lg space-y-1">
                {actionMap[lowest]?.map((a) => (
                    <li key={a}>{a}</li>
                ))}
            </ul>

            <h3 className="mt-6 text-xl font-semibold text-slate-900">推荐阅读</h3>
            <ul className="mt-3 list-disc pl-6 text-slate-700 text-lg">
                <li>
                    <Link href="/articles" className="text-blue-600 underline hover:text-blue-800 transition-colors">
                        查看相关文章
                    </Link>
                </li>
            </ul>
        </div>
    );
}
