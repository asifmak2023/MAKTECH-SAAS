"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordField from "@/components/PasswordField";
import { api, clearSession, setSession } from "@/lib/api";
import { PAKISTAN_PROVINCES } from "@/lib/provinces";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("password_confirmation") ?? "");

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8 || password.length > 12) {
      setError("Password must be 8–12 characters.");
      return;
    }

    setLoading(true);
    setError("");
    clearSession();
    try {
      const res = await api<{ token: string; tenant: { slug: string }; verification_required?: boolean }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      setSession(res.token, res.tenant.slug);
      router.replace(res.verification_required ? "/verify-email" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
      <div className="relative flex flex-1 items-start justify-center px-4 pb-20 pt-2">
        <form onSubmit={onSubmit} className="auth-shadow w-full max-w-xl space-y-5 border border-[#e5e5e5] bg-white p-8 md:p-10">
          <div className="pb-1 text-center">
            <h1 className="text-xl font-semibold uppercase tracking-[0.06em] text-black font-label md:text-2xl md:tracking-[0.08em]">
              FBR Digital Invoicing System
            </h1>
            <p className="mt-3 text-sm text-[#767676]">Create your workspace to start invoicing.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="tenant_name">Company name</label>
              <input id="tenant_name" name="tenant_name" required autoComplete="organization" />
            </div>
            <div>
              <label htmlFor="tenant_slug">Username</label>
              <input
                id="tenant_slug"
                name="tenant_slug"
                placeholder="maktech"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="mt-1 text-xs text-[#767676]">You&apos;ll sign in with this username.</p>
            </div>
            <div>
              <label htmlFor="name">Your name</label>
              <input id="name" name="name" required autoComplete="name" />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
              <p className="mt-1 text-xs text-[#767676]">One account per email address.</p>
            </div>
            <div className="md:col-span-2">
              <PasswordField id="password" name="password" required />
            </div>
            <div className="md:col-span-2">
              <PasswordField
                id="password_confirmation"
                name="password_confirmation"
                label="Confirm password"
                required
                showGenerate={false}
                hint="Re-enter your password. Must match the password above."
              />
            </div>
            <div>
              <label htmlFor="seller_ntn_cnic">Seller NTN/CNIC</label>
              <input id="seller_ntn_cnic" name="seller_ntn_cnic" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="seller_business_name">Seller business name</label>
              <input id="seller_business_name" name="seller_business_name" />
            </div>
            <div>
              <label htmlFor="seller_province">Seller province</label>
              <select id="seller_province" name="seller_province" defaultValue="">
                <option value="">Select province</option>
                {PAKISTAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="seller_address">Seller address</label>
              <input id="seller_address" name="seller_address" />
            </div>
          </div>
          {error && <p className="text-sm text-black" role="alert">{error}</p>}
          <button className="w-full bg-black text-white transition-colors hover:bg-[#262626]" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
          <p className="text-sm text-[#767676]">
            Already registered? <Link className="text-black underline underline-offset-4" href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
