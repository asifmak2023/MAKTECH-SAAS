# Clients Module (Buyer/Customer Directory + Invoice Autofill) — Design

Date: 2026-09-06
Status: Approved (Sections 1–3 reviewed and approved by user)

## 1. Business context (A/B/C model)

- A = SaaS Provider / Product Owner (operates the platform; collects SaaS subscription fees from B).
- B = Seller / Taxpayer / SaaS Tenant (e.g. maktech). Uses the platform to create FBR/PRAL invoices for its customers.
- C = Buyer / Customer of B. Pays B directly; that payment flow is **outside the SaaS**.

The platform is **never a payment gateway between B and C**. The only payment integration is A→B SaaS subscription (already implemented and unchanged by this work).

Therefore this feature set is limited to B-side client management:

1. Buyer/Client directory CRUD for the logged-in tenant (B).
2. Invoice creation autofill from the client directory (storing `customer_id`).
3. Persistent **Clients** navigation entry and a per-client invoice view.

Previously-proposed features that contradict the A/B/C model (buyer-facing pay portal, PakPay merchant credentials for receiving buyer payments, tenant "Payment Settings") are **out of scope**.

## 2. Mapping to existing code

| Concept | Existing artifact |
| --- | --- |
| B's Buyer/Client directory | `customers` table + `Customer` model (tenant-scoped via `BelongsToTenant`) |
| Linked invoices | `invoices.customer_id` (already present; relation `Invoice::customer()`) |
| Client of an invoice | `invoice.buyer_*` denormalized fields (unchanged) |
| Tenant scoping | `TenantContext` + `BelongsToTenant` global scopes; existing `IdentifyTenant` middleware |
| Web shell | `apps/web` Next.js app, `AppShell` sidebar |
| Invoice form | `apps/web/src/components/InvoiceForm.tsx` (shared by create + edit pages) |

Internal entity name stays `customer`; UI label is **Clients**. Public web routes `/clients/*`; API remains `/api/customers`.

## 3. Data model & authorization

- **No new tables and no destructive migrations.** Optional additive index on `invoices(customer_id)` for the per-client invoice query.
- Row-Level Security remains **tenant-level** (B acts as one taxpayer). All customer and invoice queries are scoped by `TenantContext`; cross-tenant leakage is not possible.
- Per-user sub-account ownership is **out of scope**.
- Client lifecycle:
  - Archive = `is_active = false`. Never hard-deleted by tenant users.
  - Archived clients are excluded from the invoice autofill source; records + invoices remain intact and searchable.
  - Restore = `is_active = true`.
- Invoice `customer_id` integrity: on invoice create/update the backend verifies the referenced customer belongs to the current tenant; foreign ids are rejected (`422`).
- Purge (hard delete) of a client is **platform-admin only** and allowed only when the client has zero invoices; otherwise `422`.

## 4. Backend API

Tenant routes (existing `auth:sanctum` + `tenant.required` group; CUD behind `tenant.active`):

- `GET /api/customers` — extend existing index:
  - query params: `status = active | archived | all` (default `active`), `search` (existing `scopeSearch`), `pagination`; each row includes `invoices_count`.
- `GET /api/customers/{customer}` — extend existing show with `recent_invoices` (latest 8, status + totals) and `invoices_count`.
- `POST /api/customers` / `PUT /api/customers/{customer}` — keep existing store/update; form + validation require a display name. Backend keeps `name` NOT NULL by defaulting `name` to `business_name` when contact is blank.
- `POST /api/customers/{customer}/archive` (new) → `is_active = false`.
- `POST /api/customers/{customer}/restore` (new) → `is_active = true`.
- Tenant `DELETE /api/customers/{id}`: **removed** — archive replaces it.
- `GET /api/invoices?customer_id={id}` — new filter on existing index (tenant-scoped).
- Invoice `store`/`update` accept optional `customer_id`:
  - ownership check against current tenant (else `422`);
  - auto-fill buyer fields from the client only for fields not supplied in the request;
  - no write-back to the client profile ever.

Platform admin routes (`auth:sanctum` + `platform.admin`, prefix `/api/admin`):

- `DELETE /api/admin/customers/{customer}` — purge; `422` when the client has invoices.

## 5. Frontend (apps/web)

- `AppShell`: add **Clients** nav item → `/clients`.
- `/clients` list page (`src/app/clients/page.tsx`):
  - search input + status filter (Active / Archived / All);
  - table columns: Client (business name + contact), Email, Phone, Tax no (NTN/STRN), Invoices, Created, Actions (View / Edit / Archive-Restore);
  - archive uses a confirmation dialog; restore is single-click; responsive horizontal scroll.
- `/clients/create` and `/clients/[id]/edit`: shared `ClientForm` component.
  - Fields: Business name (required, lands on invoices), Contact person, Email, Phone, NTN/CNIC, STRN, Registration type, Province, City, Address.
- `/clients/[id]` detail page (`src/app/clients/[id]/page.tsx`):
  - profile card (contact info, status chip, Edit + Archive/Restore);
  - invoice list for this client (status chip, date, total → link to `/invoices/{id}`);
  - "New invoice for this client" → `/invoices/create?client={id}`.
- Invoice form autofill (`InvoiceForm`):
  - client picker (no external dependency) fetching `GET /api/customers?status=active`, searchable, labeled by business name (+ contact/tax no);
  - on selection: instant autofill of buyer business name, address, email, phone, tax no, registration type, province and sets `customer_id`; all fields stay editable for one-off overrides; nothing writes back to the client;
  - `?client={id}` on create page pre-selects and autofills;
  - clearing the picker leaves manual fields and sends `customer_id: null`.
- Invoice detail page: render linked client name → `/clients/{id}` when `customer_id` present.

## 6. Testing

Backend feature tests (`tests/Feature`):

1. Customer CRUD + `invoices_count`.
2. RLS: second tenant cannot list/show/update/archive another tenant's client.
3. Archive hides from active list + autofill source; invoices intact; restore returns it.
4. No tenant delete route (archive-only enforced).
5. `GET /api/invoices?customer_id=` returns only that client's invoices (tenant-scoped).
6. Invoice create with a foreign `customer_id` is rejected (`422`).
7. Autofill: invoice with `customer_id` and missing buyer fields copies values from the client.
8. Admin purge: allowed for unused client; `422` when invoices exist; tenant users get `403`/`401` on `/api/admin/*`.

Verification steps: `php artisan test`; `tsc --noEmit`; `next lint`; manual smoke via preview proxy (create client → autofill invoice → per-client page → archive).

## 7. Out of scope (explicit)

- B↔C payment processing, buyer-facing pay portal, webhooks for buyer payments.
- PakPay / merchant-of-record configuration at platform or tenant level.
- Tenant "Payment Settings" page.
- Per-sub-user (user_id) data isolation within a tenant.
- Mobile (Expo) changes.
- A→B SaaS subscription billing (already implemented, unchanged).

## 8. Acceptance mapping

- AC-01 (RLS) — covered: all client/invoice APIs remain tenant-scoped; foreign `customer_id` rejected.
- AC-02 (dropdown via API) — client picker uses `GET /api/customers`.
- AC-03 (autofill <500ms) — client list fetched once, in-memory filtering; autofill is synchronous on selection.
- AC-07 (FK) — already present (`invoices.customer_id`); additive index only.
- AC-04/05/06 (webhook/PakPay/product-owner payment settings/buyer billing responsiveness) — removed by A/B/C scope decision.
