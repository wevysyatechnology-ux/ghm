import { useEffect, useState } from 'react';
import { Search, User, Plus, Upload, X, Download, AlertCircle, CreditCard as Edit, Trash2, Mail, Phone, Building, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile, House } from '../types';
import * as XLSX from 'xlsx';

const MEMBERSHIP_STATUSES = ['active', 'inactive', 'resigned', 'expired', 'terminated'] as const;

function membershipStatusStyle(status: string) {
  switch (status) {
    case 'active':
      return { backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#4ADE80' };
    case 'inactive':
      return { backgroundColor: 'rgba(251, 146, 60, 0.15)', color: '#FB923C' };
    case 'resigned':
      return { backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#FBBF24' };
    case 'expired':
      return { backgroundColor: 'rgba(107, 114, 128, 0.2)', color: '#9CA3AF' };
    case 'terminated':
      return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' };
    default:
      return { backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#4ADE80' };
  }
}

const PAGE_SIZE = 9;

export default function Members({ readOnly = false }: { readOnly?: boolean }) {
  const { profile } = useAuth();
  const [members, setMembers] = useState<(Profile & { house?: House })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Profile & { house?: House } | null>(null);
  const [editingMember, setEditingMember] = useState<Profile & { house?: House } | null>(null);
  const [deletingMember, setDeletingMember] = useState<Profile & { house?: House } | null>(null);

  const canManageMembers = !readOnly && (profile?.role === 'super_admin' || profile?.role === 'global_admin');
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  useEffect(() => {
    fetchMembers(searchQuery, currentPage);
  }, [searchQuery, currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setSearchQuery(searchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchMembers = async (query: string, page: number) => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const trimmed = query.trim();

      let idsQuery = supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .order('full_name', { ascending: true });

      if (trimmed) {
        const safe = `%${trimmed}%`;
        idsQuery = idsQuery.or(`full_name.ilike.${safe},email.ilike.${safe}`);
      }

      const { data: idsData, error: idsError, count } = await idsQuery;
      if (idsError) throw idsError;

      const pageIds = (idsData || []).slice(from, to + 1).map((r: { id: string }) => r.id);

      let members: typeof idsData = [];
      if (pageIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, house:houses(*)')
          .in('id', pageIds)
          .order('full_name', { ascending: true });
        if (error) throw error;
        members = data || [];
      }

      setMembers(members as never[]);
      setTotalCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
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
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
            />
          </div>
          {totalCount > 0 && (
            <span className="text-sm text-[#6B7280] whitespace-nowrap">
              {totalCount} member{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(PAGE_SIZE)].map((_, i) => (
              <div key={i} className="h-48 bg-[#0F1412] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member, index) => (
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
                        <span
                          className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={membershipStatusStyle(member.membership_status || 'active')}
                        >
                          {member.membership_status || 'active'}
                        </span>
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

        {members.length === 0 && !loading && (
          <div className="text-center py-12 text-[#6B7280]">
            {searchQuery ? `No members found matching "${searchQuery}"` : 'No members found'}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800/50">
            <span className="text-sm text-[#6B7280]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-800 text-[#9CA3AF] hover:text-white hover:border-[#6EE7B7]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-800 text-[#9CA3AF] hover:text-white hover:border-[#6EE7B7]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ‹ Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-[#6B7280]">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className="px-3 py-1.5 rounded-lg text-sm border transition-all"
                      style={currentPage === p
                        ? { backgroundColor: '#4ADE80', color: '#0B0F0E', borderColor: '#4ADE80' }
                        : { borderColor: 'rgb(31,41,35)', color: '#9CA3AF' }
                      }
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-800 text-[#9CA3AF] hover:text-white hover:border-[#6EE7B7]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-800 text-[#9CA3AF] hover:text-white hover:border-[#6EE7B7]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchMembers(searchQuery, currentPage);
          }}
        />
      )}

      {showImportModal && (
        <ImportMembersModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchMembers(searchQuery, 1);
            setCurrentPage(1);
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
            fetchMembers(searchQuery, currentPage);
          }}
        />
      )}

      {deletingMember && (
        <DeleteConfirmModal
          member={deletingMember}
          onClose={() => setDeletingMember(null)}
          onSuccess={() => {
            setDeletingMember(null);
            fetchMembers(searchQuery, currentPage);
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
    membership_status: 'active' as 'active' | 'inactive' | 'resigned' | 'expired' | 'terminated',
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

      // Ensure caller is authenticated; Supabase client will attach session auth for function invoke.
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Session expired or invalid. Please sign out and sign in again.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing session token. Please sign out and sign in again.');
      }

      // Call edge function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke('create-member', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          email: formData.email,
          password: '147852369',
          full_name: formData.full_name,
          role: formData.role,
          membership_status: formData.membership_status,
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
      const message = String(err?.message || 'Failed to create member');
      if (message.toLowerCase().includes('invalid jwt') || message.toLowerCase().includes('session')) {
        setError('Your login session is invalid or expired. Please sign out, sign in again, and retry.');
      } else {
        setError(message);
      }
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
                <option value="collaborator">Collaborator</option>
                <option value="house_admin">House Admin</option>
                <option value="zone_admin">Zone Admin</option>
                <option value="global_admin">Global Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Membership Status *</label>
              <select
                value={formData.membership_status}
                onChange={(e) => setFormData({ ...formData, membership_status: e.target.value as typeof formData.membership_status })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
              >
                {MEMBERSHIP_STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
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
    membership_status: (member.membership_status || 'active') as 'active' | 'inactive' | 'resigned' | 'expired' | 'terminated',
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
          throw new Error(result.error || 'Failed to update password');
        }
      }

      const updateData: any = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        membership_status: formData.membership_status,
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

      const isActive = formData.membership_status === 'active';
      const { error: upError } = await supabase
        .from('users_profile')
        .update({
          membership_status: formData.membership_status,
          is_suspended: !isActive,
        })
        .eq('id', member.id);
      if (upError) console.warn('users_profile update warning:', upError.message);

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
                <option value="collaborator">Collaborator</option>
                <option value="house_admin">House Admin</option>
                <option value="zone_admin">Zone Admin</option>
                <option value="global_admin">Global Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Membership Status *</label>
              <select
                value={formData.membership_status}
                onChange={(e) => setFormData({ ...formData, membership_status: e.target.value as typeof formData.membership_status })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
              >
                {MEMBERSHIP_STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
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
              <span
                className="inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium capitalize"
                style={membershipStatusStyle(member.membership_status || 'active')}
              >
                {member.membership_status || 'active'}
              </span>
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
  membership_status: string;
  house_id?: string;
  zone?: string;
  business?: string;
  industry?: string;
  mobile?: string;
  keywords?: string[];
  errors?: string[];
  isDuplicate?: boolean;
}

interface ImportResultRow {
  email: string;
  full_name: string;
  status: 'created' | 'already_exists' | 'failed';
  message: string;
}

function ImportMembersModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ImportMember[]>([]);
  const [validData, setValidData] = useState<ImportMember[]>([]);
  const [invalidData, setInvalidData] = useState<ImportMember[]>([]);
  const [duplicateData, setDuplicateData] = useState<ImportMember[]>([]);
  const [importResults, setImportResults] = useState<ImportResultRow[]>([]);
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
        'Keywords': 'technology, consulting, cloud',
        'Membership Status': 'active'
      },
      {
        'Full Name': 'Jane Smith',
        'Email': 'jane@example.com',
        'Mobile': '9876543211',
        'Role': 'member',
        'House': 'Another House',
        'Zone': 'North Zone',
        'Business': 'Consulting Services',
        'Industry': 'Business',
        'Keywords': 'consulting, management',
        'Membership Status': 'active'
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
      { wch: 30 },
      { wch: 20 }
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
      setImportResults([]);
      setParsedData([]);
      setValidData([]);
      setInvalidData([]);
      setDuplicateData([]);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    setChecking(true);
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

        const rawStatus = (row['Membership Status'] || row['membership_status'] || row['Membership_Status'] || 'active').toString().toLowerCase().trim();
        const statusAliasMap: Record<string, string> = {
          active: 'active',
          inactive: 'inactive',
          resigned: 'resigned',
          expired: 'expired',
          terminated: 'terminated',
          suspended: 'inactive',
          left: 'resigned',
        };
        const normalizedStatus = statusAliasMap[rawStatus] ?? 'active';

        const member: ImportMember = {
          full_name: row['Full Name'] || row['full_name'] || '',
          email: (row['Email'] || row['email'] || '').toString().trim().toLowerCase(),
          mobile: row['Mobile'] || row['mobile'] || '',
          role: normalizedRole,
          membership_status: normalizedStatus,
          house_id: house?.id,
          zone: row['Zone'] || row['zone'] || '',
          business: row['Business'] || row['business'] || '',
          industry: row['Industry'] || row['industry'] || '',
          keywords: keywordsArray,
          errors: [],
          isDuplicate: false,
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
        if (member.role !== 'member') {
          member.errors!.push('Only member role is allowed for bulk import');
        }

        return member;
      });

      const formatValid = members.filter(m => !m.errors || m.errors.length === 0);
      const invalid = members.filter(m => m.errors && m.errors.length > 0);

      const seenInFile = new Map<string, number>();
      formatValid.forEach((m, i) => {
        const key = m.email.toLowerCase();
        if (seenInFile.has(key)) {
          m.isDuplicate = true;
          const firstIdx = seenInFile.get(key)!;
          formatValid[firstIdx].isDuplicate = true;
        } else {
          seenInFile.set(key, i);
        }
      });

      const uniqueCandidates = formatValid.filter(m => !m.isDuplicate);
      const intraFileDuplicates = formatValid.filter(m => m.isDuplicate);

      let dbDuplicates: ImportMember[] = [];
      let finalValid = uniqueCandidates;

      if (uniqueCandidates.length > 0) {
        const emailsToCheck = uniqueCandidates.map(m => m.email);

        const { data: authEmails } = await supabase.rpc('check_emails_in_auth', {
          emails: emailsToCheck,
        });

        const existingEmails = new Set<string>((authEmails as string[] || []).map(e => e.toLowerCase()));

        dbDuplicates = uniqueCandidates.filter(m => existingEmails.has(m.email.toLowerCase()));
        finalValid = uniqueCandidates.filter(m => !existingEmails.has(m.email.toLowerCase()));
      }

      const allDuplicates = [
        ...intraFileDuplicates.map(m => ({ ...m, errors: ['Duplicate email within file'] })),
        ...dbDuplicates.map(m => ({ ...m, errors: ['Email already exists in database'] })),
      ];

      setParsedData(members);
      setValidData(finalValid);
      setInvalidData(invalid);
      setDuplicateData(allDuplicates);
    } catch (err: any) {
      setError('Failed to parse Excel file: ' + err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleImport = async () => {
    if (validData.length === 0) {
      setError('No valid data to import');
      return;
    }

    setLoading(true);
    setError('');
    setImportResults([]);

    try {
      // Ensure caller is authenticated; Supabase client will attach session auth for function invoke.
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Session expired or invalid. Please sign out and sign in again.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing session token. Please sign out and sign in again.');
      }

      // Create auth users using edge function and track per-row results
      const results: ImportResultRow[] = [];

      for (const member of validData) {
        try {
          const { errors, ...memberData } = member;
          
          const { data, error } = await supabase.functions.invoke('create-member', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: {
              email: memberData.email,
              password: '147852369',
              full_name: memberData.full_name,
              role: 'member',
              membership_status: memberData.membership_status || 'active',
              house_id: memberData.house_id || null,
              zone: memberData.zone || null,
              business: memberData.business || null,
              industry: memberData.industry || null,
              mobile: memberData.mobile || null,
              keywords: memberData.keywords || [],
            },
          });

          if (error || !data?.success) {
            let rawErrorMessage = data?.error || (error as any)?.message || 'Failed to create member';
            const contextResponse = (error as any)?.context;
            if (contextResponse && typeof contextResponse.json === 'function') {
              try {
                const payload = await contextResponse.json();
                rawErrorMessage = payload?.error || payload?.message || rawErrorMessage;
              } catch {
                // ignore parse failure and keep fallback error
              }
            }

            const normalized = String(rawErrorMessage).toLowerCase();
            const alreadyExists =
              normalized.includes('already registered') ||
              normalized.includes('already exists') ||
              normalized.includes('duplicate') ||
              normalized.includes('unique');

            const finalMessage =
              normalized.includes('invalid jwt') || normalized.includes('jwt')
                ? 'Invalid/expired login session. Please sign out and sign in again, then retry import.'
                : String(rawErrorMessage);

            console.error(`Failed to create member ${memberData.email}:`, error || data?.error);
            results.push({
              email: memberData.email,
              full_name: memberData.full_name,
              status: alreadyExists ? 'already_exists' : 'failed',
              message: finalMessage,
            });
          } else {
            results.push({
              email: memberData.email,
              full_name: memberData.full_name,
              status: 'created',
              message: 'User created and activated successfully',
            });
          }
        } catch (err: any) {
          console.error(`Failed to create member ${member.email}:`, err);
          results.push({
            email: member.email,
            full_name: member.full_name,
            status: 'failed',
            message: err?.message || 'Unexpected error',
          });
        }
      }

      setImportResults(results);

      const createdCount = results.filter((r) => r.status === 'created').length;
      if (createdCount > 0) {
        onSuccess();
      } else {
        setError('No members were created. Please review the summary below.');
      }
    } catch (err: any) {
      const message = String(err?.message || 'Failed to import members');
      if (message.toLowerCase().includes('invalid jwt') || message.toLowerCase().includes('refresh')) {
        setError('Your login session is invalid or expired. Please sign out, sign in again, and retry import.');
      } else {
        setError(message);
      }
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
              <p className="text-xs text-[#6B7280] mt-1">Note: Only "member" role is allowed for bulk import (mobile app users)</p>
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

          {checking && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0F1412] border border-gray-800 text-[#9CA3AF] text-sm">
              <div className="w-4 h-4 border-2 border-[#6EE7B7]/40 border-t-[#6EE7B7] rounded-full animate-spin shrink-0" />
              Checking for duplicates against existing members...
            </div>
          )}

          {!checking && parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-green-900/20 border border-green-800/50">
                  <p className="text-sm text-[#9CA3AF] mb-1">Valid Records</p>
                  <p className="text-2xl font-bold text-green-400">{validData.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-800/50">
                  <p className="text-sm text-[#9CA3AF] mb-1">Duplicates</p>
                  <p className="text-2xl font-bold text-yellow-400">{duplicateData.length}</p>
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

              {duplicateData.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-yellow-400">Duplicate Records ({duplicateData.length}) — will be skipped</h3>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-yellow-800/50 bg-yellow-900/10">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-900/20 sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Name</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Email</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicateData.map((member, index) => (
                          <tr key={index} className="border-t border-yellow-800/30">
                            <td className="py-2 px-3">{member.full_name || '(empty)'}</td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{member.email || '(empty)'}</td>
                            <td className="py-2 px-3 text-yellow-400 text-xs">{member.errors?.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

              {importResults.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Import Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-green-900/20 border border-green-800/50">
                      <p className="text-xs text-[#9CA3AF]">Created</p>
                      <p className="text-xl font-bold text-green-400">{importResults.filter((r) => r.status === 'created').length}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-yellow-900/20 border border-yellow-800/50">
                      <p className="text-xs text-[#9CA3AF]">Already Exists</p>
                      <p className="text-xl font-bold text-yellow-300">{importResults.filter((r) => r.status === 'already_exists').length}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50">
                      <p className="text-xs text-[#9CA3AF]">Failed</p>
                      <p className="text-xl font-bold text-red-400">{importResults.filter((r) => r.status === 'failed').length}</p>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-800">
                    <table className="w-full text-sm">
                      <thead className="bg-[#0F1412] sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Name</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Email</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Status</th>
                          <th className="text-left py-2 px-3 text-[#9CA3AF]">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.map((row, index) => (
                          <tr key={`${row.email}-${index}`} className="border-t border-gray-800/50">
                            <td className="py-2 px-3">{row.full_name || '(empty)'}</td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{row.email || '(empty)'}</td>
                            <td className="py-2 px-3">
                              <span
                                className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor:
                                    row.status === 'created'
                                      ? 'rgba(74, 222, 128, 0.15)'
                                      : row.status === 'already_exists'
                                        ? 'rgba(251, 191, 36, 0.15)'
                                        : 'rgba(239, 68, 68, 0.15)',
                                  color:
                                    row.status === 'created'
                                      ? '#4ADE80'
                                      : row.status === 'already_exists'
                                        ? '#FBBF24'
                                        : '#EF4444',
                                }}
                              >
                                {row.status === 'created'
                                  ? 'Created'
                                  : row.status === 'already_exists'
                                    ? 'Already Exists'
                                    : 'Failed'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[#9CA3AF]">{row.message}</td>
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
              disabled={loading || checking || validData.length === 0}
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 glow-green-sm hover:glow-green"
              style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
            >
              {loading ? 'Importing...' : checking ? 'Checking...' : `Import ${validData.length} Members`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
