"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch, isFrontendPreview } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  locale: string;
  defaultDestinySystem: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (isFrontendPreview()) {
        setUser({
          id: "demo-user",
          email: "preview@echomere.local",
          phone: null,
          name: "妮娜",
          locale: "zh-CN",
          defaultDestinySystem: "bazi",
        });
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch("/auth/me");
        if (res.ok) {
          const me = await res.json();
          setUser(me);
        }
      } catch (e) {
        console.error("[auth] restore failed", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = (newUser: AuthUser) => {
    setUser(newUser);
  };

  const logout = async () => {
    if (!isFrontendPreview()) {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    }
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
