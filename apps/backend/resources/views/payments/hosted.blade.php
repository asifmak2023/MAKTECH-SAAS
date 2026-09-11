<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Redirecting to checkout</title>
</head>
<body>
    <p>Redirecting to the payment provider...</p>
    <form id="hosted-checkout" method="{{ $method }}" action="{{ $action }}">
        @foreach ($fields as $name => $value)
            <input type="hidden" name="{{ $name }}" value="{{ $value }}">
        @endforeach
        <noscript>
            <button type="submit">Continue to {{ $gateway }}</button>
        </noscript>
    </form>
    <script>document.getElementById('hosted-checkout').submit();</script>
</body>
</html>
