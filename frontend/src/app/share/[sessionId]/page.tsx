'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import type { ShareSession } from '@/types';
import { shareSession } from '@/lib/api';

export default function SharePage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const [data, setData] = useState<ShareSession | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    shareSession(sessionId)
      .then(setData)
      .catch(() => setError('This conversation could not be found or is no longer available.'));
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-surface-container-lowest font-body-md text-on-surface antialiased">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[60px] bg-surface-container-low/85 backdrop-blur-xl border-b border-outline-variant/20 z-40 px-space-lg flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-space-md min-w-0">
          <span className="text-xl leading-none">🥗</span>
          <div className="flex flex-col">
            <span className="truncate font-headline-sm text-headline-sm text-on-surface font-semibold max-w-md">
              {data?.title ?? 'Shared Conversation'}
            </span>
            <span className="font-label-sm text-label-sm text-outline">
              Dietary Guidance Assistant · Read-only view
            </span>
          </div>
        </div>
        <div className="flex items-center gap-space-md shrink-0">
          <a
            href="/"
            className="flex items-center gap-space-xs px-space-md py-1.5 rounded-DEFAULT bg-primary text-on-primary font-label-md text-label-md font-semibold transition-all hover:shadow-[0_0_14px_rgba(78,222,163,0.4)]"
          >
            <span>Start your own chat</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="relative pt-[84px] pb-24 px-4 md:px-6 flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col space-y-6">
          {error && (
            <div className="p-4 rounded-DEFAULT bg-error-container/20 shadow-md flex items-start gap-3 mb-6">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">error</span>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                {error}
              </p>
            </div>
          )}

          {data?.messages.map((msg, i) => {
            const ts = msg.timestamp ? formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true }) : '';

            if (msg.role === 'user') {
              return (
                <div key={i} className="flex flex-col items-end group mb-6">
                  <div className="flex items-end gap-3 max-w-[85%]">
                    <div className="user-bubble-glow relative flex flex-col bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white p-4 md:p-5 rounded-2xl rounded-br-sm">
                      <p className="font-body-md text-body-md font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-2.5 text-indigo-200/80">
                        <span className="font-label-sm text-label-sm font-normal">{ts}</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary flex items-center justify-center font-label-sm text-label-sm font-bold shadow-md shrink-0 mb-1">
                      User
                    </div>
                  </div>
                </div>
              );
            }

            if (msg.refusal_mode === 'OOS') {
              return (
                <div key={i} className="flex items-start gap-3.5 w-full mb-6">
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
                <div key={i} className="flex items-start gap-3.5 w-full mb-6">
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
              <div key={i} className="flex items-start gap-3.5 w-full mb-6">
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
                        <span className="font-label-sm text-label-sm">{ts}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
