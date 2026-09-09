"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClientPicker from "@/components/ClientPicker";
import { api } from "@/lib/api";
import { Client, clientDisplayName, ClientShow } from "@/lib/clients";

type Item = {
  hs_code: string;
  product_description: string;
  rate: string;
  uom: string;
  quantity: number;
  value_sales_excluding_st: number;
  sale_type: string;
};

type BuyerFields = {
  business_name: string;
  ntn_cnic: string;
  province: string;
  address: string;
  registration_type: string;
  email: string;
  phone: string;
};

type InvoiceData = {
  id?: number;
  invoice_type: string;
  invoice_date: string;
  invoice_ref_no?: string | null;
  scenario_id?: string | null;
  buyer_ntn_cnic?: string | null;
  buyer_business_name?: string | null;
  buyer_province?: string | null;
  buyer_address?: string | null;
  buyer_registration_type?: string | null;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  customer?: Client | null;
  status?: string;
  items?: Item[];
};

const EMPTY_ITEM = "Numbers, pieces, units";
const EMPTY_SALE_TYPE = "Goods at standard rate (default)";
const EMPTY_RATE = "18%";

function emptyItem(): Item {
  return {
    hs_code: "0101.2100",
    product_description: "",
    rate: EMPTY_RATE,
    uom: EMPTY_ITEM,
    quantity: 1,
    value_sales_excluding_st: 0,
    sale_type: EMPTY_SALE_TYPE,
  };
}

