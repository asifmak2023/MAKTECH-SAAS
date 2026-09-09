"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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

const card = "border border-[#e5e5e5] bg-white p-4";
const okPill = "inline-flex bg-black px-2 py-0.5 text-xs text-white";
const badPill = "inline-flex border border-black px-2 py-0.5 text-xs text-black";
const mutedPill = "inline-flex border border-[#e5e5e5] bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#525252]";
const DEFAULT_WHITELIST_IP = "161.97.107.236";

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

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link className="text-sm text-black underline underline-offset-4" href="/settings">← Settings</Link>
          <p className="eyebrow mt-4 mb-2">Integration</p>
          <h1 className="text-3xl font-medium tracking-tight">FBR digital invoicing setup</h1>
          <p className="mt-1 text-sm leading-relaxed text-[#767676]">
            Connect your workspace to Pakistan Revenue Automation Limited (PRAL) — sandbox first, then production.
            This wizard matches the official FBR IRIS steps. You will switch between the{" "}
            <strong className="text-slate-700">FBR IRIS portal</strong> (where FBR issues credentials) and{" "}
            <strong className="text-slate-700">this page</strong> (where your credentials are configured and tested). Each step says exactly where to act.
          </p>
        </div>

        {notice && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}
        {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

        <FbrWizard data={data} reload={reload} setNotice={setNotice} setError={setError} />
      </div>
    </AppShell>
  );
}

type StepRow = {
  key: string;
  step: number;
  title: string;
  where: string;
  done: boolean;
  locked: boolean;
};

