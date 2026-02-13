import { ArticleList } from "@/components/ArticleList";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ArrowRight, CheckCircle2, Microscope, Activity } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-white">
      {/* 🌟 Hero Section */}
      {/* 🌟 Hero Section */}
      <section className="relative isolate overflow-hidden bg-slate-50 pt-14 lg:pt-0">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2 lg:items-center">
            <div className="w-full max-w-xl lg:shrink-0 xl:max-w-2xl pt-24 pb-24 sm:pb-32 lg:pt-40">
              <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl text-balance">
                探索生命延长的<span className="text-blue-600 block mt-2">科学边界</span>
              </h1>
              <p className="mt-8 text-xl leading-relaxed text-slate-600 sm:max-w-md lg:max-w-none text-balance">
                为 50+ 人群打造的前沿衰老科学平台。
                <br />
                以芬格健康模型 (Finger5D) 为框架，让复杂研究变得易懂、可信、可实践。
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Link
                  href="/articles"
                  className="rounded-full bg-blue-600 px-8 py-3.5 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all hover:-translate-y-0.5"
                >
                  开始阅读
                </Link>
                <Link
                  href="/assessment"
                  className="group rounded-full px-8 py-3.5 text-lg font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center gap-2"
                >
                  5 题轻量评估 <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
            <div className="mx-auto w-full max-w-md lg:max-w-full lg:flex-auto lg:py-32 lg:text-right relative">
              {/* Hero Illustration */}
              <div className="relative aspect-square w-full max-w-lg mx-auto lg:ml-auto rounded-full flex items-center justify-center">
                <Image
                  src="/images/hero-scientific-abstract.jpeg"
                  alt="Finger5D Science Illustration"
                  width={800}
                  height={800}
                  priority
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-white sm:h-32" />
      </section>

      {/* 🧠 Section 1: Value Proposition */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              让学术突破触手可及
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Finger5D 汇集全球衰老科学 (Geroscience) 的最新进展，从细胞衰老到生活方式干预，用清晰、温和、适合 50+ 的方式呈现给你。
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  科学严谨
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p>基于国际研究与同行评审文献，拒绝伪科学与夸大宣传。</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  适老化阅读
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p>大字号、高对比度、简洁结构，专为成熟视力设计。</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  五维框架
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p>从身体到大脑，从饮食到社交，全方位管理衰老进程。</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  可执行建议
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p>理论结合实践，提供每天都能做到的小改变。</p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* 🖐 Section 2: Finger5D Model */}
      <section className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              从五个维度理解衰老
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              找到属于你的改善路径
            </p>
          </div>
          <CategoryGrid />
          <div className="mt-12 text-center">
            <Link
              href="/category/cardio"
              className="text-base font-semibold leading-7 text-blue-600 hover:text-blue-500"
            >
              浏览五维内容 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 🔬 Section 3: Geroscience Frontiers */}
      <section className="py-24 sm:py-32 bg-slate-900 text-white relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.900),theme(colors.slate.900))] opacity-50" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Geroscience Frontiers</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              全球衰老研究的最新突破
            </p>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              用最易懂的方式呈现给你
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
              {[
                { title: "端粒与表观遗传", desc: "探索细胞寿命的'时钟'与调控机制" },
                { title: "衰老细胞 (Senolytics)", desc: "清除体内的'僵尸细胞'以恢复活力" },
                { title: "肌肉衰减 (Sarcopenia)", desc: "维持肌肉质量，保持独立生活的关键" },
                { title: "炎症衰老 (Inflammaging)", desc: "慢性低度炎症如何加速全身衰老" },
              ].map((item) => (
                <div key={item.title} className="flex flex-col bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                    <Microscope className="h-5 w-5 text-blue-400" />
                    {item.title}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-400">
                    <p>{item.desc}</p>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-16 flex justify-center">
              <Link
                href="/frontiers"
                className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
              >
                查看最新研究
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 📝 Section 4: Assessment */}
      <section className="py-24 sm:py-32 bg-blue-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">轻量评估</h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              用 5 个问题，快速了解你的五维健康状态。
              <br />
              <span className="text-sm font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 mt-2 inline-block">
                不需要注册 · 不记录隐私 · 全程本地计算
              </span>
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl lg:mx-0 lg:max-w-none">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-3">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-lg font-semibold text-slate-900 mb-2">你将获得</div>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> 五维一句话反馈</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> 今日行动建议 (1-2条)</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> 推荐阅读内容</li>
                </ul>
                <div className="mt-8">
                  <Link
                    href="/assessment"
                    className="block w-full rounded-md bg-slate-900 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-colors"
                  >
                    开始评估
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📚 Section 5: Latest Articles */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">最新文章</h2>
            <p className="mt-2 text-lg leading-8 text-slate-600">
              获取前沿资讯，掌握抗衰老主动权。
            </p>
          </div>
          <ArticleList />
        </div>
      </section>

      {/* 🌱 Section 6: About */}
      <section className="relative isolate overflow-hidden bg-slate-900 py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
            <div className="max-w-xl lg:max-w-lg">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">我们的理念</h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Finger5D 由一群关注衰老科学、关心 50+ 人群生活质量的研究者与设计者共同打造。
              </p>
              <div className="mt-6 flex flex-col gap-x-8 gap-y-20 lg:flex-row">
                <blockquote className="text-xl font-semibold leading-8 text-white border-l-4 border-blue-500 pl-4">
                  <p>“科学应该温和、可读、可用。每个人都值得拥有更长的健康寿命 (Healthspan)。”</p>
                </blockquote>
              </div>
              <div className="mt-10 flex">
                <Link
                  href="/about"
                  className="text-sm font-semibold leading-6 text-blue-400 hover:text-blue-300"
                >
                  了解更多 <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
            {/* Image placeholder or decorative element */}
            <div className="flex items-center justify-center lg:justify-end">
              <Activity className="w-48 h-48 text-white/10" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
