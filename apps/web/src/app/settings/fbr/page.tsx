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
  sale_type?: string | null;
  buyer?: string | null;
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
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          How do I get a PRAL token? (sandbox &amp; production)
        </summary>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <Guide kind="general" />
        </div>
      </details>
    </div>
    </AppShell>
  );
}

function Guide({ kind }: { kind: "sandbox" | "general" }) {
  if (kind === "sandbox") {
    return (
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
        <li>
          Sign in to the FBR <strong>IRIS</strong> portal (<code className="rounded bg-slate-100 px-1">iris.fbr.gov.pk</code>) and open{" "}
          <strong>Registration → Digital Invoicing</strong>. If your entity is eligible (active NTN + STRN), register and select{" "}
          <strong>PRAL</strong> as your licensed integrator.
        </li>
        <li>
          Enter your seller business name, NTN/CNIC, STRN, province and address <strong>exactly</strong> as they appear on FBR records — the
          sandbox token is issued against this registration number.
        </li>
        <li>
          Generate your sandbox API credentials/token in the DI registration, paste it here and save using the default gateway{" "}
          <code className="rounded bg-slate-100 px-1">https://gw.fbr.gov.pk</code> (sandbox endpoints carry the{" "}
          <code className="rounded bg-slate-100 px-1">_sb</code> suffix).
        </li>
        <li>
          Run the <strong>token test</strong>, then the <strong>scenario suite</strong> — validation only, nothing is posted in the sandbox.
        </li>
      </ol>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] leading-relaxed text-slate-600">
        PRAL does not hand out tokens on request. A token is issued for your <strong>FBR Digital Invoicing registration</strong> and is bound
        to your seller registration number — one token per environment: a <strong>sandbox</strong> token for testing and a separate{" "}
        <strong>production</strong> token for live invoicing. This platform cannot request a token on your behalf.
      </p>

      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-slate-700">1 · Register for Digital Invoicing (needed for both tokens)</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed">
          <li>
            Confirm your business is in scope. FBR notifies categories of taxpayers that must use digital invoicing (based on SROs and
            turnover); only entities with an <strong>active NTN and Sales Tax Registration Number (STRN)</strong> can register.
          </li>
          <li>
            Log in to the FBR <strong>IRIS</strong> portal at{" "}
            <a className="font-medium text-win-600 underline" href="https://iris.fbr.gov.pk" target="_blank" rel="noreferrer">
              iris.fbr.gov.pk
            </a>{" "}
            with your NTN credentials and open <strong>Registration → Digital Invoicing</strong> to start the taxpayer registration flow.
          </li>
          <li>
            Choose your integration path: <strong>PRAL</strong> (FBR&apos;s government technology partner, free of cost) or an{" "}
            <strong>FBR-licensed integrator</strong>. Whichever you choose, the credentials you paste in this page are the ones issued{" "}
            <em>for your registration number</em>.
          </li>
          <li>
            For a direct PRAL integration, accept the integrator terms in IRIS and provide your outbound server{" "}
            <strong>public IP(s) or domain</strong> — PRAL allowlists them on the gateway before the token works.
          </li>
        </ol>
      </div>

      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-emerald-700">2 · Sandbox token (testing)</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed">
          <li>Generate the sandbox API token in the same DI registration and paste it in the Sandbox panel above.</li>
          <li>
            Save it, then run the <strong>token test</strong> (validates the token via <em>validateinvoicedata</em> using your seller
            profile) and the <strong>scenario suite</strong> to confirm the invoice types and sale types your business uses.
          </li>
          <li>
            Sandbox submissions are never recorded — use them to fix HS codes, UOMs, tax rates and buyer NTN/registration-type mismatches
            before going live.
          </li>
        </ol>
      </div>

      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-win-700">3 · Production token (live)</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed">
          <li>
            Complete sandbox onboarding first — FBR/PRAL normally clears the sandbox <strong>scenario suite</strong> before a production
            token is released for your registration.
          </li>
          <li>
            In IRIS → Digital Invoicing, request production access. After FBR/PRAL verification a <strong>separate production token</strong>{" "}
            is issued for the same registration number.
          </li>
          <li>
            Paste it in the Production panel (never reuse the sandbox token) and click{" "}
            <strong>Activate production</strong> — invoices created after activation validate and post to FBR in real time (returning the
            FBR invoice reference and QR data).
          </li>
        </ol>
      </div>

      <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2.5">
        <p className="text-[13px] font-semibold text-amber-800">Checklist &amp; gotchas</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-amber-800">
          <li>
            Your seller NTN/CNIC, business name, province and address must <strong>exactly match</strong> the registration the token was
            issued for — otherwise PRAL returns error <code className="rounded bg-amber-100 px-1">0401</code>.
          </li>
          <li>
            If your business integrates through an FBR-licensed integrator, paste the credentials that integrator issues for your
            registration instead of PRAL-generated ones.
          </li>
          <li>
            Tokens are stored encrypted and are never displayed again once saved. If you lose one, re-issue it through the same IRIS
            registration flow.
          </li>
          <li>
            Production endpoints have <strong>no</strong> <code className="rounded bg-amber-100 px-1">_sb</code> suffix; sandbox and
            production tokens are never interchangeable.
          </li>
          <li>
            Reference portals: FBR IRIS (<code className="rounded bg-amber-100 px-1">iris.fbr.gov.pk</code>) · FBR Digital Invoicing
            section on{" "}
            <a className="font-medium underline" href="https://www.fbr.gov.pk" target="_blank" rel="noreferrer">
              fbr.gov.pk
            </a>{" "}
            · PRAL DI-CRM login at{" "}
            <a className="font-medium underline" href="https://pral.com.pk" target="_blank" rel="noreferrer">
              pral.com.pk
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
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

type ScenarioCatalogueEntry = {
  name: string;
  sale_type?: string | null;
  buyer?: string | null;
};

type ScenarioCatalogue = Record<string, ScenarioCatalogueEntry>;

type SortKey = "id" | "name" | "sale_type" | "status";
type SortDir = "asc" | "desc";
type SuiteFilter = "all" | "passed" | "failed";

const sortLabels: Record<SortKey, string> = {
  id: "Scenario",
  name: "Name",
  sale_type: "Type",
  status: "Result",
};

function scenarioComparator(key: SortKey, dir: SortDir) {
  const mult = dir === "asc" ? 1 : -1;
  return (a: ScenarioResult, b: ScenarioResult): number => {
    let cmp = 0;
    if (key === "status") {
      cmp = Number(b.ok) - Number(a.ok);
      if (cmp === 0) cmp = String(a.error_code ?? "").localeCompare(String(b.error_code ?? ""));
    } else if (key === "sale_type") {
      cmp = String(a.sale_type ?? "").localeCompare(String(b.sale_type ?? ""));
    } else if (key === "name") {
      cmp = String(a.name ?? "").localeCompare(String(b.name ?? ""));
    } else {
      cmp = a.id.localeCompare(b.id, undefined, { numeric: true });
    }
    return cmp === 0 ? a.id.localeCompare(b.id, undefined, { numeric: true }) : cmp * mult;
  };
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
  const [catalogue, setCatalogue] = useState<ScenarioCatalogue | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<SuiteFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    api<{ scenarios: ScenarioCatalogue }>("/api/settings/fbr/scenarios")
      .then((res) => {
        const ids = Object.keys(res.scenarios ?? {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setCatalogue(res.scenarios);
        setSelected(ids);
      })
      .catch(() => {
        setCatalogue(null);
        setSelected([]);
      });
  }, []);

  const ids = Object.keys(catalogue ?? {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const allSelected = ids.length > 0 && selected.length === ids.length;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : ids);
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function runSuite() {
    setRunning(true);
    setError("");
    try {
      const res = await api<{ total: number; passed: number; failed: number; scenarios: ScenarioResult[] }>("/api/settings/fbr/run-tests", {
        method: "POST",
        body: JSON.stringify({ scenarios: selected }),
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

  const total = suite?.length ?? 0;
  const passed = suite?.filter((s) => s.ok).length ?? 0;
  const failed = total - passed;
  const countFor = (f: SuiteFilter) => (f === "all" ? total : f === "passed" ? passed : failed);

  const rows = suite
    ? suite
        .filter((s) => (filter === "all" ? true : filter === "passed" ? s.ok : !s.ok))
        .slice()
        .sort(scenarioComparator(sortKey, sortDir))
    : [];

  const activeChip =
    "border-slate-800 bg-slate-800 text-white";
  const idleChip =
    "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";
  const chipCls =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition";

  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-800">Sandbox scenario suite</h2>
          <p className="text-xs text-slate-500">
            Validates shipped PRAL invoice fixtures against the sandbox — no invoices are posted.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-win-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-win-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={runSuite}
          disabled={running || selected.length === 0}
        >
          {running ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white align-[-1px]" />
              Running…
            </>
          ) : (
            `${suite ? "Re-run" : "Run"} suite${selected.length ? ` · ${selected.length}` : ""}`
          )}
        </button>
      </div>

      {catalogue && ids.length > 0 && (
        <details className="group mb-4 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span className="text-[10px] text-slate-400 transition-transform group-open:rotate-90">▸</span>
              Scenarios to validate
              <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                {selected.length}/{ids.length} selected
              </span>
            </span>
            <span className="text-xs text-slate-400">Edit selection</span>
          </summary>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-400">Uncheck fixtures you do not want sent to the sandbox.</p>
              <button type="button" onClick={toggleAll} className="text-xs font-medium text-win-600 underline">
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="mt-2 grid max-h-60 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-2 xl:grid-cols-3">
              {ids.map((id) => (
                <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} className="accent-emerald-600" />
                  <span className="font-mono text-xs text-slate-500">{id}</span>
                  <span className="min-w-0 truncate text-slate-700">{catalogue[id]?.name ?? id}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Some sale types (steel, petroleum, retailer, HS-restricted fixtures) only validate for sellers registered for that
              business category — those scenarios are reported as failed for a generic registration.
            </p>
          </div>
        </details>
      )}

      {suite && suite.length > 0 && (
        <>
          <div className="mb-3 rounded-xl border border-slate-200/80 bg-white p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {passed} passed
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {passed}/{total} valid
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                {failed} failed
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${failed === 0 ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{ width: `${total ? Math.round((passed / total) * 100) : 0}%` }}
              />
            </div>
            {failed > 0 && (
              <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
                Failed scenarios usually reflect sale types your seller registration/business category is not set up for, or HS-code
                mismatches inside PRAL&apos;s shipped fixtures — not transport or token errors.
              </p>
            )}
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "passed", "failed"] as SuiteFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`${chipCls} ${filter === f ? activeChip : idleChip}`}
                >
                  {f === "all" ? "All" : f === "passed" ? "Passed" : "Failed"} · {countFor(f)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400">Sort</span>
              {(Object.keys(sortLabels) as SortKey[]).map((key) => {
                const active = sortKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSort(key)}
                    className={`${chipCls} ${active ? "border-slate-300 bg-slate-100 text-slate-700" : idleChip}`}
                  >
                    {sortLabels[key]}
                    {active && <span className="font-mono">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((s) => {
                const bad = !s.ok;
                return (
                  <div
                    key={s.id}
                    className={`flex flex-col gap-2 rounded-xl border p-3 ${bad ? "border-rose-100 bg-rose-50/50" : "border-emerald-100 bg-emerald-50/30"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] font-semibold text-slate-400">{s.id}</div>
                        <h4 className="mt-0.5 truncate text-sm font-semibold text-slate-800" title={s.name}>
                          {s.name}
                        </h4>
                      </div>
                      {bad ? (
                        <span className={`${badPill} shrink-0`}>{s.error_code ? `Fail · ${s.error_code}` : "Failed"}</span>
                      ) : (
                        <span className={`${okPill} shrink-0`}>Pass · {s.status_code}</span>
                      )}
                    </div>
                    {(s.sale_type || s.buyer) && (
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        {s.sale_type && (
                          <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-medium text-slate-500 ring-1 ring-slate-200/70">
                            {s.sale_type}
                          </span>
                        )}
                        {s.buyer && (
                          <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-slate-400 ring-1 ring-slate-200/70">
                            {s.buyer} buyer
                          </span>
                        )}
                      </div>
                    )}
                    {bad && s.error && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-rose-700" title={s.error}>
                        {s.error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              No {filter === "all" ? "" : filter} scenarios to show.
            </p>
          )}
        </>
      )}

      {!suite && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-500">No results yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Press “Run suite” to validate the selected fixtures against the PRAL sandbox and see per-scenario pass/fail results.
          </p>
        </div>
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
