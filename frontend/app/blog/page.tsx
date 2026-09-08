"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sparkles } from "lucide-react";

export default function BlogPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold">ECHOMERE 博客</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 bg-white min-h-full">
          <div className="text-xs text-stone-400 mb-3">2026-08-23</div>
          <h1 className="text-3xl font-light tracking-tight mb-6">
            欢迎来到 ECHOMERE
          </h1>
          <div className="prose prose-stone max-w-none">
            <p className="text-stone-600 leading-relaxed mb-4">
              ECHOMERE（洄映）是一款把传统命理智慧与现代 AI 结合的产品。我们相信，命盘不是宿命，而是一张关于自己的地图：它提示你当下的能量场、可能遇到的节点，以及更适合的行动方向。
            </p>
            <p className="text-stone-600 leading-relaxed mb-4">
              在这里，你可以通过八字看到日主与五行的分布，通过流年看到当前年份对你的影响，也可以通过一次倾诉或一事一问，把模糊的感受变成可落地的建议。
            </p>
            <p className="text-stone-600 leading-relaxed mb-4">
              目前产品处于 MVP 测试期，所有核心解读功能均免费开放。我们正在持续迭代 Prompt、命理算法与可视化效果，欢迎你随时提出反馈。
            </p>
            <p className="text-stone-600 leading-relaxed">
              愿你在洄映里，看见自己，也看见下一步。
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
