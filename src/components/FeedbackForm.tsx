import { useState, useRef } from 'react';
import { Bug, Sparkles, ChevronUp, CheckCircle, ArrowLeft, ExternalLink, Upload, X, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AppName = 'WeVysya AI' | 'WeVysya Social' | 'WeVysya Meeting Companion' | 'GHM';

const APP_OPTIONS: { value: AppName; color: string; description: string }[] = [
  { value: 'WeVysya AI', color: '#6EE7B7', description: 'AI-powered features & assistant' },
  { value: 'WeVysya Social', color: '#60A5FA', description: 'Social networking & connections' },
  { value: 'WeVysya Meeting Companion', color: '#F97316', description: 'Meetings & collaboration' },
  { value: 'GHM', color: '#FBBF24', description: 'Global House Management portal' },
];

const MAX_SCREENSHOTS = 5;
const MAX_FILE_SIZE_MB = 5;

interface FormState {
  app_name: AppName;
  type: 'bug' | 'feature';
  title: string;
  description: string;
  submitter_name: string;
  submitter_email: string;
}

interface ScreenshotFile {
  file: File;
  preview: string;
  uploading: boolean;
  error: string;
}

const INITIAL_FORM: FormState = {
  app_name: 'WeVysya AI',
  type: 'feature',
  title: '',
  description: '',
  submitter_name: '',
  submitter_email: '',
};

export default function FeedbackForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [screenshots, setScreenshots] = useState<ScreenshotFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_SCREENSHOTS - screenshots.length;
    const toAdd = files.slice(0, remaining);

    const newScreenshots: ScreenshotFile[] = toAdd
      .filter((f) => {
        if (!f.type.startsWith('image/')) return false;
        if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return false;
        return true;
      })
      .map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
        uploading: false,
        error: '',
      }));

    setScreenshots((prev) => [...prev, ...newScreenshots]);
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
    for (let i = 0; i < screenshots.length; i++) {
      const { file } = screenshots[i];
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
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0B0F0E' }}>
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#6EE7B7]/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-[#6EE7B7]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Thank you!</h2>
          <p className="text-gray-400 text-sm mb-6">
            Your {form.type === 'bug' ? 'bug report' : 'feature request'} has been submitted. Our team will review it shortly.
          </p>
          <button
            onClick={() => {
              screenshots.forEach((s) => URL.revokeObjectURL(s.preview));
              setForm(INITIAL_FORM);
              setStep(1);
              setSubmitted(false);
              setScreenshots([]);
            }}
            className="px-6 py-2.5 bg-[#4ADE80] text-[#0B0F0E] font-semibold rounded-xl hover:brightness-110 transition-all text-sm"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0B0F0E' }}>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6EE7B7 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)' }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <img
            src="/Media/wevysyalogo.png"
            alt="WeVysya"
            className="h-8 w-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <p className="text-sm font-bold text-white leading-none">WeVysya</p>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5">Product Desk</p>
          </div>
        </div>
        <a
          href="/"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#6EE7B7] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          GHM Portal
        </a>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Product Desk</h1>
            <p className="text-gray-400 text-sm">Report bugs or request features for WeVysya apps</p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === s
                      ? 'bg-[#6EE7B7] text-[#0B0F0E]'
                      : s < step
                      ? 'bg-[#14532D] text-[#6EE7B7]'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                {s < 2 && <div className={`w-12 h-0.5 ${step > s ? 'bg-[#6EE7B7]' : 'bg-gray-700'}`} />}
              </div>
            ))}
          </div>

          <div className="bg-[rgba(20,26,24,0.8)] border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">Select App *</label>
                  <div className="space-y-2">
                    {APP_OPTIONS.map((app) => (
                      <button
                        key={app.value}
                        onClick={() => setForm({ ...form, app_name: app.value })}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          form.app_name === app.value
                            ? 'border-opacity-60 bg-opacity-10'
                            : 'border-gray-700/40 hover:border-gray-600/60'
                        }`}
                        style={
                          form.app_name === app.value
                            ? { borderColor: app.color, backgroundColor: `${app.color}12` }
                            : {}
                        }
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: app.color }} />
                        <div>
                          <p className="text-sm font-medium text-white">{app.value}</p>
                          <p className="text-xs text-gray-500">{app.description}</p>
                        </div>
                      </button>
                    ))}
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

                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-[#4ADE80] text-[#0B0F0E] font-semibold rounded-xl hover:brightness-110 transition-all"
                >
                  Next →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors mb-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <div className="bg-[#0F1412] rounded-xl p-4 border border-gray-700/30">
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
                    Email <span className="text-gray-600">(optional — for updates)</span>
                  </label>
                  <input
                    value={form.submitter_email}
                    onChange={(e) => setForm({ ...form, submitter_email: e.target.value })}
                    placeholder="your@email.com"
                    type="email"
                    className="w-full bg-[#0F1412] border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6EE7B7]/50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-400">
                      Screenshots{' '}
                      <span className="text-gray-600">(optional — up to {MAX_SCREENSHOTS})</span>
                    </label>
                    <span className={`text-xs font-medium ${screenshots.length >= MAX_SCREENSHOTS ? 'text-red-400' : 'text-gray-500'}`}>
                      {screenshots.length}/{MAX_SCREENSHOTS}
                    </span>
                  </div>

                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {screenshots.map((s, i) => (
                        <div key={i} className="relative group aspect-video rounded-lg overflow-hidden bg-[#0F1412] border border-gray-700/40">
                          <img
                            src={s.preview}
                            alt={`Screenshot ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
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
                        className="w-full flex flex-col items-center gap-2 py-5 rounded-xl border border-dashed border-gray-700/60 bg-[#0F1412] hover:border-[#6EE7B7]/40 hover:bg-[#6EE7B7]/4 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-[#6EE7B7]/10 transition-colors">
                          {screenshots.length === 0 ? (
                            <Image className="w-4 h-4 text-gray-500 group-hover:text-[#6EE7B7] transition-colors" />
                          ) : (
                            <Upload className="w-4 h-4 text-gray-500 group-hover:text-[#6EE7B7] transition-colors" />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                            {screenshots.length === 0
                              ? 'Click to attach screenshots'
                              : `Add more (${MAX_SCREENSHOTS - screenshots.length} remaining)`}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-0.5">PNG, JPG, GIF, WebP — max {MAX_FILE_SIZE_MB}MB each</p>
                        </div>
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

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 bg-[#4ADE80] text-[#0B0F0E] font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-4 border-t border-gray-800/30">
        <p className="text-xs text-gray-600">WeVysya Product Desk · All feedback is reviewed by our team</p>
      </footer>
    </div>
  );
}
