
import React, { useState, useMemo } from 'react';
import { FineEntry, TimeFilter, Player, Role } from '../types';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, TrendingUp, Trophy, Target, PieChart } from 'lucide-react';

interface FineListViewProps {
  fines: FineEntry[];
  currentFilter: TimeFilter; 
  onSelectFine: (fineId: string) => void;
  players: Player[];
  currentUserRole?: Role;
}

type SortField = 'date' | 'player' | 'reason' | 'amount';
type SortDirection = 'asc' | 'desc';

export const FineListView: React.FC<FineListViewProps> = ({ fines, currentFilter: initialFilter, onSelectFine, players, currentUserRole }) => {
  const [filter, setFilter] = useState<TimeFilter>(initialFilter === 'all' ? 'month' : initialFilter); 
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Måned-navigasjon (offset fra nåværende måned)
  const [monthOffset, setMonthOffset] = useState(0);

  const isAdmin = currentUserRole === 'admin';

  // Beregn måned-velger dato
  const activeDate = useMemo(() => {
      const d = new Date();
      d.setMonth(d.getMonth() + monthOffset);
      return d;
  }, [monthOffset]);

  const activeMonthName = activeDate.toLocaleDateString('no-NO', { month: 'long', year: 'numeric' });

  // Filter fines based on local state 'filter' and 'monthOffset'
  const filteredFines = fines.filter(fine => {
    const fineDate = new Date(fine.date);
    
    if (filter === 'month') {
      return fineDate.getMonth() === activeDate.getMonth() && fineDate.getFullYear() === activeDate.getFullYear();
    }
    
    const now = new Date();
    if (filter === 'year') {
      return fineDate.getFullYear() === now.getFullYear();
    }
    if (filter === 'semester') {
      const currentMonth = now.getMonth();
      const isAutumn = currentMonth >= 7;
      const fineMonth = fineDate.getMonth();
      const fineYear = fineDate.getFullYear();
      if (fineYear !== now.getFullYear()) return false;
      return isAutumn ? fineMonth >= 7 : fineMonth < 7;
    }
    return true;
  });

  // --- SJEFENS OVERSIKT DATA ---
  const summary = useMemo(() => {
      if (filteredFines.length === 0) return null;
      
      const totalAmount = filteredFines.reduce((sum, f) => sum + f.amount, 0);
      const paidAmount = filteredFines.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
      const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
      
      // Finn versting (beløp)
      const playerTotals: Record<string, number> = {};
      filteredFines.forEach(f => {
          playerTotals[f.playerId] = (playerTotals[f.playerId] || 0) + f.amount;
      });
      
      const worstId = Object.entries(playerTotals).sort((a,b) => b[1] - a[1])[0]?.[0];
      const worstPlayer = players.find(p => p.id === worstId);

      return {
          total: totalAmount,
          rate: collectionRate,
          worst: worstPlayer?.name.split(' ')[0] || '-'
      };
  }, [filteredFines, players]);

  // Sort fines
  const sortedFines = [...filteredFines].sort((a, b) => {
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
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
        setSortField(field);
        setSortDirection(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-30 ml-0.5 inline-block" />;
    return sortDirection === 'asc' 
        ? <ArrowUp size={12} className="text-blue-600 ml-0.5 inline-block" /> 
        : <ArrowDown size={12} className="text-blue-600 ml-0.5 inline-block" />;
  };

  return (
    <div className="space-y-4 pb-24">
        {/* Header Filter & Måned-velger */}
        <div className="space-y-3">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex overflow-x-auto no-scrollbar">
                {(['all', 'year', 'semester', 'month'] as TimeFilter[]).map((f) => (
                <button
                    key={f}
                    onClick={() => {
                        setFilter(f);
                        if (f !== 'month') setMonthOffset(0);
                    }}
                    className={`flex-1 px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-xl whitespace-nowrap transition-all ${
                    filter === f 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    {f === 'all' ? 'Totalt' : 
                    f === 'year' ? 'I år' :
                    f === 'semester' ? 'Sem.' : 'Måned'}
                </button>
                ))}
            </div>

            {/* Måned-navigasjon (Løsning 1) */}
            {filter === 'month' && (
                <div className="flex items-center justify-between px-2 animate-in fade-in slide-in-from-top-1">
                    <button 
                        onClick={() => setMonthOffset(prev => prev - 1)}
                        className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-colors shadow-sm"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-sm font-black text-slate-900 uppercase tracking-widest">
                        {activeMonthName}
                    </div>
                    <button 
                        onClick={() => setMonthOffset(prev => prev + 1)}
                        className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-colors shadow-sm"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>

        {/* SJEFENS OVERSIKT (Løsning 3) */}
        {summary && (
            <div className="space-y-3">
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 grid grid-cols-3 gap-3 animate-in fade-in zoom-in-95">
                    <div className="text-center border-r border-slate-50">
                        <div className="flex items-center justify-center gap-1 mb-1 text-amber-500">
                            <Trophy size={12} />
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Versting</span>
                        </div>
                        <div className="text-xs font-black text-slate-900 truncate px-1">{summary.worst}</div>
                    </div>
                    
                    <div className="text-center border-r border-slate-50">
                        <div className="flex items-center justify-center gap-1 mb-1 text-blue-500">
                            <PieChart size={12} />
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Innkrevd</span>
                        </div>
                        <div className="text-xs font-black text-slate-900">{summary.rate}%</div>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1 text-green-500">
                            <TrendingUp size={12} />
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Sum</span>
                        </div>
                        <div className="text-xs font-black text-slate-900">{summary.total},-</div>
                    </div>
                </div>

                {/* Progress bar for innkrevingsgrad i valgt periode */}
                <div className="px-2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                            style={{ width: `${summary.rate}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <div>
                <h2 className="text-lg font-bold text-slate-900">Botliste</h2>
                <p className="text-xs text-slate-500">{sortedFines.length} bøter funnet</p>
            </div>
            <div className="text-sm font-bold text-slate-900 whitespace-nowrap">
                Periode-total: {sortedFines.reduce((sum, f) => sum + f.amount, 0)} kr
            </div>
        </div>
        
        <div className="w-full">
            <table className="w-full table-fixed text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                <th 
                    className="w-[20%] px-2 sm:px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => handleSort('date')}
                >
                    Dato <SortIcon field="date" />
                </th>
                <th 
                    className="w-[25%] px-2 sm:px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none truncate"
                    onClick={() => handleSort('player')}
                >
                    Spiller <SortIcon field="player" />
                </th>
                <th 
                    className="w-[35%] px-2 sm:px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none truncate"
                    onClick={() => handleSort('reason')}
                >
                    Årsak <SortIcon field="reason" />
                </th>
                <th 
                    className="w-[20%] px-2 sm:px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => handleSort('amount')}
                >
                    Beløp <SortIcon field="amount" />
                </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {sortedFines.map((fine) => {
                const player = players.find(p => p.id === fine.playerId);
                const isPaid = fine.status === 'paid';
                
                // Fallback for visning dersom data mangler
                const displayName = player 
                    ? (player.name.split(' ')[0] + ' ' + (player.name.split(' ')[1]?.[0] || '') + '.') 
                    : 'Slettet spiller';
                const displayReason = fine.reason || 'Uspesifisert årsak';

                return (
                    <tr 
                        key={fine.id} 
                        className="hover:bg-blue-50 transition-colors cursor-pointer active:bg-blue-100 min-h-[64px]"
                        onClick={() => onSelectFine(fine.id)}
                    >
                    <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-slate-500 align-top">
                        {new Date(fine.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                    
                    <td className="px-2 sm:px-4 py-3 font-medium text-slate-900 align-top">
                        <div className={`truncate ${!player ? 'text-red-400 italic font-normal' : ''}`} title={player?.name || 'Spiller slettet'}>
                            {displayName}
                        </div>
                    </td>
                    
                    <td className="px-2 sm:px-4 py-3 text-slate-600 align-top">
                        <div className={`truncate font-medium ${isPaid ? 'line-through opacity-50' : ''} ${!fine.reason ? 'italic text-slate-400' : ''}`} title={displayReason}>
                            {displayReason}
                        </div>
                        {fine.description && (
                            <div className="text-slate-400 text-[10px] truncate" title={fine.description}>
                                {fine.description}
                            </div>
                        )}
                    </td>
                    
                    <td className="px-2 sm:px-4 py-3 text-right font-bold text-slate-900 align-top whitespace-nowrap">
                        {isPaid ? (
                            <span className="text-green-600 text-[10px] sm:text-xs uppercase">Betalt</span>
                        ) : (
                            <span>{fine.amount},-</span>
                        )}
                    </td>
                    </tr>
                );
                })}
                {sortedFines.length === 0 && (
                    <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                            Ingen bøter funnet i denne perioden.
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
        </div>
    </div>
  );
};
