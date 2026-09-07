<?php

namespace App\Services\Fbr;

use App\Models\FbrIntegration;
use App\Models\Invoice;

interface InvoiceIntegratorInterface
{
    public function code(): string;

    public function name(): string;

    public function mode(): string;

    public function isConfigured(): bool;

    public function configure(FbrIntegration $integration): void;

    /**
     * Ask FBR/PRAL to validate invoice data without posting it.
     *
     * @return array raw gateway response
     */
    public function validateInvoice(Invoice $invoice): array;

    /**
     * Post invoice data to FBR and receive the tax invoice number.
     *
     * @return array raw gateway response
     */
    public function submitInvoice(Invoice $invoice): array;

    public function friendlyError(?string $code, ?string $fallback = null): string;
}
