import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-100 p-8 shadow-sm animate-pulse">
        <div className="h-8 bg-stone-100 rounded mb-6" />
        <div className="space-y-4">
          <div className="h-10 bg-stone-100 rounded" />
          <div className="h-10 bg-stone-100 rounded" />
          <div className="h-10 bg-stone-100 rounded" />
        </div>
      </div>
    </div>
  );
}
