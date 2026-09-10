import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../lib/api";
import { Client } from "../lib/clients";
import { PAKISTAN_PROVINCES, provinceOptions } from "../lib/provinces";
import { useTheme } from "../lib/ThemeContext";
import { AlertBanner, Button, Field, SelectField } from "./primitives";

export default function ClientForm({ client }: { client?: Client | null }) {
  const router = useRouter();
  const { colors } = useTheme();
  const editing = Boolean(client?.id);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState(client?.business_name || "");
  const [name, setName] = useState(client?.name || "");
  const [email, setEmail] = useState(client?.email || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [ntn, setNtn] = useState(client?.ntn_cnic || "");
  const [strn, setStrn] = useState(client?.strn || "");
  const [regType, setRegType] = useState(client?.registration_type || "Registered");
  const [province, setProvince] = useState(client?.province || PAKISTAN_PROVINCES[0]);
  const [city, setCity] = useState(client?.city || "");
  const [address, setAddress] = useState(client?.address || "");
  const [notes, setNotes] = useState(client?.notes || "");

  async function onSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ id: number }>(editing ? `/api/customers/${client!.id}` : "/api/customers", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          name,
          business_name: businessName,
          ntn_cnic: ntn,
          strn,
          registration_type: regType,
          province,
          city,
          address,
          email,
          phone,
          notes,
        }),
      });
      router.replace(`/clients/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16 }}>
      <Field label="Business name" value={businessName} onChangeText={setBusinessName} />
      <Field label="Contact person" value={name} onChangeText={setName} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="NTN/CNIC" value={ntn} onChangeText={setNtn} />
      <Field label="STRN" value={strn} onChangeText={setStrn} />
      <SelectField label="Registration type" value={regType} options={["Registered", "Unregistered"]} onChange={setRegType} />
      <SelectField label="Province" value={province} options={provinceOptions(province)} onChange={setProvince} />
      <Field label="City" value={city} onChangeText={setCity} />
      <Field label="Billing address" value={address} onChangeText={setAddress} />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      {error ? <AlertBanner tone="err" text={error} /> : null}
      <Button label={loading ? "Saving..." : editing ? "Save changes" : "Save client"} onPress={onSubmit} loading={loading} disabled={loading} />
    </View>
  );
}
