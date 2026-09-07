"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await api<{ token: string; tenant: { slug: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          tenant: form.get("tenant"),
        }),
      });
      setSession(res.token, res.tenant.slug);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-xl bg-white border border-black/[0.06] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-win-600">PRAL</p>
          <h1 className="text-2xl font-semibold">Sign in</h1>
        </div>
        <div>
          <label>Tenant slug</label>
          <input name="tenant" placeholder="maktech" defaultValue="maktech" />
        </div>
        <div>
          <label>Email</label>
          <input name="email" type="email" required defaultValue="admin@maktech.local" />
        </div>
        <div>
          <label>Password</label>
          <input name="password" type="password" required defaultValue="password" />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="w-full bg-win-600 text-white" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-sm text-slate-500">
          New company? <Link className="text-win-600" href="/register">Create tenant</Link>
        </p>
      </form>
    </div>
  );
}
