"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, MessageCircleMore } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ProductHeader } from "@/components/echomere-chrome";

interface WuxingAnalysis {
  scores: Record<string, number>;
  ranking: Array<{ element: string; score: number }>;
  dayMasterElement: string;
  bodyStrength: string;
  xiYongShen: { xi: string[]; ji: string[] };
  overview: string;
  dayMasterAnalysis: string;
  detail: string;
}

interface DayunItem {
  干支?: string;
  十神?: string;
  起运年份?: number;
  起运年龄?: number;
  index?: number;
  relation?: string;
  rating?: string;
  comprehensive?: string;
}

interface ReportContent {
  dayun?: {
    summary?: string;
    startInfo?: { 起运年龄?: number; 起运详情?: string };
    list?: DayunItem[];
  };
  wuxingAnalysis?: WuxingAnalysis;
}

interface ReportDetail {
  id: string;
  profileId: string;
  profileName: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  content?: ReportContent;
}

function renderMultiline(text?: string) {
  if (!text) return null;
  return text.split("\n").map((line, i) => (
    <p key={i} className={line.startsWith("▸") || line.startsWith("  •") ? "pl-2" : ""}>
      {line}
    </p>
  ));
}

export default function DeepReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/reports/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setReport(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <ProductHeader />
        <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-stone-500">报告不存在或无法访问</p>
          <Button className="mt-4" onClick={() => router.push("/daily-fortune")}>
            返回深度报告首页
          </Button>
        </main>
      </div>
    );
  }

  const content = report.content;
  const wuxing = content?.wuxingAnalysis;
  const dayun = content?.dayun;
  const dayunList = dayun?.list || [];

  return (
    <div className="min-h-screen product-page deep-report-detail-page bg-stone-50">
      <ProductHeader />

      <main className="deep-report-detail-shell">
        <header className="deep-report-detail-hero">
          <button
            type="button"
            className="deep-report-back"
            onClick={() => router.push("/daily-fortune")}
            aria-label="返回深度报告列表"
          >
            <ChevronLeft />
            <span>返回报告</span>
          </button>
          <div className="deep-report-title-block">
            <p className="deep-report-eyebrow">PERSONAL DESTINY REPORT</p>
            <h1>{report.title || "八字深度报告"}</h1>
            <p className="deep-report-meta">
              {report.profileName || "未命名"}<span aria-hidden="true">·</span>
              更新于 {new Date(report.updatedAt).toLocaleString("zh-CN")}
            </p>
          </div>
          {content && (
            <Button
              className="deep-report-interpret"
              onClick={() => router.push(`/chat?reportId=${encodeURIComponent(report.id)}`)}
            >
              <MessageCircleMore />
              帮我解读
            </Button>
          )}
        </header>

        <div className="deep-report-content-grid">
          {wuxing && (
            <section className="deep-report-section">
              <div className="deep-report-section-heading">
                <span>01</span>
                <div><p>ELEMENT BALANCE</p><h2>五行分析</h2></div>
              </div>
              <div className="deep-report-elements">
                {wuxing.ranking?.map((item) => (
                  <div
                    key={item.element}
                    className="deep-report-element"
                  >
                    <strong>{item.element}</strong>
                    <span>{item.score}</span>
                  </div>
                ))}
              </div>

              <div className="deep-report-prose-groups">
                <div className="deep-report-prose-group">
                  <h3>命局概览</h3>
                  <p>{wuxing.overview}</p>
                </div>

                <div className="deep-report-prose-group">
                  <h3>日主分析</h3>
                  <p className="whitespace-pre-line">{wuxing.dayMasterAnalysis}</p>
                </div>

                <div className="deep-report-prose-group">
                  <h3>五行详解</h3>
                  <div className="deep-report-multiline">{renderMultiline(wuxing.detail)}</div>
                </div>

                <div className="deep-report-xiyong-grid">
                  <div>
                    <h3>喜用神</h3>
                    <p>{wuxing.xiYongShen?.xi?.join("、") || "—"}</p>
                  </div>
                  <div>
                    <h3>忌神</h3>
                    <p>{wuxing.xiYongShen?.ji?.join("、") || "—"}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {dayun && (
            <section className="deep-report-section">
              <div className="deep-report-section-heading">
                <span>02</span>
                <div><p>LIFE CYCLES</p><h2>大运流年</h2></div>
              </div>
              <p className="deep-report-section-intro">{dayun.summary}</p>
              {dayun.startInfo?.起运年龄 !== undefined && (
                <p className="deep-report-start-info">
                  起运年龄：{dayun.startInfo.起运年龄} 岁
                  {dayun.startInfo.起运详情 ? ` · ${dayun.startInfo.起运详情}` : ""}
                </p>
              )}

              {dayunList.length > 0 && (
                <div className="deep-report-dayun-list">
                  {dayunList.map((item, index) => (
                    <div
                      key={index}
                      className="deep-report-dayun-item"
                    >
                      <div className="deep-report-dayun-heading">
                        <h3>
                          第{item.index || index + 1}步大运 · {item.干支 || "—"}
                          {item.十神 && (
                            <span>{item.十神}</span>
                          )}
                        </h3>
                        <p>
                          {item.rating && <span className="mr-2">{item.rating}等运</span>}
                          {item.起运年份 !== undefined && `${item.起运年份} 年起`}
                          {item.起运年龄 !== undefined && ` · ${item.起运年龄} 岁`}
                        </p>
                      </div>
                      {item.relation && (
                        <p className="deep-report-dayun-relation">
                          {item.relation}
                        </p>
                      )}
                      {item.comprehensive && (
                        <p className="deep-report-dayun-copy">
                          {item.comprehensive}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {!content && (
          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm text-center">
            <p className="text-stone-500">报告内容为空或尚未生成完成。</p>
          </div>
        )}
      </main>
    </div>
  );
}