function taxRate(rate: string) {
  const n = parseFloat(rate.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n / 100 : 0;
}

function mergeOption(list: string[], value: string | null | undefined): string[] {
  if (!value) return list;
  return list.includes(value) ? list : [value, ...list];
}

function buyerFromClient(c: Client): BuyerFields {
  return {
    business_name: clientDisplayName(c),
    ntn_cnic: c.ntn_cnic || c.strn || "",
    province: c.province || "",
    address: c.address || "",
    registration_type: c.registration_type || "Registered",
    email: c.email || "",
    phone: c.phone || "",
  };
}

export default function InvoiceForm({
  invoice,
  initialClient,
  prefillClientId,
}: {
  invoice?: InvoiceData | null;
  initialClient?: Client | null;
  prefillClientId?: number | string | null;
}) {
  const router = useRouter();
  const editing = Boolean(invoice?.id);
  const locked =
    editing && !!invoice?.status && !["draft", "failed", "rejected"].includes(invoice.status);

  const [client, setClient] = useState<Client | null>(initialClient || invoice?.customer || null);
  const [buyer, setBuyer] = useState<BuyerFields>({
    business_name: invoice?.buyer_business_name ?? "",
    ntn_cnic: invoice?.buyer_ntn_cnic ?? "",
    province: invoice?.buyer_province ?? "",
    address: invoice?.buyer_address ?? "",
    registration_type: invoice?.buyer_registration_type ?? "Registered",
    email: invoice?.buyer_email ?? "",
    phone: invoice?.buyer_phone ?? "",
  });
  const [items, setItems] = useState<Item[]>(() =>
    invoice?.items && invoice.items.length > 0 ? invoice.items.map((i) => ({ ...i })) : [emptyItem()],
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [provinces, setProvinces] = useState<string[]>([
    "Sindh",
    "Punjab",
    "Khyber Pakhtunkhwa",
    "Balochistan",
  ]);
  const [saleTypes, setSaleTypes] = useState<string[]>([EMPTY_SALE_TYPE]);
  const [uoms, setUoms] = useState<string[]>([EMPTY_ITEM, "Kilogram", "Litre"]);

  useEffect(() => {
    api<Array<Record<string, string>>>("/api/reference/provinces")
      .then((rows) =>
        setProvinces((prev) => mergeOption(rows.map((r) => r.stateProvinceDesc || r.name || r.description).filter(Boolean), prev[0])),
      )
      .catch(() => undefined);
    api<Array<Record<string, string>>>("/api/reference/sale-types")
      .then((rows) =>
        setSaleTypes((prev) => mergeOption(rows.map((r) => r.transactioN_DESC || r.name || r.description).filter(Boolean), prev[0])),
      )
      .catch(() => undefined);
    api<Array<Record<string, string>>>("/api/reference/uoms")
      .then((rows) => setUoms((prev) => mergeOption(rows.map((r) => r.uom || r.description || r.name).filter(Boolean), prev[0])))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (prefillClientId) {
      api<ClientShow>(`/api/customers/${prefillClientId}`)
        .then((res) => {
          setClient(res.customer);
          setBuyer(buyerFromClient(res.customer));
        })
        .catch(() => undefined);
    }
  }, [prefillClientId]);

  function onPickClient(c: Client | null) {
    setClient(c);
    if (c) setBuyer(buyerFromClient(c));
  }

  function setBuyerField(key: keyof BuyerFields, value: string) {
    setBuyer((prev) => ({ ...prev, [key]: value }));
  }

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked) return;
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await api<{ id: number }>(editing ? `/api/invoices/${invoice!.id}` : "/api/invoices", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          invoice_type: form.get("invoice_type"),
          invoice_date: form.get("invoice_date"),
          invoice_ref_no: form.get("invoice_ref_no"),
          scenario_id: form.get("scenario_id"),
          customer_id: client?.id ?? null,
          ...buyer,
          items,
        }),
      });
      router.push(`/invoices/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save invoice");
    } finally {
      setLoading(false);
    }
  }

  const needsManualBuyer = !client;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {locked && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Only draft, rejected or failed invoices can be edited. This invoice is currently {invoice?.status}.
        </p>
      )}
      <section className="grid gap-4 border border-[#e5e5e5] bg-white p-5 md:grid-cols-3">
        <div>
          <label>Invoice type</label>
          <select name="invoice_type" defaultValue={invoice?.invoice_type ?? "Sale Invoice"}>
            <option>Sale Invoice</option>
            <option>Debit Note</option>
          </select>
        </div>
        <div>
          <label>Invoice date</label>
          <input
            name="invoice_date"
            type="date"
            required
            defaultValue={invoice?.invoice_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div>
          <label>Reference no</label>
          <input name="invoice_ref_no" defaultValue={invoice?.invoice_ref_no ?? ""} />
        </div>
        <div>
          <label>Scenario ID (sandbox)</label>
          <input name="scenario_id" placeholder="SN001" defaultValue={invoice?.scenario_id ?? ""} />
        </div>
      </section>

      <section className="border border-[#e5e5e5] bg-white p-5">
        <div className="mb-4 max-w-xl">
          <ClientPicker client={client} onPick={onPickClient} />
        </div>
        <div className="mt-4 border-t pt-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">
            Bill to {client ? `— auto-filled from ${clientDisplayName(client)}. Edit freely for one-off invoices.` : ""}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label>Business name</label>
              <input
                required={needsManualBuyer}
                value={buyer.business_name}
                onChange={(e) => setBuyerField("business_name", e.target.value)}
              />
            </div>
            <div>
              <label>Buyer NTN/CNIC</label>
              <input value={buyer.ntn_cnic} onChange={(e) => setBuyerField("ntn_cnic", e.target.value)} />
            </div>
            <div>
              <label>Buyer province</label>
              <select
                required={needsManualBuyer}
                value={buyer.province}
                onChange={(e) => setBuyerField("province", e.target.value)}
              >
                <option value="">Select province</option>
                {mergeOption(provinces, buyer.province).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Registration type</label>
              <select
                value={buyer.registration_type}
                onChange={(e) => setBuyerField("registration_type", e.target.value)}
              >
                <option>Registered</option>
                <option>Unregistered</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label>Buyer address</label>
              <input
                required={needsManualBuyer}
                value={buyer.address}
                onChange={(e) => setBuyerField("address", e.target.value)}
              />
            </div>
            <div>
              <label>Buyer email</label>
              <input
                type="email"
                value={buyer.email}
                onChange={(e) => setBuyerField("email", e.target.value)}
              />
            </div>
            <div>
              <label>Buyer phone</label>
              <input value={buyer.phone} onChange={(e) => setBuyerField("phone", e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      <section className="border border-[#e5e5e5] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Line items</h2>
          <button type="button" className="btn-ghost" onClick={() => setItems((p) => [...p, emptyItem()])}>
            Add item
          </button>
        </div>
        {items.map((item, index) => {
          const st = item.value_sales_excluding_st * taxRate(item.rate);
          return (
            <div key={index} className="mb-4 grid gap-3 border-b pb-4 md:grid-cols-6">
              <div>
                <label>HS Code</label>
                <input value={item.hs_code} onChange={(e) => updateItem(index, { hs_code: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label>Description</label>
                <input
                  value={item.product_description}
                  onChange={(e) => updateItem(index, { product_description: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>UoM</label>
                <select value={item.uom} onChange={(e) => updateItem(index, { uom: e.target.value })}>
                  {mergeOption(uoms, item.uom).map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Qty</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Value ex. ST</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.value_sales_excluding_st}
                  onChange={(e) => updateItem(index, { value_sales_excluding_st: Number(e.target.value) })}
                />
              </div>
              <div className="md:col-span-2">
                <label>Sale type</label>
                <select value={item.sale_type} onChange={(e) => updateItem(index, { sale_type: e.target.value })}>
                  {mergeOption(saleTypes, item.sale_type).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Rate</label>
                <input value={item.rate} onChange={(e) => updateItem(index, { rate: e.target.value })} />
              </div>
              <div>
                <label>ST (auto)</label>
                <input readOnly value={st.toFixed(2)} />
              </div>
            </div>
          );
        })}
      </section>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button className="bg-black text-white" disabled={loading || locked}>
        {loading ? "Saving..." : editing ? "Save changes" : "Save draft"}
      </button>
    </form>
  );
}
