# PRAL Digital Invoicing System

Multi-tenant sales invoicing for Pakistan FBR / PRAL Digital Invoicing.

Sellers (role B) raise invoices, buyers (role C) approve them, and the platform (role A) bills tenants in PKR. Subscriptions activate only after payment clears.

## Stack

- `apps/backend` Laravel 11 API (PHP 8.2+)
- `apps/web` Next.js 14 (proxies `/api/*` to Laravel)
- `apps/mobile` Expo / React Native
- `packages/shared` shared TypeScript types
- **MySQL 8** for production (tests use SQLite `:memory:`)

## 1. Backend

```bash
cd apps/backend
cp .env.example .env
php artisan key:generate
```

Minimum `.env` keys:

```
APP_URL=http://localhost:8000
WEB_APP_URL=http://localhost:3000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pral
DB_USERNAME=pral
DB_PASSWORD=
SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database
```

`WEB_APP_URL` is the public origin of the Next.js app. Raast/1LINK **return**, **cancel**, and **webhook** URLs, plus email-verification links, are built from it. Change it whenever the public host changes — no code edits.

New sellers must verify email before using the workspace (`/verify-email`). Seeded and admin-created accounts are pre-verified. Set `SAAS_REQUIRE_EMAIL_VERIFICATION=false` only for local/dev. Configure `MAIL_*` so verification mail is delivered.

Optional Raast / 1LINK merchant credentials (never commit real values; leave blank for sandbox):

```
RAST_API_KEY=
RAST_APP_SECRET=
```

Create the database, then migrate and seed:

```bash
mysql -u pral -p -e "CREATE DATABASE IF NOT EXISTS pral CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Seed is idempotent. It creates:

- Platform admin `admin@saas.local` / `password` (override with `SAAS_PLATFORM_ADMIN_EMAILS` / `SAAS_PLATFORM_ADMIN_PASSWORD`)
- Plans `starter` (Rs.900/mo), `standard`, `premium`
- Invoice packages `pack_25` … `pack_1000`
- Payment gateways (Raast + mock enabled in sandbox by default)
- Demo sellers via `DemoSellerSeeder`

Optional queue worker (required in production when `QUEUE_CONNECTION=database`):

```bash
php artisan queue:work
```

Refresh PRAL HS codes / UoMs / sale types (needs a valid token):

```bash
php artisan pral:sync-reference
```

## 2. Web

```bash
cd apps/web
npm install
npm run dev
```

Next.js proxies `/api/:path*` to Laravel (`http://127.0.0.1:8000`). Open http://localhost:3000

## 3. Mobile

```bash
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

Sandbox invoice dates are stamped in **UTC** so PRAL error `0043` (future date vs the sandbox clock) does not fire between 00:00–05:00 PKT.

## Multi-tenancy

- Web/mobile send `X-Tenant: {slug}` (or use `{slug}.yourdomain.com`).
- All invoice/user queries are tenant-scoped.
- Platform admins log in through the same `/api/auth/login`; they are not tenant-scoped and open `/admin` (`/api/admin/*`).

## Billing, entitlements & subscriptions

`config/saas.php` + `PlatformSetting` rows drive defaults.

Entitlement consumption order per invoice submitted to FBR:

1. Purchased invoice **packages**.
2. Active **subscription** allowance.
3. Free **credits** granted at registration (default 5).
4. **Overage** — only if allowed; becomes an unbilled charge settled from Billing.

**Per-invoice cap:** no per-invoice charge may exceed `billing.max_invoice_price` (default **Rs.10**). Overage and pay-as-you-go are both capped, whatever a plan's stored `overage_price` says.

### Tenant flows

- `GET /api/billing/summary` — subscription, usage, outstanding balance, enabled gateways.
- `POST /api/billing/subscribe { subscription_plan_id, interval, gateway }` — pending subscription + checkout. The plan is **not** activated until payment clears.
- Seller UI: `/billing` → **Subscribe** → `/billing/subscribe` (Raast P2M).
- `POST /api/billing/payments/{payment}/complete` — seller-side completion of a **sandbox** gateway payment only. Live payments settle only via webhook / platform admin.
- `POST /api/webhooks/{gateway}` — public inbound notify URL (no auth; adapter verifies the signature). Sandbox Raast accepts unsigned callbacks; live Raast still requires 1LINK HMAC before it will pay.
- Checkout JSON includes `urls.return_url`, `urls.cancel_url`, `urls.webhook_url` built from `WEB_APP_URL`.
- Browser landing after 1LINK: `/billing/payments/return`.
- `POST /api/billing/packages`, `POST /api/billing/overage/settle`, orders/invoices/payments/usage.

Checkout returns `202` with `manual: true` for hosted/manual gateways. The `mock` gateway auto-pays in the same request. `raast` (sandbox) waits for the seller to confirm the simulated payment.

### Platform admin

`/admin` (Overview, Sellers, Subscriptions, Payments, **Settings**, Monitoring, Support).

- Settings → payment gateways: enable/disable, sandbox/live, encrypted credentials. DB values override `.env` (`RAST_API_KEY` / `RAST_APP_SECRET` are fallback only).
- The Raast card also shows the return / cancel / webhook URLs to hand to 1LINK.
- Catalog, tenant status/credits/FBR, refunds, audit logs: `/api/admin/*`.

### FBR / PRAL (seller Settings → FBR)

- Per-tenant `fbr_mode` (`sandbox` / `production`) and encrypted `fbr_integrations` rows. Tokens are never shown again after save.
- Token guide documents IRIS (`iris.fbr.gov.pk`) → Registration → Digital Invoicing, PRAL as integrator, `_sb` sandbox suffixes, and errors `0043` / `0401`.
- Scenario suite defaults to **every** shipped fixture; cards are filterable and sortable. Sale types outside the seller's category fail as expected.

### Ops

- `php artisan saas:maintain` (every 5 min) — renews due subscriptions **only when the charge clears**, grace, overage, suspension, trials.
- A subscription in `grace_period` is revived by paying its open renewal order.
- `php artisan db:seed --force` is idempotent.

### Accounting

Money is stored as `decimal(14,2)` snapshots. Ledger rows are append-only; refunds write a `REFUND` row.

## Tests

```bash
cd apps/backend
php artisan test
```

Feature suites cover registration + free allowance, email verification, package purchase, Raast sandbox subscribe-then-confirm, live self-complete rejection, webhook settlement + signature failure, admin gateway credential encryption, entitlement charging, overage cap at Rs.10, platform-admin guards, refunds, and scheduled maintenance.

## Production (native VPS, MySQL)

Recommended: Ubuntu 24.04, Nginx, PHP-FPM, MySQL 8, `next start`. Native install only.

1. Install MySQL, create database `pral` and user `pral`@`localhost`.
2. Clone the repo, copy `.env.example` → `.env`, set `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` / `WEB_APP_URL` to the public host, and MySQL credentials.
3. `composer install --no-dev`, `php artisan migrate --force`, seed platform defaults (`PlatformBootstrapSeeder` + `CatalogSeeder`; skip demo sellers in production if you prefer).
4. Nginx: `/api` → Laravel, everything else → Next.js. TLS via Let's Encrypt.
5. systemd: `php artisan queue:work` + cron `* * * * * php artisan schedule:run`.
6. Keep 3306 bound to localhost. Never commit real `RAST_*` or PRAL tokens.
