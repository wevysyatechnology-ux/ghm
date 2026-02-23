import { useEffect, useState } from 'react';
import { Building2, Users, Link2, DollarSign, TrendingUp, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardStats } from '../types';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    houses: 0,
    members: 0,
    links: 0,
    deals: 0,
    i2we: 0,
    attendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [housesRes, membersRes, linksRes, dealsRes, i2weRes, attendanceRes] = await Promise.all([
        supabase.from('houses').select('id', { count: 'exact', head: true }),
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('links').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id', { count: 'exact', head: true }),
        supabase.from('i2we_events').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        houses: housesRes.count || 0,
        members: membersRes.count || 0,
        links: linksRes.count || 0,
        deals: dealsRes.count || 0,
        i2we: i2weRes.count || 0,
        attendance: attendanceRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    { label: 'Houses', value: stats.houses, icon: Building2, color: '#6EE7B7' },
    { label: 'Members', value: stats.members, icon: Users, color: '#4ADE80' },
    { label: 'Links', value: stats.links, icon: Link2, color: '#6EE7B7' },
    { label: 'Deals', value: stats.deals, icon: DollarSign, color: '#4ADE80' },
    { label: 'I2WE', value: stats.i2we, icon: TrendingUp, color: '#6EE7B7' },
    { label: 'Attendance', value: stats.attendance, icon: ClipboardList, color: '#4ADE80' },
  ];

  return (
    <div className="p-8 space-y-8 relative overflow-hidden">
      <div className="absolute top-[-200px] right-[-200px] w-[900px] h-[900px] gradient-blob-teal opacity-30" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[700px] h-[700px] gradient-blob-green opacity-20" />
      <div className="absolute top-40 left-20 w-[600px] h-[250px] gradient-pill opacity-25" />

      <div className="relative z-10 animate-fade-in flex items-center justify-between">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2 animate-slide-up">Hello,</h1>
          <h2 className="text-5xl font-bold mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {profile?.full_name?.split(' ')[0] || 'Member'}
          </h2>
          <p className="text-xl text-[#9CA3AF] italic animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Stop Thinking 'I', Start Thinking "WE"
          </p>
        </div>
        <div className="hidden md:flex items-center justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="relative w-48 h-48 group">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6EE7B7]/20 to-[#4ADE80]/20 blur-2xl animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative w-full h-full rounded-full border-2 border-[#6EE7B7]/30 flex items-center justify-center backdrop-blur-sm transition-all duration-500 group-hover:border-[#6EE7B7]/50 group-hover:scale-105">
              <img
                src="/Media/wevysyalogo.png"
                alt="WeVysya Logo"
                className="w-32 h-32 object-contain opacity-90 transition-all duration-500 group-hover:opacity-100"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 border border-gray-800/50 animate-pulse">
              <div className="h-20 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="bg-card rounded-2xl p-6 border border-gray-800/50 hover:border-[#6EE7B7]/30 transition-all duration-300 group relative overflow-hidden cursor-pointer animate-slide-up backdrop-blur-xl"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-15 transition-all duration-500" style={{ background: `radial-gradient(circle, ${metric.color} 0%, transparent 70%)` }} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl transition-all duration-300" style={{ backgroundColor: 'rgba(20, 83, 45, 0.5)' }}>
                      <Icon className="w-6 h-6 transition-all duration-300 group-hover:brightness-125" style={{ color: metric.color }} />
                    </div>
                    <span className="text-4xl font-bold">{metric.value}</span>
                  </div>
                  <p className="text-[#9CA3AF] font-medium group-hover:text-white transition-all duration-300">{metric.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-card rounded-2xl p-8 border border-gray-800/50 relative overflow-hidden backdrop-blur-xl hover:border-[#6EE7B7]/20 transition-all duration-300 group">
        <div className="absolute right-[-100px] top-[-100px] w-80 h-80 gradient-blob-teal opacity-20 group-hover:opacity-30 transition-all duration-500" />
        <div className="absolute left-0 bottom-0 w-64 h-64 gradient-orb opacity-10" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4 transition-all duration-300">System Overview</h2>
          <p className="text-[#9CA3AF] leading-relaxed group-hover:text-[#9CA3AF]/90 transition-all duration-300">
            WeVysya GHM 2.0 is your AI-first control center for managing global house operations.
            Navigate through the sidebar to access houses, members, and activity ledgers.
          </p>
        </div>
      </div>
    </div>
  );
}
