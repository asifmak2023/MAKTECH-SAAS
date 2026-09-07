<?php

namespace App\Services\Payments\Gateways;

use App\Models\BillingOrder;
use App\Models\Payment;
use App\Services\Payments\AbstractPaymentGateway;

class BankTransferGateway extends AbstractPaymentGateway
{
    protected function requiredKeys(): array
    {
        return []; // buyer needs the bank details, not live credentials to initiate
    }

    public function purchase(BillingOrder $order, Payment $payment, array $options = []): array
    {
        $reference = $this->reference();

        return $this->manualResult($reference, [
            'instructions' => [
                'bank_name' => $this->config['bank_name'] ?? null,
                'account_title' => $this->config['account_title'] ?? null,
                'account_number' => $this->config['account_number'] ?? null,
                'iban' => $this->config['iban'] ?? null,
            ],
            'payment_reference' => $reference,
        ]);
    }
}
