import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { api } from "../src/lib/api";
import { provinceOptions } from "../src/lib/provinces";
import { useTheme } from "../src/lib/ThemeContext";
import { fonts } from "../src/lib/theme";
import MobileShell from "../src/ui/MobileShell";
import { AlertBanner, Button, Eyebrow, Field, LoadingBlock, PageTitle, SelectField, StatusChip } from "../src/ui/primitives";

type Tenant = {
  name: string;
  slug: string;
  seller_ntn_cnic?: string;
  seller_business_name?: string;
  seller_province?: string;
  seller_address?: string;
  seller_email?: string;
  seller_phone?: string;
  auto_submit_on_approval: boolean;
};

type Environment = {
  configured: boolean;
  tested: boolean;
  has_token: boolean;
  last_tested_at?: string | null;
};

type FbrShow = {
  environments: Record<string, Environment>;
  onboarding: {
    sandbox_suite_passed: boolean;
    production_active: boolean;
  };
};

function fmtWhen(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SettingsPage() {
  const { colors } = useTheme();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [fbr, setFbr] = useState<FbrShow | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [ntn, setNtn] = useState("");
  const [business, setBusiness] = useState("");
  const [province, setProvince] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [autoSubmit, setAutoSubmit] = useState(false);

  useEffect(() => {
    api<Tenant>("/api/settings")
      .then((t) => {
        setTenant(t);
        setName(t.name || "");
        setNtn(t.seller_ntn_cnic || "");
        setBusiness(t.seller_business_name || "");
        setProvince(t.seller_province || "");
        setAddress(t.seller_address || "");
        setEmail(t.seller_email || "");
        setPhone(t.seller_phone || "");
        setAutoSubmit(Boolean(t.auto_submit_on_approval));
      })
      .catch((err) => setError(err.message));
    api<FbrShow>("/api/settings/fbr")
      .then(setFbr)
      .catch(() => undefined);
  }, []);

  async function onSave() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await api<Tenant>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          name,
          seller_ntn_cnic: ntn,
          seller_business_name: business,
          seller_province: province,
          seller_address: address,
          seller_email: email,
          seller_phone: phone,
          auto_submit_on_approval: autoSubmit,
        }),
      });
      setTenant(updated);
      setMessage("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!tenant) {
    return (
      <MobileShell>
        {error ? <AlertBanner tone="err" text={error} /> : <LoadingBlock label="Loading..." />}
      </MobileShell>
    );
  }

  const sandbox = fbr?.environments.sandbox;
  const production = fbr?.environments.production;
  const ob = fbr?.onboarding;

  return (
    <MobileShell>
      <Eyebrow>Account</Eyebrow>
      <View style={{ marginTop: 8, marginBottom: 20 }}>
        <PageTitle>Settings</PageTitle>
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Business profile
        </Text>
        <Field label="Company name" value={name} onChangeText={setName} />
        <Field label="Seller NTN/CNIC" value={ntn} onChangeText={setNtn} />
        <Field label="Seller business name" value={business} onChangeText={setBusiness} />
        <SelectField label="Province" value={province} options={provinceOptions(province)} onChange={setProvince} />
        <Field label="Address" value={address} onChangeText={setAddress} />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Pressable
          onPress={() => setAutoSubmit((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, marginBottom: 12 }}
        >
          <Switch value={autoSubmit} onValueChange={setAutoSubmit} trackColor={{ true: colors.accent, false: colors.stroke }} />
          <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.foreground }}>
            Auto-submit to PRAL after buyer approval
          </Text>
        </Pressable>
        {message ? <AlertBanner tone="ok" text={message} /> : null}
        {error ? <AlertBanner tone="err" text={error} /> : null}
        <Button label={saving ? "Saving..." : "Save"} onPress={onSave} loading={saving} disabled={saving} />
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: "600", color: colors.foreground }}>
          FBR / PRAL integration
        </Text>
        <Text style={{ marginTop: 8, marginBottom: 16, fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>
          Configure a sandbox token, test it, then activate production from the guided setup. Tokens are encrypted at rest and never shown again after saving.
        </Text>
        <View style={{ borderWidth: 1, borderColor: colors.stroke, padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "600", color: colors.foreground }}>Sandbox</Text>
            <StatusChip status={sandbox?.configured ? "approved" : "pending"} label={sandbox?.configured ? "Configured" : "Not configured"} />
          </View>
          <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
            {sandbox?.configured ? "Configured" : "Not configured"}
          </Text>
          <Text style={{ marginTop: 4, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
            Token test: {sandbox?.tested ? "passed" : "not run"}
          </Text>
          <Text style={{ marginTop: 4, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
            Scenario suite: {ob?.sandbox_suite_passed ? "passed" : "not run"}
          </Text>
          {sandbox?.last_tested_at ? (
            <Text style={{ marginTop: 4, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>
              Last tested {fmtWhen(sandbox.last_tested_at)}
            </Text>
          ) : null}
        </View>
        <View style={{ borderWidth: 1, borderColor: colors.stroke, padding: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "600", color: colors.foreground }}>Production</Text>
            <StatusChip status={production?.configured ? "approved" : "pending"} label={production?.configured ? "Configured" : "Not configured"} />
          </View>
          <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
            Production token: {production?.has_token ? "set" : "not set"}
          </Text>
          <Text style={{ marginTop: 4, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
            Active environment: {ob?.production_active ? "yes" : "no"}
          </Text>
          <Text style={{ marginTop: 4, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
            Production token test: {production?.tested ? "passed" : "not run"}
          </Text>
          {production?.last_tested_at ? (
            <Text style={{ marginTop: 4, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>
              Last tested {fmtWhen(production.last_tested_at)}
            </Text>
          ) : null}
        </View>
      </View>
    </MobileShell>
  );
}
