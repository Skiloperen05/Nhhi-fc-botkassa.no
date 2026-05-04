
import React, { useState, useMemo, useEffect } from 'react';
import { Player, FineEntry, Role, UserSettings, PresetFine, CustomRole, RoleDefinition } from '../types';
import { ChevronLeft, User, Wallet, History, TrendingUp, Pencil, MessageCircleWarning, CheckCircle2, CircleDollarSign, Smartphone, DollarSign, PenBox, Save, X, Gavel, Coins, Archive, ChevronRight, Scale, ThumbsUp, ThumbsDown, Info, Clock, CheckCheck } from 'lucide-react';
import { EditFineModal } from './EditFineModal';
import { ComplaintModal } from './ComplaintModal';
import { Button } from './Button';
import { ROLE_COLOR_MAP } from '../constants';

interface PlayerProfileViewProps {
  player: Player;
  currentUserRole: Role;
  currentUserId: string;
  isOwnProfile: boolean;
  fines: FineEntry[];
  allFines: FineEntry[]; // For Botsjef-oversikt
  settings: UserSettings;
  presetFines: PresetFine[];
  roles: RoleDefinition[];
  players: Player[];
  onUpdateSettings: (playerId: string, settings: UserSettings) => void;
  onUpdatePlayer?: (playerId: string, updates: Partial<Player>) => void;
  onBack: () => void;
  onUpdateFine: (fine: FineEntry) => void;
  onDeleteFine: (id: string) => void;
  onSubmitComplaint: (fineId: string, reason: string) => void;
  onPayRequest: (fineId: string) => void;
  onPayAllRequest?: (fineIds: string[]) => void;
  onAdminPay: (fineId: string) => void;
  onVoteOnComplaint: (fineId: string, voterId: string, vote: 'maintain' | 'dismiss') => void;
  onSelectFine: (fineId: string) => void;
  onOpenArchive: () => void;
}

const VOTING_DEADLINE_DAYS = 4;

