<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sales Invoice #{{ $invoice->id }}</title>
    <style>
        @page { margin: 24px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1f2937; }
        .header { display: table; width: 100%; margin-bottom: 16px; }
        .header-left, .header-right { display: table-cell; vertical-align: top; }
        .header-right { text-align: right; width: 160px; }
        .brand { font-size: 18px; font-weight: bold; color: #0f766e; }
        .muted { color: #6b7280; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .badge-ok { background: #dcfce7; color: #166534; }
        .badge-wait { background: #fef3c7; color: #92400e; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #0f766e; color: #fff; padding: 6px; font-size: 10px; text-align: left; }
        td { border-bottom: 1px solid #e5e7eb; padding: 6px; font-size: 10px; }
        .box { border: 1px solid #d1d5db; padding: 8px; width: 48%; }
        .row { display: table; width: 100%; }
        .col { display: table-cell; vertical-align: top; }
        .totals { width: 280px; margin-left: auto; }
        .totals td { border: 0; }
        .qr { width: 96px; height: 96px; }
        .footer { margin-top: 24px; font-size: 9px; color: #6b7280; text-align: center; }
        .right { text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="brand">PRAL Digital Invoicing System</div>
            <div>{{ $invoice->seller_business_name }}</div>
            <div class="muted">NTN/CNIC: {{ $invoice->seller_ntn_cnic }}</div>
            <div class="muted">{{ $invoice->seller_address }}, {{ $invoice->seller_province }}</div>
        </div>
        <div class="header-right">
            <img class="qr" src="{{ $qr }}" alt="QR">
            @if($verified)
                <div class="badge badge-ok">FBR Verified</div>
            @else
                <div class="badge badge-wait">Pending FBR</div>
            @endif
        </div>
    </div>

    <h2 style="margin: 0 0 8px;">{{ $invoice->invoice_type }}</h2>
    <table>
        <tr>
            <td><strong>Invoice Date</strong><br>{{ $invoice->invoice_date->format('d M Y') }}</td>
            <td><strong>Local Ref</strong><br>{{ $invoice->invoice_ref_no ?: 'INV-'.$invoice->id }}</td>
            <td><strong>FBR Invoice No</strong><br>{{ $invoice->fbr_invoice_number ?: '—' }}</td>
            <td><strong>Status</strong><br>{{ strtoupper(str_replace('_', ' ', $invoice->status)) }}</td>
        </tr>
    </table>

    <div class="row" style="margin-top: 12px;">
        <div class="col box">
            <strong>Seller</strong>
            <div>{{ $invoice->seller_business_name }}</div>
            <div>NTN/CNIC: {{ $invoice->seller_ntn_cnic }}</div>
            <div>{{ $invoice->seller_address }}</div>
            <div>{{ $invoice->seller_province }}</div>
        </div>
        <div class="col" style="width: 4%;"></div>
        <div class="col box">
            <strong>Buyer</strong>
            <div>{{ $invoice->buyer_business_name }}</div>
            <div>NTN/CNIC: {{ $invoice->buyer_ntn_cnic ?: 'Unregistered' }}</div>
            <div>{{ $invoice->buyer_address }}</div>
            <div>{{ $invoice->buyer_province }} ({{ $invoice->buyer_registration_type }})</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>HS Code</th>
                <th>Description</th>
                <th>UoM</th>
                <th class="right">Qty</th>
                <th>Rate</th>
                <th class="right">Value ex. ST</th>
                <th class="right">ST</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $item)
                <tr>
                    <td>{{ $item->line_number }}</td>
                    <td>{{ $item->hs_code }}</td>
                    <td>{{ $item->product_description }}</td>
                    <td>{{ $item->uom }}</td>
                    <td class="right">{{ number_format($item->quantity, 2) }}</td>
                    <td>{{ $item->rate }}</td>
                    <td class="right">{{ number_format($item->value_sales_excluding_st, 2) }}</td>
                    <td class="right">{{ number_format($item->sales_tax_applicable, 2) }}</td>
                    <td class="right">{{ number_format($item->total_values, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td>Subtotal (ex. ST)</td><td class="right">PKR {{ number_format($invoice->subtotal, 2) }}</td></tr>
        <tr><td>Sales Tax</td><td class="right">PKR {{ number_format($invoice->sales_tax_total, 2) }}</td></tr>
        <tr><td>Further Tax</td><td class="right">PKR {{ number_format($invoice->further_tax_total, 2) }}</td></tr>
        <tr><td>Extra Tax</td><td class="right">PKR {{ number_format($invoice->extra_tax_total, 2) }}</td></tr>
        <tr><td>Discount</td><td class="right">PKR {{ number_format($invoice->discount_total, 2) }}</td></tr>
        <tr><td><strong>Grand Total</strong></td><td class="right"><strong>PKR {{ number_format($invoice->grand_total, 2) }}</strong></td></tr>
    </table>

    <div class="footer">
        Generated for PRAL Digital Invoicing System (FBR). QR encodes {{ $invoice->fbr_invoice_number ?: 'a temporary identifier until FBR issues the invoice number' }}.
    </div>
</body>
</html>
