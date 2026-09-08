"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, RotateCw, Trash2, FileText, ChevronLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BottomDock, ProductHeader } from "@/components/echomere-chrome";

interface Profile {
  id: string;
  name: string | null;
  gender: string;
  birthDateTime: string;
  isPrimary: boolean;
  type: string;
}

interface Report {
  id: string;
  profileId: string;
  profileName: string;
  title: string;
  summary: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}

export default function DeepReportPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingProfileId, setGeneratingProfileId] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [pendingRegenerate, setPendingRegenerate] = useState<Report | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [regeneratingReportId, setRegeneratingReportId] = useState<string | null>(null);

  async function fetchData() {
    try {
      const [reportsRes, profilesRes] = await Promise.all([
        apiFetch("/reports"),
        apiFetch("/profiles"),
      ]);
      if (reportsRes.ok) setReports(await reportsRes.json());
      if (profilesRes.ok) setProfiles(await profilesRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = window.setInterval(fetchData, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const generateReport = async (profileId: string, minDelayMs = 1000) => {
    setGeneratingProfileId(profileId);
    try {
      const tasks: [Promise<Response>, Promise<unknown>?] = [
        apiFetch("/reports", {
          method: "POST",
          body: JSON.stringify({ profileId }),
        }),
      ];
      if (minDelayMs > 0) {
        tasks.push(new Promise((resolve) => window.setTimeout(resolve, minDelayMs)));
      }
      const [res] = await Promise.all(tasks);
      if (res.ok) {
        setShowCreateDialog(false);
        setSelectedProfileId(null);
        setPendingRegenerate(null);
        await fetchData();
      }
    } finally {
      setGeneratingProfileId(null);
    }
  };

  const deleteReport = async (id: string) => {
    setDeletingReportId(id);
    try {
      const res = await apiFetch(`/reports/${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
    } finally {
      setDeletingReportId(null);
    }
  };

  const handleCardClick = (report: Report) => {
    if (report.status === "pending") {
      window.alert("报告正在生成中，请生成后查看。");
      return;
    }
    if (report.status === "failed") {
      window.alert("报告生成失败，请尝试重新生成。");
      return;
    }
    router.push(`/daily-fortune/${report.id}`);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen product-page deep-report-page bg-stone-50">
      <ProductHeader />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium">深度报告</h1>
            <p className="text-sm text-stone-500">大运流年与五行分析，一览命运轨迹</p>
          </div>
          <Button size="sm" onClick={() => { setSelectedProfileId(null); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4" /> 新增报告
          </Button>
        </div>

        {reports.length === 0 ? (
          <div className="space-y-6">
            <p className="text-stone-500">当前还没有生成报告，请选择一个档案开始生成。</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-lg font-medium">{p.name || "未命名"}</h2>
                    <p className="text-xs text-stone-400 mt-1">
                      {p.gender === "male" ? "男" : p.gender === "female" ? "女" : "其他"}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      {new Date(p.birthDateTime).toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    size="sm"
                    disabled={generatingProfileId === p.id}
                    onClick={() => generateReport(p.id)}
                  >
                    {generatingProfileId === p.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {generatingProfileId === p.id ? "生成中" : "确认生成报告"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="report-card-interactive bg-white rounded-2xl border border-stone-100 p-5 shadow-sm relative group"
              >
                <button
                  type="button"
                  className="report-card-open w-full cursor-pointer text-left"
                  onClick={() => handleCardClick(report)}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium">{report.profileName || "未命名"}</h2>
                    {report.status === "pending" && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        生成中
                      </span>
                    )}
                    {report.status === "failed" && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                        失败
                      </span>
                    )}
                    {report.status === "completed" && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        已完成
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-600 mt-2 line-clamp-2">
                    {report.summary || "八字深度报告"}
                  </p>
                  <p className="text-xs text-stone-400 mt-3">
                    更新时间：{new Date(report.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </button>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-stone-50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={regeneratingReportId === report.id || generatingProfileId === report.profileId}
                    onClick={() => setPendingRegenerate(report)}
                  >
                    {regeneratingReportId === report.id || generatingProfileId === report.profileId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCw className="w-4 h-4" />
                    )}
                    {regeneratingReportId === report.id || generatingProfileId === report.profileId ? "生成中" : "重新生成"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="删除报告"
                    disabled={deletingReportId === report.id}
                    onClick={() => deleteReport(report.id)}
                  >
                    {deletingReportId === report.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-stone-400" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateDialog && (
        <div
          className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4"
          onClick={() => { setShowCreateDialog(false); setSelectedProfileId(null); }}
        >
          <div
            className="bg-white rounded-2xl border border-stone-100 p-6 shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-lg font-medium">生成深度报告</h2>
              {profiles.length > 0 && profiles.every((p) => reports.some((r) => r.profileId === p.id)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setSelectedProfileId(null);
                    router.push("/profiles");
                  }}
                >
                  去创建档案
                </Button>
              )}
            </div>
            <p className="text-sm text-stone-500 mb-4">选择一个档案，生成大运流年与五行分析报告。</p>
            <div className="space-y-3">
              {profiles.map((p) => {
                const hasReport = reports.some((r) => r.profileId === p.id);
                return (
                  <button
                    key={p.id}
                    className={`w-full text-left rounded-xl p-4 transition-colors ${
                      hasReport
                        ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                        : selectedProfileId === p.id
                        ? "ring-2 ring-stone-900 bg-stone-100"
                        : "bg-stone-50 hover:bg-stone-100"
                    }`}
                    disabled={hasReport}
                    onClick={() => !hasReport && setSelectedProfileId(p.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.name || "未命名"}</div>
                        <div className="text-xs text-stone-400 mt-1">
                          {new Date(p.birthDateTime).toLocaleString("zh-CN")}
                        </div>
                        {hasReport && (
                          <div className="text-xs text-stone-400 mt-1">已生成报告</div>
                        )}
                      </div>
                      {hasReport ? (
                        <span className="text-xs text-stone-400">不可选</span>
                      ) : selectedProfileId === p.id ? (
                        <span className="text-xs text-stone-900 font-medium">已选择</span>
                      ) : (
                        <Plus className="w-4 h-4 text-stone-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowCreateDialog(false); setSelectedProfileId(null); }}>
                <ChevronLeft className="w-4 h-4" /> 取消
              </Button>
              <Button
                disabled={!selectedProfileId || Boolean(generatingProfileId)}
                onClick={() => selectedProfileId && generateReport(selectedProfileId)}
              >
                {generatingProfileId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {generatingProfileId ? "生成中" : "确认"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingRegenerate && (
        <div
          className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4"
          onClick={() => setPendingRegenerate(null)}
        >
          <div
            className="bg-white rounded-2xl border border-stone-100 p-6 shadow-lg max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium mb-2">确认重新生成？</h2>
            <p className="text-sm text-stone-500 mb-4">
              重新生成会覆盖「{pendingRegenerate.profileName || "未命名"}」的现有报告。
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setPendingRegenerate(null)}>
                取消
              </Button>
              <Button
                disabled={regeneratingReportId === pendingRegenerate.id}
                onClick={() => {
                  setPendingRegenerate(null);
                  setRegeneratingReportId(pendingRegenerate.id);
                  window.setTimeout(() => {
                    setRegeneratingReportId(null);
                    generateReport(pendingRegenerate.profileId, 0);
                  }, 1000);
                }}
              >
                {regeneratingReportId === pendingRegenerate.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "确认"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomDock />
    </div>
  );
}
