import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../lib/api";
import { Client, clientDisplayName } from "../lib/clients";
import { mergeOption } from "../lib/provinces";
import { useTheme } from "../lib/ThemeContext";
import { fonts } from "../lib/theme";
import { AlertBanner, Button, Field, SelectField } from "./primitives";

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
  buyer_business_name: string;
  buyer_ntn_cnic: string;
  buyer_province: string;
  buyer_address: string;
  buyer_registration_type: string;
  buyer_email: string;
  buyer_phone: string;
};

export type InvoiceData = {
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

const EMPTY_UOM = "Numbers, pieces, units";
const EMPTY_SALE_TYPE = "Goods at standard rate (default)";
const EMPTY_RATE = "18%";

function emptyItem(): Item {
  return {
    hs_code: "0101.2100",
    product_description: "",
    rate: EMPTY_RATE,
    uom: EMPTY_UOM,
    quantity: 1,
    value_sales_excluding_st: 0,
    sale_type: EMPTY_SALE_TYPE,
  };
}

function taxRate(rate: string) {
  const n = parseFloat(rate.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n / 100 : 0;
}

function buyerFromClient(c: Client): BuyerFields {
  return {
    buyer_business_name: clientDisplayName(c),
    buyer_ntn_cnic: c.ntn_cnic || c.strn || "",
    buyer_province: c.province || "",
    buyer_address: c.address || "",
    buyer_registration_type: c.registration_type || "Registered",
    buyer_email: c.email || "",
    buyer_phone: c.phone || "",
  };
}

export default function InvoiceForm({
  invoice,
  prefillClientId,
}: {
  invoice?: InvoiceData | null;
  prefillClientId?: number | string | null;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const editing = Boolean(invoice?.id);
  const locked = editing && !!invoice?.status && !["draft", "failed", "rejected"].includes(invoice.status);

  const [client, setClient] = useState<Client | null>(invoice?.customer || null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [buyer, setBuyer] = useState<BuyerFields>({
    buyer_business_name: invoice?.buyer_business_name ?? "",
    buyer_ntn_cnic: invoice?.buyer_ntn_cnic ?? "",
    buyer_province: invoice?.buyer_province ?? "",
    buyer_address: invoice?.buyer_address ?? "",
    buyer_registration_type: invoice?.buyer_registration_type ?? "Registered",
    buyer_email: invoice?.buyer_email ?? "",
    buyer_phone: invoice?.buyer_phone ?? "",
  });
  const [invoiceType, setInvoiceType] = useState(invoice?.invoice_type ?? "Sale Invoice");
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoice_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [refNo, setRefNo] = useState(invoice?.invoice_ref_no ?? "");
  const [scenarioId, setScenarioId] = useState(invoice?.scenario_id ?? "");
  const [items, setItems] = useState<Item[]>(() =>
    invoice?.items && invoice.items.length > 0 ? invoice.items.map((i) => ({ ...i })) : [emptyItem()],
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [provinces, setProvinces] = useState<string[]>(["Sindh", "Punjab", "Khyber Pakhtunkhwa", "Balochistan"]);
  const [saleTypes, setSaleTypes] = useState<string[]>([EMPTY_SALE_TYPE]);
  const [uoms, setUoms] = useState<string[]>([EMPTY_UOM, "Kilogram", "Litre"]);

  useEffect(() => {
    api<{ data: Client[] }>("/api/customers?status=active&per_page=300")
      .then((res) => setClients(res.data || []))
      .catch(() => undefined);
    api<Array<Record<string, string>>>("/api/reference/provinces")
      .then((rows) =>
        setProvinces((prev) =>
          mergeOption(
            rows.map((r) => r.stateProvinceDesc || r.name || r.description).filter(Boolean),
            prev[0],
          ),
        ),
      )
      .catch(() => undefined);
    api<Array<Record<string, string>>>("/api/reference/sale-types")
      .then((rows) =>
        setSaleTypes((prev) =>
          mergeOption(
            rows.map((r) => r.transactioN_DESC || r.name || r.description).filter(Boolean),
            prev[0],
          ),
        ),
      )
      .catch(() => undefined);
    api<Array<Record<string, string>>>("/api/reference/uoms")
      .then((rows) =>
        setUoms((prev) => mergeOption(rows.map((r) => r.uom || r.description || r.name).filter(Boolean), prev[0])),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!prefillClientId) return;
    api<{ customer: Client }>(`/api/customers/${prefillClientId}`)
      .then((res) => {
        setClient(res.customer);
        setBuyer(buyerFromClient(res.customer));
        setClientQuery(clientDisplayName(res.customer));
      })
      .catch(() => undefined);
  }, [prefillClientId]);

  function pickClient(c: Client | null) {
    setClient(c);
    if (c) {
      setBuyer(buyerFromClient(c));
      setClientQuery(clientDisplayName(c));
    } else {
      setClientQuery("");
    }
  }

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function onSubmit() {
    if (locked) return;
    setLoading(true);
    setError("");
    try {
      const res = await api<{ id: number }>(editing ? `/api/invoices/${invoice!.id}` : "/api/invoices", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          invoice_type: invoiceType,
          invoice_date: invoiceDate,
          invoice_ref_no: refNo || null,
          scenario_id: scenarioId || null,
          customer_id: client?.id ?? null,
          ...buyer,
          items,
        }),
      });
      router.replace(`/invoices/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save invoice");
    } finally {
      setLoading(false);
    }
  }

  const term = clientQuery.trim().toLowerCase();
  const filtered = clients.filter((c) =>
    [clientDisplayName(c), c.email || "", c.phone || "", c.ntn_cnic || ""].join(" ").toLowerCase().includes(term),
  );

  return (
    <View>
      {locked ? (
        <AlertBanner
          tone="info"
          text={`Only draft, rejected or failed invoices can be edited. This invoice is currently ${invoice?.status}.`}
        />
      ) : null}

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 16 }}>
        <SelectField label="Invoice type" value={invoiceType} options={["Sale Invoice", "Debit Note"]} onChange={setInvoiceType} />
        <Field label="Invoice date" value={invoiceDate} onChangeText={setInvoiceDate} placeholder="YYYY-MM-DD" />
        <Field label="Reference no" value={refNo} onChangeText={setRefNo} />
        <Field label="Scenario ID (sandbox)" value={scenarioId} onChangeText={setScenarioId} placeholder="SN001" />
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 16 }}>
        <Field
          label="Client"
          value={clientQuery}
          onChangeText={(v) => {
            setClientQuery(v);
            if (client) setClient(null);
          }}
          placeholder="Search saved clients…"
        />
        {client ? (
          <Button label="Clear" kind="ghost" onPress={() => pickClient(null)} style={{ marginBottom: 12 }} />
        ) : null}
        {!client && filtered.slice(0, 6).map((c) => (
          <Pressable
            key={c.id}
            onPress={() => pickClient(c)}
            style={{ minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.stroke, justifyContent: "center" }}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.foreground }}>{clientDisplayName(c)}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>{c.email || c.phone || " "}</Text>
          </Pressable>
        ))}
        <Text style={{ marginTop: 16, marginBottom: 8, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted }}>
          Bill to {client ? `— auto-filled from ${clientDisplayName(client)}. Edit freely for one-off invoices.` : ""}
        </Text>
        <Field label="Business name" value={buyer.buyer_business_name} onChangeText={(v) => setBuyer((p) => ({ ...p, buyer_business_name: v }))} />
        <Field label="Buyer NTN/CNIC" value={buyer.buyer_ntn_cnic} onChangeText={(v) => setBuyer((p) => ({ ...p, buyer_ntn_cnic: v }))} />
        <SelectField
          label="Buyer province"
          value={buyer.buyer_province}
          options={mergeOption(provinces, buyer.buyer_province)}
          onChange={(v) => setBuyer((p) => ({ ...p, buyer_province: v }))}
        />
        <SelectField
          label="Registration type"
          value={buyer.buyer_registration_type}
          options={["Registered", "Unregistered"]}
          onChange={(v) => setBuyer((p) => ({ ...p, buyer_registration_type: v }))}
        />
        <Field label="Buyer address" value={buyer.buyer_address} onChangeText={(v) => setBuyer((p) => ({ ...p, buyer_address: v }))} />
        <Field label="Buyer email" value={buyer.buyer_email} onChangeText={(v) => setBuyer((p) => ({ ...p, buyer_email: v }))} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Buyer phone" value={buyer.buyer_phone} onChangeText={(v) => setBuyer((p) => ({ ...p, buyer_phone: v }))} keyboardType="phone-pad" />
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "600", color: colors.foreground }}>Line items</Text>
          <Button label="Add item" kind="ghost" onPress={() => setItems((p) => [...p, emptyItem()])} />
        </View>
        {items.map((item, index) => {
          const st = item.value_sales_excluding_st * taxRate(item.rate);
          return (
            <View key={index} style={{ borderBottomWidth: 1, borderBottomColor: colors.stroke, paddingBottom: 12, marginBottom: 12 }}>
              <Field label="HS Code" value={item.hs_code} onChangeText={(v) => updateItem(index, { hs_code: v })} />
              <Field label="Description" value={item.product_description} onChangeText={(v) => updateItem(index, { product_description: v })} />
              <SelectField label="UoM" value={item.uom} options={mergeOption(uoms, item.uom)} onChange={(v) => updateItem(index, { uom: v })} />
              <Field
                label="Qty"
                value={String(item.quantity)}
                onChangeText={(v) => updateItem(index, { quantity: Number(v) || 0 })}
                keyboardType="decimal-pad"
              />
              <Field
                label="Value ex. ST"
                value={String(item.value_sales_excluding_st)}
                onChangeText={(v) => updateItem(index, { value_sales_excluding_st: Number(v) || 0 })}
                keyboardType="decimal-pad"
              />
              <SelectField
                label="Sale type"
                value={item.sale_type}
                options={mergeOption(saleTypes, item.sale_type)}
                onChange={(v) => updateItem(index, { sale_type: v })}
              />
              <Field label="Rate" value={item.rate} onChangeText={(v) => updateItem(index, { rate: v })} />
              <Field label="ST (auto)" value={st.toFixed(2)} editable={false} />
            </View>
          );
        })}
      </View>

      {error ? <AlertBanner tone="err" text={error} /> : null}
      <Button label={loading ? "Saving..." : editing ? "Save changes" : "Save draft"} onPress={onSubmit} disabled={loading || locked} loading={loading} />
    </View>
  );
}
