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

// Existing account IDs remain stable, including former members.
export const LEGACY_PLAYERS: Player[] = [
  // Gruppe A-J (Bilde 1)
  { id: 'p1', name: 'Adrian Thorsen', position: 'Spiller', systemRole: 'user', phone: '+4747719299', hasChangedPassword: false, isActive: true },
  { id: 'p2', name: 'Aleksander Moe', position: 'Spiller', systemRole: 'admin', customRole: 'Botsjef', email: 'alekmoe@gmail.com', isActive: true },
  { id: 'p3', name: 'Andreas Nærby', position: 'Spiller', systemRole: 'user', email: 'andreas@tfinans.no', isActive: false },
  { id: 'p4', name: 'Axel Andreassen', position: 'Spiller', systemRole: 'user', email: 'axel.andreassen@icloud.com', isActive: true },
  { id: 'p5', name: 'Birk Haugnes', position: 'Spiller', systemRole: 'admin', customRole: 'Botsjef', phone: '+4796049346', isActive: true },
  { id: 'p6', name: 'Eirik Sorger Olsen', position: 'Spiller', systemRole: 'user', phone: '+4797839653', isActive: true },
  { id: 'p7', name: 'Filip Wold', position: 'Spiller', systemRole: 'user', email: 'filipwold@gmail.com', isActive: true },
  { id: 'p8', name: 'Henrik Stubberud', position: 'Spiller', systemRole: 'user', email: 'hestubb@online.no', isActive: true },
  { id: 'p9', name: 'Henrik Torgersen', position: 'Spiller', systemRole: 'user', email: 'hentorgersen@gmail.com', isActive: true },
  { id: 'p10', name: 'Jakob Degerstrøm Hanssen', position: 'Spiller', systemRole: 'user', email: 'jakob.degerstrom@gmail.com', isActive: true },
  { id: 'p11', name: 'Jakob Gundersen', position: 'Spiller', systemRole: 'user', email: 'jakob.gundersen03@gmail.com', isActive: true },
  { id: 'p12', name: 'Jakob Sørum', position: 'Spiller', systemRole: 'user', phone: '+4791165517', isActive: true },
  { id: 'p13', name: 'Jonas Landsem Kristiansen', position: 'Spiller', systemRole: 'user', email: 'jonas.landsem.kristiansen@gmail.com', isActive: true },
  
  // Gruppe L-O (Bilde 2)
  { id: 'p14', name: 'Leo Kahlert', position: 'Spiller', systemRole: 'user', email: 'leokahlert7@icloud.com', isActive: false },
  { id: 'p15', name: 'Ludvig Buch Hansen', position: 'Spiller', systemRole: 'user', email: 'ludvigbuchhansen@gmail.com', isActive: true },
  { id: 'p16', name: 'Mads Solvik', position: 'Spiller', systemRole: 'user', email: 'madssolvik@gmail.com', isActive: true },
  { id: 'p17', name: 'Marius Perry Mathiesen', position: 'Spiller', systemRole: 'user', email: 'marius.p.mathiesen@gmail.com', isActive: false },
  { id: 'p18', name: 'Markus Skogøy', position: 'Spiller', systemRole: 'user', email: 'markusskogoy@gmail.com', isActive: true },
  { id: 'p19', name: 'Markus Stangnes', position: 'Spiller', systemRole: 'user', email: 'markus.e.stangnes@gmail.com', isActive: true },
  { id: 'p20', name: 'Martin Leganger Devik', position: 'Spiller', systemRole: 'user', email: 'martin.l.devik@gmail.com', isActive: true },
  { id: 'p21', name: 'Nicklas Aanonsen', position: 'Spiller', systemRole: 'user', email: 'nicklaslillerudaanonsen@gmail.com', isActive: true },
  { id: 'p22', name: 'Nils Anders Kjærefjord', position: 'Spiller', systemRole: 'user', phone: '+4746851991', isActive: true },
  { id: 'p23', name: 'Njål Sondre Osmundsen', position: 'Spiller', systemRole: 'user', email: 'njaalosmundsen@gmail.com', isActive: true },
  { id: 'p24', name: 'Ola Hovde', position: 'Spiller', systemRole: 'user', email: 'ola.peder@gmail.com', isActive: false },
  { id: 'p25', name: 'Ole Bosåen', position: 'Spiller', systemRole: 'user', email: 'olejorgen02@gmail.com', isActive: true },
  { id: 'p26', name: 'Oliver Badawy', position: 'Spiller', systemRole: 'user', email: 'olivergbadawy@outlook.com', isActive: true },

  // Gruppe P-W (Bilde 3)
  { id: 'p27', name: 'Petter Lie', position: 'Spiller', systemRole: 'user', phone: '+4795559004', isActive: true },
  { id: 'p28', name: 'Rasmus Hopland', position: 'Spiller', systemRole: 'user', email: 'rasmus.hopland@outlook.com', isActive: true },
  { id: 'p29', name: 'Sebastian Gulland', position: 'Spiller', systemRole: 'user', email: 'sebastianoliver@live.no', isActive: true },
  { id: 'p30', name: 'Sebastian Riegler', position: 'Spiller', systemRole: 'user', email: 'riegler.basti@gmx.at', isActive: false },
  { id: 'p31', name: 'Simen Lundem', position: 'Spiller', systemRole: 'user', phone: '+4741642555', isActive: true },
  { id: 'p32', name: 'Simon Telle', position: 'Spiller', systemRole: 'user', phone: '+4798105015', isActive: true },
  { id: 'p33', name: 'Thomas Lervik', position: 'Spiller', systemRole: 'user', email: 'thomas.lervik@hotmail.no', isActive: false },
  { id: 'p34', name: 'Tormod Bratheim', position: 'Spiller', systemRole: 'user', email: 'tormod.bratheim@gmail.com', isActive: true },
  { id: 'p35', name: 'Trygve Sundstrøm', position: 'Spiller', systemRole: 'user', email: 'trksund@gmail.com', isActive: true },
  { id: 'p36', name: 'Trym Jacobsen', position: 'Spiller', systemRole: 'user', phone: '+4794858210', isActive: true },
  { id: 'p37', name: 'William Onstad', position: 'Spiller', systemRole: 'user', isActive: true },
  { id: 'p38', name: 'Joakim Fyhn', position: 'Spiller', systemRole: 'user', isActive: false },
];

