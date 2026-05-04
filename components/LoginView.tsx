
import React, { useState } from 'react';
import { Player, User } from '../types';
import { User as UserIcon, Shield, Search, ChevronRight, Lock, KeyRound } from 'lucide-react';
import { Button } from './Button';

interface LoginViewProps {
  onLogin: (user: User) => void;
  players: Player[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, players }) => {
  const [query, setQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setPassword('');
    setError('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    const correctPassword = selectedPlayer.password || '1234';
    
    if (password === correctPassword) {
      onLogin({ 
        id: selectedPlayer.id, 
        name: selectedPlayer.name, 
        role: selectedPlayer.systemRole 
      });
    } else {
      setError('Feil passord. Prøv igjen.');
      // Shake effect can be added via class
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center border border-slate-100 animate-in fade-in zoom-in duration-300 relative">
        
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg rotate-3">
          <Shield size={30} />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">NHHI FC</h1>
        <p className="text-slate-400 text-xs mb-8 font-bold uppercase tracking-widest">Botkassa</p>

        {!selectedPlayer ? (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Søk navn..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
              />
            </div>

            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2 no-scrollbar">
              {filteredPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerClick(player)}
                  className="w-full flex items-center justify-between p-3 hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group active:scale-95"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-3 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      <UserIcon size={16} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-800 text-sm">{player.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                        {player.customRole || player.position || 'Spiller'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600" />
                </button>
              ))}
              {filteredPlayers.length === 0 && (
                <p className="text-slate-400 text-xs py-4 italic">Ingen spillere funnet</p>
              )}
            </div>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <button 
                onClick={() => setSelectedPlayer(null)}
                className="mb-6 text-xs font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800"
             >
                ← Tilbake til spillerliste
             </button>

             <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                  <UserIcon size={30} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">{selectedPlayer.name}</h2>
                <p className="text-[10px] text-slate-400 uppercase font-black">{selectedPlayer.customRole || 'Spiller'}</p>
             </div>

             <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Oppgi passord</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      autoFocus
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="••••"
                      className={`block w-full pl-10 pr-4 py-3 bg-slate-50 border ${error ? 'border-red-500 animate-shake' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 tracking-widest`}
                    />
                  </div>
                  {error && <p className="text-[10px] text-red-500 font-bold ml-1">{error}</p>}
                </div>

                <Button type="submit" fullWidth className="py-4 shadow-lg shadow-blue-200">
                  Logg inn
                </Button>

                <p className="text-[10px] text-slate-400 font-medium">
                  Standardpassord er <span className="font-bold">1234</span> for nye brukere.
                </p>
             </form>
          </div>
        )}
      </div>
    </div>
  );
};
