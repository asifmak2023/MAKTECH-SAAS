@extends('mail.auth-layout')

@section('content')
<!-- Icon badge -->
<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
<tr>
<td class="badge-ring" width="64" height="64" align="center" valign="middle" style="width: 64px; height: 64px; border-radius: 50%; background-color: #000000;">
<span style="color: #ffffff; font-size: 18px; line-height: 1; font-weight: 700;">PW</span>
</td>
</tr>
</table>

<h1 class="fade-item" style="box-sizing: border-box; color: #111111; font-weight: 700; margin: 0 0 10px; text-align: center; font-size: 22px; letter-spacing: -0.02em; animation-delay: 0.1s;">Reset your password</h1>

<p class="fade-item" style="box-sizing: border-box; line-height: 1.6; font-size: 15px; margin-top: 0; text-align: center; margin-bottom: 8px; color: #3f3f3f; animation-delay: 0.2s;">
Hello {{ $name }},
</p>

<p class="fade-item" style="box-sizing: border-box; line-height: 1.6; font-size: 15px; margin-top: 0; text-align: center; margin-bottom: 30px; color: #3f3f3f; animation-delay: 0.3s;">
We received a request to reset the password for <strong>{{ $email }}</strong>. Open the link below to choose a new password and regain access to your workspace.
</p>

<!-- CTA -->
<table class="action" align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="box-sizing: border-box; margin: 0 0 28px; padding: 0; text-align: center; width: 100%;">
<tr>
<td align="center" style="box-sizing: border-box;">
<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="center" style="box-sizing: border-box;">
<a href="{{ $url }}"
class="button button-primary" target="_blank" rel="noopener"
style="box-sizing: border-box; -webkit-text-size-adjust: none; overflow: hidden; word-break: break-all; display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 15px 40px; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 6px; border: 0;">
Reset password
</a>
</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- Expiry note -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 8px; margin-bottom: 26px;">
<tr>
<td style="padding: 14px 18px; font-size: 13px; color: #555555; text-align: center;">
This link expires in <strong>{{ $minutes }} minutes</strong>.
</td>
</tr>
</table>

<p style="box-sizing: border-box; line-height: 1.6; font-size: 14px; margin-top: 0; text-align: center; margin-bottom: 14px; color: #767676;">
If you did not request a password reset, you can safely ignore this message.
</p>

<p style="box-sizing: border-box; line-height: 1.6; font-size: 15px; margin-top: 0; text-align: center; margin-bottom: 0; color: #3f3f3f;">
Regards,<br>
{{ config('app.name') }}
</p>

<!-- Subcopy -->
<table class="subcopy" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="box-sizing: border-box; border-top: 1px solid #eeeeee; margin-top: 30px; padding-top: 20px;">
<tr>
<td style="box-sizing: border-box; font-size: 12px;">
<p style="box-sizing: border-box; margin-top: 0; color: #999999; font-size: 12px; line-height: 1.6; margin: 0; text-align: center; margin-bottom: 0;">
If you're having trouble clicking the "Reset password" button, copy and paste the URL below into your web browser:
<br><br>
<span class="break-all" style="box-sizing: border-box; word-break: break-all;">
<a href="{{ $url }}" style="box-sizing: border-box; color: #000000; word-break: break-all;">
{{ $url }}
</a>
</span>
</p>
</td>
</tr>
</table>
@endsection
