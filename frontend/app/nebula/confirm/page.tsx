"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ProfileData {
  primaryProfile?: {
    birthDateTime: string;
    birthLocation?: string;
    baziPillar?: string;
  } | null;
  bazi?: {
    year: string;
    month: string;
    day: string;
    hour: string;
    dayMaster: { gan: string; zhi: string; wuxing: string };
    genderLabel: string;
    wuxing: Record<string, number>;
    lunarDate: { year: string; month: string; day: string };
    bodyStrength: "强" | "弱" | "中和";
    xiYongShen: { xi: string[]; ji: string[] };
  } | null;
}

export default function NebulaConfirmPage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalibration, setShowCalibration] = useState(false);

  useEffect(() => {
    apiFetch("/profile")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!data?.bazi || !data?.primaryProfile) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <header className="bg-white border-b border-stone-100">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/nebula")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="font-medium">确认八字信息</span>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-stone-500">需要先建立命盘档案</p>
          <Button className="mt-4" onClick={() => router.push("/onboarding?callbackUrl=/nebula/confirm")}>
            创建命盘
          </Button>
        </main>
      </div>
    );
  }

  const bazi = data.bazi;
  const profile = data.primaryProfile;
  const birth = new Date(profile.birthDateTime);
  const formatDate = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/nebula")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">确认八字信息</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        <p className="text-sm text-stone-500 text-center">
          请核对以下信息是否准确。时辰的准确性对预测结果影响较大。
        </p>

        <div className="bg-white rounded-2xl border border-stone-100 p-6 text-center space-y-2">
          <div className="text-3xl tracking-widest font-medium">
            {bazi.year} · {bazi.month} · {bazi.day} · {bazi.hour}
          </div>
          <div className="text-sm text-stone-500">
            日主：{bazi.dayMaster.gan}{bazi.dayMaster.zhi}（{bazi.dayMaster.wuxing}） · {bazi.genderLabel}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-stone-400 text-xs mb-1">出生日期</div>
              <div className="font-medium">{formatDate(birth)}</div>
            </div>
            <div>
              <div className="text-stone-400 text-xs mb-1">出生时辰</div>
              <div className="font-medium">{formatTime(birth)}</div>
            </div>
            <div>
              <div className="text-stone-400 text-xs mb-1">出生地点</div>
              <div className="font-medium">{profile.birthLocation || "未填写"}</div>
            </div>
            <div>
              <div className="text-stone-400 text-xs mb-1">农历主日</div>
              <div className="font-medium">
                {bazi.lunarDate.year} {bazi.lunarDate.month}月 {bazi.lunarDate.day}
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-xs mb-1">身强弱</div>
              <div className="font-medium">{bazi.bodyStrength}</div>
            </div>
            <div>
              <div className="text-stone-400 text-xs mb-1">喜神 / 忌神</div>
              <div className="font-medium">
                喜{bazi.xiYongShen.xi.join("、")} / 忌{bazi.xiYongShen.ji.join("、")}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setShowCalibration(!showCalibration)}
            className="text-sm text-stone-400 hover:text-stone-600 underline decoration-stone-300 underline-offset-4"
          >
            是否需要校准
          </button>
        </div>

        {showCalibration && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => router.push("/onboarding?callbackUrl=/nebula/confirm")}
              className="bg-white rounded-xl border border-stone-200 p-4 text-center hover:border-stone-400 transition-colors"
            >
              <div className="font-medium mb-1">校准时辰</div>
              <div className="text-xs text-stone-400">重新确认出生时间</div>
            </button>
            <button
              onClick={() => router.push("/profiles")}
              className="bg-white rounded-xl border border-stone-200 p-4 text-center hover:border-stone-400 transition-colors"
            >
              <div className="font-medium mb-1">修改喜用神</div>
              <div className="text-xs text-stone-400">前往命运档案调整</div>
            </button>
          </div>
        )}

        <Button className="w-full" size="lg" onClick={() => router.push("/nebula/chart")}>
          确认无误生成星云图
        </Button>
      </main>
    </div>
  );
}
