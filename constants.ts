import { Player, PresetFine, RoleDefinition } from './types';

export const ROLE_COLOR_MAP: Record<string, { bg: string, text: string, border: string, solid: string, hex: string }> = {
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', solid: 'bg-purple-500', hex: '#a855f7' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', solid: 'bg-rose-500', hex: '#f43f5e' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', solid: 'bg-amber-500', hex: '#f59e0b' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', solid: 'bg-blue-500', hex: '#3b82f6' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', solid: 'bg-emerald-500', hex: '#10b981' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', solid: 'bg-indigo-500', hex: '#6366f1' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', solid: 'bg-cyan-500', hex: '#06b6d4' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', solid: 'bg-pink-500', hex: '#ec4899' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', solid: 'bg-slate-500', hex: '#64748b' },
  red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', solid: 'bg-red-500', hex: '#ef4444' },
};

export const DEFAULT_ROLES: RoleDefinition[] = [
  { id: '1', name: 'Botsjef', color: 'purple' },
  { id: '2', name: 'Coach', color: 'rose' },
  { id: '3', name: 'Sjef', color: 'amber' },
  { id: '4', name: 'Nygutt', color: 'blue' },
];

export const DEFAULT_PLAYERS: Player[] = [
  // Gruppe A-J (Bilde 1)
  { id: 'p1', name: 'Adrian Thorsen', position: 'Spiller', systemRole: 'user', phone: '+4747719299', hasChangedPassword: false },
  { id: 'p2', name: 'Aleksander Moe', position: 'Spiller', systemRole: 'admin', customRole: 'Botsjef', email: 'alekmoe@gmail.com' },
  { id: 'p3', name: 'Andreas Nærby', position: 'Spiller', systemRole: 'user', email: 'andreas@tfinans.no' },
  { id: 'p4', name: 'Axel Andreassen', position: 'Spiller', systemRole: 'user', email: 'axel.andreassen@icloud.com' },
  { id: 'p5', name: 'Birk Haugnes', position: 'Spiller', systemRole: 'admin', customRole: 'Botsjef', phone: '+4796049346' },
  { id: 'p6', name: 'Eirik Sorger Olsen', position: 'Spiller', systemRole: 'user', phone: '+4797839653' },
  { id: 'p7', name: 'Filip Wold', position: 'Spiller', systemRole: 'user', email: 'filipwold@gmail.com' },
  { id: 'p8', name: 'Henrik Stubberud', position: 'Spiller', systemRole: 'user', email: 'hestubb@online.no' },
  { id: 'p9', name: 'Henrik Torgersen', position: 'Spiller', systemRole: 'user', email: 'hentorgersen@gmail.com' },
  { id: 'p10', name: 'Jakob Degerstrøm Hanssen', position: 'Spiller', systemRole: 'user', email: 'jakob.degerstrom@gmail.com' },
  { id: 'p11', name: 'Jakob Gundersen', position: 'Spiller', systemRole: 'user', email: 'jakob.gundersen03@gmail.com' },
  { id: 'p12', name: 'Jakob Sørum', position: 'Spiller', systemRole: 'user', phone: '+4791165517' },
  { id: 'p13', name: 'Jonas Landsem Kristiansen', position: 'Spiller', systemRole: 'user', email: 'jonas.landsem.kristiansen@gmail.com' },
  
  // Gruppe L-O (Bilde 2)
  { id: 'p14', name: 'Leo Kahlert', position: 'Spiller', systemRole: 'user', email: 'leokahlert7@icloud.com' },
  { id: 'p15', name: 'Ludvig Buch Hansen', position: 'Spiller', systemRole: 'user', email: 'ludvigbuchhansen@gmail.com' },
  { id: 'p16', name: 'Mads Solvik', position: 'Spiller', systemRole: 'user', email: 'madssolvik@gmail.com' },
  { id: 'p17', name: 'Marius Perry Mathiesen', position: 'Spiller', systemRole: 'user', email: 'marius.p.mathiesen@gmail.com' },
  { id: 'p18', name: 'Markus Skogøy', position: 'Spiller', systemRole: 'user', email: 'markusskogoy@gmail.com' },
  { id: 'p19', name: 'Markus Stangnes', position: 'Spiller', systemRole: 'user', email: 'markus.e.stangnes@gmail.com' },
  { id: 'p20', name: 'Martin Leganger Devik', position: 'Spiller', systemRole: 'user', email: 'martin.l.devik@gmail.com' },
  { id: 'p21', name: 'Nicklas Aanonsen', position: 'Spiller', systemRole: 'user', email: 'nicklaslillerudaanonsen@gmail.com' },
  { id: 'p22', name: 'Nils Anders Kjærefjord', position: 'Spiller', systemRole: 'user', phone: '+4746851991' },
  { id: 'p23', name: 'Njål Sondre Osmundsen', position: 'Spiller', systemRole: 'user', email: 'njaalosmundsen@gmail.com' },
  { id: 'p24', name: 'Ola Hovde', position: 'Spiller', systemRole: 'user', email: 'ola.peder@gmail.com' },
  { id: 'p25', name: 'Ole Bosåen', position: 'Spiller', systemRole: 'user', email: 'olejorgen02@gmail.com' },
  { id: 'p26', name: 'Oliver Badawy', position: 'Spiller', systemRole: 'user', email: 'olivergbadawy@outlook.com' },

  // Gruppe P-W (Bilde 3)
  { id: 'p27', name: 'Petter Lie', position: 'Spiller', systemRole: 'user', phone: '+4795559004' },
  { id: 'p28', name: 'Rasmus Hopland', position: 'Spiller', systemRole: 'user', email: 'rasmus.hopland@outlook.com' },
  { id: 'p29', name: 'Sebastian Gulland', position: 'Spiller', systemRole: 'user', email: 'sebastianoliver@live.no' },
  { id: 'p30', name: 'Sebastian Riegler', position: 'Spiller', systemRole: 'user', email: 'riegler.basti@gmx.at' },
  { id: 'p31', name: 'Simen Lundem', position: 'Spiller', systemRole: 'user', phone: '+4741642555' },
  { id: 'p32', name: 'Simon Telle', position: 'Spiller', systemRole: 'user', phone: '+4798105015' },
  { id: 'p33', name: 'Thomas Lervik', position: 'Spiller', systemRole: 'user', email: 'thomas.lervik@hotmail.no' },
  { id: 'p34', name: 'Tormod Bratheim', position: 'Spiller', systemRole: 'user', email: 'tormod.bratheim@gmail.com' },
  { id: 'p35', name: 'Trygve Sundstrøm', position: 'Spiller', systemRole: 'user', email: 'trksund@gmail.com' },
  { id: 'p36', name: 'Trym Jacobsen', position: 'Spiller', systemRole: 'user', phone: '+4794858210' },
  { id: 'p37', name: 'William Onstad', position: 'Spiller', systemRole: 'user' },
  { id: 'p38', name: 'Joakim Fyhn', position: 'Spiller', systemRole: 'user' },
];

