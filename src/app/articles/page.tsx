import { ArticleList } from "@/components/ArticleList";

export const metadata = {
    title: "所有文章 - Finger5D",
    description: "浏览 Finger5D 发布的最新抗衰老科普文章，涵盖心血管、运动、认知、饮食与社交五大维度。",
};

export default function ArticlesIndex() {
    return (
        <div className="bg-slate-50 py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        科普文章库
                    </h2>
                    <p className="mt-2 text-lg leading-8 text-slate-600">
                        严谨、易读、前沿的抗衰老知识库。
                    </p>
                </div>
                <ArticleList />
            </div>
        </div>
    );
}
