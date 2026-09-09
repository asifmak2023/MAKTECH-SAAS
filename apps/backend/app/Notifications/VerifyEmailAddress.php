<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailAddress extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Verify your email address')
            ->view('mail.auth.verify-email', [
                'name' => $notifiable->name,
                'url' => $this->verificationUrl($notifiable),
                'minutes' => (int) config('saas.auth.verification_expire_minutes', 60),
            ]);
    }

    public static function makeSignature(int|string $id, string $emailHash, int $expires): string
    {
        return hash_hmac('sha256', $id.'|'.$emailHash.'|'.$expires, (string) config('app.key'));
    }

    public static function payload(object $notifiable, ?int $expires = null): array
    {
        $expires ??= now()->addMinutes((int) config('saas.auth.verification_expire_minutes', 60))->getTimestamp();
        $hash = sha1($notifiable->getEmailForVerification());

        return [
            'id' => $notifiable->getKey(),
            'hash' => $hash,
            'expires' => $expires,
            'signature' => self::makeSignature($notifiable->getKey(), $hash, $expires),
        ];
    }

    protected function verificationUrl(object $notifiable): string
    {
        return rtrim((string) config('saas.web.app_url'), '/').'/verify-email?'.http_build_query(self::payload($notifiable));
    }
}
