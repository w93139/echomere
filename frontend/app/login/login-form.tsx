"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, isFrontendPreview } from "@/lib/api";
import { BrandLockup } from "@/components/echomere-chrome";
import { safeInternalPath } from "@/lib/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: identifier.trim(), code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "访问码错误");
        setLoading(false);
        return;
      }

      const { user } = await res.json();
      login(user);

      if (isFrontendPreview()) {
        router.push("/onboarding");
        return;
      }

      const callback = safeInternalPath(searchParams.get("callbackUrl"), "/chat");

      // 检查是否已创建主命盘档案
      const profileRes = await apiFetch("/profile");
      const profileData = await profileRes.json().catch(() => ({}));
      if (!profileData?.primaryProfile) {
        router.push(`/onboarding?callbackUrl=${encodeURIComponent(callback)}`);
        return;
      }

      router.push(callback);
    } catch {
      setError("网络异常，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen product-page auth-page login-page flex bg-stone-50">
      <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="auth-card login-card w-full bg-white border shadow-sm">
        <div className="auth-card__brand"><BrandLockup /></div>

        <h1>登录或注册</h1>
        <p className="login-card__hint">
          使用邮箱或手机号，以及小组分配的访问码
        </p>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <Label htmlFor="identifier">邮箱 / 手机号</Label>
            <Input
              id="identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="you@example.com 或 13800138000"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <Label htmlFor="code">访问码</Label>
            <Input
              id="code"
              type="password"
              autoComplete="current-password"
              placeholder="请输入访问码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          {error && <p className="login-card__error">{error}</p>}

          <Button type="submit" className="login-card__submit w-full" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "继续"}
          </Button>
        </form>

        <p className="login-card__legal">
          登录即表示你同意我们的服务条款与隐私政策
        </p>
      </div>
      </main>
    </div>
  );
}
