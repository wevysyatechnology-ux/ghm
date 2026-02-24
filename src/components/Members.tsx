import { useEffect, useState } from 'react';
import { Search, User, Plus, Upload, X, Download, AlertCircle, Edit, Trash2, Mail, Phone, Building, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile, House } from '../types';
import * as XLSX from 'xlsx';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function Members() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<(Profile & { house?: House })[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<(Profile & { house?: House })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Profile & { house?: House } | null>(null);
  const [editingMember, setEditingMember] = useState<Profile & { house?: House } | null>(null);
  const [deletingMember, setDeletingMember] = useState<Profile & { house?: House } | null>(null);

  const canManageMembers = profile?.role === 'super_admin' || profile?.role === 'global_admin';

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchQuery, members]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          house:houses(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
      setFilteredMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    if (!searchQuery) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter(
      (member) =>
        member.full_name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.business?.toLowerCase().includes(query) ||
        member.industry?.toLowerCase().includes(query)
    );
    setFilteredMembers(filtered);
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-[-150px] right-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] gradient-blob-teal opacity-25" />

      <div className="flex items-center justify-between animate-slide-up relative z-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Members</h1>
          <p className="text-[#9CA3AF]">WeVysya member profiles and details</p>
        </div>
        {canManageMembers && (
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
              <span>Add Member</span>
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
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-[#0F1412] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member, index) => (
              <div
                key={member.id}
                className="bg-[#0F1412] rounded-2xl p-6 border border-gray-800/50 hover:border-[#6EE7B7]/30 transition-all duration-300 group relative overflow-hidden animate-slide-up backdrop-blur-xl"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 gradient-blob-teal opacity-0 group-hover:opacity-15 transition-all duration-500" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center ring-2 ring-[#6EE7B7]/30" style={{ backgroundColor: '#14532D' }}>
                        <User className="w-6 h-6" style={{ color: '#6EE7B7' }} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{member.full_name}</h3>
                        <p className="text-xs text-[#9CA3AF] capitalize">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {canManageMembers && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setEditingMember(member)}
                          className="p-2 rounded-lg text-[#6EE7B7] hover:bg-[#14532D] transition-all-smooth"
                          title="Edit member"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {member.role !== 'super_admin' && (
                          <button
                            onClick={() => setDeletingMember(member)}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-900/20 transition-all-smooth"
                            title="Delete member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className="space-y-2 text-sm cursor-pointer"
                    onClick={() => setSelectedMember(member)}
                  >
                    <div>
                      <span className="text-[#6B7280]">Email:</span>
                      <p className="text-[#9CA3AF] truncate">{member.email}</p>
                    </div>
                    {member.business && (
                      <div>
                        <span className="text-[#6B7280]">Business:</span>
                        <p className="text-[#9CA3AF]">{member.business}</p>
                      </div>
                    )}
                    {member.industry && (
                      <div>
                        <span className="text-[#6B7280]">Industry:</span>
                        <p className="text-[#9CA3AF]">{member.industry}</p>
                      </div>
                    )}
                    {member.house && (
                      <div>
                        <span className="text-[#6B7280]">House:</span>
                        <p className="text-[#9CA3AF]">{member.house.name}</p>
                      </div>
                    )}
                    {member.keywords && member.keywords.length > 0 && (
                      <div>
                        <span className="text-[#6B7280]">Keywords:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.keywords.slice(0, 3).map((keyword, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 rounded text-xs"
                              style={{ backgroundColor: 'rgba(110, 231, 183, 0.1)', color: '#6EE7B7' }}
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredMembers.length === 0 && !loading && (
          <div className="text-center py-12 text-[#6B7280]">
            No members found
          </div>
        )}
      </div>

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchMembers();
          }}
        />
      )}

      {showImportModal && (
        <ImportMembersModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchMembers();
          }}
        />
      )}

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onEdit={() => {
            setEditingMember(selectedMember);
            setSelectedMember(null);
          }}
          onDelete={() => {
            setDeletingMember(selectedMember);
            setSelectedMember(null);
          }}
          canManage={canManageMembers}
        />
      )}

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={() => {
            setEditingMember(null);
            fetchMembers();
          }}
        />
      )}

      {deletingMember && (
        <DeleteConfirmModal
          member={deletingMember}
          onClose={() => setDeletingMember(null)}
          onSuccess={() => {
            setDeletingMember(null);
            fetchMembers();
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [houses, setHouses] = useState<House[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'member' as Profile['role'],
    house_id: '',
    zone: '',
    business: '',
    industry: '',
    mobile: '',
    keywords: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    const { data } = await supabase.from('houses').select('*').order('name');
    setHouses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Get a fresh session for authorization
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      const session = refreshData.session;
      if (!session) throw new Error('Not authenticated');
      if (!session.access_token) throw new Error('Missing access token');
      if (!supabaseAnonKey) throw new Error('Missing Supabase anon key');

      // Call edge function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke('create-member', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: {
          email: formData.email,
          password: '147852369',
          full_name: formData.full_name,
          role: formData.role,
          house_id: formData.house_id || null,
          zone: formData.zone || null,
          business: formData.business || null,
          industry: formData.industry || null,
          mobile: formData.mobile || null,
          keywords: keywordsArray,
        },
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create member');
      }
      
      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        throw new Error(data.error);
      }
      
      if (!data?.success) {
        throw new Error('Failed to create member');
      }
      
      onSuccess();
    } catch (err: any) {
      console.error('Create member error:', err);
      setError(err.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Add New Member</h2>
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
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Full Name *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
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
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Profile['role'] })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled
              >
                <option value="member">Member</option>
                <option value="house_admin">House Admin</option>
                <option value="zone_admin">Zone Admin</option>
                <option value="global_admin">Global Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">House</label>
              <select
                value={formData.house_id}
                onChange={(e) => setFormData({ ...formData, house_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
              >
                <option value="">Select House</option>
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Zone</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Business</label>
              <input
                type="text"
                value={formData.business}
                onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Keywords (comma-separated)</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              placeholder="e.g., technology, consulting, finance"
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
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
              {loading ? 'Creating...' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditMemberModal({ member, onClose, onSuccess }: { member: Profile & { house?: House }; onClose: () => void; onSuccess: () => void }) {
  const [houses, setHouses] = useState<House[]>([]);
  const [formData, setFormData] = useState({
    email: member.email,
    full_name: member.full_name,
    role: member.role,
    house_id: member.house_id || '',
    zone: member.zone || '',
    business: member.business || '',
    industry: member.industry || '',
    mobile: member.mobile || '',
    keywords: member.keywords?.join(', ') || '',
    newPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    const { data } = await supabase.from('houses').select('*').order('name');
    setHouses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Update password if provided
      if (formData.newPassword) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No active session');

          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-user-password`;
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: member.id,
              newPassword: formData.newPassword,
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            console.warn('Password update warning:', result.error || 'Failed to update password');
            // Don't throw - allow the update to continue even if password change fails
          }
        } catch (passwordError) {
          console.warn('Password change error (non-fatal):', passwordError);
          // Continue without throwing - password change is not critical
        }
      }

      const updateData: any = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        keywords: keywordsArray,
        house_id: formData.house_id || null,
        zone: formData.zone || null,
        business: formData.business || null,
        industry: formData.industry || null,
        mobile: formData.mobile || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', member.id);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Edit Member</h2>
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
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Full Name *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
                required
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
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Profile['role'] })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              >
                <option value="member">Member</option>
                <option value="house_admin">House Admin</option>
                <option value="zone_admin">Zone Admin</option>
                <option value="global_admin">Global Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">House</label>
              <select
                value={formData.house_id}
                onChange={(e) => setFormData({ ...formData, house_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
              >
                <option value="">Select House</option>
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Zone</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Business</label>
              <input
                type="text"
                value={formData.business}
                onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Keywords (comma-separated)</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              placeholder="e.g., technology, consulting, finance"
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
            />
          </div>

          <div className="pt-4 border-t border-gray-800">
            <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Change Password (optional)</label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="Leave blank to keep current password"
              className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
            />
            <p className="text-xs text-[#6B7280] mt-2">Enter a new password only if you want to change it</p>
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
              {loading ? 'Updating...' : 'Update Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MemberDetailModal({
  member,
  onClose,
  onEdit,
  onDelete,
  canManage
}: {
  member: Profile & { house?: House };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canManage: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Member Details</h2>
          <div className="flex items-center space-x-2">
            {canManage && (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 rounded-lg text-[#6EE7B7] hover:bg-[#14532D] transition-all"
                  title="Edit member"
                >
                  <Edit className="w-5 h-5" />
                </button>
                {member.role !== 'super_admin' && (
                  <button
                    onClick={onDelete}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-900/20 transition-all"
                    title="Delete member"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-4 pb-6 border-b border-gray-800">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center ring-2 ring-[#6EE7B7]/30" style={{ backgroundColor: '#14532D' }}>
              <User className="w-10 h-10" style={{ color: '#6EE7B7' }} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{member.full_name}</h3>
              <p className="text-[#9CA3AF] capitalize">{member.role.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-[#6B7280]">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <p className="text-[#9CA3AF] pl-6">{member.email}</p>
            </div>

            {member.mobile && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[#6B7280]">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Mobile</span>
                </div>
                <p className="text-[#9CA3AF] pl-6">{member.mobile}</p>
              </div>
            )}

            {member.business && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[#6B7280]">
                  <Building className="w-4 h-4" />
                  <span className="text-sm font-medium">Business</span>
                </div>
                <p className="text-[#9CA3AF] pl-6">{member.business}</p>
              </div>
            )}

            {member.industry && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[#6B7280]">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-medium">Industry</span>
                </div>
                <p className="text-[#9CA3AF] pl-6">{member.industry}</p>
              </div>
            )}

            {member.zone && (
              <div className="space-y-2">
                <div className="text-[#6B7280] text-sm font-medium">Zone</div>
                <p className="text-[#9CA3AF]">{member.zone}</p>
              </div>
            )}

            {member.house && (
              <div className="space-y-2">
                <div className="text-[#6B7280] text-sm font-medium">House</div>
                <p className="text-[#9CA3AF]">{member.house.name}</p>
              </div>
            )}
          </div>

          {member.keywords && member.keywords.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-800">
              <div className="text-[#6B7280] text-sm font-medium">Keywords</div>
              <div className="flex flex-wrap gap-2">
                {member.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(110, 231, 183, 0.1)', color: '#6EE7B7' }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-800 text-sm text-[#6B7280]">
            Member since {new Date(member.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ member, onClose, onSuccess }: { member: Profile & { house?: House }; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSuperAdmin = member.role === 'super_admin';

  const handleDelete = async () => {
    if (isSuperAdmin) {
      setError('Cannot delete Super Admin members');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-member`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId: member.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete member');

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-md w-full animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-red-400">Delete Member</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          {isSuperAdmin ? (
            <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-800/50 text-yellow-400 text-sm flex items-start space-x-2 mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Cannot Delete Super Admin</p>
                <p className="text-yellow-300/80">Super Admin members cannot be deleted from the system for security reasons.</p>
              </div>
            </div>
          ) : (
            <p className="text-[#9CA3AF] mb-4">
              Are you sure you want to delete this member? This action cannot be undone.
            </p>
          )}
          <div className="p-4 rounded-xl bg-[#0F1412] border border-gray-800">
            <p className="font-medium">{member.full_name}</p>
            <p className="text-sm text-[#9CA3AF]">{member.email}</p>
            <p className="text-sm text-[#9CA3AF] capitalize">{member.role.replace('_', ' ')}</p>
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
            {isSuperAdmin ? 'Close' : 'Cancel'}
          </button>
          {!isSuperAdmin && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete Member'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ImportMember {
  email: string;
  full_name: string;
  role: string;
  house_id?: string;
  zone?: string;
  business?: string;
  industry?: string;
  mobile?: string;
  keywords?: string[];
  errors?: string[];
}

function ImportMembersModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ImportMember[]>([]);
  const [validData, setValidData] = useState<ImportMember[]>([]);
  const [invalidData, setInvalidData] = useState<ImportMember[]>([]);
  const [houses, setHouses] = useState<House[]>([]);

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    const { data } = await supabase.from('houses').select('*');
    setHouses(data || []);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Full Name': 'John Doe',
        'Email': 'john@example.com',
        'Mobile': '9876543210',
        'Role': 'member',
        'House': 'Example House',
        'Zone': 'South Zone',
        'Business': 'Technology Solutions',
        'Industry': 'IT',
        'Keywords': 'technology, consulting, cloud'
      },
      {
        'Full Name': 'Jane Smith',
        'Email': 'jane@example.com',
        'Mobile': '9876543211',
        'Role': '',
        'House': 'Another House',
        'Zone': 'North Zone',
        'Business': 'Consulting Services',
        'Industry': 'Business',
        'Keywords': 'consulting, management'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, 'members_template.xlsx');
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

      const members: ImportMember[] = jsonData.map((row: any) => {
        const houseName = row['House'] || row['house'] || '';
        const house = houses.find(h => h.name.toLowerCase() === houseName.toLowerCase());

        const keywordsStr = row['Keywords'] || row['keywords'] || '';
        const keywordsArray = keywordsStr ? keywordsStr.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0) : [];

        const roleValue = row['Role'] || row['role'] || '';
        const normalizedRole = roleValue.trim() ? roleValue.toLowerCase() : 'member';

        const member: ImportMember = {
          full_name: row['Full Name'] || row['full_name'] || '',
          email: row['Email'] || row['email'] || '',
          mobile: row['Mobile'] || row['mobile'] || '',
          role: normalizedRole,
          house_id: house?.id,
          zone: row['Zone'] || row['zone'] || '',
          business: row['Business'] || row['business'] || '',
          industry: row['Industry'] || row['industry'] || '',
          keywords: keywordsArray,
          errors: []
        };

        if (!member.full_name.trim()) {
          member.errors!.push('Full name is required');
        }
        if (!member.email.trim()) {
          member.errors!.push('Email is required');
        }
        if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
          member.errors!.push('Invalid email format');
        }
        if (!['member', 'house_admin', 'zone_admin', 'global_admin', 'super_admin'].includes(member.role)) {
          member.errors!.push('Invalid role');
        }

        return member;
      });

      const valid = members.filter(m => !m.errors || m.errors.length === 0);
      const invalid = members.filter(m => m.errors && m.errors.length > 0);

      setParsedData(members);
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
      // Get a fresh session for authorization
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      const session = refreshData.session;
      if (!session) throw new Error('Not authenticated');
      if (!session.access_token) throw new Error('Missing access token');
      if (!supabaseAnonKey) throw new Error('Missing Supabase anon key');

      // Create auth users using edge function
      let successCount = 0;
      let failCount = 0;

      for (const member of validData) {
        try {
          const { errors, ...memberData } = member;
          
          const { data, error } = await supabase.functions.invoke('create-member', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: supabaseAnonKey,
            },
            body: {
              email: memberData.email,
              password: '147852369',
              full_name: memberData.full_name,
              role: memberData.role || 'member',
              house_id: memberData.house_id || null,
              zone: memberData.zone || null,
              business: memberData.business || null,
              industry: memberData.industry || null,
              mobile: memberData.mobile || null,
              keywords: memberData.keywords || [],
            },
          });

          if (error || !data?.success) {
            console.error(`Failed to create member ${memberData.email}:`, error || data?.error);
            failCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to create member ${member.email}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        onSuccess();
      } else {
        throw new Error(`Failed to import members. ${failCount} failed.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import members');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Import Members</h2>
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
              <p className="text-xs text-[#6B7280] mt-1">Note: If Role column is empty, it will default to "member"</p>
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
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Email</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Role</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Business</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validData.slice(0, 10).map((member, index) => (
                          <tr key={index} className="border-t border-gray-800/50">
                            <td className="py-2 px-3">{member.full_name}</td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{member.email}</td>
                            <td className="py-2 px-3 text-[#9CA3AF] capitalize">{member.role.replace('_', ' ')}</td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{member.business || '-'}</td>
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
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Email</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invalidData.map((member, index) => (
                          <tr key={index} className="border-t border-red-800/30">
                            <td className="py-2 px-3">{member.full_name || '(empty)'}</td>
                            <td className="py-2 px-3">{member.email || '(empty)'}</td>
                            <td className="py-2 px-3 text-red-400 text-xs">{member.errors?.join(', ')}</td>
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
              {loading ? 'Importing...' : `Import ${validData.length} Members`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
