
import React, { useMemo, useState } from 'react';
import { FineEntry, TimeFilter, Player, Role } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { Trophy, TrendingUp, PieChart as PieIcon, ChevronDown, Activity, Users, Wallet, ChevronUp, AlertCircle } from 'lucide-react';

interface StatsViewProps {
  fines: FineEntry[];
  players: Player[];
  onSelectPlayer: (playerId: string) => void;
  currentFilter: TimeFilter;
  onFilterChange: (filter: TimeFilter) => void;
  currentUserRole?: Role; 
}

// Custom Tick to make names clickable on Y-Axis
const CustomYAxisTick = ({ x, y, payload, onClick }: any) => {
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
                {payload.value}
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

export const StatsView: React.FC<StatsViewProps> = ({ fines, players, onSelectPlayer, currentFilter, onFilterChange, currentUserRole }) => {
  const [distMode, setDistMode] = useState<'type' | 'player' | 'status'>('type');
  const [trendMode, setTrendMode] = useState<'amount' | 'count'>('amount');
  const [showAllDebts, setShowAllDebts] = useState(false); 
  const [showAllSinners, setShowAllSinners] = useState(false); 
  
  // --- Filtering Logic for KPIs (Standard) ---
  const filteredFines = useMemo(() => {
    const now = new Date();
    return fines.filter(fine => {
      const fineDate = new Date(fine.date);
      
      if (currentFilter === 'month') {
        return fineDate.getMonth() === now.getMonth() && fineDate.getFullYear() === now.getFullYear();
      }
      if (currentFilter === 'year') {
        return fineDate.getFullYear() === now.getFullYear();
      }
      if (currentFilter === 'semester') {
        const currentMonth = now.getMonth();
        const isAutumn = currentMonth >= 7; // Aug is 7
        const fineMonth = fineDate.getMonth();
        const fineYear = fineDate.getFullYear();
        
        if (fineYear !== now.getFullYear()) return false;
        if (isAutumn) return fineMonth >= 7;
        return fineMonth < 7;
      }
      return true;
    });
  }, [fines, currentFilter]);

  // --- Filtering Logic for TREND CHART (Minimum Semester) ---
  const chartFilter = currentFilter === 'month' ? 'semester' : currentFilter;

  const chartFines = useMemo(() => {
    const now = new Date();
    return fines.filter(fine => {
      const fineDate = new Date(fine.date);
      
      if (chartFilter === 'year') {
        return fineDate.getFullYear() === now.getFullYear();
      }
      if (chartFilter === 'semester') {
        const currentMonth = now.getMonth();
        const isAutumn = currentMonth >= 7; // Aug is 7
        const fineMonth = fineDate.getMonth();
        const fineYear = fineDate.getFullYear();
        
        if (fineYear !== now.getFullYear()) return false;
        if (isAutumn) return fineMonth >= 7;
        return fineMonth < 7;
      }
      return true; // 'all'
    });
  }, [fines, chartFilter]);

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
      fines.filter(f => f.status === 'unpaid').forEach(f => {
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
  }, [fines, players]);


  // Handler for Y-Axis name click
  const handleNameClick = (displayName: string) => {
      const player = finesByPlayer.find(p => p.name === displayName);
      if (player) {
          onSelectPlayer(player.id);
      }
  };

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

  // 3. Paid vs Unpaid (Status)
  const statusData = useMemo(() => {
    const paid = filteredFines.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
    const unpaid = filteredFines.filter(f => f.status !== 'paid').reduce((acc, f) => acc + f.amount, 0);
    return [
        { name: 'Betalt', value: paid },
        { name: 'Ubetalt', value: unpaid }
    ];
  }, [filteredFines]);

  const currentPieData = distMode === 'type' ? pieDataByType : pieDataByPlayer;

  // --- Data for Line Chart (Trend) ---
  const trendData = useMemo(() => {
    const grouped: Record<string, { amount: number, count: number }> = {};
    const sorted = [...chartFines].sort((a, b) => a.timestamp - b.timestamp);
    
    sorted.forEach(fine => {
        const date = new Date(fine.date);
        let key = '';
        
        if (chartFilter === 'all') {
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
  }, [chartFines, chartFilter]);


  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
  const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

  // Dynamically calculate chart height for sinners
  const displayedSinners = showAllSinners ? sinnersData : sinnersData.slice(0, 5);
  const sinnersChartHeight = Math.max(256, displayedSinners.length * 45);

  return (
    <div className="space-y-6 pb-24">
      
      {/* Filter Toggle */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex overflow-x-auto no-scrollbar">
        {(['all', 'year', 'semester', 'month'] as TimeFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`flex-1 px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-xl whitespace-nowrap transition-all ${
              currentFilter === filter 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {filter === 'all' ? 'Totalt' : 
             filter === 'year' ? 'I år' :
             filter === 'semester' ? 'Sem.' : 'Denne mnd'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center space-x-2 opacity-80 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Innsamlet</span>
          </div>
          <div className="text-3xl font-bold">{totalCollected.toLocaleString()} kr</div>
          <div className="text-xs opacity-70 mt-1">
             {currentFilter === 'all' ? 'Totalt' : 'I valgt periode'}
          </div>
        </div>

        <div 
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => topSinner && topSinner.total > 0 && onSelectPlayer(topSinner.id)}
        >
           <div className="flex items-center space-x-2 text-slate-500 mb-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Verstingen</span>
          </div>
          <div className="text-xl font-bold text-slate-900 truncate">
            {topSinner && topSinner.total > 0 ? topSinner.fullName : '-'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {topSinner ? `${topSinner.total} kr` : ''}
          </div>
        </div>
      </div>

      {/* Syndere Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-slate-400" />
            Syndere
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
                            dataKey="name" 
                            type="category" 
                            width={85} 
                            tick={<CustomYAxisTick onClick={handleNameClick} />}
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
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Ingen data i denne perioden
                </div>
            )}
        </div>
        
        {sinnersData.length > 5 && (
            <div className="flex justify-center mt-6">
                <button
                    onClick={() => setShowAllSinners(!showAllSinners)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-6 py-2 rounded-full transition-colors shadow-sm"
                >
                    {showAllSinners ? (
                        <>
                            Vis færre <ChevronUp size={14} />
                        </>
                    ) : (
                        <>
                            Vis flere ({sinnersData.length - 5} til) <ChevronDown size={14} />
                        </>
                    )}
                </button>
            </div>
        )}
      </div>

      {/* Trend Chart (Line) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-slate-400"/>
                Utvikling
            </h3>
            <div className="relative">
                <select 
                    value={trendMode}
                    onChange={(e) => setTrendMode(e.target.value as 'amount' | 'count')}
                    className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                >
                    <option value="amount">Beløp (NOK)</option>
                    <option value="count">Antall Bøter</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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
                            strokeWidth={3} 
                            dot={{r: 4, fill: trendMode === 'amount' ? '#2563eb' : '#10b981'}} 
                            activeDot={{r: 6}} 
                        />
                    </LineChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Mangler data</div>
             )}
        </div>
      </div>

      {/* Distribution Chart (Pie OR Bar) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <PieIcon className="w-5 h-5 mr-2 text-slate-400"/>
                Fordeling
            </h3>
            <div className="relative">
                <select 
                    value={distMode}
                    onChange={(e) => setDistMode(e.target.value as 'type' | 'player' | 'status')}
                    className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                >
                    <option value="type">Etter type bot</option>
                    <option value="player">Etter spiller (beløp)</option>
                    <option value="status">Betalt / Ubetalt</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
        </div>
        
        <div className="h-80 w-full">
            {distMode === 'status' ? (
                // STATUS BAR CHART
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${value} kr`, 'Beløp']} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            <Cell fill="#10b981" /> {/* Paid */}
                            <Cell fill="#ef4444" /> {/* Unpaid */}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                // PIE CHART LOGIC
                currentPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={currentPieData}
                                cx="50%"
                                cy="45%" 
                                innerRadius={60}
                                outerRadius={80}
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
                                    // Bug fiks: Vis kun tall for antall, og tall + kr for beløp
                                    const formattedValue = distMode === 'type' ? value : `${value} kr`;
                                    return [formattedValue, displayName];
                                }} 
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={80}
                                iconType="circle" 
                                wrapperStyle={{
                                    fontSize: '11px',
                                    overflowY: 'auto'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Mangler data</div>
                )
            )}
        </div>
      </div>

      {/* ADMIN ONLY: Outstanding Debts List */}
      {currentUserRole === 'admin' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                    <Wallet className="w-5 h-5 mr-2 text-red-500" />
                    Utestående ({debtList.length})
                </h3>
            </div>
            
            <div className="space-y-2 relative">
                {debtList.length > 0 ? (
                    <>
                        {debtList.map((player, index) => {
                            if (!showAllDebts && index > 4) return null; 
                            const isFoggy = !showAllDebts && index >= 3;

                            return (
                                <div 
                                    key={player.id} 
                                    className={`flex justify-between items-center p-3 rounded-xl border border-slate-50 transition-all ${
                                        isFoggy ? 'opacity-30 blur-[1px] bg-slate-50' : 'bg-white hover:bg-slate-50'
                                    }`}
                                    onClick={() => !isFoggy && onSelectPlayer(player.id)}
                                    style={{ cursor: isFoggy ? 'default' : 'pointer' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                            index === 0 ? 'bg-amber-100 text-amber-700' :
                                            index === 1 ? 'bg-slate-200 text-slate-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-800' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <span className="font-medium text-slate-900">{player.name}</span>
                                    </div>
                                    <span className="font-bold text-red-600">{player.amount} kr</span>
                                </div>
                            );
                        })}
                        
                        {debtList.length > 3 && (
                            <div className={`flex justify-center mt-2 ${!showAllDebts ? '-mt-4 relative z-10' : ''}`}>
                                <button
                                    onClick={() => setShowAllDebts(!showAllDebts)}
                                    className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-colors shadow-sm"
                                >
                                    {showAllDebts ? (
                                        <>
                                            Vis færre <ChevronUp size={14} />
                                        </>
                                    ) : (
                                        <>
                                            Vis flere ({debtList.length - 3} til) <ChevronDown size={14} />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-6 text-slate-400 italic text-sm">
                        Ingen utestående beløp! 
                        <span className="block text-2xl mt-2">🎉</span>
                    </div>
                )}
            </div>
        </div>
      )}

    </div>
  );
};
