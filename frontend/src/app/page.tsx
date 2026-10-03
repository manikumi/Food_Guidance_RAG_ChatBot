'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import type { ChatMessage, ChatSession, SessionSummary } from '@/types';
import {
  listSessions,
  createSession,
  getSession,
  updateSession,
  deleteSession,
  sendMessage,
  editMessage,
  listDocuments,
} from '@/lib/api';

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3.5">
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 shadow-md">
        <span className="text-sm">🥗</span>
      </div>
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl rounded-bl-sm bg-surface-container shadow-md">
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant italic">NutriChat RAG is querying verified corpus...</span>
      </div>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────
interface MessageBubbleProps {
  msg: ChatMessage;
  index: number;
  onEdit: (index: number, content: string) => void;
  isEditing: boolean;
  onStartEdit: (index: number) => void;
  onCancelEdit: () => void;
}

function MessageBubble({ msg, index, onEdit, isEditing, onStartEdit, onCancelEdit }: MessageBubbleProps) {
  const [editContent, setEditContent] = useState(msg.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleEditSubmit = () => {
    if (editContent.trim()) {
      onEdit(index, editContent.trim());
    }
  };

  const ts = msg.timestamp ? formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true }) : '';

  if (isEditing && msg.role === 'user') {
    return (
      <div className="flex flex-col items-end w-full group mb-6">
        <div className="flex items-start gap-3 w-full max-w-3xl justify-end">
          <div className="flex-1 flex flex-col items-end">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[13px]">mode_edit</span>
                Active Prompt Editing Mode
              </span>
            </div>
            <div className="w-full bg-surface-container p-4 rounded-2xl shadow-[0_0_24px_rgba(78,222,163,0.18)] ring-2 ring-primary">
              <textarea
                ref={editRef}
                className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md rounded-DEFAULT p-3 focus:outline-none resize-none leading-relaxed"
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                  if (e.key === 'Escape') onCancelEdit();
                }}
                rows={3}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2">
                <span className="font-label-sm text-label-sm text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">keyboard</span>
                  <span>Enter to save • Esc to cancel</span>
                </span>
                <div className="flex items-center gap-2">
                  <button className="px-3.5 py-1.5 rounded-DEFAULT bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors" onClick={onCancelEdit}>
                    Cancel
                  </button>
                  <button className="px-4 py-1.5 rounded-DEFAULT bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-1.5 shadow-[0_0_14px_rgba(78,222,163,0.35)] hover:shadow-[0_0_20px_rgba(78,222,163,0.5)] transition-all" onClick={handleEditSubmit}>
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    <span>Save &amp; Resubmit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary flex items-center justify-center font-label-sm text-label-sm font-bold shadow-md shrink-0 mt-8">
            You
          </div>
        </div>
      </div>
    );
  }

  if (msg.role === 'user') {
    return (
      <div className="flex flex-col items-end group mb-6">
        <div className="flex items-end gap-3 max-w-[85%]">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 mb-2 bg-surface-container px-2 py-1 rounded-full shadow-sm">
            <button className="p-1 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors" title="Edit Prompt" onClick={() => onStartEdit(index)}>
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button className="p-1 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors" title="Copy Text" onClick={() => navigator.clipboard.writeText(msg.content)}>
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
            </button>
          </div>
          <div className="user-bubble-glow relative flex flex-col bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white p-4 md:p-5 rounded-2xl rounded-br-sm">
            <p className="font-body-md text-body-md font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            <div className="flex items-center justify-end gap-1.5 mt-2.5 text-indigo-200/80">
              <span className="font-label-sm text-label-sm font-normal">{ts}</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary flex items-center justify-center font-label-sm text-label-sm font-bold shadow-md shrink-0 mb-1">
            You
          </div>
        </div>
      </div>
    );
  }

  if (msg.refusal_mode === 'OOS') {
    return (
      <div className="flex items-start gap-3.5 w-full mb-6">
        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 mt-1">
          <span className="material-symbols-outlined text-outline text-[18px]">verified</span>
        </div>
        <div className="flex-1 space-y-3">
          <div className="p-4 rounded-DEFAULT bg-error-container/20 shadow-md flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">shield_with_heart</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-error-container text-error font-label-sm text-label-sm font-bold tracking-wide uppercase">
                  ⚠️ Out of Clinical Scope
                </span>
                <span className="font-label-sm text-label-sm text-outline">Clinical Safety Guardrail</span>
              </div>
              <div className="font-body-sm text-body-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (msg.refusal_mode === 'NIC') {
    return (
      <div className="flex items-start gap-3.5 w-full mb-6">
        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 mt-1">
          <span className="material-symbols-outlined text-outline text-[18px]">verified</span>
        </div>
        <div className="flex-1 space-y-3">
          <div className="p-4 rounded-DEFAULT bg-tertiary-container/15 shadow-md flex items-start gap-3">
            <span className="material-symbols-outlined text-tertiary text-[20px] shrink-0 mt-0.5">find_in_page</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container/40 text-tertiary-fixed font-label-sm text-label-sm font-bold tracking-wide uppercase">
                  📭 Not in Grounded Corpus
                </span>
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3.5 w-full mb-6">
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-primary/20">
        <span className="text-base select-none">🥗</span>
      </div>
      <div className="ai-container-shadow flex-1 min-w-0 bg-surface-container rounded-2xl overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary via-primary-container to-surface-container"></div>
        <div className="p-5 md:p-6 pl-6 md:pl-7 flex flex-col space-y-5">
          <div className="prose prose-invert prose-emerald max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
          
          <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container-low/50 -mx-6 md:-mx-7 -mb-6 md:-mb-7 px-6 md:px-7 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              {msg.is_cross_document && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-semibold">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                  Multi-Source RAG Synthesis
                </span>
              )}
              {msg.documents_used?.map((doc, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                  📚 {doc}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 text-outline">
              <button className="p-1.5 rounded-DEFAULT hover:bg-surface-container hover:text-on-surface transition-colors" title="Copy Response" onClick={() => navigator.clipboard.writeText(msg.content)}>
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Share Modal ───────────────────────────────────────────────────────────────
function ShareModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/${sessionId}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-surface-container p-6 md:p-7 rounded-2xl shadow-2xl shadow-black/80 flex flex-col space-y-5 animate-in fade-in zoom-in-95 duration-200 border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-[0_0_12px_rgba(78,222,163,0.2)]">
              <span className="material-symbols-outlined text-[20px]">share</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Share Conversation</h3>
              <span className="font-label-sm text-label-sm text-outline">Public Citation Snapshot</span>
            </div>
          </div>
          <button className="w-8 h-8 rounded-full hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
          Anyone with this link will be able to view this dietary guidance thread and verified RAG citations in read-only mode.
        </p>
        <div className="flex flex-col space-y-1.5">
          <label className="font-label-sm text-label-sm text-on-surface font-medium">Permashare RAG Link</label>
          <div className="flex items-center gap-2 bg-surface-container-low p-1.5 pl-3 rounded-DEFAULT shadow-inner border border-outline-variant/30">
            <span className="material-symbols-outlined text-outline text-[18px]">link</span>
            <input className="flex-1 bg-transparent font-code-inline text-code-inline text-on-surface focus:outline-none select-all truncate" readOnly type="text" value={shareUrl} />
            <button className={`px-3.5 py-1.5 rounded-DEFAULT text-on-primary font-label-md text-label-md font-semibold flex items-center gap-1.5 transition-all ${copied ? 'bg-primary-container shadow-none' : 'bg-primary hover:shadow-[0_0_14px_rgba(78,222,163,0.4)]'}`} onClick={handleCopy}>
              <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-DEFAULT bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-primary text-[16px]">lock_reset</span>
          <span>Personal health identifiers and private session parameters are automatically scrubbed.</span>
        </div>
      </div>
    </div>
  );
}

// ── Welcome Suggestions ───────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: '🧂', title: 'Hidden Sodium in Processed Foods', text: 'Break down common high-sodium grocery items and identify lower-sodium alternatives per USDA tables.' },
  { icon: 'cardiology', title: 'DASH Diet Protocol Breakdown', text: 'Review electrolyte balance strategies, potassium/sodium ratios, and arterial blood pressure trials.', isMaterial: true },
  { icon: '🍗', title: 'Cooked Poultry Storage', text: 'How long can I safely store cooked chicken in the refrigerator?' },
  { icon: '🥦', title: 'Eatwell Guide Vegetables', text: 'What specific vegetables does the Eatwell Guide recommend for daily intake?' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [documents, setDocuments] = useState<string[]>([]);
  const [filterDoc, setFilterDoc] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  useEffect(() => {
    async function init() {
      try {
        const [sResp, dResp] = await Promise.all([listSessions(), listDocuments()]);
        setSessions(sResp.sessions);
        setDocuments(dResp.documents);
      } catch {}
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isLoading]);

  useEffect(() => {
    const saved = localStorage.getItem('activeSessionId');
    if (saved) {
      handleSelectSession(saved);
    }
  }, []);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    try {
      const session = await getSession(sessionId);
      setActiveSession(session);
      setFilterDoc(session.filter_doc ?? '');
      localStorage.setItem('activeSessionId', sessionId);
    } catch {
      localStorage.removeItem('activeSessionId');
    }
  }, []);

  const handleNewChat = async () => {
    try {
      const session = await createSession();
      setSessions((prev) => [
        { session_id: session.session_id, title: session.title, created_at: session.created_at, updated_at: session.updated_at, message_count: 0, filter_doc: null },
        ...prev,
      ]);
      setActiveSession(session);
      setFilterDoc('');
      localStorage.setItem('activeSessionId', session.session_id);
      inputRef.current?.focus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (activeSession?.session_id === sessionId) {
        setActiveSession(null);
        localStorage.removeItem('activeSessionId');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    let sessionId = activeSession?.session_id;

    if (!sessionId) {
      try {
        const newSession = await createSession();
        setActiveSession(newSession);
        setSessions((prev) => [
          { session_id: newSession.session_id, title: newSession.title, created_at: newSession.created_at, updated_at: newSession.updated_at, message_count: 0, filter_doc: null },
          ...prev,
        ]);
        sessionId = newSession.session_id;
        localStorage.setItem('activeSessionId', newSession.session_id);
      } catch (e) {
        console.error(e);
        return;
      }
    }

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);

    const optimisticMsg: ChatMessage = { role: 'user', content, is_cross_document: false, documents_used: [], timestamp: new Date().toISOString() };
    setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev);

    try {
      const resp = await sendMessage(sessionId, { content, filter_doc: filterDoc || null });
      setActiveSession((prev) => {
        if (!prev) return prev;
        const msgs = [...prev.messages];
        msgs[msgs.length - 1] = resp.user_message;
        return { ...prev, title: resp.session.title, messages: [...msgs, resp.assistant_message] };
      });
      setSessions((prev) => prev.map((s) => s.session_id === sessionId ? { ...s, title: resp.session.title, message_count: s.message_count + 2, updated_at: resp.session.updated_at } : s));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (index: number, content: string) => {
    if (!activeSession) return;
    setEditingIndex(null);
    setIsLoading(true);

    try {
      const resp = await editMessage(activeSession.session_id, index, content);
      setActiveSession((prev) => prev ? { ...prev, messages: resp.messages } : prev);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async (doc: string) => {
    setFilterDoc(doc);
    if (activeSession) {
      try {
        await updateSession(activeSession.session_id, { filter_doc: doc || undefined });
      } catch {}
    }
  };

  const hasMessages = (activeSession?.messages?.length ?? 0) > 0;

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside className={`fixed left-0 top-0 h-full w-[280px] bg-surface-container-low border-r border-outline-variant/30 z-50 flex flex-col justify-between select-none transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col flex-1 min-h-0">
          <div className="h-[60px] px-space-md flex items-center justify-between border-b border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
              <span className="text-xl leading-none">🥗</span>
              <span className="font-headline-sm text-headline-sm bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">NutriChat</span>
            </div>
            <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high border border-outline-variant/40 font-label-sm text-label-sm text-primary tracking-wide">RAG v2.4</span>
          </div>
          <div className="p-space-md">
            <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-space-sm py-space-sm px-space-md rounded-DEFAULT bg-primary font-label-md text-label-md text-on-primary font-semibold shadow-[0_0_16px_rgba(78,222,163,0.3)] hover:shadow-[0_0_22px_rgba(78,222,163,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Chat</span>
            </button>
          </div>
          <div className="px-space-md pt-space-xs pb-space-xs flex items-center justify-between">
            <span className="font-label-sm text-label-sm tracking-wider uppercase text-outline">Conversations</span>
          </div>
          <div className="flex-1 overflow-y-auto px-space-sm py-space-xs space-y-1">
            <nav className="space-y-1">
              {sessions.map((s, idx) => (
                <div
                  key={s.session_id}
                  className={`session-item-animate group relative flex items-center justify-between px-space-sm py-space-sm rounded-DEFAULT transition-colors cursor-pointer ${activeSession?.session_id === s.session_id ? 'bg-surface-container-high text-primary border-l-2 border-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                  style={{ animationDelay: `${(idx + 1) * 60}ms` }}
                  onClick={() => handleSelectSession(s.session_id)}
                >
                  <div className="flex items-center gap-space-sm min-w-0 pr-space-xs">
                    <span className="material-symbols-outlined text-[18px] shrink-0">chat_bubble</span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-body-sm text-body-sm text-on-surface">{s.title || 'New Conversation'}</span>
                      <span className="font-label-sm text-label-sm text-outline">{formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <button onClick={(e) => handleDeleteSession(s.session_id, e)} className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-error transition-opacity">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </nav>
          </div>
        </div>
        <div className="p-space-md border-t border-outline-variant/20 bg-surface-container-lowest/50">
          <div className="flex items-center gap-space-sm mb-space-xs">
            <span className="material-symbols-outlined text-primary text-[16px]">verified</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Clinical Grounding</span>
          </div>
          <p className="font-body-sm text-body-sm text-outline leading-snug">Powered by WHO, NHS, USDA &amp; FAO guidance</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'pl-[280px]' : 'pl-0'}`}>
        {/* Header */}
        <header className={`fixed top-0 ${sidebarOpen ? 'left-[280px]' : 'left-0'} right-0 h-[60px] bg-surface-container-low/85 backdrop-blur-xl border-b border-outline-variant/20 z-40 px-space-lg flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.25)] transition-all duration-300`}>
          <div className="flex items-center gap-space-md min-w-0">
            <button className="md:hidden text-on-surface p-1" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <span className="truncate font-headline-sm text-headline-sm text-on-surface font-semibold max-w-md">{activeSession ? activeSession.title : 'New Chat'}</span>
            <div className="hidden md:flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container border border-outline-variant/30 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="font-label-sm text-label-sm text-primary font-medium">Active RAG Pipeline</span>
            </div>
          </div>
          <div className="flex items-center gap-space-md shrink-0">
            {documents.length > 0 && (
              <div className="relative hidden md:flex items-center">
                <div className="flex items-center bg-surface-container border border-primary/40 rounded-DEFAULT px-2.5 py-1.5 shadow-[0_0_12px_rgba(78,222,163,0.15)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse mr-2.5 inline-block shrink-0"></span>
                  <select className="appearance-none bg-transparent font-label-md text-label-md text-on-surface font-medium pr-7 focus:outline-none cursor-pointer" value={filterDoc} onChange={(e) => handleFilterChange(e.target.value)}>
                    <option value="">All Documents</option>
                    {documents.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <span className="material-symbols-outlined text-[18px] text-primary pointer-events-none absolute right-2.5">expand_more</span>
                </div>
              </div>
            )}
            {activeSession && (
              <button className="share-btn-pulse flex items-center gap-space-xs px-space-md py-1.5 rounded-DEFAULT border border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary font-label-md text-label-md font-semibold transition-all relative overflow-hidden" onClick={() => setShareOpen(true)}>
                <span className="material-symbols-outlined text-[18px]">share</span>
                <span>Share</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#10b981]"></span>
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <main className="relative pt-[60px] min-h-screen bg-surface-container-lowest">
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] bg-primary/10 rounded-full blur-[140px]"></div>
            <div className="absolute top-[480px] -right-28 w-[420px] h-[420px] bg-secondary-container/20 rounded-full blur-[160px]"></div>
            <div className="absolute bottom-40 left-1/3 w-[360px] h-[360px] bg-primary-container/10 rounded-full blur-[120px]"></div>
          </div>
          <div className="relative z-10 w-full flex flex-col items-center px-4 md:px-6 pt-6 pb-48">
            <div className="w-full max-w-4xl flex flex-col space-y-6">
              {!hasMessages ? (
                <>
                  <div className="flex flex-col items-center pt-10 pb-8">
                    <span className="text-6xl animate-bounce" style={{ animationDuration: '3s' }}>🥗</span>
                    <h2 className="font-headline-xl text-headline-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mt-4">Dietary Guidance Assistant</h2>
                    <p className="font-body-lg text-body-lg text-outline mt-2 max-w-2xl text-center">
                      Ask anything about food safety, nutrition, or healthy eating — all answers are grounded in official WHO, NHS, USDA, and FAO guidelines.
                    </p>
                  </div>
                  <div className="w-full flex flex-col space-y-3 pt-1">
                    <div className="flex items-center justify-between px-1">
                      <span className="font-label-sm text-label-sm text-outline tracking-wider uppercase font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">tips_and_updates</span>
                        Related Clinical Prompts &amp; Deep-Dives
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {SUGGESTIONS.map((s, idx) => (
                        <button key={idx} onClick={() => handleSend(s.text)} className="group text-left p-4 rounded-xl bg-gradient-to-b from-[#172033] to-[#101726] border border-white/10 hover:border-emerald-500/70 hover:shadow-[0_0_24px_rgba(16,185,129,0.28)] hover:-translate-y-1 transition-all duration-300 flex items-start gap-3.5 relative overflow-hidden">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.18)] group-hover:scale-110 group-hover:bg-emerald-500/25 transition-transform duration-300">
                            {s.isMaterial ? <span className="material-symbols-outlined text-[30px] text-primary select-none">{s.icon}</span> : <span className="text-3xl select-none leading-none">{s.icon}</span>}
                          </div>
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-headline-sm text-sm text-on-surface font-semibold group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {s.title}
                              <span className="material-symbols-outlined text-[15px] opacity-0 group-hover:opacity-100 text-primary transition-opacity transform group-hover:translate-x-0.5">arrow_forward</span>
                            </span>
                            <p className="font-body-sm text-xs text-on-surface-variant/80 mt-1 line-clamp-2 leading-relaxed">
                              {s.text}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-DEFAULT bg-surface-container-low shadow-sm mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Session Guard: Clinical Verification Active</span>
                    </div>
                  </div>
                  {activeSession?.messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} index={i} onEdit={handleEdit} isEditing={editingIndex === i} onStartEdit={setEditingIndex} onCancelEdit={() => setEditingIndex(null)} />
                  ))}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>
          
          {/* Input Area */}
          <div className={`fixed bottom-0 ${sidebarOpen ? 'left-[280px]' : 'left-0'} right-0 z-30 bg-surface-dim/80 backdrop-blur-2xl shadow-[0_-12px_32px_rgba(0,0,0,0.6)] px-4 md:px-8 pt-3 pb-6 flex justify-center transition-all duration-300`}>
            <div className="w-full max-w-4xl flex flex-col space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-bright text-primary font-label-sm text-label-sm font-medium transition-all shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    All Corpus Sources Active
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-bright text-on-surface-variant font-label-sm text-label-sm transition-all shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">shield</span>
                    Citations: Strict
                  </button>
                </div>
              </div>
              <div className="relative flex items-center bg-surface-container rounded-full shadow-2xl p-1.5 pr-2 focus-within:ring-2 focus-within:ring-primary focus-within:shadow-[0_0_24px_rgba(78,222,163,0.25)] transition-all">
                <textarea
                  ref={inputRef}
                  className="flex-1 bg-transparent px-4 py-3 min-h-[48px] max-h-[160px] text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none resize-none"
                  placeholder="Ask about nutritional guidelines, safe cooking temperatures..."
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  rows={1}
                  disabled={isLoading}
                />
                <div className="flex items-center gap-1 shrink-0 self-end mb-1">
                  <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100">
                    {isLoading ? (
                      <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]" style={{ transform: 'rotate(-30deg) translate(1px, -1px)' }}>send</span>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-outline font-label-sm text-label-sm">
                <span>Shift + Enter for new line</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:flex items-center gap-1 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[14px]">verified</span>
                  Verified against WHO, NHS, USDA &amp; FAO guidance
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {shareOpen && activeSession && <ShareModal sessionId={activeSession.session_id} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
