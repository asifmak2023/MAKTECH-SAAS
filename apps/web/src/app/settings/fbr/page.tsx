"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { fmtWhen, fmtDate } from "@/lib/admin";

type Environment = {
  mode: string;
  status: string;
  configured: boolean;
  tested: boolean;
  failed: boolean;
  has_token: boolean;
  config: Record<string, string>;
  last_tested_at: string | null;
  last_test?: Record<string, unknown> | null;
};

type FbrShow = {
  active_mode: string;
  integrator: string;
  environments: Record<string, Environment>;
  onboarding: {
    seller_profile_complete: boolean;
    sandbox_configured: boolean;
    sandbox_tested: boolean;
    sandbox_suite_passed: boolean;
    production_configured: boolean;
    production_active: boolean;
    can_activate_production: boolean;
  };
};

type Verdict = {
  ok: boolean;
  http_status?: number;
  status_code?: string;
  status?: string;
  error_code?: string | number | null;
  error?: string;
};

type ScenarioResult = {
  id: string;
  name: string;
  ok: boolean;
  status_code: string;
  status: string;
  error_code: string | number | null;
  error?: string;
};

const card = "rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]";
const okPill = "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700";
const badPill = "inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700";
const mutedPill = "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600";

export default function FbrSetupPage() {
  const [data, setData] = useState<FbrShow | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function reload() {
    const res = await api<FbrShow>("/api/settings/fbr");
    setData(res);
    return res;
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : "Failed to load FBR setup"));
  }, []);

  if (error && !data) {
    return (
      <AppShell>
        <p className="text-sm text-rose-600">{error}</p>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">Loading FBR setup...</p>
      </AppShell>
    );
  }

  const ob = data.onboarding;

  return (
    <AppShell>
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link className="text-sm text-win-600" href="/settings">← Settings</Link>
        <h1 className="text-2xl font-semibold">FBR digital invoicing setup</h1>
        <p className="text-sm text-slate-500">
          Configure and test your Pakistan Revenue Automation Limited (PRAL) credentials. Sandbox first, then activate production.
        </p>
      </div>

      {notice && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <OnboardingProgress ob={ob} />

      {!ob.seller_profile_complete && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Complete your seller profile (NTN/CNIC and business name) in{" "}
          <Link className="underline" href="/settings">settings</Link> before configuring FBR.
        </p>
      )}

      <EnvPanel
        title="Sandbox"
        env={data.environments.sandbox}
        guide={
          <Guide kind="sandbox" />
        }
        canEdit
        onChanged={reload}
        setNotice={setNotice}
        setError={setError}
      />

      <SuitePanel reload={reload} setNotice={setNotice} setError={setError} />

      <ProductionPanel data={data} reload={async () => reload()} setNotice={setNotice} setError={setError} />

      <details className={card}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">How do I get a PRAL token?</summary>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <Guide kind="general" />
        </div>
      </details>
    </div>
    </AppShell>
  );
}

function Guide({ kind }: { kind: "sandbox" | "general" }) {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
      {kind === "sandbox" ? (
        <>
          <li>Obtain a <strong>sandbox</strong> token from the PRAL / FBR integration team (seller registration number tied to your NTN/CNIC or business).</li>
          <li>Paste the token and use the default sandbox gateway <code className="rounded bg-slate-100 px-1">https://gw.fbr.gov.pk</code>.</li>
          <li>Save, then run the token test — it validates the token against the <em>validateinvoicedata</em> method using your seller profile.</li>
          <li>Run the scenario suite to confirm common invoice types pass (no invoices are posted).</li>
        </>
      ) : (
        <>
          <li>Sandbox URLs use the <code className="rounded bg-slate-100 px-1">_sb</code> suffix (e.g. <code className="rounded bg-slate-100 px-1">validateinvoicedata_sb</code>).</li>
          <li>Production URLs have no suffix and require a separate production token issued for your seller registration number.</li>
          <li>Your seller NTN/CNIC and business name must exactly match the registration against which the token was issued — otherwise PRAL returns error <code className="rounded bg-slate-100 px-1">0401</code>.</li>
          <li>Tokens are stored encrypted and never displayed again once saved.</li>
          <li>Contact platform support if you need help getting a token.</li>
        </>
      )}
    </ol>
  );
}

