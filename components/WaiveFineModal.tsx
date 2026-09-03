import { useSaveAction } from '../hooks/useSaveAction';
import { SaveStatus } from './SaveStatus';
import React, { useState } from 'react';
import { FineEntry, Player } from '../types';
import { X, FileX2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface WaiveFineModalProps {
  fine?: FineEntry | null;
  player?: Player | null;
  isBulk?: boolean;
  bulkCount?: number;
  bulkAmount?: number;
  onConfirm: (reason: string) => Promise<boolean>;
  onCancel: () => void;
}

const PRESET_REASONS = [
  'Anses som tapt / uinnkrevbar',
  'Spilleren har forlatt klubben',
  'Botsjef-amnesti / spesiell avtale',
  'Feilregistrert eller foreldet bot',
];

export const WaiveFineModal: React.FC<WaiveFineModalProps> = ({
  fine,
  player,
  isBulk = false,
  bulkCount = 0,
  bulkAmount = 0,
  onConfirm,
  onCancel,
}) => {
  const { isSaving, saveError, runSave } = useSaveAction();
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');

  const effectiveReason = customReason.trim() ? customReason.trim() : selectedPreset;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSave(() => onConfirm(effectiveReason), onCancel);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => { if (!isSaving) onCancel(); }}
      />

      {/* Modal Kort */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <FileX2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isBulk ? 'Ettergi all utestående gjeld' : 'Ettergi / Tapsfør bot'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {player?.name || 'Spiller'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { if (!isSaving) onCancel(); }}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <SaveStatus isSaving={isSaving} saveError={saveError} />
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Oppsummeringsboks */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
            {isBulk ? (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Antall bøter</div>
                  <div className="text-lg font-bold text-slate-800">{bulkCount} ubetalte bøter</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total ettergis</div>
                  <div className="text-2xl font-black text-purple-700">{bulkAmount.toLocaleString('nb-NO')} kr</div>
                </div>
              </div>
            ) : fine ? (
              <div className="flex justify-between items-center">
                <div className="pr-4">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {new Date(fine.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-sm font-bold text-slate-800">{fine.reason}</div>
                  {fine.description && (
                    <div className="text-xs text-slate-500 italic truncate max-w-[200px]">"{fine.description}"</div>
                  )}
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="text-2xl font-black text-purple-700">{fine.amount} kr</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Tapsføres</div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Forklaring */}
          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
            <AlertCircle size={16} className="text-purple-600 shrink-0 mt-0.5" />
            <span>
              Boten vil ikke lenger regnes som utestående gjeld for spilleren eller laget. Historikken beholdes med status <strong>Tapsført</strong>, og du kan gjenåpne den når som helst.
            </span>
          </div>

          {/* Valg av årsak */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Hvorfor ettergis boten?
            </label>
            <div className="space-y-1.5">
              {PRESET_REASONS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    setSelectedPreset(preset);
                    setCustomReason('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    selectedPreset === preset && !customReason.trim()
                      ? 'bg-purple-50 text-purple-900 border-purple-300 font-bold shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Egendefinert notat */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Eventuell merknad / spesifisering (valgfritt):
            </label>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="F.eks: 'Flyttet til utlandet høst 2026'..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Handlingsknapper */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => { if (!isSaving) onCancel(); }}
              className="flex-1 py-3 px-4 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Avbryt
            </button>
            <Button
              type="submit" disabled={isSaving}
              className="flex-[1.5] py-3 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold shadow-md shadow-purple-900/10"
            >
              <FileX2 size={16} className="mr-1.5 inline-block" />
              Bekreft ettergivelse
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