const getTimeRemaining = (complaintDate: string) => {
    const start = new Date(complaintDate).getTime();
    const deadline = start + (VOTING_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
    const now = Date.now();
    const diff = deadline - now;
    
    if (diff <= 0) return "Frist utløpt";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}t igjen`;
    return `${hours}t igjen`;
};

const EditPlayerModal: React.FC<{
    player: Player;
    roles: RoleDefinition[];
    onSave: (updates: Partial<Player>) => void;
    onCancel: () => void;
}> = ({ player, roles, onSave, onCancel }) => {
    const [customRole, setCustomRole] = useState<string>(player.customRole || '');
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
             <div className="relative bg-white rounded-2xl shadow-xl w-full max-sm overflow-hidden animate-in fade-in zoom-in duration-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900">Endre Spillerinfo</h3>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Velg Rolle</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {roles.map(role => {
                                const colorDef = ROLE_COLOR_MAP[role.color] || ROLE_COLOR_MAP['slate'];
                                return (
                                    <button
                                        key={role.id}
                                        onClick={() => setCustomRole(role.name)}
                                        className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors truncate ${
                                            customRole === role.name
                                            ? `${colorDef.bg} ${colorDef.border} ${colorDef.text}` 
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {role.name}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2">
                             <input 
                                type="text"
                                value={customRole}
                                onChange={(e) => setCustomRole(e.target.value)}
                                placeholder="Eller skriv egen tittel..."
                                className="block w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                             />
                        </div>
                    </div>
                    
                    <Button fullWidth onClick={() => onSave({ customRole: customRole as CustomRole })}>
                        <Save size={18} className="mr-2"/>
                        Lagre Endringer
                    </Button>
                </div>
             </div>
        </div>
    );
};

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({ 
  player, 
  currentUserRole,
  currentUserId,
  isOwnProfile,
  fines, 
  allFines,
  settings,
  presetFines,
  roles,
  players,
  onUpdateSettings,
  onUpdatePlayer,
  onBack,
  onUpdateFine,
  onDeleteFine,
  onSubmitComplaint,
  onPayRequest,
  onPayAllRequest,
  onAdminPay,
  onVoteOnComplaint,
  onSelectFine,
  onOpenArchive
}) => {
  const [editingFine, setEditingFine] = useState<FineEntry | null>(null);
  const [complainingFine, setComplainingFine] = useState<FineEntry | null>(null);
  const [showEditPlayer, setShowEditPlayer] = useState(false);
  const [judgmentTab, setJudgmentTab] = useState<'complaints' | 'payments'>('complaints');

  const handlePlayerUpdate = (updates: Partial<Player>) => {
    if (onUpdatePlayer) {
      onUpdatePlayer(player.id, updates);
    }
    setShowEditPlayer(false);
  };

  const totalDebt = fines.filter(f => f.status !== 'paid').reduce((sum, fine) => sum + fine.amount, 0);
  const totalPaid = fines.filter(f => f.status === 'paid').reduce((sum, fine) => sum + fine.amount, 0);
  
  const sortedFines = [...fines].sort((a, b) => b.timestamp - a.timestamp);

  // Botsjef Dashbord Data
  const pendingComplaints = useMemo(() => allFines.filter(f => f.complaint?.status === 'pending'), [allFines]);
  const pendingPayments = useMemo(() => allFines.filter(f => f.payRequest?.status === 'pending'), [allFines]);

  const isSuperAdmin = player.name === 'Birk Haugnes';
  const isAdminView = isOwnProfile && currentUserRole === 'admin';
  const canEditPlayer = currentUserRole === 'admin' && onUpdatePlayer && !isSuperAdmin;

  const getRoleStyle = (roleName?: string) => {
      const roleDef = roles.find(r => r.name === roleName);
      if (roleDef) {
          const style = ROLE_COLOR_MAP[roleDef.color] || ROLE_COLOR_MAP['slate'];
          return `${style.bg} ${style.text} ${style.border}`;
      }
      return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const handlePayAll = () => {
    const unpaidFines = fines.filter(f => f.status === 'unpaid' && !f.payRequest);
    if (unpaidFines.length === 0) return;
    
    if (confirm(`Vil du markere alle ${unpaidFines.length} bøter som betalt?`)) {
      if (onPayAllRequest) {
        onPayAllRequest(unpaidFines.map(f => f.id));
      } else {
        // Fallback hvis onPayAllRequest ikke er implementert enda
        unpaidFines.forEach(f => onPayRequest(f.id));
      }
    }
  };

  const hasUnpaidFines = fines.some(f => f.status === 'unpaid' && !f.payRequest);

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-blue-900 -mx-4 -mt-10 pt-10 pb-20 px-6 rounded-b-[2rem] shadow-lg text-white relative z-10">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-blue-800 text-blue-100 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-white">Spillerprofil</h2>
            </div>
        </div>
      </div>

      <div className="relative -mt-20 px-2 z-20">
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 flex flex-col items-center text-center relative">
            {canEditPlayer && (
                <button onClick={() => setShowEditPlayer(true)} className="absolute top-4 left-4 p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors border border-slate-100">
                    <PenBox size={18} />
                </button>
            )}

            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600 relative border-4 border-white shadow-sm">
                <User className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{player.name}</h1>
            
            <div className="flex items-center justify-center mt-2 mb-2 flex-wrap gap-2">
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    {player.position || 'Spiller'}
                </span>
                {player.customRole && (
                    <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getRoleStyle(player.customRole)}`}>
                            {player.customRole}
                        </span>
                    </>
                )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full mt-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-center space-x-2 text-slate-400 mb-1">
                        <Wallet className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Utestående</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{totalDebt} kr</div>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                    <div className="flex items-center justify-center space-x-2 text-green-600 mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Betalt</span>
                    </div>
                    <div className="text-2xl font-black text-green-700">{totalPaid} kr</div>
                </div>
            </div>
        </div>
      </div>

      {/* ⚖️ BOTSJEF DASHBORD - Venter på dom */}
      {isAdminView && (
          <div className="px-2 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                  <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center uppercase tracking-widest relative">
                      <Gavel className="w-4 h-4 mr-2 text-amber-500" />
                      Venter på dom
                  </h3>
                  
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-4 relative">
                      <button onClick={() => setJudgmentTab('complaints')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${judgmentTab === 'complaints' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                          Klager ({pendingComplaints.length})
                      </button>
                      <button onClick={() => setJudgmentTab('payments')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${judgmentTab === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                          Verifisering ({pendingPayments.length})
                      </button>
                  </div>

                  <div className="space-y-3 relative">
                      {judgmentTab === 'complaints' ? (
                          pendingComplaints.length > 0 ? (
                              pendingComplaints.map(f => {
                                  const votes = f.complaint?.votes || {};
                                  const dismissVotes = Object.values(votes).filter(v => v === 'dismiss').length;
                                  const maintainVotes = Object.values(votes).filter(v => v === 'maintain').length;
                                  const timeRemaining = getTimeRemaining(f.complaint!.date);

                                  return (
                                    <div key={f.id} className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-slate-900 truncate">
                                                {players.find(p => p.id === f.playerId)?.name || 'Ukjent'}
                                            </span>
                                            <span className="text-[10px] font-black text-amber-600">{f.amount} kr</span>
                                        </div>
                                        <p className="text-xs text-slate-600 italic mb-2">"{f.complaint?.reason}"</p>
                                        
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex gap-2 text-[8px] font-black uppercase">
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1"><ThumbsUp size={8}/> Slett: {dismissVotes}</span>
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex items-center gap-1"><ThumbsDown size={8}/> Behold: {maintainVotes}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase">
                                                <Clock size={10} /> {timeRemaining}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => onUpdateFine({...f, complaint: { ...f.complaint!, status: 'rejected' }})} className="flex-1 py-2 bg-white text-red-500 text-[10px] font-black uppercase rounded-lg border border-red-100">Avvis klage</button>
                                            <button onClick={() => onDeleteFine(f.id)} className="flex-1 py-2 bg-green-500 text-white text-[10px] font-black uppercase rounded-lg">Godkjenn & Slett bot</button>
                                        </div>
                                    </div>
                                  );
                              })
                          ) : <p className="text-center py-4 text-xs text-slate-400 italic">Ingen aktive klager</p>
                      ) : (
                          pendingPayments.length > 0 ? (
                              pendingPayments.map(f => (
                                  <div key={f.id} className="p-3 bg-green-50 rounded-2xl border border-green-100">
                                      <div className="flex justify-between items-start mb-2">
                                          <span className="text-[10px] font-black text-slate-900">
                                              {players.find(p => p.id === f.playerId)?.name || 'Ukjent'}
                                          </span>
                                          <span className="text-[10px] font-black text-green-600">{f.amount} kr</span>
                                      </div>
                                      <p className="text-xs text-slate-600 mb-3">{f.reason}</p>
                                      <div className="flex gap-2">
                                          <button onClick={() => onUpdateFine({...f, payRequest: { ...f.payRequest!, status: 'rejected' }})} className="flex-1 py-2 bg-white text-red-500 text-[10px] font-black uppercase rounded-lg border border-red-100">Avvis</button>
                                          <button onClick={() => onAdminPay(f.id)} className="flex-1 py-2 bg-green-500 text-white text-[10px] font-black uppercase rounded-lg">Bekreftet</button>
                                      </div>
                                  </div>
                              ))
                          ) : <p className="text-center py-4 text-xs text-slate-400 italic">Ingen betalinger å bekrefte</p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* 🏛️ FC DOMSTOLEN - Alle kan stemme */}
      {isOwnProfile && (
          <div className="px-2">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 overflow-hidden">
                  <h3 className="text-sm font-black text-blue-900 mb-4 flex items-center uppercase tracking-widest">
                      <Scale className="w-4 h-4 mr-2 text-blue-600" />
                      FC Domstolen
                  </h3>
                  
                  <div className="space-y-4">
                      {pendingComplaints.length > 0 ? (
                          pendingComplaints.map(f => {
                              const p = players.find(x => x.id === f.playerId);
                              const votes = f.complaint?.votes || {};
                              const myVote = votes[currentUserId];
                              const dismissVotes = Object.values(votes).filter(v => v === 'dismiss').length;
                              const maintainVotes = Object.values(votes).filter(v => v === 'maintain').length;
                              const timeRemaining = getTimeRemaining(f.complaint!.date);
                              const isExpired = timeRemaining === "Frist utløpt";

                              return (
                                  <div key={f.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                      <div className="flex justify-between items-start mb-2">
                                          <button 
                                            onClick={() => onSelectFine(f.id)}
                                            className="text-[10px] font-black text-blue-600 uppercase hover:underline text-left"
                                          >
                                              {p?.name || 'Ukjent'}
                                          </button>
                                          <div className="flex flex-col items-end">
                                              <span className="text-[10px] font-black text-slate-900">{f.amount} kr</span>
                                              <span className="text-[8px] font-black text-slate-400 flex items-center gap-1 uppercase">
                                                  <Clock size={10} /> {timeRemaining}
                                              </span>
                                          </div>
                                      </div>
                                      <div className="text-xs font-bold text-slate-800 mb-1">{f.reason}</div>
                                      <p className="text-[11px] text-slate-500 italic mb-4 line-clamp-2">"{f.complaint?.reason}"</p>
                                      
                                      <div className="flex gap-2">
                                          <button 
                                            disabled={isExpired}
                                            onClick={() => onVoteOnComplaint(f.id, currentUserId, 'maintain')}
                                            className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${myVote === 'maintain' ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200'} ${isExpired ? 'opacity-50 grayscale' : ''}`}
                                          >
                                              <ThumbsDown size={14} className="mb-1" />
                                              <span className="text-[9px] font-black uppercase">Behold ({maintainVotes})</span>
                                          </button>
                                          <button 
                                            disabled={isExpired}
                                            onClick={() => onVoteOnComplaint(f.id, currentUserId, 'dismiss')}
                                            className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${myVote === 'dismiss' ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-green-50 hover:border-green-200'} ${isExpired ? 'opacity-50 grayscale' : ''}`}
                                          >
                                              <ThumbsUp size={14} className="mb-1" />
                                              <span className="text-[9px] font-black uppercase">Slett ({dismissVotes})</span>
                                          </button>
                                      </div>
                                  </div>
                              );
                          })
                      ) : (
                          <div className="text-center py-6">
                              <CheckCircle2 className="w-8 h-8 text-green-200 mx-auto mb-2" />
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Ingen saker i rettsalen</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* 📜 Langtidslagring Tilgang */}
      <div className="px-2">
          <button 
            onClick={onOpenArchive}
            className="w-full flex items-center justify-between p-5 bg-white rounded-3xl shadow-sm border border-slate-100 group active:scale-[0.98] transition-all"
          >
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Archive size={20} />
                  </div>
                  <div className="text-left">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Langtidslagring</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Historiske bøter og LTS</p>
                  </div>
              </div>
              <ChevronRight className="text-slate-300" />
          </button>
      </div>

      <div className="px-2">
        <div className="flex items-center justify-between px-1 mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <History className="w-3.5 h-3.5 mr-2" />
                Bot-historikk (Aktive)
            </h3>
            {isOwnProfile && fines.length > 0 && (
                <button 
                  onClick={handlePayAll}
                  disabled={!hasUnpaidFines}
                  className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${
                    hasUnpaidFines 
                      ? 'bg-green-50 hover:bg-green-100 border-green-100 text-green-700 active:scale-95' 
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                  }`}
                >
                    <CheckCheck size={12} />
                    Betal alle
                </button>
            )}
        </div>
        
        <div className="space-y-3">
            {sortedFines.length > 0 ? (
                sortedFines.map((fine) => {
                    const isPaid = fine.status === 'paid';
                    const hasPendingAction = fine.complaint?.status === 'pending' || fine.payRequest?.status === 'pending';

                    return (
                        <div key={fine.id} onClick={() => onSelectFine(fine.id)} className={`relative bg-white rounded-3xl p-5 shadow-sm border transition-all hover:shadow-md cursor-pointer group active:bg-slate-50 ${isPaid ? 'border-green-200 bg-green-50/30' : 'border-slate-100'}`}>
                            
                            {/* ACTION BUTTONS (FOR BOTH ADMIN AND USER - As drawn in Sketch 1) */}
                            <div className="absolute top-4 right-4 flex gap-1.5 z-10">
                                {currentUserRole === 'admin' ? (
                                    <>
                                        {!isPaid && <button onClick={(e) => { e.stopPropagation(); onAdminPay(fine.id); }} className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl transition-colors shadow-sm"><DollarSign size={16} /></button>}
                                        <button onClick={(e) => { e.stopPropagation(); setEditingFine(fine); }} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors shadow-sm"><Pencil size={16} /></button>
                                    </>
                                ) : (
                                    isOwnProfile && !isPaid && !hasPendingAction && (
                                        <>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onPayRequest(fine.id); }} 
                                                className="p-2 bg-green-600 text-white rounded-xl transition-all shadow-md active:scale-90"
                                                title="Marker som betalt"
                                            >
                                                <DollarSign size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setComplainingFine(fine); }} 
                                                className="p-2 bg-amber-500 text-white rounded-xl transition-all shadow-md active:scale-90"
                                                title="Klag på bot"
                                            >
                                                <MessageCircleWarning size={16} />
                                            </button>
                                        </>
                                    )
                                )}
                                {hasPendingAction && !isPaid && (
                                    <div className="p-2 bg-slate-100 text-slate-400 rounded-xl flex items-center gap-1" title="Venter på behandling">
                                        <Info size={16} />
                                        <span className="text-[8px] font-black uppercase">Venter</span>
                                    </div>
                                )}
                            </div>

                            <div className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">{new Date(fine.date).toLocaleDateString('no-NO', { day: 'numeric', month: 'long' })}</div>
                            <div className="flex justify-between items-end mb-1">
                                <div className={`text-sm font-bold pr-2 ${isPaid ? 'text-green-800 line-through opacity-70' : 'text-slate-900'}`}>{fine.reason}</div>
                                <span className={`font-black px-3 py-1 rounded-xl text-xs whitespace-nowrap ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'}`}>{fine.amount} kr</span>
                            </div>
                            {fine.isArchived && <span className="absolute bottom-2 right-4 text-[8px] font-black text-blue-300 uppercase">LTS Arkiv</span>}
                        </div>
                    );
                })
            ) : <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Rent rulleblad</p></div>}
        </div>
      </div>

      {editingFine && <EditFineModal fine={editingFine} presetFines={presetFines} onSave={(f) => { onUpdateFine(f); setEditingFine(null); }} onDelete={(id) => { onDeleteFine(id); setEditingFine(null); }} onCancel={() => setEditingFine(null)} />}
      {complainingFine && <ComplaintModal fine={complainingFine} onConfirm={(fid, r) => { onSubmitComplaint(fid, r); setComplainingFine(null); }} onCancel={() => setComplainingFine(null)} />}
      {showEditPlayer && <EditPlayerModal player={player} roles={roles} onSave={handlePlayerUpdate} onCancel={() => setShowEditPlayer(false)} />}
    </div>
  );
};
