
const PREFIX = 'nhhi_fc_';

export const storage = {
  save: (key: string, value: any) => {
    try {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error saving to localStorage', e);
      return false;
    }
  },

  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(`${PREFIX}${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return defaultValue;
    }
  },

  remove: (key: string) => {
    localStorage.removeItem(`${PREFIX}${key}`);
  },

  clearAll: () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }
};
