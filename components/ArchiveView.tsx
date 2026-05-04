
import React, { useMemo } from 'react';
import { FineEntry, Player } from '../types';
import { ChevronLeft, Archive, Search, Lock } from 'lucide-react';

interface ArchiveViewProps {
  fines: FineEntry[];
  players: Player[];
  onBack: () => void;
  onSelectFine: (id: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ fines, players, onBack, onSelectFine }) => {
  const groupedFines = useMemo(() => {
    const groups: Record<string, FineEntry[]> = {};
    fines.forEach(f => {
      const d = new Date(f.date);
      const key = d.toLocaleDateString('no-NO', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return Object.entries(groups).sort((a, b) => {
        const dateA = new Date(a[1][0].date);
        const dateB = new Date(b[1][0].date);
        return dateB.getTime() - dateA.getTime();
    });
  }, [fines]);

  return (
    <div className="space-y-6 pb-24 animate-in slide-in-from-right-4">
      <div className="bg-blue-900 -mx-4 -mt-10 pt-10 pb-16 px-6 rounded-b-[2rem] shadow-lg text-white">
        <div className="flex items-center space-x-2">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-blue-800 text-blue-100 transition-colors">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white">Langtidslagring</h2>
        </div>
        <p className="text-blue-200 text-xs mt-2 opacity-80">Historisk oversikt over alle bøter gitt til NHHI FC.</p>
      </div>

      <div className="px-2 -mt-10 relative z-20">
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl mb-6 flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl">
                  <Lock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                  <h4 className="text-sm font-black uppercase tracking-widest">Beskyttede data</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Disse bøtene er låst for endring.</p>
              </div>
          </div>

          {groupedFines.length > 0 ? (
              groupedFines.map(([month, monthFines]) => (
                  <div key={month} className="mb-8">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">{month}</h3>
                      <div className="space-y-3">
                          {monthFines.map(f => {
                              const p = players.find(x => x.id === f.playerId);
                              return (
                                  <button 
                                    key={f.id} 
                                    onClick={() => onSelectFine(f.id)}
                                    className="w-full flex justify-between items-center p-5 bg-white rounded-3xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all text-left"
                                  >
                                      <div className="overflow-hidden">
                                          <div className="text-[10px] text-slate-400 font-black uppercase mb-1">{new Date(f.date).toLocaleDateString()}</div>
                                          <div className="text-sm font-bold text-slate-900 truncate">{p?.name || 'Ukjent spiller'}</div>
                                          <div className="text-xs text-slate-500 truncate">{f.reason}</div>
                                      </div>
                                      <div className="text-right shrink-0 ml-4">
                                          <div className="text-sm font-black text-slate-900">{f.amount} kr</div>
                                          <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block ${f.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                              {f.status === 'paid' ? 'Betalt' : 'Skyldig'}
                                          </div>
                                      </div>
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              ))
          ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Archive className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Ingen arkiverte bøter ennå</p>
              </div>
          )}
      </div>
    </div>
  );
};
