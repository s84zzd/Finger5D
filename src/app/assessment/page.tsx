import AssessmentForm from "@/components/AssessmentForm";

export const metadata = {
    title: "五维轻量评估 - Finger5D",
    description: "通过 5 个问题快速了解你的五维健康状态。",
};

export default function AssessmentPage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-16 bg-white min-h-screen">
            <h1 className="text-3xl font-bold text-slate-900 text-center">
                五维轻量评估（5 Questions）
            </h1>

            <p className="mt-4 text-lg text-slate-700 text-center leading-relaxed">
                不记录隐私，全程本地计算。
                <br />
                通过 5 个问题快速了解你的五维健康状态。
            </p>

            <div className="mt-10">
                <AssessmentForm />
            </div>
        </div>
    );
}
