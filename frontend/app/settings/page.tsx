"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Loader2, Orbit, User, CalendarDays, CreditCard, LogOut } from "lucide-react";

interface SettingsProfile {
  user?: { email?: string | null; name?: string | null };
  primaryProfile?: { id: string } | null;
  bazi?: {
    year?: string;
    month?: string;
    day?: string;
    hour?: string;
    dayMaster?: { gan?: string; zhi?: string; wuxing?: string };
    genderLabel?: string;
  } | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
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

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/chat")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">设置</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white rounded-2xl border border-stone-100 p-6">
          <h2 className="text-lg font-medium mb-4">个人资料</h2>
          <div className="space-y-4">
            <div>
              <Label>邮箱</Label>
              <Input value={profile?.user?.email || ""} disabled />
            </div>
            <div>
              <Label>昵称</Label>
              <Input value={profile?.user?.name || ""} disabled />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-100 p-6">
          <h2 className="text-lg font-medium mb-4">命理档案</h2>
          {profile?.primaryProfile ? (
            <div className="space-y-2 text-sm">
              <div className="text-2xl tracking-widest font-medium">
                {profile.bazi?.year} · {profile.bazi?.month} · {profile.bazi?.day} · {profile.bazi?.hour}
              </div>
              <div className="text-stone-500">
                日主：{profile.bazi?.dayMaster?.gan}{profile.bazi?.dayMaster?.zhi}（{profile.bazi?.dayMaster?.wuxing}） · {profile.bazi?.genderLabel}
              </div>
            </div>
          ) : (
            <p className="text-stone-500 text-sm">尚未创建命盘档案</p>
          )}
          <Button className="mt-4" onClick={() => router.push("/onboarding")}>
            {profile?.primaryProfile ? "重新创建" : "创建命盘"}
          </Button>
        </section>

        <section className="bg-white rounded-2xl border border-stone-100 p-6 space-y-3">
          <h2 className="text-lg font-medium mb-2">功能入口</h2>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push("/nebula")}>
            <Orbit className="w-4 h-4" /> 人生星云图
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push("/profiles")}>
            <User className="w-4 h-4" /> 命运档案
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push("/daily-fortune")}>
            <CalendarDays className="w-4 h-4" /> 深度报告
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push("/subscription")}>
            <CreditCard className="w-4 h-4" /> 订阅管理
          </Button>
        </section>

        <Separator />

        <Button variant="outline" className="w-full" onClick={() => router.push("/chat")}>
          返回聊天
        </Button>

        <Button variant="ghost" className="w-full text-stone-500" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" /> 退出登录
        </Button>
      </main>
    </div>
  );
}
