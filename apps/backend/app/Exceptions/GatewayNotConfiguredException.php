<?php

namespace App\Exceptions;

use Exception;

class GatewayNotConfiguredException extends Exception
{
    public function __construct(string $provider, string $extra = '')
    {
        parent::__construct(
            sprintf('The "%s" payment provider is not configured yet.', $provider).($extra ? ' '.$extra : '')
        );
    }
}
