<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>{{ config('app.name') }}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>
@media only screen and (max-width: 600px) {
  .mc-card { width: 100% !important; }
  .mc-inner { padding: 28px 24px !important; }
  .mc-header { padding: 22px 24px 18px !important; }
  .mc-footer { padding: 18px 24px 24px !important; }
  .button { width: 100% !important; text-align: center !important; }
}
</style>
{!! $head ?? '' !!}
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:32px 12px;">
<tr>
<td align="center">

<table class="mc-card" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border:1px solid #e5e5e5; border-radius:0;">
{!! $header ?? '' !!}

<!-- Email body -->
<tr>
<td class="body" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
<table class="mc-inner" role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
<tr>
<td class="mc-inner" style="padding:36px 40px 32px;">
{!! Illuminate\Mail\Markdown::parse($slot) !!}
{!! $subcopy ?? '' !!}
</td>
</tr>
</table>
</td>
</tr>

{!! $footer ?? '' !!}
</table>

</td>
</tr>
</table>
</body>
</html>
