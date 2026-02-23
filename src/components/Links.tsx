import { useEffect, useState } from 'react';
import { Search, Plus, Link2 as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link, Profile, House } from '../types';

export default function Links() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select(`
          *,
          from_member:from_member_id(full_name, email),
          to_member:to_member_id(full_name, email),
          house:houses(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Links</h1>
          <p className="text-[#9CA3AF]">Member connection ledger</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all-smooth glow-green-sm hover:glow-green hover:scale-105 active:scale-95"
          style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
        >
          <Plus className="w-5 h-5" />
          <span>Add Link</span>
        </button>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-gray-800/50">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-[#0F1412] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="bg-[#0F1412] rounded-xl p-4 border border-gray-800/50 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(110, 231, 183, 0.1)' }}>
                      <LinkIcon className="w-5 h-5" style={{ color: '#6EE7B7' }} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium">{link.from_member?.full_name}</span>
                        <span className="text-[#6B7280]">→</span>
                        <span className="font-medium">{link.to_member?.full_name}</span>
                      </div>
                      <p className="text-[#9CA3AF] text-sm mb-2">{link.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-[#6B7280]">
                        {link.house && <span>House: {link.house.name}</span>}
                        <span>{new Date(link.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {links.length === 0 && (
              <div className="text-center py-12 text-[#6B7280]">
                No links recorded yet
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddLinkModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchLinks();
          }}
        />
      )}
    </div>
  );
}

function AddLinkModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [formData, setFormData] = useState({
    from_member_id: '',
    to_member_id: '',
    description: '',
    house_id: '',
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
      const { error } = await supabase.from('links').insert([{
        ...formData,
        house_id: formData.house_id || null,
      }]);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-6">Add New Link</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">From Member</label>
              <select
                value={formData.from_member_id}
                onChange={(e) => setFormData({ ...formData, from_member_id: e.target.value })}
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
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">To Member</label>
              <select
                value={formData.to_member_id}
                onChange={(e) => setFormData({ ...formData, to_member_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              >
                <option value="">Select member</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow resize-none"
              rows={3}
              required
            />
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
              {loading ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
