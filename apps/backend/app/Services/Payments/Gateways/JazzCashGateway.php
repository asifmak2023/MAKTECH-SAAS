<?php

namespace App\Services\Payments\Gateways;

use App\Services\Payments\AbstractPaymentGateway;
use App\Services\Payments\Traits\ManualHostedPayment;

class JazzCashGateway extends AbstractPaymentGateway
{
    use ManualHostedPayment;
}
