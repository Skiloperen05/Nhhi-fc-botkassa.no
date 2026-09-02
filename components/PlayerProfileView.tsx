
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

  const totalDebt = fines.filter(f => f.status === 'unpaid').reduce((sum, fine) => sum + fine.amount, 0);
  const totalPaid = fines.filter(f => f.status === 'paid').reduce((sum, fine) => sum + fine.amount, 0);
  const totalWaived = fines.filter(f => f.status === 'waived').reduce((sum, fine) => sum + fine.amount, 0);
  
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
  const [pcFilter, setPcFilter] = useState<'all' | 'unpaid' | 'paid' | 'waived'>('all');
  const [pcSearch, setPcSearch] = useState('');

  const filteredPcFines = useMemo(() => {
    return sortedFines.filter(fine => {
      if (pcFilter === 'unpaid' && fine.status !== 'unpaid') return false;
      if (pcFilter === 'paid' && fine.status !== 'paid') return false;
      if (pcFilter === 'waived' && fine.status !== 'waived') return false;
      if (pcSearch.trim()) {
        const query = pcSearch.toLowerCase();
        const reasonMatch = fine.reason.toLowerCase().includes(query);
        const amountMatch = fine.amount.toString().includes(query);
        const waivedMatch = (fine.waivedReason || '').toLowerCase().includes(query);
        return reasonMatch || amountMatch || waivedMatch;
      }
      return true;
    });
  }, [sortedFines, pcFilter, pcSearch]);

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* ========================================================================= */}
      {/* 📱 MOBILVISNING (md:hidden)                                              */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-6">
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
              {player.isActive === false && (
                  <p className="mt-1 text-xs text-slate-500">Tidligere medlem</p>
              )}
              
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
                      {totalWaived > 0 && (
                        <div className="text-[10px] font-bold text-purple-600 mt-1">({totalWaived} kr tapt)</div>
                      )}
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

        {/* ⚖️ BOTSJEF DASHBORD - Venter på dom (Mobil) */}
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

        {/* 🏛️ FC DOMSTOLEN - Alle kan stemme (Mobil) */}
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

        {/* Bøteliste for mobil */}
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
                      const isWaived = fine.status === 'waived';
                      const hasPendingAction = fine.complaint?.status === 'pending' || fine.payRequest?.status === 'pending';

                      return (
                          <div key={fine.id} onClick={() => onSelectFine(fine.id)} className={`relative bg-white rounded-3xl p-5 shadow-sm border transition-all hover:shadow-md cursor-pointer group active:bg-slate-50 ${isPaid ? 'border-green-200 bg-green-50/30' : isWaived ? 'border-purple-200 bg-purple-50/20' : 'border-slate-100'}`}>
                              <div className="absolute top-4 right-4 flex gap-1.5 z-10">
                                  {currentUserRole === 'admin' ? (
                                      <>
                                          {!isPaid && !isWaived && <button onClick={(e) => { e.stopPropagation(); onAdminPay(fine.id); }} className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl transition-colors shadow-sm"><DollarSign size={16} /></button>}
                                          <button onClick={(e) => { e.stopPropagation(); setEditingFine(fine); }} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors shadow-sm"><Pencil size={16} /></button>
                                      </>
                                  ) : (
                                      isOwnProfile && !isPaid && !isWaived && !hasPendingAction && (
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
                                  {isWaived && (
                                      <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded-xl text-[9px] font-black uppercase">Tapsført</div>
                                  )}
                                  {hasPendingAction && !isPaid && !isWaived && (
                                      <div className="p-2 bg-slate-100 text-slate-400 rounded-xl flex items-center gap-1" title="Venter på behandling">
                                          <Info size={16} />
                                          <span className="text-[8px] font-black uppercase">Venter</span>
                                      </div>
                                  )}
                              </div>

                              <div className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">{new Date(fine.date).toLocaleDateString('no-NO', { day: 'numeric', month: 'long' })}</div>
                              <div className="flex justify-between items-end mb-1">
                                  <div>
                                    <div className={`text-sm font-bold pr-2 ${isPaid || isWaived ? 'text-slate-400 line-through opacity-70' : 'text-slate-900'}`}>{fine.reason}</div>
                                    {isWaived && fine.waivedReason && (
                                      <div className="text-[11px] text-purple-600 font-semibold mt-0.5">Tapsført: "{fine.waivedReason}"</div>
                                    )}
                                  </div>
                                  <span className={`font-black px-3 py-1 rounded-xl text-xs whitespace-nowrap ${isPaid ? 'bg-green-100 text-green-700' : isWaived ? 'bg-purple-100 text-purple-700 line-through' : 'bg-red-50 text-red-700'}`}>{fine.amount} kr</span>
                              </div>
                              {fine.isArchived && <span className="absolute bottom-2 right-4 text-[8px] font-black text-blue-300 uppercase">LTS Arkiv</span>}
                          </div>
                      );
                  })
              ) : <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Rent rulleblad</p></div>}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 💻 PC / DESKTOP-VISNING (hidden md:block): Helhetlig Profil & Arbeidsflate */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-6">
        {/* Desktop Topbar med brødsmuler og hurtighandlinger */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <ChevronLeft size={16} />
              <span>Tilbake</span>
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Spilleroversikt</span>
              <span>/</span>
              <span className="font-bold text-slate-900">{player.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenArchive}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <Archive size={15} />
              <span>Åpne LTS Arkiv</span>
            </button>
            {isOwnProfile && hasUnpaidFines && (
              <button
                onClick={handlePayAll}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all"
              >
                <CheckCheck size={16} />
                <span>Marker alle ({totalDebt} kr) som betalt</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Kolonner PC Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* VENSTRE KOLONNE (4/12): Spillerkort, Nøkkeltall, Domstol */}
          <div className="col-span-4 space-y-6">
            {/* Spillerkort */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs text-center relative">
              {canEditPlayer && (
                <button 
                  onClick={() => setShowEditPlayer(true)} 
                  className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200"
                  title="Rediger rolle"
                >
                  <PenBox size={16} />
                </button>
              )}

              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-2xs">
                <User size={36} />
              </div>

              <h2 className="text-xl font-black text-slate-900">{player.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{player.position || 'Spiller'}</span>
                {player.customRole && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${getRoleStyle(player.customRole)}`}>
                    {player.customRole}
                  </span>
                )}
              </div>

              {/* Finansiell oversikt */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-100 text-left">
                  <div className="flex items-center gap-1.5 text-red-500 mb-1">
                    <Wallet size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Utestående</span>
                  </div>
                  <div className="text-2xl font-black text-red-600">{totalDebt.toLocaleString('nb-NO')} kr</div>
                  {totalWaived > 0 && (
                    <div className="text-[11px] font-bold text-purple-600 mt-1">({totalWaived.toLocaleString('nb-NO')} kr tapt)</div>
                  )}
                </div>

                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-left">
                  <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                    <TrendingUp size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Innbetalt</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{totalPaid.toLocaleString('nb-NO')} kr</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Registrerte bøter totalt:</span>
                <strong className="text-slate-900">{fines.length} stk</strong>
              </div>
            </div>

            {/* FC Domstolen (Hvis på egen profil) */}
            {isOwnProfile && (
              <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center uppercase tracking-wider">
                    <Scale className="w-4 h-4 mr-2 text-blue-600" />
                    FC Domstolen
                  </h3>
                  <span className="text-xs text-blue-600 font-bold">{pendingComplaints.length} aktive saker</span>
                </div>

                <div className="space-y-3">
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
                        <div key={f.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-xs font-bold text-slate-900">{p?.name || 'Ukjent'}</span>
                            <span className="text-xs font-black text-blue-600">{f.amount} kr</span>
                          </div>
                          <p className="text-xs text-slate-600 italic mb-2.5">"{f.complaint?.reason}"</p>
                          <div className="flex gap-2">
                            <button
                              disabled={isExpired}
                              onClick={() => onVoteOnComplaint(f.id, currentUserId, 'maintain')}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                                myVote === 'maintain' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50'
                              }`}
                            >
                              <ThumbsDown size={13} /> Behold ({maintainVotes})
                            </button>
                            <button
                              disabled={isExpired}
                              onClick={() => onVoteOnComplaint(f.id, currentUserId, 'dismiss')}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                                myVote === 'dismiss' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                              }`}
                            >
                              <ThumbsUp size={13} /> Slett ({dismissVotes})
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic">Ingen aktive rettssaker</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* HØYRE KOLONNE (8/12): Admin Venter på dom + Bot-historikk Datatabell */}
          <div className="col-span-8 space-y-6">
            {/* Botsjef Dashbord hvis admin på egen profil */}
            {isAdminView && (
              <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center uppercase tracking-wider">
                    <Gavel className="w-5 h-5 mr-2 text-amber-500" />
                    Botsjef Saksbehandling
                  </h3>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setJudgmentTab('complaints')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        judgmentTab === 'complaints' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Klager ({pendingComplaints.length})
                    </button>
                    <button
                      onClick={() => setJudgmentTab('payments')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        judgmentTab === 'payments' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Verifiseringer ({pendingPayments.length})
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {judgmentTab === 'complaints' ? (
                    pendingComplaints.length > 0 ? (
                      pendingComplaints.map(f => (
                        <div key={f.id} className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {players.find(p => p.id === f.playerId)?.name || 'Ukjent'}
                              </span>
                              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">{f.amount} kr</span>
                            </div>
                            <p className="text-xs text-slate-600 italic">"{f.complaint?.reason}"</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onUpdateFine({...f, complaint: { ...f.complaint!, status: 'rejected' }})}
                              className="px-3 py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors"
                            >
                              Avvis
                            </button>
                            <button
                              onClick={() => onDeleteFine(f.id)}
                              className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-lg transition-colors shadow-xs"
                            >
                              Godkjenn & Slett
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4 text-xs text-slate-400 italic">Ingen aktive klager å behandle</p>
                    )
                  ) : (
                    pendingPayments.length > 0 ? (
                      pendingPayments.map(f => (
                        <div key={f.id} className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {players.find(p => p.id === f.playerId)?.name || 'Ukjent'}
                              </span>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{f.amount} kr</span>
                            </div>
                            <p className="text-xs text-slate-600">{f.reason}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onUpdateFine({...f, payRequest: { ...f.payRequest!, status: 'rejected' }})}
                              className="px-3 py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors"
                            >
                              Avvis
                            </button>
                            <button
                              onClick={() => onAdminPay(f.id)}
                              className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-lg transition-colors shadow-xs"
                            >
                              Bekreft mottatt
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4 text-xs text-slate-400 italic">Ingen innbetalinger som venter på bekreftelse</p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Profesjonell PC Datatabell for Bøter */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 flex items-center uppercase tracking-wider">
                    <History className="w-5 h-5 mr-2 text-slate-500" />
                    Bot-historikk ({filteredPcFines.length})
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setPcFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        pcFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Alle ({fines.length})
                    </button>
                    <button
                      onClick={() => setPcFilter('unpaid')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        pcFilter === 'unpaid' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ubetalte ({fines.filter(f => f.status === 'unpaid').length})
                    </button>
                    <button
                      onClick={() => setPcFilter('paid')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        pcFilter === 'paid' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Betalte ({fines.filter(f => f.status === 'paid').length})
                    </button>
                    <button
                      onClick={() => setPcFilter('waived')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        pcFilter === 'waived' ? 'bg-white text-purple-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tapsførte ({fines.filter(f => f.status === 'waived').length})
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Søk i bøter..."
                    value={pcSearch}
                    onChange={(e) => setPcSearch(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tabell */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Dato</th>
                      <th className="py-3 px-4">Begrunnelse</th>
                      <th className="py-3 px-4">Beløp</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Handlinger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPcFines.length > 0 ? (
                      filteredPcFines.map((fine) => {
                        const isPaid = fine.status === 'paid';
                        const isWaived = fine.status === 'waived';
                        const hasPendingAction = fine.complaint?.status === 'pending' || fine.payRequest?.status === 'pending';

                        return (
                          <tr 
                            key={fine.id} 
                            onClick={() => onSelectFine(fine.id)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                              {new Date(fine.date).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`font-semibold ${isPaid || isWaived ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                {fine.reason}
                              </span>
                              {isWaived && fine.waivedReason && (
                                <span className="ml-2 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-bold">
                                  Tapsført: {fine.waivedReason}
                                </span>
                              )}
                              {fine.complaint && (
                                <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                                  Klage: {fine.complaint.status}
                                </span>
                              )}
                            </td>
                            <td className={`py-3 px-4 font-black whitespace-nowrap ${isPaid || isWaived ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                              {fine.amount.toLocaleString('nb-NO')} kr
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  <CheckCircle2 size={12} /> Betalt
                                </span>
                              ) : isWaived ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100" title={fine.waivedReason ? `Årsak: ${fine.waivedReason}` : 'Tapsført av botsjef'}>
                                  <CircleDollarSign size={12} /> Tapsført
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                                  <CircleDollarSign size={12} /> Ubetalt
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {currentUserRole === 'admin' ? (
                                  <>
                                    {!isPaid && !isWaived && (
                                      <button
                                        onClick={() => onAdminPay(fine.id)}
                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                                        title="Merk som betalt"
                                      >
                                        <DollarSign size={15} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setEditingFine(fine)}
                                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                                      title="Rediger bot"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  </>
                                ) : (
                                  isOwnProfile && !isPaid && !isWaived && !hasPendingAction && (
                                    <>
                                      <button
                                        onClick={() => onPayRequest(fine.id)}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                                        title="Send betalingsbekreftelse"
                                      >
                                        Betalt
                                      </button>
                                      <button
                                        onClick={() => setComplainingFine(fine)}
                                        className="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors"
                                        title="Klag på bot"
                                      >
                                        <MessageCircleWarning size={15} />
                                      </button>
                                    </>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-sm italic">
                          Ingen bøter matcher valgte filtre
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingFine && <EditFineModal fine={editingFine} presetFines={presetFines} onSave={(f) => { onUpdateFine(f); setEditingFine(null); }} onDelete={(id) => { onDeleteFine(id); setEditingFine(null); }} onCancel={() => setEditingFine(null)} />}
      {complainingFine && <ComplaintModal fine={complainingFine} onConfirm={(fid, r) => { onSubmitComplaint(fid, r); setComplainingFine(null); }} onCancel={() => setComplainingFine(null)} />}
      {showEditPlayer && <EditPlayerModal player={player} roles={roles} onSave={handlePlayerUpdate} onCancel={() => setShowEditPlayer(false)} />}
    </div>
  );
};
