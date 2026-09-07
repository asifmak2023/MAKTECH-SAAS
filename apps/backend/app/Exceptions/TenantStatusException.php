<?php

namespace App\Exceptions;

use Exception;

class TenantStatusException extends Exception
{
    public function __construct(
        string $message,
        public int $statusCode = 409,
    ) {
        parent::__construct($message);
    }
}
