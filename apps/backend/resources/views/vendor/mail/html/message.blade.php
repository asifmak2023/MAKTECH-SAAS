<x-mail::layout>
{{-- Header --}}
<x-slot:header>
<x-mail::header :url="config('saas.web.app_url', config('app.url'))">
{{ config('app.name') }}
</x-mail::header>
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer --}}
<x-slot:footer>
<x-mail::footer>
<p>© {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
<p>You are receiving this email because of activity on your {{ config('app.name') }} workspace.</p>
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
