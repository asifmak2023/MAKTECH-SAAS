"use client";

import Link from "next/link";

export type DialogState = {
  title: string;
  message: string;
  detail?: string;
  retryLabel?: string;
  onRetry?: () => void | Promise<void>;
};

export default function ErrorDialog({
  state,
  onClose,
}: {
  state: DialogState | null;
  onClose: () => void;
}) {
  if (!state) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.45)]"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-rose-100 text-rose-600">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 8v4.5m0 3.5h.01M10.3 4.2 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{state.title}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{state.message}</p>
          </div>
        </div>

        {state.detail && (
          <details className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <summary className="cursor-pointer font-medium text-slate-600">Show technical details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">{state.detail}</pre>
          </details>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/support"
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={onClose}
          >
            Contact support
          </Link>
          {state.onRetry && (
            <button
              className="rounded-md bg-win-600 px-4 py-2 text-sm font-medium text-white"
              onClick={() => {
                const r = state.onRetry?.();
                if (r && typeof (r as Promise<unknown>).then === "function") {
                  (r as Promise<unknown>).catch(() => undefined);
                }
                onClose();
              }}
            >
              {state.retryLabel || "Retry"}
            </button>
          )}
          <button className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
