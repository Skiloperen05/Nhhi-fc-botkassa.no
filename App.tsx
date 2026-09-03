
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ViewState, FineEntry, User, TimeFilter, UserSettings, Player, PresetFine, RoleDefinition, Message } from './types';
import { PRESET_FINES as DEFAULT_PRESET_FINES, DEFAULT_ROLES } from './constants';
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
import { getFineHistory } from './services/historyService';
import { archiveFinesSafely, preparePaymentRequests } from './services/finePersistenceService';
import { cloudSave, cloudDelete, cloudFetchAll, subscribeToCloudChanges, cloudSaveBulk } from './services/supabaseService';
import { PlusCircle, BarChart3, Shield, Table, LogOut, Bell, Settings, Search, Loader2, CheckCircle2, Cloud, AlertTriangle, Mail } from 'lucide-react';

import { ACCOUNT_MIGRATION_VERSION, isPlayerActive, normalizeName, normalizePlayerIdentities, repairPlayerAccounts, repairSession } from './services/playerService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncError, setSyncError] = useState(false);
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
  const [fineReturnView, setFineReturnView] = useState<ViewState>('list');
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [listMonthOffset, setListMonthOffset] = useState(0);
  const fineReturnScrollRef = useRef(0);
  const restoreFineScrollRef = useRef(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const mutationBusyRef = useRef(false);
  const mutationVersionRef = useRef(0);
  const syncSequenceRef = useRef(0);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});
  const archiveAttemptRef = useRef('');
  const messageDraftIdRef = useRef<string | null>(null);

  const scheduleSync = () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => { void syncRef.current(true); }, 400);
  };

  // Confirm writes before changing local state. A failed save leaves the form and data intact.
  const runMutation = async (operation: () => Promise<boolean>): Promise<boolean> => {
    if (mutationBusyRef.current) {
      triggerErrorToast('En lagring pågår. Prøv igjen om et øyeblikk.');
      return false;
    }
    mutationBusyRef.current = true;
    mutationVersionRef.current += 1;
    setIsSaving(true);
    try {
      const saved = await operation();
      if (!saved) triggerErrorToast('Kunne ikke lagre. Endringen er ikke bekreftet. Prøv igjen.');
      return saved;
    } catch (error) {
      console.error('Lagring feilet:', error);
      triggerErrorToast('Kunne ikke lagre. Prøv igjen når du har nett.');
      return false;
    } finally {
      mutationBusyRef.current = false;
      mutationVersionRef.current += 1;
      setIsSaving(false);
      scheduleSync();
    }
  };

  // Membership controls roster choices; every fine remains in history and totals.
  const activePlayers = useMemo(() => players.filter(isPlayerActive).sort((a, b) => a.name.localeCompare(b.name, 'nb')), [players]);
  const hiddenPlayerIds = useMemo(() => new Set(players.filter(p => !isPlayerActive(p)).map(p => p.id)), [players]);
  const historyFines = useMemo(() => getFineHistory(fines, archivedFines), [fines, archivedFines]);

  useEffect(() => {
    if (user && hiddenPlayerIds.has(user.id)) {
      setUser(null);
      storage.remove('session_user');
      setView('login');
      setSelectedPlayerId(null);
      setMustChangePassword(false);
      setShowSettingsModal(false);
      setShowSearchModal(false);
      setShowSendMessageModal(false);
    }
  }, [user, hiddenPlayerIds]);

  useEffect(() => {
    const storedUser = storage.get<User | null>('session_user', null);
    const loadedFines = storage.get<FineEntry[]>('fines', []);
    const loadedArchived = storage.get<FineEntry[]>('archived_fines', []);
    // Retain any legacy local-only records before the first confirmed-cloud sync.
    // This recovery copy is never uploaded automatically or used to resurrect deleted fines.
    if ((loadedFines.length || loadedArchived.length) && !storage.get('fine_recovery_before_confirmed_saves_v1', null)) {
      storage.save('fine_recovery_before_confirmed_saves_v1', { savedAt: new Date().toISOString(), fines: loadedFines, archivedFines: loadedArchived });
    }
    const loadedMessages = storage.get<Message[]>('messages', []);
    const loadedPresets = storage.get<PresetFine[]>('presets', DEFAULT_PRESET_FINES);
    const loadedRoles = storage.get<RoleDefinition[]>('roles', DEFAULT_ROLES);
    const loadedSettings = storage.get<Record<string, UserSettings>>('settings', {});
    const loadedRules = storage.get<string>('global_rules', '');

    const storedPlayers = storage.get<Player[]>('players', []);
    const migrationVersion = storage.get<number>('account_migration_version', 0);
    const finalPlayers = migrationVersion < ACCOUNT_MIGRATION_VERSION && storedPlayers.length > 0
      ? repairPlayerAccounts(storedPlayers, storedUser)
      : normalizePlayerIdentities(storedPlayers);
    const repairedUser = repairSession(storedUser, finalPlayers);
    const loadedUser = repairedUser && finalPlayers.some(p => p.id === repairedUser.id && isPlayerActive(p)) ? repairedUser : null;
    storage.save('players', finalPlayers);
    storage.save('account_migration_version', ACCOUNT_MIGRATION_VERSION);
    if (loadedUser) storage.save('session_user', loadedUser);
    else storage.remove('session_user');
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
    const subscription = subscribeToCloudChanges(scheduleSync);
    return () => {
      subscription.unsubscribe();
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isSyncing && !isSaving && !syncError && user?.role === 'admin' && fines.length > 0) {
      void runAutoArchive();
    }
  }, [user, fines, isLoading, isSyncing, isSaving, syncError]);

  const runAutoArchive = async () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const toArchive = fines.filter(f => {
      const fineDate = new Date(f.date);
      const isPastYear = fineDate.getFullYear() < currentYear;
      const isPastMonth = fineDate.getFullYear() === currentYear && fineDate.getMonth() < currentMonth;
      return isPastYear || isPastMonth;
    });

    if (!toArchive.length || mutationBusyRef.current) return;
    const attempt = JSON.stringify(toArchive);
    // Retry on a manual refresh, rather than loop continuously after a network failure.
    if (archiveAttemptRef.current === attempt) return;
    archiveAttemptRef.current = attempt;
    await runMutation(async () => {
      const result = await archiveFinesSafely(toArchive, archivedFines, { saveBulk: cloudSaveBulk, delete: cloudDelete });
      mergeFineUpdates('archive', result.archivedFines);
      const deletedIds = new Set(result.deletedIds);
      setFines(prev => {
        const next = prev.filter(f => !deletedIds.has(f.id));
        storage.save('fines', next);
        return next;
      });
      if (result.failedDeleteIds.length) {
        triggerErrorToast('Arkivkopien er lagret. Oppryddingen prøves igjen ved oppdatering.');
      }
      return true;
    });
  };

  const syncFromCloud = async (silent = false) => {
    if (mutationBusyRef.current) { scheduleSync(); return; }
    const version = mutationVersionRef.current;
    const sequence = ++syncSequenceRef.current;
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

      if ([cloudFines, cloudArchived, cloudPlayers, cloudPresets, cloudRoles, cloudSettings, cloudMessages, cloudRules].some(result => result === null)) {
        throw new Error('Cloud snapshot incomplete; keeping the previous local snapshot.');
      }
      // A fetch begun before a write must not overwrite that write with an older response.
      if (version !== mutationVersionRef.current || sequence !== syncSequenceRef.current) return;
      setArchivedFines(cloudArchived);
      storage.save('archived_fines', cloudArchived);
      setFines(cloudFines);
      storage.save('fines', cloudFines);

      if (cloudPlayers && cloudPlayers.length > 0) {
          setPlayers(prevLocal => {
            const mergedMap = new Map<string, Player>();
            prevLocal.forEach(p => mergedMap.set(p.id, p));
            cloudPlayers.forEach(cp => mergedMap.set(cp.id, { ...mergedMap.get(cp.id), ...cp }));
            const final = normalizePlayerIdentities(Array.from(mergedMap.values()));
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
      storage.save('settings', settingsMap);
      setSyncError(false);

      if (!silent) { archiveAttemptRef.current = ''; triggerToast("Oppdatert"); }
    } catch (error) {
      console.error("Sync error:", error);
      if (sequence === syncSequenceRef.current) setSyncError(true);
    } finally {
      if (sequence === syncSequenceRef.current) {
        setIsSyncing(false);
        setIsLoading(false);
      }
    }
  };
  syncRef.current = syncFromCloud;

  const mergeFineUpdates = (type: 'fine' | 'archive', updates: FineEntry[]) => {
    const setter = type === 'archive' ? setArchivedFines : setFines;
    setter(prev => {
      const merged = new Map(prev.map(f => [f.id, f]));
      updates.forEach(f => merged.set(f.id, f));
      const next = [...merged.values()];
      storage.save(type === 'archive' ? 'archived_fines' : 'fines', next);
      return next;
    });
  };

  const saveFine = async (fine: FineEntry): Promise<boolean> => runMutation(async () => {
    const type = archivedFines.some(f => f.id === fine.id) || fine.isArchived ? 'archive' : 'fine';
    const updated = type === 'archive' ? { ...fine, isArchived: true } : fine;
    if (!await cloudSave(type, fine.id, updated)) return false;
    mergeFineUpdates(type, [updated]);
    return true;
  });

  const saveBulkFines = async (newFines: FineEntry[]): Promise<boolean> => runMutation(async () => {
    if (!newFines.every(fine => activePlayers.some(player => player.id === fine.playerId))) return false;
    if (!await cloudSaveBulk('fine', newFines)) return false;
    mergeFineUpdates('fine', newFines);
    return true;
  });

  const handlePayAllRequest = async (ids: string[]): Promise<boolean> => runMutation(async () => {
    const { fineUpdates, archiveUpdates } = preparePaymentRequests(ids, fines, archivedFines, new Date().toISOString());
    let savedCount = 0;
    let failed = false;
    for (const [type, updates] of [['fine', fineUpdates], ['archive', archiveUpdates]] as const) {
      if (!updates.length) continue;
      if (await cloudSaveBulk(type, updates)) {
        mergeFineUpdates(type, updates);
        savedCount += updates.length;
      } else failed = true;
    }
    if (savedCount) triggerToast(`${savedCount} betaling${savedCount === 1 ? '' : 'er'} meldt${failed ? '. Resten må prøves igjen.' : ''}`);
    return !failed;
  });

  const deleteFine = async (id: string): Promise<boolean> => runMutation(async () => {
    // If archiving left a source copy, remove it first so it cannot reappear later.
    if (fines.some(f => f.id === id) && !await cloudDelete('fine', id)) return false;
    if (archivedFines.some(f => f.id === id) && !await cloudDelete('archive', id)) return false;
    setFines(prev => { const next = prev.filter(f => f.id !== id); storage.save('fines', next); return next; });
    setArchivedFines(prev => { const next = prev.filter(f => f.id !== id); storage.save('archived_fines', next); return next; });
    if (selectedFineId === id) { setSelectedFineId(null); setView(fineReturnView); }
    triggerToast('Boten er slettet');
    return true;
  });

  const handleUpdateSettings = async (playerId: string, newSettings: UserSettings): Promise<boolean> => runMutation(async () => {
    if (!await cloudSave('settings', playerId, { ...newSettings, playerId })) return false;
    setSettings(prev => {
      const updated = { ...prev, [playerId]: newSettings };
      storage.save('settings', updated);
      return updated;
    });
    triggerToast('Profilinnstillinger lagret');
    return true;
  });

  const handleUpdateGlobalRules = async (text: string): Promise<boolean> => runMutation(async () => {
    if (!await cloudSave('global', 'rules', { id: 'rules', text })) return false;
    setGlobalRules(text);
    storage.save('global_rules', text);
    triggerToast('Regler lagret');
    return true;
  });

  const handleLogin = (u: User) => {
    const player = activePlayers.find(p => p.id === u.id);
    if (!player) return;
    if (player && !player.hasChangedPassword) setMustChangePassword(true);
    setUser(u);
    storage.save('session_user', u);
    if(u.role === 'admin') setView('overview');
    else { setSelectedPlayerId(u.id); setView('player'); }
  };

  const handleLogout = () => {
    setUser(null); storage.remove('session_user'); setView('login'); setSelectedPlayerId(null); setMustChangePassword(false);
  };

  const handleUpdatePlayer = async (playerId: string, updates: Partial<Player>): Promise<boolean> => runMutation(async () => {
    const existing = players.find(p => p.id === playerId);
    if (!existing) return false;
    const updated = { ...existing, ...updates };
    if (!await cloudSave('player', playerId, updated)) return false;
    setPlayers(prev => { const next = prev.map(p => p.id === playerId ? updated : p); storage.save('players', next); return next; });
    if (user?.id === playerId) {
      const nextUser = { ...user, name: updated.name, role: updated.systemRole };
      setUser(nextUser);
      storage.save('session_user', nextUser);
    }
    return true;
  });

  const handlePasswordChange = async (newPassword: string): Promise<boolean> => {
    if (!user) return false;
    if (!await handleUpdatePlayer(user.id, { password: newPassword, hasChangedPassword: true })) return false;
    setMustChangePassword(false);
    triggerToast('Passord er endret!');
    return true;
  };

  const handleSendMessage = async (recipientId: string | 'all', subject: string, body: string): Promise<boolean> => runMutation(async () => {
    if (!user) return false;
    messageDraftIdRef.current ??= crypto.randomUUID();
    const newMessage: Message = { id: messageDraftIdRef.current, senderId: user.id, recipientId, subject, body, timestamp: Date.now() };
    if (!await cloudSave('message', newMessage.id, newMessage)) return false;
    setMessages(prev => { const next = [newMessage, ...prev]; storage.save('messages', next); return next; });
    messageDraftIdRef.current = null;
    setShowSendMessageModal(false);
    triggerToast('Melding sendt!');
    return true;
  });

  const handleAddPlayer = async (name: string, position: string): Promise<boolean> => runMutation(async () => {
    const cleanName = name.trim();
    if (!cleanName) return false;
    const existing = players.find(p => normalizeName(p.name).toLocaleLowerCase('nb') === normalizeName(cleanName).toLocaleLowerCase('nb'));
    if (existing && isPlayerActive(existing)) {
      triggerErrorToast('Spilleren finnes allerede');
      return false;
    }
    const player: Player = existing ? { ...existing, isActive: true } : { id: crypto.randomUUID(), name: cleanName, position, systemRole: 'user', isActive: true };
    if (!await cloudSave('player', player.id, player)) return false;
    setPlayers(prev => { const next = existing ? prev.map(p => p.id === player.id ? player : p) : [...prev, player]; storage.save('players', next); return next; });
    triggerToast(existing ? 'Eksisterende spiller aktivert igjen' : 'Spiller lagt til');
    return true;
  });

  const handleHidePlayer = async (id: string): Promise<boolean> => {
    if (!await handleUpdatePlayer(id, { isActive: false })) return false;
    triggerToast('Spiller skjult. Konto og historikk er beholdt.');
    return true;
  };

  const handleToggleAdmin = async (playerId: string): Promise<boolean> => {
    const player = players.find(p => p.id === playerId);
    if (!player || !await handleUpdatePlayer(playerId, { systemRole: player.systemRole === 'admin' ? 'user' : 'admin' })) return false;
    triggerToast('Rettigheter endret');
    return true;
  };

  const handleAddPresetFine = async (label: string, amount: number, icon: string): Promise<boolean> => runMutation(async () => {
    const newPreset: PresetFine = { id: crypto.randomUUID(), label, amount, icon };
    if (!await cloudSave('preset', newPreset.id, newPreset)) return false;
    setPresetFines(prev => { const next = [...prev, newPreset]; storage.save('presets', next); return next; });
    triggerToast('Botkategori lagt til');
    return true;
  });

  const handleRemovePresetFine = async (id: string): Promise<boolean> => runMutation(async () => {
    if (!await cloudDelete('preset', id)) return false;
    setPresetFines(prev => { const next = prev.filter(f => f.id !== id); storage.save('presets', next); return next; });
    triggerToast('Botkategori fjernet');
    return true;
  });

  const handleAddRole = async (name: string, color: string): Promise<boolean> => runMutation(async () => {
    const newRole: RoleDefinition = { id: crypto.randomUUID(), name, color };
    if (!await cloudSave('role', newRole.id, newRole)) return false;
    setRoles(prev => { const next = [...prev, newRole]; storage.save('roles', next); return next; });
    triggerToast('Rolle lagt til');
    return true;
  });

  const handleRemoveRole = async (id: string): Promise<boolean> => runMutation(async () => {
    if (!await cloudDelete('role', id)) return false;
    setRoles(prev => { const next = prev.filter(r => r.id !== id); storage.save('roles', next); return next; });
    triggerToast('Rolle fjernet');
    return true;
  });

  const pushAllToCloud = async (): Promise<boolean> => runMutation(async () => {
    const results = await Promise.all([
      cloudSaveBulk('fine', fines),
      cloudSaveBulk('archive', archivedFines),
      cloudSaveBulk('player', players),
      cloudSaveBulk('preset', presetFines),
      cloudSaveBulk('role', roles),
      cloudSaveBulk('message', messages),
      ...Object.entries<UserSettings>(settings).map(([playerId, value]) => cloudSave('settings', playerId, { ...value, playerId })),
      cloudSave('global', 'rules', { id: 'rules', text: globalRules })
    ]);
    if (!results.every(Boolean)) return false;
    triggerToast('Alt lagret i skyen!');
    return true;
  });

  const handleVoteOnComplaint = async (fineId: string, voterId: string, vote: 'maintain' | 'dismiss') => {
      const fine = historyFines.find(f => f.id === fineId);
      if (!fine || !fine.complaint) return false;

      const newVotes = { ...(fine.complaint.votes || {}), [voterId]: vote };
      const updatedFine: FineEntry = {
          ...fine,
          complaint: { ...fine.complaint, votes: newVotes }
      };

      if (!await saveFine(updatedFine)) return false;
      triggerToast("Stemme registrert!");
      return true;
  };

  const triggerToast = (msg: string) => {
    setShowSuccessToast(msg);
    setTimeout(() => setShowSuccessToast(null), 2000);
  };

  const triggerErrorToast = (msg: string) => {
    setShowErrorToast(msg);
    setTimeout(() => setShowErrorToast(null), 3000);
  };

  const openFine = (id: string) => {
    fineReturnScrollRef.current = window.scrollY;
    setFineReturnView(view);
    setSelectedFineId(id);
    setView('fine_detail');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const returnFromFine = () => {
    restoreFineScrollRef.current = true;
    setView(fineReturnView);
  };

  useEffect(() => {
    if (restoreFineScrollRef.current && view !== 'fine_detail') {
      restoreFineScrollRef.current = false;
      window.scrollTo({ top: fineReturnScrollRef.current, behavior: 'instant' });
    }
  }, [view]);

  useEffect(() => {
    if (view === 'fine_detail' && !historyFines.some(f => f.id === selectedFineId)) setView(fineReturnView);
    if (view === 'player' && !players.some(p => p.id === (selectedPlayerId || user?.id))) setView('overview');
  }, [view, historyFines, players, selectedFineId, selectedPlayerId, user, fineReturnView]);

  const headerStats = useMemo(() => {
    const uniqueFinesMap = new Map<string, FineEntry>();
    historyFines.forEach(f => uniqueFinesMap.set(f.id, f));
    const allUniqueFines = Array.from(uniqueFinesMap.values());

    const targetFines = user?.role === 'admin' ? allUniqueFines : allUniqueFines.filter(f => f.playerId === user?.id);
    const debt = targetFines.filter(f => f.status === 'unpaid').reduce((a, b) => a + b.amount, 0);
    const paid = targetFines.filter(f => f.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const waived = targetFines.filter(f => f.status === 'waived').reduce((a, b) => a + b.amount, 0);
    const total = debt + paid;
    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

    return { debt, paid, waived, total, percent };
  }, [user, historyFines]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold tracking-tight">NHHI FC Botkassa våkner...</p>
      </div>
    );
  }

  const currentSelectedFine = historyFines.find(f => f.id === selectedFineId);
  const currentSelectedPlayer = players.find(p => p.id === (selectedPlayerId || user?.id));

  const getFineDetailPlayer = (fine: FineEntry) => {
      const p = players.find(x => x.id === fine.playerId);
      return p || { id: fine.playerId, name: 'Slettet spiller', systemRole: 'user' as const };
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 font-sans ${view === 'add' ? 'h-[100dvh] overflow-hidden md:h-auto md:min-h-screen md:overflow-visible pb-0 md:pb-32 flex flex-col' : 'pb-24'}`}>
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

      {/* COMPACT MOBILE HEADER FOR 'ADD' VIEW (Takes minimal vertical space so everything fits without scrolling) */}
      {user && view === 'add' && (
        <header className="md:hidden bg-blue-900 text-white px-3.5 py-2 flex items-center justify-between shadow-sm flex-none z-30">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/10 border border-white/10 text-blue-200">
              {user.role === 'admin' ? 'Botsjef' : 'Spiller'}
            </span>
            <h1 className="text-base font-black tracking-tight leading-none">Gi bot</h1>
            <button aria-label="Oppdater data" disabled={isSyncing || isSaving} onClick={() => syncFromCloud()} className={`p-1 rounded-full ${isSyncing ? 'animate-pulse text-amber-400' : syncError ? 'text-red-300' : 'text-green-400'}`}>
              <Cloud size={13} />
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <span className="block text-[8px] font-black uppercase tracking-wider text-blue-300">Lagkassen</span>
              <span className="block text-xs font-black tracking-tight text-white leading-none">{headerStats.total.toLocaleString('nb-NO')} kr</span>
            </div>
            <button aria-label="Søk etter spiller" onClick={() => setShowSearchModal(true)} className="p-1.5 bg-blue-800/80 rounded-lg hover:bg-blue-700 transition-colors">
              <Search size={14} />
            </button>
            <button aria-label="Innstillinger" onClick={() => setShowSettingsModal(true)} className="p-1.5 bg-blue-800/80 rounded-lg hover:bg-blue-700 transition-colors">
              <Settings size={14} />
            </button>
          </div>
        </header>
      )}

      {user && (
        <header className={`bg-blue-900 text-white ${view === 'add' ? 'hidden md:block pt-8 pb-12' : 'pt-10 pb-16'} px-6 rounded-b-[3.5rem] shadow-xl relative overflow-hidden flex-none`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none -rotate-12"><Shield size={280} /></div>
            <div className="relative z-10 max-w-6xl mx-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <button aria-label="Innstillinger" onClick={() => setShowSettingsModal(true)} className="p-2 bg-blue-800 rounded-xl hover:bg-blue-700 transition-colors"><Settings size={16} /></button>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-white/10 border border-white/10">
                              {user.role === 'admin' ? 'Botsjef' : 'Spiller'}
                            </span>
                            <button aria-label="Oppdater data" disabled={isSyncing || isSaving} onClick={() => syncFromCloud()} className={`p-2 rounded-full ${isSyncing ? 'animate-pulse text-amber-400' : syncError ? 'text-red-300' : 'text-green-400'}`}>
                                <Cloud size={14} />
                            </button>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">{view === 'add' ? 'Gi bot' : 'NHHI FC'}</h1>
                        <p className="text-blue-200 text-xs">{view === 'add' ? 'Registrer bot på spillere' : user.name}</p>
                    </div>

                    {/* PC Desktop Navigation Bar (skrivebordsvisning) */}
                    <div className="hidden md:flex items-center bg-blue-950/70 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                      {user.role === 'admin' && (
                        <button
                          onClick={() => setView('add')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            view === 'add' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <PlusCircle size={16} />
                          <span>Gi Bot</span>
                        </button>
                      )}
                      <button
                        onClick={() => setView('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          view === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <BarChart3 size={16} />
                        <span>Oversikt</span>
                      </button>
                      <button
                        onClick={() => setView('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          view === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Table size={16} />
                        <span>Bøteliste</span>
                      </button>
                      <button
                        onClick={() => { setSelectedPlayerId(user.id); setView('player'); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          view === 'player' && selectedPlayerId === user.id ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Shield size={16} />
                        <span>Min Profil</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        {view === 'add' && (
                          <div className="text-right mr-1">
                            <div className="text-[9px] font-black uppercase tracking-wider text-blue-300">Lagkassen</div>
                            <div className="text-base font-black tracking-tight text-white">{headerStats.total.toLocaleString('nb-NO')} kr</div>
                          </div>
                        )}
                        <button aria-label="Søk etter spiller" onClick={() => setShowSearchModal(true)} className="p-2.5 bg-blue-800 rounded-2xl hover:bg-blue-700 transition-colors"><Search size={20} /></button>
                        {user.role === 'admin' && (
                          <button onClick={() => setShowSendMessageModal(true)} className="p-2.5 bg-blue-800 rounded-2xl hover:bg-blue-700 transition-colors">
                            <Mail size={20} />
                          </button>
                        )}
                        <button onClick={() => setView('notifications')} className="p-2.5 bg-blue-800 rounded-2xl hover:bg-blue-700 transition-colors"><Bell size={20} /></button>
                        <button aria-label="Logg ut" onClick={handleLogout} className="p-2.5 bg-blue-800 rounded-2xl hover:bg-blue-700 transition-colors"><LogOut size={20} /></button>
                    </div>
                </div>

                {/* --- OPPDATERT HEADER-STRUKTUR (TOTAL & PROGRESS) --- */}
                {view !== 'add' && (
                  <div className="space-y-4">
                    <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/10 shadow-inner">
                        <div className="flex justify-between items-end mb-4">
                            <div className="text-center flex-1">
                                <div className="text-blue-300 text-[10px] font-black uppercase mb-1">Gjeld</div>
                                <div className="text-2xl font-black">{headerStats.debt.toLocaleString()} kr</div>
                                {headerStats.waived > 0 && (
                                  <div className="text-[10px] text-purple-300 font-bold mt-0.5">({headerStats.waived.toLocaleString()} kr tapt)</div>
                                )}
                            </div>

                            <div className="px-4 text-center">
                                <div className="text-white/40 text-[9px] font-black uppercase mb-1">Total påløpt</div>
                                <div className="text-sm font-black text-amber-400">{(headerStats.total + headerStats.waived).toLocaleString()} kr</div>
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
                )}
            </div>
        </header>
      )}

      <main className={`w-full ${user ? (view === 'add' ? 'flex-1 min-h-0 overflow-hidden md:overflow-visible px-2 pt-1 pb-[4.75rem] md:pb-8 md:p-6 md:max-w-6xl md:mx-auto md:-mt-8 relative z-20 flex flex-col' : 'px-4 max-w-lg md:max-w-6xl mx-auto -mt-10 md:-mt-8 relative z-20') : ''}`}>
        {syncError && <div role="alert" className="mb-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-sm">
          Kunne ikke hente siste oppdatering. Viser sist lagrede data.
          <button disabled={isSaving || isSyncing} onClick={() => void syncFromCloud()} className="ml-2 underline font-semibold">Prøv igjen</button>
        </div>}
        {isSaving && <p role="status" className="text-xs text-blue-600 py-2">Lagrer …</p>}
        {!user ? (
            <div className="mt-20">
              <LoginView onLogin={handleLogin} players={activePlayers} />
            </div>
        ) : (
            view === 'add' ? (
              <AddFineView
                onAddFine={saveFine}
                onAddFines={saveBulkFines}
                players={activePlayers}
                presetFines={presetFines}
                allFines={historyFines}
                potTotal={headerStats.total}
                onTriggerToast={triggerToast}
              />
            ) :
            view === 'overview' ? <StatsView fines={historyFines} players={players} onSelectPlayer={(id) => { setSelectedPlayerId(id); setView('player'); }} currentFilter={filter} onFilterChange={setFilter} currentUserRole={user.role} /> :
            view === 'list' ? (
              <FineListView
                fines={historyFines}
                players={players}
                currentFilter={filter} onFilterChange={setFilter} monthOffset={listMonthOffset} onMonthOffsetChange={setListMonthOffset}
                onSelectFine={openFine}
                currentUserRole={user.role}
                onAdminPay={(fid) => {
                  const fine = historyFines.find(x => x.id === fid);
                  if (fine) return saveFine({ ...fine, status: 'paid', payRequest: undefined });
                }}
                onAdminWaive={(fid, reason) => {
                  const fine = historyFines.find(x => x.id === fid);
                  if (fine) {
                    return saveFine({
                      ...fine,
                      status: 'waived',
                      waivedReason: reason,
                      waivedDate: new Date().toISOString(),
                      waivedBy: user.name,
                      payRequest: undefined
                    });
                  }
                }}
                onAdminReopen={(fid) => {
                  const fine = historyFines.find(x => x.id === fid);
                  if (fine) {
                    return saveFine({
                      ...fine,
                      status: 'unpaid',
                      waivedReason: undefined,
                      waivedDate: undefined,
                      waivedBy: undefined
                    });
                  }
                }}
              />
            ) :
            view === 'notifications' ? <NotificationsView user={user} fines={historyFines} messages={messages} players={players} /> :
            view === 'archive' ? <ArchiveView fines={archivedFines} players={players} onBack={() => setView('player')} onSelectFine={openFine} /> :
            view === 'fine_detail' ? (
                currentSelectedFine ? (
                    <FineDetailView
                        fine={currentSelectedFine}
                        player={getFineDetailPlayer(currentSelectedFine)}
                        currentUser={user}
                        presetFines={presetFines}
                        onBack={returnFromFine}
                        onGoToProfile={(id) => { setSelectedPlayerId(id); setView('player'); }}
                        onAddComment={(fid, t) => saveFine({...currentSelectedFine, comments: [...(currentSelectedFine.comments || []), {id: crypto.randomUUID(), userId: user.id, userName: user.name, text: t, timestamp: Date.now()}]})}
                        onDeleteComment={(fid, cid) => saveFine({...currentSelectedFine, comments: (currentSelectedFine.comments || []).filter(c => c.id !== cid)})}
                        onToggleFineReaction={(fid, e) => { const r = currentSelectedFine.reactions || []; const i = r.findIndex(x => x.userId === user.id && x.emoji === e); return saveFine({...currentSelectedFine, reactions: i > -1 ? r.filter((_, idx) => idx !== i) : [...r, {emoji: e, userId: user.id}]}) }}
                        onToggleCommentReaction={(fid, cid, e) => saveFine({...currentSelectedFine, comments: (currentSelectedFine.comments || []).map(c => c.id === cid ? {...c, reactions: (c.reactions || []).findIndex(x => x.userId === user.id && x.emoji === e) > -1 ? (c.reactions || []).filter(x => !(x.userId === user.id && x.emoji === e)) : [...(c.reactions || []), {emoji: e, userId: user.id}]} : c)})}
                        onUpdateFine={saveFine}
                        onDeleteFine={deleteFine}
                        onAdminPay={(fid) => saveFine({...currentSelectedFine, status: 'paid', payRequest: undefined})}
                        onAdminWaive={(fid, reason) => saveFine({
                          ...currentSelectedFine,
                          status: 'waived',
                          waivedReason: reason,
                          waivedDate: new Date().toISOString(),
                          waivedBy: user.name,
                          payRequest: undefined
                        })}
                        onAdminReopen={(fid) => saveFine({
                          ...currentSelectedFine,
                          status: 'unpaid',
                          waivedReason: undefined,
                          waivedDate: undefined,
                          waivedBy: undefined
                        })}
                    />
                ) : null
            ) :
            view === 'player' ? (
                currentSelectedPlayer ? (
                    <PlayerProfileView
                        player={currentSelectedPlayer}
                        currentUserRole={user.role}
                        currentUserId={user.id}
                        isOwnProfile={user.id === currentSelectedPlayer.id}
                        fines={historyFines.filter(f => f.playerId === currentSelectedPlayer.id)}
                        allFines={historyFines}
                        settings={settings[currentSelectedPlayer.id] || { pushEnabled: false }}
                        presetFines={presetFines}
                        roles={roles}
                        players={players}
                        onUpdateSettings={handleUpdateSettings}
                        onUpdatePlayer={handleUpdatePlayer}
                        onBack={() => user.role === 'admin' ? setView('overview') : setView('list')}
                        onUpdateFine={saveFine}
                        onDeleteFine={deleteFine}
                        onSubmitComplaint={(fid, r) => saveFine({...(historyFines.find(x => x.id === fid))!, complaint: {reason: r, status: 'pending', date: new Date().toISOString()}})}
                        onPayRequest={(fid) => saveFine({...(historyFines.find(x => x.id === fid))!, payRequest: {status: 'pending', date: new Date().toISOString()}})}
                        onPayAllRequest={handlePayAllRequest}
                        onAdminPay={(fid) => saveFine({...(historyFines.find(x => x.id === fid))!, status: 'paid', payRequest: undefined})}
                        onVoteOnComplaint={(fid, vid, v) => handleVoteOnComplaint(fid, vid, v)}
                        onSelectFine={openFine}
                        onOpenArchive={() => setView('archive')}
                    />
                ) : null
            ) : null
        )}
      </main>

      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200 pb-safe pt-2 z-50">
            <div className="flex justify-around items-center max-w-lg mx-auto h-16 px-4">
              {user.role === 'admin' && <button onClick={() => setView('add')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${view === 'add' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}><PlusCircle size={22} /><span className="text-[10px] font-black mt-1 uppercase">Gi Bot</span></button>}
              <button onClick={() => setView('overview')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${view === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}><BarChart3 size={22} /><span className="text-[10px] font-black mt-1 uppercase">Oversikt</span></button>
              <button onClick={() => setView('list')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}><Table size={22} /><span className="text-[10px] font-black mt-1 uppercase">Liste</span></button>
              <button onClick={() => { setSelectedPlayerId(user.id); setView('player'); }} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${view === 'player' && selectedPlayerId === user.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}><Shield size={22} /><span className="text-[10px] font-black mt-1 uppercase">Profil</span></button>
            </div>
        </nav>
      )}

      {showSearchModal && <SearchModal players={activePlayers} onSelect={(id) => { setSelectedPlayerId(id); setView('player'); setShowSearchModal(false); }} onClose={() => setShowSearchModal(false)} />}
      {showSendMessageModal && user && <SendMessageModal players={activePlayers} onSend={handleSendMessage} onCancel={() => setShowSendMessageModal(false)} />}
      {showSettingsModal && user && (
        <SettingsModal
          currentUser={user}
          settings={settings[user.id] || { pushEnabled: false }}
          players={activePlayers} presetFines={presetFines} roles={roles}
          globalRules={globalRules}
          onSaveGlobalRules={handleUpdateGlobalRules}
          onSave={(newSettings) => handleUpdateSettings(user.id, newSettings)} onUpdatePassword={handlePasswordChange}
          onPushToCloud={pushAllToCloud} isSyncing={isSyncing || isSaving} onCancel={() => setShowSettingsModal(false)}
          onAddPlayer={handleAddPlayer} onHidePlayer={handleHidePlayer} onToggleAdmin={handleToggleAdmin}
          onAddPresetFine={handleAddPresetFine} onRemovePresetFine={handleRemovePresetFine}
          onAddRole={handleAddRole} onRemoveRole={handleRemoveRole}
          exportData={{fines: historyFines, players, roles, presets: presetFines}}
        />
      )}
      {mustChangePassword && user && <ChangePasswordModal playerName={user.name} onSave={handlePasswordChange} onCancel={() => {}} />}
    </div>
  );
};

export default App;
