import React, { useState } from 'react';
import { FineEntry } from '../types';
import { Button } from './Button';
import { X, MessageCircleWarning } from 'lucide-react';

interface ComplaintModalProps {
  fine: FineEntry;
  onConfirm: (fineId: string, reason: string) => void;
  onCancel: () => void;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({ fine, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(reason.trim()) {
        onConfirm(fine.id, reason);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex justify-between items-center">
          <h3 className="font-bold text-amber-900 flex items-center">
            <MessageCircleWarning className="w-5 h-5 mr-2" />
            Klag på bot
          </h3>
          <button onClick={onCancel} className="text-amber-800/50 hover:text-amber-800 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="font-semibold text-slate-900 mb-1">{fine.reason}</p>
                <p>Beløp: {fine.amount} kr</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(fine.date).toLocaleDateString()}</p>
            </div>
          
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Begrunnelse for klage</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Hvorfor er denne boten urettferdig?"
                    rows={4}
                    className="block w-full p-3 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white text-slate-900 resize-none"
                    required
                />
            </div>

            <Button type="submit" fullWidth className="bg-amber-500 hover:bg-amber-600 text-white border-transparent">
                Send inn klage
            </Button>
        </form>
      </div>
    </div>
  );
};