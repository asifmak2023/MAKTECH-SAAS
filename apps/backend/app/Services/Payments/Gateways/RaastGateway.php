<?php

namespace App\Services\Payments\Gateways;

use App\Models\PaymentGateway;
use App\Services\Payments\AbstractPaymentGateway;
use App\Services\Payments\Traits\ManualHostedPayment;

class RaastGateway extends AbstractPaymentGateway
{
    use ManualHostedPayment;

    /**
     * Resolve 1LINK merchant credentials. Values saved from the admin console
     * (encrypted in the `payment_gateways` table) take priority; the .env
     * credentials (RAST_API_KEY / RAST_APP_SECRET) are only the fallback so a
     * brand-new deployment works before the admin fills the dashboard form.
     */
    public function configure(PaymentGateway $model): void
    {
        parent::configure($model);

        foreach ((array) config("saas.payment_gateways.{$this->model->code}.env_credentials", []) as $key => $spec) {
            if (! blank($this->config[$key] ?? null)) {
                continue;
            }

            $envName = is_array($spec) ? ($spec['env'] ?? null) : null;
            $envName = $envName ?: (is_string($spec) ? $spec : $key);
            $value = env($envName);

            if (! blank($value)) {
                $this->config[$key] = $value;
            }
        }
    }

    /**
     * The sandbox environment simulates the Raast P2M hosted checkout, so it
     * does not require live merchant credentials. Live mode still demands a
     * configured merchant (merchant_id / api_key / etc.).
     */
    protected function requiredKeys(): array
    {
        if ($this->model->is_sandbox) {
            return [];
        }

        return parent::requiredKeys();
    }

    /**
     * Sandbox callbacks are simulated and carry no HMAC, so they are accepted
     * as-is to let the full webhook flow be exercised. Live Raast P2M
     * notifications are 1LINK-signed; that signature verification must be
     * wired here against the real initiation API before taking live payments.
     */
    public function verifyWebhookSignature(array $headers, array $payload): bool
    {
        if ($this->model->is_sandbox) {
            return true;
        }

        return parent::verifyWebhookSignature($headers, $payload);
    }
}
