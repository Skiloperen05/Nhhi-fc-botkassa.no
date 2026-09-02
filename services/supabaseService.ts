
import { createClient } from '@supabase/supabase-js';

const ACTIVE_SUPABASE_URL = 'https://qnwjhheoekpqqqhevztw.supabase.co';
const ACTIVE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RqAMOlXY2TK012WTAyw3Yw_Js1VYXpz';

function isValidKey(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.startsWith('sb_secret_')) return false;
  const lower = key.toLowerCase();
  if (
    lower.includes('din_supabase') ||
    lower.includes('your_supabase') ||
    lower.includes('placeholder') ||
    lower.includes('publishable_key_her')
  ) {
    return false;
  }
  return key.trim().length > 10;
}

function isValidUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  if (
    lower.includes('ditt-prosjekt') ||
    lower.includes('your-project') ||
    lower.includes('example.supabase.co')
  ) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const rawEnvUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawEnvKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const SUPABASE_URL = isValidUrl(rawEnvUrl) ? rawEnvUrl! : ACTIVE_SUPABASE_URL;
const SUPABASE_KEY = isValidKey(rawEnvKey) ? rawEnvKey! : ACTIVE_SUPABASE_PUBLISHABLE_KEY;

if (SUPABASE_KEY && SUPABASE_KEY.startsWith('sb_secret_')) {
  console.warn('Supabase secret key kan ikke brukes i nettleseren. Bruk en publishable key.');
}

export const isCloudConfigured = Boolean(isValidUrl(SUPABASE_URL) && isValidKey(SUPABASE_KEY));

export const supabase = isCloudConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const PREFIX = 'nhhi_v3_'; 

let isCloudOffline = false;
let lastOfflineCheck = 0;
const OFFLINE_COOLDOWN_MS = 60000;

function checkIsOffline(): boolean {
  if (!isCloudOffline) return false;
  if (Date.now() - lastOfflineCheck > OFFLINE_COOLDOWN_MS) {
    isCloudOffline = false;
    return false;
  }
  return true;
}

function markCloudOffline() {
  isCloudOffline = true;
  lastOfflineCheck = Date.now();
}

export const cloudSave = async (type: string, id: string, value: any): Promise<boolean> => {
  if (!supabase || checkIsOffline()) return false;
  const key = `${PREFIX}${type}_${id}`;
  try {
    const { error } = await supabase
      .from('app_data')
      .upsert({ 
        key, 
        value, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'key' });
    
    if (error) {
      if (error.message?.includes('Load failed') || error.message?.includes('Failed to fetch')) {
        markCloudOffline();
      }
      return false;
    }
    return true;
  } catch (err: any) {
    markCloudOffline();
    return false;
  }
};

export const cloudSaveBulk = async (type: string, items: {id: string, [key: string]: any}[]): Promise<boolean> => {
  if (items.length === 0) return true;
  if (!supabase || checkIsOffline()) return false;
  
  const rows = items.map(item => ({
    key: `${PREFIX}${type}_${item.id}`,
    value: item,
    updated_at: new Date().toISOString()
  }));

  try {
    const { error } = await supabase
      .from('app_data')
      .upsert(rows, { onConflict: 'key' });
    
    if (error) {
      if (error.message?.includes('Load failed') || error.message?.includes('Failed to fetch')) {
        markCloudOffline();
      }
      return false;
    }
    return true;
  } catch (err) {
    markCloudOffline();
    return false;
  }
};

export const cloudDelete = async (type: string, id: string): Promise<boolean> => {
  if (!supabase || checkIsOffline()) return false;
  const key = `${PREFIX}${type}_${id}`;
  try {
    const { error } = await supabase
      .from('app_data')
      .delete()
      .eq('key', key);
    if (error) {
      if (error.message?.includes('Load failed') || error.message?.includes('Failed to fetch')) {
        markCloudOffline();
      }
      return false;
    }
    return !error;
  } catch (e) {
    markCloudOffline();
    return false;
  }
};

export const cloudFetchAll = async (type: string): Promise<any[] | null> => {
  if (!supabase || checkIsOffline()) return null;
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .like('key', `${PREFIX}${type}_%`);
    
    if (error) {
      if (error.message?.includes('Load failed') || error.message?.includes('Failed to fetch')) {
        markCloudOffline();
      }
      return null;
    }
    
    if (!data) return [];
    return data.map(item => item.value);
  } catch (err: any) {
    markCloudOffline();
    return null;
  }
};

export const subscribeToCloudChanges = (onUpdate: () => void): { unsubscribe: () => void } => {
  if (!supabase || checkIsOffline()) {
    return { unsubscribe: () => {} };
  }
  try {
    const channel = supabase
      .channel('nhhi-realtime-v3')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data' },
        () => {
          onUpdate();
        }
      );

    channel.subscribe((status, err) => {
      if (err) {
        console.warn('Realtime subscription notice:', err.message || err);
      }
    });

    return {
      unsubscribe: () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  } catch (e) {
    console.warn('Realtime subscription error:', e);
    return { unsubscribe: () => {} };
  }
};
