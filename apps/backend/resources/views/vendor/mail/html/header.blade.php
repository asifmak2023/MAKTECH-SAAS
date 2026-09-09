@props(['url'])
@php
    $appName = (string) config('app.name');
    $brandWord = \Illuminate\Support\Str::upper(\Illuminate\Support\Str::before($appName, ' '));
    $brandTagline = trim(\Illuminate\Support\Str::after($appName, ' '));
@endphp
<tr>
<td class="mc-header" style="padding:26px 40px 22px; border-bottom:1px solid #ececec; background-color:#ffffff; text-align:center;">
<span style="color:#000000; font-size:15px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;">
{{ $brandWord }} <span style="font-weight:400; opacity:0.6; text-transform:none; letter-spacing:normal;">{{ $brandTagline }}</span>
</span>
</td>
</tr>
