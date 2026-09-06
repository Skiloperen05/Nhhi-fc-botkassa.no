import { MonthNavigator } from './MonthNavigator';
import { isDateInPeriod, monthAtOffset } from '../services/dateService';

import React, { useMemo, useState } from 'react';
import { FineEntry, TimeFilter, Player, Role } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { Trophy, TrendingUp, PieChart as PieIcon, ChevronDown, Activity, Users, Wallet, ChevronUp, AlertCircle } from 'lucide-react';

interface StatsViewProps {
  fines: FineEntry[];
  players: Player[];
  onSelectPlayer: (playerId: string) => void;
  monthOffset: number;
  onMonthOffsetChange: (offset: number) => void;
  currentFilter: TimeFilter;
  onFilterChange: (filter: TimeFilter) => void;
  currentUserRole?: Role;
}

// Custom Tick to make names clickable on Y-Axis
const CustomYAxisTick = ({ x, y, payload, onClick, names }: any) => {
    return (
        <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }}>
            <text
                x={0}
                y={0}
                dy={4}
                textAnchor="end"
                fill="#334155"
                fontSize={12}
                onClick={() => onClick(payload.value)}
                className="hover:fill-blue-600 hover:font-bold transition-colors"
            >
                {names?.[payload.value]?.split(' ')[0] || payload.value}
            </text>
        </g>
    );
};

// Helper for å begrense antall sektorer i kakediagrammet
const limitPieData = (data: { name: string; fullName: string; value: number }[], maxItems: number = 6) => {
    if (data.length <= maxItems) return data.sort((a, b) => b.value - a.value);

    const sorted = [...data].sort((a, b) => b.value - a.value);
    const main = sorted.slice(0, maxItems - 1);
    const others = sorted.slice(maxItems - 1);
    const othersValue = others.reduce((sum, item) => sum + item.value, 0);

    if (othersValue > 0) {
        main.push({ name: 'Andre', fullName: 'Andre spillere', value: othersValue });
    }

    return main;
};

