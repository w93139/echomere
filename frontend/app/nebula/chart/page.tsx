"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BottomDock, ProductHeader } from "@/components/echomere-chrome";

interface Profile {
  primaryProfile?: {
    name?: string | null;
    birthDateTime?: string;
  };
  bazi: {
    year: string;
    month: string;
    day: string;
    hour: string;
    dayMaster: { gan: string; zhi: string; wuxing: string };
    genderLabel: string;
    wuxing: Record<string, number>;
  };
}

export default function NebulaChartPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d);
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

  if (!profile?.bazi) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <ProductHeader />
        <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-stone-500">需要先建立命盘档案</p>
          <Button className="mt-4" onClick={() => router.push("/onboarding?callbackUrl=/nebula/chart")}>
            创建命盘
          </Button>
        </main>
      </div>
    );
  }

  const bazi = profile.bazi;
  const wuxingEntries = Object.entries(bazi.wuxing).sort((a, b) => b[1] - a[1]);
  const pillars = [
    ["年柱", bazi.year],
    ["月柱", bazi.month],
    ["日柱", bazi.day],
    ["时柱", bazi.hour],
  ];
  const luckCycles = ["癸未", "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰"];
  const profileName = profile.primaryProfile?.name || "我的命盘";

  return (
    <div className="min-h-screen product-page chart-page bg-stone-50 text-white">
      <ProductHeader />

      <main className="chart-shell">
        <button className="chart-back" onClick={() => router.push("/profiles")}><ChevronLeft /> 返回档案</button>
        <header className="chart-intro">
          <h1>{profileName}</h1>
          <p>{profile.primaryProfile?.birthDateTime ? new Date(profile.primaryProfile.birthDateTime).toLocaleString("zh-CN", { hour12: false }) : "生命节律全景"}</p>
          <span>{bazi.dayMaster.gan} · {bazi.dayMaster.wuxing} · {bazi.genderLabel}</span>
        </header>

        <div className="chart-elements" aria-label="五行分布">
          {wuxingEntries.map(([wx, count]) => (
            <span key={wx} data-element={wx}>{wx} <b>{count}</b></span>
          ))}
        </div>

        <section className="bazi-table" aria-label="四柱命盘详情">
          <div className="bazi-table__labels"><span>十神</span><span>天干</span><span>地支</span><span>藏干</span><span>神煞</span><span>纳音</span><span>长生</span></div>
          {pillars.map(([label, value], index) => {
            const gan = value.slice(0, 1);
            const zhi = value.slice(1, 2);
            return (
              <div className="bazi-column" key={label}>
                <span className="bazi-column__label">{label}</span>
                <span>偏印</span>
                <strong data-pillar={index}>{gan}</strong>
                <strong data-pillar={index + 1}>{zhi}</strong>
                <small>{index % 2 ? "己土　癸水" : "丙火　庚金"}</small>
                <small className="auspice">天德贵人<br />月德合</small>
                <small>{index % 2 ? "涧下水" : "大林木"}</small>
                <small>{index % 2 ? "墓" : "长生"}</small>
              </div>
            );
          })}
        </section>

        <div className="palace-grid">
          <div><span>命宫</span><strong>丁亥</strong></div>
          <div><span>身宫</span><strong>癸未</strong></div>
          <div><span>胎元</span><strong>癸酉</strong></div>
        </div>

        <section className="luck-panel">
          <header><h2>大运</h2><p>顺行 · 8 岁起运</p></header>
          <div className="luck-row">
            {luckCycles.map((cycle, index) => (
              <div key={cycle} className={index === 1 ? "is-current" : ""}>
                <span>{8 + index * 10}–{17 + index * 10}岁</span>
                <strong>{cycle}</strong>
              </div>
            ))}
          </div>
        </section>
      </main>
      <BottomDock active="/profiles" />
    </div>
  );
}
