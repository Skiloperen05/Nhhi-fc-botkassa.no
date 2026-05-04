import React from 'react';
import { FineEntry, Player } from '../types';
import { Check, X, Gavel, Coins } from 'lucide-react';

interface AdminComplaintViewProps {
  fines: FineEntry[];
  players: Player[];
  onHandleComplaint: (fineId: string, approved: boolean) => void;
  onHandlePayment: (fineId: string, approved: boolean) => void;
}

export const AdminComplaintView: React.FC<AdminComplaintViewProps> = ({ fines, players, onHandleComplaint, onHandlePayment }) => {
  const pendingComplaints = fines.filter(f => f.complaint && f.complaint.status === 'pending');
  const pendingPayments = fines.filter(f => f.payRequest && f.payRequest.status === 'pending');

  return (
    <div className="space-y-8 pb-24">
      
      {/* --- PAYMENT REQUESTS --- */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center text-green-700">
                <Coins className="w-5 h-5 mr-2"/>
                Godkjenn Betalinger
            </h2>
            <p className="text-sm text-slate-500">
                {pendingPayments.length} betalinger venter på registrering.
            </p>
        </div>

        {pendingPayments.length > 0 ? (
            pendingPayments.map(fine => {
                const player = players.find(p => p.id === fine.playerId);
                return (
                    <div key={fine.id} className="bg-white rounded-xl p-5 shadow-sm border border-green-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                        
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h3 className="font-bold text-slate-900">{player?.name}</h3>
                                <p className="text-xs text-slate-400">Har betalt inn:</p>
                            </div>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-lg font-bold">{fine.amount} kr</span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm">
                            <span className="text-slate-500">Gjelder bot: </span>
                            <span className="font-medium text-slate-900">{fine.reason}</span>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => onHandlePayment(fine.id, false)}
                                className="flex-1 flex items-center justify-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                <X size={16} className="mr-2" />
                                Avvis
                            </button>
                            <button 
                                onClick={() => onHandlePayment(fine.id, true)}
                                className="flex-1 flex items-center justify-center py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Check size={16} className="mr-2" />
                                Godkjenn
                            </button>
                        </div>
                    </div>
                );
            })
        ) : (
             <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">Ingen betalinger å behandle.</p>
            </div>
        )}
      </div>

      {/* --- COMPLAINTS --- */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center text-amber-700">
                <Gavel className="w-5 h-5 mr-2"/>
                Klagebehandling
            </h2>
            <p className="text-sm text-slate-500">
                {pendingComplaints.length} klager venter på dommen din.
            </p>
        </div>

        {pendingComplaints.length > 0 ? (
            pendingComplaints.map(fine => {
                const player = players.find(p => p.id === fine.playerId);
                return (
                    <div key={fine.id} className="bg-white rounded-xl p-5 shadow-sm border border-amber-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                        
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-slate-900">{player?.name}</h3>
                                <p className="text-xs text-slate-400">{new Date(fine.date).toLocaleDateString()}</p>
                            </div>
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold">{fine.amount} kr</span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm">
                            <div className="flex items-center text-slate-500 text-xs uppercase font-bold mb-1">
                                Bot: {fine.reason}
                            </div>
                            <div className="italic text-slate-800">
                                "{fine.complaint?.reason}"
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => onHandleComplaint(fine.id, false)}
                                className="flex-1 flex items-center justify-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                <X size={16} className="mr-2" />
                                Avvis (Behold bot)
                            </button>
                            <button 
                                onClick={() => onHandleComplaint(fine.id, true)}
                                className="flex-1 flex items-center justify-center py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Check size={16} className="mr-2" />
                                Godkjenn (Slett bot)
                            </button>
                        </div>
                    </div>
                );
            })
        ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">Ingen klager å behandle.</p>
            </div>
        )}
      </div>
    </div>
  );
};