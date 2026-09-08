"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BottomDock, ProductHeader } from "@/components/echomere-chrome";
import { safeInternalPath } from "@/lib/navigation";

const YEARS = Array.from({ length: 100 }, (_, i) => 2026 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const BIRTH_PLACE_OPTIONS = [
  { value: "中国 · 北京市", timezone: "UTC+08:00" },
  { value: "中国 · 上海市", timezone: "UTC+08:00" },
  { value: "中国 · 广州市", timezone: "UTC+08:00" },
  { value: "中国 · 深圳市", timezone: "UTC+08:00" },
  { value: "中国 · 成都市", timezone: "UTC+08:00" },
  { value: "中国 · 重庆市", timezone: "UTC+08:00" },
  { value: "中国 · 杭州市", timezone: "UTC+08:00" },
  { value: "中国 · 武汉市", timezone: "UTC+08:00" },
  { value: "中国 · 西安市", timezone: "UTC+08:00" },
  { value: "中国香港 · 香港", timezone: "UTC+08:00" },
  { value: "日本 · 东京", timezone: "UTC+09:00" },
  { value: "新加坡 · 新加坡", timezone: "UTC+08:00" },
  { value: "英国 · 伦敦", timezone: "UTC+00:00" },
  { value: "美国 · 纽约", timezone: "UTC-05:00" },
  { value: "美国 · 洛杉矶", timezone: "UTC-08:00" },
];
const TIMEZONE_OPTIONS = [
  "UTC-08:00",
  "UTC-07:00",
  "UTC-06:00",
  "UTC-05:00",
  "UTC-04:00",
  "UTC+00:00",
  "UTC+01:00",
  "UTC+02:00",
  "UTC+03:00",
  "UTC+05:30",
  "UTC+07:00",
  "UTC+08:00",
  "UTC+09:00",
  "UTC+10:00",
  "UTC+12:00",
];
const GENDER_OPTIONS = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
];
const KNOWLEDGE_OPTIONS = [
  { value: "none", label: "初识" },
  { value: "basic", label: "略知一二" },
  { value: "advanced", label: "比较熟悉" },
];

