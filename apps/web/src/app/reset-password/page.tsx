"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordField from "@/components/PasswordField";
import { api } from "@/lib/api";

type LinkPayload = { email: string; token: string; tenant?: string | null };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<LinkPayload | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email") ?? "";
    const token = params.get("token") ?? "";
    if (email && token) {
      setPayload({ email, token, tenant: params.get("tenant") });
    }
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!payload) return;

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("password_confirmation") ?? "");

    if (password.length < 8 || password.length > 12) {
      setError("Password must be 8–12 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match. Re-enter the same password in both fields.");
      return;
    }

    setLoading(true);
    try {
      await api("/api/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({
          email: payload.email,
          token: payload.token,
          tenant: payload.tenant || null,
          password,
          password_confirmation: confirmation,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.");
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
            <h1 className="text-2xl font-medium tracking-tight">Choose a new password</h1>
          </div>
        </div>

        {done ? (
          <>
            <p className="text-sm leading-relaxed text-[#525252]" role="status">
              Your password has been reset. Sign in with your new password.
            </p>
            <button className="w-full bg-black text-white hover:bg-[#262626]" onClick={() => router.replace("/login")}>
              Sign in
            </button>
          </>
        ) : payload === null ? (
          <>
            <p className="text-sm leading-relaxed text-[#525252]" role="alert">
              This reset link is missing information or has already been used. Request a new link to continue.
            </p>
            <Link href="/forgot-password" className="btn-primary w-full text-center">
              Request a new link
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <p className="text-sm leading-relaxed text-[#525252]">
              Choose a new password for <span className="text-black">{payload.email}</span>
              {payload.tenant ? ` (username: ${payload.tenant})` : ""}.
            </p>
            <PasswordField
              id="password"
              name="password"
              label="New password"
              required
              autoComplete="new-password"
              showGenerate={false}
              hint="8–12 characters."
            />
            <PasswordField
              id="password_confirmation"
              name="password_confirmation"
              label="Confirm password"
              required
              autoComplete="new-password"
              showGenerate={false}
              hint="Re-enter the same password."
            />
            {error && <p className="text-sm text-black" role="alert">{error}</p>}
            <button className="w-full bg-black text-white hover:bg-[#262626]" disabled={loading}>
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        <p className="text-sm text-[#767676]">
          <Link className="text-black underline underline-offset-4" href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
