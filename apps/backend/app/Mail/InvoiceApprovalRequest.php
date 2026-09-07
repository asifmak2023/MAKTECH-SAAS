<?php

namespace App\Mail;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvoiceApprovalRequest extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Invoice $invoice,
        public string $approvalUrl,
        public ?string $pdfPath = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Invoice approval requested from '.$this->invoice->seller_business_name,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.invoices.approval',
        );
    }

    public function attachments(): array
    {
        if (! $this->pdfPath || ! file_exists($this->pdfPath)) {
            return [];
        }

        return [
            Attachment::fromPath($this->pdfPath)
                ->as('invoice-'.$this->invoice->id.'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
