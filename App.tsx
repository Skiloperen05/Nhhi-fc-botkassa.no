
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ViewState, FineEntry, User, TimeFilter, UserSettings, Player, PresetFine, RoleDefinition, Message } from './types';
import { DEFAULT_PLAYERS, PRESET_FINES as DEFAULT_PRESET_FINES, DEFAULT_ROLES } from './constants';
import { AddFineView } from './components/AddFineView';
import { StatsView } from './components/StatsView';
import { PlayerProfileView } from './components/PlayerProfileView';
import { LoginView } from './components/LoginView';
import { FineListView } from './components/FineListView';
import { NotificationsView } from './components/NotificationsView';
import { SettingsModal } from './components/SettingsModal';
import { FineDetailView } from './components/FineDetailView';
import { SearchModal } from './components/SearchModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { SendMessageModal } from './components/SendMessageModal';
import { ArchiveView } from './components/ArchiveView';
import { storage } from './services/storageService';
import { cloudSave, cloudDelete, cloudFetchAll, subscribeToCloudChanges, cloudSaveBulk } from './services/supabaseService';
import { PlusCircle, BarChart3, Shield, Table, LogOut, Bell, Settings, Search, Loader2, CheckCircle2, Cloud, AlertTriangle, Mail } from 'lucide-react';

const INVALID_LEGACY_PLAYER_IDS = new Set(['p39', 'p40']);

