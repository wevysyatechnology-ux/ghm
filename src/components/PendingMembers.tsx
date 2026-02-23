import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types';
import { User, CheckCircle, XCircle, Mail, Phone, Building, Tag, AlertCircle } from 'lucide-react';

export default function PendingMembers() {
  const { profile } = useAuth();
  const [pendingMembers, setPendingMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'global_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPendingMembers();
    }
  }, [isSuperAdmin]);

  const fetchPendingMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingMembers(data || []);
    } catch (error) {
      console.error('Error fetching pending members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (memberId: string, status: 'approved' | 'rejected') => {
    setActionLoading(true);
    setError('');

    try {
      const { error } = await supabase.rpc('approve_member', {
        member_id: memberId,
        new_status: status,
      });

      if (error) throw error;

      await fetchPendingMembers();
      setSelectedMember(null);
    } catch (err: any) {
      setError(err.message || `Failed to ${status === 'approved' ? 'approve' : 'reject'} member`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <div className="bg-card rounded-2xl p-8 border border-gray-800/50 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <p className="text-[#9CA3AF]">Only super admins can access pending member approvals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-[-150px] right-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] gradient-blob-teal opacity-25" />

      <div className="flex items-center justify-between animate-slide-up relative z-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pending Member Approvals</h1>
          <p className="text-[#9CA3AF]">Review and approve member registrations</p>
        </div>
        <div className="px-6 py-3 rounded-xl bg-yellow-900/20 border border-yellow-800/50">
          <p className="text-yellow-400 font-semibold">{pendingMembers.length} Pending</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-gray-800/50 relative z-10 backdrop-blur-xl">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-[#0F1412] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : pendingMembers.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-[#6EE7B7] mx-auto mb-4" />
            <p className="text-[#9CA3AF] text-lg">No pending member approvals</p>
            <p className="text-[#6B7280] text-sm mt-2">All member registrations have been reviewed</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingMembers.map((member, index) => (
              <div
                key={member.id}
                className="bg-[#0F1412] rounded-2xl p-6 border border-gray-800/50 hover:border-yellow-400/30 transition-all duration-300 group relative overflow-hidden animate-slide-up backdrop-blur-xl cursor-pointer"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setSelectedMember(member)}
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 gradient-blob-teal opacity-0 group-hover:opacity-15 transition-all duration-500" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center ring-2 ring-yellow-400/30" style={{ backgroundColor: '#78350F' }}>
                        <User className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{member.full_name}</h3>
                        <p className="text-xs text-yellow-400">Pending Approval</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-[#6B7280]">Email:</span>
                      <p className="text-[#9CA3AF] truncate">{member.email}</p>
                    </div>
                    {member.mobile && (
                      <div>
                        <span className="text-[#6B7280]">Mobile:</span>
                        <p className="text-[#9CA3AF]">{member.mobile}</p>
                      </div>
                    )}
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
                    <div>
                      <span className="text-[#6B7280]">Registered:</span>
                      <p className="text-[#9CA3AF]">
                        {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-800 flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproval(member.id, 'approved');
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-3 py-2 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-1 text-sm"
                    >
                      <CheckCircle size={16} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproval(member.id, 'rejected');
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-3 py-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-1 text-sm"
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onApprove={() => handleApproval(selectedMember.id, 'approved')}
          onReject={() => handleApproval(selectedMember.id, 'rejected')}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

function MemberDetailModal({
  member,
  onClose,
  onApprove,
  onReject,
  loading,
}: {
  member: Profile;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Review Member Registration</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#0F1412] transition-all"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-4 pb-6 border-b border-gray-800">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center ring-2 ring-yellow-400/30" style={{ backgroundColor: '#78350F' }}>
              <User className="w-10 h-10 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{member.full_name}</h3>
              <p className="text-yellow-400">Pending Approval</p>
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
          </div>

          <div className="pt-4 border-t border-gray-800 text-sm text-[#6B7280]">
            Registered on{' '}
            {new Date(member.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              onClick={onReject}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <XCircle size={20} />
              <span>{loading ? 'Rejecting...' : 'Reject'}</span>
            </button>
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl font-medium bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <CheckCircle size={20} />
              <span>{loading ? 'Approving...' : 'Approve'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