function OnboardingProgress({ ob }: { ob: FbrShow["onboarding"] }) {
  const steps = [
    { label: "Seller profile", done: ob.seller_profile_complete },
    { label: "Sandbox token", done: ob.sandbox_configured },
    { label: "Token test", done: ob.sandbox_tested },
    { label: "Scenario suite", done: ob.sandbox_suite_passed },
    { label: "Production ready", done: ob.production_configured },
  ];

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                s.done ? "bg-emerald-500 text-white" : i === 0 && !s.done ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <span className={`hidden text-xs sm:block ${s.done ? "text-emerald-700" : "text-slate-500"}`}>{s.label}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function EnvPanel({
  title,
  env,
  guide,
  canEdit,
  onChanged,
  setNotice,
  setError,
}: {
  title: string;
  env?: Environment;
  guide: React.ReactNode;
  canEdit: boolean;
  onChanged: () => Promise<unknown>;
  setNotice: (m: string) => void;
  setError: (m: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<Verdict | null>(null);

  if (!env) {
    return (
      <section className={card}>
        <h2 className="font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500">No configuration yet.</p>
      </section>
    );
  }

  const mode = env.mode;
  const cfg = env.config ?? {};

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    for (const key of ["base_url", "validate_endpoint", "submit_endpoint"]) {
      const v = String(f.get(key) ?? "").trim();
      if (v) body[key] = v;
    }
    const token = String(f.get("token") ?? "").trim();
    if (token && token !== "••••••••") body.token = token;
    if (Object.keys(body).length === 0) {
      setError("Nothing to save — fill in at least one field or a new token.");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/settings/fbr/${mode}`, { method: "PUT", body: JSON.stringify(body) });
      setNotice(`${title} configuration saved.`);
      setTestResult(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function testToken() {
    setTesting(true);
    setError("");
    try {
      const res = await api<{ result: Verdict }>("/api/settings/fbr/test", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      setTestResult(res.result);
      setNotice(res.result.ok ? `${title} token verified (status ${res.result.status_code}).` : `${title} token test failed.`);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className={env.configured ? okPill : mutedPill}>{env.configured ? "Configured" : "Not configured"}</span>
            {env.tested && <span className={okPill}>Token tested</span>}
            {env.failed && <span className={badPill}>Test failed</span>}
            {env.last_tested_at && <span className="text-xs text-slate-400">last test {fmtWhen(env.last_tested_at)}</span>}
          </div>
        </div>
        {env.configured && (
          <button className="rounded-md bg-black/[0.06] px-3 py-1.5 text-sm font-medium text-slate-700" onClick={testToken} disabled={testing || saving}>
            {testing ? "Testing token…" : "Run token test"}
          </button>
        )}
      </div>

      {canEdit ? (
        <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
          <div>
            <label>Base URL</label>
            <input name="base_url" defaultValue={cfg.base_url ?? "https://gw.fbr.gov.pk"} placeholder="https://gw.fbr.gov.pk" />
          </div>
          <div>
            <label>Token {cfg.token ? "(leave blank to keep current)" : ""}</label>
            <input name="token" type="password" autoComplete="off" placeholder={cfg.token ? "••••••••" : "Paste token"} />
          </div>
          <div>
            <label>Validate endpoint</label>
            <input name="validate_endpoint" defaultValue={cfg.validate_endpoint ?? ""} placeholder={`/di_data/v1/di/validateinvoicedata${mode === "sandbox" ? "_sb" : ""}`} />
          </div>
          <div>
            <label>Submit endpoint</label>
            <input name="submit_endpoint" defaultValue={cfg.submit_endpoint ?? ""} placeholder={`/di_data/v1/di/postinvoicedata${mode === "sandbox" ? "_sb" : ""}`} />
          </div>
          <div className="md:col-span-2">
            <button className="bg-win-600 text-white" disabled={saving}>{saving ? "Saving…" : `Save ${title} configuration`}</button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-slate-500">Production credentials are shown below.</p>
      )}

      {testResult && (
        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${testResult.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          <p className="font-semibold">{testResult.ok ? "Token is valid" : "Token test failed"}</p>
          {testResult.ok ? (
            <p>PRAL returned statusCode <strong>{testResult.status_code}</strong> ({testResult.status ?? "Valid"}).</p>
          ) : (
            <p>
              PRAL returned error{testResult.error_code ? ` ${testResult.error_code}` : ""}: {testResult.error || "Unknown error"}
            </p>
          )}
          {testResult.error_code === "0401" && (
            <p className="mt-1 text-xs">
              Hint: error 0401 means the token is not authorised for the seller registration number on your profile. Check the NTN/CNIC and business name exactly match what the token was issued for.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3">{guide}</div>
    </section>
  );
}

function SuitePanel({
  reload,
  setNotice,
  setError,
}: {
  reload: () => Promise<unknown>;
  setNotice: (m: string) => void;
  setError: (m: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const [suite, setSuite] = useState<ScenarioResult[] | null>(null);

  async function runSuite() {
    setRunning(true);
    setError("");
    try {
      const res = await api<{ total: number; passed: number; failed: number; scenarios: ScenarioResult[] }>("/api/settings/fbr/run-tests", {
        method: "POST",
        body: JSON.stringify({ scenarios: ["SN001", "SN002", "SN005", "SN006", "SN007", "SN008"] }),
      });
      setSuite(res.scenarios);
      setNotice(`Sandbox scenario suite: ${res.passed}/${res.total} passed.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scenario run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-800">Sandbox scenario suite</h2>
          <p className="text-xs text-slate-500">Run shipped PRAL fixtures through the sandbox to prove invoice types work before going live.</p>
        </div>
        <button className="rounded-md bg-black/[0.06] px-3 py-1.5 text-sm font-medium text-slate-700" onClick={runSuite} disabled={running}>
          {running ? "Running…" : "Run scenario suite"}
        </button>
      </div>
      {suite ? (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {suite.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.id}</td>
                  <td className="px-3 py-2 text-slate-700">{s.name}</td>
                  <td className="px-3 py-2 text-right">
                    {s.ok ? <span className={okPill}>Pass · {s.status_code}</span> : <span className={badPill}>{s.error_code ?? "Fail"} · {s.error ?? ""}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No run yet. Results appear here after the suite completes.</p>
      )}
    </section>
  );
}

function ProductionPanel({
  data,
  reload,
  setNotice,
  setError,
}: {
  data: FbrShow;
  reload: () => Promise<unknown>;
  setNotice: (m: string) => void;
  setError: (m: string) => void;
}) {
  const prod = data.environments.production;
  const ob = data.onboarding;
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [testResult, setTestResult] = useState<Verdict | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    for (const key of ["base_url", "validate_endpoint", "submit_endpoint"]) {
      const v = String(f.get(key) ?? "").trim();
      if (v) body[key] = v;
    }
    const token = String(f.get("token") ?? "").trim();
    if (token && token !== "••••••••") body.token = token;
    if (Object.keys(body).length === 0) {
      setError("Nothing to save.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/settings/fbr/production", { method: "PUT", body: JSON.stringify(body) });
      setNotice("Production configuration saved.");
      setTestResult(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function testToken() {
    setSaving(true);
    setError("");
    try {
      const res = await api<{ result: Verdict }>("/api/settings/fbr/test", {
        method: "POST",
        body: JSON.stringify({ mode: "production" }),
      });
      setTestResult(res.result);
      setNotice(res.result.ok ? "Production token verified." : "Production token test failed.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token test failed");
    } finally {
      setSaving(false);
    }
  }

  async function activate() {
    setActivating(true);
    setError("");
    try {
      await api("/api/settings/fbr/activate", { method: "POST", body: JSON.stringify({ mode: "production" }) });
      setNotice("Production environment activated — new invoices will be submitted to PRAL production.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setActivating(false);
    }
  }

  const prodCfg = prod?.config ?? {};

  return (
    <section className={card}>
      <div className="mb-4 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-800">Production</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className={prod?.configured ? okPill : mutedPill}>{prod?.configured ? "Configured" : "Not configured"}</span>
              {prod?.tested && <span className={okPill}>Token tested</span>}
              {ob.production_active && <span className="inline-flex rounded-full bg-win-600 px-2 py-0.5 text-xs text-white">Active environment</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prod?.configured && (
              <button className="rounded-md bg-black/[0.06] px-3 py-1.5 text-sm font-medium text-slate-700" onClick={testToken} disabled={saving || activating}>
                {saving ? "Testing…" : "Run token test"}
              </button>
            )}
            <button className="bg-emerald-600 px-4 py-1.5 text-sm text-white" onClick={activate} disabled={!ob.can_activate_production || activating}>
              {activating ? "Activating…" : "Activate production"}
            </button>
          </div>
        </div>
        {!ob.can_activate_production && (
          <p className="mt-2 text-xs text-amber-600">
            {!ob.production_configured
              ? "Configure and save production credentials to activate."
              : !ob.sandbox_configured
                ? "Sandbox must be configured first."
                : "Activation is enabled once sandbox is configured."}
          </p>
        )}
      </div>

      <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
        <div>
          <label>Base URL</label>
          <input name="base_url" defaultValue={prodCfg.base_url ?? "https://gw.fbr.gov.pk"} placeholder="https://gw.fbr.gov.pk" />
        </div>
        <div>
          <label>Token {prodCfg.token ? "(leave blank to keep current)" : ""}</label>
          <input name="token" type="password" autoComplete="off" placeholder={prodCfg.token ? "••••••••" : "Paste production token"} />
        </div>
        <div>
          <label>Validate endpoint</label>
          <input name="validate_endpoint" defaultValue={prodCfg.validate_endpoint ?? ""} placeholder="/di_data/v1/di/validateinvoicedata" />
        </div>
        <div>
          <label>Submit endpoint</label>
          <input name="submit_endpoint" defaultValue={prodCfg.submit_endpoint ?? ""} placeholder="/di_data/v1/di/postinvoicedata" />
        </div>
        <div className="md:col-span-2">
          <button className="bg-win-600 text-white" disabled={saving || activating}>{saving ? "Saving…" : "Save production configuration"}</button>
        </div>
      </form>

      {testResult && (
        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${testResult.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          <p className="font-semibold">{testResult.ok ? "Production token is valid" : "Production token test failed"}</p>
          {testResult.ok ? (
            <p>PRAL returned statusCode <strong>{testResult.status_code}</strong> ({testResult.status ?? "Valid"}).</p>
          ) : (
            <p>PRAL returned error{testResult.error_code ? ` ${testResult.error_code}` : ""}: {testResult.error || "Unknown error"}</p>
          )}
        </div>
      )}

      {prod?.last_tested_at && !testResult && (
        <p className="mt-3 text-xs text-slate-400">Last tested {fmtWhen(prod.last_tested_at)} · last config {fmtDate(prod.last_tested_at)}</p>
      )}
    </section>
  );
}
