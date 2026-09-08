"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Orbit, Star, FileText, RefreshCw, History } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BottomDock, ProductHeader } from "@/components/echomere-chrome";

export default function NebulaEntryPage() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch("/profile")
      .then((r) => r.json())
      .then((d) => setHasProfile(!!d?.primaryProfile));
  }, []);

  if (hasProfile === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen product-page nebula-page bg-stone-50 flex flex-col">
      <ProductHeader />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-light tracking-tight">选择你的命理视图</h1>
          <p className="text-stone-500">从东方八字到西方星盘，多维度看见自己的人生地图</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* 八字命理 */}
          <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center">
                <Orbit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-medium">八字命理</h2>
                <p className="text-xs text-stone-400">基于出生年月日时的东方命理</p>
              </div>
            </div>

            {hasProfile ? (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => router.push("/nebula/chart")}
                >
                  <Star className="w-4 h-4" /> 查看星云图
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => router.push("/nebula/confirm")}
                >
                  <RefreshCw className="w-4 h-4" /> 重新绘制
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => router.push("/profiles")}
                >
                  <History className="w-4 h-4" /> 历史报告
                </Button>
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={() => router.push("/onboarding?callbackUrl=/nebula")}
              >
                创建命盘
              </Button>
            )}
          </div>

          {/* 西方星盘 */}
          <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-medium">西方星盘</h2>
                <p className="text-xs text-stone-400">基于出生地点与时刻的占星解读</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-4 text-center">
              <p className="text-sm text-stone-500">敬请期待</p>
              <p className="text-xs text-stone-400 mt-1">我们正在接入西方占星计算引擎</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-stone-400 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">关于人生星云图</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                人生星云图把八字五行、大运流年与关键年份以可视化的方式呈现，帮助你直观理解自己的能量分布与人生节奏。当前已免费开放八字命理基础视图。
              </p>
            </div>
          </div>
        </div>
      </main>
      <BottomDock active="/profiles" />
    </div>
  );
}
