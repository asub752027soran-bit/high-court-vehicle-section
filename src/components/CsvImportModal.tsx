import React, { useState } from 'react';
import { FuelRecord } from '../types/fuel';
import { parseCsvText } from '../utils/fuelUtils';
import { Upload, X, Check, FileText, Download } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (records: Omit<FuelRecord, 'id' | 'createdAt'>[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [csvText, setCsvText] = useState('');
  const [previewRecords, setPreviewRecords] = useState<Omit<FuelRecord, 'id' | 'createdAt'>[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setCsvText(text);
    setErrorMsg('');
    try {
      const parsed = parseCsvText(text);
      setPreviewRecords(parsed);
    } catch (e) {
      setErrorMsg('Could not parse CSV. Please check formatting.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleTextChange(text);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (previewRecords.length === 0) {
      setErrorMsg('No valid rows found to import.');
      return;
    }
    onImport(previewRecords);
    onClose();
    setCsvText('');
    setPreviewRecords([]);
  };

  const sampleCsv = `Date,Vehicle Number,Fuel Amount,Coupon Number,Fuel Type
2026-11-04,OD-05-Y-0050,65.0,CPN-90001,Diesel
2026-11-04,OD-05-BU-0001,42.5,CPN-90002,Diesel
2026-11-03,OD-05-BH-0001,35.0,CPN-90003,Diesel`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
              Import Fuel Vouchers from CSV
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-950/40 dark:file:text-amber-300 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                Or Paste CSV Data Directly
              </label>
              <button
                type="button"
                onClick={() => handleTextChange(sampleCsv)}
                className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <FileText className="w-3 h-3" />
                Paste Sample Format
              </button>
            </div>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Date,Vehicle Number,Fuel Amount,Coupon Number..."
              className="w-full p-3 font-mono text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {previewRecords.length > 0 && (
            <div>
              <div className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2 flex items-center justify-between">
                <span>Preview ({previewRecords.length} records ready to import)</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                  ✓ Valid format detected
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0 font-mono text-neutral-600 dark:text-neutral-400">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Vehicle #</th>
                      <th className="p-2 text-right">Fuel Amt</th>
                      <th className="p-2">Coupon #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                    {previewRecords.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        <td className="p-2">{r.date}</td>
                        <td className="p-2 font-bold">{r.vehicleNumber}</td>
                        <td className="p-2 text-right text-amber-600 font-bold">{r.fuelAmount} L</td>
                        <td className="p-2">{r.couponNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewRecords.length > 10 && (
                <div className="text-[11px] text-neutral-400 mt-1">
                  + {previewRecords.length - 10} more records
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={previewRecords.length === 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Import {previewRecords.length} Vouchers</span>
          </button>
        </div>
      </div>
    </div>
  );
};
