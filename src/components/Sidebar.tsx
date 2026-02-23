import { Home, Building2, Users, Link2, DollarSign, TrendingUp, ClipboardList, BarChart3, UserCog, LogOut, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { signOut, profile } = useAuth();

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'global_admin';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'houses', label: 'Houses', icon: Building2 },
    { id: 'members', label: 'Members', icon: Users },
    ...(isSuperAdmin ? [{ id: 'pending', label: 'Pending Approvals', icon: UserCheck }] : []),
    { id: 'users', label: 'Users', icon: UserCog },
    { id: 'links', label: 'Links', icon: Link2 },
    { id: 'deals', label: 'Deals', icon: DollarSign },
    { id: 'i2we', label: 'I2WE', icon: TrendingUp },
    { id: 'attendance', label: 'Attendance', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="w-64 h-screen bg-glass border-r border-gray-800/50 flex flex-col">
      <div className="p-6 border-b border-gray-800/50">
        <div>
          <h1 className="text-lg font-bold">WeVysya</h1>
          <p className="text-xs text-[#9CA3AF]">Global House Management</p>
        </div>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all-smooth ${
                isActive
                  ? 'bg-[#14532D] text-[#6EE7B7]'
                  : 'text-[#9CA3AF] hover:bg-[#0F1412] hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-800/50">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium truncate">{profile?.full_name}</p>
          <p className="text-xs text-[#9CA3AF] capitalize">{profile?.role?.replace('_', ' ')}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-[#9CA3AF] hover:bg-red-900/20 hover:text-red-400 transition-all-smooth"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
