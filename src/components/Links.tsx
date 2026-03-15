import { useEffect, useState } from 'react';
import { Plus, Link2 as LinkIcon, Phone, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';


interface CoreLink {
  id: string;
  from_user_id: string;
  to_user_id: string;
  title: string;
  description: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  urgency: number;
  house_id: string | null;
  status: string;
  created_at: string;
  from_user?: { full_name: string };
  to_user?: { full_name: string };
  house?: { name: string };
}

export default function Links() {
  const [links, setLinks] = useState<CoreLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('core_links')
        .select('*, house:house_id(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];

      // Collect unique auth user IDs referenced by the links
      const userIds = [...new Set(
        rows.flatMap(l => [l.from_user_id, l.to_user_id]).filter(Boolean)
      )];

      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        // profiles.auth_user_id = auth.users.id (the FK used by core_links)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, auth_user_id, full_name')
          .or(userIds.map(id => `auth_user_id.eq.${id},id.eq.${id}`).join(','));

        (profilesData || []).forEach(p => {
          if (p.auth_user_id) nameMap[p.auth_user_id] = p.full_name;
          nameMap[p.id] = p.full_name;
        });
      }

      setLinks(rows.map(link => ({
        ...link,
        from_user: { full_name: nameMap[link.from_user_id] || '—' },
        to_user: { full_name: nameMap[link.to_user_id] || '—' },
      })));
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const urgencyColor = (u: number) => {
    if (u >= 8) return '#EF4444';
    if (u >= 5) return '#F59E0B';
    return '#6EE7B7';
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Links</h1>
          <p className="text-[#9CA3AF]">Member connection ledger</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all-smooth glow-green-sm hover:glow-green hover:scale-105 active:scale-95"
          style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
        >
          <Plus className="w-5 h-5" />
          <span>Add Link</span>
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
            {links.map((link) => (
              <div
                key={link.id}
                className="bg-[#0F1412] rounded-xl p-4 border border-gray-800/50 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(110, 231, 183, 0.1)' }}>
                    <LinkIcon className="w-5 h-5" style={{ color: '#6EE7B7' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{link.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${urgencyColor(link.urgency)}20`, color: urgencyColor(link.urgency) }}
                        >
                          Urgency {link.urgency}/10
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">{link.status}</span>
                      </div>
                    </div>
                    <p className="text-[#9CA3AF] text-sm mb-2">{link.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
                      <span>From: <span className="text-gray-300">{link.from_user?.full_name || '—'}</span></span>
                      <span>To: <span className="text-gray-300">{link.to_user?.full_name || '—'}</span></span>
                      {link.contact_name && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {link.contact_name}
                        </span>
                      )}
                      {link.contact_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {link.contact_phone}
                        </span>
                      )}
                      {link.contact_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {link.contact_email}
                        </span>
                      )}
                      {link.house && <span>House: {link.house.name}</span>}
                      <span>{new Date(link.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {links.length === 0 && (
              <div className="text-center py-12 text-[#6B7280]">
                No links recorded yet
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddLinkModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchLinks();
          }}
        />
      )}
    </div>
  );
}

interface ProfileOption {
  id: string;
  auth_user_id: string | null;
  full_name: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function sendPushNotification(options: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: string;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(options),
    });
  } catch (err) {
    console.error('Push notification error:', err);
  }
}

function AddLinkModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [formData, setFormData] = useState({
    from_user_id: '',
    to_user_id: '',
    title: '',
    description: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    urgency: 5,
    status: 'open',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('profiles').select('id, auth_user_id, full_name').order('full_name')
      .then(({ data }) => setProfiles(data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('core_links')
        .insert([{
          ...formData,
          // FK core_links_from/to_user_id_fkey → auth.users.id
          // profiles.auth_user_id holds the real auth UID when profiles.id differs
          from_user_id: profiles.find(p => p.id === formData.from_user_id)?.auth_user_id || formData.from_user_id,
          to_user_id:   profiles.find(p => p.id === formData.to_user_id)?.auth_user_id   || formData.to_user_id,
        }])
        .select('id')
        .single();
      if (insertError) throw insertError;

      const linkId = inserted.id;
      const fromProfile = profiles.find(p => p.id === formData.from_user_id);
      const toProfile   = profiles.find(p => p.id === formData.to_user_id);
      const senderName   = fromProfile?.full_name || 'A member';
      const receiverName = toProfile?.full_name   || 'A member';
      // Use auth_user_id (= auth.users.id) so push_tokens lookup succeeds;
      // fall back to id for profiles where id already equals auth.users.id
      const senderAuthId   = fromProfile?.auth_user_id || formData.from_user_id;
      const receiverAuthId = toProfile?.auth_user_id   || formData.to_user_id;

      // Notify receiver
      sendPushNotification({
        userId: receiverAuthId,
        type: 'link_received',
        title: '🔗 New Business Link',
        body: `You've received a verified business link from ${senderName}.`,
        data: { linkId, senderName, senderId: senderAuthId },
        priority: 'high',
      });

      // Notify sender
      sendPushNotification({
        userId: senderAuthId,
        type: 'link_sent',
        title: '✅ Link Sent Successfully',
        body: `Your business link was successfully sent to ${receiverName}.`,
        data: { linkId, recipientName: receiverName, recipientId: receiverAuthId },
        priority: 'normal',
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 max-w-2xl w-full my-8">
        <h2 className="text-2xl font-bold mb-6">Add New Link</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">From Member</label>
              <select
                value={formData.from_user_id}
                onChange={(e) => setFormData({ ...formData, from_user_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
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
                value={formData.to_user_id}
                onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
                required
              >
                <option value="">Select member</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Contact Phone</label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Urgency (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white focus:outline-none input-glow"
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
              {loading ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
