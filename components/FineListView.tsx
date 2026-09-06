import { MonthNavigator } from './MonthNavigator';
import { isDateInPeriod, monthAtOffset } from '../services/dateService';
import { useSaveAction } from '../hooks/useSaveAction';
import { SaveStatus } from './SaveStatus';

import React, { useState, useMemo, useEffect } from 'react';
import { FineEntry, TimeFilter, Player, Role } from '../types';
import {
  ArrowUpDown, ArrowUp, ArrowDown,
  TrendingUp, Trophy, PieChart, Search, Filter, CheckCircle2,
  Clock, AlertTriangle, Download, MessageSquare, Shield, CheckCheck, X,
  FileX2, RotateCcw
} from 'lucide-react';
import { WaiveFineModal } from './WaiveFineModal';

interface FineListViewProps {
  fines: FineEntry[];
  onFilterChange?: (filter: TimeFilter) => void;
  monthOffset?: number;
  onMonthOffsetChange?: (offset: number) => void;
  currentFilter: TimeFilter;
  onSelectFine: (fineId: string) => void;
  players: Player[];
  currentUserRole?: Role;
  onAdminPay?: (fineId: string) => Promise<boolean>;
  onAdminWaive?: (fineId: string, reason?: string) => Promise<boolean>;
  onAdminReopen?: (fineId: string) => Promise<boolean>;
}

type SortField = 'date' | 'player' | 'reason' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'unpaid' | 'paid' | 'waived' | 'complaint';

