import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../types';
import { Search, X, User, ChevronRight } from 'lucide-react';

interface SearchModalProps {
  players: Player[];
  onSelect: (playerId: string) => void;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ players, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(query.toLowerCase()) ||
    player.customRole?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200">
        
        {/* Search Header */}
        <div className="flex items-center border-b border-slate-100 p-4 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk etter spiller..."
            className="flex-1 text-lg outline-none placeholder:text-slate-400 text-slate-900 bg-transparent"
          />
          <button 
            onClick={onClose}
            className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredPlayers.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {filteredPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => {
                    onSelect(player.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                      {player.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {player.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{player.position || 'Spiller'}</span>
                        {player.customRole && (
                          <>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="text-blue-600 font-medium">{player.customRole}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-400" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Ingen spillere funnet</p>
            </div>
          )}
        </div>
        
        {/* Footer Hint */}
        <div className="bg-slate-50 p-3 text-center text-[10px] text-slate-400 border-t border-slate-100">
            Viser {filteredPlayers.length} av {players.length} spillere
        </div>
      </div>
    </div>
  );
};