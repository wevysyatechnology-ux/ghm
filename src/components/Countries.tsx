import { useEffect, useState } from 'react';
import { Search, Plus, CreditCard as Edit, Trash2, X, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Country } from '../types';

export default function Countries() {
  const { profile } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [deletingCountry, setDeletingCountry] = useState<Country | null>(null);

  const canManage = profile?.role === 'super_admin' || profile?.role === 'global_admin';
  const canAdd = canManage || profile?.role === 'collaborator';
  const canEdit = canAdd;

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredCountries(countries);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredCountries(countries.filter((c) => c.name.toLowerCase().includes(q)));
    }
  }, [searchQuery, countries]);

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      if (error) throw error;
      setCountries(data || []);
      setFilteredCountries(data || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(110,231,183,0.1)' }}>
            <Globe className="w-5 h-5 text-[#6EE7B7]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Countries</h3>
            <p className="text-xs text-[#9CA3AF]">{countries.length} total</p>
          </div>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:brightness-110"
            style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Country</span>
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <input
          type="text"
          placeholder="Search countries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all text-sm"
        />
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
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">Country Name</th>
                <th className="text-left py-3 px-4 text-[#9CA3AF] font-medium text-sm">Created</th>
                {canEdit && (
                  <th className="text-right py-3 px-4 text-[#9CA3AF] font-medium text-sm">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredCountries.map((country, idx) => (
                <tr
                  key={country.id}
                  className="border-b border-gray-800/40 hover:bg-[#0F1412] transition-all"
                >
                  <td className="py-3 px-4 text-[#9CA3AF] text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-[#6EE7B7]" />
                      <span>{country.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#9CA3AF] text-sm">
                    {new Date(country.created_at).toLocaleDateString()}
                  </td>
                  {canEdit && (
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingCountry(country)}
                          className="p-2 rounded-lg text-[#6EE7B7] hover:bg-[#14532D] transition-all"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => setDeletingCountry(country)}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-900/20 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCountries.length === 0 && (
            <div className="text-center py-10 text-[#6B7280] text-sm">
              No countries found
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <CountryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchCountries(); }}
        />
      )}
      {editingCountry && (
        <CountryModal
          country={editingCountry}
          onClose={() => setEditingCountry(null)}
          onSuccess={() => { setEditingCountry(null); fetchCountries(); }}
        />
      )}
      {deletingCountry && (
        <DeleteCountryModal
          country={deletingCountry}
          onClose={() => setDeletingCountry(null)}
          onSuccess={() => { setDeletingCountry(null); fetchCountries(); }}
        />
      )}
    </div>
  );
}

function CountryModal({
  country,
  onClose,
  onSuccess,
}: {
  country?: Country;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(country?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!country;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('countries')
          .update({ name: name.trim() })
          .eq('id', country.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('countries')
          .insert([{ name: name.trim() }]);
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
          <h2 className="text-xl font-bold">{isEditing ? 'Edit Country' : 'Add Country'}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Country Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              placeholder="Enter country name"
              required
              autoFocus
            />
          </div>
          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white hover:bg-[#14532D] transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
            >
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Add Country'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteCountryModal({
  country,
  onClose,
  onSuccess,
}: {
  country: Country;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.from('countries').delete().eq('id', country.id);
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
        <h2 className="text-xl font-bold mb-2">Delete Country</h2>
        <p className="text-[#9CA3AF] text-sm mb-4">
          Are you sure you want to delete <span className="text-white font-medium">"{country.name}"</span>?
          This will also delete all related states and zones.
        </p>
        {error && (
          <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white transition-all text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
