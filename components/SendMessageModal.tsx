import React, { useState } from 'react';
import { Button } from './Button';
import { PlayerSelect } from './PlayerSelect';
import { X, Send, Users } from 'lucide-react';
import { Player } from '../types';

interface SendMessageModalProps {
  onSend: (recipientId: string | 'all', subject: string, body: string) => void;
  onCancel: () => void;
  players: Player[];
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({ onSend, onCancel, players }) => {
  const [target, setTarget] = useState<'all' | 'single'>('all');
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) return;
    if (target === 'single' && !recipientId) return;

    onSend(target === 'all' ? 'all' : recipientId, subject, body);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-blue-600 px-6 py-4 border-b border-blue-700 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center">
            <Send className="w-5 h-5 mr-2" />
            Send melding
          </h3>
          <button onClick={onCancel} className="text-blue-200 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Target Selection */}
            <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Mottaker</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTarget('all')}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                            target === 'all' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Users size={16} className="inline mr-1 -mt-0.5" />
                        Alle spillere
                    </button>
                    <button
                        type="button"
                        onClick={() => setTarget('single')}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                            target === 'single' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        Enkeltspiller
                    </button>
                </div>
            </div>

            {target === 'single' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <PlayerSelect 
                        placeholder="Velg mottaker..."
                        selectedPlayerId={recipientId}
                        onSelect={setRecipientId}
                        players={players}
                    />
                </div>
            )}

            {/* Subject */}
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Emne</label>
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="F.eks: Viktig info om botkassen"
                    className="block w-full p-3 text-base sm:text-sm border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                    required
                />
            </div>

            {/* Body */}
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Melding</label>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Skriv meldingen her..."
                    rows={5}
                    className="block w-full p-3 text-base sm:text-sm border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 resize-none"
                    required
                />
            </div>

            <Button type="submit" fullWidth className="mt-2">
                Send melding
            </Button>
        </form>
      </div>
    </div>
  );
};