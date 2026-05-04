import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../types';
import { Search, User, Check } from 'lucide-react';
import { DEFAULT_PLAYERS } from '../constants'; // Fallback

interface PlayerSelectProps {
  label?: string;
  placeholder?: string;
  onSelect: (playerId: string) => void;
  selectedPlayerId?: string; // For controlled component usage
  players?: Player[]; // Optional prop, fallback to constants
}

export const PlayerSelect: React.FC<PlayerSelectProps> = ({ 
  label, 
  placeholder = "Søk etter navn...", 
  onSelect,
  selectedPlayerId,
  players = DEFAULT_PLAYERS
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // If a player is pre-selected or selected externally, update query to show name
  useEffect(() => {
    if (selectedPlayerId) {
        const p = players.find(pl => pl.id === selectedPlayerId);
        if (p) setQuery(p.name);
    } else {
        setQuery('');
    }
  }, [selectedPlayerId, players]);

  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (player: Player) => {
    setQuery(player.name);
    onSelect(player.id);
    setIsOpen(false);
  };

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="space-y-2" ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              if (e.target.value === '') {
                  onSelect(''); // Clear selection if input is cleared
              }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-4 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl border bg-white text-slate-900 shadow-sm"
        />
        
        {/* Dropdown list */}
        {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm animate-in fade-in zoom-in-95 duration-100">
                {filteredPlayers.length > 0 ? (
                    filteredPlayers.map((player) => (
                        <div
                            key={player.id}
                            className="cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-blue-50 transition-colors group"
                            onClick={() => handleSelect(player)}
                        >
                            <div className="flex items-center">
                                <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mr-3 group-hover:bg-blue-200 group-hover:text-blue-600 transition-colors">
                                    <User size={14} />
                                </span>
                                <span className="block truncate font-medium text-slate-700 group-hover:text-slate-900">
                                    {player.name}
                                </span>
                            </div>
                            
                            {selectedPlayerId === player.id && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                                    <Check className="h-5 w-5" aria-hidden="true" />
                                </span>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="cursor-default select-none relative py-3 pl-3 pr-9 text-slate-500 italic text-center">
                        Ingen spillere funnet
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};