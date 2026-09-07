<?php

namespace App\Exceptions;

use Exception;

class UsageLimitExceededException extends Exception
{
    public function __construct(
        string $message = 'Your invoice allowance has been exhausted. Please upgrade your plan or purchase an invoice package.',
        public int $statusCode = 402,
    ) {
        parent::__construct($message);
    }
}