export const PRESET_FINES: PresetFine[] = [
  { id: 'ball_pickup', label: 'Drar fra ballhenting etter kamp', amount: 30, icon: '🏃' },
  { id: 'fantasy', label: 'Fantasy bot', amount: 50, icon: '📉' },
  { id: 'late_gf', label: 'Forsein til GF', amount: 30, icon: '👔' },
  { id: 'late_party', label: 'Forsein til inndrikking', amount: 50, icon: '🍻' },
  { id: 'late_match', label: 'Forsein til kamp', amount: 30, icon: '⏰' },
  { id: 'late_training', label: 'Forsein til trening', amount: 30, icon: '⏱️' },
  { id: 'idiot', label: 'Idiotbot', amount: 50, icon: '🤡' },
  { id: 'no_reply_match', label: 'Ikke svar til kamp i tide', amount: 50, icon: '📵' },
  { id: 'no_reply_training', label: 'Ikke svar til trening i tide', amount: 30, icon: '📩' },
  { id: 'nutmeg', label: 'Luke', amount: 10, icon: '🦵' },
  { id: 'no_show', label: 'Påmeldt kamp, møter ikke', amount: 150, icon: '👻' },
  { id: 'shot', label: 'Shot kompromiss', amount: 100, icon: '🥃' },
  { id: 'over_net', label: 'Skjøt ball over nettet på trening', amount: 10, icon: '🚀' },
];
