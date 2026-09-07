<?php

namespace App\Services\Payments\Traits;

trait ManualHostedPayment
{
    /**
     * Hosted/redirect gateways are on-boarded per provider. When the credentials
     * have been configured the gateway hands the buyer to a real redirect; until
     * then (or when credentials are absent) it raises GatewayNotConfiguredException.
     */
    public function purchase($order, $payment, array $options = []): array
    {
        $this->assertConfigured();

        // Real integration happens at the provider's hosted checkout. This adapter
        // returns a hand-off marker so the platform can later match the callback.
        $reference = $this->reference();

        return $this->manualResult($reference, [
            'endpoint' => $this->config['live_endpoint'] ?? ($this->config['sandbox_endpoint'] ?? null),
            'mode' => $this->model->is_sandbox ? 'sandbox' : 'live',
        ]);
    }
}
