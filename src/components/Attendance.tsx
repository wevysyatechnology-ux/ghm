import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Users, CheckCircle, Clock, XCircle, Home, Download, Filter, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EventRow {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  event_level: string;
  is_live: boolean;
  house?: { name: string } | null;
}

interface AttendanceRow {
  id: string;
  event_id: string;
  member_id: string;
  status: 'present' | 'late' | 'absent';
  checked_in_at: string;
  check_in_method: 'qr' | 'manual' | 'geo';
  member?: { full_name: string; house?: { name: string } | null } | null;
}

interface HouseStats {
  house: string;
  present: number;
  late: number;
  absent: number;
}

export default function Attendance({ readOnly: _readOnly = false }: { readOnly?: boolean }) {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'late' | 'absent'>('all');

  const isAdmin = profile?.role && ['super_admin', 'global_admin', 'zone_admin', 'house_admin'].includes(profile.role);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) fetchRecords(selectedEventId);
    else setRecords([]);
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_date, event_time, event_level, is_live, house:house_id(name)')
        .order('event_date', { ascending: false });
      if (error) throw error;
      const evs = data || [];
      setEvents(evs);
      if (evs.length > 0) setSelectedEventId(evs[0].id);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (eventId: string) => {
    setRecordsLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_attendance')
        .select('*, member:member_id(full_name, house:house_id(name))')
        .eq('event_id', eventId)
        .order('checked_in_at', { ascending: true });
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching attendance records:', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getExportRows = () => {
    return records.map(r => ({
      Name: r.member?.full_name || '—',
      House: r.member?.house?.name || '—',
      Status: r.status,
      'Check-in Time': r.status === 'absent' ? '—' : new Date(r.checked_in_at).toLocaleString('en-IN'),
      Method: r.check_in_method,
    }));
  };

  const exportCSV = () => {
    if (!records.length) return;
    const ev = events.find(e => e.id === selectedEventId);
    const rows = getExportRows();
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${ev?.title || 'event'}.csv`;
    a.click();
    setExportOpen(false);
  };

  const exportExcel = () => {
    if (!records.length) return;
    const ev = events.find(e => e.id === selectedEventId);
    const ws = XLSX.utils.json_to_sheet(getExportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance-${ev?.title || 'event'}.xlsx`);
    setExportOpen(false);
  };

  const filtered = filterStatus === 'all' ? records : records.filter(r => r.status === filterStatus);

  const houseStats: HouseStats[] = [];
  const houseMap: Record<string, HouseStats> = {};
  for (const r of records) {
    const house = r.member?.house?.name || 'Unknown';
    if (!houseMap[house]) {
      houseMap[house] = { house, present: 0, late: 0, absent: 0 };
      houseStats.push(houseMap[house]);
    }
    houseMap[house][r.status]++;
  }

  const counts = {
    present: records.filter(r => r.status === 'present').length,
    late:    records.filter(r => r.status === 'late').length,
    absent:  records.filter(r => r.status === 'absent').length,
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (!isAdmin) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center text-[#6B7280]">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Attendance data is available to administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Attendance</h1>
          <p className="text-[#9CA3AF]">QR-based event attendance tracking</p>
        </div>
        {records.length > 0 && (
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.25)' }}
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-700/60 bg-[#111815] shadow-xl z-20 overflow-hidden">
                <button
                  onClick={exportCSV}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#E5E7EB] hover:bg-[#1A2420] transition-colors"
                >
                  <Download className="w-4 h-4 text-[#4ADE80]" />
                  Export as CSV
                </button>
                <div className="h-px bg-gray-800/60" />
                <button
                  onClick={exportExcel}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#E5E7EB] hover:bg-[#1A2420] transition-colors"
                >
                  <Download className="w-4 h-4 text-[#34D399]" />
                  Export as Excel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 border border-gray-800/50 text-center text-[#6B7280]">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No events found. Create an event first.</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl p-4 border border-gray-800/50">
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-[#9CA3AF] shrink-0" />
              <div className="relative flex-1">
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="w-full appearance-none bg-[#0F1412] border border-gray-800 text-white rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#4ADE80]/50 cursor-pointer"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} — {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {ev.is_live ? ' (LIVE)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
              </div>
            </div>
          </div>

          {selectedEvent && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Present', key: 'present', count: counts.present, color: '#4ADE80', bg: 'rgba(74,222,128,0.1)', Icon: CheckCircle },
                { label: 'Late',    key: 'late',    count: counts.late,    color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', Icon: Clock },
                { label: 'Absent',  key: 'absent',  count: counts.absent,  color: '#F87171', bg: 'rgba(248,113,113,0.1)', Icon: XCircle },
              ].map(({ label, key, count, color, bg, Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(filterStatus === key as any ? 'all' : key as any)}
                  className="bg-card rounded-2xl p-5 border text-left transition-all hover:brightness-110"
                  style={{ borderColor: filterStatus === key ? color : 'rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: bg }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <span className="text-sm text-[#9CA3AF]">{label}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                </button>
              ))}
            </div>
          )}

          {houseStats.length > 1 && (
            <div className="bg-card rounded-2xl p-5 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-4">
                <Home className="w-4 h-4 text-[#9CA3AF]" />
                <h3 className="font-semibold text-sm">House-wise Breakdown</h3>
              </div>
              <div className="space-y-3">
                {houseStats.map(hs => {
                  const total = hs.present + hs.late + hs.absent;
                  const pct = total > 0 ? Math.round(((hs.present + hs.late) / total) * 100) : 0;
                  return (
                    <div key={hs.house} className="flex items-center gap-3">
                      <span className="text-sm text-[#9CA3AF] w-32 truncate shrink-0">{hs.house}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full bg-[#4ADE80] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className="text-[#4ADE80]">{hs.present}P</span>
                        {hs.late > 0 && <span className="text-yellow-400">{hs.late}L</span>}
                        <span className="text-[#6B7280]">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-gray-800/50">
            <div className="flex items-center gap-2 p-5 border-b border-gray-800/50">
              <Users className="w-4 h-4 text-[#9CA3AF]" />
              <h3 className="font-semibold text-sm">
                {filterStatus === 'all' ? 'All Check-ins' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Members`}
              </h3>
              <span className="ml-auto text-xs text-[#6B7280]">{filtered.length} records</span>
              {filterStatus !== 'all' && (
                <button onClick={() => setFilterStatus('all')} className="text-xs text-[#4ADE80] hover:underline">Clear</button>
              )}
            </div>

            {recordsLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-[#0F1412] rounded-xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-[#374151]" />
                <p className="text-[#6B7280] text-sm">
                  {records.length === 0
                    ? selectedEvent?.is_live
                      ? 'No check-ins yet. Event is live — waiting for members to scan the QR.'
                      : 'No attendance records for this event.'
                    : 'No records match the current filter.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {filtered.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#0F1412]/60 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[#6B7280] w-6 text-right shrink-0">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{r.member?.full_name || '—'}</p>
                        <p className="text-xs text-[#6B7280]">{r.member?.house?.name || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        r.status === 'present' ? 'bg-[#4ADE80]/10 text-[#4ADE80]' :
                        r.status === 'late'    ? 'bg-yellow-900/20 text-yellow-400' :
                                                 'bg-red-900/20 text-red-400'
                      }`}>{r.status}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.check_in_method === 'qr'     ? 'bg-[#60A5FA]/10 text-[#60A5FA]' :
                        r.check_in_method === 'manual' ? 'bg-gray-800 text-[#9CA3AF]' :
                                                          'bg-[#F59E0B]/10 text-[#F59E0B]'
                      }`}>{r.check_in_method}</span>
                      <span className="text-xs text-[#6B7280]">
                        {new Date(r.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
