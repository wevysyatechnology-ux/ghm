import { useEffect, useState } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Deal, Profile, House } from '../types';

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          from_member:from_member_id(full_name),
          to_member:to_member_id(full_name),
          house:houses(name)
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

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Deals</h1>
          <p className="text-[#9CA3AF]">Transaction ledger</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all-smooth glow-green-sm hover:glow-green hover:scale-105 active:scale-95"
          style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
        >
          <Plus className="w-5 h-5" />
          <span>Add Deal</span>
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
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="bg-[#0F1412] rounded-xl p-4 border border-gray-800/50 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)' }}>
                      <DollarSign className="w-5 h-5" style={{ color: '#4ADE80' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {deal.from_member && <span className="font-medium">{deal.from_member.full_name}</span>}
                          {deal.from_member && deal.to_member && <span className="text-[#6B7280]">→</span>}
                          {deal.to_member && <span className="font-medium">{deal.to_member.full_name}</span>}
                        </div>
                        <span className="text-xl font-bold" style={{ color: '#4ADE80' }}>
                          ${deal.amount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[#9CA3AF] text-sm mb-2">{deal.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-[#6B7280]">
                        {deal.house && <span>House: {deal.house.name}</span>}
                        <span>Deal Date: {new Date(deal.deal_date).toLocaleDateString()}</span>
                        <span>Recorded: {new Date(deal.created_at).toLocaleDateString()}</span>
                      </div>
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [formData, setFormData] = useState({
    amount: '',
    from_member_id: '',
    to_member_id: '',
    description: '',
    house_id: '',
    deal_date: new Date().toISOString().split('T')[0],
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
      const { error } = await supabase.from('deals').insert([{
        amount: parseFloat(formData.amount),
        from_member_id: formData.from_member_id || null,
        to_member_id: formData.to_member_id || null,
        description: formData.description,
        house_id: formData.house_id || null,
        deal_date: formData.deal_date,
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-6">Add New Deal</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Deal Date</label>
              <input
                type="date"
                value={formData.deal_date}
                onChange={(e) => setFormData({ ...formData, deal_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              />
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
