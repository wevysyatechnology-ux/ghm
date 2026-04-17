import { useState } from 'react';
import {
  X, ChevronUp, Bug, Sparkles, Pin, PinOff, Trash2,
  Shield, MessageCircle, Send, ChevronDown
} from 'lucide-react';
import { ProductRequest, ProductComment, RequestStatus } from './types';
import { STATUS_CONFIG, APP_COLORS, STATUS_FLOW } from './constants';
import { useAuth } from '../../contexts/AuthContext';

interface RequestDetailProps {
  request: ProductRequest;
  comments: ProductComment[];
  commentsLoading: boolean;
  onClose: () => void;
  onVote: (id: string, voted: boolean) => void;
  onUpdateStatus: (id: string, status: RequestStatus) => Promise<void>;
  onAddOfficialResponse: (id: string, message: string, adminName: string) => Promise<void>;
  onAddComment: (id: string, name: string, message: string) => Promise<void>;
  onTogglePin: (id: string, pinned: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function RequestDetail({
  request,
  comments,
  commentsLoading,
  onClose,
  onVote,
  onUpdateStatus,
  onAddOfficialResponse,
  onAddComment,
  onTogglePin,
  onDelete,
}: RequestDetailProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'global_admin';
  const isCollaborator = profile?.role === 'collaborator';
  const canPostOfficial = isAdmin || isCollaborator;

  const [commentName, setCommentName] = useState('');
  const [commentMsg, setCommentMsg] = useState('');
  const [officialMsg, setOfficialMsg] = useState('');
  const [showOfficialInput, setShowOfficialInput] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const status = STATUS_CONFIG[request.status];
  const appColor = APP_COLORS[request.app_name] || '#6EE7B7';

  const handleComment = async () => {
    if (!commentMsg.trim() || !commentName.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(request.id, commentName.trim(), commentMsg.trim());
      setCommentMsg('');
      setCommentName('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfficialResponse = async () => {
    if (!officialMsg.trim()) return;
    setSubmitting(true);
    try {
      await onAddOfficialResponse(request.id, officialMsg.trim(), profile?.full_name || 'Admin');
      setOfficialMsg('');
      setShowOfficialInput(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-[#0D1410] border-l border-gray-800/60 overflow-y-auto shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#0D1410] border-b border-gray-800/50">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ color: status.color, background: status.bg }}
            >
              {status.label}
            </span>
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  Change <ChevronDown className="w-3 h-3" />
                </button>
                {showStatusMenu && (
                  <div className="absolute left-0 top-full mt-1 bg-[#111916] border border-gray-700/60 rounded-xl shadow-xl overflow-hidden z-20 min-w-[160px]">
                    {STATUS_FLOW.map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          onClick={async () => {
                            await onUpdateStatus(request.id, s);
                            setShowStatusMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-gray-800/50 transition-colors text-left"
                          style={{ color: cfg.color }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => onTogglePin(request.id, request.is_pinned)}
                  title={request.is_pinned ? 'Unpin' : 'Pin'}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#FBBF24] hover:bg-gray-800/50 transition-colors"
                >
                  {request.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ color: appColor, background: `${appColor}18` }}
            >
              {request.app_name}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                request.type === 'bug' ? 'text-red-400 bg-red-400/10' : 'text-[#60A5FA] bg-[#60A5FA]/10'
              }`}
            >
              {request.type === 'bug' ? <Bug className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {request.type === 'bug' ? 'Bug Report' : 'Feature Request'}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white leading-snug mb-1">{request.title}</h2>
            <p className="text-xs text-gray-500">
              Submitted by <span className="text-gray-400">{request.submitter_name || 'Anonymous'}</span>
              {request.submitter_email && (
                <> · <span className="text-gray-400">{request.submitter_email}</span></>
              )}
              {' · '}
              {new Date(request.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{request.description}</p>

          {request.screenshot_url && (
            <div className="rounded-xl overflow-hidden border border-gray-700/50">
              <img src={request.screenshot_url} alt="Screenshot" className="w-full object-cover max-h-64" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => onVote(request.id, !!request.user_voted)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                request.user_voted
                  ? 'border-[#6EE7B7]/60 bg-[#6EE7B7]/10 text-[#6EE7B7]'
                  : 'border-gray-700/60 text-gray-400 hover:border-[#6EE7B7]/40 hover:text-[#6EE7B7]'
              }`}
            >
              <ChevronUp className="w-4 h-4" />
              {request.user_voted ? 'Voted' : 'Upvote'} · {request.votes_count}
            </button>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length} comments</span>
            </div>
          </div>

          {request.official_response && (
            <div className="rounded-xl border border-[#6EE7B7]/25 bg-[#6EE7B7]/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#6EE7B7]" />
                <span className="text-xs font-semibold text-[#6EE7B7] uppercase tracking-wide">Official Response</span>
              </div>
              <p className="text-sm text-gray-200">{request.official_response}</p>
            </div>
          )}

          <div className="border-t border-gray-800/50 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                Discussion
              </h4>
              {canPostOfficial && (
                <button
                  onClick={() => setShowOfficialInput(!showOfficialInput)}
                  className="flex items-center gap-1 text-xs text-[#6EE7B7] hover:underline"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Add Official Discussion
                </button>
              )}
            </div>

            {showOfficialInput && (
              <div className="space-y-2">
                <textarea
                  value={officialMsg}
                  onChange={(e) => setOfficialMsg(e.target.value)}
                  rows={3}
                  placeholder="Write official discussion..."
                  className="w-full bg-[#0F1412] border border-[#6EE7B7]/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/60 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowOfficialInput(false)}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOfficialResponse}
                    disabled={submitting || !officialMsg.trim()}
                    className="px-4 py-1.5 text-xs bg-[#6EE7B7] text-[#0B0F0E] font-semibold rounded-lg disabled:opacity-50 hover:brightness-110 transition-all"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}

            {commentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-[#6EE7B7] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl p-3 ${
                      c.is_official
                        ? 'border border-[#6EE7B7]/20 bg-[#6EE7B7]/5'
                        : 'bg-[#0F1412]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {c.is_official && <Shield className="w-3 h-3 text-[#6EE7B7]" />}
                      <span className={`text-xs font-semibold ${c.is_official ? 'text-[#6EE7B7]' : 'text-gray-300'}`}>
                        {c.commenter_name}
                        {c.is_official && <span className="ml-1 text-[10px] font-normal opacity-70">(Official)</span>}
                      </span>
                      <span className="text-[10px] text-gray-600 ml-auto">
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{c.message}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 space-y-2">
              <input
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
              />
              <div className="flex gap-2">
                <input
                  value={commentMsg}
                  onChange={(e) => setCommentMsg(e.target.value)}
                  placeholder="Write a comment..."
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                  className="flex-1 bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
                />
                <button
                  onClick={handleComment}
                  disabled={submitting || !commentMsg.trim() || !commentName.trim()}
                  className="px-4 py-2.5 bg-[#6EE7B7] text-[#0B0F0E] rounded-xl font-semibold disabled:opacity-50 hover:brightness-110 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setConfirmDelete(false)}>
          <div
            className="bg-[#111916] border border-gray-700/60 rounded-2xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold mb-2">Delete Request?</h3>
            <p className="text-sm text-gray-400 mb-5">This will permanently delete this request and all its comments.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700/50 text-gray-300 text-sm hover:bg-gray-800/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onDelete(request.id);
                  setConfirmDelete(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
