import { useEffect, useState } from 'react';
import { Search, Plus, Filter, Edit, Trash2, X, Upload, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { House } from '../types';
import * as XLSX from 'xlsx';

export default function Houses() {
  const { profile } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [filteredHouses, setFilteredHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [deletingHouse, setDeletingHouse] = useState<House | null>(null);

  const canManageHouses = profile?.role === 'super_admin' || profile?.role === 'global_admin';

  useEffect(() => {
    fetchHouses();
  }, []);

  useEffect(() => {
    filterHouses();
  }, [searchQuery, houses]);

  const fetchHouses = async () => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHouses(data || []);
      setFilteredHouses(data || []);
    } catch (error) {
      console.error('Error fetching houses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterHouses = () => {
    if (!searchQuery) {
      setFilteredHouses(houses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = houses.filter(
      (house) =>
        house.name.toLowerCase().includes(query) ||
        house.state.toLowerCase().includes(query) ||
        house.country.toLowerCase().includes(query) ||
        house.zone.toLowerCase().includes(query)
    );
    setFilteredHouses(filtered);
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] gradient-blob-teal opacity-25" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20" />

      <div className="flex items-center justify-between animate-slide-up relative z-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Houses</h1>
          <p className="text-[#9CA3AF]">Manage WeVysya houses across zones</p>
        </div>
        {canManageHouses && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium border border-gray-800 text-white hover:bg-[#0F1412] transition-all-smooth"
            >
              <Upload className="w-5 h-5" />
              <span>Import</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all-smooth hover:brightness-110"
              style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
            >
              <Plus className="w-5 h-5" />
              <span>Add House</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl p-6 border border-gray-800/50 relative z-10 backdrop-blur-xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search houses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-[#9CA3AF] hover:text-white hover:border-gray-700 transition-all">
            <Filter className="w-5 h-5" />
            <span>Filter</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[#0F1412] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-4 text-[#9CA3AF] font-medium text-sm">House Name</th>
                  <th className="text-left py-4 px-4 text-[#9CA3AF] font-medium text-sm">State</th>
                  <th className="text-left py-4 px-4 text-[#9CA3AF] font-medium text-sm">Country</th>
                  <th className="text-left py-4 px-4 text-[#9CA3AF] font-medium text-sm">Zone</th>
                  <th className="text-left py-4 px-4 text-[#9CA3AF] font-medium text-sm">Email</th>
                  <th className="text-left py-4 px-4 text-[#9CA3AF] font-medium text-sm">Mobile</th>
                  <th className="text-left py-4 px-4 text-[#9CA3AF] font-medium text-sm">Created</th>
                  {canManageHouses && (
                    <th className="text-right py-4 px-4 text-[#9CA3AF] font-medium text-sm">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredHouses.map((house) => (
                  <tr key={house.id} className="border-b border-gray-800/50 hover:bg-[#0F1412] transition-all-smooth">
                    <td className="py-4 px-4 font-medium">{house.name}</td>
                    <td className="py-4 px-4 text-[#9CA3AF]">{house.state}</td>
                    <td className="py-4 px-4 text-[#9CA3AF]">{house.country}</td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: 'rgba(110, 231, 183, 0.1)', color: '#6EE7B7' }}>
                        {house.zone}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[#9CA3AF]">{house.email || '-'}</td>
                    <td className="py-4 px-4 text-[#9CA3AF]">{house.mobile || '-'}</td>
                    <td className="py-4 px-4 text-[#9CA3AF] text-sm">
                      {new Date(house.created_at).toLocaleDateString()}
                    </td>
                    {canManageHouses && (
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setEditingHouse(house)}
                            className="p-2 rounded-lg text-[#6EE7B7] hover:bg-[#14532D] transition-all-smooth"
                            title="Edit house"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingHouse(house)}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-900/20 transition-all-smooth"
                            title="Delete house"
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

            {filteredHouses.length === 0 && (
              <div className="text-center py-12 text-[#6B7280]">
                No houses found
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddHouseModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchHouses();
          }}
        />
      )}

      {showImportModal && (
        <ImportHousesModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchHouses();
          }}
        />
      )}

      {editingHouse && (
        <EditHouseModal
          house={editingHouse}
          onClose={() => setEditingHouse(null)}
          onSuccess={() => {
            setEditingHouse(null);
            fetchHouses();
          }}
        />
      )}

      {deletingHouse && (
        <DeleteConfirmModal
          house={deletingHouse}
          onClose={() => setDeletingHouse(null)}
          onSuccess={() => {
            setDeletingHouse(null);
            fetchHouses();
          }}
        />
      )}
    </div>
  );
}

function AddHouseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    country: '',
    zone: '',
    email: '',
    mobile: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.from('houses').insert([formData]);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create house');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Add New House</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">House Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Zone</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Mobile</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
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
              {loading ? 'Creating...' : 'Create House'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditHouseModal({ house, onClose, onSuccess }: { house: House; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: house.name,
    state: house.state,
    country: house.country,
    zone: house.zone,
    email: house.email || '',
    mobile: house.mobile || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase
        .from('houses')
        .update(formData)
        .eq('id', house.id);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update house');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Edit House</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">House Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Zone</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Mobile</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
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
              {loading ? 'Updating...' : 'Update House'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ house, onClose, onSuccess }: { house: House; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase
        .from('houses')
        .delete()
        .eq('id', house.id);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete house');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-md w-full animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-red-400">Delete House</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-[#9CA3AF] mb-4">
            Are you sure you want to delete this house? This action cannot be undone.
          </p>
          <div className="p-4 rounded-xl bg-[#0F1412] border border-gray-800">
            <p className="font-medium">{house.name}</p>
            <p className="text-sm text-[#9CA3AF]">{house.country}, {house.state}</p>
            <p className="text-sm text-[#9CA3AF]">Zone: {house.zone}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white hover:bg-[#14532D] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete House'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ImportHouse {
  name: string;
  state: string;
  country: string;
  zone: string;
  email?: string;
  mobile?: string;
  errors?: string[];
}

function ImportHousesModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ImportHouse[]>([]);
  const [validData, setValidData] = useState<ImportHouse[]>([]);
  const [invalidData, setInvalidData] = useState<ImportHouse[]>([]);

  const downloadTemplate = () => {
    const templateData = [
      { 'House Name': 'Example House', 'State': 'Karnataka', 'Country': 'India', 'Zone': 'South Zone', 'Email': 'house@example.com', 'Mobile': '9876543210' }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Houses');
    XLSX.writeFile(wb, 'houses_template.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'xls' && fileExtension !== 'xlsx') {
        setError('Please upload a valid Excel file (.xls or .xlsx)');
        return;
      }
      setFile(selectedFile);
      setError('');
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const houses: ImportHouse[] = jsonData.map((row: any) => {
        const house: ImportHouse = {
          name: row['House Name'] || row['name'] || '',
          state: row['State'] || row['state'] || '',
          country: row['Country'] || row['country'] || '',
          zone: row['Zone'] || row['zone'] || '',
          email: row['Email'] || row['email'] || '',
          mobile: row['Mobile'] || row['mobile'] || '',
          errors: []
        };

        if (!house.name.trim()) {
          house.errors!.push('House name is required');
        }
        if (!house.state.trim()) {
          house.errors!.push('State is required');
        }
        if (!house.country.trim()) {
          house.errors!.push('Country is required');
        }
        if (!house.zone.trim()) {
          house.errors!.push('Zone is required');
        }
        if (house.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(house.email)) {
          house.errors!.push('Invalid email format');
        }

        return house;
      });

      const valid = houses.filter(h => !h.errors || h.errors.length === 0);
      const invalid = houses.filter(h => h.errors && h.errors.length > 0);

      setParsedData(houses);
      setValidData(valid);
      setInvalidData(invalid);
    } catch (err: any) {
      setError('Failed to parse Excel file: ' + err.message);
    }
  };

  const handleImport = async () => {
    if (validData.length === 0) {
      setError('No valid data to import');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const housesToInsert = validData.map(({ errors, ...house }) => house);
      const { error } = await supabase.from('houses').insert(housesToInsert);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to import houses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Import Houses</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0F1412] border border-gray-800">
            <div>
              <p className="font-medium mb-1">Need a template?</p>
              <p className="text-sm text-[#9CA3AF]">Download our Excel template to get started</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-[#6EE7B7] hover:bg-[#14532D] transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Upload Excel File</label>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileChange}
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#4ADE80] file:text-[#0B0F0E] hover:file:brightness-110 file:cursor-pointer"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-900/20 border border-green-800/50">
                  <p className="text-sm text-[#9CA3AF] mb-1">Valid Records</p>
                  <p className="text-2xl font-bold text-green-400">{validData.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/50">
                  <p className="text-sm text-[#9CA3AF] mb-1">Invalid Records</p>
                  <p className="text-2xl font-bold text-red-400">{invalidData.length}</p>
                </div>
              </div>

              {validData.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Preview ({validData.length} valid records)</h3>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-800">
                    <table className="w-full text-sm">
                      <thead className="bg-[#0F1412] sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Name</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">State</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Country</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Zone</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Email</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Mobile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validData.slice(0, 10).map((house, index) => (
                          <tr key={index} className="border-t border-gray-800/50">
                            <td className="py-2 px-3">{house.name}</td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{house.state}</td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{house.country}</td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{house.zone}</td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{house.email || '-'}</td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{house.mobile || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validData.length > 10 && (
                      <div className="p-2 text-center text-sm text-[#9CA3AF] bg-[#0F1412] border-t border-gray-800">
                        ... and {validData.length - 10} more records
                      </div>
                    )}
                  </div>
                </div>
              )}

              {invalidData.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-red-400">Invalid Records ({invalidData.length})</h3>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-red-800/50 bg-red-900/20">
                    <table className="w-full text-sm">
                      <thead className="bg-red-900/30 sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Name</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invalidData.map((house, index) => (
                          <tr key={index} className="border-t border-red-800/30">
                            <td className="py-2 px-3">{house.name || '(empty)'}</td>
                            <td className="py-2 px-3 text-red-400 text-xs">{house.errors?.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
              onClick={handleImport}
              disabled={loading || validData.length === 0}
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 glow-green-sm hover:glow-green"
              style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
            >
              {loading ? 'Importing...' : `Import ${validData.length} Houses`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
