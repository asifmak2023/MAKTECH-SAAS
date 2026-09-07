<?php

namespace App\Services;

use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class InvoicePdfService
{
    public function generate(Invoice $invoice): string
    {
        $invoice->loadMissing(['items', 'tenant']);

        $qrPayload = $invoice->fbr_invoice_number
            ?: ('TEMP-'.$invoice->id.'-'.$invoice->approval_token);

        try {
            $qrSvg = QrCode::format('svg')
                ->size(96)
                ->margin(0)
                ->errorCorrection('M')
                ->generate($qrPayload);
            $qrBase64 = 'data:image/svg+xml;base64,'.base64_encode($qrSvg);
        } catch (\Throwable $e) {
            $qrBase64 = '';
        }

        $pdf = Pdf::loadView('invoices.pdf', [
            'invoice' => $invoice,
            'qr' => $qrBase64,
            'verified' => (bool) $invoice->fbr_invoice_number,
        ])->setPaper('a4');

        $path = "invoices/{$invoice->tenant_id}/invoice-{$invoice->id}.pdf";
        Storage::disk('local')->put($path, $pdf->output());

        $invoice->update(['pdf_path' => $path]);

        return $path;
    }

    public function absolutePath(Invoice $invoice): string
    {
        if (! $invoice->pdf_path || ! Storage::disk('local')->exists($invoice->pdf_path)) {
            $this->generate($invoice);
        }

        return Storage::disk('local')->path($invoice->pdf_path);
    }
}
