"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { setSession } from "@/lib/api";

function GoogleCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const error = params.get("error");
    const token = params.get("token");
    const tenant = params.get("tenant") ?? "";
    const isAdmin = params.get("is_platform_admin") === "1" || params.get("account_kind") === "platform_admin";

    if (error) {
      setMessage(error);
      setStatus("error");
      return;
    }

    if (!token) {
      setMessage("Google sign-in did not complete. Please try again.");
      setStatus("error");
      return;
    }

    setSession(token, isAdmin ? "" : tenant);
    router.replace(isAdmin ? "/admin" : "/dashboard");
  }, [params, router]);

  if (status === "working") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="auth-shadow w-full max-w-sm p-8 text-center">
          <p className="font-label text-sm font-medium tracking-[0.15px] text-black">Completing sign-in…</p>
          <p className="mt-3 text-sm text-[#767676]">Finalizing your Google session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="auth-shadow w-full max-w-sm p-8 text-center">
        <p className="font-label text-sm font-medium tracking-[0.15px] text-black">Sign-in unsuccessful</p>
        <p className="mt-3 text-sm text-[#767676]" role="alert">{message}</p>
        <Link
          href="/login"
          className="btn-primary mt-6 w-full"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallbackContent />
    </Suspense>
  );
}
