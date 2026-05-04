import React from 'react';
import { FineEntry, User, Message, Player } from '../types';
import { Bell, AlertCircle, CheckCircle2, DollarSign, Wallet, Mail, Users, Send } from 'lucide-react';

interface NotificationsViewProps {
  user: User;
  fines: FineEntry[];
  messages?: Message[];
  players: Player[];
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ user, fines, messages = [], players }) => {
  
  // Admin sees pending complaints AND pending payments
  const pendingComplaints = fines.filter(f => f.complaint?.status === 'pending');
  const pendingPayments = fines.filter(f => f.payRequest?.status === 'pending');
  
  // Mix fines and messages for display
  const relevantMessages = messages.filter(m => 
      user.role === 'admin' 
      ? m.senderId === user.id // Admin sees sent messages
      : (m.recipientId === 'all' || m.recipientId === user.id)
  );

  const adminItems = [
      ...pendingPayments.map(f => ({ ...f, type: 'payment', sortTime: f.timestamp })),
      ...pendingComplaints.map(f => ({ ...f, type: 'complaint', sortTime: f.timestamp })),
      ...relevantMessages.map(m => ({ ...m, type: 'message', sortTime: m.timestamp })) // Add sent messages to admin
  ];

  const userItems = [
      ...fines
        .filter(f => f.playerId === user.id)
        .filter(f => {
            // Only show recent fines (e.g., last 30 days) in notifications to avoid clutter
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return new Date(f.date) > thirtyDaysAgo;
        })
        .map(f => ({ ...f, type: 'fine', sortTime: f.timestamp })),
      ...relevantMessages.map(m => ({ ...m, type: 'message', sortTime: m.timestamp }))
  ];

  const items = user.role === 'admin' ? adminItems : userItems;
  const sortedItems = items.sort((a, b) => b.sortTime - a.sortTime);

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-slate-600"/>
            {user.role === 'admin' ? 'Oppgaver & Varsler' : 'Dine Varsler'}
        </h2>
        <p className="text-sm text-slate-500">
            {user.role === 'admin' 
                ? 'Her ser du innkomne oppgaver og utsendte meldinger.' 
                : 'Her ser du dine siste bøter og meldinger fra botsjefen.'}
        </p>
      </div>

      <div className="space-y-3">
        {sortedItems.length > 0 ? (
            sortedItems.map((item: any) => {
                
                // --- MESSAGE CARD ---
                if (item.type === 'message') {
                    const isGlobal = item.recipientId === 'all';
                    const isSender = item.senderId === user.id;
                    const recipientName = !isGlobal && isSender 
                        ? players.find(p => p.id === item.recipientId)?.name 
                        : null;

                    return (
                        <div key={item.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 flex items-start gap-3 ${isSender ? 'border-slate-400' : 'border-indigo-500'}`}>
                             <div className={`p-2 rounded-full shrink-0 mt-1 ${isSender ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                                {isSender 
                                    ? <Send size={20} /> 
                                    : (isGlobal ? <Users size={20} /> : <Mail size={20} />)
                                }
                            </div>
                            <div className="w-full">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        {isSender ? `Du sendte: ${item.subject}` : item.subject}
                                    </h3>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs font-medium mb-2 opacity-70">
                                    {isSender 
                                        ? (isGlobal ? 'Til: Alle spillere' : `Til: ${recipientName || 'Ukjent'}`)
                                        : (isGlobal ? 'Fra Botsjefen (Felles)' : 'Fra Botsjefen (Privat)')
                                    }
                                </p>
                                <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                                    {item.body}
                                </p>
                            </div>
                        </div>
                    );
                }

                // --- ADMIN CARDS ---
                if (user.role === 'admin') {
                    const player = players.find(p => p.id === item.playerId);
                    
                    if (item.type === 'payment') {
                        return (
                             <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500 flex items-start gap-3">
                                <div className="bg-green-100 p-2 rounded-full text-green-600 shrink-0 mt-1">
                                    <Wallet size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Betaling registrert</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{new Date(item.payRequest.date).toLocaleDateString()}</p>
                                    <p className="text-sm text-slate-700 mt-2">
                                        <span className="font-bold">{player?.name}</span> har markert boten for 
                                        <span className="italic"> {item.reason}</span> ({item.amount} kr) som betalt.
                                    </p>
                                </div>
                            </div>
                        );
                    }
                    // Complaint
                    return (
                        <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400 flex items-start gap-3">
                            <div className="bg-amber-100 p-2 rounded-full text-amber-600 shrink-0 mt-1">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Ny klage fra {player?.name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{new Date(item.date).toLocaleDateString()}</p>
                                <p className="text-sm text-slate-700 mt-2 bg-slate-50 p-2 rounded italic">"{item.complaint?.reason}"</p>
                                <div className="mt-2 text-xs font-semibold text-slate-900">Gjelder: {item.reason} ({item.amount} kr)</div>
                            </div>
                        </div>
                    );
                } else {
                    // --- USER FINE CARD ---
                    return (
                        <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500 flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0 mt-1">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Ny bot registrert</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{new Date(item.date).toLocaleDateString()}</p>
                                <div className="mt-2 text-sm text-slate-800">
                                    Du har fått <strong>{item.amount} kr</strong> i bot for: <br/>
                                    <span className="text-slate-600">{item.reason}</span>
                                </div>
                                {item.aiComment && (
                                    <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-100 pt-2">
                                        " {item.aiComment} "
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                }
            })
        ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <CheckCircle2 size={32} />
                </div>
                <p className="text-slate-400 font-medium">Ingen nye varsler</p>
                <p className="text-xs text-slate-400 mt-1">Du er helt à jour!</p>
            </div>
        )}
      </div>
    </div>
  );
};