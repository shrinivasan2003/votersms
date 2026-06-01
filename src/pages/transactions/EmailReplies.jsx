import { useState, useEffect, useCallback } from 'react';
import { Mail, MailOpen, Trash2, RefreshCw, User, Briefcase, Clock, Inbox } from 'lucide-react';
import Badge from '../../components/shared/Badge';

const API_URL = '/api/email-replies';

const formatDate = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const Avatar = ({ name, email }) => {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : email?.[0]?.toUpperCase() ?? '?';
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
      {initials}
    </div>
  );
};

const EmptyInbox = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
      <Inbox size={28} className="text-blue-400" />
    </div>
    <h3 className="text-base font-bold text-brand-navy mb-1">No replies yet</h3>
    <p className="text-brand-textMuted text-sm max-w-xs leading-relaxed">
      When voters reply to your email campaigns, their messages will appear here.
    </p>
  </div>
);

const EmailReplies = () => {
  const [replies, setReplies]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReplies = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res  = await fetch(API_URL);
      const data = await res.json();
      if (Array.isArray(data)) {
        setReplies(data);
        // keep selected in sync
        setSelected(prev => prev ? (data.find(r => r.id === prev.id) ?? prev) : prev);
      }
    } catch (err) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReplies(); }, [fetchReplies]);

  const markRead = useCallback(async (reply) => {
    if (reply.is_read) return;
    try {
      await fetch(`${API_URL}/${reply.id}/read`, { method: 'PATCH' });
      setReplies(prev => prev.map(r => r.id === reply.id ? { ...r, is_read: 1 } : r));
      setSelected(prev => prev?.id === reply.id ? { ...prev, is_read: 1 } : prev);
    } catch (_err) { }
  }, []);

  const handleSelect = useCallback((reply) => {
    setSelected(reply);
    markRead(reply);
  }, [markRead]);

  const handleDelete = useCallback(async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this reply?')) return;
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      setReplies(prev => prev.filter(r => r.id !== id));
      setSelected(prev => prev?.id === id ? null : prev);
    } catch (_err) { }
  }, []);

  const unreadCount = replies.filter(r => !r.is_read).length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Email Replies</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-extrabold">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-brand-textMuted mt-0.5 text-sm">Inbound voter replies to your email campaigns</p>
        </div>
        <button
          onClick={() => fetchReplies(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-brand-border p-10 text-center text-brand-textMuted text-sm">
          Loading replies…
        </div>
      ) : replies.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-border">
          <EmptyInbox />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
          <div className="flex flex-col lg:flex-row min-h-[520px]">

            {/* ── Reply list ── */}
            <div className={`lg:w-[360px] xl:w-[400px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-y-auto ${selected ? 'hidden lg:block' : 'block'}`}>
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  onClick={() => handleSelect(reply)}
                  className={`
                    relative flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50
                    hover:bg-blue-50/50 transition-colors
                    ${selected?.id === reply.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}
                    ${!reply.is_read ? 'bg-blue-50/30' : ''}
                  `}
                >
                  <Avatar name={reply.voter_name} email={reply.from_email} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${!reply.is_read ? 'font-bold text-brand-navy' : 'font-medium text-brand-textPrimary'}`}>
                        {reply.voter_name && reply.voter_name.trim() !== ' '
                          ? reply.voter_name
                          : reply.from_name || reply.from_email}
                      </span>
                      <span className="text-[10px] text-brand-textMuted shrink-0 whitespace-nowrap">
                        {formatDate(reply.received_at).split(',')[0]}
                      </span>
                    </div>

                    <p className={`text-xs mt-0.5 truncate ${!reply.is_read ? 'text-brand-textPrimary font-semibold' : 'text-brand-textMuted'}`}>
                      {reply.subject || '(no subject)'}
                    </p>

                    <p className="text-xs text-brand-textMuted truncate mt-0.5">
                      {reply.stripped_reply || reply.body_text || ''}
                    </p>
                  </div>

                  {!reply.is_read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))}
            </div>

            {/* ── Reply detail ── */}
            <div className={`flex-1 flex flex-col min-w-0 ${selected ? 'block' : 'hidden lg:flex'}`}>
              {!selected ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-brand-textMuted">
                  <MailOpen size={36} className="text-gray-300 mb-3" />
                  <p className="text-sm font-medium">Select a reply to read it</p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* detail header */}
                  <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-gray-100">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* back button — mobile only */}
                      <button
                        onClick={() => setSelected(null)}
                        className="lg:hidden shrink-0 mt-0.5 text-brand-textMuted hover:text-brand-navy transition-colors"
                      >
                        ←
                      </button>
                      <Avatar name={selected.voter_name} email={selected.from_email} />
                      <div className="min-w-0">
                        <p className="font-bold text-brand-navy text-sm">
                          {selected.voter_name && selected.voter_name.trim() !== ' '
                            ? selected.voter_name
                            : selected.from_name || selected.from_email}
                        </p>
                        <p className="text-xs text-brand-textMuted mt-0.5">{selected.from_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selected.is_read
                        ? <Badge variant="success">Read</Badge>
                        : <Badge variant="warning">Unread</Badge>
                      }
                      <button
                        onClick={(e) => handleDelete(selected.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete reply"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* meta row */}
                  <div className="flex flex-wrap items-center gap-4 px-5 sm:px-6 py-3 bg-gray-50/60 border-b border-gray-100 text-xs text-brand-textMuted">
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} />
                      <span className="font-medium">Subject:</span>
                      <span>{selected.subject || '(no subject)'}</span>
                    </div>
                    {selected.job_id && (
                      <div className="flex items-center gap-1.5">
                        <Briefcase size={12} />
                        <span className="font-medium">Campaign Job:</span>
                        <span>#{selected.job_id}</span>
                      </div>
                    )}
                    {selected.voter_id && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} />
                        <span className="font-medium">Voter ID:</span>
                        <span>#{selected.voter_id}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      <span>{formatDate(selected.received_at)}</span>
                    </div>
                  </div>

                  {/* body */}
                  <div className="flex-1 px-5 sm:px-6 py-5 overflow-y-auto">
                    <div className="max-w-2xl">
                      {selected.stripped_reply ? (
                        <>
                          <div className="text-sm text-brand-textPrimary leading-relaxed whitespace-pre-wrap bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                            {selected.stripped_reply}
                          </div>
                          {selected.body_text && selected.body_text !== selected.stripped_reply && (
                            <details className="mt-4">
                              <summary className="text-xs text-brand-textMuted cursor-pointer hover:text-brand-navy select-none">
                                Show full email thread
                              </summary>
                              <div className="mt-2 text-xs text-gray-400 leading-relaxed whitespace-pre-wrap border border-gray-100 rounded-xl p-4 bg-gray-50">
                                {selected.body_text}
                              </div>
                            </details>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-brand-textPrimary leading-relaxed whitespace-pre-wrap bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                          {selected.body_text || <span className="italic text-brand-textMuted">(empty message)</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default EmailReplies;
