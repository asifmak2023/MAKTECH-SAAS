<tr>
<td class="mc-footer" style="padding:22px 40px 28px; border-top:1px solid #e5e5e5; background-color:#fafafa; text-align:center;">
<p style="margin:0 0 8px; color:#111111; font-size:11px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase;">
{{ \Illuminate\Support\Str::before(config('app.name'), ' ') }}
</p>
{{ Illuminate\Mail\Markdown::parse($slot) }}
</td>
</tr>
