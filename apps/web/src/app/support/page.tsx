"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { fmtWhen } from "@/lib/admin";
import { statusStyles, formatStatus } from "@/lib/status";

type Session = {
  id: number;
  reference: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  opened_at: string | null;
  resolved_at: string | null;
  latestMessage?: { body: string; created_at: string } | null;
};

type Message = {
  id: number;
  sender_type: "admin" | "user" | "system";
  sender_id: number | null;
  body: string;
  created_at: string;
  sender?: { id: number; name: string; email: string } | null;
};

const card = "card-plain p-4";
const pill = (s: string) => `inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[s] || "status-sky"}`;
const filters = ["", "open", "in_progress", "resolved"] as const;

export default function SupportPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadList(f = filter) {
    setLoading(true);
    setError("");
    try {
      const q = f ? `?status=${f}` : "";
      const res = await api<{ data: Session[] }>(`/api/support/sessions${q}`);
      setSessions(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load support requests");
    } finally {
      setLoading(false);
    }
  }

  async function open(s: Session) {
    setSelected(s);
    try {
      const res = await api<Session & { messages: Message[] }>(`/api/support/sessions/${s.id}`);
      setThread(res.messages);
    } catch (e) {
      setThread([]);
      setError(e instanceof Error ? e.message : "Failed to load conversation");
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const created = await api<Session & { messages: Message[] }>("/api/support/sessions", {
        method: "POST",
        body: JSON.stringify({
          subject: f.get("subject"),
          category: f.get("category"),
          priority: f.get("priority"),
          message: f.get("message"),
        }),
      });
      setShowNew(false);
      setNotice(`Request ${created.reference} opened — the platform team has been notified.`);
      await loadList("");
      setSelected(created);
      setThread(created.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open request");
    } finally {
      setBusy(false);
    }
  }

  async function reply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const body = String(new FormData(e.currentTarget).get("body") ?? "");
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api(`/api/support/sessions/${selected.id}/messages`, { method: "POST", body: JSON.stringify({ body }) });
      e.currentTarget.reset();
      await open(selected);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(s: Session) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/support/sessions/${s.id}/resolve`, { method: "POST" });
      setNotice("Marked as resolved. Thanks for using support!");
      await loadList();
      if (selected) await open({ ...selected, status: "resolved" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Help</p>
          <h1 className="text-3xl font-medium tracking-tight">Support</h1>
          <p className="mt-1 text-sm text-[#767676]">Questions about invoicing, PRAL, billing or your account.</p>
        </div>
        <button className={showNew ? "btn-secondary" : "btn-primary"} onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancel" : "New request"}
        </button>
      </div>

      {notice && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      {showNew && (
        <form onSubmit={createSession} className={`${card} mb-6 grid gap-3 md:grid-cols-2`}>
          <h2 className="text-lg font-semibold md:col-span-2">Open a support request</h2>
          <div className="md:col-span-2">
            <label>Subject</label>
            <input name="subject" required placeholder="What do you need help with?" />
          </div>
          <div>
            <label>Category</label>
            <select name="category" defaultValue="technical">
              <option value="billing">Billing / payments</option>
              <option value="pral">PRAL / FBR</option>
              <option value="invoice">Invoice</option>
              <option value="customer">Customer</option>
              <option value="technical">Technical</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label>Priority</label>
            <select name="priority" defaultValue="normal">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label>Message</label>
            <textarea name="message" rows={4} required placeholder="Describe the issue — include invoice or order references if relevant." />
          </div>
          <div className="md:col-span-2">
            <button className="bg-black text-white" disabled={busy}>{busy ? "Opening…" : "Open request"}</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className={`${card} max-h-[70vh] overflow-y-auto lg:col-span-2`}>
          <div className="mb-2 flex w-fit border border-[#e5e5e5] text-xs">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); loadList(f); }}
                className={`px-2.5 py-1 capitalize ${
                  filter === f ? "bg-black text-white" : "bg-white text-[#525252]"
                }`}
              >
                {f === "" ? "All" : f}
              </button>
            ))}
          </div>
          {loading && <p className="text-sm text-slate-500">Loading...</p>}
          {!loading && sessions.length === 0 && <p className="text-sm text-slate-400">No requests yet — open one above.</p>}
          <ul className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <li key={s.id}>
                <button onClick={() => open(s)} className={`w-full px-2 py-3 text-left ${selected?.id === s.id ? "bg-[#f5f5f5]" : "hover:bg-[#fafafa]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{s.reference}</p>
                    <span className={pill(s.status)}>{formatStatus(s.status)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-700">{s.subject}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.category} · {s.priority}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${card} flex max-h-[70vh] flex-col lg:col-span-3`}>
          {!selected ? (
            <p className="text-sm text-slate-400">Select a request to view the conversation.</p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-semibold text-slate-800">{selected.subject}</h2>
                  <p className="text-xs text-slate-500">{selected.reference} · {selected.category} · opened {fmtWhen(selected.opened_at)}</p>
                </div>
                {selected.status !== "resolved" && selected.status !== "archived" && (
                  <button className="bg-black px-3 py-1.5 text-white" onClick={() => resolve(selected)} disabled={busy}>
                    Mark resolved
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto py-3">
                {thread.map((m) => {
                  const isAdmin = m.sender_type === "admin";
                  return (
                    <div key={m.id} className={`max-w-[85%] ${isAdmin ? "" : "ml-auto"}`}>
                      <div className={`border border-[#e5e5e5] px-3 py-2 text-sm ${m.sender_type === "system" ? "bg-[#f5f5f5] text-[#525252]" : isAdmin ? "bg-[#f5f5f5] text-black" : "bg-black text-white"}`}>
                        {m.body}
                      </div>
                      <p className={`mt-0.5 text-xs text-slate-400 ${!isAdmin ? "text-right" : ""}`}>
                        {m.sender_type === "system" ? "System" : isAdmin ? (m.sender?.name ?? "Platform support") : "You"} · {fmtWhen(m.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
              {selected.status !== "resolved" && (
                <form onSubmit={reply} className="flex items-end gap-2 border-t border-slate-100 pt-3">
                  <textarea name="body" rows={2} required placeholder="Write a message…" className="flex-1" />
                  <button className="bg-black text-white" disabled={busy}>{busy ? "Sending…" : "Send"}</button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
