import { useEffect, useState } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Attendance as AttendanceType, Profile } from '../types';

export default function Attendance() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const canMarkAttendance = profile?.role && ['super_admin', 'global_admin', 'house_admin'].includes(profile.role);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          member:member_id(full_name),
          marked_by_profile:marked_by(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Attendance</h1>
          <p className="text-[#9CA3AF]">Event attendance tracking</p>
        </div>
        {canMarkAttendance && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all-smooth glow-green-sm hover:glow-green hover:scale-105 active:scale-95"
            style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
          >
            <Plus className="w-5 h-5" />
            <span>Mark Attendance</span>
          </button>
        )}
      </div>

      <div className="bg-card rounded-2xl p-6 border border-gray-800/50">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[#0F1412] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {attendance.map((record) => (
              <div
                key={record.id}
                className="bg-[#0F1412] rounded-xl p-4 border border-gray-800/50 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)' }}>
                    <ClipboardList className="w-5 h-5" style={{ color: '#4ADE80' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{record.event_name}</h3>
                      <span className="text-sm text-[#6B7280]">
                        {new Date(record.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-[#9CA3AF]">
                      <span>Member: {record.member?.full_name}</span>
                      <span>Marked by: {record.marked_by_profile?.full_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {attendance.length === 0 && (
              <div className="text-center py-12 text-[#6B7280]">
                No attendance records yet
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddAttendanceModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchAttendance();
          }}
        />
      )}
    </div>
  );
}

function AddAttendanceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    event_name: '',
    member_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    setProfiles(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.from('attendance').insert([formData]);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Mark Attendance</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Event Name</label>
            <input
              type="text"
              value={formData.event_name}
              onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              placeholder="Weekly Meeting, Workshop, etc."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Member</label>
            <select
              value={formData.member_id}
              onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
              required
            >
              <option value="">Select member</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
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
              {loading ? 'Marking...' : 'Mark Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