// NHHIFCmedlemslisteH2026.xlsx, For import!A2:A51.
// Only names are imported; dates of birth and addresses are not needed by the app.
export const NEW_PLAYERS: Player[] = [
  { id: 'h2026_axel_huitfeldt_andreassen', name: 'Axel Huitfeldt Andreassen', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_christoffer_tossebro_eriksen', name: 'Christoffer Tøssebro Eriksen', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_eric_nafstad', name: 'Eric Nafstad', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_giulio_sambarino', name: 'Giulio Sambarino', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_henrik_hoydal', name: 'Henrik Høydal', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_herman_berner', name: 'Herman Berner', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_havard_hisdal', name: 'Håvard Hisdal', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_jens_aakre', name: 'Jens Aakre', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_johan_sorensen', name: 'Johan Sørensen', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_mads_voll_austestad', name: 'Mads Voll-Austestad', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_magnus_gudvangen_grotting', name: 'Magnus Gudvangen Grøtting', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_martin_aarthun', name: 'Martin Aarthun', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_mathias_eirik_paulsen', name: 'Mathias Eirik Paulsen', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_nikolai_jaeger_kjeldsen', name: 'Nikolai Jæger Kjeldsen', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_oliver_juliebo_reite', name: 'Oliver Juliebø Reite', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_simen_villum', name: 'Simen Villum', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_simon_hellevik', name: 'Simon Hellevik', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_thomas_traelvik', name: 'Thomas Trælvik', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
  { id: 'h2026_tiago_pleno', name: 'Tiago Pleno', position: 'Spiller', systemRole: 'user', isActive: true, hasChangedPassword: false },
];

export const DEFAULT_PLAYERS: Player[] = [...LEGACY_PLAYERS, ...NEW_PLAYERS];

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
