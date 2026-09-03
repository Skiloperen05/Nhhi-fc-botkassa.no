import { useRef, useState } from 'react';

/** Keep drafts intact until the server confirms a save, and reject duplicate clicks. */
export const useSaveAction = () => {
  const pending = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const runSave = async (action: () => Promise<boolean>, onSuccess?: () => void): Promise<boolean> => {
    if (pending.current) return false;
    pending.current = true;
    setIsSaving(true);
    setSaveError('');
    try {
      const saved = await action();
      if (saved) onSuccess?.();
      else setSaveError('Endringen ble ikke lagret. Prøv igjen.');
      return saved;
    } catch {
      setSaveError('Endringen ble ikke lagret. Prøv igjen.');
      return false;
    } finally {
      pending.current = false;
      setIsSaving(false);
    }
  };

  return { isSaving, saveError, runSave };
};