export const FineListView: React.FC<FineListViewProps> = ({
  fines,
  currentFilter: initialFilter, onFilterChange, monthOffset: controlledMonthOffset, onMonthOffsetChange,
  onSelectFine,
  players,
  currentUserRole,
  onAdminPay,
  onAdminWaive,
  onAdminReopen
}) => {
  const [filter, setFilter] = useState<TimeFilter>(initialFilter);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [waivingFine, setWaivingFine] = useState<FineEntry | null>(null);

  // Måned-navigasjon (offset fra nåværende måned)
  const [localMonthOffset, setLocalMonthOffset] = useState(0);
  const monthOffset = controlledMonthOffset ?? localMonthOffset;
  const setMonthOffset = (value: number | ((old: number) => number)) => { const next = typeof value === 'function' ? value(monthOffset) : value; setLocalMonthOffset(next); onMonthOffsetChange?.(next); };
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  const { isSaving, saveError, runSave } = useSaveAction();

  const isAdmin = currentUserRole === 'admin';

  // Beregn måned-velger dato
  const activeDate = useMemo(() => monthAtOffset(monthOffset), [monthOffset]);

  const activeMonthName = activeDate.toLocaleDateString('no-NO', { month: 'long', year: 'numeric' });

  // Filter fines based on local state 'filter' and 'monthOffset'
  const timeFilteredFines = useMemo(() => fines.filter(f => isDateInPeriod(f.date, filter, filter === 'month' ? activeDate : new Date())), [fines, filter, activeDate]);

  // Status and search filtering
  const filteredFines = useMemo(() => {
    return timeFilteredFines.filter(fine => {
      // Status filter
      if (statusFilter === 'unpaid' && fine.status !== 'unpaid') return false;
      if (statusFilter === 'paid' && fine.status !== 'paid') return false;
      if (statusFilter === 'waived' && fine.status !== 'waived') return false;
      if (statusFilter === 'complaint' && !fine.complaint) return false;

      // Text search
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const player = players.find(p => p.id === fine.playerId);
        const playerName = (player?.name || '').toLowerCase();
        const reason = (fine.reason || '').toLowerCase();
        const desc = (fine.description || '').toLowerCase();
        const waivedReason = (fine.waivedReason || '').toLowerCase();
        return playerName.includes(query) || reason.includes(query) || desc.includes(query) || waivedReason.includes(query);
      }

      return true;
    });
  }, [timeFilteredFines, statusFilter, searchQuery, players]);

  // --- SJEFENS OVERSIKT DATA ---
  const summary = useMemo(() => {
      if (timeFilteredFines.length === 0) return null;

      const totalAmount = timeFilteredFines.reduce((sum, f) => sum + f.amount, 0);
      const paidAmount = timeFilteredFines.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
      const waivedAmount = timeFilteredFines.filter(f => f.status === 'waived').reduce((sum, f) => sum + f.amount, 0);
      const unpaidAmount = timeFilteredFines.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0);
      const collectableAmount = totalAmount - waivedAmount;
      const collectionRate = collectableAmount > 0 ? Math.round((paidAmount / collectableAmount) * 100) : 0;

      // Finn versting (beløp)
      const playerTotals: Record<string, number> = {};
      timeFilteredFines.forEach(f => {
          playerTotals[f.playerId] = (playerTotals[f.playerId] || 0) + f.amount;
      });

      const worstId = Object.entries(playerTotals).sort((a,b) => b[1] - a[1])[0]?.[0];
      const worstPlayer = players.find(p => p.id === worstId);

      return {
          total: totalAmount,
          paid: paidAmount,
          unpaid: unpaidAmount,
          waived: waivedAmount,
          rate: collectionRate,
          count: timeFilteredFines.length,
          worst: worstPlayer?.name.split(' ')[0] || '-',
          worstFullName: worstPlayer?.name || '-'
      };
  }, [timeFilteredFines, players]);

  // Sort fines
  const sortedFines = useMemo(() => {
    return [...filteredFines].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
          case 'date':
              comparison = a.timestamp - b.timestamp;
              break;
          case 'amount':
              comparison = a.amount - b.amount;
              break;
          case 'reason':
              comparison = (a.reason || '').localeCompare(b.reason || '');
              break;
          case 'player':
              const playerA = players.find(p => p.id === a.playerId)?.name || 'Slettet';
              const playerB = players.find(p => p.id === b.playerId)?.name || 'Slettet';
              comparison = playerA.localeCompare(playerB);
              break;
          case 'status':
              comparison = (a.status || '').localeCompare(b.status || '');
              break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredFines, sortField, sortDirection, players]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
        setSortField(field);
        setSortDirection(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-30 ml-1 inline-block" />;
    return sortDirection === 'asc'
        ? <ArrowUp size={12} className="text-blue-600 ml-1 inline-block" />
        : <ArrowDown size={12} className="text-blue-600 ml-1 inline-block" />;
  };

  // CSV Export for PC
  const handleExportCSV = () => {
    const headers = ['Dato', 'Spiller', 'Bot', 'Beskrivelse', 'Beløp', 'Status', 'Tapsført Årsak', 'Registrert av'];
    const rows = sortedFines.map(f => {
      const p = players.find(player => player.id === f.playerId);
      const statusText = f.status === 'paid' ? 'Betalt' : f.status === 'waived' ? 'Tapsført' : 'Ubetalt';
      return [
        f.date,
        `"${p?.name || 'Slettet'}"`,
        `"${f.reason || ''}"`,
        `"${(f.description || '').replace(/"/g, '""')}"`,
        f.amount,
        statusText,
        `"${(f.waivedReason || '').replace(/"/g, '""')}"`,
        `"${(f.registeredBy?.name || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nhhi_botkasse_${activeMonthName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12">
      {/* ========================================================================= */}
      {/* 📱 MOBILVISNING (md:hidden): Ergonomisk kort-feed tilpasset tommel og touch */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-3.5">
        {/* Tidsfilter */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 flex overflow-x-auto no-scrollbar">
          {(['all', 'year', 'semester', 'month'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f); onFilterChange?.(f);
              }}
              className={`flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-xl whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'Totalt' :
               f === 'year' ? 'I år' :
               f === 'semester' ? 'Sem.' : 'Måned'}
            </button>
          ))}
        </div>

        {filter === 'month' && <MonthNavigator offset={monthOffset} onChange={setMonthOffset} />}

        {/* Hurtigsøk på mobil */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søk i bøter eller spillere..."
            className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-slate-200/80 rounded-xl outline-none focus:border-blue-500 text-slate-900 placeholder:text-slate-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Statusfilter chips på mobil */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 shadow-2xs'
            }`}
          >
            Alle ({timeFilteredFines.length})
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === 'unpaid'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 shadow-2xs'
            }`}
          >
            Ubetalt ({timeFilteredFines.filter(f => f.status === 'unpaid').length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 shadow-2xs'
            }`}
          >
            Betalt ({timeFilteredFines.filter(f => f.status === 'paid').length})
          </button>
          <button
            onClick={() => setStatusFilter('waived')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === 'waived'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 shadow-2xs'
            }`}
          >
            Tapsført ({timeFilteredFines.filter(f => f.status === 'waived').length})
          </button>
          {timeFilteredFines.some(f => !!f.complaint) && (
            <button
              onClick={() => setStatusFilter('complaint')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === 'complaint'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 shadow-2xs'
              }`}
            >
              Klager ({timeFilteredFines.filter(f => !!f.complaint).length})
            </button>
          )}
        </div>

        {/* Sjefens oversikt på mobil */}
        {summary && (
          <div className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-200/80">
            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
              <div className="px-1">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Versting</div>
                <div className="text-xs font-black text-slate-900 truncate mt-0.5">{summary.worst}</div>
              </div>
              <div className="px-1">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Innkrevd</div>
                <div className="text-xs font-black text-blue-600 mt-0.5">{summary.rate}%</div>
              </div>
              <div className="px-1">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Sum</div>
                <div className="text-xs font-black text-slate-900 mt-0.5">{summary.total} kr</div>
              </div>
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${summary.rate}%` }}
              />
            </div>
            {summary.waived > 0 && (
              <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-purple-700 font-semibold flex items-center justify-between">
                <span>Tapsført / ettergitt beløp:</span>
                <span className="font-bold">{summary.waived} kr</span>
              </div>
            )}
          </div>
        )}

        {/* Mobil Feed: Kort-basert liste */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>{sortedFines.length} bøter funnet</span>
            <span>{sortedFines.reduce((s, f) => s + f.amount, 0)} kr</span>
          </div>

          {sortedFines.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200/80 shadow-2xs">
              Ingen bøter matcher søket ditt.
            </div>
          ) : (
            sortedFines.map((fine) => {
              const player = players.find(p => p.id === fine.playerId);
              const isPaid = fine.status === 'paid';
              const isWaived = fine.status === 'waived';
              const hasComplaint = !!fine.complaint;

              return (
                <div
                  key={fine.id}
                  onClick={() => onSelectFine(fine.id)}
                  className={`bg-white border rounded-2xl p-3 shadow-2xs hover:border-blue-300 active:scale-[0.99] transition-all cursor-pointer select-none ${
                    isWaived ? 'border-purple-200 bg-purple-50/10' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {player ? player.name : 'Slettet spiller'}
                        </span>
                        {player?.customRole && (
                          <span className="text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                            {player.customRole}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-700 mt-1 truncate">
                        {fine.reason || 'Uspesifisert bot'}
                      </div>
                      {fine.description && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          "{fine.description}"
                        </div>
                      )}
                      {fine.registeredBy && <div className="text-[10px] text-slate-500 mt-1">Registrert av {fine.registeredBy.name}</div>}
                      {isWaived && fine.waivedReason && (
                        <div className="text-[10px] text-purple-600 font-semibold mt-1 flex items-center gap-1">
                          <FileX2 size={11} /> Tapsført: "{fine.waivedReason}"
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-none">
                      <div className={`text-sm font-black ${isPaid || isWaived ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {fine.amount},-
                      </div>
                      <div className="mt-1">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                            <CheckCheck size={10} /> Betalt
                          </span>
                        ) : isWaived ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                            <FileX2 size={10} /> Tapsført
                          </span>
                        ) : hasComplaint ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                            <AlertTriangle size={10} /> Klage
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                            <Clock size={10} /> Ubetalt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>{new Date(fine.date).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' })}</span>
                      {fine.comments && fine.comments.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-500 font-semibold">
                          <MessageSquare size={11} /> {fine.comments.length}
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {!isPaid && !isWaived && onAdminPay && (
                          <button
                            type="button"
                            disabled={isSaving} onClick={() => runSave(() => onAdminPay(fine.id))}
                            className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-all"
                            title="Merk som betalt"
                          >
                            Betalt
                          </button>
                        )}
                        {!isPaid && !isWaived && onAdminWaive && (
                          <button
                            type="button"
                            onClick={() => setWaivingFine(fine)}
                            className="px-2 py-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-all"
                            title="Tapsfør bot"
                          >
                            Tapsfør
                          </button>
                        )}
                        {isWaived && onAdminReopen && (
                          <button
                            type="button"
                            disabled={isSaving} onClick={() => runSave(() => onAdminReopen(fine.id))}
                            className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-all"
                            title="Gjenåpne bot"
                          >
                            Gjenåpne
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 💻 PC / DESKTOP-VISNING (hidden md:block): Omfattende arbeidsstasjon        */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-5">
        {/* KPI & Nøkkeltall Banner for PC */}
        {summary && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total påløpt</span>
                <TrendingUp size={16} className="text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{summary.total.toLocaleString('nb-NO')} kr</div>
              <div className="text-xs text-slate-400 mt-1">{summary.count} bøter i valgt periode</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Innbetalt</span>
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">{summary.paid.toLocaleString('nb-NO')} kr</div>
              <div className="text-xs text-emerald-700 mt-1 font-semibold">{summary.rate}% innkrevingsgrad</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Utestående</span>
                <Clock size={16} className="text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600">{summary.unpaid.toLocaleString('nb-NO')} kr</div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span>Gjenstår å kreve inn</span>
                {summary.waived > 0 && (
                  <span className="text-purple-600 font-bold" title="Ettergitt / tapsført beløp">
                    ({summary.waived} kr tapt)
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Største synder</span>
                <Trophy size={16} className="text-amber-500" />
              </div>
              <div className="text-xl font-black text-slate-900 truncate">{summary.worstFullName}</div>
              <div className="text-xs text-slate-400 mt-1">Topper botelisten i perioden</div>
            </div>
          </div>
        )}

        {/* Kontrollpanel for PC: Tidsintervall, Statustabs, Søk og Eksport */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Tidsfilter-knapper */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(['all', 'year', 'semester', 'month'] as TimeFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f); onFilterChange?.(f);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    filter === f
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f === 'all' ? 'Totalt' :
                   f === 'year' ? 'I år' :
                   f === 'semester' ? 'Semester' : 'Måned'}
                </button>
              ))}
            </div>

            {filter === 'month' && <MonthNavigator offset={monthOffset} onChange={setMonthOffset} />}

            {/* Søk og Handlinger */}
            <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Søk spiller, årsak, merknad..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 text-slate-900 placeholder:text-slate-400 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow-2xs whitespace-nowrap"
                title="Eksporter som CSV for Excel/Numbers"
              >
                <Download size={14} />
                <span>Eksporter CSV</span>
              </button>
            </div>
          </div>

          {/* Status-filter faner */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Alle ({timeFilteredFines.length})
              </button>
              <button
                onClick={() => setStatusFilter('unpaid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'unpaid'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Kun ubetalte ({timeFilteredFines.filter(f => f.status === 'unpaid').length})
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Kun betalte ({timeFilteredFines.filter(f => f.status === 'paid').length})
              </button>
              <button
                onClick={() => setStatusFilter('waived')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'waived'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tapsførte ({timeFilteredFines.filter(f => f.status === 'waived').length})
              </button>
              <button
                onClick={() => setStatusFilter('complaint')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'complaint'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Klager ({timeFilteredFines.filter(f => !!f.complaint).length})
              </button>
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              Viser <span className="text-slate-900 font-bold">{sortedFines.length}</span> bøter · Sum:{' '}
              <span className="text-blue-600 font-bold">{sortedFines.reduce((s, f) => s + f.amount, 0).toLocaleString('nb-NO')} kr</span>
            </div>
          </div>
        </div>

        {/* Profesjonell PC Arbeidstabell */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('date')}
                  className="px-5 py-3.5 cursor-pointer hover:text-blue-600 transition-colors w-32"
                >
                  Dato <SortIcon field="date" />
                </th>
                <th
                  onClick={() => handleSort('player')}
                  className="px-5 py-3.5 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  Synder / Spiller <SortIcon field="player" />
                </th>
                <th
                  onClick={() => handleSort('reason')}
                  className="px-5 py-3.5 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  Bot / Forseelse <SortIcon field="reason" />
                </th>
                <th className="px-5 py-3.5">
                  Merknad & Kommentarer
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-5 py-3.5 cursor-pointer hover:text-blue-600 transition-colors w-36"
                >
                  Status <SortIcon field="status" />
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className="px-5 py-3.5 text-right cursor-pointer hover:text-blue-600 transition-colors w-28"
                >
                  Beløp <SortIcon field="amount" />
                </th>
                <th className="px-5 py-3.5 text-right w-40">
                  Handling
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedFines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Ingen bøter funnet for de valgte kriteriene.
                  </td>
                </tr>
              ) : (
                sortedFines.map((fine) => {
                  const player = players.find(p => p.id === fine.playerId);
                  const isPaid = fine.status === 'paid';
                  const isWaived = fine.status === 'waived';
                  const hasComplaint = !!fine.complaint;
                  const commentCount = fine.comments?.length || 0;

                  return (
                    <tr
                      key={fine.id}
                      onClick={() => onSelectFine(fine.id)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${isWaived ? 'bg-purple-50/20' : ''}`}
                    >
                      {/* Dato */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-slate-500">
                        {new Date(fine.date).toLocaleDateString('no-NO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Spiller */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs flex-none">
                            {player ? player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {player ? player.name : 'Slettet spiller'}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>{player?.position || 'Spiller'}</span>
                              {player?.customRole && (
                                <>
                                  <span>·</span>
                                  <span className="font-semibold text-slate-500">{player.customRole}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Bot / Årsak */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">
                          {fine.reason || 'Uspesifisert bot'}
                        </div>
                        {isWaived && fine.waivedReason && (
                          <div className="text-[11px] font-semibold text-purple-700 flex items-center gap-1 mt-0.5">
                            <FileX2 size={12} /> Tapsført årsak: "{fine.waivedReason}"
                          </div>
                        )}
                        {fine.complaint && (
                          <div className="text-[11px] font-semibold text-purple-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={12} /> Klage innsendt: "{fine.complaint.reason}"
                          </div>
                        )}
                      </td>

                      {/* Merknad / Kommentar */}
                      <td className="px-5 py-4 max-w-xs">
                        {fine.description ? (
                          <div className="text-xs text-slate-600 line-clamp-2 break-words" title={fine.description}>
                            "{fine.description}"
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Ingen merknad</span>
                        )}
                        {fine.registeredBy && <div className="text-[11px] text-slate-500 mt-1">Registrert av {fine.registeredBy.name}</div>}
                        {commentCount > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold mt-0.5">
                            <MessageSquare size={12} /> {commentCount} {commentCount === 1 ? 'kommentar' : 'kommentarer'}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200">
                            <CheckCheck size={12} /> Betalt
                          </span>
                        ) : isWaived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-purple-800 bg-purple-100/70 border border-purple-200" title={fine.waivedReason ? `Årsak: ${fine.waivedReason}` : 'Tapsført av botsjef'}>
                            <FileX2 size={12} /> Tapsført
                          </span>
                        ) : hasComplaint ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-purple-800 bg-purple-100/70 border border-purple-200">
                            <AlertTriangle size={12} /> Klage under behandling
                          </span>
                        ) : fine.payRequest ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-blue-800 bg-blue-100/70 border border-blue-200">
                            <Clock size={12} /> Venter godkjenning
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800 bg-amber-100/70 border border-amber-200">
                            <Clock size={12} /> Ubetalt
                          </span>
                        )}
                      </td>

                      {/* Beløp */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <span className={`text-base font-black ${isPaid || isWaived ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {fine.amount},-
                        </span>
                      </td>

                      {/* Handling */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {isAdmin && !isPaid && !isWaived && onAdminPay && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void runSave(() => onAdminPay(fine.id));
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all"
                              title="Merk som betalt med ett klikk"
                            >
                              Merk betalt
                            </button>
                          )}
                          {isAdmin && !isPaid && !isWaived && onAdminWaive && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWaivingFine(fine);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all"
                              title="Ettergi eller tapsfør bot"
                            >
                              Tapsfør
                            </button>
                          )}
                          {isAdmin && isWaived && onAdminReopen && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void runSave(() => onAdminReopen(fine.id));
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all"
                              title="Gjenåpne bot som ubetalt"
                            >
                              Gjenåpne
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectFine(fine.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                          >
                            Åpne
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for å ettergi / tapsføre bot */}
      <SaveStatus isSaving={isSaving} saveError={saveError} />
      {waivingFine && onAdminWaive && (
        <WaiveFineModal
          fine={waivingFine}
          player={players.find(p => p.id === waivingFine.playerId)}
          onConfirm={(reason) => onAdminWaive(waivingFine.id, reason)}
          onCancel={() => setWaivingFine(null)}
        />
      )}
    </div>
  );
};
