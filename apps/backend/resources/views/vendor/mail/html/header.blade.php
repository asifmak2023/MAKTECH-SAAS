@props(['url'])
<tr>
<td class="mc-header" style="padding:26px 40px 22px; border-bottom:1px solid #e5e5e5; background-color:#ffffff;">
<a href="{{ $url }}" style="display:inline-block; text-decoration:none;">
<img
    src="{{ rtrim((string) config('app.url'), '/') }}/images/logo.webp"
    alt="{{ $slot ?: \Illuminate\Support\Str::before(config('app.name'), ' ') }}"
    width="128"
    style="display:block; width:128px; max-width:100%; height:auto; border:0;"
/>
</a>
</td>
</tr>
