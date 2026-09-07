<x-mail::message>
# Invoice approval requested

**{{ $invoice->seller_business_name }}** has sent you a sales invoice for review.

- Buyer: {{ $invoice->buyer_business_name }}
- Date: {{ $invoice->invoice_date->format('d M Y') }}
- Amount: PKR {{ number_format($invoice->grand_total, 2) }}

Please open the link below to view the PDF and Approve or Reject.

<x-mail::button :url="$approvalUrl">
Review invoice
</x-mail::button>

If the button does not work, copy this URL:<br>
{{ $approvalUrl }}

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
