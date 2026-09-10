export type Client = {
  id: number;
  name: string | null;
  business_name: string | null;
  ntn_cnic: string | null;
  strn: string | null;
  cnic: string | null;
  registration_type: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  invoices_count?: number;
  notes?: string | null;
  created_at?: string | null;
};

export type RecentInvoice = {
  id: number;
  invoice_date: string;
  status: string;
  grand_total: number;
  buyer_business_name: string;
  fbr_invoice_number: string | null;
};

export type ClientShow = {
  customer: Client;
  recent_invoices: RecentInvoice[];
};

export function clientDisplayName(c: Pick<Client, "business_name" | "name"> | null | undefined) {
  return c?.business_name || c?.name || "";
}

export function clientTaxNo(c: Pick<Client, "ntn_cnic" | "strn" | "cnic"> | null | undefined) {
  return c?.ntn_cnic || c?.strn || c?.cnic || "";
}
