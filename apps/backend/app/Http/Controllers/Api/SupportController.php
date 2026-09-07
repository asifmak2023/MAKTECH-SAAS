<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportSession;
use App\Models\Tenant;
use App\Services\NotificationService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SupportController extends Controller
{
    public function __construct(protected NotificationService $notifications) {}

    protected function tenant(): Tenant
    {
        return TenantContext::get() ?? abort(400, 'Tenant context missing.');
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenant();

        $sessions = SupportSession::query()
            ->where('tenant_id', $tenant->id)
            ->with(['latestMessage'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when(! $request->query('status'), fn ($q) => $q->whereIn('status', ['open', 'in_progress', 'resolved']))
            ->latest('updated_at')
            ->get();

        return response()->json(['data' => $sessions]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->tenant();
        $user = $request->user();

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'category' => ['required', 'in:billing,pral,invoice,customer,technical,account,other'],
            'priority' => ['sometimes', 'in:low,normal,high'],
            'message' => ['required', 'string', 'max:4000'],
        ]);

        $session = SupportSession::query()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'reference' => 'SUP-'.strtoupper(Str::random(8)),
            'subject' => $data['subject'],
            'category' => $data['category'],
            'priority' => $data['priority'] ?? 'normal',
            'status' => SupportSession::STATUS_OPEN,
            'opened_at' => now(),
        ]);

        $session->messages()->create([
            'sender_type' => 'tenant_user',
            'sender_id' => $user->id,
            'body' => $data['message'],
        ]);

        $this->notifications->toPlatformAdmins(
            'support.new',
            'New support request',
            "{$tenant->name} ({$tenant->slug}) opened \"{$data['subject']}\" (".($data['priority'] ?? 'normal').').',
            ['reference' => $session->reference, 'session_id' => $session->id, 'tenant' => $tenant->slug],
        );

        return response()->json($session->load('messages'), 201);
    }

    public function show(Request $request, SupportSession $session): JsonResponse
    {
        $tenant = $this->tenant();

        if ($session->tenant_id !== $tenant->id) {
            abort(404, 'Support session not found.');
        }

        return response()->json($session->load('messages.sender:id,name,email'));
    }

    public function message(Request $request, SupportSession $session): JsonResponse
    {
        $tenant = $this->tenant();

        if ($session->tenant_id !== $tenant->id || $session->status === SupportSession::STATUS_ARCHIVED) {
            abort(404, 'Support session not found.');
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
        ]);

        $session->messages()->create([
            'sender_type' => 'tenant_user',
            'sender_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        $wasResolved = $session->status === SupportSession::STATUS_RESOLVED;

        if ($wasResolved) {
            // A follow-up re-opens the conversation for the admin.
            $session->update([
                'status' => SupportSession::STATUS_IN_PROGRESS,
                'resolved_at' => null,
            ]);
        } else {
            $session->update(['status' => SupportSession::STATUS_IN_PROGRESS]);
        }

        $this->notifications->toPlatformAdmins(
            'support.message',
            'Seller replied to support',
            "{$tenant->name} replied on {$session->reference}.",
            ['reference' => $session->reference, 'session_id' => $session->id],
        );

        return response()->json($session->fresh('messages'));
    }

    public function resolve(Request $request, SupportSession $session): JsonResponse
    {
        $tenant = $this->tenant();

        if ($session->tenant_id !== $tenant->id || $session->status === SupportSession::STATUS_ARCHIVED) {
            abort(404, 'Support session not found.');
        }

        if (! $session->isActive()) {
            return response()->json(['message' => 'This session is already closed.'], 422);
        }

        $session->update([
            'status' => SupportSession::STATUS_RESOLVED,
            'resolved_at' => now(),
        ]);

        return response()->json($session->fresh());
    }
}
