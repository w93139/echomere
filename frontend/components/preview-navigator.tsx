"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, X } from "lucide-react";
import { isFrontendPreview } from "@/lib/api";

const pages = [
  ["首页", "/"],
  ["AI 对话", "/chat"],
  ["新用户引导", "/onboarding"],
  ["人生星云图", "/nebula"],
  ["命盘校准", "/nebula/confirm"],
  ["命盘详情", "/nebula/chart"],
  ["命运档案", "/profiles"],
  ["深度报告", "/daily-fortune"],
  ["订阅方案", "/subscription"],
  ["设置", "/settings"],
  ["博客", "/blog"],
] as const;

export function PreviewNavigator() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!isFrontendPreview()) return null;

  return (
    <aside className={`preview-nav ${open ? "is-open" : ""}`} aria-label="本地页面预览">
      <button className="preview-nav__toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? <X /> : <LayoutGrid />}
        <span>{open ? "收起" : "页面预览"}</span>
      </button>
      {open && (
        <nav>
          <p>LOCAL UI PREVIEW</p>
          {pages.map(([label, href]) => (
            <a key={href} href={href} className={pathname === href ? "is-active" : ""} onClick={() => setOpen(false)}>
              <span>{label}</span><small>{href}</small>
            </a>
          ))}
        </nav>
      )}
    </aside>
  );
}
