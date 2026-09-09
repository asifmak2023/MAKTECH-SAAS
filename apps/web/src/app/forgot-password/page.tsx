"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          tenant: form.get("tenant"),
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-5 border border-[#e5e5e5] bg-white p-8">
        <div className="pb-1 text-center">
          <div className="space-y-1">
            <p className="eyebrow">FBR Digital Invoicing System</p>
            <h1 className="text-2xl font-medium tracking-tight">Forgot your password?</h1>
          </div>
        </div>

        {done ? (
          <>
            <p className="text-sm leading-relaxed text-[#525252]" role="status">
              If an account exists for that email, a password reset link has been sent. Check your inbox (and spam
              folder), then open the link to choose a new password.
            </p>
            <Link href="/login" className="btn-primary w-full text-center">
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <p className="text-sm leading-relaxed text-[#525252]">
              Enter the email on your account and we will send you a link to reset your password.
            </p>
            <div>
              <label htmlFor="tenant">Username (optional)</label>
              <input id="tenant" name="tenant" placeholder="Your username" autoComplete="username" />
              <p className="mt-1 text-xs text-[#767676]">
                Required when the same email is used across more than one workspace.
              </p>
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required placeholder="you@company.com" autoComplete="email" />
            </div>
            {error && <p className="text-sm text-black" role="alert">{error}</p>}
            <button className="w-full bg-black text-white hover:bg-[#262626]" disabled={loading}>
              {loading ? "Sending link..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-sm text-[#767676]">
          Remembered it? <Link className="text-black underline underline-offset-4" href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
