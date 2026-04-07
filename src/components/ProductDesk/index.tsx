import { useState } from 'react';
import { Search, Plus, Inbox, TrendingUp, Bug, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProductDesk } from './useProductDesk';
import RequestCard from './RequestCard';
import RequestDetail from './RequestDetail';
import { TABS } from './constants';

export default function ProductDesk() {
  const {
    requests,
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedRequest,
    openRequest,
    closeRequest,
    comments,
    commentsLoading,
    toggleVote,
    updateStatus,
    addOfficialResponse,
    addComment,
    togglePin,
    deleteRequest,
  } = useProductDesk();

  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const bugs = requests.filter((r) => r.type === 'bug').length;
  const features = requests.filter((r) => r.type === 'feature').length;
  const totalVotes = requests.reduce((s, r) => s + r.votes_count, 0);

  return (
    <div className="p-8 space-y-6 animate-fade-in relative overflow-hidden min-h-screen">
      <div className="absolute top-[-150px] right-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] gradient-blob-teal opacity-25 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Product Desk</h1>
            <p className="text-[#9CA3AF] text-sm">Shape the future of WeVysya apps</p>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4ADE80] text-[#0B0F0E] font-semibold rounded-xl hover:brightness-110 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Submit Request
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[rgba(20,26,24,0.8)] border border-gray-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Inbox className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Total Requests</span>
            </div>
            <p className="text-2xl font-bold text-white">{requests.length}</p>
          </div>
          <div className="bg-[rgba(20,26,24,0.8)] border border-gray-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Bug className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-400">Bugs</span>
            </div>
            <p className="text-2xl font-bold text-white">{bugs}</p>
          </div>
          <div className="bg-[rgba(20,26,24,0.8)] border border-gray-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#6EE7B7]" />
              <span className="text-xs text-gray-400">Total Votes</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalVotes}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests..."
              className="w-full bg-[rgba(20,26,24,0.8)] border border-gray-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
            />
          </div>
          <div className="flex items-center gap-1 bg-[rgba(20,26,24,0.8)] border border-gray-800/50 rounded-xl p-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#14532D] text-[#6EE7B7]'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#6EE7B7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="w-10 h-10 text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">No requests found</p>
            <p className="text-gray-600 text-sm mt-1">Be the first to submit feedback!</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onVote={toggleVote}
                onClick={openRequest}
              />
            ))}
          </div>
        )}
      </div>

      {selectedRequest && (
        <RequestDetail
          request={selectedRequest}
          comments={comments}
          commentsLoading={commentsLoading}
          onClose={closeRequest}
          onVote={toggleVote}
          onUpdateStatus={updateStatus}
          onAddOfficialResponse={addOfficialResponse}
          onAddComment={addComment}
          onTogglePin={togglePin}
          onDelete={deleteRequest}
        />
      )}

      {showSubmitModal && (
        <SubmitModal onClose={() => setShowSubmitModal(false)} onSuccess={() => { setShowSubmitModal(false); }} />
      )}
    </div>
  );
}

function SubmitModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    app_name: 'WeVysya AI' as const,
    type: 'feature' as 'bug' | 'feature',
    title: '',
    description: '',
    submitter_name: '',
    submitter_email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.submitter_name.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { error: dbError } = await supabase.from('product_requests').insert({
        app_name: form.app_name,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        submitter_name: form.submitter_name.trim(),
        submitter_email: form.submitter_email.trim(),
        status: 'new',
      });
      if (dbError) throw dbError;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#0D1410] border border-gray-700/60 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-5">Submit a Request</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">App *</label>
              <select
                value={form.app_name}
                onChange={(e) => setForm({ ...form, app_name: e.target.value as typeof form.app_name })}
                className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#6EE7B7]/50"
              >
                <option value="WeVysya AI">WeVysya AI</option>
                <option value="WeVysya Social">WeVysya Social</option>
                <option value="WeVysya Meeting Companion">WeVysya Meeting Companion</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'bug' | 'feature' })}
                className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#6EE7B7]/50"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature Request</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Brief title of your request"
              className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Describe the issue or feature in detail..."
              className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Your Name *</label>
              <input
                value={form.submitter_name}
                onChange={(e) => setForm({ ...form, submitter_name: e.target.value })}
                placeholder="Name"
                className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email (optional)</label>
              <input
                value={form.submitter_email}
                onChange={(e) => setForm({ ...form, submitter_email: e.target.value })}
                placeholder="email@example.com"
                type="email"
                className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-700/50 text-gray-300 text-sm hover:bg-gray-800/40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#4ADE80] text-[#0B0F0E] font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
