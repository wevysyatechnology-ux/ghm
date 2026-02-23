import { useEffect, useState } from 'react';
import { BarChart3, Download, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Reports() {
  const [stats, setStats] = useState({
    totalHouses: 0,
    totalMembers: 0,
    totalLinks: 0,
    totalDeals: 0,
    totalDealAmount: 0,
    totalI2WE: 0,
    totalAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [zoneStats, setZoneStats] = useState<{ zone: string; count: number }[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [housesRes, membersRes, linksRes, dealsRes, i2weRes, attendanceRes] = await Promise.all([
        supabase.from('houses').select('id, zone', { count: 'exact' }),
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('links').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('amount'),
        supabase.from('i2we_events').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('id', { count: 'exact', head: true }),
      ]);

      const dealAmount = dealsRes.data?.reduce((sum, deal) => sum + Number(deal.amount), 0) || 0;

      const zones = housesRes.data?.reduce((acc: { [key: string]: number }, house) => {
        acc[house.zone] = (acc[house.zone] || 0) + 1;
        return acc;
      }, {});

      const zoneArray = Object.entries(zones || {}).map(([zone, count]) => ({ zone, count: count as number }));

      setStats({
        totalHouses: housesRes.count || 0,
        totalMembers: membersRes.count || 0,
        totalLinks: linksRes.count || 0,
        totalDeals: dealsRes.data?.length || 0,
        totalDealAmount: dealAmount,
        totalI2WE: i2weRes.count || 0,
        totalAttendance: attendanceRes.count || 0,
      });
      setZoneStats(zoneArray);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Houses', stats.totalHouses],
      ['Total Members', stats.totalMembers],
      ['Total Links', stats.totalLinks],
      ['Total Deals', stats.totalDeals],
      ['Total Deal Amount', stats.totalDealAmount],
      ['Total I2WE Events', stats.totalI2WE],
      ['Total Attendance Records', stats.totalAttendance],
      [''],
      ['Zone Distribution'],
      ['Zone', 'Houses'],
      ...zoneStats.map(z => [z.zone, z.count]),
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wevysya-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-[-100px] left-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] gradient-blob-teal opacity-25" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[200px] gradient-pill-horizontal opacity-20" />

      <div className="flex items-center justify-between animate-slide-up relative z-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports</h1>
          <p className="text-[#9CA3AF]">Analytics and insights</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-[#9CA3AF] hover:text-white hover:border-gray-700 transition-all-smooth">
            <Filter className="w-5 h-5" />
            <span>Filter</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all-smooth hover:brightness-110"
            style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
          >
            <Download className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard label="Total Houses" value={stats.totalHouses} color="#6EE7B7" />
            <MetricCard label="Total Members" value={stats.totalMembers} color="#4ADE80" />
            <MetricCard label="Total Links" value={stats.totalLinks} color="#6EE7B7" />
            <MetricCard label="Total Deals" value={stats.totalDeals} color="#4ADE80" />
            <MetricCard
              label="Total Deal Value"
              value={`$${stats.totalDealAmount.toLocaleString()}`}
              color="#6EE7B7"
            />
            <MetricCard label="I2WE Events" value={stats.totalI2WE} color="#4ADE80" />
            <MetricCard label="Attendance Records" value={stats.totalAttendance} color="#6EE7B7" />
          </div>

          <div className="bg-card rounded-2xl p-6 border border-gray-800/50 relative z-10 backdrop-blur-xl">
            <h2 className="text-xl font-bold mb-6">Zone Distribution</h2>
            <div className="space-y-3">
              {zoneStats.map((zoneStat) => (
                <div key={zoneStat.zone} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6EE7B7' }} />
                    <span className="font-medium">{zoneStat.zone}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-48 h-2 bg-[#0F1412] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: '#6EE7B7',
                          width: `${(zoneStat.count / stats.totalHouses) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[#9CA3AF] w-12 text-right">{zoneStat.count}</span>
                  </div>
                </div>
              ))}

              {zoneStats.length === 0 && (
                <div className="text-center py-8 text-[#6B7280]">
                  No zone data available
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-gray-800/50 hover:border-[#6EE7B7]/30 transition-all duration-300 group relative overflow-hidden cursor-pointer backdrop-blur-xl">
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-15 transition-all duration-500"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
      />
      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-xl transition-all duration-300" style={{ backgroundColor: 'rgba(20, 83, 45, 0.5)' }}>
            <BarChart3 className="w-5 h-5 transition-all duration-300 group-hover:brightness-125" style={{ color }} />
          </div>
          <span className="text-[#9CA3AF] font-medium group-hover:text-white transition-all duration-300">{label}</span>
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
}
