import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, UserCog, Mail, Phone, Building2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile, House, UserRole } from '../types';

export default function Users() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'member' as UserRole,
    house_id: '',
    zone: '',
    business: '',
    industry: '',
    mobile: '',
    password: '',
  });

  const canAdd = profile?.role === 'super_admin' || profile?.role === 'house_admin';
  const canEdit = profile?.role === 'super_admin';
  const canDelete = profile?.role === 'super_admin';

  useEffect(() => {
    fetchUsers();
    fetchHouses();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHouses = async () => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .order('name');

      if (error) throw error;
      setHouses(data || []);
    } catch (error) {
      console.error('Error fetching houses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      await handleUpdate();
    } else {
      await handleCreate();
    }
  };

  const handleCreate = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            house_id: formData.house_id || null,
            zone: formData.zone || null,
            business: formData.business || null,
            industry: formData.industry || null,
            mobile: formData.mobile || null,
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
      }

      await fetchUsers();
      resetForm();
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.message || 'Failed to create user');
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          house_id: formData.house_id || null,
          zone: formData.zone || null,
          business: formData.business || null,
          industry: formData.industry || null,
          mobile: formData.mobile || null,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      await fetchUsers();
      resetForm();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'Failed to update user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Failed to delete user. This requires admin privileges.');
    }
  };

  const openEditForm = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      house_id: user.house_id || '',
      zone: user.zone || '',
      business: user.business || '',
      industry: user.industry || '',
      mobile: user.mobile || '',
      password: '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role: 'member',
      house_id: '',
      zone: '',
      business: '',
      industry: '',
      mobile: '',
      password: '',
    });
    setEditingUser(null);
    setShowForm(false);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'global_admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'zone_admin':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'house_admin':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    return role.replace('_', ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <UserCog className="w-8 h-8 text-[#6EE7B7]" />
            User Management
          </h1>
          <p className="text-[#9CA3AF] mt-2">Manage system users and their roles</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#14532D] hover:bg-[#166534] text-[#6EE7B7] rounded-xl transition-all-smooth"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-8 max-w-2xl w-full border border-gray-800/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-800 rounded-lg transition-all-smooth"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F1412] border border-gray-800 rounded-lg focus:border-[#6EE7B7] focus:outline-none"
                    required
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F1412] border border-gray-800 rounded-lg focus:border-[#6EE7B7] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-2">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F1412] border border-gray-800 rounded-lg focus:border-[#6EE7B7] focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2 bg-[#0F1412] border border-gray-800 rounded-lg focus:border-[#6EE7B7] focus:outline-none"
                    required
                    disabled={!canEdit}
                  >
                    <option value="member">Member</option>
                    <option value="house_admin">House Admin</option>
                    <option value="zone_admin">Zone Admin</option>
                    <option value="global_admin">Global Admin</option>
                    {profile?.role === 'super_admin' && (
                      <option value="super_admin">Super Admin</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">House</label>
                  <select
                    value={formData.house_id}
                    onChange={(e) => setFormData({ ...formData, house_id: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F1412] border border-gray-800 rounded-lg focus:border-[#6EE7B7] focus:outline-none"
                  >
                    <option value="">No House</option>
                    {houses.map((house) => (
                      <option key={house.id} value={house.id}>
                        {house.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Zone</label>
                  <input
                    type="text"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F1412] border border-gray-800 rounded-lg focus:border-[#6EE7B7] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mobile</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F1412] border border-gray-800 rounded-lg focus:border-[#6EE7B7] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Business</label>
                  <input
                    type="text"
                    value={formData.business}
                    onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F1412] border border-gray-800 rounded-lg focus:border-[#6EE7B7] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F1412] border border-gray-800 rounded-lg focus:border-[#6EE7B7] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[#14532D] hover:bg-[#166534] text-[#6EE7B7] rounded-xl transition-all-smooth font-medium"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all-smooth"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl p-6 border border-gray-800/50 animate-pulse">
              <div className="h-20 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-gray-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0F1412] border-b border-gray-800">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-[#9CA3AF]">User</th>
                  <th className="text-left px-6 py-4 font-medium text-[#9CA3AF]">Role</th>
                  <th className="text-left px-6 py-4 font-medium text-[#9CA3AF]">Contact</th>
                  <th className="text-left px-6 py-4 font-medium text-[#9CA3AF]">House</th>
                  <th className="text-left px-6 py-4 font-medium text-[#9CA3AF]">Zone</th>
                  {(canEdit || canDelete) && (
                    <th className="text-right px-6 py-4 font-medium text-[#9CA3AF]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => {
                  const userHouse = houses.find((h) => h.id === user.house_id);
                  return (
                    <tr key={user.id} className="hover:bg-[#0F1412] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-[#9CA3AF] flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.mobile && (
                          <div className="text-sm text-[#9CA3AF] flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.mobile}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {userHouse && (
                          <div className="text-sm flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-[#9CA3AF]" />
                            {userHouse.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.zone && (
                          <div className="text-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                            {user.zone}
                          </div>
                        )}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {canEdit && (
                              <button
                                onClick={() => openEditForm(user)}
                                className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all-smooth"
                                title="Edit user"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && user.id !== profile?.id && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all-smooth"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12 text-[#9CA3AF]">
              <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
