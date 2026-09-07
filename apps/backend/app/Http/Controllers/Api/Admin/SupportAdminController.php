<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportSession;
use App\Models\Tenant;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportAdminController extends Controller
{
    public function __construct(protected NotificationService $notifications) {}

    public function summary(): JsonResponse
    {
        return response()->json([
            'open' => (int) SupportSession::query()->where('status', SupportSession::STATUS_OPEN)->count(),
            'in_progress' => (int) SupportSession::query()->where('status', SupportSession::STATUS_IN_PROGRESS)->count(),
            'active' => (int) SupportSession::query()->whereIn('status', [SupportSession::STATUS_OPEN, SupportSession::STATUS_IN_PROGRESS])->count(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = SupportSession::query()
            ->with(['tenant:id,name,slug', 'user:id,name,email', 'assignedTo:id,name,email', 'latestMessage']);

        $status = $request->query('status');

        if ($status === 'active' || ! $status) {
            $query->whereIn('status', [SupportSession::STATUS_OPEN, SupportSession::STATUS_IN_PROGRESS]);
        } elseif ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($request->query('category')) {
            $query->where('category', $request->query('category'));
        }

        if ($request->query('priority')) {
            $query->where('priority', $request->query('priority'));
        }

        if ($request->query('tenant_id')) {
            $query->where('tenant_id', $request->query('tenant_id'));
        }

        if ($search = $request->query('search')) {
            $tenantIds = Tenant::query()
                ->where('name', 'like', "%{$search}%")
                ->orWhere('slug', 'like', "%{$search}%")
                ->pluck('id');

            $query->where(function ($q) use ($search, $tenantIds) {
                $q->whereIn('tenant_id', $tenantIds)
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        $query->latest('updated_at');

        return response()->json($query->paginate(25));
    }

    public function show(SupportSession $session): JsonResponse
    {
        return response()->json($session->load(['tenant:id,name,slug', 'user:id,name,email', 'assignedTo:id,name,email', 'messages.sender:id,name,email']));
    }

    public function reply(Request $request, SupportSession $session): JsonResponse
    {
        if ($session->status === SupportSession::STATUS_ARCHIVED) {
            return response()->json(['message' => 'Archived sessions cannot receive replies.'], 422);
        }

        $admin = $request->user();

        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
        ]);

        $session->messages()->create([
            'sender_type' => 'admin',
            'sender_id' => $admin->id,
            'body' => $data['body'],
        ]);

        $updates = ['status' => SupportSession::STATUS_IN_PROGRESS];

        if ($session->status === SupportSession::STATUS_OPEN) {
            $updates['assigned_to'] = $admin->id;
        }

        $session->update($updates);

        $owner = $session->tenant_id && $session->tenant
            ? User::query()->find($session->tenant->owner_user_id)
            : null;

        if ($owner) {
            $this->notifications->toUser(
                $owner,
                'support.reply',
                'Support reply received',
                'An administrator replied on '.$session->reference.'.',
                ['reference' => $session->reference, 'session_id' => $session->id],
                true,
            );
        }

        return response()->json($session->fresh('messages'));
    }

    public function status(Request $request, SupportSession $session): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:open,in_progress,resolved,archived'],
            'note' => ['sometimes', 'string', 'max:4000'],
        ]);

        $updates = ['status' => $data['status']];

        if ($data['status'] === SupportSession::STATUS_RESOLVED) {
            $updates['resolved_at'] = now();
        } elseif ($data['status'] === SupportSession::STATUS_OPEN) {
            $updates['resolved_at'] = null;
        }

        if ($data['status'] === SupportSession::STATUS_ARCHIVED) {
            $updates['archived_at'] = now();
        }

        if (! empty($data['note'])) {
            $session->messages()->create([
                'sender_type' => 'system',
                'sender_id' => $request->user()->id,
                'body' => '[Status changed to '.$data['status'].'] '.$data['note'],
            ]);
        }

        $session->update($updates);

        if ($data['status'] === SupportSession::STATUS_RESOLVED && $session->tenant && $session->tenant->owner_user_id) {
            $owner = User::query()->find($session->tenant->owner_user_id);

            if ($owner) {
                $this->notifications->toUser(
                    $owner,
                    'support.resolved',
                    'Support request resolved',
                    'Your request '.$session->reference.' has been resolved.',
                    ['reference' => $session->reference, 'session_id' => $session->id],
                    false,
                );
            }
        }

        return response()->json($session->fresh());
    }
}
