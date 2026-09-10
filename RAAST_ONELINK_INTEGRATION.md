# RAAST API and 1Link P2M API Integration

This document describes the integration of RAAST API and 1Link P2M API into the SaaS application.

## Overview

The integration provides two payment gateway options for Pakistani customers:

1. **RAAST (P2M)** - Pakistan's instant payment network operated by State Bank of Pakistan
2. **1Link P2M** - 1LINK's digital payment acceptance service supporting QR codes, RAAST Alias, IBAN, and Request to Pay (RTP)

## Architecture

Both integrations follow the existing payment gateway pattern in the application:

- **Gateway Adapters**: `RaastGateway.php` and `OneLinkP2MGateway.php` in `app/Services/Payments/Gateways/`
- **Configuration**: Managed through `config/saas.php` and environment variables
- **Webhook Handling**: Integrated with existing `PaymentWebhookController.php`
- **Database**: Payment gateway credentials stored securely in `payment_gateways` table

## Features

### RAAST Gateway
- Request to Pay (RTP) functionality
- Sandbox mode for testing
- Live production mode with real API calls
- Webhook signature verification
- Environment variable fallback for credentials

### 1Link P2M Gateway
- Multiple payment methods: QR, RTP, RTP Later, Alias, IBAN
- Dynamic QR code generation
- Sandbox mode for testing
- Live production mode with real API calls
- Webhook signature verification
- Environment variable fallback for credentials

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# RAAST API Credentials
RAST_API_KEY=your_raast_api_key
RAST_APP_SECRET=your_raast_app_secret

# 1Link P2M API Credentials
ONELINK_P2M_API_KEY=your_onelink_api_key
ONELINK_P2M_API_SECRET=your_onelink_api_secret
ONELINK_P2M_MERCHANT_ID=your_onelink_merchant_id
ONELINK_P2M_SANDBOX_ENDPOINT=https://sandbox.1link.net.pk
ONELINK_P2M_LIVE_ENDPOINT=https://api.1link.net.pk
```

### Gateway Configuration

The gateways are configured in `config/saas.php`:

```php
'raast' => [
    'name' => 'Raast (P2M)',
    'adapter' => \App\Services\Payments\Gateways\RaastGateway::class,
    'supports_recurring' => false,
    'enabled' => (bool) env('SAAS_ENABLE_RAAST_GATEWAY', true),
    'config_keys' => ['merchant_id', 'api_key', 'api_secret', 'iban', 'alias', 'sandbox_endpoint', 'live_endpoint'],
    'env_credentials' => [
        'api_key' => ['env' => 'RAST_API_KEY'],
        'api_secret' => ['env' => 'RAST_APP_SECRET'],
    ],
],
'onelink_p2m' => [
    'name' => '1Link P2M',
    'adapter' => \App\Services\Payments\Gateways\OneLinkP2MGateway::class,
    'supports_recurring' => false,
    'enabled' => (bool) env('SAAS_ENABLE_ONELINK_P2M_GATEWAY', true),
    'config_keys' => ['merchant_id', 'api_key', 'api_secret', 'iban', 'alias', 'sandbox_endpoint', 'live_endpoint'],
    'env_credentials' => [
        'api_key' => ['env' => 'ONELINK_P2M_API_KEY'],
        'api_secret' => ['env' => 'ONELINK_P2M_API_SECRET'],
        'merchant_id' => ['env' => 'ONELINK_P2M_MERCHANT_ID'],
        'sandbox_endpoint' => ['env' => 'ONELINK_P2M_SANDBOX_ENDPOINT'],
        'live_endpoint' => ['env' => 'ONELINK_P2M_LIVE_ENDPOINT'],
    ],
],
```

## Usage

### Enabling Gateways

1. Run the database seeder to initialize payment gateways:
   ```bash
   php artisan db:seed --class=PlatformBootstrapSeeder
   ```

2. Configure gateways through the Admin Panel:
   - Navigate to Admin > Payment Gateways
   - Enable/disable specific gateways
   - Configure sandbox/production mode
   - Add merchant credentials (encrypted in database)

### Processing Payments

When a customer selects RAAST or 1Link P2M as payment method:

1. The system calls the appropriate gateway's `purchase()` method
2. For sandbox mode: Returns simulated payment response
3. For live mode: Makes actual API call to payment provider
4. Returns payment URL or QR code for customer to complete payment
5. Webhook notifies system when payment is completed

### Payment Methods

#### 1Link P2M supports multiple payment methods:
- `rtp` - Request to Pay (immediate)
- `rtp_later` - Request to Pay (deferred)
- `qr` - Dynamic QR code
- `alias` - RAAST Alias payment
- `iban` - IBAN-based payment

Specify payment method in checkout options:
```php
$options = [
    'payment_method' => 'qr', // or 'rtp', 'rtp_later', etc.
    'customer_email' => 'customer@example.com',
    'customer_mobile' => '+923001234567',
    'return_url' => 'https://your-app.com/billing/payments/return',
    'webhook_url' => 'https://your-app.com/api/webhooks/onelink_p2m',
];
```

## Webhook Handling

Both gateways implement webhook signature verification:

- **Sandbox mode**: Accepts all webhooks without verification
- **Production mode**: Verifies HMAC-SHA256 signature using API secret

Webhook endpoint: `/api/webhooks/{gateway_code}`

Example webhook verification:
```php
public function verifyWebhookSignature(array $headers, array $payload): bool
{
    if ($this->model->is_sandbox) {
        return true;
    }

    $signature = $headers['X-Signature'] ?? $headers['x-signature'] ?? null;
    $timestamp = $headers['X-Timestamp'] ?? $headers['x-timestamp'] ?? null;
    $apiSecret = $this->config['api_secret'] ?? null;

    if (!$signature || !$timestamp || !$apiSecret) {
        return false;
    }

    $expectedSignature = hash_hmac('sha256', $timestamp.json_encode($payload), $apiSecret);

    return hash_equals($expectedSignature, $signature);
}
```

## Security Considerations

1. **Credentials**: Never commit real API keys to version control
2. **Encryption**: Payment gateway credentials are encrypted in the database
3. **Signature Verification**: Production webhooks are cryptographically verified
4. **Environment Separation**: Clear separation between sandbox and production modes
5. **Error Handling**: Comprehensive error logging without exposing sensitive data

## Testing

### Sandbox Testing

Both gateways support sandbox mode for testing without real money:

1. Set gateway to sandbox mode in Admin Panel
2. Use sandbox API endpoints
3. Test payment flow with simulated responses
4. Webhook signatures are bypassed in sandbox mode

### Production Testing

Before going live:

1. Obtain real API credentials from RAAST/1Link
2. Configure production endpoints
3. Test with small amounts
4. Verify webhook signature verification
5. Monitor error logs for API issues

## API Endpoints

### RAAST API
- **Sandbox**: `https://sandbox.1link.net.pk`
- **Production**: `https://api.1link.net.pk`
- **Main Endpoint**: `/rtpNowMerchant`

