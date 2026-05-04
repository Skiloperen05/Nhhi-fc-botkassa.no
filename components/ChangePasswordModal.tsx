
import React, { useState } from 'react';
import { Button } from './Button';
import { KeyRound, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface ChangePasswordModalProps {
  onSave: (newPassword: string) => void;
  onCancel: () => void;
  playerName: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onSave, onCancel, playerName }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError('Passordet må være minst 4 tegn.');
      return;
    }
    if (newPassword === '1234') {
      setError('Du må velge et passord som ikke er standard (1234).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passordene er ikke like.');
      return;
    }

    onSave(newPassword);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop - blurred for focus */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"></div>

      {/* Modal */}
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300 p-8 text-center border border-white/20">
        
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg rotate-3">
          <KeyRound size={30} />
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-2">Sikkerhet først, {playerName.split(' ')[0]}!</h3>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Siden det er første gang du logger inn, må du lage deg et personlig passord for å sikre kontoen din.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nytt passord</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                        type="password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                        placeholder="••••"
                        className={`block w-full pl-10 pr-4 py-3 bg-slate-50 border ${error ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 tracking-widest`}
                        required
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gjenta passord</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CheckCircle2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                        placeholder="••••"
                        className={`block w-full pl-10 pr-4 py-3 bg-slate-50 border ${error ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 tracking-widest`}
                        required
                    />
                </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" fullWidth className="py-4 shadow-xl shadow-blue-200 mt-2">
                <span>Lagre og fortsett</span>
                <ArrowRight size={18} className="ml-2" />
            </Button>
        </form>
      </div>
    </div>
  );
};
