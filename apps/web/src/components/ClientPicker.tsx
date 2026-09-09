"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Client, clientDisplayName, clientTaxNo } from "@/lib/clients";

export default function ClientPicker({
  client,
  onPick,
}: {
  client: Client | null;
  onPick: (client: Client | null) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(client ? clientDisplayName(client) : "");
  }, [client]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<{ data: Client[] }>("/api/customers?status=active&per_page=300")
      .then((res) => alive && setClients(res.data || []))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const term = query.trim().toLowerCase();
  const filtered = clients.filter((c) => {
    const haystack = [
      clientDisplayName(c),
      clientTaxNo(c),
      c.email || "",
      c.phone || "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });

  return (
    <div className="relative" ref={boxRef}>
      <label>Client</label>
      <div className="flex gap-2">
        <input
          placeholder="Search saved clients…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {client && (
          <button
            type="button"
            className="shrink-0 bg-slate-100 px-3 text-xs"
            onClick={() => {
              onPick(null);
              setQuery("");
            }}
          >
            Clear
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
          {loading && <p className="px-3 py-2 text-xs text-slate-400">Loading clients…</p>}
          {!loading && filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">
              No active clients. Add one under <span className="font-medium">Clients</span> first.
            </p>
          )}
          {!loading &&
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="block w-full border-b border-[#e5e5e5] px-3 py-2 text-left last:border-0 hover:bg-[#f5f5f5]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(c);
                  setOpen(false);
                }}
              >
                <span className="block text-sm font-medium text-slate-800">{clientDisplayName(c)}</span>
                <span className="block truncate text-xs text-slate-500">
                  {[c.name !== clientDisplayName(c) ? c.name : "", clientTaxNo(c) ? `Tax: ${clientTaxNo(c)}` : "", c.city || c.province || ""]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