### 1Link P2M API
- **Sandbox**: `https://sandbox.1link.net.pk`
- **Production**: `https://api.1link.net.pk`
- **Endpoints**:
  - `/rtpNowMerchant` - Immediate RTP
  - `/rtpLaterMerchant` - Deferred RTP
  - `/generateDQRCMerchant` - Dynamic QR
  - `/preRTPAliasInquiryMerchant` - Alias payment

## Troubleshooting

### Common Issues

1. **API Authentication Errors**
   - Verify API keys and secrets are correct
   - Check if gateway is in correct mode (sandbox/production)
   - Ensure merchant ID is properly configured

2. **Webhook Verification Failures**
   - Check API secret matches between configuration and payment provider
   - Verify signature headers are being passed correctly
   - Ensure timestamp is within acceptable window

3. **Payment Processing Errors**
   - Check Laravel logs for detailed error messages
   - Verify network connectivity to payment provider APIs
   - Ensure all required configuration keys are set

### Logging

All payment gateway errors are logged to Laravel's log system:

```php
Log::error('Raast API Error', [
    'status' => $response->status(),
    'body' => $response->body(),
    'payment_id' => $payment->id,
]);
```

## Future Enhancements

Potential improvements for the integration:

1. **Refund Support**: Add refund functionality for both gateways
2. **Payment Status Inquiry**: Implement status check endpoints
3. **Recurring Payments**: Add support for subscription-based recurring payments
4. **Advanced QR Features**: Support for static QR codes and batch generation
5. **Enhanced Error Handling**: More granular error codes and recovery strategies
6. **Analytics Dashboard**: Payment analytics and reporting for each gateway

## Support

For issues related to:
- **Integration Code**: Check the implementation in `app/Services/Payments/Gateways/`
- **API Documentation**: 
  - RAAST: https://safepay.mintlify.app/overview/introduction
  - 1Link: https://sandbox.1link.net.pk/uat-1link/sandbox/product/7270
- **Payment Provider Issues**: Contact RAAST or 1Link support directly