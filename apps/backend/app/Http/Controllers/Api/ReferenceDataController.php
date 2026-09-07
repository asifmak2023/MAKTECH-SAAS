<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PralReferenceData;
use App\Services\PralInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class ReferenceDataController extends Controller
{
    public function __construct(protected PralInvoiceService $pral) {}

    public function hsCodes(Request $request): JsonResponse
    {
        return $this->respond('hs_codes', fn () => $this->pral->fetchHsCodes(), $request->query('q'));
    }

    public function uoms(Request $request): JsonResponse
    {
        return $this->respond('uoms', fn () => $this->pral->fetchUoms($request->query('hs_code')));
    }

    public function saleTypes(): JsonResponse
    {
        return $this->respond('sale_types', fn () => $this->pral->fetchSaleTypes());
    }

    public function provinces(): JsonResponse
    {
        return $this->respond('provinces', fn () => $this->pral->fetchProvinces());
    }

    public function docTypes(): JsonResponse
    {
        return $this->respond('doc_types', fn () => $this->pral->fetchDocTypes());
    }

    public function rates(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date'],
            'trans_type_id' => ['required', 'string'],
            'origination_supplier' => ['required', 'string'],
        ]);

        try {
            $rows = $this->pral->fetchSaleTypeToRate(
                $data['date'],
                $data['trans_type_id'],
                $data['origination_supplier'],
            );
        } catch (Throwable $e) {
            Log::warning('PRAL rates lookup failed', ['error' => $e->getMessage()]);
            $rows = \App\Services\PralFallbackData::rates();
        }

        return response()->json($rows);
    }

    public function sync(): JsonResponse
    {
        try {
            $this->pral->syncAllReferenceData();

            return response()->json(['message' => 'Reference data synced']);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    protected function respond(string $type, callable $fetcher, ?string $search = null): JsonResponse
    {
        try {
            $rows = $fetcher();
        } catch (Throwable $e) {
            Log::warning("PRAL {$type} fetch failed", ['error' => $e->getMessage()]);
            $query = PralReferenceData::query()->where('type', $type);
            $rows = $query->get()->map(fn ($row) => $row->payload ?: ['code' => $row->code, 'name' => $row->name])->all();
            if ($rows === []) {
                $rows = match ($type) {
                    'hs_codes' => \App\Services\PralFallbackData::hsCodes(),
                    'uoms' => \App\Services\PralFallbackData::uoms(),
                    'sale_types' => \App\Services\PralFallbackData::saleTypes(),
                    'provinces' => \App\Services\PralFallbackData::provinces(),
                    'doc_types' => \App\Services\PralFallbackData::docTypes(),
                    default => [],
                };
            }
        }

        if ($search && is_array($rows)) {
            $q = strtolower($search);
            $rows = array_values(array_filter($rows, function ($row) use ($q) {
                $hay = strtolower(json_encode($row));

                return str_contains($hay, $q);
            }));
            $rows = array_slice($rows, 0, 50);
        }

        return response()->json($rows);
    }
}
