import { useEffect, useState, useCallback, useRef } from 'react';
import { BarChart3, Download, Filter, X, ChevronDown, FileSpreadsheet, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface HouseOption { id: string; name: string; zone: string; state: string; country: string; }

interface Stats {
  totalHouses: number;
  totalMembers: number;
  totalLinks: number;
  totalDeals: number;
  totalDealAmount: number;
  totalI2WE: number;
  totalAttendance: number;
}

interface ZoneStat { zone: string; count: number; }
interface HouseRow {
  name: string;
  zone: string;
  state: string;
  country: string;
  members: number;
  links: number;
  deals: number;
  dealAmount: number;
}
interface MemberRow {
  id: string;
  name: string;
  email: string;
  linksGiven: number;
  linksReceived: number;
  totalLinks: number;
  deals: number;
  dealAmount: number;
}

interface Filters { house: string; zone: string; state: string; dateFrom: string; dateTo: string; }

export default function Reports() {
  const [stats, setStats] = useState<Stats>({
    totalHouses: 0, totalMembers: 0, totalLinks: 0,
    totalDeals: 0, totalDealAmount: 0, totalI2WE: 0, totalAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [zoneStats, setZoneStats] = useState<ZoneStat[]>([]);
  const [houseRows, setHouseRows] = useState<HouseRow[]>([]);
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [allHouses, setAllHouses] = useState<HouseOption[]>([]);
  const [filters, setFilters] = useState<Filters>({ house: '', zone: '', state: '', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    supabase.from('houses').select('id, name, zone, state, country').order('name').then(({ data }) => {
      if (data) setAllHouses(data);
    });
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let housesQuery = supabase.from('houses').select('id, name, zone, state, country');
      if (filters.house) housesQuery = housesQuery.eq('id', filters.house);
      else if (filters.zone) housesQuery = housesQuery.eq('zone', filters.zone);
      else if (filters.state) housesQuery = housesQuery.eq('state', filters.state);
      if (filters.dateFrom) housesQuery = housesQuery.gte('created_at', filters.dateFrom);
      if (filters.dateTo) housesQuery = housesQuery.lte('created_at', `${filters.dateTo}T23:59:59`);

      const { data: housesData } = await housesQuery;
      const houseIds = (housesData || []).map((h) => h.id);

      const isFiltered = !!(filters.house || filters.zone || filters.state);
      const hasDate = !!(filters.dateFrom || filters.dateTo);

      let membersPromise = isFiltered && houseIds.length
        ? supabase.from('profiles').select('id, full_name, email, house_id').in('house_id', houseIds)
        : supabase.from('profiles').select('id, full_name, email, house_id');
      if (hasDate) {
        membersPromise = membersPromise.gte('created_at', filters.dateFrom || '1900-01-01');
        if (filters.dateTo) membersPromise = membersPromise.lte('created_at', `${filters.dateTo}T23:59:59`);
      }

      let linksPromise = isFiltered && houseIds.length
        ? supabase.from('core_links').select('id, house_id, from_member_id, to_member_id').in('house_id', houseIds)
        : supabase.from('core_links').select('id, house_id, from_member_id, to_member_id');
      if (hasDate) {
        linksPromise = linksPromise.gte('created_at', filters.dateFrom || '1900-01-01');
        if (filters.dateTo) linksPromise = linksPromise.lte('created_at', `${filters.dateTo}T23:59:59`);
      }

      let dealsPromise = isFiltered && houseIds.length
        ? supabase.from('core_deals').select('id, house_id, amount, from_member_id, to_member_id').in('house_id', houseIds)
        : supabase.from('core_deals').select('id, house_id, amount, from_member_id, to_member_id');
      if (hasDate) {
        dealsPromise = dealsPromise.gte('created_at', filters.dateFrom || '1900-01-01');
        if (filters.dateTo) dealsPromise = dealsPromise.lte('created_at', `${filters.dateTo}T23:59:59`);
      }

      let i2wePromise = isFiltered && houseIds.length
        ? supabase.from('core_i2we').select('id, house_id').in('house_id', houseIds)
        : supabase.from('core_i2we').select('id, house_id');
      if (hasDate) {
        i2wePromise = i2wePromise.gte('created_at', filters.dateFrom || '1900-01-01');
        if (filters.dateTo) i2wePromise = i2wePromise.lte('created_at', `${filters.dateTo}T23:59:59`);
      }

      let attendancePromise = supabase.from('event_attendance').select('id', { count: 'exact', head: true });
      if (hasDate) {
        attendancePromise = attendancePromise.gte('created_at', filters.dateFrom || '1900-01-01');
        if (filters.dateTo) attendancePromise = attendancePromise.lte('created_at', `${filters.dateTo}T23:59:59`);
      }

      const [membersRes, linksRes, dealsRes, i2weRes, attendanceRes] = await Promise.all([
        membersPromise,
        linksPromise,
        dealsPromise,
        i2wePromise,
        attendancePromise,
      ]);

      const membersData = membersRes.data || [];
      const linksData = linksRes.data || [];
      const dealsData = dealsRes.data || [];
      const i2weData = i2weRes.data || [];
      const dealAmount = dealsData.reduce((s, d) => s + Number(d.amount || 0), 0);

      const zoneMap: Record<string, number> = {};
      (housesData || []).forEach((h) => {
        if (h.zone) zoneMap[h.zone] = (zoneMap[h.zone] || 0) + 1;
      });

      const rows: HouseRow[] = (housesData || []).map((house) => ({
        name: house.name,
        zone: house.zone || '',
        state: house.state || '',
        country: house.country || '',
        members: membersData.filter((m) => m.house_id === house.id).length,
        links: linksData.filter((l) => l.house_id === house.id).length,
        deals: dealsData.filter((d) => d.house_id === house.id).length,
        dealAmount: dealsData.filter((d) => d.house_id === house.id).reduce((s, d) => s + Number(d.amount || 0), 0),
      }));

      setStats({
        totalHouses: housesData?.length || 0,
        totalMembers: membersData.length,
        totalLinks: linksData.length,
        totalDeals: dealsData.length,
        totalDealAmount: dealAmount,
        totalI2WE: i2weData.length,
        totalAttendance: attendanceRes.count || 0,
      });
      setZoneStats(Object.entries(zoneMap).map(([zone, count]) => ({ zone, count })));
      setHouseRows(rows);

      // Build member-level breakdown when a specific house is selected
      let memberBreakdown: MemberRow[] = [];
      if (filters.house && houseIds.length === 1 && membersData.length > 0) {
        memberBreakdown = membersData.map((m) => {
          const linksGiven = linksData.filter((l) => l.from_member_id === m.id).length;
          const linksReceived = linksData.filter((l) => l.to_member_id === m.id).length;
          const memberDeals = dealsData.filter((d) => d.from_member_id === m.id || d.to_member_id === m.id);
          return {
            id: m.id,
            name: m.full_name || '—',
            email: (m as any).email || '',
            linksGiven,
            linksReceived,
            totalLinks: linksGiven + linksReceived,
            deals: memberDeals.length,
            dealAmount: memberDeals.reduce((s, d) => s + Number(d.amount || 0), 0),
          };
        }).filter((mr) => mr.totalLinks > 0 || mr.deals > 0)
          .sort((a, b) => b.totalLinks - a.totalLinks || b.deals - a.deals);
      }
      setMemberRows(memberBreakdown);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => setFilters({ house: '', zone: '', state: '', dateFrom: '', dateTo: '' });

  const handleFromDateChange = (dateFrom: string) => {
    setFilters((f) => ({
      ...f,
      dateFrom,
      dateTo: f.dateTo && f.dateTo < dateFrom ? dateFrom : f.dateTo,
    }));
  };

  const handleToDateChange = (dateTo: string) => {
    setFilters((f) => {
      if (f.dateFrom && dateTo < f.dateFrom) return f;
      return { ...f, dateTo };
    });
  };

  const uniqueStates = [...new Set(allHouses.map((h) => h.state).filter(Boolean))].sort();
  const zonesForState = [...new Set(
    allHouses.filter((h) => !filters.state || h.state === filters.state).map((h) => h.zone).filter(Boolean)
  )].sort();
  const housesForFilter = allHouses.filter((h) => {
    if (filters.state && h.state !== filters.state) return false;
    if (filters.zone && h.zone !== filters.zone) return false;
    return true;
  });

  const buildExportRows = () => {
    const date = new Date().toISOString().split('T')[0];
    const filterLabels: string[] = [];
    if (filters.state) filterLabels.push(`State: ${filters.state}`);
    if (filters.zone) filterLabels.push(`Zone: ${filters.zone}`);
    if (filters.house) filterLabels.push(`House: ${allHouses.find((h) => h.id === filters.house)?.name || ''}`);
    if (filters.dateFrom || filters.dateTo) filterLabels.push(`Date: ${filters.dateFrom || 'Start'} to ${filters.dateTo || 'Now'}`);

    const summary = [
      [`GHM Reports — ${date}`, filterLabels.join(' | ') || 'All Data'],
      [],
      ['Metric', 'Value'],
      ['Total Houses', stats.totalHouses],
      ['Total Members', stats.totalMembers],
      ['Total Links', stats.totalLinks],
      ['Total Deals', stats.totalDeals],
      ['Total Deal Amount', stats.totalDealAmount],
      ['Total I2WE Events', stats.totalI2WE],
      ['Total Attendance Records', stats.totalAttendance],
    ];

    const zoneSheet = [
      ['Zone', 'Houses'],
      ...zoneStats.map((z) => [z.zone, z.count]),
    ];

    const houseSheet = [
      ['House', 'Zone', 'State', 'Country', 'Members', 'Links', 'Deals', 'Deal Amount (INR)'],
      ...houseRows.map((r) => [r.name, r.zone, r.state, r.country, r.members, r.links, r.deals, r.dealAmount]),
    ];

    const memberSheet = memberRows.length > 0
      ? [
          ['Member', 'Email', 'Links Given', 'Links Received', 'Total Links', 'Deals', 'Deal Amount (INR)'],
          ...memberRows.map((mr) => [mr.name, mr.email, mr.linksGiven, mr.linksReceived, mr.totalLinks, mr.deals, mr.dealAmount]),
        ]
      : [];

    return { summary, zoneSheet, houseSheet, memberSheet };
  };

  const exportCSV = () => {
    const { summary, zoneSheet, houseSheet, memberSheet } = buildExportRows();
    const rows = [
      ...summary,
      [], ['Zone Distribution'], ...zoneSheet,
      [], ['House Details'], ...houseSheet,
    ];
    if (memberSheet.length > 0) {
      rows.push([], ['Member Breakdown'], ...memberSheet);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghm-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const { summary, zoneSheet, houseSheet, memberSheet } = buildExportRows();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(zoneSheet), 'Zone Distribution');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(houseSheet), 'House Details');
    if (memberSheet.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(memberSheet), 'Member Breakdown');
    }
    XLSX.writeFile(wb, `ghm-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in relative overflow-hidden min-h-screen">
      <div className="absolute top-[-100px] left-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] gradient-blob-teal opacity-25 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Reports</h1>
          <p className="text-[#9CA3AF] text-sm">Analytics and insights</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              activeFilterCount > 0
                ? 'border-[#6EE7B7]/50 bg-[#14532D]/40 text-[#6EE7B7]'
                : 'border-gray-700/60 bg-[#0F1412] text-[#9CA3AF] hover:text-white hover:border-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#6EE7B7] text-[#0B0F0E] text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700/60 bg-[#0F1412] text-[#9CA3AF] hover:text-white hover:border-gray-600 text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:brightness-110"
            style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="relative z-10 bg-[#0F1412] border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Filter Reports</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FilterSelect
              label="State"
              value={filters.state}
              onChange={(v) => setFilters({ house: '', zone: '', state: v, dateFrom: filters.dateFrom, dateTo: filters.dateTo })}
              placeholder="All States"
              options={uniqueStates.map((s) => ({ value: s, label: s }))}
            />
            <FilterSelect
              label="Zone"
              value={filters.zone}
              onChange={(v) => setFilters((f) => ({ ...f, house: '', zone: v }))}
              placeholder="All Zones"
              options={zonesForState.map((z) => ({ value: z, label: z }))}
            />
            <FilterSelect
              label="House"
              value={filters.house}
              onChange={(v) => setFilters((f) => ({ ...f, house: v }))}
              placeholder="All Houses"
              options={housesForFilter.map((h) => ({ value: h.id, label: h.name }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <DateInput
              label="From Date"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={handleFromDateChange}
            />
            <DateInput
              label="To Date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={handleToDateChange}
            />
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="relative z-10 flex flex-wrap gap-2">
          {filters.state && (
            <FilterTag label={`State: ${filters.state}`} onRemove={() => setFilters((f) => ({ ...f, state: '' }))} />
          )}
          {filters.zone && (
            <FilterTag label={`Zone: ${filters.zone}`} onRemove={() => setFilters((f) => ({ ...f, house: '', zone: '' }))} />
          )}
          {filters.house && (
            <FilterTag
              label={`House: ${allHouses.find((h) => h.id === filters.house)?.name}`}
              onRemove={() => setFilters((f) => ({ ...f, house: '' }))}
            />
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <FilterTag
              label={`Date: ${filters.dateFrom || 'Start'} → ${filters.dateTo || 'Now'}`}
              onRemove={() => setFilters((f) => ({ ...f, dateFrom: '', dateTo: '' }))}
            />
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-32 bg-[#0F1412] border border-gray-800/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
            <MetricCard label="Total Houses" value={stats.totalHouses} color="#6EE7B7" />
            <MetricCard label="Total Members" value={stats.totalMembers} color="#4ADE80" />
            <MetricCard label="Total Links" value={stats.totalLinks} color="#6EE7B7" />
            <MetricCard label="Total Deals" value={stats.totalDeals} color="#4ADE80" />
            <MetricCard label="Total Deal Value" value={`₹${stats.totalDealAmount.toLocaleString('en-IN')}`} color="#6EE7B7" />
            <MetricCard label="I2WE Events" value={stats.totalI2WE} color="#4ADE80" />
            <MetricCard label="Attendance Records" value={stats.totalAttendance} color="#6EE7B7" />
          </div>

          {zoneStats.length > 0 && (
            <div className="bg-[#0F1412] border border-gray-800/50 rounded-2xl p-6 relative z-10">
              <h2 className="text-lg font-bold text-white mb-5">Zone Distribution</h2>
              <div className="space-y-3">
                {zoneStats.sort((a, b) => b.count - a.count).map((z) => (
                  <div key={z.zone} className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 w-40 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#6EE7B7] shrink-0" />
                      <span className="text-sm font-medium text-white truncate">{z.zone}</span>
                    </div>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#6EE7B7] transition-all duration-700"
                        style={{ width: `${stats.totalHouses > 0 ? (z.count / stats.totalHouses) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm text-[#9CA3AF] w-6 text-right shrink-0">{z.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {houseRows.length > 0 ? (
            <div className="bg-[#0F1412] border border-gray-800/50 rounded-2xl p-6 relative z-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">House Breakdown</h2>
                <span className="text-xs text-[#9CA3AF] bg-gray-800/50 px-2 py-1 rounded-lg">
                  {houseRows.length} {houseRows.length === 1 ? 'house' : 'houses'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800/60">
                      {['House', 'Zone', 'State', 'Members', 'Links', 'Deals', 'Deal Value'].map((h, i) => (
                        <th
                          key={h}
                          className={`pb-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide ${i >= 3 ? 'text-right' : 'text-left'} ${i < 6 ? 'pr-4' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/30">
                    {houseRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-800/20 transition-colors group">
                        <td className="py-3 pr-4 font-medium text-white group-hover:text-[#6EE7B7] transition-colors">{row.name}</td>
                        <td className="py-3 pr-4 text-[#9CA3AF] text-sm">{row.zone || '—'}</td>
                        <td className="py-3 pr-4 text-[#9CA3AF] text-sm">{row.state || '—'}</td>
                        <td className="py-3 pr-4 text-right text-white">{row.members}</td>
                        <td className="py-3 pr-4 text-right text-white">{row.links}</td>
                        <td className="py-3 pr-4 text-right text-white">{row.deals}</td>
                        <td className="py-3 text-right font-medium text-[#6EE7B7]">
                          {row.dealAmount > 0 ? `₹${row.dealAmount.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {houseRows.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-gray-700/60">
                        <td className="pt-3 pr-4 text-xs font-bold text-[#9CA3AF] uppercase" colSpan={3}>Totals</td>
                        <td className="pt-3 pr-4 text-right font-bold text-white">{stats.totalMembers}</td>
                        <td className="pt-3 pr-4 text-right font-bold text-white">{stats.totalLinks}</td>
                        <td className="pt-3 pr-4 text-right font-bold text-white">{stats.totalDeals}</td>
                        <td className="pt-3 text-right font-bold text-[#6EE7B7]">
                          {stats.totalDealAmount > 0 ? `₹${stats.totalDealAmount.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center relative z-10">
              <BarChart3 className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-[#9CA3AF] font-medium">No data matches your filters</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="mt-2 text-xs text-[#6EE7B7] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {memberRows.length > 0 && (
            <div className="bg-[#0F1412] border border-gray-800/50 rounded-2xl p-6 relative z-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Member Breakdown</h2>
                <span className="text-xs text-[#9CA3AF] bg-gray-800/50 px-2 py-1 rounded-lg">
                  {memberRows.length} {memberRows.length === 1 ? 'member' : 'members'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800/60">
                      {['Member', 'Links Given', 'Links Received', 'Total Links', 'Deals', 'Deal Value'].map((h, i) => (
                        <th
                          key={h}
                          className={`pb-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide ${i >= 1 ? 'text-right' : 'text-left'} ${i < 5 ? 'pr-4' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/30">
                    {memberRows.map((mr, i) => (
                      <tr key={i} className="hover:bg-gray-800/20 transition-colors group">
                        <td className="py-3 pr-4 font-medium text-white group-hover:text-[#6EE7B7] transition-colors">{mr.name}</td>
                        <td className="py-3 pr-4 text-right text-white">{mr.linksGiven}</td>
                        <td className="py-3 pr-4 text-right text-white">{mr.linksReceived}</td>
                        <td className="py-3 pr-4 text-right font-medium text-[#6EE7B7]">{mr.totalLinks}</td>
                        <td className="py-3 pr-4 text-right text-white">{mr.deals}</td>
                        <td className="py-3 text-right font-medium text-[#6EE7B7]">
                          {mr.dealAmount > 0 ? `₹${mr.dealAmount.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {memberRows.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-gray-700/60">
                        <td className="pt-3 pr-4 text-xs font-bold text-[#9CA3AF] uppercase">Totals</td>
                        <td className="pt-3 pr-4 text-right font-bold text-white">{memberRows.reduce((s, m) => s + m.linksGiven, 0)}</td>
                        <td className="pt-3 pr-4 text-right font-bold text-white">{memberRows.reduce((s, m) => s + m.linksReceived, 0)}</td>
                        <td className="pt-3 pr-4 text-right font-bold text-[#6EE7B7]">{memberRows.reduce((s, m) => s + m.totalLinks, 0)}</td>
                        <td className="pt-3 pr-4 text-right font-bold text-white">{memberRows.reduce((s, m) => s + m.deals, 0)}</td>
                        <td className="pt-3 text-right font-bold text-[#6EE7B7]">
                          {memberRows.reduce((s, m) => s + m.dealAmount, 0) > 0
                            ? `₹${memberRows.reduce((s, m) => s + m.dealAmount, 0).toLocaleString('en-IN')}`
                            : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label, value, onChange, placeholder, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[#9CA3AF] mb-1.5 block">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-[#0D1410] border border-gray-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#6EE7B7]/50 pr-8"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
      </div>
    </div>
  );
}

function DateInput({
  label, value, min, max, onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    input?.showPicker?.();
  };

  return (
    <div>
      <label className="text-xs font-medium text-[#9CA3AF] mb-1.5 flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none cursor-pointer bg-[#0D1410] border border-gray-700/50 rounded-xl pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#6EE7B7]/50"
        />
        <button
          type="button"
          onClick={openPicker}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6EE7B7] hover:text-[#4ADE80] transition-colors"
          tabIndex={-1}
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string | undefined; onRemove: () => void }) {
  if (!label) return null;
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14532D]/50 border border-[#6EE7B7]/20 text-xs text-[#6EE7B7]">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors ml-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-[#0F1412] rounded-2xl p-6 border border-gray-800/50 hover:border-[#6EE7B7]/30 transition-all duration-300 group relative overflow-hidden">
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-15 transition-all duration-500"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(20,83,45,0.5)' }}>
            <BarChart3 className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-[#9CA3AF] text-sm font-medium group-hover:text-white transition-colors">{label}</span>
        </div>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
