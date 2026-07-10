import { useEffect, useState, useRef } from 'react';
import { Plus, Calendar, MapPin, Link2, Globe, Home, Building2, Map, QrCode, Radio, X, Users, CheckCircle, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { GHMEvent } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface HouseOption { id: string; name: string; zone: string; state: string; country: string; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const LEVEL_CONFIG = {
  house:   { label: 'House',   color: '#6EE7B7', bg: 'rgba(110,231,183,0.1)', Icon: Home },
  zone:    { label: 'Zone',    color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  Icon: Building2 },
  state:   { label: 'State',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', Icon: Map },
  country: { label: 'Country', color: '#F97316', bg: 'rgba(249,115,22,0.1)', Icon: MapPin },
  global:  { label: 'Global',  color: '#F472B6', bg: 'rgba(244,114,182,0.1)',Icon: Globe },
} as const;

function QRCodeCanvas({ token, size = 200 }: { token: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `${window.location.origin}/attend?token=${token}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 2,
      color: {
        dark: '#4ADE80',
        light: '#0B0F0E',
      },
    });
  }, [token, size, url]);

  return <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 4 }} />;
}

export default function Events({ readOnly = false }: { readOnly?: boolean }) {
  const { profile } = useAuth();
  const [events, setEvents] = useState<GHMEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GHMEvent | null>(null);

  const isAdmin = !readOnly && profile?.role && ['super_admin', 'global_admin', 'zone_admin', 'house_admin'].includes(profile.role);
  const canAddEvent = isAdmin || profile?.role === 'collaborator';

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, house:house_id(name)')
        .order('event_date', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLive = async (ev: GHMEvent) => {
    const isGoingLive = !ev.is_live;
    const patch: Record<string, any> = { is_live: isGoingLive };
    if (isGoingLive) {
      patch.qr_expires_at = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    }
    const { error } = await supabase.from('events').update(patch).eq('id', ev.id);
    if (!error) {
      if (!isGoingLive) {
        await markAbsentMembers(ev);
      }
      fetchEvents();
      if (selectedEvent?.id === ev.id) {
        setSelectedEvent({ ...selectedEvent, is_live: isGoingLive, qr_expires_at: patch.qr_expires_at || selectedEvent.qr_expires_at });
      }
    }
  };

  const markAbsentMembers = async (ev: GHMEvent) => {
    const { data: checkedIn } = await supabase
      .from('event_attendance')
      .select('member_id')
      .eq('event_id', ev.id);
    const checkedInIds = new Set((checkedIn || []).map((r: any) => r.member_id));

    let membersQuery = supabase
      .from('profiles')
      .select('id')
      .eq('approval_status', 'approved')
      .not('house_id', 'is', null);

    if (ev.event_level === 'house' && ev.house_id) {
      membersQuery = membersQuery.eq('house_id', ev.house_id);
    }

    const { data: members } = await membersQuery;
    if (!members) return;

    const absentRows = members
      .filter((m: any) => !checkedInIds.has(m.id))
      .map((m: any) => ({
        event_id: ev.id,
        member_id: m.id,
        status: 'absent',
        check_in_method: 'qr',
      }));

    if (absentRows.length > 0) {
      await supabase.from('event_attendance').insert(absentRows);
    }
  };

  const isPast = (dateStr: string) => new Date(dateStr) < new Date(new Date().toDateString());

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Events</h1>
          <p className="text-[#9CA3AF]">Broadcast events to targeted members</p>
        </div>
        {canAddEvent && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all-smooth hover:brightness-110"
            style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
          >
            <Plus className="w-5 h-5" />
            <span>Add Event</span>
          </button>
        )}
      </div>

      <div className="bg-card rounded-2xl p-6 border border-gray-800/50">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[#0F1412] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-[#6B7280]">No events recorded yet</div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const cfg = LEVEL_CONFIG[ev.event_level];
              const Icon = cfg.Icon;
              const past = isPast(ev.event_date);
              return (
                <div
                  key={ev.id}
                  className={`bg-[#0F1412] rounded-xl p-4 border transition-all ${
                    ev.is_live
                      ? 'border-[#4ADE80]/50 shadow-[0_0_16px_rgba(74,222,128,0.12)]'
                      : past
                      ? 'border-gray-800/30 opacity-60'
                      : 'border-gray-800/50 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg mt-0.5 relative" style={{ backgroundColor: cfg.bg }}>
                      <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                      {ev.is_live && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#4ADE80] animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{ev.title}</h3>
                          {ev.is_live && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ADE80' }}>
                              <Radio className="w-3 h-3" /> LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          {past && !ev.is_live && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">Past</span>
                          )}
                        </div>
                      </div>
                      {ev.description && (
                        <p className="text-[#9CA3AF] text-sm mb-2 line-clamp-1">{ev.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {ev.event_time && ` · ${ev.event_time.slice(0, 5)}`}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {ev.location}
                          </span>
                        )}
                        {ev.meeting_link && (
                          <a href={ev.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#6EE7B7] hover:underline">
                            <Link2 className="w-3 h-3" /> Join
                          </a>
                        )}
                        <span style={{ color: cfg.color }}>
                          {ev.event_level === 'house' && (ev.house?.name || '—')}
                          {ev.event_level === 'zone'  && ev.zone}
                          {ev.event_level === 'state' && ev.state}
                          {ev.event_level === 'country' && ev.country}
                          {ev.event_level === 'global' && 'All Members'}
                        </span>
                        {ev.send_notification && (
                          <span className="text-[#4ADE80]">Notified</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                          style={{ backgroundColor: 'rgba(110,231,183,0.1)', color: '#6EE7B7', border: '1px solid rgba(110,231,183,0.25)' }}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR
                        </button>
                        <button
                          onClick={() => toggleLive(ev)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            ev.is_live
                              ? 'bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50'
                              : 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20 hover:bg-[#4ADE80]/20'
                          }`}
                        >
                          <Radio className="w-3.5 h-3.5" />
                          {ev.is_live ? 'End' : 'Go Live'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchEvents(); }}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onToggleLive={toggleLive}
        />
      )}
    </div>
  );
}

function EventDetailModal({ event: ev, onClose, onToggleLive }: {
  event: GHMEvent;
  onClose: () => void;
  onToggleLive: (ev: GHMEvent) => void;
}) {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkedin' | 'absent'>('checkedin');
  const cfg = LEVEL_CONFIG[ev.event_level];
  const attendUrl = ev.qr_token ? `${window.location.origin}/attend?token=${ev.qr_token}` : '';

  const fetchAttendees = () => {
    setLoadingAttendees(true);
    supabase
      .from('event_attendance')
      .select('*, member:member_id(full_name, house:house_id(name))')
      .eq('event_id', ev.id)
      .order('checked_in_at', { ascending: true })
      .then(({ data }) => {
        setAttendees(data || []);
        setLoadingAttendees(false);
      });
  };

  useEffect(() => { fetchAttendees(); }, [ev.id]);

  const checkedIn = attendees.filter(a => a.status !== 'absent');
  const absent    = attendees.filter(a => a.status === 'absent');
  const sessionEnded = !ev.is_live && ev.qr_expires_at !== null;

  return (
    <div className="fixed inset-0 bg-black/85 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-card rounded-2xl border border-gray-800/50 max-w-2xl w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
            <div>
              <h2 className="text-xl font-bold">{ev.title}</h2>
              <p className="text-sm text-[#9CA3AF] mt-0.5">
                {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                {ev.event_time && ` at ${ev.event_time.slice(0, 5)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {ev.is_live && (
                <span className="flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ADE80' }}>
                  <Radio className="w-4 h-4 animate-pulse" /> LIVE
                </span>
              )}
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5 text-[#9CA3AF]" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0F1412] rounded-xl p-3 border border-gray-800/50 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[#4ADE80] mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xl font-bold">{checkedIn.length}</span>
                </div>
                <p className="text-xs text-[#6B7280]">Checked In</p>
              </div>
              <div className="bg-[#0F1412] rounded-xl p-3 border border-gray-800/50 text-center">
                <div className="flex items-center justify-center gap-1.5 text-red-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xl font-bold">{absent.length}</span>
                </div>
                <p className="text-xs text-[#6B7280]">Absent</p>
              </div>
              <div className="bg-[#0F1412] rounded-xl p-3 border border-gray-800/50 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1" style={{ color: cfg.color }}>
                  <cfg.Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{cfg.label}</span>
                </div>
                <p className="text-xs text-[#6B7280] truncate">
                  {ev.event_level === 'house' && ev.house?.name}
                  {ev.event_level === 'zone' && ev.zone}
                  {ev.event_level === 'state' && ev.state}
                  {ev.event_level === 'country' && ev.country}
                  {ev.event_level === 'global' && 'Global'}
                </p>
              </div>
            </div>

            <div className="bg-[#0F1412] rounded-xl p-5 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-[#4ADE80]" />
                <h3 className="font-semibold">Attendance QR Code</h3>
                {ev.qr_expires_at && ev.is_live && (
                  <span className="ml-auto text-xs text-[#9CA3AF]">
                    Expires {new Date(ev.qr_expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              {ev.qr_token ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-3 rounded-xl border-2" style={{ borderColor: ev.is_live ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.08)', background: '#0B0F0E' }}>
                    <QRCodeCanvas token={ev.qr_token} size={200} />
                  </div>
                  <p className="text-xs text-[#6B7280] text-center break-all max-w-xs">{attendUrl}</p>
                  {!ev.is_live ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-900/20 border border-yellow-800/40 w-full justify-center">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <p className="text-xs text-yellow-400">Go Live to enable member check-ins</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4ADE80]/10 border border-[#4ADE80]/30 w-full justify-center">
                      <CheckCircle className="w-4 h-4 text-[#4ADE80]" />
                      <p className="text-xs text-[#4ADE80]">Active — members can scan this QR to check in</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#6B7280] text-sm text-center py-4">QR token not generated</p>
              )}
            </div>

            {(loadingAttendees || attendees.length > 0) && (
              <div className="bg-[#0F1412] rounded-xl border border-gray-800/50">
                <div className="flex border-b border-gray-800/50">
                  <button
                    onClick={() => setActiveTab('checkedin')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                      activeTab === 'checkedin' ? 'text-[#4ADE80] border-b-2 border-[#4ADE80]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Checked In ({checkedIn.length})
                  </button>
                  {sessionEnded && (
                    <button
                      onClick={() => setActiveTab('absent')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                        activeTab === 'absent' ? 'text-red-400 border-b-2 border-red-400' : 'text-[#6B7280] hover:text-[#9CA3AF]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Absent ({absent.length})
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-800/50 max-h-52 overflow-y-auto">
                  {loadingAttendees ? (
                    <div className="p-4 text-center text-[#6B7280] text-sm">Loading...</div>
                  ) : activeTab === 'checkedin' ? (
                    checkedIn.length === 0 ? (
                      <div className="p-6 text-center text-[#6B7280] text-sm">No check-ins yet</div>
                    ) : checkedIn.map((a, i) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#6B7280] w-5 text-right">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{a.member?.full_name}</p>
                            <p className="text-xs text-[#6B7280]">{a.member?.house?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.status === 'present' ? 'bg-[#4ADE80]/10 text-[#4ADE80]' : 'bg-yellow-900/20 text-yellow-400'
                          }`}>{a.status}</span>
                          <span className="text-xs text-[#6B7280]">
                            {new Date(a.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    absent.length === 0 ? (
                      <div className="p-6 text-center text-[#6B7280] text-sm">No absent members</div>
                    ) : absent.map((a, i) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#6B7280] w-5 text-right">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{a.member?.full_name}</p>
                            <p className="text-xs text-[#6B7280]">{a.member?.house?.name}</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-900/20 text-red-400">absent</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <button
              onClick={async () => {
                await onToggleLive(ev);
                setTimeout(fetchAttendees, 1500);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                ev.is_live
                  ? 'bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50'
                  : 'hover:brightness-110'
              }`}
              style={ev.is_live ? {} : { backgroundColor: '#4ADE80', color: '#0B0F0E' }}
            >
              <Radio className="w-4 h-4" />
              {ev.is_live ? 'End Live Session' : 'Go Live & Enable QR Scanning'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddEventModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [houses, setHouses]       = useState<HouseOption[]>([]);
  const [zones, setZones]         = useState<string[]>([]);
  const [states, setStates]       = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    event_time: '',
    location: '',
    meeting_link: '',
    event_level: 'house' as GHMEvent['event_level'],
    house_id: '',
    zone: '',
    state: '',
    country: '',
    send_notification: true,
    max_late_minutes: 15,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    supabase.from('houses').select('id, name, zone, state, country').order('name')
      .then(({ data }) => {
        const rows = data || [];
        setHouses(rows);
        setZones([...new Set(rows.map((h: any) => h.zone).filter(Boolean))].sort());
        setStates([...new Set(rows.map((h: any) => h.state).filter(Boolean))].sort());
        setCountries([...new Set(rows.map((h: any) => h.country).filter(Boolean))].sort());
      });
  }, []);

  const set = (patch: Partial<typeof formData>) => setFormData(f => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.event_level === 'house'   && !formData.house_id) return setError('Please select a house.');
    if (formData.event_level === 'zone'    && !formData.zone)     return setError('Please select a zone.');
    if (formData.event_level === 'state'   && !formData.state)    return setError('Please select a state.');
    if (formData.event_level === 'country' && !formData.country)  return setError('Please select a country.');

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        title:             formData.title,
        description:       formData.description || null,
        event_date:        formData.event_date,
        event_time:        formData.event_time   || null,
        location:          formData.location     || null,
        meeting_link:      formData.meeting_link || null,
        event_level:       formData.event_level,
        send_notification: formData.send_notification,
        max_late_minutes:  formData.max_late_minutes,
        is_live:           false,
        house_id: null, zone: null, state: null, country: null,
      };
      if (formData.event_level === 'house')   payload.house_id = formData.house_id;
      if (formData.event_level === 'zone')    payload.zone     = formData.zone;
      if (formData.event_level === 'state')   payload.state    = formData.state;
      if (formData.event_level === 'country') payload.country  = formData.country;

      const { data: inserted, error: insertErr } = await supabase
        .from('events')
        .insert([payload])
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      if (formData.send_notification) {
        const { data: { session } } = await supabase.auth.getSession();
        fetch(`${SUPABASE_URL}/functions/v1/create-event-notification`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ event_id: inserted.id }),
        }).catch(err => console.error('Notification dispatch error:', err));
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full">
          <h2 className="text-2xl font-bold mb-6">Add New Event</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => set({ title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Description</label>
              <textarea
                value={formData.description}
                onChange={e => set({ description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Event Date *</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={e => set({ event_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Event Time</label>
                <input
                  type="time"
                  value={formData.event_time}
                  onChange={e => set({ event_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => set({ location: e.target.value })}
                  placeholder="Venue or address"
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Meeting Link</label>
                <input
                  type="url"
                  value={formData.meeting_link}
                  onChange={e => set({ meeting_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Event Level *</label>
                <select
                  value={formData.event_level}
                  onChange={e => set({ event_level: e.target.value as GHMEvent['event_level'], house_id: '', zone: '', state: '', country: '' })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                >
                  <option value="house">House</option>
                  <option value="zone">Zone</option>
                  <option value="state">State</option>
                  <option value="country">Country</option>
                  <option value="global">Global — All Members</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Late Grace (minutes)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={formData.max_late_minutes}
                  onChange={e => set({ max_late_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                />
              </div>
            </div>

            {formData.event_level === 'house' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Select House *</label>
                <select value={formData.house_id} onChange={e => set({ house_id: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow" required>
                  <option value="">Select house...</option>
                  {houses.map(h => <option key={h.id} value={h.id}>{h.name} — {h.zone}, {h.state}</option>)}
                </select>
              </div>
            )}
            {formData.event_level === 'zone' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Select Zone *</label>
                <select value={formData.zone} onChange={e => set({ zone: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow" required>
                  <option value="">Select zone...</option>
                  {zones.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
            )}
            {formData.event_level === 'state' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Select State *</label>
                <select value={formData.state} onChange={e => set({ state: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow" required>
                  <option value="">Select state...</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {formData.event_level === 'country' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Select Country *</label>
                <select value={formData.country} onChange={e => set({ country: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow" required>
                  <option value="">Select country...</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0F1412] border border-gray-800">
              <div>
                <p className="text-sm font-medium">Send Push Notifications</p>
                <p className="text-xs text-[#6B7280] mt-0.5">Notify targeted members instantly</p>
              </div>
              <button
                type="button"
                onClick={() => set({ send_notification: !formData.send_notification })}
                className={`relative w-12 h-6 rounded-full transition-colors ${formData.send_notification ? 'bg-[#4ADE80]' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.send_notification ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0F1412] border border-[#4ADE80]/20">
              <QrCode className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" />
              <p className="text-sm text-[#9CA3AF]">A unique QR code will be auto-generated. Use "Go Live" on the event to allow members to scan and check in.</p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">{error}</div>
            )}

            <div className="flex space-x-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-6 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white hover:bg-[#14532D] transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50" style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}>
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
