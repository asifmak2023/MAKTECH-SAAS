export type TenantRow = {
  id: number;
  name: string;
  legal_name: string | null;
  slug: string;
  domain: string | null;
  status: string;
  registration_type: string | null;
  seller_ntn_cnic: string | null;
  seller_business_name: string | null;
  seller_province: string | null;
  seller_address: string | null;
  city: string | null;
  business_category: string | null;
  seller_email: string | null;
  seller_phone: string | null;
  billing_email: string | null;
  auto_submit_on_approval: boolean;
  is_active: boolean;
  integrator: string | null;
  fbr_mode: string | null;
  owner_user_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  users_count?: number;
  invoices_count?: number;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  next_page_url: string | null;
  prev_page_url: string | null;
};

export type PlanBrief = { id: number; code: string; name: string; price: string | number; billing_interval: string };
export type PackageBrief = { id: number; code: string; name: string; invoice_quantity: number; price: string | number };

export type TenantSubscription = {
  id: number;
  subscription_plan_id: number | null;
  status: string;
  billing_interval: string;
  price: string | number;
  invoice_limit: number | null;
  used_invoices: number;
  overage_allowed: boolean;
  auto_renew: boolean;
  current_period_end: string | null;
  next_billing_date: string | null;
  plan?: PlanBrief | null;
};

export type FbrIntegrationRow = {
  id: number;
  integrator: string;
  mode: string;
  status: string;
  config: Record<string, string>;
  last_test_response?: Record<string, unknown> | null;
  last_tested_at?: string | null;
};

export type TenantDetail = TenantRow & {
  owner: { id: number; name: string; email: string } | null;
  users: Array<{ id: number; name: string; email: string; role: string; is_active: boolean }>;
  subscriptions: TenantSubscription[];
  activeSubscription: TenantSubscription | null;
  fbrIntegrations: FbrIntegrationRow[];
  invoices_count: number;
  customers_count: number;
  products_count: number;
  billing_orders_count: number;
  payments_count: number;
};

export type BillingOrder = {
  id: number;
  order_number: string;
  order_type: string;
  status: string;
  description: string | null;
  currency: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  period_start: string | null;
  period_end: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  tenant?: { id: number; name: string; slug: string };
  plan?: PlanBrief | null;
  package?: PackageBrief | null;
};

export type BillingPayment = {
  id: number;
  gateway_code: string;
  amount: string;
  currency: string;
  status: string;
  payment_method: string | null;
  provider_reference: string | null;
  failure_reason: string | null;
  initiated_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  tenant?: { id: number; name: string; slug: string };
  order?: { id: number; order_number: string } | null;
};

export type BillingInvoice = {
  id: number;
  invoice_number: string;
  status: string;
  currency: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  tenant?: { id: number; name: string; slug: string };
};

export type ActivityItem = {
  at: string;
  type: "tenant" | "invoice" | "fbr" | "billing";
  event: string;
  message: string;
  tenant: { id: number; slug: string; name: string } | null;
  actor?: string;
  invoice_ref?: string | null;
  status?: string;
  error_code?: number | string | null;
  error?: string | null;
  order_number?: string | null;
  order_type?: string | null;
};

export type SupportSession = {
  id: number;
  reference: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  opened_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  tenant?: { id: number; name: string; slug: string };
  user?: { id: number; name: string; email: string } | null;
  assignedTo?: { id: number; name: string; email: string } | null;
  latestMessage?: { body: string; created_at: string } | null;
};

export type SupportMessage = {
  id: number;
  sender_type: "admin" | "user" | "system";
  sender_id: number | null;
  body: string;
  created_at: string;
  sender?: { id: number; name: string; email: string } | null;
};

export function money(v?: string | number | null) {
  return Number(v || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtWhen(v?: string | null) {
  if (!v) return "—";
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

export function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
