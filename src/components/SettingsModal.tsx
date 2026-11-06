import React, { useState } from 'react';
import { SheetSettings } from '../types/fuel';
import { Settings, X, Check, RotateCcw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SheetSettings;
  onSaveSettings: (settings: SheetSettings) => void;
  onClearAllRecords: () => void;
  onResetDemoData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllRecords,
  onResetDemoData,
}) => {
  const [draft, setDraft] = useState<SheetSettings>({ ...settings });

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
              Spreadsheet Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Unit selection */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Fuel Volume Unit
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, defaultUnit: 'L' })}
                className={`py-2 px-3 rounded-lg border font-mono font-bold text-xs transition-colors ${
                  draft.defaultUnit === 'L'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                Litres (L)
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, defaultUnit: 'gal' })}
                className={`py-2 px-3 rounded-lg border font-mono font-bold text-xs transition-colors ${
                  draft.defaultUnit === 'gal'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                Gallons (gal)
              </button>
            </div>
          </div>

          {/* Currency Symbol */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Currency Symbol
            </label>
            <input
              type="text"
              value={draft.currencySymbol}
              onChange={(e) => setDraft({ ...draft, currencySymbol: e.target.value })}
              className="w-full px-3 py-2 font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Diesel Rate Per Unit */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Diesel Rate per {draft.defaultUnit} ({draft.currencySymbol})
            </label>
            <input
              type="number"
              step="0.01"
              value={draft.dieselRate ?? draft.defaultRate ?? 94.5}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setDraft({ ...draft, dieselRate: val, defaultRate: val });
              }}
              className="w-full px-3 py-2 font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Petrol Rate Per Unit */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Petrol Rate per {draft.defaultUnit} ({draft.currencySymbol})
            </label>
            <input
              type="number"
              step="0.01"
              value={draft.petrolRate ?? 103.5}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setDraft({ ...draft, petrolRate: val });
              }}
              className="w-full px-3 py-2 font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Coupon Prefix */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Coupon Number Prefix
            </label>
            <input
              type="text"
              value={draft.couponPrefix}
              onChange={(e) => setDraft({ ...draft, couponPrefix: e.target.value })}
              className="w-full px-3 py-2 font-mono uppercase bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Reset & Wipe Danger Zone */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
            <label className="block font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
              Ledger Management
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Wipe all rows and reset to an empty spreadsheet?')) {
                    onClearAllRecords();
                    onClose();
                  }
                }}
                className="w-full py-2 px-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors text-center border border-red-200 dark:border-red-900/50 font-medium"
              >
                Clear All Rows (Wipe Ledger)
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
