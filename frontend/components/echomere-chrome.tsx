"use client";

import { usePathname } from "next/navigation";
import { CalendarDays, Compass, CreditCard, MessageCircle, UserRound } from "lucide-react";

export function EchoMark() {
  return <span className="echo-brand__mark" role="img" aria-label="洄映标志" />;
}

export function BrandLockup({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <a className={`echo-brand${compact ? " echo-brand--compact" : ""}`} href={href} aria-label="EchoMere 洄映首页">
      <span className="echo-brand__row">
        <EchoMark />
        <strong>EchoMere</strong>
        <span className="echo-brand__divider" aria-hidden="true" />
        <em>洄映</em>
      </span>
      <small>ECHO · WATER · MERE</small>
    </a>
  );
}

export function ProductHeader({ action }: { action?: React.ReactNode }) {
  return (
    <header className="product-header">
      <BrandLockup />
      {action && <div className="product-header__action">{action}</div>}
    </header>
  );
}

const items = [
  { href: "/chat", label: "对话", icon: MessageCircle },
  { href: "/profiles", label: "档案", icon: UserRound },
  { href: "/daily-fortune", label: "深度报告", icon: CalendarDays },
  { href: "/fortune-systems", label: "占测", icon: Compass },
  { href: "/subscription", label: "订阅", icon: CreditCard },
];

export function BottomDock({ active }: { active?: string }) {
  const pathname = usePathname();
  return (
    <nav className="bottom-dock" aria-label="主要功能">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = active ? active === item.href : pathname.startsWith(item.href);
        return (
          <a key={item.href} href={item.href} className={selected ? "is-active" : ""} aria-current={selected ? "page" : undefined} aria-label={item.label}>
            <Icon aria-hidden="true" strokeWidth={1.45} />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
