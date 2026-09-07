export type InvoiceStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'submitted'
  | 'failed'
  | 'rejected';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  domain?: string | null;
  seller_ntn_cnic?: string | null;
  seller_business_name?: string | null;
  seller_province?: string | null;
  seller_address?: string | null;
  seller_email?: string | null;
  seller_phone?: string | null;
  auto_submit_on_approval: boolean;
}

export interface User {
  id: number;
  tenant_id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
}

export interface InvoiceItem {
  id?: number;
  line_number?: number;
  hs_code: string;
  product_description: string;
  rate: string;
  uom: string;
  quantity: number;
  total_values?: number;
  value_sales_excluding_st: number;
  fixed_notified_value_or_retail_price?: number;
  sales_tax_applicable?: number;
  sales_tax_withheld_at_source?: number;
  extra_tax?: number;
  further_tax?: number;
  sro_schedule_no?: string;
  fed_payable?: number;
  discount?: number;
  sale_type: string;
  sro_item_serial_no?: string;
}

export interface Invoice {
  id: number;
  tenant_id: number;
  invoice_type: string;
  invoice_date: string;
  invoice_ref_no?: string | null;
  scenario_id?: string | null;
  seller_ntn_cnic: string;
  seller_business_name: string;
  seller_province: string;
  seller_address: string;
  buyer_ntn_cnic?: string | null;
  buyer_business_name: string;
  buyer_province: string;
  buyer_address: string;
  buyer_registration_type: string;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  status: InvoiceStatus;
  approval_token: string;
  rejection_note?: string | null;
  fbr_invoice_number?: string | null;
  last_error?: string | null;
  subtotal: number;
  sales_tax_total: number;
  further_tax_total: number;
  extra_tax_total: number;
  discount_total: number;
  grand_total: number;
  items?: InvoiceItem[];
  created_at?: string;
  submitted_at?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
  tenant: Tenant;
}
