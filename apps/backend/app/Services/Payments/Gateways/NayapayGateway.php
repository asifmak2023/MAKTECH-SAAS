<?php

namespace App\Services\Payments\Gateways;

use App\Services\Payments\AbstractPaymentGateway;
use App\Services\Payments\Traits\ManualHostedPayment;

class NayapayGateway extends AbstractPaymentGateway
{
    use ManualHostedPayment;
}
