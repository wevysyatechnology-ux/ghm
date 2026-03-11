import { useEffect, useState } from 'react';
import { Plus, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile, House } from '../types';

interface CoreI2WE {
  id: string;
  member_1_id: string;
  member_2_id: string;
  house_id: string | null;
  meeting_date: string;
  notes: string;
  status: string;
  created_at: string;
  member_1?: { full_name: string };
  member_2?: { full_name: string };
  house?: { name: string };
}

export default function I2WE() {
  const [events, setEvents] = useState<CoreI2WE[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('core_i2we')
        .select(`
          *,
          member_1:member_1_id(full_name),
          member_2:member_2_id(full_name),
          house:house_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching I2WE events:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return '#4ADE80';
    if (s === 'scheduled') return '#6EE7B7';
    if (s === 'cancelled') return '#EF4444';
    return '#F59E0B';
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-[-150px] right-[-100px] w-[650px] h-[650px] gradient-blob-green opacity-20" />
      <div className="absolute bottom-[-100px] left-[-150px] w-[550px] h-[550px] gradient-blob-teal opacity-25" />

      <div className="flex items-center justify-between animate-slide-up relative z-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">I2WE Events</h1>
          <p className="text-[#9CA3AF]">Track transformation from "I" to "WE"</p>
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

      <div className="bg-card rounded-2xl p-6 border border-gray-800/50 relative z-10 backdrop-blur-xl">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-[#0F1412] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-[#0F1412] rounded-xl p-4 border border-gray-800/50 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(110, 231, 183, 0.1)' }}>
                    <TrendingUp className="w-5 h-5" style={{ color: '#6EE7B7' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{event.member_1?.full_name || '—'}</span>
                        <span className="text-[#6B7280]">↔</span>
                        <span className="font-semibold">{event.member_2?.full_name || '—'}</span>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ backgroundColor: `${statusColor(event.status)}20`, color: statusColor(event.status) }}
                      >
                        {event.status}
                      </span>
                    </div>
                    {event.notes && (
                      <p className="text-[#9CA3AF] text-sm mb-2">{event.notes}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Meeting: {new Date(event.meeting_date).toLocaleDateString()}
                      </span>
                      {event.house && <span>House: {event.house.name}</span>}
                      <span>Recorded: {new Date(event.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {events.length === 0 && (
              <div className="text-center py-12 text-[#6B7280]">
                No I2WE events recorded yet
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}

function AddEventModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [formData, setFormData] = useState({
    member_1_id: '',
    member_2_id: '',
    house_id: '',
    meeting_date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'scheduled',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, housesRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').order('full_name'),
      supabase.from('houses').select('id, name').order('name'),
    ]);
    setProfiles(profilesRes.data || []);
    setHouses(housesRes.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.from('core_i2we').insert([{
        member_1_id: formData.member_1_id,
        member_2_id: formData.member_2_id,
        house_id: formData.house_id || null,
        meeting_date: formData.meeting_date,
        notes: formData.notes,
        status: formData.status,
      }]);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full my-8">
        <h2 className="text-2xl font-bold mb-6">Add I2WE Event</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Member 1</label>
              <select
                value={formData.member_1_id}
                onChange={(e) => setFormData({ ...formData, member_1_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              >
                <option value="">Select member</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Member 2</label>
              <select
                value={formData.member_2_id}
                onChange={(e) => setFormData({ ...formData, member_2_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              >
                <option value="">Select member</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Meeting Date</label>
              <input
                type="date"
                value={formData.meeting_date}
                onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">House (Optional)</label>
            <select
              value={formData.house_id}
              onChange={(e) => setFormData({ ...formData, house_id: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
            >
              <option value="">Select house</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow resize-none"
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
              {error}
            </div>
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
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 glow-green-sm hover:glow-green"
              style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
