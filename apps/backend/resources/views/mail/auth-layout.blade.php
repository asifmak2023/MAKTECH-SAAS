<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>{{ config('app.name') }}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!--<![endif]-->
<style>
  @media only screen and (max-width: 600px) {
    .mc-card { width: 100% !important; }
    .mc-inner { padding: 32px 24px !important; }
    .mc-header { padding: 22px 24px !important; }
    .mc-footer { padding: 20px 24px 26px !important; }
    .button { width: 100% !important; text-align: center !important; }
    .badge-ring { width: 56px !important; height: 56px !important; }
  }

  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(8px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes softPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.12); }
    50% { box-shadow: 0 0 0 6px rgba(0,0,0,0.06); }
  }
  @keyframes buttonGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.18); }
    50% { box-shadow: 0 0 0 8px rgba(0,0,0,0); }
  }
  @keyframes checkPop {
    0% { transform: scale(0.6); opacity: 0; }
    60% { transform: scale(1.08); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }

  .mc-card {
    animation: fadeInUp 0.6s ease-out both;
  }
  .fade-item {
    animation: fadeInUp 0.6s ease-out both;
  }
  .badge-ring {
    animation: softPulse 2.4s ease-in-out infinite, checkPop 0.5s ease-out;
  }
  .button-primary {
    transition: transform 0.15s ease, background-color 0.15s ease;
    animation: buttonGlow 2.2s ease-in-out infinite;
  }
  .button-primary:hover {
    transform: translateY(-1px);
    background-color: #1a1a1a !important;
  }
</style>
</head>
<body style="box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; position: relative; color: #3f3f3f; height: 100%; line-height: 1.5; width: 100% !important; margin: 0; padding: 0; background-color: #f2f2f2; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

@php
    $appName = (string) config('app.name');
    $brandWord = \Illuminate\Support\Str::upper(\Illuminate\Support\Str::before($appName, ' '));
    $brandTagline = trim(\Illuminate\Support\Str::after($appName, ' '));
    $logoUrl = rtrim((string) config('app.url'), '/').'/images/logo.png';
@endphp

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative; background-color: #f2f2f2; padding: 40px 12px;">
<tr>
<td align="center" style="box-sizing: border-box;">

<table class="mc-card" role="presentation" width="600" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative; max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #e6e6e6; border-radius: 12px; overflow: hidden;">

<!-- Header -->
<tr>
<td class="mc-header" style="box-sizing: border-box; padding: 26px 40px 22px; background-color: #ffffff; border-bottom: 1px solid #ececec; text-align: center;">
<span style="box-sizing: border-box; color: #000000; font-size: 15px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;">
{{ $brandWord }} <span style="font-weight: 400; opacity: 0.6; text-transform: none; letter-spacing: normal;">{{ $brandTagline }}</span>
</span>
</td>
</tr>

<!-- Body -->
<tr>
<td class="body" style="box-sizing: border-box; background-color: #ffffff;">
<table class="mc-inner" role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" style="box-sizing: border-box; max-width: 600px; width: 100%;">
<tr>
<td class="mc-inner" style="box-sizing: border-box; padding: 44px 40px 36px;">
@yield('content')
</td>
</tr>
</table>
</td>
</tr>

<!-- Footer -->
<tr>
<td class="mc-footer" style="box-sizing: border-box; padding: 24px 40px 30px; border-top: 1px solid #eeeeee; background-color: #fafafa; text-align: center;">
<p style="box-sizing: border-box; margin-top: 0; line-height: 1.7; text-align: center; margin: 0 0 8px; color: #111111; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;">
{{ $brandWord }}
</p>
<p style="box-sizing: border-box; margin-top: 0; color: #999999; font-size: 11px; letter-spacing: 0.02em; line-height: 1.7; margin: 0 0 4px; text-align: center;">
&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
</p>
<p style="box-sizing: border-box; margin-top: 0; color: #999999; font-size: 11px; letter-spacing: 0.02em; line-height: 1.7; margin: 0; text-align: center;">
You are receiving this email because of activity on your {{ config('app.name') }} workspace.
</p>

<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin: 16px auto 0;">
<tr>
<td valign="middle" style="padding-right: 6px;">
<img src="{{ $logoUrl }}" alt="" width="14" style="box-sizing: border-box; display: block; width: 14px; height: auto; border: 0; opacity: 0.55;">
</td>
<td valign="middle">
<span style="color: #b3b3b3; font-size: 10px; letter-spacing: 0.03em;">Credits to Muhammad Asif</span>
</td>
</tr>
</table>
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