function FbrWizard({
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
  const ob = data.onboarding;
  const [ipConfirmed, setIpConfirmed] = useState(false);

  const steps: StepRow[] = [
    {
      key: "profile",
      step: 1,
      title: "Seller profile",
      where: "In this app",
      done: ob.seller_profile_complete,
      locked: false,
    },
    {
      key: "sandbox",
      step: 2,
      title: "Sandbox token & API details",
      where: "FBR IRIS → this app",
      done: ob.sandbox_configured,
      locked: !ob.seller_profile_complete,
    },
    {
      key: "suite",
      step: 3,
      title: "Run sandbox scenario tests (SN001…)",
      where: "In this app",
      done: ob.sandbox_suite_passed,
      locked: !ob.sandbox_configured,
    },
    {
      key: "production",
      step: 4,
      title: "Production token & go live",
      where: "FBR IRIS → this app",
      done: ob.production_active,
      locked: !ob.sandbox_suite_passed,
    },
    {
      key: "ip",
      step: 5,
      title: "Whitelist your server IP",
      where: "FBR IRIS",
      done: ob.production_active && ipConfirmed,
      locked: !ob.production_active,
    },
  ];

  const pointer = steps.findIndex((s) => !s.done);
  const initialKey = pointer >= 0 ? steps[pointer].key : "done";
  const [activeKey, setActiveKey] = useState<string>(initialKey);
  const prevPointer = useRef<number>(-1);

  useEffect(() => {
    const cur = prevPointer.current;
    prevPointer.current = pointer;
    if (pointer < 0 && cur >= 0) {
      setActiveKey("done");
      return;
    }
    if (pointer > cur && pointer >= 0) {
      setActiveKey(steps[pointer].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointer]);

  const allDone = pointer < 0;

  return (
    <div className="space-y-6">
      <WizardProgress steps={steps} activeKey={activeKey} onSelect={setActiveKey} />

      {allDone ? (
        <div className="border border-emerald-600/40 bg-emerald-50/60 p-5">
          <p className="font-label text-[11px] uppercase tracking-[0.14em] text-emerald-800">Wizard complete</p>
          <h2 className="mt-1 text-lg font-semibold text-emerald-900">Production is active.</h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-800">
            New invoices now validate and post to PRAL production. If FBR has not yet approved your IP allowlist, PRAL may reject or time out
            live calls until step 5 is approved — keep the allowlist request details handy.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="font-label text-[11px] uppercase tracking-[0.14em] text-slate-400">
            Next up — step {steps[pointer].step} of {steps.length}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-800">{steps[pointer].title}</h2>
          <p className="mt-1 text-xs text-slate-500">Where: {steps[pointer].where}</p>
        </div>
      )}

      {activeKey === "profile" && <ProfileStep done={ob.seller_profile_complete} />}

      {activeKey === "sandbox" && (
        <SandboxStep
          data={data}
          reload={reload}
          setNotice={setNotice}
          setError={setError}
        />
      )}

      {activeKey === "suite" && (
        <SuiteStep
          ob={ob}
          reload={reload}
          setNotice={setNotice}
          setError={setError}
        />
      )}

      {activeKey === "production" && (
        <ProductionStep
          data={data}
          reload={reload}
          setNotice={setNotice}
          setError={setError}
        />
      )}

      {activeKey === "ip" && (
        <WhitelistStep
          data={data}
          reload={reload}
          ipConfirmed={ipConfirmed}
          onConfirm={() => {
            setIpConfirmed(true);
            setNotice("IP allowlist step marked as submitted. FBR approval happens in IRIS.");
          }}
        />
      )}
    </div>
  );
}

function WizardProgress({
  steps,
  activeKey,
  onSelect,
}: {
  steps: StepRow[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <ol className="space-y-1">
      {steps.map((s) => {
        const active = s.key === activeKey;
        return (
          <li key={s.key}>
            <button
              type="button"
              disabled={s.locked}
              onClick={() => onSelect(s.key)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                s.locked
                  ? "cursor-not-allowed border-slate-100 bg-slate-50/70 opacity-70"
                  : active
                    ? "border-slate-900 bg-white"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                  s.done ? "bg-emerald-500 text-white" : s.locked ? "bg-slate-200 text-slate-400" : "bg-slate-800 text-white"
                }`}
              >
                {s.done ? "✓" : s.step}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium ${s.done ? "text-emerald-800" : active ? "text-slate-900" : "text-slate-700"}`}>
                  {s.step}. {s.title}
                </span>
                <span className="block text-[11px] text-slate-400">{s.where}</span>
              </span>
              {s.locked && <span className="text-[10px] uppercase tracking-wider text-slate-400">Locked</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ProfileStep({ done }: { done: boolean }) {
  return (
    <section className="border border-[#e5e5e5] bg-white p-5">
      <p className="font-label text-[11px] uppercase tracking-[0.14em] text-slate-400">Step 1 · Seller profile</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-800">Confirm your seller details in this app</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Your <strong>NTN/CNIC</strong> and <strong>business name</strong> must match your FBR records exactly — the sandbox and production
        tokens are issued against this registration number. A mismatch causes PRAL error <code className="rounded bg-slate-100 px-1">0401</code>.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
        <li>
          Open <Link className="font-medium text-black underline underline-offset-4" href="/settings">Settings → Seller profile</Link>.
        </li>
        <li>Enter your seller business name and NTN/CNIC (add province and address to match the token registration).</li>
        <li>Return here — the next step unlocks once the profile is complete.</li>
      </ol>
      {done && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Seller profile is complete.</p>}
    </section>
  );
}

function SandboxStep({
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
  const env = data.environments.sandbox;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-label text-[11px] uppercase tracking-[0.14em] text-slate-400">Step 2 · Do these steps on FBR IRIS first</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-800">Get your sandbox API details &amp; token</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            Log in to FBR IRIS at{" "}
            <a className="font-medium text-black underline underline-offset-4" href="https://iris.fbr.gov.pk" target="_blank" rel="noreferrer">
              iris.fbr.gov.pk
            </a>{" "}
            with your Registration Number / NTN and IRIS password.
          </li>
          <li>Open <strong>Digital Invoicing</strong> from the IRIS menu.</li>
          <li>
            Open <strong>Integration Status</strong>, select your Registration Number, and review the <strong>Technical Details</strong> and{" "}
            <strong>IP Details</strong>. You will see the <strong>Sandbox Environment</strong> section here.
          </li>
          <li>
            In the Sandbox Environment section click <strong>View Web API Details</strong> and copy the <strong>Sandbox API URL</strong> and{" "}
            <strong>Sandbox Token</strong>. These are the values for this page.
          </li>
        </ol>
      </section>

      <EnvPanel
        title="Sandbox credentials"
        env={env}
        guide={<SandboxGuide />}
        canEdit
        onChanged={reload}
        setNotice={setNotice}
        setError={setError}
      />
    </div>
  );
}

function SandboxGuide() {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
      <li>Paste the sandbox token and API URL you copied from IRIS → Digital Invoicing → Integration Status → Sandbox Environment → View Web API Details.</li>
      <li>Leave the base URL on the PRAL gateway default (<code className="rounded bg-slate-100 px-1">https://gw.fbr.gov.pk</code>). Sandbox endpoints carry the <code className="rounded bg-slate-100 px-1">_sb</code> suffix.</li>
      <li>Save, then click <strong>Run token test</strong> to confirm IRIS accepts the token for your seller registration.</li>
      <li>Sandbox submissions never post invoices — everything stays in PRAL&apos;s test environment.</li>
    </ol>
  );
}

function SuiteStep({
  ob,
  reload,
  setNotice,
  setError,
}: {
  ob: FbrShow["onboarding"];
  reload: () => Promise<unknown>;
  setNotice: (m: string) => void;
  setError: (m: string) => void;
}) {
  return (
    <div className="space-y-4">
      {!ob.sandbox_tested && (
        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Tip: run the <strong>token test</strong> first (step 2) so a transport or token problem is obvious before you run the full suite.
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-label text-[11px] uppercase tracking-[0.14em] text-slate-400">Step 3 · In this app</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-800">Prove your integration with the scenario suite</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          FBR expects your application to handle the invoice scenarios (SN001, SN002, …) that apply to your Business Nature and sector. Run
          the suite below against the sandbox — validation only, nothing is posted. Failed scenarios usually mean the fixture&apos;s sale type is
          outside the categories your registration is set up for.
        </p>
      </section>

      <SuitePanel reload={reload} setNotice={setNotice} setError={setError} />

      <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4">
        <p className="text-sm font-semibold text-emerald-800">Keep your results as proof</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
          Save the pass list (scenario IDs + returned statuses) shown above. Once the required sandbox scenarios succeed, FBR/PRAL issues your{" "}
          <strong>production token automatically</strong> — there is no fixed 24/48-hour waiting period. Move to step 4 and check{" "}
          <strong>Integration Status → Production Environment</strong> in IRIS.
        </p>
      </div>
    </div>
  );
}

function ProductionStep({
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
  const ob = data.onboarding;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-label text-[11px] uppercase tracking-[0.14em] text-slate-400">Step 4 · IRIS first, then this app</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-800">Production token &amp; going live</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            In IRIS open <strong>Integration Status → Production Environment</strong> for your registration number.
          </li>
          <li>
            After your sandbox test invoices were submitted successfully, FBR/PRAL <strong>generates the production token automatically</strong>{" "}
            — you do not need to request it or wait a fixed number of hours. If it is not there yet, confirm every required SN scenario passed in step 3.
          </li>
          <li>Copy the production token and paste it below. Never reuse the sandbox token — they are not interchangeable.</li>
          <li>Save, run the production token test, then click <strong>Activate production</strong>. Live invoices then post to PRAL.</li>
        </ol>
      </section>

      <ProductionPanel data={data} reload={reload} setNotice={setNotice} setError={setError} />

      {ob.production_active && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700">Before you go live, remember</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
            <li>Your server IP must be allowlisted by PRAL (step 5) or live calls can be rejected or time out.</li>
            <li>Tokens are encrypted and never shown again after saving — store a copy somewhere safe.</li>
            <li>Switch back to sandbox anytime by activating it here if you need to re-test.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function WhitelistStep({
  data,
  reload,
  ipConfirmed,
  onConfirm,
}: {
  data: FbrShow;
  reload: () => Promise<unknown>;
  ipConfirmed: boolean;
  onConfirm: () => void;
}) {
  const prodCfg = data.environments.production?.config ?? {};
  const current = prodCfg.whitelist_ip?.trim() || DEFAULT_WHITELIST_IP;
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — user can copy manually */
    }
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ip = String(new FormData(e.currentTarget).get("whitelist_ip") ?? "").trim();
    if (!ip) return;
    setSaving(true);
    try {
      await api("/api/settings/fbr/production", { method: "PUT", body: JSON.stringify({ whitelist_ip: ip }) });
      await reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="font-label text-[11px] uppercase tracking-[0.14em] text-slate-400">Step 5 · Do this on FBR IRIS</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-800">Whitelist your production server IP</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        PRAL only accepts gateway calls from IP addresses it has allowlisted for your registration. This is submitted in IRIS, not in this app
        — FBR approves the request before production traffic flows reliably.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <p className="font-label text-[11px] uppercase tracking-[0.14em] text-slate-500">Public outbound IP of this server</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Give this exact value to PRAL. If you are on a different hosting server, use that server&apos;s public outbound IP instead.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums">{current}</code>
          <button type="button" className="btn-ghost" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
        <li>In IRIS → Digital Invoicing, open the <strong>IP Details / IP Whitelisting</strong> section.</li>
        <li>Enter your <strong>hosting server company</strong>, <strong>hosting server country</strong>, and the <strong>public IP</strong> above.</li>
        <li>Submit the whitelisting request and wait for FBR to approve/activate it.</li>
      </ol>

      <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <label>Record the IP this workspace posts from (optional)</label>
          <input name="whitelist_ip" defaultValue={current} placeholder={DEFAULT_WHITELIST_IP} />
        </div>
        <div className="flex items-end">
          <button className="bg-black text-white" disabled={saving}>{saving ? "Saving…" : "Save IP"}</button>
        </div>
      </form>

      {ipConfirmed ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Marked as submitted. Approval happens on the FBR side — if you see transport/IP errors later, the allowlist may still be pending.
        </p>
      ) : (
        <button type="button" onClick={onConfirm} className="mt-4 bg-emerald-600 px-4 py-2 text-sm text-white">
          I&apos;ve submitted the allowlist request in IRIS
        </button>
      )}
    </section>
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
    for (const key of ["base_url", "validate_endpoint", "submit_endpoint", "whitelist_ip"]) {
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
          <p className="mt-0.5 text-xs text-slate-400">
            {mode === "production" ? "Live credentials — submissions post to PRAL." : "Testing credentials — invoices are never posted."}
          </p>
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
            <label>Token {env.has_token ? "(leave blank to keep current)" : ""}</label>
            <input name="token" type="password" autoComplete="off" placeholder={env.has_token ? "••••••••" : "Paste token"} />
            <p className="mt-1 text-xs text-[#525252]">
              Encrypted at rest — never shown again after saving. Each {mode} key can be bound to only one account; if
              another account already registered this token, saving is rejected.
            </p>
          </div>
          <div className="md:col-span-2">
            <label>Whitelist IP</label>
            <input
              name="whitelist_ip"
              autoComplete="off"
              defaultValue={cfg.whitelist_ip || DEFAULT_WHITELIST_IP}
              placeholder={DEFAULT_WHITELIST_IP}
            />
            <p className="mt-1 text-xs text-[#525252]">
              Public outbound IP of this server. Provide it in IRIS → Digital Invoicing when PRAL asks for your IP to allowlist.
            </p>
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
            <button className="bg-black text-white" disabled={saving}>{saving ? "Saving…" : `Save ${title} configuration`}</button>
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
          className="inline-flex items-center gap-2 bg-black px-3.5 py-1.5 text-white hover:bg-[#262626]"
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
              <button type="button" onClick={toggleAll} className="text-xs font-medium text-black underline underline-offset-4">
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
    for (const key of ["base_url", "validate_endpoint", "submit_endpoint", "whitelist_ip"]) {
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
            <p className="mt-0.5 text-xs text-slate-400">
              Live credentials — submissions post to PRAL. Tokens are encrypted and never displayed again.
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className={prod?.configured ? okPill : mutedPill}>{prod?.configured ? "Configured" : "Not configured"}</span>
              {prod?.tested && <span className={okPill}>Token tested</span>}
              {ob.production_active && <span className="inline-flex bg-black px-2 py-0.5 text-xs text-white">Active environment</span>}
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
          <label>Token {prod?.has_token ? "(leave blank to keep current)" : ""}</label>
          <input name="token" type="password" autoComplete="off" placeholder={prod?.has_token ? "••••••••" : "Paste production token"} />
        </div>
        <div className="md:col-span-2">
          <label>Whitelist IP</label>
          <input
            name="whitelist_ip"
            autoComplete="off"
            defaultValue={prodCfg.whitelist_ip || DEFAULT_WHITELIST_IP}
            placeholder={DEFAULT_WHITELIST_IP}
          />
          <p className="mt-1 text-xs text-[#525252]">
            Public outbound IP of this server. Provide it in IRIS → Digital Invoicing when PRAL asks for your IP to allowlist.
          </p>
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
          <button className="bg-black text-white" disabled={saving || activating}>{saving ? "Saving…" : "Save production configuration"}</button>
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
