
export type Role = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export type CustomRole = string;

export interface RoleDefinition {
  id: string;
  name: string;
  color: string;
}

export interface Player {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  systemRole: Role;
  customRole?: CustomRole;
  password?: string;
  hasChangedPassword?: boolean;
}

export interface UserSettings {
  phoneNumber?: string;
  email?: string;
  pushEnabled: boolean;
  lastReadTimestamp?: number; 
}

export interface PresetFine {
  id: string;
  label: string;
  amount: number;
  icon: string;
}

export type ComplaintStatus = 'pending' | 'approved' | 'rejected';
export type FineStatus = 'paid' | 'unpaid';

export interface Complaint {
  reason: string;
  status: ComplaintStatus;
  date: string;
  votes?: Record<string, 'maintain' | 'dismiss'>; // userId -> stemmetype
}

export interface PayRequest {
  status: 'pending' | 'rejected';
  date: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  reactions?: Reaction[];
}

export interface FineEntry {
  id: string;
  playerId: string;
  amount: number;
  reason: string; 
  description?: string; 
  aiComment?: string;
  date: string;
  timestamp: number;
  status: FineStatus; 
  complaint?: Complaint; 
  payRequest?: PayRequest;
  comments?: Comment[]; 
  reactions?: Reaction[];
  isArchived?: boolean; // Nytt felt for LTS
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string | 'all'; 
  subject: string;
  body: string;
  timestamp: number;
}

export type ViewState = 'login' | 'add' | 'overview' | 'player' | 'list' | 'notifications' | 'fine_detail' | 'archive';

export type TimeFilter = 'all' | 'month' | 'semester' | 'year';
