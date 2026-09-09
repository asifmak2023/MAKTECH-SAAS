"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setSession } from "@/lib/api";

type LoginRes = {
  token: string;
  tenant: { slug: string } | null;
  is_platform_admin?: boolean;
  account_kind?: "platform_admin" | "seller";
  verification_required?: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await api<LoginRes>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const isAdmin = res.account_kind === "platform_admin" || Boolean(res.is_platform_admin);
      setSession(res.token, isAdmin ? "" : (res.tenant?.slug ?? ""));
      if (!isAdmin && res.verification_required) {
        router.replace("/verify-email");
        return;
      }
      router.replace(isAdmin ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#767676] transition-colors hover:text-black font-label">
          <span aria-hidden>←</span>
          Back
        </Link>
        <span className="hidden text-[11px] uppercase tracking-[0.14em] text-[#767676] sm:inline font-label">
          FBR Digital Invoicing System
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <form onSubmit={onSubmit} className="auth-shadow w-full max-w-md space-y-5 border border-[#e5e5e5] bg-white p-8 md:p-10">
          <div className="pb-1 text-center">
            <h1 className="text-xl font-semibold uppercase tracking-[0.06em] text-black font-label md:text-2xl md:tracking-[0.08em]">
              FBR Digital Invoicing System
            </h1>
            <p className="mt-3 text-sm text-[#767676]">Sign in to your workspace.</p>
          </div>
          <div>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              required
              placeholder="Your workspace username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Your password"
                autoComplete="current-password"
                style={{ paddingRight: "5.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 cursor-pointer px-3 text-[#767676] transition-colors hover:text-black"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-black" role="alert">{error}</p>}
          <button className="w-full bg-black text-white transition-colors hover:bg-[#262626]" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <p className="text-sm text-[#767676]">
            New seller? <Link className="text-black underline underline-offset-4" href="/register">Create account</Link>
            {" · "}
            <Link className="text-black underline underline-offset-4" href="/forgot-password">Forgot your password?</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
