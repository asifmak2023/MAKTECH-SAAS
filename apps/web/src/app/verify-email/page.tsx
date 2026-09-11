"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, clearSession, getToken } from "@/lib/api";

type MeRes = {
  user: { email: string; email_verified_at?: string | null };
  email_verified?: boolean;
  verification_required?: boolean;
  is_platform_admin?: boolean;
  account_kind?: string;
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "ok" | "need" | "err">("working");
  const [message, setMessage] = useState("Checking your verification link...");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const hash = params.get("hash");
    const expires = params.get("expires");
    const signature = params.get("signature");

    if (id && hash && expires && signature) {
      api<{ email_verified: boolean; message: string }>("/api/auth/email/verify", {
        method: "POST",
        body: JSON.stringify({ id, hash, expires: Number(expires), signature }),
      })
        .then(() => {
          setStatus("ok");
          setMessage("Your email is verified. You can continue to your workspace.");
        })
        .catch((err) => {
          setStatus("err");
          setMessage(err instanceof Error ? err.message : "This verification link is invalid or expired.");
        });
      return;
    }

    if (!getToken()) {
      setStatus("need");
      setMessage("Check your inbox for a verification link, then open it on this device.");
      return;
    }

    api<MeRes>("/api/auth/me")
      .then((res) => {
        setEmail(res.user?.email || "");
        if (res.is_platform_admin || res.account_kind === "platform_admin" || res.email_verified) {
          router.replace(res.is_platform_admin || res.account_kind === "platform_admin" ? "/admin" : "/dashboard");
          return;
        }
        setStatus("need");
        setMessage(`We sent a verification link to ${res.user.email}. Open it to activate your workspace.`);
      })
      .catch(() => {
        clearSession();
        setStatus("need");
        setMessage("Sign in, then request a new verification email.");
      });
  }, [router]);

  async function resend(e: FormEvent) {
    e.preventDefault();
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setSending(true);
    try {
      await api("/api/auth/email/resend", { method: "POST" });
      setMessage(email ? `A new link was sent to ${email}.` : "A new verification link was sent.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not resend the email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="auth-shadow w-full max-w-md space-y-5 p-8">
        <div className="pb-1 text-center">
          <div className="space-y-1">
            <p className="eyebrow">FBR Digital Invoicing System</p>
            <h1 className="text-2xl font-medium tracking-tight">Verify your email</h1>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-[#525252]">{message}</p>
        {status === "ok" && (
          <button className="btn-primary w-full" onClick={() => router.replace(getToken() ? "/dashboard" : "/login")}>
            {getToken() ? "Continue" : "Sign in"}
          </button>
        )}
        {(status === "need" || status === "err") && getToken() && (
          <form onSubmit={resend}>
            <button className="btn-primary w-full" disabled={sending}>
              {sending ? "Sending..." : status === "err" ? "Request a new link" : "Resend verification email"}
            </button>
          </form>
        )}
        <p className="text-sm text-[#767676]">
          <Link className="text-black underline underline-offset-4" href="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
