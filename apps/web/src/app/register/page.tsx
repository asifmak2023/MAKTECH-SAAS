"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setSession } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await api<{ token: string; tenant: { slug: string } }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      setSession(res.token, res.tenant.slug);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-xl space-y-4 rounded-xl bg-white border border-black/[0.06] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
        <h1 className="text-2xl font-semibold">Create tenant</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label>Company name</label>
            <input name="tenant_name" required />
          </div>
          <div>
            <label>Tenant slug</label>
            <input name="tenant_slug" placeholder="maktech" />
          </div>
          <div>
            <label>Your name</label>
            <input name="name" required />
          </div>
          <div>
            <label>Email</label>
            <input name="email" type="email" required />
          </div>
          <div>
            <label>Password</label>
            <input name="password" type="password" required minLength={8} />
          </div>
          <div>
            <label>Seller NTN/CNIC</label>
            <input name="seller_ntn_cnic" />
          </div>
          <div className="md:col-span-2">
            <label>Seller business name</label>
            <input name="seller_business_name" />
          </div>
          <div>
            <label>Seller province</label>
            <input name="seller_province" />
          </div>
          <div>
            <label>Seller address</label>
            <input name="seller_address" />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="bg-win-600 text-white" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
        <p className="text-sm text-slate-500">
          Already registered? <Link className="text-win-600" href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
