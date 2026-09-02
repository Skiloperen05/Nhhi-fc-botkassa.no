import React, { useState, useEffect, useMemo } from 'react';
import { Player, PresetFine, FineEntry } from '../types';
import { generateFineComment } from '../services/commentService';
import { 
  Search, 
  X, 
  Calendar, 
  ChevronRight, 
  Dices, 
  Check, 
  Plus, 
  Layers, 
  MessageSquare,
  Sparkles,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';

interface AddFineViewProps {
  onAddFine: (fine: FineEntry) => void;
  onAddFines?: (fines: FineEntry[]) => void;
  players: Player[];
  presetFines: PresetFine[];
  allFines?: FineEntry[];
  potTotal?: number;
  onTriggerToast?: (msg: string) => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
};

const getShortPresetLabel = (label: string): string => {
  const map: Record<string, string> = {
    'Forsein til trening': 'Forsein',
    'Forsein til kamp': 'Forsein kamp',
    'Forsein til GF': 'Forsein GF',
    'Forsein til inndrikking': 'Inndrikking',
    'Ikke svar til kamp i tide': 'Ikke svart',
    'Ikke svar til trening i tide': 'Ikke svart',
    'Påmeldt kamp, møter ikke': 'Møtte ikke',
    'Shot kompromiss': 'Shot',
    'Drar fra ballhenting etter kamp': 'Ballhenting',
    'Skjøt ball over nettet på trening': 'Over nettet',
    'Fantasy bot': 'Fantasy',
  };
  return map[label] || label;
};

const getTodayIso = () => new Date().toISOString().split('T')[0];
const getYesterdayIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export const AddFineView: React.FC<AddFineViewProps> = ({
  onAddFine,
  onAddFines,
  players,
  presetFines,
  allFines = [],
  onTriggerToast,
}) => {
  // 1. Calculate the 6 most frequently given fines ("i monitor")
  const { topSixPresets, otherPresets, frequencyMap } = useMemo(() => {
    const freq = new Map<string, number>();
    presetFines.forEach(p => freq.set(p.id, 0));

    allFines.forEach(fine => {
      const match = presetFines.find(p => 
        p.label.toLowerCase().trim() === fine.reason.toLowerCase().trim() ||
        p.id === fine.reason
      );
      if (match) {
        freq.set(match.id, (freq.get(match.id) || 0) + 1);
      }
    });

    // Primary sort: frequency count descending.
    // Secondary sort: default order in presetFines.
    const sorted = [...presetFines].sort((a, b) => {
      const countA = freq.get(a.id) || 0;
      const countB = freq.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      return presetFines.indexOf(a) - presetFines.indexOf(b);
    });

    return {
      topSixPresets: sorted.slice(0, 6),
      otherPresets: sorted.slice(6),
      frequencyMap: freq,
    };
  }, [presetFines, allFines]);

  // Selected Fine state
  const [selectedFine, setSelectedFine] = useState<PresetFine | null>(null);
  
  // Players selection state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playerSearch, setPlayerSearch] = useState<string>('');

  // Date selection state ('idag', 'igar', or custom date string)
  const [dateType, setDateType] = useState<'idag' | 'igar' | 'custom'>('idag');
  const [customDate, setCustomDate] = useState<string>('');

  // Comment state
  const [note, setNote] = useState<string>('');
  const [isCommentDirty, setIsCommentDirty] = useState<boolean>(false);

  // Modals / Sheets
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);
  const [isAllFinesModalOpen, setIsAllFinesModalOpen] = useState(false);
  const [allFinesSearch, setAllFinesSearch] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState<string>('50');
  const [customEmoji, setCustomEmoji] = useState('⚠️');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debt per player
  const playerDebtMap = useMemo(() => {
    const map = new Map<string, number>();
    allFines.forEach(f => {
      if (f.status === 'unpaid') {
        map.set(f.playerId, (map.get(f.playerId) || 0) + f.amount);
      }
    });
    return map;
  }, [allFines]);

  // Active sorted players
  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    if (!q) return players;
    return players.filter(p => p.name.toLowerCase().includes(q));
  }, [players, playerSearch]);

  const selectedPlayers = useMemo(() => {
    return players.filter(p => selectedPlayerIds.includes(p.id));
  }, [players, selectedPlayerIds]);

  // Date value
  const effectiveDate = useMemo(() => {
    if (dateType === 'idag') return getTodayIso();
    if (dateType === 'igar') return getYesterdayIso();
    return customDate || getTodayIso();
  }, [dateType, customDate]);

  const dateLabel = useMemo(() => {
    if (dateType === 'idag') return 'i dag';
    if (dateType === 'igar') return 'i går';
    if (customDate) {
      const d = new Date(customDate + 'T12:00:00');
      return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
    }
    return 'i dag';
  }, [dateType, customDate]);

  // Auto-generate comment whenever fine or syndere change (unless user manually typed something)
  useEffect(() => {
    if (!isCommentDirty) {
      if (selectedFine && selectedPlayerIds.length > 0) {
        const names = selectedPlayers.map(p => p.name.split(' ')[0]);
        const who = names.length === 1 
          ? names[0] 
          : names.length <= 3 
            ? names.slice(0, -1).join(', ') + ' og ' + names[names.length - 1] 
            : `${names.length} syndere`;
        const generated = generateFineComment(who, selectedFine.label, '', selectedFine.amount);
        setNote(generated);
      } else {
        setNote('');
      }
    }
  }, [selectedFine, selectedPlayerIds, isCommentDirty, selectedPlayers]);

  const handleRollDice = () => {
    if (!selectedFine || selectedPlayerIds.length === 0) return;
    const names = selectedPlayers.map(p => p.name.split(' ')[0]);
    const who = names.length === 1 
      ? names[0] 
      : names.length <= 3 
        ? names.slice(0, -1).join(', ') + ' og ' + names[names.length - 1] 
        : `${names.length} syndere`;
    const generated = generateFineComment(who, selectedFine.label, '', selectedFine.amount);
    setNote(generated);
    setIsCommentDirty(false);
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const isAllActiveSelected = players.length > 0 && selectedPlayerIds.length === players.length;
  const toggleAllPlayers = () => {
    if (isAllActiveSelected) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(players.map(p => p.id));
    }
  };

  // Selection readiness
  const isReady = !!selectedFine && selectedPlayerIds.length > 0;
  const totalSum = (selectedFine?.amount || 0) * selectedPlayerIds.length;

  const handleFinePick = (preset: PresetFine) => {
    if (selectedFine?.id === preset.id) {
      setSelectedFine(null);
    } else {
      setSelectedFine(preset);
    }
  };

  const handleCustomFineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const amt = parseInt(customAmount, 10) || 50;
    const customPreset: PresetFine = {
      id: `custom_${Date.now()}`,
      label: customName.trim(),
      amount: amt,
      icon: customEmoji || '⚠️',
    };
    setSelectedFine(customPreset);
    setIsAllFinesModalOpen(false);
    setIsCustomMode(false);
  };

  const handleConfirmFines = async () => {
    if (!selectedFine || selectedPlayerIds.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const fineTimestamp = new Date(effectiveDate + 'T12:00:00').getTime();
      const fineIso = new Date(effectiveDate + 'T12:00:00').toISOString();

      const newFines: FineEntry[] = selectedPlayerIds.map(playerId => ({
        id: crypto.randomUUID(),
        playerId,
        amount: selectedFine.amount,
        reason: selectedFine.label,
        description: note.trim() || undefined,
        aiComment: note.trim() || undefined,
        date: fineIso,
        timestamp: fineTimestamp,
        status: 'unpaid',
      }));

      if (onAddFines) {
        await onAddFines(newFines);
      } else {
        newFines.forEach(f => onAddFine(f));
      }

      if (onTriggerToast) {
        onTriggerToast(newFines.length === 1 ? 'Bot registrert!' : `${newFines.length} bøter registrert!`);
      }

      // Reset form after successful submission
      setSelectedFine(null);
      setSelectedPlayerIds([]);
      setNote('');
      setIsCommentDirty(false);
      setIsConfirmSheetOpen(false);
    } catch (err) {
      console.error('Failed to add fines:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if active fine is outside monitor (not in topSixPresets)
  const isSelectedFineOffMonitor = selectedFine && !topSixPresets.some(p => p.id === selectedFine.id);

  return (
    <div className="relative w-full h-full flex-1 min-h-0 flex flex-col">
      {/* ========================================================================= */}
      {/* 📱 MOBILVISNING (md:hidden): Fyller skjermen dynamisk fra topp til tå       */}
      {/* ========================================================================= */}
      <div className="md:hidden flex-1 min-h-0 h-full flex flex-col gap-2 overflow-hidden select-none">
        {/* 1 · BOTEN CARD (Litt større og behagelig trykkflate) */}
        <div className="flex-none bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">
                1 · Boten
              </span>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                Topp 6
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-600">
                {selectedFine ? `${selectedFine.amount} kr per synder` : 'Velg bot'}
              </span>
              <button
                type="button"
                onClick={() => setIsAllFinesModalOpen(true)}
                className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 px-2 py-0.5 rounded-md transition-all"
                title="Vis alle bøter"
              >
                <Layers size={10} className="text-slate-500" />
                <span>Flere ({presetFines.length - topSixPresets.length})</span>
              </button>
            </div>
          </div>

          {/* 3x2 Grid: The 6 Most Common Fines */}
          <div className="grid grid-cols-3 gap-1.5">
            {topSixPresets.map(preset => {
              const isSelected = selectedFine?.id === preset.id;
              const count = frequencyMap.get(preset.id) || 0;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleFinePick(preset)}
                  className={`relative flex flex-col items-center justify-center min-h-[48px] px-1 py-1 rounded-xl transition-all select-none ${
                    isSelected
                      ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-sm scale-[1.01]'
                      : 'bg-slate-50/80 text-slate-700 border border-slate-200/80 hover:border-blue-200 hover:bg-white active:scale-[0.98]'
                  }`}
                >
                  <span className="text-base leading-none mb-0.5">{preset.icon}</span>
                  <span className="font-bold text-[10px] leading-tight text-center truncate w-full px-0.5">
                    {getShortPresetLabel(preset.label)}
                  </span>
                  <span className={`text-[9px] font-semibold mt-0.5 leading-none ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    {preset.amount},-
                  </span>

                  {count > 0 && (
                    <span
                      className={`absolute top-0.5 right-0.5 text-[7px] font-black px-1 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* If user selected a fine from "Flere bøter" (off monitor) */}
          {isSelectedFineOffMonitor && selectedFine && (
            <div className="mt-1.5 px-2.5 py-1 bg-blue-50 border border-blue-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm flex-none">{selectedFine.icon}</span>
                <span className="text-[10px] font-bold text-blue-950 truncate">{selectedFine.label}</span>
                <span className="text-[9px] font-semibold text-blue-600 flex-none">({selectedFine.amount} kr)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAllFinesModalOpen(true)}
                className="text-[9px] font-black uppercase text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 ml-1.5"
              >
                Bytt
              </button>
            </div>
          )}
        </div>

        {/* 2 · SYNDERE CARD (Dynamisk og fleksibel: fyller all ledig plass i høyden) */}
        <div className="flex-1 min-h-0 bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between flex-none">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">
                2 · Syndere
              </span>
              {selectedPlayerIds.length > 0 && (
                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-full">
                  · {selectedPlayerIds.length} valgt
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={toggleAllPlayers}
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${
                isAllActiveSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isAllActiveSelected ? 'Fjern alle' : 'Hele laget'}
            </button>
          </div>

          {/* Slim Search Input */}
          <div className="relative flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            <input
              type="text"
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
              placeholder="Søk spiller..."
              className="w-full pl-7 pr-7 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {playerSearch.length > 0 && (
              <button
                type="button"
                onClick={() => setPlayerSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X size={9} />
              </button>
            )}
          </div>

          {/* Horisontal rad med valgte spillere hvis noen er krysset av */}
          {selectedPlayerIds.length > 0 && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 flex-none">
              {selectedPlayers.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlayer(p.id)}
                  className="inline-flex items-center gap-1 flex-none px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-2xs hover:bg-blue-700 active:scale-95"
                >
                  <span className="w-3 h-3 rounded-full bg-white/25 text-[7px] flex items-center justify-center font-bold">
                    {getInitials(p.name)}
                  </span>
                  <span className="max-w-[65px] truncate">{p.name.split(' ')[0]}</span>
                  <X size={8} className="opacity-80" />
                </button>
              ))}
            </div>
          )}

          {/* Spillerliste: flex-1 tilpasser seg automatisk høyden på mobilskjermen */}
          <div className="flex-1 min-h-[60px] overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/60 divide-y divide-slate-100">
            {filteredPlayers.length === 0 ? (
              <p className="text-center py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Ingen spillere funnet
              </p>
            ) : (
              filteredPlayers.map(p => {
                const isSelected = selectedPlayerIds.includes(p.id);
                const debt = playerDebtMap.get(p.id) || 0;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayer(p.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors select-none ${
                      isSelected
                        ? 'bg-blue-50 text-blue-950 font-semibold'
                        : 'hover:bg-white text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black flex-none ${
                        isSelected ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {getInitials(p.name)}
                    </span>
                    <span className="flex-1 min-w-0 text-[11px] font-bold truncate">
                      {p.name}
                    </span>
                    {debt > 0 && (
                      <span className="text-[9px] font-semibold text-slate-400 flex-none mr-1">
                        {debt},-
                      </span>
                    )}
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-none transition-all ${
                        isSelected
                          ? 'bg-blue-600 border border-blue-600 text-white'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={8} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 3 · NÅR & KOMMENTAR CARD */}
        <div className="flex-none bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">
              3 · Når
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setDateType('idag'); setCustomDate(''); }}
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${
                  dateType === 'idag'
                    ? 'bg-blue-600 text-white border-blue-600 font-black'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                I dag
              </button>
              <button
                type="button"
                onClick={() => { setDateType('igar'); setCustomDate(''); }}
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${
                  dateType === 'igar'
                    ? 'bg-blue-600 text-white border-blue-600 font-black'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                I går
              </button>
              <label
                className={`relative inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                  dateType === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                <Calendar size={9} />
                <span>{dateType === 'custom' && customDate ? dateLabel : 'Dato'}</span>
                <input
                  type="date"
                  value={customDate}
                  onChange={e => {
                    if (e.target.value) {
                      setDateType('custom');
                      setCustomDate(e.target.value);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>

          {/* Slim Comment input with Dice */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <MessageSquare size={12} className="text-blue-600 flex-none" />
            <input
              type="text"
              value={note}
              onChange={e => {
                setNote(e.target.value);
                setIsCommentDirty(true);
              }}
              placeholder="Botsjef-kommentar..."
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-[10px] font-medium text-slate-900 placeholder:text-slate-400"
            />
            {selectedFine && selectedPlayerIds.length > 0 && (
              <button
                type="button"
                onClick={handleRollDice}
                className="p-1 rounded bg-white text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-2xs active:rotate-12 transition-transform"
                title="Generer ny botsjef-kommentar"
              >
                <Dices size={12} />
              </button>
            )}
          </div>
        </div>

        {/* 4 · STICKY CTA BUTTON */}
        <div className="flex-none pt-0.5">
          <button
            type="button"
            disabled={!isReady}
            onClick={() => setIsConfirmSheetOpen(true)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
              isReady
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-[0.99] cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider opacity-80 leading-none">
                {isReady
                  ? `${selectedPlayerIds.length} ${selectedPlayerIds.length === 1 ? 'synder' : 'syndere'} · ${dateLabel}`
                  : 'Mangler valg'}
              </span>
              <span className="text-sm font-black tracking-tight mt-0.5 leading-none">
                {isReady ? `${totalSum.toLocaleString('nb-NO')} kr` : 'Velg bot og syndere'}
              </span>
            </div>

            <div className="flex items-center gap-1 font-black text-xs">
              <span>{isReady ? 'Gi bot' : ''}</span>
              {isReady && <ChevronRight size={16} strokeWidth={3} />}
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 💻 DESKTOPVISNING (hidden md:grid): Romslig 2-kolonners layout             */}
      {/* ========================================================================= */}
      <div className="hidden md:grid md:grid-cols-12 gap-6 items-start pb-12">
        {/* VENSTRE KOLONNE (7 av 12): Boten + Når & Kommentar */}
        <div className="md:col-span-7 space-y-6">
          {/* Seksjon 1: Boten */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black tracking-widest uppercase text-blue-600">
                    Seksjon 1
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Topp 6 mest brukte i NHHI FC
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Velg bot</h2>
              </div>

              <button
                type="button"
                onClick={() => setIsAllFinesModalOpen(true)}
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 px-3 py-2 rounded-xl transition-all border border-slate-200/80 shadow-2xs"
              >
                <Layers size={15} className="text-slate-500" />
                <span>Bibliotek ({presetFines.length})</span>
              </button>
            </div>

            {/* 3x2 Grid med generøse kort */}
            <div className="grid grid-cols-3 gap-3">
              {topSixPresets.map(preset => {
                const isSelected = selectedFine?.id === preset.id;
                const count = frequencyMap.get(preset.id) || 0;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleFinePick(preset)}
                    className={`relative flex flex-col items-center justify-center min-h-[85px] p-3 rounded-2xl transition-all select-none text-center ${
                      isSelected
                        ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-lg shadow-blue-500/25 scale-[1.02]'
                        : 'bg-white text-slate-800 border border-slate-200 hover:border-blue-300 hover:bg-slate-50 active:scale-[0.98]'
                    }`}
                  >
                    <span className="text-2xl mb-1">{preset.icon}</span>
                    <span className="font-bold text-xs leading-tight line-clamp-1 w-full px-1">
                      {preset.label}
                    </span>
                    <span className={`text-xs font-semibold mt-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {preset.amount} kr
                    </span>

                    {count > 0 && (
                      <span
                        className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                        title={`Tildelt ${count} ganger`}
                      >
                        {count}×
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* If off-monitor fine is selected */}
            {isSelectedFineOffMonitor && selectedFine && (
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-500 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl flex-none">{selectedFine.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-blue-950 truncate">
                      {selectedFine.label}
                    </div>
                    <div className="text-xs font-semibold text-blue-600 mt-0.5">
                      {selectedFine.amount} kr per synder · Valgt fra bibliotek
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAllFinesModalOpen(true)}
                  className="text-xs font-black uppercase tracking-wider text-blue-700 bg-white px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-100 flex-none ml-3"
                >
                  Bytt bot
                </button>
              </div>
            )}
          </div>

          {/* Seksjon 3: Dato & botsjef-kommentar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black tracking-widest uppercase text-blue-600">
                  Seksjon 3
                </span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Dato & Botsjef-kommentar</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setDateType('idag'); setCustomDate(''); }}
                  className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all ${
                    dateType === 'idag'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  I dag
                </button>
                <button
                  type="button"
                  onClick={() => { setDateType('igar'); setCustomDate(''); }}
                  className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all ${
                    dateType === 'igar'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  I går
                </button>
                <label
                  className={`relative inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border cursor-pointer transition-all ${
                    dateType === 'custom'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Calendar size={14} />
                  <span>{dateType === 'custom' && customDate ? dateLabel : 'Annen dato'}</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => {
                      if (e.target.value) {
                        setDateType('custom');
                        setCustomDate(e.target.value);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            </div>

            {/* Botsjef-kommentar editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500">
                  Botsjef-kommentar (automatisk generert eller egen tekst)
                </label>
                {selectedFine && selectedPlayerIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRollDice}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Dices size={14} />
                    <span>Rull ny kommentar</span>
                  </button>
                )}
              </div>
              <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <MessageSquare size={18} className="text-blue-600 flex-none mt-0.5" />
                <textarea
                  rows={2}
                  value={note}
                  onChange={e => {
                    setNote(e.target.value);
                    setIsCommentDirty(true);
                  }}
                  placeholder="Skriv en forklaring eller la botsjefens autokommentar stå..."
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* HØYRE KOLONNE (5 av 12): Syndere + Oppsummering */}
        <div className="md:col-span-5 space-y-6">
          {/* Seksjon 2: Syndere */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black tracking-widest uppercase text-blue-600">
                    Seksjon 2
                  </span>
                  {selectedPlayerIds.length > 0 && (
                    <span className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {selectedPlayerIds.length} valgt
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Hvem skal ha boten?</h3>
              </div>

              <button
                type="button"
                onClick={toggleAllPlayers}
                className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all ${
                  isAllActiveSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isAllActiveSelected ? 'Fjern alle' : 'Velg hele laget'}
              </button>
            </div>

            {/* Søk spiller */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                placeholder="Søk etter spiller..."
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
              />
              {playerSearch.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPlayerSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Valgte spillere tags */}
            {selectedPlayerIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-1">
                {selectedPlayers.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayer(p.id)}
                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold hover:bg-blue-100 transition-all"
                  >
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                      {getInitials(p.name)}
                    </span>
                    <span>{p.name.split(' ')[0]}</span>
                    <X size={12} className="text-blue-500 hover:text-blue-800" />
                  </button>
                ))}
              </div>
            )}

            {/* Spillerliste med scroll */}
            <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50/50 divide-y divide-slate-100">
              {filteredPlayers.length === 0 ? (
                <p className="text-center py-8 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ingen spillere funnet
                </p>
              ) : (
                filteredPlayers.map(p => {
                  const isSelected = selectedPlayerIds.includes(p.id);
                  const debt = playerDebtMap.get(p.id) || 0;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayer(p.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors select-none ${
                        isSelected
                          ? 'bg-blue-50 text-blue-950 font-semibold'
                          : 'hover:bg-white text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-none ${
                          isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {getInitials(p.name)}
                      </span>
                      <span className="flex-1 min-w-0 text-xs font-bold truncate">
                        {p.name}
                      </span>
                      {debt > 0 && (
                        <span className="text-xs font-semibold text-slate-400 flex-none mr-2">
                          {debt} kr gjeld
                        </span>
                      )}
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-none transition-all ${
                          isSelected
                            ? 'bg-blue-600 border border-blue-600 text-white'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Oppsummering & CTA for PC */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black tracking-widest uppercase text-slate-400">
              Oppsummering
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Valgt bot:</span>
                <span className="font-bold text-slate-900">
                  {selectedFine ? `${selectedFine.icon} ${selectedFine.label}` : 'Ingen valgt'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Beløp per synder:</span>
                <span className="font-bold text-slate-900">
                  {selectedFine ? `${selectedFine.amount} kr` : '0 kr'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Antall syndere:</span>
                <span className="font-bold text-slate-900">{selectedPlayerIds.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Dato:</span>
                <span className="font-bold text-slate-900">{dateLabel}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Total økning i lagkassen:
                </span>
                <span className="text-2xl font-black text-blue-600">
                  {totalSum.toLocaleString('nb-NO')} kr
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!isReady}
              onClick={() => setIsConfirmSheetOpen(true)}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                isReady
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 active:scale-[0.99] cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Sparkles size={16} />
              <span>{isReady ? `Registrer ${selectedPlayerIds.length} ${selectedPlayerIds.length === 1 ? 'bot' : 'bøter'}` : 'Velg bot og syndere'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 · BEKREFTELSESSKUFF (BOTTOM SHEET CONFIRMATION) */}
      {isConfirmSheetOpen && selectedFine && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="flex-1 cursor-pointer" 
            onClick={() => setIsConfirmSheetOpen(false)} 
          />
          <div className="bg-white rounded-t-3xl p-6 shadow-2xl border-t border-slate-200 max-w-lg mx-auto w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
            
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                  Bekreft registrering
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl">{selectedFine.icon}</span>
                  <span className="text-lg font-black text-slate-900 tracking-tight">
                    {selectedFine.label}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  {selectedFine.amount} kr × {selectedPlayerIds.length} {selectedPlayerIds.length === 1 ? 'synder' : 'syndere'} · {dateLabel}
                </div>
              </div>

              <div className="text-right flex-none">
                <div className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                  Total
                </div>
                <div className="text-2xl font-black text-blue-600 tracking-tight">
                  {totalSum.toLocaleString('nb-NO')} kr
                </div>
              </div>
            </div>

            {/* Syndere Preview */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2">
                Syndere ({selectedPlayerIds.length})
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedPlayers.map(p => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-bold"
                  >
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                      {getInitials(p.name)}
                    </span>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Note callout */}
            {note.trim() && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-medium text-amber-900 leading-relaxed">
                <span className="font-bold mr-1">Botsjef:</span> {note}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsConfirmSheetOpen(false)}
                className="flex-none px-5 py-3.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmFines}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Bekreft {selectedPlayerIds.length} {selectedPlayerIds.length === 1 ? 'bot' : 'bøter'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6 · FLERE BØTER / MODAL FOR OFF-MONITOR & ALL PRESETS */}
      {isAllFinesModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-none">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isCustomMode ? 'Egendefinert bot' : 'Velg bot fra bibliotek'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {isCustomMode ? 'Opprett en engangsbot med valgfritt beløp' : 'Alle tilgjengelige bøter i NHHI FC'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAllFinesModalOpen(false);
                  setIsCustomMode(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Toggle between Preset list and Custom fine */}
            <div className="flex bg-slate-100 p-1 rounded-xl my-3 flex-none">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                  !isCustomMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Forhåndsdefinerte ({presetFines.length})
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                  isCustomMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Egendefinert bot
              </button>
            </div>

            {!isCustomMode ? (
              <>
                {/* Search in presets */}
                <div className="relative mb-3 flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    value={allFinesSearch}
                    onChange={e => setAllFinesSearch(e.target.value)}
                    placeholder="Søk blant alle bøter..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-slate-900 font-medium"
                  />
                </div>

                {/* List of presets with in-monitor indicator */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {presetFines
                    .filter(p => p.label.toLowerCase().includes(allFinesSearch.toLowerCase()))
                    .sort((a, b) => (frequencyMap.get(b.id) || 0) - (frequencyMap.get(a.id) || 0))
                    .map(preset => {
                      const count = frequencyMap.get(preset.id) || 0;
                      const isInMonitor = topSixPresets.some(top => top.id === preset.id);
                      const isSelected = selectedFine?.id === preset.id;

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedFine(preset);
                            setIsAllFinesModalOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                              : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl flex-none">{preset.icon}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {preset.label}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-semibold text-slate-400">
                                  Gitt {count} {count === 1 ? 'gang' : 'ganger'}
                                </span>
                                {isInMonitor && (
                                  <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                                    I monitor
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-none ml-2">
                            <span className="text-xs font-black text-slate-900">
                              {preset.amount} kr
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </>
            ) : (
              /* Custom Fine Form */
              <form onSubmit={handleCustomFineSubmit} className="space-y-4 pt-1 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hva gjelder boten?
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="F.eks. Glemte drakta, feil sko..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Beløp (NOK)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-blue-500 text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ikon / Emoji
                    </label>
                    <div className="flex items-center gap-1.5">
                      {['⚠️', '🤡', '🍺', '⚽', '🏃', '💰'].map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setCustomEmoji(em)}
                          className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                            customEmoji === em ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-slate-100 hover:bg-slate-200'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-blue-700 transition-all mt-4"
                >
                  Velg denne egendefinerte boten
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
