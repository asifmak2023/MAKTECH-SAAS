<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordLink extends Notification
{
    use Queueable;

    public function __construct(
        public string $token,
        public string $email,
        public ?string $tenant = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $expires = (int) config('auth.passwords.users.expire', 60);

        return (new MailMessage)
            ->subject('Reset your '.config('app.name').' password')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('We received a request to reset the password for '.$this->email.'.')
            ->action('Reset password', $this->resetUrl())
            ->line('This link expires in '.$expires.' minutes.')
            ->line('If you did not request a password reset, you can ignore this message.');
    }

    protected function resetUrl(): string
    {
        $query = http_build_query(array_filter([
            'email' => $this->email,
            'token' => $this->token,
            'tenant' => $this->tenant,
        ], fn ($v) => $v !== null && $v !== ''));

        return rtrim((string) config('saas.web.app_url'), '/').'/reset-password?'.$query;
    }
}
