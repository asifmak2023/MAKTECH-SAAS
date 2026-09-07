<?php

namespace App\Services\Payments\Gateways;

use App\Models\BillingOrder;
use App\Models\Payment;
use App\Services\Payments\AbstractPaymentGateway;

class MockGateway extends AbstractPaymentGateway
{
    protected function requiredKeys(): array
    {
        return []; // the mock gateway never needs live credentials
    }

    public function purchase(BillingOrder $order, Payment $payment, array $options = []): array
    {
        $autoApprove = (bool) ($this->config['auto_approve'] ?? true);

        if ($autoApprove) {
            return [
                'status' => 'paid',
                'redirect_url' => null,
                'provider_reference' => $this->reference(),
                'manual' => false,
                'raw' => ['simulated' => true, 'order' => $order->order_number],
            ];
        }

        return $this->manualResult($this->reference(), ['simulated' => true, 'manual_approval_required' => true]);
    }
}
