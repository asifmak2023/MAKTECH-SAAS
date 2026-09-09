<?php

use App\Models\FbrIntegration;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * FBR keys are issued per seller registration, so a sandbox/production token
 * may only be bound to a single account. The token itself lives inside the
 * encrypted `config` blob, so uniqueness is enforced on a keyed HMAC
 * fingerprint of the token instead of the plaintext value.
 *
 * Existing rows are backfilled: the earliest account to register a key keeps
 * the claim; later duplicates are left unclaimed so the unique index can be
 * created without failing on legacy/shared dev tokens.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fbr_integrations', function (Blueprint $table) {
            $table->string('token_fingerprint', 64)->nullable()->after('mode');
        });

        $this->backfillFingerprints();

        Schema::table('fbr_integrations', function (Blueprint $table) {
            $table->unique(['integrator', 'mode', 'token_fingerprint'], 'fbr_tokens_one_account_unique');
        });
    }

    public function down(): void
    {
        Schema::table('fbr_integrations', function (Blueprint $table) {
            $table->dropUnique('fbr_tokens_one_account_unique');
            $table->dropColumn('token_fingerprint');
        });
    }

    protected function backfillFingerprints(): void
    {
        $claimed = [];

        foreach (DB::table('fbr_integrations')->orderBy('id')->get() as $row) {
            $token = $this->extractToken($row->config);

            if ($token === null) {
                continue;
            }

            $key = $row->integrator.'|'.$row->mode.'|'.FbrIntegration::fingerprintFor($token);

            if (isset($claimed[$key])) {
                continue;
            }

            $claimed[$key] = $row->id;

            DB::table('fbr_integrations')
                ->where('id', $row->id)
                ->update(['token_fingerprint' => FbrIntegration::fingerprintFor($token)]);
        }
    }

    protected function extractToken(?string $config): ?string
    {
        if (! $config) {
            return null;
        }

        try {
            $data = (array) json_decode((string) Crypt::decryptString($config), true);
        } catch (\Throwable) {
            $data = (array) json_decode((string) $config, true);
        }

        $token = $data['token'] ?? null;

        return is_string($token) && trim($token) !== '' ? trim($token) : null;
    }
};
