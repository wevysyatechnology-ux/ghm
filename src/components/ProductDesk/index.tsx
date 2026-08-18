import { useState, useRef } from 'react';
import { Search, Plus, Inbox, TrendingUp, Bug, Sparkles, ArrowLeft, ChevronUp, Upload, X, Image } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProductDesk } from './useProductDesk';
import RequestCard from './RequestCard';
import RequestDetail from './RequestDetail';
import { TABS, APP_NAMES, APP_COLORS } from './constants';
import type { AppName } from './types';

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

const MAX_SCREENSHOTS = 5;
const MAX_FILE_SIZE_MB = 5;

const APP_DESCRIPTIONS: Record<AppName, string> = {
  'WeVysya AI': 'AI-powered features & assistant',
  'WeVysya Social': 'Social networking & connections',
  'WeVysya Meeting Companion': 'Meetings & collaboration',
  'GHM': 'Global House Management portal',
};

interface ScreenshotFile {
  file: File;
  preview: string;
}

function SubmitModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    app_name: 'WeVysya AI' as AppName,
    type: 'feature' as 'bug' | 'feature',
    title: '',
    description: '',
    submitter_name: '',
    submitter_email: '',
  });
  const [screenshots, setScreenshots] = useState<ScreenshotFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_SCREENSHOTS - screenshots.length;
    const toAdd = files.slice(0, remaining).filter(
      (f) => f.type.startsWith('image/') && f.size <= MAX_FILE_SIZE_MB * 1024 * 1024
    );
    setScreenshots((prev) => [
      ...prev,
      ...toAdd.map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleNext = () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Please fill in the title and description.');
      return;
    }
    setError('');
    setStep(2);
  };

  const uploadScreenshots = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const { file } of screenshots) {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-desk-screenshots')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`Screenshot upload failed: ${uploadError.message}`);
      const { data } = supabase.storage.from('product-desk-screenshots').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!form.submitter_name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const screenshotUrls = await uploadScreenshots();
      const { error: dbError } = await supabase.from('product_requests').insert({
        app_name: form.app_name,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        submitter_name: form.submitter_name.trim(),
        submitter_email: form.submitter_email.trim(),
        status: 'new',
        screenshot_urls: screenshotUrls,
      });
      if (dbError) throw dbError;
      screenshots.forEach((s) => URL.revokeObjectURL(s.preview));
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
        className="bg-[#0D1410] border border-gray-700/60 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">Submit a Request</h2>
            <div className="flex items-center gap-3">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s
                        ? 'bg-[#6EE7B7] text-[#0B0F0E]'
                        : s < step
                        ? 'bg-[#14532D] text-[#6EE7B7]'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {s < step ? '✓' : s}
                  </div>
                  {s < 2 && <div className={`w-8 h-0.5 ${step > s ? 'bg-[#6EE7B7]' : 'bg-gray-700'}`} />}
                </div>
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">Select App *</label>
                <div className="space-y-2">
                  {APP_NAMES.map((app) => {
                    const color = APP_COLORS[app];
                    const selected = form.app_name === app;
                    return (
                      <button
                        key={app}
                        onClick={() => setForm({ ...form, app_name: app })}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                        style={
                          selected
                            ? { borderColor: color, backgroundColor: `${color}12` }
                            : { borderColor: 'rgba(55,65,60,0.4)' }
                        }
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div>
                          <p className="text-sm font-medium text-white">{app}</p>
                          <p className="text-xs text-gray-500">{APP_DESCRIPTIONS[app]}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">Request Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setForm({ ...form, type: 'bug' })}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                      form.type === 'bug'
                        ? 'border-red-400/50 bg-red-400/8 text-red-400'
                        : 'border-gray-700/40 text-gray-400 hover:border-gray-600/60'
                    }`}
                  >
                    <Bug className="w-4 h-4" />
                    <span className="text-sm font-medium">Bug Report</span>
                  </button>
                  <button
                    onClick={() => setForm({ ...form, type: 'feature' })}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                      form.type === 'feature'
                        ? 'border-[#60A5FA]/50 bg-[#60A5FA]/8 text-[#60A5FA]'
                        : 'border-gray-700/40 text-gray-400 hover:border-gray-600/60'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">Feature Request</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={form.type === 'bug' ? 'What went wrong?' : 'What feature would you like?'}
                  className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  placeholder={
                    form.type === 'bug'
                      ? 'Describe the issue, steps to reproduce, and expected behavior...'
                      : 'Describe your idea in detail and the problem it solves...'
                  }
                  className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50 resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700/50 text-gray-300 text-sm hover:bg-gray-800/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 py-2.5 rounded-xl bg-[#4ADE80] text-[#0B0F0E] font-semibold text-sm hover:brightness-110 transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <div className="bg-[#0F1412] rounded-xl p-3 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-1">
                  {form.type === 'bug' ? (
                    <Bug className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" />
                  )}
                  <span className="text-xs text-gray-400">{form.app_name}</span>
                </div>
                <p className="text-sm font-medium text-white">{form.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Your Name *</label>
                  <input
                    value={form.submitter_name}
                    onChange={(e) => setForm({ ...form, submitter_name: e.target.value })}
                    placeholder="Full name"
                    className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">
                    Email <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    value={form.submitter_email}
                    onChange={(e) => setForm({ ...form, submitter_email: e.target.value })}
                    placeholder="your@email.com"
                    type="email"
                    className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-400">
                    Screenshots <span className="text-gray-600">(optional — up to {MAX_SCREENSHOTS})</span>
                  </label>
                  <span className={`text-xs font-medium ${screenshots.length >= MAX_SCREENSHOTS ? 'text-red-400' : 'text-gray-500'}`}>
                    {screenshots.length}/{MAX_SCREENSHOTS}
                  </span>
                </div>

                {screenshots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {screenshots.map((s, i) => (
                      <div key={i} className="relative group aspect-video rounded-lg overflow-hidden bg-[#0F1412] border border-gray-700/40">
                        <img src={s.preview} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeScreenshot(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {screenshots.length < MAX_SCREENSHOTS && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center gap-2 py-5 rounded-xl border border-dashed border-gray-700/60 bg-[#0F1412] hover:border-[#6EE7B7]/40 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-[#6EE7B7]/10 transition-colors">
                        {screenshots.length === 0 ? (
                          <Image className="w-4 h-4 text-gray-500 group-hover:text-[#6EE7B7] transition-colors" />
                        ) : (
                          <Upload className="w-4 h-4 text-gray-500 group-hover:text-[#6EE7B7] transition-colors" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                        {screenshots.length === 0 ? 'Click to attach screenshots' : `Add more (${MAX_SCREENSHOTS - screenshots.length} remaining)`}
                      </p>
                      <p className="text-[10px] text-gray-600">PNG, JPG, GIF, WebP — max {MAX_FILE_SIZE_MB}MB each</p>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-start gap-2 bg-[#0F1412] rounded-xl p-3 border border-gray-700/30">
                <ChevronUp className="w-4 h-4 text-[#6EE7B7] shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">
                  Others can upvote your request to help us prioritize. Higher votes = higher priority!
                </p>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-3">
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
                  {submitting ? 'Submitting...' : `Submit ${form.type === 'bug' ? 'Bug Report' : 'Feature Request'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
