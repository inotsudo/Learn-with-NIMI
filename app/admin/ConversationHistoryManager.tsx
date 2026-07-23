'use client';

// Admin read-only viewer for AI conversation summaries.
// Raw messages are never stored — only AI-inferred summaries (2–4 sentences).
// RLS: parents can read their own children's summaries; admins use service-role bypass.

import React, { useEffect, useState, useCallback } from 'react';
import supabase from '@/lib/supabaseClient';
import { logAdminAction } from '@/lib/adminAuditLog';
import { MessagesSquare, RefreshCw, ChevronDown, ChevronUp, Search, Trash2 } from 'lucide-react';
import { useToast } from './Toast';
import { useConfirmDialog } from './ConfirmDialog';

interface ConvSummaryRow {
  id: string;
  child_id: string;
  session_id: string;
  summary: string;
  key_topics: string[];
  mastered_vocab: string[];
  mistakes: { word: string; errorType: string; correctedAt: string }[];
  language: string;
  story_id: string | null;
  exchange_count: number;
  created_at: string;
  // joined
  child_name?: string;
}

interface Props {
  onOpenSidebar?: () => void;
}

export default function ConversationHistoryManager({ onOpenSidebar }: Props) {
  const [rows, setRows]             = useState<ConvSummaryRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [langFilter, setLangFilter] = useState<string>('all');
  const { success: toastOk, error: toastErr } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // conversation_summaries uses RLS; admin anon key can read via policy
      const { data, error: err } = await supabase
        .from('conversation_summaries')
        .select(`
          id, child_id, session_id, summary, key_topics, mastered_vocab,
          mistakes, language, story_id, exchange_count, created_at,
          children ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (err) throw new Error(err.message);

      const mapped = ((data ?? []) as Record<string, unknown>[]).map(r => ({
        ...r,
        child_name: ((r.children as { name?: string } | null)?.name) ?? '—',
      })) as ConvSummaryRow[];

      setRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string, child_name: string) => {
    const ok = await confirm({
      title: `Delete conversation for ${child_name}?`,
      message: 'This will permanently delete the conversation summary.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      const { error: err } = await supabase.from('conversation_summaries').delete().eq('id', id);
      if (err) throw err;
      setRows(prev => prev.filter(r => r.id !== id));
      toastOk('Conversation deleted.');
      void logAdminAction({ action: 'delete_conversation', entityType: 'conversation', entityId: id, entityLabel: child_name });
    } catch (e) {
      toastErr('Failed to delete conversation.');
    }
  };

  const filtered = rows.filter(r => {
    const matchLang = langFilter === 'all' || r.language === langFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.child_name?.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.key_topics.some(t => t.toLowerCase().includes(q)) ||
      r.mastered_vocab.some(w => w.toLowerCase().includes(q));
    return matchLang && matchSearch;
  });

  const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const LANG_LABELS: Record<string, string> = { en: '🇬🇧 English', fr: '🇫🇷 French', rw: '🇷🇼 Kinyarwanda' };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      {dialog}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onOpenSidebar} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <MessagesSquare size={18} />
          </button>
          <MessagesSquare className="w-5 h-5 text-emerald-600 hidden lg:block" />
          <h1 className="text-lg font-bold text-gray-900">AI Chat History</h1>
          <span className="ml-auto text-xs text-gray-400 italic">Read-only · Summaries only · No raw messages stored</span>
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-sm text-gray-500 pl-8">
          AI-inferred session summaries. Vocabulary progress and topic coverage — no conversation text is stored.
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 flex flex-wrap gap-3 items-center bg-white border-b border-gray-100">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search child, topic, word…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <select
          value={langFilter}
          onChange={e => setLangFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <option value="all">All languages</option>
          <option value="en">🇬🇧 English</option>
          <option value="fr">🇫🇷 French</option>
          <option value="rw">🇷🇼 Kinyarwanda</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {loading && (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MessagesSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No conversation summaries yet</p>
            <p className="text-xs mt-1">Summaries appear after children complete a chat session with Nimi.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(row => {
              const isOpen = expanded.has(row.id);
              return (
                <div key={row.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  {/* Row header */}
                  <div className="flex items-center gap-2">
                    <button
                      className="flex-1 flex items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 transition"
                      onClick={() => toggleExpand(row.id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-700">
                        {(row.child_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-800">{row.child_name}</span>
                          <span className="text-xs text-gray-400">{LANG_LABELS[row.language] ?? row.language}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{row.exchange_count} exchanges</span>
                          {row.mastered_vocab.length > 0 && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              {row.mastered_vocab.length} word{row.mastered_vocab.length > 1 ? 's' : ''} mastered
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{row.summary}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400 hidden sm:block">{fmtDate(row.created_at)}</span>
                        {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDelete(row.id, row.child_name ?? '—')}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-red-50 text-gray-400 hover:text-red-500 mr-2 shrink-0"
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3 text-sm">
                      <p className="text-gray-700 leading-relaxed">{row.summary}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {row.key_topics.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Topics covered</p>
                            <div className="flex flex-wrap gap-1.5">
                              {row.key_topics.map(t => (
                                <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {row.mastered_vocab.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vocabulary mastered</p>
                            <div className="flex flex-wrap gap-1.5">
                              {row.mastered_vocab.map(w => (
                                <span key={w} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{w}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {row.mistakes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Correction notes</p>
                          <div className="space-y-1">
                            {row.mistakes.map((m, i) => (
                              <div key={i} className="text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                                <span className="font-semibold">{m.word}</span>
                                {m.errorType ? <span className="text-amber-600 ml-2">({m.errorType})</span> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-400 pt-1">
                        Session: {row.session_id} · {fmtDate(row.created_at)}
                        {row.story_id && <span> · Story: {row.story_id}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
