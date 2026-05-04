import React, { useState } from 'react';
import { FineEntry, PresetFine } from '../types';
import { Button } from './Button';
import { X, Save, Trash2, Calendar, Banknote, FileText, Tag, AlertTriangle } from 'lucide-react';

interface EditFineModalProps {
  fine: FineEntry;
  presetFines: PresetFine[];
  onSave: (updatedFine: FineEntry) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

export const EditFineModal: React.FC<EditFineModalProps> = ({ fine, presetFines, onSave, onCancel, onDelete }) => {
  const [amount, setAmount] = useState(fine.amount);
  const [reason, setReason] = useState(fine.reason);
  const [description, setDescription] = useState(fine.description || '');
  const [date, setDate] = useState(fine.date.split('T')[0]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...fine,
      amount,
      reason,
      description,
      date: new Date(date).toISOString(),
      timestamp: new Date(date).getTime(),
    });
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(fine.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Rediger Bot</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {showDeleteConfirm ? (
           <div className="p-6 text-center space-y-4">
             <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertTriangle size={24} />
             </div>
             <div>
                <h4 className="text-lg font-bold text-slate-900">Er du sikker?</h4>
                <p className="text-sm text-slate-500 mt-1">
                    Dette vil slette boten permanent og trekke beløpet fra totalen.
                </p>
             </div>
             <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    Avbryt
                </button>
                <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-600 rounded-xl text-sm font-medium text-white hover:bg-red-700"
                >
                    Slett bot
                </button>
             </div>
           </div>
        ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Category/Reason */}
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kategori</label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-gray-400" />
                </div>
                <select
                    value={reason}
                    onChange={(e) => {
                        setReason(e.target.value);
                    }}
                    className="block w-full pl-9 pr-8 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                >
                    <option value={reason}>{reason} (Nåværende)</option>
                    {presetFines.filter(p => p.label !== reason).map(p => (
                        <option key={p.id} value={p.label}>{p.label}</option>
                    ))}
                </select>
                </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Beløp</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Banknote className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="block w-full pl-9 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                />
                </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Beskrivelse</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detaljer..."
                    className="block w-full pl-9 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                />
                </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dato</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="block w-full pl-9 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                />
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button
                type="button"
                onClick={handleDeleteClick}
                className="flex-1 flex items-center justify-center px-4 py-2.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium transition-colors"
                >
                <Trash2 size={18} className="mr-2" />
                Slett
                </button>
                <Button type="submit" className="flex-[2] py-2.5 text-sm">
                <Save size={18} className="mr-2" />
                Lagre endringer
                </Button>
            </div>
            </form>
        )}
      </div>
    </div>
  );
};