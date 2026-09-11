"use client";

import { api } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

type Field = {
  key: string;
  label: string;
  secret: boolean;
  value: string | null;
  stored: boolean;
  env_name: string | null;
  from_env: boolean;
};

type Gateway = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  is_sandbox: boolean;
  supports_recurring: boolean;
  config_keys: string[];
  fields: Field[];
};

const card =
  "border border-[#e5e5e5] bg-white p-4";

const inputCls =
  "w-full border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-black placeholder:text-[#767676] focus:border-black focus:outline-none focus:ring-0";

function Toggle({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        on ? "bg-emerald-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Notice({ kind, text }: { kind: "ok" | "err" | "info"; text: string }) {
  const cls =
    kind === "ok"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : kind === "err"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-sky-50 text-sky-800 border-sky-200";
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${cls}`}>{text}</div>;
}

function GatewayCard({
  gw,
  onChanged,
  onBusy,
  busy,
  origin,
}: {
  gw: Gateway;
  onChanged: (id: number) => Promise<void>;
  onBusy: (b: string | null) => void;
  busy: string | null;
  origin: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [clearKeys, setClearKeys] = useState<Set<string>>(new Set());

  const showsCallbacks = gw.code === "raast" || gw.code === "jazzcash" || gw.code === "easypaisa";
  const saving = busy === `gw:${gw.id}`;

  const patch = useCallback(
    async (payload: Record<string, unknown>, confirmText?: string) => {
      if (confirmText && !window.confirm(confirmText)) return;
      onBusy(`gw:${gw.id}`);
      try {
        await api(`/api/admin/gateways/${gw.id}`, { method: "PUT", body: JSON.stringify(payload) });
        await onChanged(gw.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not save gateway.");
      } finally {
        onBusy(null);
      }
    },
    [gw.id, onBusy, onChanged],
  );

  const toggleOpen = () => {
    if (!open) {
      const init: Record<string, string> = {};
      gw.fields.forEach((f) => {
        init[f.key] = f.secret ? "" : (f.value ?? "");
      });
      setDraft(init);
      setClearKeys(new Set());
    }
    setOpen(!open);
  };

  const saveConfig = async () => {
    const config: Record<string, string> = {};
    gw.fields.forEach((f) => {
      const raw = (draft[f.key] ?? "").trim();
      if (f.secret) {
        if (clearKeys.has(f.key)) config[f.key] = "";
        else if (raw) config[f.key] = raw;
      } else if (raw || clearKeys.has(f.key)) {
        config[f.key] = raw;
      }
    });
    if (Object.keys(config).length === 0) {
      alert("Nothing to save - fill in a value first.");
      return;
    }
    await patch({ config });
  };

  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{gw.name}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {gw.code}
            </span>
            {gw.supports_recurring && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700">recurring</span>
            )}
            {gw.is_sandbox ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">sandbox</span>
            ) : (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">LIVE</span>
            )}
          </div>
          {gw.description && <p className="mt-1 text-xs text-slate-500">{gw.description}</p>}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Enabled</span>
            <Toggle
              on={gw.is_enabled}
              disabled={!!saving}
              label={`Toggle ${gw.name} enabled`}
              onClick={() => patch({ is_enabled: !gw.is_enabled })}
            />
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sandbox</span>
            <Toggle
              on={gw.is_sandbox}
              disabled={!!saving}
              label={`Toggle ${gw.name} sandbox mode`}
              onClick={() =>
                patch(
                  { is_sandbox: !gw.is_sandbox },
                  gw.is_sandbox
                    ? `Switch ${gw.name} to LIVE mode? Real money may move - make sure live credentials and endpoints are set.`
                    : undefined,
                )
              }
            />
          </span>
          <button onClick={toggleOpen} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
            {open ? "Close" : gw.fields.length ? "Configure" : "Details"}
          </button>
        </div>
      </div>

      {showsCallbacks && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs">
          <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500">
            {gw.code === "raast" ? "Give 1LINK these callback URLs" : `Give ${gw.name} these callback URLs`}
          </p>
          <dl className="space-y-1.5">
            {[
              ["Return URL (payer browser)", `${origin}/billing/payments/return`],
              ["Cancel URL (payer browser)", `${origin}/billing`],
              ["Webhook / notify URL", `${origin}/api/webhooks/${gw.code}`],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-slate-500">{label}</dt>
                <dd className="break-all rounded bg-white px-2 py-1 font-mono text-[11px] text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-slate-400">
            Base comes from <span className="font-mono">WEB_APP_URL</span> in the backend .env - edit there to change it.
          </p>
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Values are stored encrypted. Secret fields stay blank; leave them blank to keep the saved (or .env) value.
          </p>

          {gw.fields.map((f) => {
            const clearing = clearKeys.has(f.key);
            return (
              <div key={f.key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-600">{f.label}</label>
                  {f.secret && (f.stored || f.from_env) && (
                    <div className="flex items-center gap-2 text-[11px]">
                      {f.stored && <span className="text-emerald-600">saved in DB</span>}
                      {f.from_env && (
                        <span className="text-slate-400">
                          using <span className="font-mono">{f.env_name}</span> from .env
                        </span>
                      )}
                      {f.secret && f.stored && f.env_name && (
                        <button
                          type="button"
                          onClick={() => {
                            setClearKeys((prev) => {
                              const next = new Set(prev);
                              if (next.has(f.key)) next.delete(f.key);
                              else next.add(f.key);
                              return next;
                            });
                          }}
                          className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
                        >
                          {clearing ? "cancel clear" : `clear (use ${f.env_name})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {f.secret ? (
                  <input
                    type="password"
                    className={inputCls}
                    placeholder={
                      clearing
                        ? "Will be cleared on save"
                        : f.stored
                          ? "•••••••• (leave blank to keep)"
                          : f.from_env
                            ? `Using ${f.env_name} from .env - type here to override`
                            : "Enter value"
                    }
                    value={draft[f.key] ?? ""}
                    onChange={(e) => {
                      const next = { ...draft, [f.key]: e.target.value };
                      if (next[f.key]) setClearKeys((prev) => {
                        const x = new Set(prev);
                        x.delete(f.key);
                        return x;
                      });
                      setDraft(next);
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    className={inputCls}
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  />
                )}
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save configuration"}
            </button>
            {showsCallbacks && gw.is_sandbox && (
              <span className="text-xs text-slate-400">Sandbox is active - credentials only apply once you switch to live.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    api<Gateway[]>("/api/admin/gateways")
      .then(setGateways)
      .catch((e) => setError(e.message));
  }, []);

  const reload = useCallback(async (id?: number) => {
    const list = await api<Gateway[]>("/api/admin/gateways");
    setGateways(list);
    setNotice({ kind: "ok", text: id ? "Gateway updated." : "Payment providers synced." });
  }, []);

  const sync = async () => {
    if (!window.confirm("Re-sync payment provider rows from config/saas.php? Existing rows are kept.")) return;
    setBusy("sync");
    try {
      await api("/api/admin/gateways/seed", { method: "POST" });
      await reload();
    } catch (e) {
      setNotice({ kind: "err", text: e instanceof Error ? e.message : "Sync failed." });
    } finally {
      setBusy(null);
    }
  };

  if (error && gateways.length === 0) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Platform</p>
          <h1 className="text-3xl font-medium tracking-tight">Payment gateway settings</h1>
          <p className="mt-1 text-sm text-[#767676]">
            Enable providers, switch sandbox/live, and edit credentials - all saved encrypted.
          </p>
        </div>
        <button
          onClick={sync}
          disabled={busy !== null}
          className="btn-ghost"
        >
          {busy === "sync" ? "Syncing..." : "Sync providers"}
        </button>
      </div>

      {notice && <Notice kind={notice.kind} text={notice.text} />}

      {gateways.length === 0 && !error ? (
        <p className="text-sm text-slate-500">Loading gateways...</p>
      ) : (
        <div className="space-y-4">
          {gateways.map((gw) => (
            <GatewayCard
              key={gw.id}
              gw={gw}
              origin={origin}
              busy={busy}
              onBusy={setBusy}
              onChanged={async (id) => {
                await reload(id);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
