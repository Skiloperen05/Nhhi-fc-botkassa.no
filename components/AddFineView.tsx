
import React, { useState } from 'react';
import { Player, PresetFine, FineEntry } from '../types';
import { Button } from './Button';
import { generateRoast } from '../services/geminiService';
import { Check, Loader2, Sparkles, User, FileText, Banknote, Calendar, BellRing } from 'lucide-react';
import { PlayerSelect } from './PlayerSelect';

interface AddFineViewProps {
  onAddFine: (fine: FineEntry) => void;
  players: Player[];
  presetFines: PresetFine[];
}

export const AddFineView: React.FC<AddFineViewProps> = ({ onAddFine, players, presetFines }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePresetClick = (preset: PresetFine) => {
    setAmount(preset.amount);
    setCategory(preset.label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || amount <= 0 || !category) return;

    setIsGenerating(true);
    
    const player = players.find(p => p.id === selectedPlayerId);
    let aiComment = '';
    
    // Generate AI roast
    if (player) {
      aiComment = await generateRoast(player.name, category, description, amount);
    }

    const newFine: FineEntry = {
      id: crypto.randomUUID(),
      playerId: selectedPlayerId,
      amount,
      reason: category,
      description: description,
      aiComment,
      date: new Date(date).toISOString(),
      timestamp: new Date(date).getTime(),
      status: 'unpaid',
    };

    onAddFine(newFine);

    // Reset form
    setSelectedPlayerId('');
    setAmount(0);
    setCategory('');
    setDescription('');
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6 pb-24 relative">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <Banknote className="w-5 h-5 mr-2 text-blue-600" />
          Registrer ny bot
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Selection via Autocomplete */}
          <PlayerSelect 
            label="Synderen"
            placeholder="Søk etter spiller (f.eks 'try' for Trygve)..."
            selectedPlayerId={selectedPlayerId}
            onSelect={setSelectedPlayerId}
            players={players}
          />

          {/* Quick Select Presets */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Hva har skjedd?</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {presetFines.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`p-3 text-left border rounded-xl transition-all ${
                    category === preset.label 
                      ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-md' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xl mb-1">{preset.icon}</div>
                  <div className="text-xs font-semibold text-slate-900">{preset.label}</div>
                  <div className="text-xs text-slate-500">{preset.amount} kr</div>
                </button>
              ))}
            </div>
             {!category && (
                <p className="text-xs text-amber-600 mt-1">
                   * Velg en kategori fra listen over
                </p>
             )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            
            {/* Description Input (Details) */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Beskrivelse (Valgfritt)</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="F.eks: Kamp mot Neptun 2"
                        className="block w-full pl-10 border-gray-300 rounded-xl border py-3 text-base sm:text-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Beløp (NOK)</label>
                    <input
                        type="number"
                        value={amount === 0 ? '' : amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="0"
                        className="block w-full border-gray-300 rounded-xl border py-3 px-4 text-base sm:text-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
                        min="1"
                        required
                    />
                </div>
                 <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Dato</label>
                    <div className="relative">
                        {/* Enlarged Date Picker with appearance adjustments */}
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="block w-full px-4 py-3 border-gray-300 rounded-xl border text-base focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 h-[48px] sm:h-[46px] appearance-none"
                            required
                        />
                    </div>
                </div>
            </div>
          </div>

          <Button 
            type="submit" 
            fullWidth 
            disabled={isGenerating || !selectedPlayerId || amount <= 0 || !category}
            className="mt-6"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Behandler bot...
              </>
            ) : (
              <>
                <Sparkles className="-ml-1 mr-2 h-5 w-5" />
                Gi bot
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
