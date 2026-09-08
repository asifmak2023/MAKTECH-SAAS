# PRAL Digital Invoicing (Maktech)

Multi-tenant sales invoicing for Pakistan FBR / PRAL Digital Invoicing.

This Linux workspace cannot write to `E:\MAKTECH2`. Copy the whole folder there after download:

```
xcopy /E /I . E:\MAKTECH2
```

## Stack

- `apps/backend` Laravel 11 API (PHP 8.2+)
- `apps/web` Next.js 14
- `apps/mobile` Expo / React Native
- `packages/shared` shared TypeScript types
- PostgreSQL, Redis, Mailpit via Docker Compose

## 1. Backend

```
cd apps/backend
cp .env.example .env
php artisan key:generate
```

Set at least:

```
PRAL_USE_SANDBOX=true
PRAL_SANDBOX_TOKEN=your-sandbox-token
PRAL_PRODUCTION_TOKEN=your-production-token
WEB_APP_URL=http://localhost:3000
```

Start Postgres / Redis / Mailpit:

```
docker compose up -d postgres redis mailpit
```

Migrate and seed a demo tenant (`maktech` / `admin@maktech.local` / `password`):

```
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Optional queue worker:

```
php artisan queue:work
```

Refresh PRAL HS codes / UoMs / sale types (requires a valid token):

```
php artisan pral:sync-reference
```

## 2. Web

```
cd apps/web
npm install
npm run dev
```

Next.js proxies `/api/*` to Laravel (`http://127.0.0.1:8000`). Open http://localhost:3000

## 3. Mobile

```
cd apps/mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to your machine IP, for example `http://192.168.1.10:8000`. Deep links use `pral://approve/{token}`.

## Invoice flow

1. Seller creates a draft invoice (web or mobile).
2. Send for approval emails the buyer PDF + `/approve/{token}` link.
3. Buyer approves or rejects (no login).
4. On approval the invoice is validated then posted to PRAL (`validateinvoicedata` / `postinvoicedata`).
5. FBR invoice number is stored and the PDF QR is regenerated.

## Multi-tenancy

- Web/mobile send `X-Tenant: {slug}` (or use `{slug}.yourdomain.com`).
- All invoice/user queries are tenant-scoped.
- Platform admins log in through the same `/api/auth/login`; they are not tenant-scoped and open `/api/admin/*`.

## Billing, entitlements & subscriptions

`config/saas.php` + `PlatformSetting` rows drive defaults; seeders create 3 plans (`starter`, `standard`, `premium`), 4 invoice packages (`pack_25` … `pack_1000`) and 8 payment gateways (mock + bank/JazzCash/Easypaisa/Sadapay/Nayapay/Raast/Card).

Entitlement consumption order per invoice submitted to FBR:

1. Purchased invoice **packages** (`billing/usage` shows remaining).
2. Active **subscription** allowance.
3. Free **credits** granted at registration (default 5, toggle via `tenant.registration_credit_invoices`).
4. **Overage** — only if allowed; becomes an unbilled charge you settle from the Billing screen.

### Tenant flows

- `GET /api/billing/summary` – subscription, usage allowance, outstanding balance, enabled gateways.
- `POST /api/billing/subscribe { subscription_plan_id, interval, gateway }` – creates a pending subscription and starts checkout; the plan is **not** activated until the payment clears (then the previous plan is cancelled). The seller web UI routes subscription checkout through Raast (P2M).
- `POST /api/billing/payments/{payment}/complete` – seller-side completion of a **sandbox** gateway payment (simulated Raast P2M hosted checkout in sandbox; live gateways are confirmed via webhook/platform admin).
- `POST /api/billing/packages { usage_package_id, gateway }`.
- `POST /api/billing/overage/settle { gateway }` – collects all unbilled overage into one order.
- `POST /api/billing/orders/{order}/pay|cancel`, `GET /api/billing/orders|invoices|payments|usage`.

Checkout returns `202` with `manual: true` and payment instructions for real/hosted gateways; the `mock` gateway auto-pays in the same request (sandbox) and `raast` (sandbox) waits for the seller to complete the simulated payment.

**Per-invoice cap:** no per-invoice charge may exceed `billing.max_invoice_price` (default **Rs.10**). Overage beyond a plan's allowance and pay-as-you-go invoices are both capped at this ceiling, whatever the plan's stored `overage_price` or `default_invoice_price` say.

### Platform admin (`/api/admin/*`, requires a platform admin)

`GET/POST/PUT tenants`, `POST tenants/{id}/status` (suspend/activate), `POST tenants/{id}/credits`, `PUT tenants/{id}/fbr`, catalog & gateway management, `GET billing/orders`, `POST billing/orders/{id}/refund`, settings, audit logs.

### Ops

- `php artisan saas:maintain` (scheduled every 5 min) – renews due subscriptions **only when the charge clears** (auto renewals are applied on paid checkout; failed or manual/pending renewals enter `grace_period` instead of renewing for free), cancels stale pending subscriptions, marks overage orders, suspends tenants past grace, ends trials.
- A subscription in `grace_period` is revived by paying its open renewal order (admin bank-transfer confirmation or a manual checkout) — the plan reactivates and the period rolls forward.
- `php artisan db:seed --force` is idempotent (gateways, settings, roles, platform admins from `SAAS_PLATFORM_ADMIN_EMAILS` / `SAAS_PLATFORM_ADMIN_PASSWORD`).
- Platform admin login demo: `admin@saas.local` / password from `SAAS_PLATFORM_ADMIN_PASSWORD` (default `password`).

### Accounting rules

- Money is stored as `decimal(14,2)` snapshots; ledger rows are append-only and never mutated — refunds write a `REFUND` row and flip the original row's meta to `reversed`.

### Per-tenant FBR/PRAL configuration

Replaces the old env-global `PRAL_USE_SANDBOX`/`PRAL_SANDBOX_TOKEN` switch. Each tenant has `tenant.fbr_mode` (`sandbox`/`production`) and `fbr_integrations` rows (`pral`, mode-scoped) whose `config` JSON holds `base_url`/`token`/endpoints — configure in Settings → FBR, or as admin via `PUT /api/admin/tenants/{id}/fbr`.

## Tests

```
cd apps/backend
php artisan test
```

Feature suites cover the full commerce loop against sqlite `:memory:`: registration + free allowance, package purchase ledger, subscription activation + plan replacement, entitlement charging during FBR submission (idempotent), free-credits → overage → settlement, platform-admin guards, suspension lifecycle, reversal-first refunds, and scheduled maintenance (auto-renewal, manual-gateway grace + recovery, grace-expiry suspension, overage aggregation, stale-pending/trial cleanup).

## Copy to Windows

Zip this repository and extract to `E:\MAKTECH2`, or clone it there, then run the steps above with PHP 8.2+, Composer, Node 20, and Docker Desktop.
