"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Star, Trash2, Loader2, Orbit } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BottomDock, ProductHeader } from "@/components/echomere-chrome";

interface Profile {
  id: string;
  name: string | null;
  gender: string;
  birthDateTime: string;
  isPrimary: boolean;
  baziPillar: string;
  type: string;
}

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProfileId, setNewProfileId] = useState<string | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [selectingProfileId, setSelectingProfileId] = useState<string | null>(null);
  const [pendingDeleteProfile, setPendingDeleteProfile] = useState<Profile | null>(null);

  async function fetchProfiles() {
    const res = await apiFetch("/profiles");
    if (res.ok) {
      const data = await res.json();
      setProfiles(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const createdId = params.get("newProfile");
    let active = true;
    let timer: number | undefined;
    // Data is loaded asynchronously; state changes occur after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfiles().then(() => {
      if (!active || !createdId) return;
      setNewProfileId(createdId);
      timer = window.setTimeout(() => setNewProfileId(null), 3200);
    });

    if (createdId) {
      params.delete("newProfile");
      const cleanSearch = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ""}${window.location.hash}`);
    }

    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const selectProfile = async (id: string, openBazi = false) => {
    if (selectingProfileId || deletingProfileId) return;

    const selected = profiles.find((profile) => profile.id === id);
    if (selected?.isPrimary) {
      if (openBazi) router.push("/nebula/chart");
      return;
    }

    setSelectingProfileId(id);
    setProfiles((current) => current.map((profile) => ({ ...profile, isPrimary: profile.id === id })));

    try {
      const res = await apiFetch(`/profiles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPrimary: true }),
      });

      if (!res.ok) {
        await fetchProfiles();
        return;
      }

      if (openBazi) router.push("/nebula/chart");
    } catch {
      await fetchProfiles();
    } finally {
      setSelectingProfileId(null);
    }
  };

  const confirmDeleteProfile = async () => {
    if (!pendingDeleteProfile || deletingProfileId) return;
    const id = pendingDeleteProfile.id;
    setDeletingProfileId(id);

    try {
      const [res] = await Promise.all([
        apiFetch(`/profiles/${id}`, { method: "DELETE" }),
        new Promise((resolve) => window.setTimeout(resolve, 520)),
      ]);

      if (!res.ok) {
        setDeletingProfileId(null);
        return;
      }

      setPendingDeleteProfile(null);
      await fetchProfiles();
    } catch {
      setDeletingProfileId(null);
    }
  };

  const parseBazi = (p: Profile) => {
    try {
      return JSON.parse(p.baziPillar);
    } catch {
      return null;
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
    <div className="min-h-screen product-page profiles-page bg-stone-50">
      <ProductHeader />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium">我的档案</h1>
          <Button
            size="sm"
            className={profiles.length >= 10 ? "opacity-50 cursor-not-allowed" : ""}
            onClick={() => {
              if (profiles.length >= 10) {
                window.alert("每个账号最多可创建 10 份档案");
                return;
              }
              router.push("/onboarding?profileMode=1&callbackUrl=/profiles");
            }}
          >
            <Plus className="w-4 h-4" /> 新增档案
          </Button>
        </div>

        <div className="space-y-4">
          {profiles.map((p) => {
            const bazi = parseBazi(p);
            return (
              <div
                key={p.id}
                className={`profile-card bg-white rounded-2xl border border-stone-100 p-5 shadow-sm ${p.isPrimary ? "is-primary" : ""}${p.id === newProfileId ? " is-new" : ""}${p.id === deletingProfileId ? " is-deleting" : ""}${p.id === selectingProfileId ? " is-selecting" : ""}`}
                data-profile-id={p.id}
                role="button"
                tabIndex={0}
                aria-pressed={p.isPrimary}
                onClick={() => selectProfile(p.id)}
                onKeyDown={(event) => event.key === "Enter" && selectProfile(p.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-medium">{p.name || "未命名"}</h2>
                      {p.isPrimary && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      {p.id === newProfileId && <span className="profile-card__new-label">刚刚创建</span>}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      {p.gender === "male" ? "男" : p.gender === "female" ? "女" : "其他"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="profile-bazi-button" disabled={Boolean(deletingProfileId || selectingProfileId)} onClick={(event) => { event.stopPropagation(); selectProfile(p.id, true); }}>
                      {p.id === selectingProfileId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Orbit className="w-4 h-4" />}
                      我的八字
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="修改档案" onClick={(event) => { event.stopPropagation(); router.push(`/onboarding?profileMode=1&profileId=${encodeURIComponent(p.id)}&callbackUrl=/profiles`); }}>
                      <Pencil className="w-4 h-4 text-stone-400" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="删除档案" disabled={Boolean(deletingProfileId)} onClick={(event) => { event.stopPropagation(); setPendingDeleteProfile(p); }}>
                      {p.id === deletingProfileId ? <Loader2 className="w-4 h-4 animate-spin text-stone-400" /> : <Trash2 className="w-4 h-4 text-stone-400" />}
                    </Button>
                  </div>
                </div>
                {bazi && (
                  <div className="mt-4 pt-4 border-t border-stone-50">
                    <div className="text-2xl tracking-widest font-medium text-center">
                      {bazi.year} · {bazi.month} · {bazi.day} · {bazi.hour}
                    </div>
                    <div className="text-sm text-stone-500 text-center mt-2">
                      日主：{bazi.dayMaster.gan}{bazi.dayMaster.zhi}（{bazi.dayMaster.wuxing}） · {bazi.genderLabel}
                    </div>
                    <div className="text-xs text-stone-400 text-center mt-1">
                      五行：{Object.entries(bazi.wuxing).map(([k, v]) => `${k}${v}`).join(" / ")}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {pendingDeleteProfile && (
        <div
          className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4"
          onClick={() => !deletingProfileId && setPendingDeleteProfile(null)}
        >
          <div
            className="bg-white rounded-2xl border border-stone-100 p-6 shadow-lg max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium mb-2">确认删除档案？</h2>
            <p className="text-sm text-stone-500 mb-4">
              删除档案「{pendingDeleteProfile.name || "未命名"}」后，关联的深度报告也会同步被删除，此操作无法恢复。
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                disabled={Boolean(deletingProfileId)}
                onClick={() => setPendingDeleteProfile(null)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                disabled={Boolean(deletingProfileId)}
                onClick={confirmDeleteProfile}
              >
                {deletingProfileId === pendingDeleteProfile.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 删除中</>
                ) : (
                  "确认删除"
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
