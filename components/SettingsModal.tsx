
import React, { useState } from 'react';
import { Button } from './Button';
import { UserSettings, User, Player, PresetFine, RoleDefinition, FineEntry } from '../types';
import { X, Smartphone, Save, UploadCloud, RefreshCw, Plus, Trash2, ShieldCheck, Lock, KeyRound, CheckCircle2, AlertCircle, BookOpen, Edit3, Download, FileSpreadsheet, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { ROLE_COLOR_MAP } from '../constants';

interface SettingsModalProps {
  currentUser?: User;
  settings: UserSettings;
  players?: Player[]; 
  presetFines?: PresetFine[];
  roles?: RoleDefinition[];
  globalRules?: string;
  onSaveGlobalRules?: (text: string) => void;
  onSave: (settings: UserSettings) => void;
  onUpdatePassword?: (password: string) => Promise<void>;
  onPushToCloud: () => void;
  isSyncing: boolean;
  onCancel: () => void;
  onAddPlayer?: (name: string, position: string) => void;
  onRemovePlayer?: (id: string) => void;
  onToggleAdmin?: (playerId: string) => void;
  onAddPresetFine?: (label: string, amount: number, icon: string) => void;
  onRemovePresetFine?: (id: string) => void;
  onAddRole?: (name: string, color: string) => void; 
  onRemoveRole?: (id: string) => void; 
  onImportData: (data: any) => void;
  exportData: {
    fines: FineEntry[];
    players: Player[];
    roles: RoleDefinition[];
    presets: PresetFine[];
  };
}

const EMOJI_GRID = ['⚽', '🍺', '🍻', '🥃', '⏰', '🏃', '🚀', '🤡', '👔', '📵', '🦵', '📉', '👻', '💰', '🚿', '🏆', '🟥', '🟨'];
const COLORS = Object.keys(ROLE_COLOR_MAP);
const MONTHS = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  currentUser, 
  settings, 
  players = [],
  presetFines = [],
  roles = [],
  globalRules = '',
  onSaveGlobalRules,
  onSave, 
  onUpdatePassword,
  onPushToCloud,
  isSyncing,
  onCancel, 
  onAddPlayer,
  onRemovePlayer,
  onToggleAdmin,
  onAddPresetFine,
  onRemovePresetFine,
  onAddRole,
  onRemoveRole,
  exportData
}) => {
  const [phoneNumber, setPhoneNumber] = useState(settings.phoneNumber || '');
  const [email, setEmail] = useState(settings.email || '');
  const [rulesText, setRulesText] = useState(globalRules);
  const [isEditingRules, setIsEditingRules] = useState(false);

  const [activeTab, setActiveTab] = useState<'profile' | 'players' | 'fines' | 'roles' | 'export'>('profile');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newFineName, setNewFineName] = useState('');
  const [newFineAmount, setNewFineAmount] = useState<number>(30);
  const [newFineIcon, setNewFineIcon] = useState('⚽');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('blue');

  const [exportYear, setExportYear] = useState(new Date().getUTCFullYear());
  const [exportMonth, setExportMonth] = useState(new Date().getUTCMonth());

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isSuperAdmin = currentUser?.name === 'Birk Haugnes';
  const isAdmin = currentUser?.role === 'admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...settings, phoneNumber, email });
  };

  const handlePasswordSubmit = async () => {
    if (!onUpdatePassword) return;
    if (newPassword.length < 4) {
      setPasswordError('Minst 4 tegn.');
      return;
    }
    if (newPassword === '1234') {
      setPasswordError('Kan ikke bruke 1234.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passordene er ulike.');
      return;
    }

    await onUpdatePassword(newPassword);
    setIsChangingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleSaveRules = () => {
      if (onSaveGlobalRules) {
          onSaveGlobalRules(rulesText);
          setIsEditingRules(false);
      }
  };

  const handleExportToExcel = () => {
      // 1. Filtrer og sorter bøter etter dato (eldst først)
      const filteredFines = exportData.fines
          .filter(f => {
              const d = new Date(f.date);
              return d.getUTCFullYear() === exportYear && d.getUTCMonth() === exportMonth;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (filteredFines.length === 0) {
          alert(`Ingen bøter funnet for ${MONTHS[exportMonth]} ${exportYear}`);
          return;
      }

      // 2. Beregn totaler
      const totalAmount = filteredFines.reduce((sum, f) => sum + f.amount, 0);

      // 3. Generer hovedliste (Tabell 1)
      let csvContent = "\uFEFF"; // UTF-8 BOM for Excel
      csvContent += "DETALJERT BOTLISTE FOR " + MONTHS[exportMonth].toUpperCase() + " " + exportYear + "\n";
      csvContent += "Dato;Spiller;Kategori;Beløp;Status;Beskrivelse\n";
      
      filteredFines.forEach(f => {
          const player = exportData.players.find(p => p.id === f.playerId)?.name || 'Ukjent';
          const date = new Date(f.date).toLocaleDateString('no-NO');
          const status = f.status === 'paid' ? 'Betalt' : 'Utestående';
          const description = (f.description || '').replace(/;/g, ',');
          csvContent += `${date};${player};${f.reason};${f.amount};${status};${description}\n`;
      });

      csvContent += `;;;${totalAmount};;TOTALT FOR MÅNEDEN\n\n\n`;

      // 4. Generer spiller-oppsummering (Tabell 2)
      csvContent += "OPPSUMMERING PER SPILLER (" + MONTHS[exportMonth] + ")\n";
      csvContent += "Spiller;Utestående (skal betales);Betalt;Totalt påløpt\n";

      const playerStats: Record<string, { name: string, unpaid: number, paid: number }> = {};
      
      filteredFines.forEach(f => {
          if (!playerStats[f.playerId]) {
              const playerName = exportData.players.find(p => p.id === f.playerId)?.name || 'Ukjent';
              playerStats[f.playerId] = { name: playerName, unpaid: 0, paid: 0 };
          }
          if (f.status === 'paid') {
              playerStats[f.playerId].paid += f.amount;
          } else {
              playerStats[f.playerId].unpaid += f.amount;
          }
      });

      // Sorter spillere alfabetisk i oppsummeringen
      const sortedPlayerIds = Object.keys(playerStats).sort((a, b) => 
          playerStats[a].name.localeCompare(playerStats[b].name)
      );

      sortedPlayerIds.forEach(id => {
          const stat = playerStats[id];
          csvContent += `${stat.name};${stat.unpaid};${stat.paid};${stat.unpaid + stat.paid}\n`;
      });

      // 5. Last ned filen
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `NHHI_FC_Regnskap_${MONTHS[exportMonth]}_${exportYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const renderProfile = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brukerprofil</h4>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Telefonnummer</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Smartphone className="h-4 w-4 text-gray-400" /></div>
                            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="912 34 567" className="block w-full pl-9 py-2.5 text-sm border border-slate-300 rounded-xl bg-white shadow-sm" />
                        </div>
                    </div>
                </div>
            </div>
            <Button type="submit" fullWidth><Save size={18} className="mr-2" />Lagre Profil</Button>
        </form>

        <div className="pt-2 border-t border-slate-50 space-y-4">
            {!isChangingPassword ? (
                <button 
                    onClick={() => setIsChangingPassword(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-dashed border-blue-200"
                >
                    <Lock size={16} />
                    Endre passord
                </button>
            ) : (
                <div className="bg-slate-50 p-5 rounded-2xl border border-blue-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-1">
                        <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center">
                            <KeyRound size={12} className="mr-1" /> Sikkerhet
                        </h5>
                        <button onClick={() => setIsChangingPassword(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nytt passord</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-300" /></div>
                                <input 
                                    type="password" 
                                    value={newPassword} 
                                    onChange={(e) => {setNewPassword(e.target.value); setPasswordError('');}} 
                                    placeholder="••••" 
                                    className="w-full pl-9 p-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm tracking-widest" 
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Bekreft passord</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><CheckCircle2 className="h-4 w-4 text-slate-300" /></div>
                                <input 
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={(e) => {setConfirmPassword(e.target.value); setPasswordError('');}} 
                                    placeholder="••••" 
                                    className="w-full pl-9 p-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm tracking-widest" 
                                />
                            </div>
                        </div>
                    </div>

                    {passwordError && (
                        <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase ml-1">
                            <AlertCircle size={12} />
                            {passwordError}
                        </div>
                    )}

                    <Button fullWidth onClick={handlePasswordSubmit} className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100">
                        Oppdater passord
                    </Button>
                </div>
            )}
        </div>

        <div className="pt-6 border-t border-slate-100 space-y-4">
            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center mb-1">
                <BookOpen size={12} className="mr-1" /> Lagets Regler & Satser
            </h4>
            
            {isEditingRules && isSuperAdmin ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                    <textarea 
                        value={rulesText}
                        onChange={(e) => setRulesText(e.target.value)}
                        placeholder="Skriv ned reglene, formålet og satsene her..."
                        className="w-full h-40 p-4 text-sm border border-slate-200 rounded-2xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { setIsEditingRules(false); setRulesText(globalRules || ''); }}
                            className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-colors"
                        >
                            AVBRYT
                        </button>
                        <button 
                            onClick={handleSaveRules}
                            className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-colors shadow-md"
                        >
                            <Save size={14} />
                            OPPDATER REGELBOK
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 text-sm text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                        {globalRules || "Ingen regler er lagt inn ennå. Kontakt Botsjefen."}
                    </div>
                    {isSuperAdmin && (
                        <button 
                            onClick={() => setIsEditingRules(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-colors border border-dashed border-blue-200"
                        >
                            <Edit3 size={14} />
                            REDIGER REGELBOK
                        </button>
                    )}
                </div>
            )}
        </div>

        {currentUser?.role === 'admin' && (
            <div className="pt-6 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center mb-3">
                    <UploadCloud size={12} className="mr-1" /> Sky-kontroll
                </h4>
                <button 
                    onClick={onPushToCloud}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                >
                    {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                    PUSH LOKAL DATA TIL SKYEN
                </button>
            </div>
        )}
    </div>
  );

  const renderPlayers = () => {
    const sortedPlayers = [...players].sort((a,b) => a.name.localeCompare(b.name));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legg til spiller</h4>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newPlayerName} 
                        onChange={(e) => setNewPlayerName(e.target.value)} 
                        placeholder="Fullt navn..." 
                        className="flex-1 p-2.5 text-sm border border-slate-300 rounded-xl bg-white shadow-sm" 
                    />
                    <button 
                        onClick={() => { if(newPlayerName.trim() && onAddPlayer) { onAddPlayer(newPlayerName, 'Spiller'); setNewPlayerName(''); } }}
                        className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 shadow-sm shrink-0"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="space-y-2 max-h-none overflow-visible">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Alle spillere ({players.length})</h4>
                {sortedPlayers.map(p => {
                    const isBirk = p.name === 'Birk Haugnes';
                    return (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all group mb-2">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${p.systemRole === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {p.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                    <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-black">{p.systemRole === 'admin' ? 'Botsjef' : 'Spiller'}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                {isSuperAdmin && !isBirk && (
                                    <button 
                                        onClick={() => onToggleAdmin && onToggleAdmin(p.id)}
                                        className={`p-2 rounded-lg transition-colors ${p.systemRole === 'admin' ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-50'}`}
                                        title="Veksle Botsjef-rettigheter"
                                    >
                                        <ShieldCheck size={18} />
                                    </button>
                                )}
                                {(!isBirk || (isSuperAdmin && isBirk)) && (
                                    <button 
                                        onClick={() => { if(confirm(`Slette ${p.name}?`)) onRemovePlayer && onRemovePlayer(p.id); }}
                                        className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const renderFines = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ny bot-kategori</h4>
            <div className="space-y-4">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Kategori-navn</label>
                        <input type="text" value={newFineName} onChange={(e) => setNewFineName(e.target.value)} placeholder="F.eks: Luke" className="w-full p-2.5 text-sm border border-slate-300 rounded-xl bg-white shadow-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Beløp (kr)</label>
                        <div className="relative">
                            <input type="number" value={newFineAmount} onChange={(e) => setNewFineAmount(Number(e.target.value))} placeholder="Beløp" className="w-full p-2.5 pr-8 text-sm border border-slate-300 rounded-xl bg-white shadow-sm" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">KR</span>
                        </div>
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase ml-1">Velg ikon</p>
                    <div className="grid grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200 no-scrollbar">
                        {EMOJI_GRID.map(e => (
                            <button key={e} onClick={() => setNewFineIcon(e)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all ${newFineIcon === e ? 'bg-blue-100 scale-110 shadow-sm ring-1 ring-blue-300' : 'hover:bg-slate-50'}`}>{e}</button>
                        ))}
                    </div>
                </div>
                <Button fullWidth onClick={() => { if(newFineName && onAddPresetFine) { onAddPresetFine(newFineName, newFineAmount, newFineIcon); setNewFineName(''); } }}>
                    <Plus size={16} className="mr-2" /> Legg til kategori
                </Button>
            </div>
        </div>

        <div className="space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Eksisterende kategorier</h4>
            {presetFines.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow mb-2">
                    <div className="flex items-center gap-4 overflow-hidden w-full">
                        <div className="text-2xl shrink-0 w-12 h-12 bg-slate-50 flex items-center justify-center rounded-2xl border border-slate-100">{f.icon}</div>
                        <div className="truncate flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate block w-full">{f.label}</div>
                            <div className="text-[10px] text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1 border border-blue-100">{f.amount} kr</div>
                        </div>
                        <button onClick={() => onRemovePresetFine && onRemovePresetFine(f.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-colors shrink-0 ml-2"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ny kosmetisk rolle</h4>
            <div className="space-y-3">
                <input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Navn (f.eks Nygutt)" className="w-full p-2.5 text-sm border border-slate-300 rounded-xl bg-white shadow-sm" />
                <div className="grid grid-cols-5 gap-2 p-2 bg-white rounded-xl border border-slate-200">
                    {COLORS.map(c => {
                        const style = ROLE_COLOR_MAP[c];
                        return (
                            <button key={c} onClick={() => setNewRoleColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${style.solid} ${newRoleColor === c ? 'border-white scale-125 shadow-md ring-2 ring-slate-200' : 'border-transparent opacity-60'}`} />
                        );
                    })}
                </div>
                <Button fullWidth onClick={() => { if(newRoleName && onAddRole) { onAddRole(newRoleName, newRoleColor); setNewRoleName(''); } }}>Legg til rolle</Button>
            </div>
        </div>

        <div className="space-y-2">
            {roles.map(r => {
                const color = ROLE_COLOR_MAP[r.color] || ROLE_COLOR_MAP['slate'];
                return (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl mb-2">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${color.bg} ${color.text} ${color.border}`}>{r.name}</div>
                        <button onClick={() => onRemoveRole && onRemoveRole(r.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                );
            })}
        </div>
    </div>
  );

  const renderExport = () => (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                        <FileSpreadsheet size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Excel Eksport</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Hent ut månedsregnskap</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Velg år</label>
                        <select 
                            value={exportYear} 
                            onChange={(e) => setExportYear(Number(e.target.value))}
                            className="w-full p-3 text-sm border border-slate-200 rounded-2xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Velg måned</label>
                        <div className="grid grid-cols-3 gap-2">
                            {MONTHS.map((m, idx) => (
                                <button 
                                    key={m} 
                                    onClick={() => setExportMonth(idx)}
                                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                        exportMonth === idx 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {m.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <Button fullWidth onClick={handleExportToExcel} className="py-4 shadow-xl shadow-blue-100">
                        <Download size={18} className="mr-2" />
                        EKSPORTER TIL EXCEL
                    </Button>
                </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                  Eksporten inneholder alle bøter (både betalte og ubetalte) for den valgte perioden. Filen er i CSV-format som åpnes direkte i Excel eller Google Sheets.
              </p>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm h-[650px] max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20 shrink-0">
          <div>
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight leading-none">Innstillinger</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{currentUser?.name}</p>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors"><X size={20} /></button>
        </div>

        {isAdmin && (
            <div className="px-4 py-4 bg-white border-b border-slate-50 shrink-0 shadow-sm relative z-10">
                <div className="grid grid-cols-5 gap-1 p-1 bg-slate-50 rounded-full">
                    {(['profile', 'players', 'fines', 'roles', 'export'] as const).map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            className={`py-2 rounded-full text-[8px] font-black uppercase transition-all duration-300 flex items-center justify-center ${
                                activeTab === tab 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {tab === 'profile' ? 'Profil' : tab === 'players' ? 'Spill.' : tab === 'fines' ? 'Bøter' : tab === 'roles' ? 'Roll.' : 'Eksport'}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="p-8 flex-1 overflow-y-auto no-scrollbar pt-8 bg-white">
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'players' && renderPlayers()}
            {activeTab === 'fines' && renderFines()}
            {activeTab === 'roles' && renderRoles()}
            {activeTab === 'export' && renderExport()}
        </div>
      </div>
    </div>
  );
};
