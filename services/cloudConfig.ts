const ACTIVE_SUPABASE_URL = 'https://qnwjhheoekpqqqhevztw.supabase.co';
const ACTIVE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RqAMOlXY2TK012WTAyw3Yw_Js1VYXpz';

export function isValidKey(key?: string): boolean {
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

export function isValidUrl(url?: string): boolean {
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

// Keep URL and public key paired; old build secrets still reference the retired project.
export const resolveCloudConfig = (envUrl?: string, envKey?: string) => {
  const retiredUrl = 'https://wcvkrhjyubuzngsswbea.supabase.co';
  const useEnvironment = isValidUrl(envUrl) && isValidKey(envKey) && envUrl?.replace(/\/$/, '') !== retiredUrl;
  return {
    url: useEnvironment ? envUrl! : ACTIVE_SUPABASE_URL,
    key: useEnvironment ? envKey! : ACTIVE_SUPABASE_PUBLISHABLE_KEY,
  };
};
