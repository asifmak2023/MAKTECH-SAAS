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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md border border-black bg-white p-6"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-black text-black">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 8v4.5m0 3.5h.01M10.3 4.2 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-medium tracking-tight text-black">{state.title}</h2>
            <p className="mt-0.5 text-sm text-[#525252]">{state.message}</p>
          </div>
        </div>

        {state.detail && (
          <details className="mb-4 border border-[#e5e5e5] bg-[#f5f5f5] px-3 py-2 text-xs text-[#525252]">
            <summary className="cursor-pointer font-medium text-black">Show technical details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">{state.detail}</pre>
          </details>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/support"
            className="border border-[#e5e5e5] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black font-label"
            onClick={onClose}
          >
            Contact support
          </Link>
          {state.onRetry && (
            <button
              className="bg-black px-4 py-2 text-white hover:bg-[#262626]"
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
          <button className="border border-black px-4 py-2 text-black" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
