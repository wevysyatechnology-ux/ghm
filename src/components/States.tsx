import { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, X, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Country, State } from '../types';

export default function States() {
  const { profile } = useAuth();
  const [states, setStates] = useState<State[]>([]);
  const [filteredStates, setFilteredStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [deletingState, setDeletingState] = useState<State | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [filterCountryId, setFilterCountryId] = useState('');

  const canManage = profile?.role === 'super_admin' || profile?.role === 'global_admin';

  useEffect(() => {
    fetchStates();
    fetchCountries();
  }, []);

  useEffect(() => {
    let result = states;
    if (filterCountryId) {
      result = result.filter((s) => s.country_id === filterCountryId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.country?.name.toLowerCase().includes(q)
      );
    }
    setFilteredStates(result);
  }, [searchQuery, filterCountryId, states]);

  const fetchCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    setCountries(data || []);
  };

  const fetchStates = async () => {
    try {
      const { data, error } = await supabase
        .from('states')
        .select('*, country:countries(id, name, created_at)')
        .order('name');
      if (error) throw error;
      setStates(data || []);
      setFilteredStates(data || []);
    } catch (error) {
      console.error('Error fetching states:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(110,231,183,0.1)' }}>
            <MapPin className="w-5 h-5 text-[#6EE7B7]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">States</h3>
            <p className="text-xs text-[#9CA3AF]">{states.length} total</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:brightness-110"
            style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add State</span>
          </button>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search states..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all text-sm"
          />
        </div>
        <select
          value={filterCountryId}
          onChange={(e) => setFilterCountryId(e.target.value)}
          className="px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow text-sm min-w-[160px]"
        >
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-[#0F1412] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">#</th>
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">State Name</th>
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">Country</th>
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">Created</th>
                {canManage && (
                  <th className="text-right py-3 px-4 text-[#9CA3AF] font-medium text-sm">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredStates.map((state, idx) => (
                <tr key={state.id} className="border-b border-gray-800/40 hover:bg-[#0F1412] transition-all">
                  <td className="py-3 px-4 text-[#9CA3AF] text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-[#6EE7B7]" />
                      <span>{state.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: 'rgba(110,231,183,0.1)', color: '#6EE7B7' }}
                    >
                      {state.country?.name || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#9CA3AF] text-sm">
                    {new Date(state.created_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingState(state)}
                          className="p-2 rounded-lg text-[#6EE7B7] hover:bg-[#14532D] transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingState(state)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStates.length === 0 && (
            <div className="text-center py-10 text-[#6B7280] text-sm">
              No states found
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <StateModal
          countries={countries}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchStates(); }}
        />
      )}
      {editingState && (
        <StateModal
          state={editingState}
          countries={countries}
          onClose={() => setEditingState(null)}
          onSuccess={() => { setEditingState(null); fetchStates(); }}
        />
      )}
      {deletingState && (
        <DeleteStateModal
          state={deletingState}
          onClose={() => setDeletingState(null)}
          onSuccess={() => { setDeletingState(null); fetchStates(); }}
        />
      )}
    </div>
  );
}

function StateModal({
  state,
  countries,
  onClose,
  onSuccess,
}: {
  state?: State;
  countries: Country[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(state?.name || '');
  const [countryId, setCountryId] = useState(state?.country_id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!state;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryId) { setError('Please select a country'); return; }
    setError('');
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('states')
          .update({ name: name.trim(), country_id: countryId })
          .eq('id', state.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('states')
          .insert([{ name: name.trim(), country_id: countryId }]);
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit State' : 'Add State'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Country</label>
            <select
              value={countryId}
              onChange={(e) => setCountryId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
              required
            >
              <option value="">— Select Country —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">State Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              placeholder="Enter state name"
              required
            />
          </div>
          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">{error}</div>
          )}
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white transition-all text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50 text-sm" style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}>
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Add State'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteStateModal({
  state,
  onClose,
  onSuccess,
}: {
  state: State;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('states').delete().eq('id', state.id);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-red-900/30 w-full max-w-md animate-slide-up">
        <h2 className="text-xl font-bold mb-2">Delete State</h2>
        <p className="text-[#9CA3AF] text-sm mb-4">
          Are you sure you want to delete <span className="text-white font-medium">"{state.name}"</span>?
          This will also delete all related zones.
        </p>
        {error && (
          <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm mb-4">{error}</div>
        )}
        <div className="flex space-x-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white transition-all text-sm">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium transition-all disabled:opacity-50 text-sm">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
