import AssessmentResultCard from "@/components/AssessmentResultCard";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function parseScore(value: string | string[] | undefined): number {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
        return 0;
    }
    return Math.max(0, Math.min(5, parsed));
}

export default async function AssessmentResultPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const scores = {
        cardio: parseScore(params.cardio),
        physical: parseScore(params.physical),
        cognitive: parseScore(params.cognitive),
        nutrition: parseScore(params.nutrition),
        social: parseScore(params.social),
    };

    return (
        <div className="max-w-3xl mx-auto px-6 py-16 bg-white min-h-screen">
            <h1 className="text-3xl font-bold text-slate-900 text-center">
                你的五维健康结果
            </h1>

            <p className="mt-4 text-lg text-slate-700 text-center leading-relaxed">
                以下结果基于你的回答自动生成，仅用于自我了解。
            </p>

            <div className="mt-10 space-y-6">
                <AssessmentResultCard scores={scores} />
            </div>
        </div>
    );
}
