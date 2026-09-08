<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\GatewayNotConfiguredException;
use App\Exceptions\PaymentException;
use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Public inbound endpoint for payment-provider notifications. No auth is
 * required here: the gateway adapter verifies the signature before anything
 * is settled. The route is reached through the Next.js proxy at
 * {public_url}/api/webhooks/{gateway}.
 */
class PaymentWebhookController extends Controller
{
    public function __construct(
        protected PaymentService $payments,
    ) {}

    public function handle(Request $request, string $gateway): JsonResponse
    {
        try {
            $result = $this->payments->handleWebhook(
                $gateway,
                $request->headers->all(),
                $request->all(),
            );

            return response()->json(['success' => true] + $result);
        } catch (GatewayNotConfiguredException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (PaymentException $e) {
            return response()->json(['error' => $e->getMessage()], $e->statusCode);
        } catch (\Throwable $e) {
            Log::error('Payment webhook failed.', [
                'gateway' => $gateway,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'The webhook could not be processed.'], 500);
        }
    }
}
