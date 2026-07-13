import { useEffect, useState } from 'react';
import { Search, Plus, CreditCard as Edit, Trash2, X, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Country, State, Zone } from '../types';

export default function Zones() {
  const { profile } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [filteredZones, setFilteredZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [deletingZone, setDeletingZone] = useState<Zone | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [allStates, setAllStates] = useState<State[]>([]);
  const [filterStateId, setFilterStateId] = useState('');
  const [filterCountryId, setFilterCountryId] = useState('');

  const canManage = profile?.role === 'super_admin' || profile?.role === 'global_admin' || profile?.role === 'collaborator';

  useEffect(() => {
    fetchZones();
    fetchCountries();
    fetchAllStates();
  }, []);

  useEffect(() => {
    let result = zones;
    if (filterCountryId) {
      result = result.filter((z) => z.state?.country_id === filterCountryId);
    }
    if (filterStateId) {
      result = result.filter((z) => z.state_id === filterStateId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (z) =>
          z.name.toLowerCase().includes(q) ||
          z.state?.name.toLowerCase().includes(q) ||
          z.state?.country?.name.toLowerCase().includes(q)
      );
    }
    setFilteredZones(result);
  }, [searchQuery, filterStateId, filterCountryId, zones]);

  const fetchCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    setCountries(data || []);
  };

  const fetchAllStates = async () => {
    const { data } = await supabase
      .from('states')
      .select('*, country:countries(id, name, created_at)')
      .order('name');
    setAllStates(data || []);
  };

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*, state:states(id, name, country_id, created_at, country:countries(id, name, created_at))')
        .order('name');
      if (error) throw error;
      setZones(data || []);
      setFilteredZones(data || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStatesByCountry = filterCountryId
    ? allStates.filter((s) => s.country_id === filterCountryId)
    : allStates;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(110,231,183,0.1)' }}>
            <Layers className="w-5 h-5 text-[#6EE7B7]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Zones</h3>
            <p className="text-xs text-[#9CA3AF]">{zones.length} total</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:brightness-110"
            style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Zone</span>
          </button>
        )}
      </div>

      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search zones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all text-sm"
          />
        </div>
        <select
          value={filterCountryId}
          onChange={(e) => { setFilterCountryId(e.target.value); setFilterStateId(''); }}
          className="px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow text-sm min-w-[150px]"
        >
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterStateId}
          onChange={(e) => setFilterStateId(e.target.value)}
          className="px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow text-sm min-w-[150px]"
        >
          <option value="">All States</option>
          {filteredStatesByCountry.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
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
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">Zone Name</th>
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">State</th>
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">Country</th>
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">Created</th>
                {canManage && (
                  <th className="text-right py-3 px-4 text-[#9CA3AF] font-medium text-sm">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredZones.map((zone, idx) => (
                <tr key={zone.id} className="border-b border-gray-800/40 hover:bg-[#0F1412] transition-all">
                  <td className="py-3 px-4 text-[#9CA3AF] text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-[#6EE7B7]" />
                      <span>{zone.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(110,231,183,0.1)', color: '#6EE7B7' }}>
                      {zone.state?.name || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#9CA3AF] text-sm">
                    {zone.state?.country?.name || '—'}
                  </td>
                  <td className="py-3 px-4 text-[#9CA3AF] text-sm">
                    {new Date(zone.created_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingZone(zone)}
                          className="p-2 rounded-lg text-[#6EE7B7] hover:bg-[#14532D] transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingZone(zone)}
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
          {filteredZones.length === 0 && (
            <div className="text-center py-10 text-[#6B7280] text-sm">
              No zones found
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <ZoneModal
          countries={countries}
          allStates={allStates}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchZones(); }}
        />
      )}
      {editingZone && (
        <ZoneModal
          zone={editingZone}
          countries={countries}
          allStates={allStates}
          onClose={() => setEditingZone(null)}
          onSuccess={() => { setEditingZone(null); fetchZones(); }}
        />
      )}
      {deletingZone && (
        <DeleteZoneModal
          zone={deletingZone}
          onClose={() => setDeletingZone(null)}
          onSuccess={() => { setDeletingZone(null); fetchZones(); }}
        />
      )}
    </div>
  );
}

function ZoneModal({
  zone,
  countries,
  allStates,
  onClose,
  onSuccess,
}: {
  zone?: Zone;
  countries: Country[];
  allStates: State[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const initialCountryId = zone
    ? (allStates.find((s) => s.id === zone.state_id)?.country_id || '')
    : '';

  const [name, setName] = useState(zone?.name || '');
  const [countryId, setCountryId] = useState(initialCountryId);
  const [stateId, setStateId] = useState(zone?.state_id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!zone;

  const statesForCountry = countryId
    ? allStates.filter((s) => s.country_id === countryId)
    : [];

  const handleCountryChange = (cId: string) => {
    setCountryId(cId);
    setStateId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateId) { setError('Please select a state'); return; }
    setError('');
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('zones')
          .update({ name: name.trim(), state_id: stateId })
          .eq('id', zone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('zones')
          .insert([{ name: name.trim(), state_id: stateId }]);
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
          <h2 className="text-xl font-bold">{isEditing ? 'Edit Zone' : 'Add Zone'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Country</label>
            <select
              value={countryId}
              onChange={(e) => handleCountryChange(e.target.value)}
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
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">State</label>
            <select
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow disabled:opacity-50"
              required
              disabled={!countryId}
            >
              <option value="">— Select State —</option>
              {statesForCountry.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {countryId && statesForCountry.length === 0 && (
              <p className="text-xs text-yellow-500 mt-1">No states available for the selected country.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Zone Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              placeholder="Enter zone name"
              required
            />
          </div>
          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">{error}</div>
          )}
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white transition-all text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50 text-sm" style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}>
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Add Zone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteZoneModal({
  zone,
  onClose,
  onSuccess,
}: {
  zone: Zone;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('zones').delete().eq('id', zone.id);
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
        <h2 className="text-xl font-bold mb-2">Delete Zone</h2>
        <p className="text-[#9CA3AF] text-sm mb-4">
          Are you sure you want to delete <span className="text-white font-medium">"{zone.name}"</span>?
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
