import { useEffect, useState } from 'react';
import { Plus, Calendar, MapPin, Link2, Globe, Home, Building2, Map } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GHMEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  meeting_link: string | null;
  event_level: 'house' | 'zone' | 'state' | 'country' | 'global';
  house_id: string | null;
  zone: string | null;
  state: string | null;
  country: string | null;
  send_notification: boolean;
  created_at: string;
  house?: { name: string } | null;
}

interface HouseOption { id: string; name: string; zone: string; state: string; country: string; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const LEVEL_CONFIG = {
  house:   { label: 'House',   color: '#6EE7B7', bg: 'rgba(110,231,183,0.1)', Icon: Home },
  zone:    { label: 'Zone',    color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  Icon: Building2 },
  state:   { label: 'State',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', Icon: Map },
  country: { label: 'Country', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)',Icon: MapPin },
  global:  { label: 'Global',  color: '#F472B6', bg: 'rgba(244,114,182,0.1)',Icon: Globe },
} as const;

export default function Events() {
  const [events, setEvents] = useState<GHMEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, house:house_id(name)')
        .order('event_date', { ascending: true });
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
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
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all-smooth hover:brightness-110"
          style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
        >
          <Plus className="w-5 h-5" />
          <span>Add Event</span>
        </button>
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
                  className={`bg-[#0F1412] rounded-xl p-4 border transition-all ${past ? 'border-gray-800/30 opacity-60' : 'border-gray-800/50 hover:border-gray-700'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg mt-0.5" style={{ backgroundColor: cfg.bg }}>
                      <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold truncate">{ev.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                          {past && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">Past</span>
                          )}
                        </div>
                      </div>
                      {ev.description && (
                        <p className="text-[#9CA3AF] text-sm mb-2 line-clamp-2">{ev.description}</p>
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
                          <a
                            href={ev.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#6EE7B7] hover:underline"
                          >
                            <Link2 className="w-3 h-3" /> Join
                          </a>
                        )}
                        <span style={{ color: cfg.color }}>
                          {ev.event_level === 'house' && `🏠 ${ev.house?.name || '—'}`}
                          {ev.event_level === 'zone'  && `📍 ${ev.zone}`}
                          {ev.event_level === 'state' && `🗺 ${ev.state}`}
                          {ev.event_level === 'country' && `🌍 ${ev.country}`}
                          {ev.event_level === 'global' && '🌐 All Members'}
                        </span>
                        {ev.send_notification && (
                          <span className="text-[#4ADE80]">🔔 Notified</span>
                        )}
                      </div>
                    </div>
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
    </div>
  );
}

// ── Add Event Modal ───────────────────────────────────────────
function AddEventModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [houses, setHouses]   = useState<HouseOption[]>([]);
  const [zones, setZones]     = useState<string[]>([]);
  const [states, setStates]   = useState<string[]>([]);
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    supabase.from('houses').select('id, name, zone, state, country').order('name')
      .then(({ data }) => {
        const rows = data || [];
        setHouses(rows);
        setZones([...new Set(rows.map(h => h.zone).filter(Boolean))].sort());
        setStates([...new Set(rows.map(h => h.state).filter(Boolean))].sort());
        setCountries([...new Set(rows.map(h => h.country).filter(Boolean))].sort());
      });
  }, []);

  const set = (patch: Partial<typeof formData>) => setFormData(f => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate scope field is set
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
        house_id:          null, zone: null, state: null, country: null,
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

      // Trigger push notifications via edge function
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
          {/* Title */}
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Description</label>
            <textarea
              value={formData.description}
              onChange={e => set({ description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow resize-none"
              rows={3}
            />
          </div>

          {/* Date + Time */}
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

          {/* Location + Link */}
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

          {/* Event Level */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Event Level *</label>
            <select
              value={formData.event_level}
              onChange={e => set({ event_level: e.target.value as GHMEvent['event_level'], house_id: '', zone: '', state: '', country: '' })}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
            >
              <option value="house">🏠 House — Notify specific house</option>
              <option value="zone">📍 Zone — Notify all houses in a zone</option>
              <option value="state">🗺 State — Notify all houses in a state</option>
              <option value="country">🌍 Country — Notify all houses in a country</option>
              <option value="global">🌐 Global — Notify all members</option>
            </select>
          </div>

          {/* Conditional scope selector */}
          {formData.event_level === 'house' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Select House *</label>
              <select
                value={formData.house_id}
                onChange={e => set({ house_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              >
                <option value="">Select house...</option>
                {houses.map(h => <option key={h.id} value={h.id}>{h.name} — {h.zone}, {h.state}</option>)}
              </select>
            </div>
          )}
          {formData.event_level === 'zone' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Select Zone *</label>
              <select
                value={formData.zone}
                onChange={e => set({ zone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              >
                <option value="">Select zone...</option>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          )}
          {formData.event_level === 'state' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Select State *</label>
              <select
                value={formData.state}
                onChange={e => set({ state: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              >
                <option value="">Select state...</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {formData.event_level === 'country' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Select Country *</label>
              <select
                value={formData.country}
                onChange={e => set({ country: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              >
                <option value="">Select country...</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Send Notification toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0F1412] border border-gray-800">
            <div>
              <p className="text-sm font-medium">Send Push Notifications</p>
              <p className="text-xs text-[#6B7280] mt-0.5">Notify targeted members instantly on their devices</p>
            </div>
            <button
              type="button"
              onClick={() => set({ send_notification: !formData.send_notification })}
              className={`relative w-12 h-6 rounded-full transition-colors ${formData.send_notification ? 'bg-[#4ADE80]' : 'bg-gray-700'}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.send_notification ? 'left-7' : 'left-1'}`}
              />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">{error}</div>
          )}

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white hover:bg-[#14532D] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
