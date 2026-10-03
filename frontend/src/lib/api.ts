import type {
  ChatSession,
  SessionSummary,
  SendMessageRequest,
  SendMessageResponse,
  EditMessageResponse,
  ShareSession,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'API error');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function listSessions(): Promise<{ sessions: SessionSummary[] }> {
  return apiFetch('/sessions');
}

export async function createSession(title?: string): Promise<ChatSession> {
  const params = title ? `?title=${encodeURIComponent(title)}` : '';
  return apiFetch(`/sessions${params}`, { method: 'POST' });
}

export async function getSession(sessionId: string): Promise<ChatSession> {
  return apiFetch(`/sessions/${sessionId}`);
}

export async function updateSession(
  sessionId: string,
  body: { title?: string; filter_doc?: string }
): Promise<ChatSession> {
  return apiFetch(`/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  return apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function shareSession(sessionId: string): Promise<ShareSession> {
  return apiFetch(`/sessions/${sessionId}/share`);
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function sendMessage(
  sessionId: string,
  body: SendMessageRequest
): Promise<SendMessageResponse> {
  return apiFetch(`/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function editMessage(
  sessionId: string,
  messageIndex: number,
  content: string
): Promise<EditMessageResponse> {
  return apiFetch(`/sessions/${sessionId}/messages/${messageIndex}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

// ── Documents ────────────────────────────────────────────────────────────────

export async function listDocuments(): Promise<{ documents: string[] }> {
  return apiFetch('/documents');
}
