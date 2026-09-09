<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Accounts model change:
 *  1. One email address can belong to exactly one account (globally unique
 *     email on `users`).
 *  2. A `username` column lets platform/staff accounts sign in with
 *     Username + Password. Tenant owners sign in with their workspace slug,
 *     which is stored here as well for fast lookups.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->deduplicateEmails();
        $this->addUsernameColumn();

        DB::transaction(function () {
            $this->backfillOwnerUsernames();
            $this->backfillPlatformUsernames();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
            $table->dropUnique(['email']);
        });
    }

    protected function deduplicateEmails(): void
    {
        $duplicates = DB::table('users')
            ->select('email')
            ->groupBy('email')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('email');

        foreach ($duplicates as $email) {
            $ids = DB::table('users')->where('email', $email)->orderBy('id')->pluck('id');
            $ids->shift(); // keep the earliest account for this email

            foreach ($ids as $id) {
                DB::table('users')->where('id', $id)->update([
                    'email' => 'disabled-'.$id.'@invalid.local',
                ]);
            }
        }
    }

    protected function addUsernameColumn(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Keep the existing per-tenant (tenant_id, email) unique index —
            // MySQL backs foreign keys off it in some schemas. The rows were
            // deduplicated first, so a global unique index on `email` alone is
            // safe to add alongside it.
            $table->string('username')->nullable()->after('name');
            $table->unique('username');
            $table->unique('email');
        });
    }

    protected function backfillOwnerUsernames(): void
    {
        $used = DB::table('users')->whereNotNull('username')->pluck('username')->map(
            fn ($value) => (string) $value
        )->all();

        $tenants = DB::table('tenants')->whereNotNull('owner_user_id')->get(['slug', 'owner_user_id']);

        foreach ($tenants as $tenant) {
            $slug = (string) $tenant->slug;
            if (in_array($slug, $used, true) || $slug === '') {
                continue;
            }

            $owner = DB::table('users')->where('id', $tenant->owner_user_id)->first();
            if (! $owner || $owner->username !== null) {
                continue;
            }

            DB::table('users')->where('id', $owner->id)->update(['username' => $slug]);
            $used[] = $slug;
        }
    }

    protected function backfillPlatformUsernames(): void
    {
        $used = DB::table('users')->whereNotNull('username')->pluck('username')->map(
            fn ($value) => (string) $value
        )->all();

        $reservedSlugs = DB::table('tenants')->pluck('slug')->map(
            fn ($value) => (string) $value
        )->all();

        $candidates = DB::table('users')
            ->where(function ($query) {
                $query->where('is_platform_admin', 1)->orWhereNull('tenant_id');
            })
            ->orderBy('id')
            ->get(['id', 'email']);

        foreach ($candidates as $user) {
            if ($user->email === null || str_starts_with($user->email, 'disabled-')) {
                continue;
            }

            $local = Str::of((string) $user->email)->before('@')->lower()->toString();
            $base = preg_replace('/[^a-z0-9]+/', '-', $local) ?: 'admin';
            $base = trim((string) $base, '-') ?: 'admin';
            $base = Str::substr($base, 0, 48);

            $candidate = $base;
            $counter = 2;
            while (in_array($candidate, $used, true) || in_array($candidate, $reservedSlugs, true)) {
                $candidate = Str::substr($base, 0, 44).'-'.$counter;
                $counter++;
            }

            $row = DB::table('users')->where('id', $user->id)->first();
            if ($row->username !== null) {
                continue;
            }

            DB::table('users')->where('id', $user->id)->update(['username' => $candidate]);
            $used[] = $candidate;
        }
    }
};