const normalizePlayers = (...playerLists: Player[][]): Player[] => {
  const merged = new Map<string, Player>();

  playerLists.flat().forEach(player => {
    if (!INVALID_LEGACY_PLAYER_IDS.has(player.id)) merged.set(player.id, player);
  });

  DEFAULT_PLAYERS.forEach(canonicalPlayer => {
    const existing = merged.get(canonicalPlayer.id);
    merged.set(canonicalPlayer.id, {
      ...canonicalPlayer,
      ...existing,
      id: canonicalPlayer.id,
      name: canonicalPlayer.name,
    });
  });

  return Array.from(merged.values());
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [showErrorToast, setShowErrorToast] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [presetFines, setPresetFines] = useState<PresetFine[]>([]);
  const [fines, setFines] = useState<FineEntry[]>([]);
  const [archivedFines, setArchivedFines] = useState<FineEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Record<string, UserSettings>>({});
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [globalRules, setGlobalRules] = useState<string>('');
  
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedFineId, setSelectedFineId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const lastLocalSaveRef = useRef<number>(0);

  useEffect(() => {
    const loadedUser = storage.get<User | null>('session_user', null);
    const loadedFines = storage.get<FineEntry[]>('fines', []);
    const loadedArchived = storage.get<FineEntry[]>('archived_fines', []);
    const loadedMessages = storage.get<Message[]>('messages', []);
    const loadedPresets = storage.get<PresetFine[]>('presets', DEFAULT_PRESET_FINES);
    const loadedRoles = storage.get<RoleDefinition[]>('roles', DEFAULT_ROLES);
    const loadedSettings = storage.get<Record<string, UserSettings>>('settings', {});
    const loadedRules = storage.get<string>('global_rules', '');
    
    const storedPlayers = storage.get<Player[]>('players', []);
    const finalPlayers = normalizePlayers(storedPlayers);
    storage.save('players', finalPlayers);
    setFines(loadedFines);
    setArchivedFines(loadedArchived);
    setMessages(loadedMessages);
    setPlayers(finalPlayers);
    setPresetFines(loadedPresets);
    setRoles(loadedRoles);
    setSettings(loadedSettings);
    setGlobalRules(loadedRules);
    
    if (loadedUser) {
      setUser(loadedUser);
      const p = finalPlayers.find(pl => pl.id === loadedUser.id);
      if (p && !p.hasChangedPassword) setMustChangePassword(true);
      if (loadedUser.role === 'admin') setView('overview');
      else { setSelectedPlayerId(loadedUser.id); setView('player'); }
    }

    syncFromCloud();
    const subscription = subscribeToCloudChanges(() => syncFromCloud(true));
    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (user?.role === 'admin' && fines.length > 0) {
      runAutoArchive();
    }
  }, [user, fines]);

  const runAutoArchive = async () => {
    const now = new Date();
    const currentMonth = now.getUTCMonth();
    const currentYear = now.getUTCFullYear();

    const toArchive = fines.filter(f => {
      const fineDate = new Date(f.date);
      const isPastYear = fineDate.getUTCFullYear() < currentYear;
      const isPastMonth = fineDate.getUTCFullYear() === currentYear && fineDate.getUTCMonth() < currentMonth;
      return isPastYear || isPastMonth;
    });

    if (toArchive.length > 0) {
      const archivedWithFlag = toArchive.map(f => ({ ...f, isArchived: true }));
      const remainingFines = fines.filter(f => !toArchive.some(ta => ta.id === f.id));
      
      setFines(remainingFines);
      setArchivedFines(prev => {
        const newArchive = [...prev, ...archivedWithFlag];
        storage.save('archived_fines', newArchive);
        return newArchive;
      });
      storage.save('fines', remainingFines);

      try {
        await Promise.all([
          ...toArchive.map(f => cloudDelete('fine', f.id)),
          cloudSaveBulk('archive', archivedWithFlag)
        ]);
      } catch (e) {
        console.error("Auto-archive sync failed", e);
      }
    }
  };

  const syncFromCloud = async (silent = false) => {
    if (Date.now() - lastLocalSaveRef.current < 5000 && silent) return;
    if (!silent) setIsSyncing(true);
    
    try {
      const [cloudFines, cloudArchived, cloudPlayers, cloudPresets, cloudRoles, cloudSettings, cloudMessages, cloudRules] = (await Promise.all([
        cloudFetchAll('fine'),
        cloudFetchAll('archive'),
        cloudFetchAll('player'),
        cloudFetchAll('preset'),
        cloudFetchAll('role'),
        cloudFetchAll('settings'),
        cloudFetchAll('message'),
        cloudFetchAll('global')
      ])) as [FineEntry[], FineEntry[], Player[], PresetFine[], RoleDefinition[], any[], Message[], any[]];

      let updatedArchive = archivedFines;
      if (cloudArchived) {
        updatedArchive = cloudArchived;
        setArchivedFines(cloudArchived);
        storage.save('archived_fines', cloudArchived);
      }

      setFines(prevLocal => {
        const now = Date.now();
        const archiveIds = new Set(updatedArchive.map(af => af.id));
        const filteredCloudFines = (cloudFines || []).filter(cf => !archiveIds.has(cf.id));
        const cloudMap = new Map(filteredCloudFines.map(f => [f.id, f]));
        
        const merged = prevLocal.filter(lf => 
          !archiveIds.has(lf.id) && 
          (cloudMap.has(lf.id) || (now - lf.timestamp) < 60000)
        );
        
        filteredCloudFines.forEach(cf => { 
          if (!merged.find(m => m.id === cf.id)) merged.push(cf); 
        });
        
        storage.save('fines', merged);
        return [...merged];
      });

      if (cloudPlayers && cloudPlayers.length > 0) {
          setPlayers(prevLocal => {
            const final = normalizePlayers(prevLocal, cloudPlayers);
            storage.save('players', final);
            return final;
          });
      }

      if (cloudMessages) { setMessages(cloudMessages); storage.save('messages', cloudMessages); }
      if (cloudPresets?.length > 0) { setPresetFines(cloudPresets); storage.save('presets', cloudPresets); }
      if (cloudRoles?.length > 0) { setRoles(cloudRoles); storage.save('roles', cloudRoles); }
      if (cloudRules?.length > 0) {
          const rulesText = cloudRules.find(r => r.id === 'rules')?.text || '';
          setGlobalRules(rulesText);
          storage.save('global_rules', rulesText);
      }
      const settingsMap: Record<string, UserSettings> = {};
      (cloudSettings || []).forEach((s: any) => settingsMap[s.playerId] = s);
      setSettings(settingsMap);

      if (!silent) triggerToast("Synkronisert");
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  };

  const saveFine = async (fine: FineEntry) => {
    // Sjekk om boten allerede finnes i arkivet
    const isInArchive = archivedFines.some(f => f.id === fine.id) || fine.isArchived;

    if (isInArchive) {
      setArchivedFines(prev => {
        const newList = prev.find(f => f.id === fine.id) ? prev.map(f => f.id === fine.id ? fine : f) : [...prev, fine];
        storage.save('archived_fines', newList);
        return newList;
      });
      await cloudSave('archive', fine.id, { ...fine, isArchived: true });
    } else {
      setFines(prev => {
        const newList = prev.find(f => f.id === fine.id) ? prev.map(f => f.id === fine.id ? fine : f) : [...prev, fine];
        storage.save('fines', newList);
        return newList;
      });
      await cloudSave('fine', fine.id, fine);
    }
  };

  const handlePayAllRequest = async (ids: string[]) => {
    const updatedFines: FineEntry[] = [];
    const date = new Date().toISOString();
    
    const newLocalFines = fines.map(f => {
      if (ids.includes(f.id)) {
        const updated = { ...f, payRequest: { status: 'pending' as const, date } };
        updatedFines.push(updated);
        return updated;
      }
      return f;
    });

    setFines(newLocalFines);
    storage.save('fines', newLocalFines);
    
    try {
      await cloudSaveBulk('fine', updatedFines);
      triggerToast(`${ids.length} betalinger meldt`);
    } catch (e) {
      triggerErrorToast("Feil ved lagring i sky");
    }
  };

  const deleteFine = async (id: string) => {
    const isInArchive = archivedFines.some(f => f.id === id);
    
    if (isInArchive) {
      setArchivedFines(prev => {
        const newList = prev.filter(f => f.id !== id);
        storage.save('archived_fines', newList);
        return newList;
      });
      await cloudDelete('archive', id);
    } else {
      setFines(prev => {
        const newList = prev.filter(f => f.id !== id);
        storage.save('fines', newList);
        return newList;
      });
      await cloudDelete('fine', id);
    }
    
    if (selectedFineId === id) { setSelectedFineId(null); setView('list'); }
    triggerToast("Slettet");
  };

  const handleUpdateSettings = async (playerId: string, newSettings: UserSettings) => {
    lastLocalSaveRef.current = Date.now();
    setSettings(prev => {
        const updated = { ...prev, [playerId]: newSettings };
        storage.save('settings', updated);
        return updated;
    });
    try {
        await cloudSave('settings', playerId, { ...newSettings, playerId });
        triggerToast("Lagret i skyen");
    } catch (e) {
        triggerErrorToast("Tilkoblingsfeil");
    }
  };

  const handleUpdateGlobalRules = async (text: string) => {
      setGlobalRules(text);
      storage.save('global_rules', text);
      await cloudSave('global', 'rules', { id: 'rules', text });
  };

  const handleLogin = (u: User) => {
    const player = players.find(p => p.id === u.id);
    if (player && !player.hasChangedPassword) setMustChangePassword(true);
    setUser(u);
    storage.save('session_user', u);
    if(u.role === 'admin') setView('overview'); 
    else { setSelectedPlayerId(u.id); setView('player'); }
  };

  const handleLogout = () => { 
    setUser(null); storage.remove('session_user'); setView('login'); setSelectedPlayerId(null); setMustChangePassword(false);
  };

  const handleUpdatePlayer = async (playerId: string, updates: Partial<Player>) => {
    setPlayers(prev => {
        const updatedPlayers = prev.map(p => p.id === playerId ? { ...p, ...updates } : p);
        storage.save('players', updatedPlayers);
        const player = updatedPlayers.find(p => p.id === playerId);
        if (player) cloudSave('player', playerId, player);
        return updatedPlayers;
    });
  };

  const handlePasswordChange = async (newPassword: string) => {
    if (!user) return;
    await handleUpdatePlayer(user.id, { password: newPassword, hasChangedPassword: true });
    setMustChangePassword(false);
    triggerToast("Passord er endret!");
  };

  const handleSendMessage = async (recipientId: string | 'all', subject: string, body: string) => {
    if (!user) return;
    const newMessage: Message = { id: crypto.randomUUID(), senderId: user.id, recipientId, subject, body, timestamp: Date.now() };
    setMessages(prev => { const newList = [newMessage, ...prev]; storage.save('messages', newList); return newList; });
    await cloudSave('message', newMessage.id, newMessage);
    setShowSendMessageModal(false);
    triggerToast("Melding sendt!");
  };

  const handleAddPlayer = async (name: string, position: string) => {
      const newPlayer: Player = { id: crypto.randomUUID(), name, position, systemRole: 'user' };
      setPlayers(prev => { const newList = [...prev, newPlayer]; storage.save('players', newList); return newList; });
      await cloudSave('player', newPlayer.id, newPlayer);
      triggerToast("Spiller lagt til");
  };

  const handleRemovePlayer = async (id: string) => {
      setPlayers(prev => { const newList = prev.filter(p => p.id !== id); storage.save('players', newList); return newList; });
      await cloudDelete('player', id);
      triggerToast("Spiller fjernet");
  };

  const handleToggleAdmin = async (playerId: string) => {
      setPlayers(prev => {
          const updated = prev.map(p => p.id === playerId ? { ...p, systemRole: (p.systemRole === 'admin' ? 'user' : 'admin') as any } : p);
          storage.save('players', updated);
          const player = updated.find(p => p.id === playerId);
          if (player) cloudSave('player', playerId, player);
          return updated;
      });
      triggerToast("Rettigheter endret");
  };

  const handleAddPresetFine = async (label: string, amount: number, icon: string) => {
      const newPreset: PresetFine = { id: crypto.randomUUID(), label, amount, icon };
      setPresetFines(prev => { const newList = [...prev, newPreset]; storage.save('presets', newList); return newList; });
      await cloudSave('preset', newPreset.id, newPreset);
      triggerToast("Bot lagt til");
  };

  const handleRemovePresetFine = async (id: string) => {
      setPresetFines(prev => { const newList = prev.filter(f => f.id !== id); storage.save('presets', newList); return newList; });
      await cloudDelete('preset', id);
      triggerToast("Bot fjernet");
  };

  const handleAddRole = async (name: string, color: string) => {
      const newRole: RoleDefinition = { id: crypto.randomUUID(), name, color };
      setRoles(prev => { const newList = [...prev, newRole]; storage.save('roles', newList); return newList; });
      await cloudSave('role', newRole.id, newRole);
      triggerToast("Rolle lagt til");
  };

  const handleRemoveRole = async (id: string) => {
      setRoles(prev => { const newList = prev.filter(r => r.id !== id); storage.save('roles', newList); return newList; });
      await cloudDelete('role', id);
      triggerToast("Rolle fjernet");
  };

  const pushAllToCloud = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        cloudSaveBulk('fine', fines),
        cloudSaveBulk('archive', archivedFines),
        cloudSaveBulk('player', players),
        cloudSaveBulk('preset', presetFines),
        cloudSaveBulk('role', roles),
        cloudSaveBulk('message', messages),
        cloudSave('global', 'rules', { id: 'rules', text: globalRules })
      ]);
      triggerToast("Alt lagret i skyen!");
    } catch (e) {
      triggerErrorToast("Tilkoblingsfeil.");
    } finally { setIsSyncing(false); }
  };

  const handleVoteOnComplaint = async (fineId: string, voterId: string, vote: 'maintain' | 'dismiss') => {
      const fine = [...fines, ...archivedFines].find(f => f.id === fineId);
      if (!fine || !fine.complaint) return;

      const newVotes = { ...(fine.complaint.votes || {}), [voterId]: vote };
      const updatedFine: FineEntry = {
          ...fine,
          complaint: { ...fine.complaint, votes: newVotes }
      };

      saveFine(updatedFine);
      triggerToast("Stemme registrert!");
  };

  const triggerToast = (msg: string) => {
    setShowSuccessToast(msg);
    setTimeout(() => setShowSuccessToast(null), 2000);
  };

  const triggerErrorToast = (msg: string) => {
    setShowErrorToast(msg);
    setTimeout(() => setShowErrorToast(null), 3000);
  };

  const headerStats = useMemo(() => {
    const uniqueFinesMap = new Map<string, FineEntry>();
    [...fines, ...archivedFines].forEach(f => uniqueFinesMap.set(f.id, f));
    const allUniqueFines = Array.from(uniqueFinesMap.values());
    
    const targetFines = user?.role === 'admin' ? allUniqueFines : allUniqueFines.filter(f => f.playerId === user?.id);
    const debt = targetFines.filter(f => f.status === 'unpaid').reduce((a, b) => a + b.amount, 0);
    const paid = targetFines.filter(f => f.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const total = debt + paid;
    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
    
    return { debt, paid, total, percent };
  }, [user, fines, archivedFines]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold tracking-tight">NHHI FC Botkassa våkner...</p>
      </div>
    );
  }

  const currentSelectedFine = [...fines, ...archivedFines].find(f => f.id === selectedFineId);
  const currentSelectedPlayer = players.find(p => p.id === (selectedPlayerId || user?.id));

  const getFineDetailPlayer = (fine: FineEntry) => {
      const p = players.find(x => x.id === fine.playerId);
      return p || { id: fine.playerId, name: 'Slettet spiller', systemRole: 'user' as const };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-green-400" />
          <span className="text-xs font-bold uppercase">{showSuccessToast}</span>
        </div>
      )}

      {showErrorToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <AlertTriangle size={16} />
          <span className="text-xs font-bold uppercase">{showErrorToast}</span>
        </div>
      )}

      {user && (
        <header className="bg-blue-900 text-white pt-10 pb-16 px-6 rounded-b-[3.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none -rotate-12"><Shield size={280} /></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <button onClick={() => setShowSettingsModal(true)} className="p-2 bg-blue-800 rounded-xl hover:bg-blue-700 transition-colors"><Settings size={16} /></button>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-white/10 border border-white/10">
                              {user.role === 'admin' ? 'Botsjef' : 'Spiller'}
                            </span>
                            <button onClick={() => syncFromCloud()} className={`p-2 rounded-full ${isSyncing ? 'animate-pulse text-amber-400' : 'text-green-400'}`}>
                                <Cloud size={14} />
                            </button>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">NHHI FC</h1>
                        <p className="text-blue-200 text-xs">{user.name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setShowSearchModal(true)} className="p-2.5 bg-blue-800 rounded-2xl hover:bg-blue-700 transition-colors"><Search size={20} /></button>
                        {user.role === 'admin' && (
                          <button onClick={() => setShowSendMessageModal(true)} className="p-2.5 bg-blue-800 rounded-2xl hover:bg-blue-700 transition-colors">
                            <Mail size={20} />
                          </button>
                        )}
                        <button onClick={() => setView('notifications')} className="p-2.5 bg-blue-800 rounded-2xl hover:bg-blue-700 transition-colors"><Bell size={20} /></button>
                        <button onClick={handleLogout} className="p-2.5 bg-blue-800 rounded-2xl hover:bg-blue-700 transition-colors"><LogOut size={20} /></button>
                    </div>
                </div>

                {/* --- OPPDATERT HEADER-STRUKTUR (TOTAL & PROGRESS) --- */}
                <div className="space-y-4">
                    <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/10 shadow-inner">
                        <div className="flex justify-between items-end mb-4">
                            <div className="text-center flex-1">
                                <div className="text-blue-300 text-[10px] font-black uppercase mb-1">Gjeld</div>
                                <div className="text-2xl font-black">{headerStats.debt.toLocaleString()} kr</div>
                            </div>
                            
                            <div className="px-4 text-center">
                                <div className="text-white/40 text-[9px] font-black uppercase mb-1">Total påløpt</div>
                                <div className="text-sm font-black text-amber-400">{headerStats.total.toLocaleString()} kr</div>
                            </div>

                            <div className="text-center flex-1">
                                <div className="text-green-300 text-[10px] font-black uppercase mb-1">Betalt</div>
                                <div className="text-2xl font-black">{headerStats.paid.toLocaleString()} kr</div>
                            </div>
                        </div>

                        {/* Innkrevingsgrad progress bar */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-black text-blue-300 uppercase">Innkrevingsgrad</span>
                                <span className="text-[9px] font-black text-green-300 uppercase">{headerStats.percent}%</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                    style={{ width: `${headerStats.percent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
      )}

      <main className={`px-4 max-w-lg mx-auto ${user ? '-mt-10 relative z-20' : ''}`}>
        {!user ? (
            <div className="mt-20">
              <LoginView onLogin={handleLogin} players={players} />
            </div>
        ) : (
            view === 'add' ? <AddFineView onAddFine={saveFine} players={players} presetFines={presetFines} /> :
            view === 'overview' ? <StatsView fines={[...fines, ...archivedFines]} players={players} onSelectPlayer={(id) => { setSelectedPlayerId(id); setView('player'); }} currentFilter={filter} onFilterChange={setFilter} currentUserRole={user.role} /> :
            view === 'list' ? <FineListView fines={[...fines, ...archivedFines]} players={players} currentFilter={filter} onSelectFine={(id) => { setSelectedFineId(id); setView('fine_detail'); }} currentUserRole={user.role} /> :
            view === 'notifications' ? <NotificationsView user={user} fines={[...fines, ...archivedFines]} messages={messages} players={players} /> :
            view === 'archive' ? <ArchiveView fines={archivedFines} players={players} onBack={() => setView('player')} onSelectFine={(id) => { setSelectedFineId(id); setView('fine_detail'); }} /> :
            view === 'fine_detail' ? (
                currentSelectedFine ? (
                    <FineDetailView 
                        fine={currentSelectedFine} 
                        player={getFineDetailPlayer(currentSelectedFine)} 
                        currentUser={user} 
                        presetFines={presetFines} 
                        onBack={() => setView('list')} 
                        onGoToProfile={(id) => { setSelectedPlayerId(id); setView('player'); }} 
                        onAddComment={(fid, t) => saveFine({...currentSelectedFine, comments: [...(currentSelectedFine.comments || []), {id: crypto.randomUUID(), userId: user.id, userName: user.name, text: t, timestamp: Date.now()}]})}
                        onDeleteComment={(fid, cid) => saveFine({...currentSelectedFine, comments: (currentSelectedFine.comments || []).filter(c => c.id !== cid)})}
                        onToggleFineReaction={(fid, e) => { const r = currentSelectedFine.reactions || []; const i = r.findIndex(x => x.userId === user.id && x.emoji === e); saveFine({...currentSelectedFine, reactions: i > -1 ? r.filter((_, idx) => idx !== i) : [...r, {emoji: e, userId: user.id}]}) }}
                        onToggleCommentReaction={(fid, cid, e) => saveFine({...currentSelectedFine, comments: (currentSelectedFine.comments || []).map(c => c.id === cid ? {...c, reactions: (c.reactions || []).findIndex(x => x.userId === user.id && x.emoji === e) > -1 ? (c.reactions || []).filter(x => !(x.userId === user.id && x.emoji === e)) : [...(c.reactions || []), {emoji: e, userId: user.id}]} : c)})}
                        onUpdateFine={saveFine} 
                        onDeleteFine={deleteFine} 
                        onAdminPay={(fid) => saveFine({...currentSelectedFine, status: 'paid', payRequest: undefined})} 
                    />
                ) : ( (setView('list'), null) )
            ) :
            view === 'player' ? (
                currentSelectedPlayer ? (
                    <PlayerProfileView 
                        player={currentSelectedPlayer} 
                        currentUserRole={user.role} 
                        currentUserId={user.id}
                        isOwnProfile={user.id === currentSelectedPlayer.id} 
                        fines={[...fines, ...archivedFines].filter(f => f.playerId === currentSelectedPlayer.id)} 
                        allFines={[...fines, ...archivedFines]}
                        settings={settings[currentSelectedPlayer.id] || { pushEnabled: false }} 
                        presetFines={presetFines} 
                        roles={roles} 
                        players={players}
                        onUpdateSettings={handleUpdateSettings} 
                        onUpdatePlayer={handleUpdatePlayer} 
                        onBack={() => user.role === 'admin' ? setView('overview') : setView('list')} 
                        onUpdateFine={saveFine} 
                        onDeleteFine={deleteFine} 
                        onSubmitComplaint={(fid, r) => saveFine({...(fines.find(x => x.id === fid) || archivedFines.find(x => x.id === fid))!, complaint: {reason: r, status: 'pending', date: new Date().toISOString()}})} 
                        onPayRequest={(fid) => saveFine({...(fines.find(x => x.id === fid) || archivedFines.find(x => x.id === fid))!, payRequest: {status: 'pending', date: new Date().toISOString()}})} 
                        onPayAllRequest={handlePayAllRequest}
                        onAdminPay={(fid) => saveFine({...(fines.find(x => x.id === fid) || archivedFines.find(x => x.id === fid))!, status: 'paid', payRequest: undefined})} 
                        onVoteOnComplaint={(fid, vid, v) => handleVoteOnComplaint(fid, vid, v)}
                        onSelectFine={(id) => { setSelectedFineId(id); setView('fine_detail'); }} 
                        onOpenArchive={() => setView('archive')}
                    />
                ) : ( (setView('overview'), null) )
            ) : null
        )}
      </main>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200 pb-safe pt-2 z-50">
            <div className="flex justify-around items-center max-w-lg mx-auto h-16 px-4">
              {user.role === 'admin' && <button onClick={() => setView('add')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${view === 'add' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}><PlusCircle size={22} /><span className="text-[10px] font-black mt-1 uppercase">Gi Bot</span></button>}
              <button onClick={() => setView('overview')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${view === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}><BarChart3 size={22} /><span className="text-[10px] font-black mt-1 uppercase">Oversikt</span></button>
              <button onClick={() => setView('list')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}><Table size={22} /><span className="text-[10px] font-black mt-1 uppercase">Liste</span></button>
              <button onClick={() => { setSelectedPlayerId(user.id); setView('player'); }} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${view === 'player' && selectedPlayerId === user.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}><Shield size={22} /><span className="text-[10px] font-black mt-1 uppercase">Profil</span></button>
            </div>
        </nav>
      )}

      {showSearchModal && <SearchModal players={players} onSelect={(id) => { setSelectedPlayerId(id); setView('player'); setShowSearchModal(false); }} onClose={() => setShowSearchModal(false)} />}
      {showSendMessageModal && user && <SendMessageModal players={players} onSend={handleSendMessage} onCancel={() => setShowSendMessageModal(false)} />}
      {showSettingsModal && user && (
        <SettingsModal 
          currentUser={user} 
          settings={settings[user.id] || { pushEnabled: false }} 
          players={players} presetFines={presetFines} roles={roles}
          globalRules={globalRules}
          onSaveGlobalRules={handleUpdateGlobalRules}
          onSave={handleUpdateSettings} onUpdatePassword={handlePasswordChange}
          onPushToCloud={pushAllToCloud} isSyncing={isSyncing} onCancel={() => setShowSettingsModal(false)} 
          onAddPlayer={handleAddPlayer} onRemovePlayer={handleRemovePlayer} onToggleAdmin={handleToggleAdmin}
          onAddPresetFine={handleAddPresetFine} onRemovePresetFine={handleRemovePresetFine}
          onAddRole={handleAddRole} onRemoveRole={handleRemoveRole}
          onImportData={(d) => {
            if (d.fines) setFines(d.fines);
            if (d.players) {
              const normalized = normalizePlayers(d.players);
              storage.save('players', normalized);
              setPlayers(normalized);
            }
          }}
          exportData={{fines: [...fines, ...archivedFines], players, roles, presets: presetFines}} 
        />
      )}
      {mustChangePassword && user && <ChangePasswordModal playerName={user.name} onSave={handlePasswordChange} onCancel={() => {}} />}
    </div>
  );
};

export default App;
