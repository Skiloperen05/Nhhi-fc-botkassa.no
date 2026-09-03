import React from 'react';

export const SaveStatus: React.FC<{ isSaving: boolean; saveError: string }> = ({ isSaving, saveError }) => {
  if (!isSaving && !saveError) return null;
  return (
    <p role={saveError ? 'alert' : 'status'} className={`text-sm px-2 py-2 ${saveError ? 'text-red-600' : 'text-blue-600'}`}>
      {saveError || 'Lagrer …'}
    </p>
  );
};
