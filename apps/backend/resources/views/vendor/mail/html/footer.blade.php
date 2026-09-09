@php
    $appName = (string) config('app.name');
    $brandWord = \Illuminate\Support\Str::upper(\Illuminate\Support\Str::before($appName, ' '));
    $logoUrl = rtrim((string) config('app.url'), '/').'/images/logo.png';
@endphp
<tr>
<td class="mc-footer" style="padding:24px 40px 30px; border-top:1px solid #eeeeee; background-color:#fafafa; text-align:center;">
{!! $slot ?? '' !!}
<p style="margin:0 0 8px; color:#111111; font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase;">
{{ $brandWord }}
</p>
<p style="margin:0 0 4px; color:#999999; font-size:11px; letter-spacing:0.02em; line-height:1.7;">
&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
</p>
<p style="margin:0; color:#999999; font-size:11px; letter-spacing:0.02em; line-height:1.7;">
You are receiving this email because of activity on your {{ config('app.name') }} workspace.
</p>

<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:16px auto 0;">
<tr>
<td valign="middle" style="padding-right:6px;">
<img src="{{ $logoUrl }}" alt="" width="14" style="display:block; width:14px; height:auto; border:0; opacity:0.55;">
</td>
<td valign="middle">
<span style="color:#b3b3b3; font-size:10px; letter-spacing:0.03em;">Credits to Muhammad Asif</span>
</td>
</tr>
</table>
</td>
</tr>
