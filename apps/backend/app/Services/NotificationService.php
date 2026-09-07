<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class NotificationService
{
    /**
     * Send an in-app notification to a user (and optionally an e-mail).
     */
    public function toUser(User $user, string $type, string $title, string $body, array $data = [], bool $email = true): void
    {
        $payload = ['title' => $title, 'body' => $body] + $data;

        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\'.Str::studly($type),
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => json_encode($payload),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($email && $user->email) {
            $this->email($user->email, $title, $body, $user->name);
        }
    }

    /**
     * Notify the people responsible for a tenant (owner user + business e-mails).
     */
    public function toTenant(Tenant $tenant, string $type, string $title, string $body, array $data = [], bool $email = true): void
    {
        $delivered = false;

        if ($tenant->owner_user_id) {
            $owner = User::query()->find($tenant->owner_user_id);
            if ($owner) {
                $this->toUser($owner, $type, $title, $body, $data, false);
                $delivered = true;
            }
        }

        foreach ($tenant->users()->where('role', 'admin')->whereKeyNot($tenant->owner_user_id)->get() as $admin) {
            $this->toUser($admin, $type, $title, $body, $data, false);
        }

        if ($email) {
            $to = $tenant->billing_email ?: $tenant->seller_email;
            if ($to) {
                $this->email($to, $title, $body, $tenant->name);
            }
        }

        if (! $delivered && ! $email && $tenant->billing_email) {
            $this->email($tenant->billing_email, $title, $body, $tenant->name);
        }
    }

    protected function email(string $to, string $title, string $body, ?string $name = null): void
    {
        try {
            Mail::raw($body, function ($message) use ($to, $title, $name) {
                $message->to($to, $name)
                    ->subject($title);
            });
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