interface BaziPreview {
  schemaVersion?: number;
  engine?: { name: string; version: string };
  year: string;
  month: string;
  day: string;
  hour: string;
  dayMaster: { gan: string; zhi: string; wuxing: string };
  genderLabel: string;
  wuxing: Record<string, number>;
  chart?: {
    trueSolarTimeInfo?: {
      clockTime: string;
      trueSolarTime: string;
      longitude: number;
      correctionMinutes: number;
    };
    relations?: Array<{ type: string; description: string }>;
  };
  dayun?: {
    list?: Array<{
      startYear: number;
      startAge: number;
      ganZhi: string;
      tenGod: string;
      diShi: string;
    }>;
  };
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileMode = searchParams.get("profileMode") === "1";
  const editingProfileId = searchParams.get("profileId");
  const callbackUrl = safeInternalPath(
    searchParams.get("callbackUrl"),
    profileMode ? "/profiles" : "/chat"
  );
  const [step, setStep] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileLoading, setProfileLoading] = useState(Boolean(editingProfileId));
  const [form, setForm] = useState({
    name: "妮娜",
    year: 1990,
    month: 1,
    day: 15,
    hour: 12,
    minute: 30,
    calendarType: "solar" as "solar" | "lunar",
    isLeapMonth: false,
    birthPlace: "中国 · 上海市",
    timezone: "UTC+08:00",
    longitude: "",
    gender: "female",
    relationship: "",
    industry: "",
    job: "",
    knowledge: "",
  });
  const [preview, setPreview] = useState<BaziPreview | null>(null);

  useEffect(() => {
    if (!editingProfileId) return;

    let active = true;
    const loadProfile = async () => {
      try {
        const res = await apiFetch(`/profiles/${editingProfileId}`);
        if (!res.ok) return;
        const profile = await res.json();
        const birthDate = new Date(profile.birthDateTime);
        const birthPlace = profile.birthLocation || "";
        const matchedPlace = BIRTH_PLACE_OPTIONS.find((item) => item.value === birthPlace);

        if (active) {
          setForm((current) => ({
            ...current,
            name: profile.name || "",
            gender: profile.gender || current.gender,
            year: birthDate.getFullYear(),
            month: birthDate.getMonth() + 1,
            day: birthDate.getDate(),
            hour: birthDate.getHours(),
            minute: birthDate.getMinutes(),
            birthPlace,
            timezone: profile.timezone || matchedPlace?.timezone || current.timezone,
            calendarType: profile.calendarType || current.calendarType,
            isLeapMonth: profile.isLeapMonth ?? current.isLeapMonth,
            longitude: profile.longitude == null ? "" : String(profile.longitude),
            relationship: profile.relationship || "",
            industry: profile.industry || "",
            job: profile.job || "",
            knowledge: profile.knowledge || "",
          }));
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [editingProfileId]);

  const fetchPreview = async () => {
    const res = await apiFetch("/bazi", {
      method: "POST",
      body: JSON.stringify({
        year: form.year,
        month: form.month,
        day: form.day,
        hour: form.hour,
        minute: form.minute,
        gender: form.gender,
        calendarType: form.calendarType,
        isLeapMonth: form.isLeapMonth,
        birthPlace: form.birthPlace || undefined,
        timezone: form.timezone,
        longitude: form.longitude === "" ? undefined : Number(form.longitude),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || data?.error || "命盘生成失败");
    return data;
  };

  const next = async () => {
    if (step === 2) {
      if (profileMode) {
        await submit();
        return;
      }
      setLoading(true);
      setError("");
      try {
        setPreview(await fetchPreview());
        setStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : "命盘生成失败");
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => s - 1);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const path = editingProfileId
        ? `/profiles/${editingProfileId}`
        : profileMode
          ? "/profiles"
          : "/onboarding";
      const res = await apiFetch(path, {
        method: editingProfileId ? "PATCH" : "POST",
        body: JSON.stringify({
          type: profileMode ? "others" : "self",
          name: form.name,
          year: form.year,
          month: form.month,
          day: form.day,
          hour: form.hour,
          minute: form.minute,
          birthLocation: form.birthPlace,
          timezone: form.timezone,
          calendarType: form.calendarType,
          isLeapMonth: form.isLeapMonth,
          longitude: form.longitude === "" ? undefined : Number(form.longitude),
          gender: form.gender,
          relationship: form.relationship || undefined,
          industry: form.industry || undefined,
          job: form.job || undefined,
          knowledge: form.knowledge || undefined,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.message || result?.error || "档案保存失败");
      const createdProfileId = editingProfileId ? null : result?.profile?.id || result?.id;
      const destination = profileMode && createdProfileId
        ? `${callbackUrl}${callbackUrl.includes("?") ? "&" : "?"}newProfile=${encodeURIComponent(createdProfileId)}`
        : callbackUrl;
      router.push(editingProfileId ? callbackUrl : destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "档案保存失败");
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const activeDayun = preview?.dayun?.list?.find((item, index, list) => {
    const nextStart = list[index + 1]?.startYear ?? Number.POSITIVE_INFINITY;
    return currentYear >= item.startYear && currentYear < nextStart;
  });

  return (
    <div className="min-h-screen product-page onboarding-page bg-stone-50 flex flex-col">
      <ProductHeader />

      <main className="flex-1 flex items-center justify-center p-4">
        {profileLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" aria-label="正在读取档案" />
        ) : (
        <div className={`w-full ${step === 3 ? "max-w-3xl" : step === 2 ? "max-w-2xl" : "max-w-xl"} bg-white rounded-2xl border border-stone-100 p-8 shadow-sm`}>
          {error && <p className="login-card__error mb-4" role="alert">{error}</p>}
          {step === 2 && (
            <div className="birth-step">
              <div className="birth-step-heading">
                <h2 className="text-xl font-medium">个人信息</h2>
                <p className="text-sm text-stone-500">时间越准确，映照越清晰</p>
              </div>

              <section className="birth-group" aria-labelledby="basic-info-heading">
                <div className="birth-group-heading"><h3 id="basic-info-heading">基本信息</h3></div>
                <div className="precision-location-grid">
                  <div className="birth-field">
                    <Label htmlFor="profile-name">昵称</Label>
                    <Input id="profile-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="birth-field">
                    <Label>性别</Label>
                    <div className="choice-row choice-row--two" role="group" aria-label="性别">
                      {GENDER_OPTIONS.slice(0, 2).map((option) => (
                        <button key={option.value} type="button" className={`choice-chip ${form.gender === option.value ? "is-selected" : ""}`} onClick={() => setForm({ ...form, gender: option.value })}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="birth-group" aria-labelledby="birth-date-heading">
                <div className="birth-group-heading">
                  <h3 id="birth-date-heading">出生日期</h3>
                  <span>{form.calendarType === "solar" ? "阳历 / 公历" : "农历"}</span>
                </div>
                <div className="birth-date-grid">
                <div className="birth-field birth-field-year">
                  <Label>年</Label>
                  <Select value={String(form.year)} onValueChange={(v) => setForm({ ...form, year: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="birth-field">
                  <Label>月</Label>
                  <Select value={String(form.month)} onValueChange={(v) => setForm({ ...form, month: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="birth-field">
                  <Label>日</Label>
                  <Select value={String(form.day)} onValueChange={(v) => setForm({ ...form, day: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                </div>
              </section>

              <section className="birth-group" aria-labelledby="birth-time-heading">
                <div className="birth-group-heading">
                  <h3 id="birth-time-heading">出生时刻</h3>
                  <span>24 小时制</span>
                </div>
                <div className="birth-time-grid">
                  <div className="birth-field">
                    <Label>时</Label>
                    <Select value={String(form.hour)} onValueChange={(v) => setForm({ ...form, hour: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {HOURS.map((h) => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="birth-field">
                    <Label>分</Label>
                    <Select value={String(form.minute)} onValueChange={(v) => setForm({ ...form, minute: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {MINUTES.map((m) => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="birth-group" aria-labelledby="location-heading">
                <div className="birth-group-heading">
                  <h3 id="location-heading">出生地点与时区</h3>
                  <span>根据出生地自动匹配</span>
                </div>
                <div className="precision-location-grid">
                  <div className="birth-field">
                    <Label>出生地</Label>
                    <Select
                      value={form.birthPlace}
                      onValueChange={(value) => {
                        const location = BIRTH_PLACE_OPTIONS.find((item) => item.value === value);
                        setForm({ ...form, birthPlace: value, timezone: location?.timezone || form.timezone });
                      }}
                    >
                      <SelectTrigger aria-label="出生地"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {BIRTH_PLACE_OPTIONS.map((location) => (
                          <SelectItem key={location.value} value={location.value}>{location.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="birth-field">
                    <Label>时区</Label>
                    <Select value={form.timezone} onValueChange={(value) => setForm({ ...form, timezone: value })}>
                      <SelectTrigger aria-label="时区"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIMEZONE_OPTIONS.map((timezone) => (
                          <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <div className="birth-actions">
                <Button variant="ghost" onClick={() => router.push(profileMode ? "/profiles" : "/login")}><ChevronLeft className="w-4 h-4" /> 返回</Button>
                <Button onClick={next} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingProfileId ? "保存修改" : profileMode ? "完成" : "下一步"}</Button>
              </div>
            </div>
          )}

          {step === 3 && preview && (
            <div className="bazi-preview-step">
              <div className="bazi-preview-heading">
                <div>
                  <h2 className="text-xl font-medium">命盘校准</h2>
                  <p>完整排盘事实已生成，请核对出生信息</p>
                </div>
                <span className="engine-badge">{preview.engine?.name || "TAIBU CORE"} · V{preview.schemaVersion || 2}</span>
              </div>

              <div className="bazi-core-card">
                <div className="pillar-grid" aria-label="四柱命盘">
                  {[
                    ["年柱", preview.year],
                    ["月柱", preview.month],
                    ["日柱", preview.day],
                    ["时柱", preview.hour],
                  ].map(([label, value]) => (
                    <div className="pillar-item" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="bazi-core-meta">
                  <span>日主 {preview.dayMaster.gan} · {preview.dayMaster.wuxing}</span>
                  <span>{preview.genderLabel}</span>
                  <span>{form.calendarType === "solar" ? "阳历排盘" : "农历排盘"}</span>
                </div>
              </div>

              <div className="bazi-insight-grid">
                <section className="bazi-insight-card">
                  <div className="insight-label">时间校准</div>
                  {preview.chart?.trueSolarTimeInfo ? (
                    <>
                      <strong>{preview.chart.trueSolarTimeInfo.clockTime} → {preview.chart.trueSolarTimeInfo.trueSolarTime}</strong>
                      <p>经度 {preview.chart.trueSolarTimeInfo.longitude}° · 修正 {preview.chart.trueSolarTimeInfo.correctionMinutes} 分钟</p>
                    </>
                  ) : (
                    <>
                      <strong>标准时排盘</strong>
                      <p>填写出生地经度可启用真太阳时</p>
                    </>
                  )}
                </section>

                <section className="bazi-insight-card">
                  <div className="insight-label">当前大运</div>
                  {activeDayun ? (
                    <>
                      <strong>{activeDayun.ganZhi} · {activeDayun.tenGod}</strong>
                      <p>{activeDayun.startYear} 年起 · {activeDayun.startAge} 岁 · 十二长生「{activeDayun.diShi}」</p>
                    </>
                  ) : (
                    <><strong>大运已生成</strong><p>完整周期将在命盘档案中展开</p></>
                  )}
                </section>
              </div>

              <section className="bazi-relations-card">
                <div className="insight-label">盘面关系</div>
                <div className="relation-list">
                  {preview.chart?.relations?.length ? preview.chart.relations.slice(0, 3).map((relation, index) => (
                    <span key={`${relation.type}-${index}`}>{relation.description}</span>
                  )) : <span>四柱关系平稳，未见显著合冲</span>}
                </div>
              </section>

              <p className="preview-boundary">历法与经度校准用于本次预览；现有档案接口将保存出生地与基础出生时间。</p>

              <div className="birth-actions">
                <Button variant="ghost" onClick={back}><ChevronLeft className="w-4 h-4" /> 返回修改</Button>
                <Button onClick={next}>确认</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="profile-step">
              <div className="profile-step-heading">
                <h2 className="text-xl font-medium">个人信息</h2>
                <p className="text-sm text-stone-500">让每一次回应，更贴近你此刻的处境</p>
              </div>

              <section className="profile-group" aria-labelledby="identity-heading">
                <div className="profile-group-heading">
                  <h3 id="identity-heading">身份轮廓</h3>
                  <span>仅用于个性化解读</span>
                </div>

                <div className="profile-field">
                  <Label>性别</Label>
                  <div className="choice-row" role="group" aria-label="性别">
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`choice-chip ${form.gender === option.value ? "is-selected" : ""}`}
                        aria-pressed={form.gender === option.value}
                        onClick={() => setForm({ ...form, gender: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="profile-field">
                  <Label htmlFor="relationship">感情状态</Label>
                  <Input id="relationship" placeholder="如：单身、恋爱中、已婚" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
                </div>
              </section>

              <section className="profile-group" aria-labelledby="context-heading">
                <div className="profile-group-heading">
                  <h3 id="context-heading">当下语境</h3>
                  <span>选填</span>
                </div>

                <div className="profile-work-grid">
                  <div className="profile-field">
                    <Label htmlFor="industry">所在行业</Label>
                    <Input id="industry" placeholder="互联网、金融、教育…" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  </div>
                  <div className="profile-field">
                    <Label htmlFor="job">当前职业</Label>
                    <Input id="job" placeholder="产品、教师、设计师…" value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} />
                  </div>
                </div>

                <div className="profile-field">
                  <Label>命理了解程度</Label>
                  <div className="choice-row" role="group" aria-label="命理了解程度">
                    {KNOWLEDGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`choice-chip ${form.knowledge === option.value ? "is-selected" : ""}`}
                        aria-pressed={form.knowledge === option.value}
                        onClick={() => setForm({ ...form, knowledge: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <div className="birth-actions profile-actions">
                <Button variant="ghost" onClick={back}><ChevronLeft className="w-4 h-4" /> 返回</Button>
                <Button onClick={next}>下一步</Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-medium">档案创建成功</h2>
              <p className="text-stone-500">你的生命盘已创建，现在可以开始提问了。</p>
              <Button onClick={submit} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "进入 EchoMere"}
              </Button>
            </div>
          )}
        </div>
        )}
      </main>
      {profileMode && <BottomDock active="/profiles" />}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
