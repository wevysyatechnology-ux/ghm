import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader, QrCode, LogIn } from 'lucide-react';

type Phase = 'loading' | 'login' | 'processing' | 'success' | 'error' | 'already';

export default function AttendScan() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [phase, setPhase] = useState<Phase>('loading');
  const [message, setMessage] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [status, setStatus] = useState<'present' | 'late'>('present');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!token) {
      setPhase('error');
      setMessage('Invalid QR code. No attendance token found.');
      return;
    }
    checkAuthAndEvent();
  }, [token]);

  const checkAuthAndEvent = async () => {
    setPhase('loading');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setPhase('login');
      return;
    }
    await processAttendance(session.user.id);
  };

  const processAttendance = async (userId: string) => {
    setPhase('processing');
    try {
      const { data: event, error: evErr } = await supabase
        .from('events')
        .select('id, title, is_live, qr_expires_at, event_time, max_late_minutes')
        .eq('qr_token', token)
        .maybeSingle();

      if (evErr || !event) {
        setPhase('error');
        setMessage('Event not found for this QR code.');
        return;
      }

      setEventTitle(event.title);

      if (!event.is_live) {
        setPhase('error');
        setMessage('This event is not live yet. Please wait for the admin to start the session.');
        return;
      }

      if (event.qr_expires_at && new Date(event.qr_expires_at) < new Date()) {
        setPhase('error');
        setMessage('This QR code has expired. The attendance window has closed.');
        return;
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id, approval_status, house_id')
        .eq('id', userId)
        .maybeSingle();

      if (profErr || !profile) {
        setPhase('error');
        setMessage('Member profile not found.');
        return;
      }

      if (profile.approval_status !== 'approved') {
        setPhase('error');
        setMessage('Your membership is not approved yet. Please contact your House Admin.');
        return;
      }

      if (!profile.house_id) {
        setPhase('error');
        setMessage('You must belong to a House to mark attendance.');
        return;
      }

      const { data: existing } = await supabase
        .from('event_attendance')
        .select('id, status')
        .eq('event_id', event.id)
        .eq('member_id', userId)
        .maybeSingle();

      if (existing) {
        setPhase('already');
        setStatus(existing.status as 'present' | 'late');
        setMessage(`You already checked in as ${existing.status}.`);
        return;
      }

      let attendStatus: 'present' | 'late' = 'present';
      if (event.event_time && event.max_late_minutes > 0) {
        const [h, m] = event.event_time.split(':').map(Number);
        const today = new Date();
        const eventStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0);
        const graceEnd = new Date(eventStart.getTime() + event.max_late_minutes * 60 * 1000);
        if (new Date() > graceEnd) attendStatus = 'late';
      }

      const { error: insertErr } = await supabase.from('event_attendance').insert([{
        event_id: event.id,
        member_id: userId,
        status: attendStatus,
        check_in_method: 'qr',
      }]);

      if (insertErr) {
        if (insertErr.code === '23505') {
          setPhase('already');
          setMessage('You have already checked in to this event.');
          return;
        }
        throw insertErr;
      }

      setStatus(attendStatus);
      setPhase('success');
      setMessage(attendStatus === 'late' ? 'Marked Late' : 'Attendance Marked!');
    } catch (err: any) {
      setPhase('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (data.user) {
      await processAttendance(data.user.id);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0B0F0E' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/Media/wevysyalogo.png" alt="WeVysya" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="text-xl font-bold text-white">WeVysya</span>
          </div>
          <p className="text-sm text-[#9CA3AF]">Attendance Check-in</p>
        </div>

        <div className="bg-card rounded-2xl border border-gray-800/50 overflow-hidden">
          {phase === 'loading' || phase === 'processing' ? (
            <div className="p-10 flex flex-col items-center gap-4">
              <Loader className="w-12 h-12 text-[#4ADE80] animate-spin" />
              <p className="text-[#9CA3AF] text-sm">{phase === 'loading' ? 'Checking session...' : 'Verifying attendance...'}</p>
            </div>
          ) : phase === 'login' ? (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(74,222,128,0.1)' }}>
                  <QrCode className="w-5 h-5 text-[#4ADE80]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">QR Attendance</p>
                  <p className="text-xs text-[#6B7280]">Login to mark your presence</p>
                </div>
              </div>
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-[#9CA3AF]">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0F1412] border border-gray-800 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#4ADE80]/50"
                    placeholder="your@email.com"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-[#9CA3AF]">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0F1412] border border-gray-800 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#4ADE80]/50"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {authError && (
                  <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{authError}</p>
                )}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
                >
                  {authLoading ? <Loader className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {authLoading ? 'Logging in...' : 'Login & Check In'}
                </button>
              </form>
            </div>
          ) : phase === 'success' ? (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(74,222,128,0.15)' }}>
                <CheckCircle className="w-9 h-9 text-[#4ADE80]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#4ADE80] mb-1">{message}</h2>
                {eventTitle && <p className="text-sm text-[#9CA3AF]">{eventTitle}</p>}
                {status === 'late' && (
                  <p className="text-xs text-yellow-400 mt-2 bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-3 py-1.5">
                    You joined after the grace period
                  </p>
                )}
              </div>
            </div>
          ) : phase === 'already' ? (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(96,165,250,0.1)' }}>
                <CheckCircle className="w-9 h-9 text-[#60A5FA]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#60A5FA] mb-1">Already Checked In</h2>
                {eventTitle && <p className="text-sm text-[#9CA3AF]">{eventTitle}</p>}
                <p className="text-xs text-[#6B7280] mt-1">{message}</p>
              </div>
            </div>
          ) : (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(248,113,113,0.1)' }}>
                <XCircle className="w-9 h-9 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-400 mb-1">Check-in Failed</h2>
                <p className="text-sm text-[#9CA3AF]">{message}</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#6B7280] mt-6">WeVysya Global House Management</p>
      </div>
    </div>
  );
}
