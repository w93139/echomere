"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BottomDock, ProductHeader } from "@/components/echomere-chrome";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  cta: string;
  popular: boolean;
}

export default function SubscriptionPage() {
  const [data, setData] = useState<{ currentPlan: string; used: number; limit: number | null; plans: Plan[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/subscription")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const subscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const res = await apiFetch("/subscription", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });

      if (res.ok) {
        setData((current) => current ? { ...current, currentPlan: planId } : current);
      }
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen product-page subscription-page bg-stone-50">
      <ProductHeader />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-medium mb-2">选择适合你的方案</h1>
          <p className="text-stone-500 text-sm">
            MVP 测试期所有方案均免费开放，点击即可切换（不扣费）
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            当前已用解读次数：{data?.used || 0} 次
          </div>
        </div>

        <div className="subscription-plan-grid grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.plans.map((plan) => (
            <div
              key={plan.id}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              aria-current={data?.currentPlan === plan.id ? "true" : undefined}
              className={`subscription-plan-card${data?.currentPlan === plan.id ? " is-current" : ""}${hoveredPlan === plan.id ? " is-hovered" : hoveredPlan ? " is-not-hovered" : ""} bg-white rounded-2xl border border-stone-100 p-6 shadow-sm flex flex-col`}
            >
              <h2 className="text-lg font-medium">{plan.name}</h2>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-medium">{plan.price === 0 ? "免费" : `¥${(plan.price / 100).toFixed(0)}`}</span>
                {plan.price > 0 && <span className="text-stone-400 text-sm">/{plan.period}</span>}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={data?.currentPlan === plan.id ? "outline" : "default"}
                disabled={subscribing === plan.id || data?.currentPlan === plan.id}
                onClick={() => subscribe(plan.id)}
                className="w-full"
              >
                {subscribing === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : data?.currentPlan === plan.id ? "当前方案" : plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-white rounded-2xl border border-stone-100 p-6">
          <h2 className="font-medium mb-2">计费说明</h2>
          <ul className="text-sm text-stone-500 space-y-1 list-disc list-inside">
            <li>测试期不限制调用次数，便于快速迭代 Prompt 与产品体验</li>
            <li>一次完整解读计一次（追问不计入）</li>
            <li>幂等键防止重复扣费（正式商业化后启用）</li>
            <li>优先为西方星盘、真人 1v1、更高额度等增值服务设计付费点</li>
          </ul>
        </div>
      </main>
      <BottomDock />
    </div>
  );
}
