import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/lib/api";
import { Client, clientDisplayName, clientTaxNo } from "../../src/lib/clients";
import { useTheme } from "../../src/lib/ThemeContext";
import { fonts } from "../../src/lib/theme";
import MobileShell from "../../src/ui/MobileShell";
import { AlertBanner, Button, EmptyState, Eyebrow, Field, PageTitle, Segmented } from "../../src/ui/primitives";

type Filter = "active" | "archived" | "all";

export default function ClientsPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [rows, setRows] = useState<Client[] | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<{ data: Client[] }>(
      `/api/customers?status=${filter}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    )
      .then((res) => alive && setRows(res.data || []))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Load failed"));
    return () => {
      alive = false;
    };
  }, [filter, search, version]);

  async function toggleActive(client: Client) {
    setBusy(client.id);
    setError("");
    try {
      await api(`/api/customers/${client.id}/${client.is_active ? "archive" : "restore"}`, { method: "POST" });
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <MobileShell>
      <Eyebrow>Directory</Eyebrow>
      <View style={{ marginTop: 8, marginBottom: 16 }}>
        <PageTitle>Clients</PageTitle>
      </View>
      <Field value={search} onChangeText={setSearch} placeholder="Search name, tax no, email…" />
      <Button label="Add client" onPress={() => router.push("/clients/create")} style={{ marginBottom: 16 }} />
      <Segmented
        value={filter}
        onChange={(k) => setFilter(k as Filter)}
        options={[
          { key: "active", label: "Active" },
          { key: "archived", label: "Archived" },
          { key: "all", label: "All" },
        ]}
      />
      {error ? <AlertBanner tone="err" text={error} /> : null}
      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface }}>
        {(rows || []).map((c) => (
          <View
            key={c.id}
            style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.stroke, gap: 6 }}
          >
            <Pressable onPress={() => router.push(`/clients/${c.id}`)}>
              <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "500", color: colors.foreground, textDecorationLine: "underline" }}>
                {clientDisplayName(c)}
              </Text>
            </Pressable>
            {c.name && c.name !== clientDisplayName(c) ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>{c.name}</Text>
            ) : null}
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
              {[c.email, c.phone, clientTaxNo(c)].filter(Boolean).join(" · ") || "—"}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
              {c.invoices_count ?? 0} invoices
            </Text>
            {!c.is_active ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>Archived</Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <Button label="View" kind="ghost" onPress={() => router.push(`/clients/${c.id}`)} style={{ flex: 1 }} />
              <Button label="Edit" kind="ghost" onPress={() => router.push(`/clients/${c.id}/edit`)} style={{ flex: 1 }} />
              <Button
                label={c.is_active ? "Archive" : "Restore"}
                kind="danger"
                onPress={() => toggleActive(c)}
                disabled={busy === c.id}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ))}
        {rows && rows.length === 0 ? (
          <EmptyState text={filter === "active" && !search ? "No clients yet — add your first buyer." : "No clients match."} />
        ) : null}
      </View>
    </MobileShell>
  );
}
