import { useEffect, useState } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { House } from '../types';
import { Profile } from '../types';

interface CoreDeal {
  id: string;
  creator_id: string;
  house_id: string | null;
  title: string;
  description: string;
  amount: number;
  deal_type: string;
  status: string;
  created_at: string;
  from_member_id: string | null;
  to_member_id: string | null;
  from_member?: { full_name: string };
  to_member?: { full_name: string };
  house?: { name: string };
}

export default function Deals({ readOnly = false }: { readOnly?: boolean }) {
  const [deals, setDeals] = useState<CoreDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('core_deals')
        .select(`
          *,
          from_member:from_member_id(full_name),
          to_member:to_member_id(full_name),
          house:house_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return '#4ADE80';
    if (s === 'active') return '#6EE7B7';
    if (s === 'cancelled') return '#EF4444';
    return '#F59E0B';
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Deals</h1>
          <p className="text-[#9CA3AF]">Transaction ledger</p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all-smooth glow-green-sm hover:glow-green hover:scale-105 active:scale-95"
            style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
          >
            <Plus className="w-5 h-5" />
            <span>Add Deal</span>
          </button>
        )}
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
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="bg-[#0F1412] rounded-xl p-4 border border-gray-800/50 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)' }}>
                    <DollarSign className="w-5 h-5" style={{ color: '#4ADE80' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{deal.title}</h3>
                      <div className="flex items-center space-x-2">
                        {deal.amount > 0 && (
                          <span className="text-xl font-bold" style={{ color: '#4ADE80' }}>
                            ₹{deal.amount.toLocaleString()}
                          </span>
                        )}
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{ backgroundColor: `${statusColor(deal.status)}20`, color: statusColor(deal.status) }}
                        >
                          {deal.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-[#9CA3AF] text-sm mb-2">{deal.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
                      {deal.from_member && (
                        <span>From: <span className="text-gray-300">{deal.from_member.full_name}</span></span>
                      )}
                      {deal.to_member && (
                        <span>To: <span className="text-gray-300">{deal.to_member.full_name}</span></span>
                      )}
                      {deal.deal_type && (
                        <span className="capitalize">Type: {deal.deal_type}</span>
                      )}
                      {deal.house && <span>House: {deal.house.name}</span>}
                      <span>{new Date(deal.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {deals.length === 0 && (
              <div className="text-center py-12 text-[#6B7280]">
                No deals recorded yet
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddDealModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchDeals();
          }}
        />
      )}
    </div>
  );
}

function AddDealModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    deal_type: 'business',
    status: 'active',
    from_member_id: '',
    to_member_id: '',
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
      const { error } = await supabase.from('core_deals').insert([{
        creator_id: user?.id,
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        deal_type: formData.deal_type,
        status: formData.status,
        from_member_id: formData.from_member_id || null,
        to_member_id: formData.to_member_id || null,
        house_id: formData.house_id || null,
      }]);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full my-8">
        <h2 className="text-2xl font-bold mb-6">Add New Deal</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Deal Type</label>
              <select
                value={formData.deal_type}
                onChange={(e) => setFormData({ ...formData, deal_type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
              >
                <option value="business">Business</option>
                <option value="referral">Referral</option>
                <option value="partnership">Partnership</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">From Member</label>
              <select
                value={formData.from_member_id}
                onChange={(e) => setFormData({ ...formData, from_member_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
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
              {loading ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
