"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCent, Coins, Compass, Flower2, MoonStar, Sparkles } from "lucide-react";
import { BottomDock, ProductHeader } from "@/components/echomere-chrome";

const systems = [
  { name: "塔罗占卜", detail: "西方神秘学 · 牌阵解读", icon: Sparkles },
  { name: "梅花易数", detail: "心易占卜 · 象数推演", icon: Flower2 },
  { name: "六爻占卦", detail: "周易正宗 · 铜钱起卦", icon: Coins },
  { name: "奇门遁甲", detail: "三式之首 · 时空玄机", icon: Compass },
  { name: "风水测算", detail: "堪舆之术 · 环境能量", icon: BadgeCent },
  { name: "占星运势", detail: "西方占星 · 星座命盘", icon: MoonStar },
];

const WHEEL_CYCLES = 5;
const INITIAL_ENTRY_INDEX = systems.length * 2;
const WHEEL_ITEM_HEIGHT = 104;
const wheelEntries = Array.from({ length: systems.length * WHEEL_CYCLES }, (_, entryIndex) => ({
  entryIndex,
  system: systems[entryIndex % systems.length],
}));

export default function FortuneSystemsPage() {
  const [activeEntryIndex, setActiveEntryIndex] = useState(INITIAL_ENTRY_INDEX);
  const wheelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedSystem = systems[activeEntryIndex % systems.length];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const wheel = wheelRef.current;
      const item = itemRefs.current[INITIAL_ENTRY_INDEX];
      if (!wheel || !item) return;
      wheel.scrollTop = item.offsetTop - (wheel.clientHeight - item.offsetHeight) / 2;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const centerItem = (entryIndex: number) => {
    const wheel = wheelRef.current;
    const item = itemRefs.current[entryIndex];
    if (!wheel || !item) return;
    setActiveEntryIndex(entryIndex);
    wheel.scrollTo({ top: item.offsetTop - (wheel.clientHeight - item.offsetHeight) / 2, behavior: "smooth" });
  };

  const updateSelectionFromScroll = () => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const center = wheel.getBoundingClientRect().top + wheel.clientHeight / 2;
    let closestIndex = activeEntryIndex;
    let closestDistance = Number.POSITIVE_INFINITY;
    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const rect = item.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    const cycleHeight = systems.length * WHEEL_ITEM_HEIGHT;
    let normalizedIndex = closestIndex;

    if (closestIndex < systems.length) {
      wheel.scrollTop += cycleHeight * 2;
      normalizedIndex += systems.length * 2;
    } else if (closestIndex >= systems.length * (WHEEL_CYCLES - 1)) {
      wheel.scrollTop -= cycleHeight * 2;
      normalizedIndex -= systems.length * 2;
    }

    if (normalizedIndex !== activeEntryIndex) setActiveEntryIndex(normalizedIndex);
  };

  return (
    <div className="fortune-systems-page product-page min-h-screen bg-stone-50">
      <ProductHeader action={<span className="fortune-systems-date">今日观象</span>} />
      <main>
        <header className="fortune-systems-heading">
          <p>DESTINY SYSTEMS</p>
          <h1>选择你的运势系统</h1>
          <span>上下滚动，让此刻需要的体系停在中央。</span>
        </header>

        <section className="fortune-wheel-shell" aria-label="运势系统滚动选择器">
          <div className="fortune-system-wheel" ref={wheelRef} onScroll={updateSelectionFromScroll} tabIndex={0} aria-label="上下滚动选择运势系统">
            <div className="fortune-wheel-spacer" aria-hidden="true" />
            {wheelEntries.map(({ system, entryIndex }) => {
              const Icon = system.icon;
              const distance = Math.abs(entryIndex - activeEntryIndex);
              const opacity = Math.max(0.18, 1 - distance * 0.28);
              const scale = entryIndex === activeEntryIndex ? 1 : Math.max(0.9, 0.97 - distance * 0.02);
              return (
                <button
                  className={`fortune-wheel-item${entryIndex === activeEntryIndex ? " is-selected" : ""}`}
                  key={`${system.name}-${entryIndex}`}
                  ref={(element) => { itemRefs.current[entryIndex] = element; }}
                  type="button"
                  aria-pressed={entryIndex === activeEntryIndex}
                  onClick={() => centerItem(entryIndex)}
                  style={{ opacity, transform: `scale(${scale})` }}
                >
                  <span className="fortune-wheel-icon"><Icon aria-hidden="true" /></span>
                  <span className="fortune-wheel-copy">
                    <strong>{system.name}</strong>
                    {!system.available && <em>即将推出</em>}
                    <small>{system.detail}</small>
                  </span>
                </button>
              );
            })}
            <div className="fortune-wheel-spacer" aria-hidden="true" />
          </div>
          <div className="fortune-wheel-focus" aria-hidden="true" />
        </section>

        {selectedSystem.available ? (
          <Link className="fortune-system-cta" href="/daily-fortune">生成深度报告 <span aria-hidden="true">↗</span></Link>
        ) : (
          <button className="fortune-system-cta is-disabled" type="button" disabled>{selectedSystem.name} · 即将推出</button>
        )}
      </main>
      <BottomDock active="/fortune-systems" />
    </div>
  );
}
