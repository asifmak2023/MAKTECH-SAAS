# FBR Digital Invoicing System

Multi-tenant sales invoicing for the Pakistan FBR Digital Invoicing programme (invoices are posted through the PRAL gateway).

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

Optional **Sign in with Google** (Login / Register show a Google button only when enabled):

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_ENABLED=true
```

Create the OAuth client under Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web), and add exactly one Authorized redirect URI:

```
http://localhost:8000/api/auth/google/callback
```

(Use your deployed backend origin in production.) Google sign-in matches the account by email and marks it verified; a brand-new email automatically provisions a workspace whose username/tenant slug comes from the email local part.

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

- Platform admin `admin@saas.local` / `password` (override with `SAAS_PLATFORM_ADMIN_EMAILS` / `SAAS_PLATFORM_ADMIN_PASSWORD`). Optional extra admin: set `SAAS_SEED_ADMIN_EMAIL`, `SAAS_SEED_ADMIN_USERNAME`, and `SAAS_SEED_ADMIN_PASSWORD` (no hardcoded production password).
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

## Production VPS (Ubuntu 24.04)

Native install only: Nginx (public entry), PHP-FPM 8.2 (Laravel), Node 20 (`next start`), MySQL 8 or MariaDB, Redis, Certbot. One public origin; Next proxies `/api/*` to Laravel on localhost.

Assumed layout:

```
/var/www/pral                 git clone
/var/www/pral/apps/backend    Laravel
/var/www/pral/apps/web        Next.js
```

Public host examples: `https://app.example.com` (Next) talking to Laravel at `http://127.0.0.1:8000`. Keep MySQL on `127.0.0.1:3306`. Never commit real gateway or PRAL tokens.

### 1. System packages

```bash
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx mysql-server redis-server certbot python3-certbot-nginx \
  php8.2-fpm php8.2-cli php8.2-mysql php8.2-xml php8.2-mbstring php8.2-curl \
  php8.2-zip php8.2-gd php8.2-bcmath php8.2-intl php8.2-redis unzip git curl
```

Install Composer and Node 20:

```bash
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

Enable and start services:

```bash
systemctl enable --now nginx php8.2-fpm mysql redis-server
```

### 2. MySQL

```bash
mysql -e "CREATE DATABASE IF NOT EXISTS pral CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'pral'@'localhost' IDENTIFIED BY 'CHANGE_ME_DB_PASSWORD';"
mysql -e "GRANT ALL PRIVILEGES ON pral.* TO 'pral'@'localhost'; FLUSH PRIVILEGES;"
```

Bind MySQL to localhost only (`bind-address = 127.0.0.1` in `/etc/mysql/mysql.conf.d/mysqld.cnf`). Do not open 3306 to the internet.

### 3. Application user and clone

```bash
adduser --system --group --home /var/www/pral pral
mkdir -p /var/www/pral
git clone https://github.com/asifmak2023/MAKTECH-SAAS.git /var/www/pral
chown -R pral:pral /var/www/pral
```

### 4. Laravel `.env`

```bash
cd /var/www/pral/apps/backend
cp .env.example .env
php artisan key:generate --force
```

Set at least:

```
APP_NAME="FBR Digital Invoicing System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.example.com
WEB_APP_URL=https://app.example.com
APP_TIMEZONE=Asia/Karachi

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pral
DB_USERNAME=pral
DB_PASSWORD=CHANGE_ME_DB_PASSWORD

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

LOG_CHANNEL=stack
LOG_LEVEL=error

SANCTUM_STATEFUL_DOMAINS=app.example.com
SAAS_REQUIRE_EMAIL_VERIFICATION=true
SAAS_PLATFORM_ADMIN_EMAILS=you@example.com
SAAS_PLATFORM_ADMIN_PASSWORD=CHANGE_ME_ADMIN_PASSWORD

MAIL_MAILER=resend
RESEND_KEY=
MAIL_FROM_ADDRESS=invoices@example.com
MAIL_FROM_NAME="${APP_NAME}"
```

Payment credentials (leave blank until live): `JAZZCASH_*`, `EASYPAISA_*`, `ONELINK_*`, `ONELINK_P2M_*`. PRAL: `PRAL_USE_SANDBOX=false` plus production token when going live.

Optional extra platform admin (created only when all three are set; password is never printed):

```
SAAS_SEED_ADMIN_EMAIL=ops@example.com
SAAS_SEED_ADMIN_USERNAME=ops
SAAS_SEED_ADMIN_PASSWORD=CHANGE_ME_OPS_PASSWORD
```

`php artisan config:cache` is required in production. Gateway adapters read `config('saas.payment_gateways.*.env_credentials')`, not `env()`, so keys must live in `.env` **before** you cache config.

### 5. Install, migrate, seed, cache

```bash
cd /var/www/pral/apps/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan db:seed --force --class=PlatformBootstrapSeeder
php artisan db:seed --force --class=CatalogSeeder
php artisan db:seed --force --class=AdminAccountSeeder
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan optimize
```

`DatabaseSeeder` skips demo tenants in `production`. Do not run `php artisan db:seed --force` (full seeder) on a live box unless you want demo data.

Fix permissions:

```bash
chown -R pral:pral /var/www/pral/apps/backend/storage /var/www/pral/apps/backend/bootstrap/cache
chmod -R ug+rwx /var/www/pral/apps/backend/storage /var/www/pral/apps/backend/bootstrap/cache
```

### 6. PHP-FPM pool

`/etc/php/8.2/fpm/pool.d/pral.conf`:

```
[pral]
user = pral
group = pral
listen = /run/php/php8.2-fpm-pral.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 20
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 8
php_admin_value[memory_limit] = 256M
php_admin_value[upload_max_filesize] = 16M
php_admin_value[post_max_size] = 16M
```

OPcache in `/etc/php/8.2/fpm/conf.d/10-opcache.ini`:

```
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.jit=1255
opcache.jit_buffer_size=64M
```

```bash
systemctl restart php8.2-fpm
```

After every deploy: `php artisan optimize` then restart PHP-FPM so OPcache reloads.

### 7. Next.js

```bash
cd /var/www/pral/apps/web
cp .env.example .env.local
```

`.env.local`:

```
API_INTERNAL_URL=http://127.0.0.1:8000
NEXT_PUBLIC_APP_NAME=FBR Digital Invoicing System
```

```bash
npm ci
npm run build
```

Laravel listens on `127.0.0.1:8000` via php-fpm/nginx internally; Next rewrites `/api/:path*` to `API_INTERNAL_URL`.

### 8. Nginx (single public port)

Laravel site on localhost only (`/etc/nginx/sites-available/pral-api`):

```
server {
    listen 127.0.0.1:8000;
    server_name _;
    root /var/www/pral/apps/backend/public;
    index index.php;
    client_max_body_size 16M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm-pral.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Public site (`/etc/nginx/sites-available/pral`):

```
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

upstream next_app {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;
    client_max_body_size 16M;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        proxy_pass http://next_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/pral-api /etc/nginx/sites-enabled/pral-api
ln -s /etc/nginx/sites-available/pral /etc/nginx/sites-enabled/pral
nginx -t
```

Issue TLS **after** DNS points at the VPS (Certbot needs port 80). Temporarily serve Next on `:80` or use `certbot certonly --nginx -d app.example.com`, then reload nginx.

JazzCash / Easypaisa / 1LINK must POST to `https://app.example.com/api/webhooks/{gateway}` and return to `https://app.example.com/api/payments/return/{gateway}`. Next proxies those to Laravel.

Optional tenant hosts: point `*.example.com` at the same server and set tenant `domain` / slug. Authenticated seller APIs ignore a spoofed `X-Tenant` that does not match `users.tenant_id`.

### 9. systemd: Next, queue, scheduler

`/etc/systemd/system/pral-web.service`:

```
[Unit]
Description=PRAL Next.js
After=network.target

[Service]
Type=simple
User=pral
WorkingDirectory=/var/www/pral/apps/web
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/pral-queue.service`:

```
[Unit]
Description=PRAL Laravel queue worker
After=network.target mysql.service redis-server.service

[Service]
Type=simple
User=pral
WorkingDirectory=/var/www/pral/apps/backend
ExecStart=/usr/bin/php artisan queue:work redis --sleep=1 --tries=3 --max-time=3600
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/pral-scheduler.service` + `.timer` (preferred over crontab):

```
[Unit]
Description=PRAL Laravel scheduler once

[Service]
Type=oneshot
User=pral
WorkingDirectory=/var/www/pral/apps/backend
ExecStart=/usr/bin/php artisan schedule:run
```

```
[Unit]
Description=PRAL Laravel scheduler every minute

[Timer]
OnCalendar=minutely
AccuracySec=1s
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl daemon-reload
systemctl enable --now pral-web pral-queue pral-scheduler.timer
systemctl reload nginx
```

If you prefer cron instead of the timer:

```
* * * * * cd /var/www/pral/apps/backend && php artisan schedule:run >> /dev/null 2>&1
```

Scheduled jobs: `saas:maintain` every 5 minutes (renewals, grace, suspension); `pral:sync-reference` daily at 02:15.

### 10. Performance checklist

- Redis for cache, queue, and session (`CACHE_STORE=redis`, `QUEUE_CONNECTION=redis`, `SESSION_DRIVER=redis`).
- `php artisan config:cache route:cache view:cache event:cache optimize` after every `.env` or code deploy.
- PHP OPcache with `validate_timestamps=0` in production.
- Next production build (`npm run build` + `npm run start`), not `next dev`.
- Nginx gzip/http2 already on; keep Next bound to `127.0.0.1:3000`.
- Do not run `APP_DEBUG=true` or `php artisan serve` in production.

### 11. Deploy loop

```bash
cd /var/www/pral
git pull --ff-only
cd apps/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize
cd ../web
npm ci
npm run build
systemctl restart php8.2-fpm pral-queue pral-web
```

### 12. Health and security

- Laravel health: `http://127.0.0.1:8000/up`
- Public app: `https://app.example.com`
- Logs: `apps/backend/storage/logs/laravel.log`, `journalctl -u pral-web -u pral-queue`
- UFW: allow 22/80/443 only. MySQL, Redis, PHP-FPM socket, and `:8000` stay on localhost.
- Rotate `SAAS_PLATFORM_ADMIN_PASSWORD` after first login. Do not leave `APP_DEBUG=true`.
- Gateway secrets belong in Admin -> Payment Gateways (encrypted) or `.env` baked into config cache — never in git.
