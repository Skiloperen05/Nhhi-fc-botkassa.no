
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const ACTIVE_SUPABASE_URL = 'https://qnwjhheoekpqqqhevztw.supabase.co';
const ACTIVE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RqAMOlXY2TK012WTAyw3Yw_Js1VYXpz';

const SUPABASE_URL = ACTIVE_SUPABASE_URL;
const SUPABASE_KEY = ACTIVE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase mangler VITE_SUPABASE_URL eller VITE_SUPABASE_PUBLISHABLE_KEY.');
}

if (SUPABASE_KEY.startsWith('sb_secret_')) {
  throw new Error('Supabase secret key kan ikke brukes i nettleseren. Bruk en publishable key.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PREFIX = 'nhhi_v3_'; 

export const cloudSave = async (type: string, id: string, value: any): Promise<boolean> => {
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
      console.error(`❌ Supabase Save Error [${type}]:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const cloudSaveBulk = async (type: string, items: {id: string, [key: string]: any}[]): Promise<boolean> => {
  if (items.length === 0) return true;
  
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
      console.error(`❌ Bulk Save Error [${type}]:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const cloudDelete = async (type: string, id: string): Promise<boolean> => {
  const key = `${PREFIX}${type}_${id}`;
  try {
    const { error } = await supabase
      .from('app_data')
      .delete()
      .eq('key', key);
    return !error;
  } catch (e) {
    return false;
  }
};

export const cloudFetchAll = async (type: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .like('key', `${PREFIX}${type}_%`);
    
    if (error) {
      console.error(`❌ Fetch Error [${type}]:`, error.message);
      throw error; // Kast feil slik at App.tsx ikke behandler [] som en gyldig tom liste
    }
    
    if (!data) return [];
    return data.map(item => item.value);
  } catch (err) {
    console.error(`❌ Cloud exception [${type}]:`, err);
    throw err; 
  }
};

export const subscribeToCloudChanges = (onUpdate: () => void): RealtimeChannel => {
  return supabase
    .channel('nhhi-realtime-v3')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_data' },
      () => {
        onUpdate();
      }
    )
    .subscribe();
};
