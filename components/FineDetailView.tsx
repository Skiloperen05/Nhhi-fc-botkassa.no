
import React, { useState } from 'react';
import { FineEntry, Player, Comment, Reaction, PresetFine } from '../types';
import { ChevronLeft, User, Calendar, Quote, MessageSquare, Send, SmilePlus, Trash2, Settings, DollarSign, MessageCircleWarning, Info, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { EditFineModal } from './EditFineModal';
import { ComplaintModal } from './ComplaintModal';

interface FineDetailViewProps {
  fine: FineEntry;
  player: Player;
  currentUser?: { id: string; name: string; role: string };
  presetFines: PresetFine[];
  onBack: () => void;
  onGoToProfile: (playerId: string) => void;
  onAddComment: (fineId: string, text: string) => void;
  onDeleteComment: (fineId: string, commentId: string) => void;
  onToggleFineReaction: (fineId: string, emoji: string) => void;
  onToggleCommentReaction: (fineId: string, commentId: string, emoji: string) => void;
  onUpdateFine: (fine: FineEntry) => void;
  onDeleteFine: (fineId: string) => void;
  onAdminPay: (fineId: string) => void;
}

const REACTION_EMOJIS = ['👍', '👎', '😄', '❤️', '🍺', '⚽', '🟥', '🔥', '💀'];

const ReactionPicker: React.FC<{
  reactions?: Reaction[];
  onToggle: (emoji: string) => void;
  currentUserId?: string;
}> = ({ reactions = [], onToggle, currentUserId }) => {
  const [showPicker, setShowPicker] = useState(false);

  const counts: Record<string, number> = {};
  const userReacted: Record<string, boolean> = {};

  reactions.forEach(r => {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    if (currentUserId && r.userId === currentUserId) {
      userReacted[r.emoji] = true;
    }
  });

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {Object.entries(counts).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm border transition-all ${
            userReacted[emoji] 
              ? 'bg-blue-100 border-blue-300 text-blue-800' 
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>{emoji}</span>
          <span className="font-bold text-xs">{count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
        >
          <SmilePlus size={16} />
        </button>

        {showPicker && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowPicker(false)}
            ></div>
            <div className="absolute top-10 left-0 z-20 bg-white shadow-xl border border-slate-100 rounded-xl p-2 flex gap-1 animate-in fade-in zoom-in duration-200 min-w-[280px] flex-wrap">
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggle(emoji);
                    setShowPicker(false);
                  }}
                  className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-slate-100 transition-colors ${
                     userReacted[emoji] ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const FineDetailView: React.FC<FineDetailViewProps> = ({ 
  fine, 
  player, 
  currentUser, 
  presetFines,
  onBack, 
  onGoToProfile, 
  onAddComment,
  onDeleteComment,
  onToggleFineReaction,
  onToggleCommentReaction,
  onUpdateFine,
  onDeleteFine,
  onAdminPay
}) => {
  const [commentText, setCommentText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  
  const isPaid = fine.status === 'paid';
  const isAdmin = currentUser?.role === 'admin';
  const isMine = currentUser?.id === player.id;
  const hasPendingAction = fine.complaint?.status === 'pending' || fine.payRequest?.status === 'pending';

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
        onAddComment(fine.id, commentText);
        setCommentText('');
    }
  };

  const handlePayRequest = () => {
      // Logic handled via onUpdateFine to trigger App's saveFine
      onUpdateFine({...fine, payRequest: { status: 'pending', date: new Date().toISOString() }});
  };

  const handleComplaintSubmit = (fid: string, reason: string) => {
      onUpdateFine({...fine, complaint: { reason, status: 'pending', date: new Date().toISOString() }});
      setShowComplaintModal(false);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="bg-blue-900 -mx-4 -mt-10 pt-10 pb-12 px-6 rounded-b-[2rem] shadow-lg mb-4 text-white">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
                <button 
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-blue-800 text-blue-100 transition-colors"
                >
                <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-white">Botdetaljer</h2>
            </div>
            
            {isAdmin && (
                <button 
                    onClick={() => setShowEditModal(true)}
                    className="p-2 bg-blue-800 text-blue-100 rounded-lg hover:bg-blue-700 transition-colors"
                    title="Innstillinger for bot"
                >
                    <Settings size={20} />
                </button>
            )}
        </div>

        {/* Action Buttons for Player (as drawn in Sketch 2) */}
        {isMine && !isPaid && (
            <div className="mt-6 flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                {!hasPendingAction ? (
                    <>
                        <button 
                            onClick={handlePayRequest}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 border border-green-500 rounded-2xl text-xs font-black uppercase transition-all shadow-lg active:scale-95"
                        >
                            <DollarSign size={16} />
                            Betalt
                        </button>
                        <button 
                            onClick={() => setShowComplaintModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 border border-amber-400 rounded-2xl text-xs font-black uppercase transition-all shadow-lg active:scale-95"
                        >
                            <MessageCircleWarning size={16} />
                            Klag
                        </button>
                    </>
                ) : (
                    <div className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/20 rounded-2xl text-[10px] font-black uppercase text-blue-200">
                        <Info size={14} />
                        Venter på behandling
                    </div>
                )}
            </div>
        )}
        
        {isPaid && (
            <div className="mt-4 flex items-center justify-center gap-2 text-green-400 text-[10px] font-black uppercase tracking-widest bg-white/5 py-2 rounded-xl">
                <CheckCircle2 size={14} /> Denne boten er gjort opp for.
            </div>
        )}
      </div>

      {/* Main Card */}
      <div className="relative -mt-16 px-2">
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 text-center relative overflow-hidden">
            {/* Amount */}
            <div className="mt-4 mb-2">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Beløp</div>
                <div className="text-5xl font-black text-slate-900 tracking-tighter flex justify-center items-start">
                    {fine.amount}
                    <span className="text-lg font-medium text-slate-400 mt-2 ml-1">kr</span>
                </div>
            </div>

            <div className="w-full border-t border-slate-100 my-6"></div>

            {/* Reason */}
            <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-800 mb-1">{fine.reason}</h3>
                {fine.description && (
                    <p className="text-slate-500 italic text-sm">"{fine.description}"</p>
                )}
            </div>

            {/* Admin Quick Pay Button if Unpaid */}
            {isAdmin && !isPaid && (
                <div className="mb-4">
                    <button 
                        onClick={() => onAdminPay(fine.id)}
                        className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full text-[10px] font-black border border-green-200 hover:bg-green-100 transition-colors uppercase tracking-widest"
                    >
                        <DollarSign size={14} className="mr-1.5" />
                        BEKREFT BETALING
                    </button>
                </div>
            )}

            {/* Reactions on Fine */}
            {currentUser && (
               <div className="flex justify-center mb-6">
                  <ReactionPicker 
                    reactions={fine.reactions} 
                    onToggle={(emoji) => onToggleFineReaction(fine.id, emoji)}
                    currentUserId={currentUser.id}
                  />
               </div>
            )}

            {/* The Roast */}
            {fine.aiComment && (
                <div className="bg-blue-50 rounded-2xl p-6 relative text-left mx-2 mb-6 border border-blue-100/50">
                    <Quote className="absolute -top-3 -left-2 text-blue-100 w-10 h-10 transform -scale-x-100" />
                    <div className="relative z-10">
                        <p className="text-blue-900 font-medium leading-relaxed font-serif text-lg italic">
                            {fine.aiComment}
                        </p>
                        <div className="mt-3 flex items-center justify-end text-[10px] font-black text-blue-400 uppercase tracking-widest">
                            <MessageSquare size={12} className="mr-1" />
                            Botsjefen
                        </div>
                    </div>
                </div>
            )}

            {/* Metadata */}
            <div className="flex justify-center gap-4 text-xs text-slate-400 mb-6">
                <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest">
                    <Calendar size={14} className="mr-1.5 text-blue-400" />
                    {new Date(fine.date).toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <Button 
                    onClick={() => onGoToProfile(player.id)}
                    variant="secondary"
                    fullWidth
                    className="py-4 border border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-widest"
                >
                    <div className="flex items-center justify-center">
                        <User size={18} className="mr-2 text-slate-400" />
                        <span className="text-slate-700">Profil: {player.name}</span>
                    </div>
                </Button>
            </div>
        </div>

        {/* Comments Section */}
        <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-blue-400" />
                Diskusjon
            </h3>

            {/* List */}
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto no-scrollbar">
                {fine.comments && fine.comments.length > 0 ? (
                    fine.comments.map(comment => (
                        <div key={comment.id} className="flex gap-3 text-left group relative">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                {comment.userName.charAt(0)}
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none text-sm w-full relative">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-black text-slate-800 text-[10px] uppercase">{comment.userName}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-slate-700 text-sm leading-relaxed">{comment.text}</p>
                                
                                {currentUser && (
                                  <ReactionPicker 
                                    reactions={comment.reactions}
                                    onToggle={(emoji) => onToggleCommentReaction(fine.id, comment.id, emoji)}
                                    currentUserId={currentUser.id}
                                  />
                                )}
                            </div>
                            
                            {currentUser && (currentUser.role === 'admin' || currentUser.id === comment.userId) && (
                                <button
                                    onClick={() => {
                                        if (confirm("Slette kommentaren?")) {
                                            onDeleteComment(fine.id, comment.id);
                                        }
                                    }}
                                    className="absolute top-0 right-0 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-xs text-slate-400 italic text-center py-2 uppercase font-black tracking-widest">Ingen kommentarer enda.</p>
                )}
            </div>

            {currentUser && (
                <form onSubmit={handleSendComment} className="relative">
                    <input 
                        type="text" 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Skriv en kommentar..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                        type="submit"
                        disabled={!commentText.trim()}
                        className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
                    >
                        <Send size={16} />
                    </button>
                </form>
            )}
        </div>
      </div>

      {showEditModal && isAdmin && (
          <EditFineModal 
            fine={fine}
            presetFines={presetFines}
            onSave={(updated) => {
                onUpdateFine(updated);
                setShowEditModal(false);
            }}
            onDelete={(id) => {
                onDeleteFine(id);
                setShowEditModal(false);
            }}
            onCancel={() => setShowEditModal(false)}
          />
      )}

      {showComplaintModal && (
          <ComplaintModal 
            fine={fine}
            onConfirm={(fid, r) => handleComplaintSubmit(fid, r)}
            onCancel={() => setShowComplaintModal(false)}
          />
      )}
    </div>
  );
};
