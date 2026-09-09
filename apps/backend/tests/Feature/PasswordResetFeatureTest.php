<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->seed(\Database\Seeders\PlatformBootstrapSeeder::class);
    }

    protected function registerSeller(): User
    {
        $this->postJson('/api/auth/register', [
            'tenant_name' => 'Reset Co',
            'tenant_slug' => 'reset-co',
            'name' => 'Owner',
            'email' => 'owner@reset.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'seller_ntn_cnic' => '1234567',
            'seller_business_name' => 'Reset Co',
            'seller_province' => 'Sindh',
            'seller_address' => 'Karachi',
        ])->assertCreated();

        return User::withoutGlobalScopes()->where('email', 'owner@reset.local')->firstOrFail();
    }

    public function test_forgot_password_sends_reset_link_notification_with_web_url(): void
    {
        $user = $this->registerSeller();

        $this->postJson('/api/auth/password/forgot', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for that email, a password reset link has been sent.');

        Notification::assertSentTo($user, ResetPasswordLink::class, function (ResetPasswordLink $n, $channels) use ($user) {
            $mail = $n->toMail($user);

            return str_contains($mail->actionUrl ?? '', '/reset-password?')
                && str_contains($mail->actionUrl ?? '', 'email=owner%40reset.local')
                && str_contains($mail->actionUrl ?? '', 'tenant=reset-co')
                && str_contains((string) $mail->render(), 'images/logo.png');
        });

        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_forgot_password_does_not_leak_whether_email_exists(): void
    {
        $this->postJson('/api/auth/password/forgot', ['email' => 'nobody@reset.local'])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for that email, a password reset link has been sent.');

        Notification::assertNothingSent();
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'nobody@reset.local']);
    }

    public function test_forgot_password_requires_valid_email(): void
    {
        $this->postJson('/api/auth/password/forgot', ['email' => 'not-an-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_reset_password_updates_password_and_revokes_tokens(): void
    {
        $user = $this->registerSeller();

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
            'tenant' => 'reset-co',
        ])->assertOk();

        $token = Password::broker()->createToken($user);

        $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'newpass456',
            'password_confirmation' => 'newpass456',
            'tenant' => 'reset-co',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Your password has been reset. Sign in with your new password.');

        $this->assertTrue(Hash::check('newpass456', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->assertSame(0, $user->fresh()->tokens()->count());

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'newpass456',
            'tenant' => 'reset-co',
        ])->assertOk();
    }

    public function test_reset_password_rejects_invalid_and_expired_tokens(): void
    {
        $user = $this->registerSeller();

        $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => 'invalid-token',
            'password' => 'newpass456',
            'password_confirmation' => 'newpass456',
            'tenant' => 'reset-co',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');

        $token = Password::broker()->createToken($user);

        DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->update(['created_at' => now()->subHours(2)]);

        $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'newpass456',
            'password_confirmation' => 'newpass456',
            'tenant' => 'reset-co',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');
    }

    public function test_reset_password_validates_policy_and_confirmation(): void
    {
        $user = $this->registerSeller();
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'short1',
            'password_confirmation' => 'short1',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'newpass456',
            'password_confirmation' => 'mismatch456',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }
}