export const StatsView: React.FC<StatsViewProps> = ({ fines, players, onSelectPlayer, currentFilter, onFilterChange, monthOffset, onMonthOffsetChange, currentUserRole }) => {
  const [distMode, setDistMode] = useState<'type' | 'player' | 'status'>('type');
  const [trendMode, setTrendMode] = useState<'amount' | 'count'>('amount');
  const [showAllDebts, setShowAllDebts] = useState(false);
  const [showAllSinners, setShowAllSinners] = useState(false);

  const activeDate = useMemo(() => monthAtOffset(monthOffset), [monthOffset]);
  const periodReference = currentFilter === 'month' ? activeDate : new Date();

  // --- Filtering Logic for KPIs (Standard) ---
  const filteredFines = useMemo(() => fines.filter(fine => isDateInPeriod(fine.date, currentFilter, periodReference)), [fines, currentFilter, activeDate]);

  // --- Derived Stats ---
  const totalCollected = filteredFines.reduce((sum, fine) => sum + fine.amount, 0);

  const finesByPlayer = useMemo(() => {
    return players.map(player => {
      const playerFines = filteredFines.filter(f => f.playerId === player.id);
      const total = playerFines.reduce((sum, f) => sum + f.amount, 0);
      return {
        id: player.id,
        name: player.name.split(' ')[0], // Display Name (First Name)
        fullName: player.name,
        total,
        count: playerFines.length
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredFines, players]);

  const sinnersData = useMemo(() => {
      return finesByPlayer.filter(p => p.total > 0);
  }, [finesByPlayer]);

  const topSinner = finesByPlayer[0];

  // --- Outstanding Debts Calculation (Admin Only) ---
  const debtList = useMemo(() => {
      const debts: Record<string, number> = {};
      filteredFines.filter(f => f.status === 'unpaid').forEach(f => {
          debts[f.playerId] = (debts[f.playerId] || 0) + f.amount;
      });

      return Object.entries(debts)
          .map(([id, amount]) => ({
              id,
              name: players.find(p => p.id === id)?.name || 'Ukjent Spiller',
              amount
          }))
          .filter(p => p.amount > 0)
          .sort((a, b) => b.amount - a.amount);
  }, [filteredFines, players]);


  // Handler for Y-Axis name click


  // --- Data for Pie/Bar Charts ---

  // 1. By Type
  const pieDataByType = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredFines.forEach(fine => {
        counts[fine.reason] = (counts[fine.reason] || 0) + 1;
    });
    const rawData = Object.keys(counts).map(key => ({ name: key, fullName: key, value: counts[key] }));
    return limitPieData(rawData, 6);
  }, [filteredFines]);

  // 2. By Player (Amount)
  const pieDataByPlayer = useMemo(() => {
    const rawData = finesByPlayer
        .filter(p => p.total > 0)
        .map(p => ({
            name: p.name,
            fullName: p.fullName,
            value: p.total
        }));
    return limitPieData(rawData, 6);
  }, [finesByPlayer]);

  // 3. Paid vs Unpaid vs Waived (Status)
  const statusData = useMemo(() => {
    const paid = filteredFines.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
    const unpaid = filteredFines.filter(f => f.status === 'unpaid').reduce((acc, f) => acc + f.amount, 0);
    const waived = filteredFines.filter(f => f.status === 'waived').reduce((acc, f) => acc + f.amount, 0);
    const result = [
        { name: 'Betalt', value: paid },
        { name: 'Ubetalt', value: unpaid }
    ];
    if (waived > 0) {
        result.push({ name: 'Tapsført', value: waived });
    }
    return result;
  }, [filteredFines]);

  const currentPieData = distMode === 'type' ? pieDataByType : pieDataByPlayer;

  // --- Data for Line Chart (Trend) ---
  const trendData = useMemo(() => {
    const grouped: Record<string, { amount: number, count: number }> = {};
    const sorted = [...filteredFines].sort((a, b) => a.timestamp - b.timestamp);

    sorted.forEach(fine => {
        const date = new Date(fine.date);
        let key = '';

        if (currentFilter === 'month') {
            key = date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
        } else if (currentFilter === 'all') {
            key = date.toLocaleDateString('no-NO', { month: 'short', year: '2-digit' });
        } else {
            key = date.toLocaleDateString('no-NO', { month: 'short' });
        }

        if (!grouped[key]) grouped[key] = { amount: 0, count: 0 };
        grouped[key].amount += fine.amount;
        grouped[key].count += 1;
    });

    return Object.keys(grouped).map(key => ({
        name: key,
        amount: grouped[key].amount,
        count: grouped[key].count
    }));
  }, [filteredFines, currentFilter]);


  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
  const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

  // Dynamically calculate chart height for sinners
  const displayedSinners = showAllSinners ? sinnersData : sinnersData.slice(0, 5);
  const sinnersChartHeight = Math.max(256, displayedSinners.length * 45);

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* ========================================================================= */}
      {/* 📱 MOBILVISNING (md:hidden)                                              */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-4">
        {/* Filter Toggle */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 flex overflow-x-auto no-scrollbar">
          {(['all', 'year', 'semester', 'month'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-xl whitespace-nowrap transition-all ${
                currentFilter === filter
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {filter === 'all' ? 'Totalt' :
               filter === 'year' ? 'I år' :
               filter === 'semester' ? 'Sem.' : 'Måned'}
            </button>
          ))}
        </div>

        {currentFilter === 'month' && <MonthNavigator offset={monthOffset} onChange={onMonthOffsetChange} />}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center space-x-1.5 opacity-80 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Påløpte bøter</span>
            </div>
            <div className="text-2xl font-black">{totalCollected.toLocaleString('nb-NO')} kr</div>
            <div className="text-[10px] opacity-70 mt-0.5">
               {currentFilter === 'all' ? 'Totalt påløpt' : 'I valgt periode'}
            </div>
          </div>

          <div
              className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => topSinner && topSinner.total > 0 && onSelectPlayer(topSinner.id)}
          >
             <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Verstingen</span>
            </div>
            <div className="text-base font-black text-slate-900 truncate">
              {topSinner && topSinner.total > 0 ? topSinner.fullName : '-'}
            </div>
            <div className="text-xs text-amber-600 font-bold mt-0.5">
              {topSinner ? `${topSinner.total} kr` : ''}
            </div>
          </div>
        </div>

        {/* Syndere Chart på mobil */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80">
          <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center uppercase tracking-wider">
              <Trophy className="w-4 h-4 mr-1.5 text-amber-500" />
              Syndere Toppliste
          </h3>
          <div style={{ height: sinnersChartHeight }} className="w-full transition-all duration-300">
              {sinnersData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                          data={displayedSinners}
                          layout="vertical"
                          margin={{ left: 0, right: 20 }}
                          onClick={(data: any) => {
                              if (data && data.activePayload && data.activePayload.length > 0) {
                                  const payload = data.activePayload[0].payload;
                                  if (payload && payload.id) {
                                      onSelectPlayer(payload.id);
                                  }
                              }
                          }}
                      >
                          <XAxis type="number" hide />
                          <YAxis
                              dataKey="id"
                              type="category"
                              width={85}
                              tick={<CustomYAxisTick names={Object.fromEntries(players.map(p => [p.id, p.name]))} onClick={onSelectPlayer} />}
                          />
                          <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value: number) => [`${value} kr`, 'Beløp']} />
                          <Bar
                            dataKey="total"
                            radius={[0, 4, 4, 0]}
                            cursor="pointer"
                          >
                              {displayedSinners.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[Math.min(index, COLORS.length - 1)]}
                                  />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      Ingen data i denne perioden
                  </div>
              )}
          </div>

          {sinnersData.length > 5 && (
              <div className="flex justify-center mt-4">
                  <button
                      onClick={() => setShowAllSinners(!showAllSinners)}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-full transition-colors shadow-2xs"
                  >
                      {showAllSinners ? (
                          <>Vis færre <ChevronUp size={13} /></>
                      ) : (
                          <>Vis flere ({sinnersData.length - 5} til) <ChevronDown size={13} /></>
                      )}
                  </button>
              </div>
          )}
        </div>

        {/* Trend Chart på mobil */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80">
          <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center uppercase tracking-wider">
                  <Activity className="w-4 h-4 mr-1.5 text-blue-600"/>
                  Utvikling
              </h3>
              <div className="relative">
                  <select
                      value={trendMode}
                      onChange={(e) => setTrendMode(e.target.value as 'amount' | 'count')}
                      className="appearance-none pl-2.5 pr-6 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-bold"
                  >
                      <option value="amount">Beløp (NOK)</option>
                      <option value="count">Antall Bøter</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
          </div>

          <div className="h-40 w-full">
               {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                          <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} width={30} />
                          <Tooltip formatter={(value: number) => [trendMode === 'amount' ? `${value} kr` : value, trendMode === 'amount' ? 'Beløp' : 'Antall']} />
                          <Line
                              type="monotone"
                              dataKey={trendMode}
                              stroke={trendMode === 'amount' ? '#2563eb' : '#10b981'}
                              strokeWidth={2.5}
                              dot={{r: 3.5, fill: trendMode === 'amount' ? '#2563eb' : '#10b981'}}
                              activeDot={{r: 5}}
                          />
                      </LineChart>
                  </ResponsiveContainer>
               ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">Mangler data</div>
               )}
          </div>
        </div>

        {/* Fordeling på mobil */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80">
          <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center uppercase tracking-wider">
                  <PieIcon className="w-4 h-4 mr-1.5 text-purple-600"/>
                  Fordeling
              </h3>
              <div className="relative">
                  <select
                      value={distMode}
                      onChange={(e) => setDistMode(e.target.value as 'type' | 'player' | 'status')}
                      className="appearance-none pl-2.5 pr-6 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-bold"
                  >
                      <option value="type">Etter type bot</option>
                      <option value="player">Etter spiller (beløp)</option>
                      <option value="status">Betalt / Ubetalt</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
          </div>

          <div className="h-72 w-full">
              {distMode === 'status' ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} margin={{top: 20, right: 20, left: 10, bottom: 5}}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => [`${value} kr`, 'Beløp']} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {statusData.map((entry, index) => {
                                  const color = entry.name === 'Betalt' ? '#10b981' : entry.name === 'Tapsført' ? '#9333ea' : '#ef4444';
                                  return <Cell key={`cell-${index}`} fill={color} />;
                              })}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              ) : (
                  currentPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={currentPieData}
                                  cx="50%"
                                  cy="45%"
                                  innerRadius={50}
                                  outerRadius={75}
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  {currentPieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                              </Pie>
                              <Tooltip
                                  formatter={(value: number, name: string, props: any) => {
                                      const displayName = distMode === 'player' ? (props.payload?.fullName || name) : name;
                                      const formattedValue = distMode === 'type' ? value : `${value} kr`;
                                      return [formattedValue, displayName];
                                  }}
                              />
                              <Legend
                                  verticalAlign="bottom"
                                  height={70}
                                  iconType="circle"
                                  wrapperStyle={{
                                      fontSize: '10px',
                                      overflowY: 'auto'
                                  }}
                              />
                          </PieChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">Mangler data</div>
                  )
              )}
          </div>
        </div>

        {/* Mobil Utestående (Admin) */}
        {currentUserRole === 'admin' && (
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-red-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
              <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center uppercase tracking-wider">
                  <Wallet className="w-4 h-4 mr-1.5 text-red-500" />
                  Utestående krav ({debtList.length})
              </h3>

              <div className="space-y-1.5">
                  {debtList.length > 0 ? (
                      <>
                          {debtList.map((p, index) => {
                              if (!showAllDebts && index > 4) return null;
                              const isFoggy = !showAllDebts && index >= 3;

                              return (
                                  <div
                                      key={p.id}
                                      className={`flex justify-between items-center p-2.5 rounded-xl border border-slate-100 transition-all ${
                                          isFoggy ? 'opacity-30 blur-[1px] bg-slate-50' : 'bg-white hover:bg-slate-50'
                                      }`}
                                      onClick={() => !isFoggy && onSelectPlayer(p.id)}
                                      style={{ cursor: isFoggy ? 'default' : 'pointer' }}
                                  >
                                      <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                                              {index + 1}
                                          </span>
                                          <span className="text-xs font-bold text-slate-900 truncate max-w-[160px]">{p.name}</span>
                                      </div>
                                      <span className="text-xs font-black text-red-600">{p.amount} kr</span>
                                  </div>
                              );
                          })}

                          {debtList.length > 3 && (
                              <div className="flex justify-center mt-2">
                                  <button
                                      onClick={() => setShowAllDebts(!showAllDebts)}
                                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                                  >
                                      {showAllDebts ? (
                                          <>Vis færre <ChevronUp size={12} /></>
                                      ) : (
                                          <>Vis flere ({debtList.length - 3} til) <ChevronDown size={12} /></>
                                      )}
                                  </button>
                              </div>
                          )}
                      </>
                  ) : (
                      <div className="text-center py-4 text-slate-400 text-xs italic">Ingen utestående beløp! 🎉</div>
                  )}
              </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 💻 PC / DESKTOP-VISNING (hidden md:block): Helhetlig Analyseverktøy       */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-6">
        {/* Desktop Toolbar: Periodeknapper og Info */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Periode:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'year', 'semester', 'month'] as TimeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => onFilterChange(filter)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    currentFilter === filter
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter === 'all' ? 'Totalt' :
                   filter === 'year' ? 'I år' :
                   filter === 'semester' ? 'Semester' : 'Måned'}
                </button>
              ))}
            </div>
          </div>

          {currentFilter === 'month' && <MonthNavigator offset={monthOffset} onChange={onMonthOffsetChange} />}

          <div className="text-xs text-slate-500 font-semibold flex flex-wrap items-center gap-4">
            <span>Viser statistikk for <strong className="text-slate-900">{filteredFines.length}</strong> bøter</span>
            <span>Aktiv spillerstall: <strong className="text-slate-900">{players.filter(p => p.isActive !== false).length}</strong></span>
          </div>
        </div>

        {/* 4 Store KPI-kort for PC */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Påløpte bøter</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">{totalCollected.toLocaleString('nb-NO')} kr</div>
            <div className="text-xs text-slate-400 mt-1">
              {currentFilter === 'all' ? 'Gjennom hele laghistorien' : 'I valgt tidsintervall'}
            </div>
          </div>

          <div
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-amber-300 transition-colors cursor-pointer group"
            onClick={() => topSinner && topSinner.total > 0 && onSelectPlayer(topSinner.id)}
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Verstingen</span>
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
              {topSinner && topSinner.total > 0 ? topSinner.fullName : '-'}
            </div>
            <div className="text-xs text-amber-600 font-bold mt-1">
              {topSinner ? `${topSinner.total.toLocaleString('nb-NO')} kr pådratt` : 'Ingen bøter registrert'}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Snitt per bot</span>
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              {filteredFines.length > 0 ? Math.round(totalCollected / filteredFines.length) : 0} kr
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Fordelt på {filteredFines.length} registrerte bøter
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Utestående gjeld</span>
              <Wallet className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-black text-red-600">
              {debtList.reduce((sum, d) => sum + d.amount, 0).toLocaleString('nb-NO')} kr
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>{debtList.length} {debtList.length === 1 ? 'spiller' : 'spillere'} med ubetalte krav</span>
              {filteredFines.filter(f => f.status === 'waived').length > 0 && (
                <span className="text-purple-600 font-bold" title="Tapsførte bøter">
                  ({filteredFines.filter(f => f.status === 'waived').reduce((s, f) => s + f.amount, 0).toLocaleString('nb-NO')} kr tapt)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2-Kolonne PC Dashboard Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* VENSTRE KOLONNE (5/12): Syndere Toppliste & Utestående krav */}
          <div className="col-span-5 space-y-6">
            {/* Syndere Rangeringstabell */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-900 flex items-center uppercase tracking-wider">
                  <Trophy className="w-5 h-5 mr-2 text-amber-500" />
                  Syndere Toppliste
                </h3>
                <span className="text-xs text-slate-400 font-semibold">{sinnersData.length} spillere</span>
              </div>

              {/* Stolpediagram for topp 6 */}
              <div className="h-64 w-full mb-4">
                {sinnersData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sinnersData.slice(0, 6)}
                      layout="vertical"
                      margin={{ left: 10, right: 25, top: 5, bottom: 5 }}
                      onClick={(data: any) => {
                        if (data?.activePayload?.[0]?.payload?.id) {
                          onSelectPlayer(data.activePayload[0].payload.id);
                        }
                      }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="id"
                        type="category"
                        width={95}
                        tick={<CustomYAxisTick names={Object.fromEntries(players.map(p => [p.id, p.name]))} onClick={onSelectPlayer} />}
                      />
                      <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value: number) => [`${value} kr`, 'Beløp']} />
                      <Bar dataKey="total" radius={[0, 6, 6, 0]} cursor="pointer">
                        {sinnersData.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[Math.min(index, COLORS.length - 1)]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Ingen bøter registrert i perioden
                  </div>
                )}
              </div>

              {/* Spillerliste med beløp og klikk */}
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {sinnersData.map((sinner, index) => {
                  const player = players.find(p => p.id === sinner.id);
                  return (
                    <div
                      key={sinner.id}
                      onClick={() => onSelectPlayer(sinner.id)}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          index === 0 ? 'bg-amber-100 text-amber-700' :
                          index === 1 ? 'bg-slate-200 text-slate-700' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                            {sinner.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-2">
                            {player?.position || 'Spiller'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-900 text-sm">{sinner.total.toLocaleString('nb-NO')} kr</div>
                        <div className="text-[10px] text-slate-400">{sinner.count} bøter</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Utestående gjeld boks */}
            {currentUserRole === 'admin' && (
              <div className="bg-white rounded-2xl p-5 border border-red-200 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center uppercase tracking-wider">
                    <Wallet className="w-4 h-4 mr-2 text-red-500" />
                    Utestående krav ({debtList.length})
                  </h3>
                  <span className="text-xs font-bold text-red-600">
                    Totalt: {debtList.reduce((s, d) => s + d.amount, 0).toLocaleString('nb-NO')} kr
                  </span>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {debtList.length > 0 ? (
                    debtList.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={() => onSelectPlayer(p.id)}
                        className="flex justify-between items-center p-2 rounded-xl bg-slate-50 hover:bg-red-50/60 border border-slate-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">{idx + 1}.</span>
                          <span className="text-xs font-bold text-slate-900">{p.name}</span>
                        </div>
                        <span className="text-xs font-black text-red-600">{p.amount.toLocaleString('nb-NO')} kr</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400 italic">Ingen utestående krav! 🎉</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* HØYRE KOLONNE (7/12): Utvikling over tid og Fordeling */}
          <div className="col-span-7 space-y-6">
            {/* Utvikling over tid (Line Chart) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center uppercase tracking-wider">
                    <Activity className="w-5 h-5 mr-2 text-blue-600"/>
                    Utvikling over tid
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{currentFilter === 'month' ? 'Viser daglig aktivitet i valgt måned' : 'Viser månedlig aktivitet i valgt periode'}</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setTrendMode('amount')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      trendMode === 'amount' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Beløp (kr)
                  </button>
                  <button
                    onClick={() => setTrendMode('count')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      trendMode === 'count' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Antall bøter
                  </button>
                </div>
              </div>

              <div className="h-64 w-full">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => [trendMode === 'amount' ? `${value.toLocaleString('nb-NO')} kr` : value, trendMode === 'amount' ? 'Sum bøter' : 'Antall']} />
                      <Line
                        type="monotone"
                        dataKey={trendMode}
                        stroke={trendMode === 'amount' ? '#2563eb' : '#10b981'}
                        strokeWidth={3}
                        dot={{r: 4.5, fill: trendMode === 'amount' ? '#2563eb' : '#10b981'}}
                        activeDot={{r: 7}}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Ingen trenddata tilgjengelig for valgt periode
                  </div>
                )}
              </div>
            </div>

            {/* Fordeling (Pie / Bar Chart) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center uppercase tracking-wider">
                    <PieIcon className="w-5 h-5 mr-2 text-purple-600"/>
                    Fordeling & Kategorier
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Analyse av botetyper og betalingsstatus</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setDistMode('type')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      distMode === 'type' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Etter botetype
                  </button>
                  <button
                    onClick={() => setDistMode('player')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      distMode === 'player' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Etter spiller
                  </button>
                  <button
                    onClick={() => setDistMode('status')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      distMode === 'status' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Betalingsstatus
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                {distMode === 'status' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 700}} />
                      <YAxis tick={{fontSize: 11}} />
                      <Tooltip formatter={(value: number) => [`${value.toLocaleString('nb-NO')} kr`, 'Beløp']} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {statusData.map((entry, index) => {
                          const color = entry.name === 'Betalt' ? '#10b981' : entry.name === 'Tapsført' ? '#9333ea' : '#ef4444';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  currentPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={currentPieData}
                          cx="50%"
                          cy="48%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {currentPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const displayName = distMode === 'player' ? (props.payload?.fullName || name) : name;
                            const formattedValue = distMode === 'type' ? `${value} stk` : `${value.toLocaleString('nb-NO')} kr`;
                            return [formattedValue, displayName];
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={55}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      Mangler data for fordeling
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
