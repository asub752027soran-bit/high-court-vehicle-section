import React, { useState } from 'react';
import { FuelRecord, SortConfig, SheetSettings } from '../types/fuel';
import { formatDateDisplay } from '../utils/fuelUtils';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';

interface SpreadsheetTableProps {
  records: FuelRecord[];
  sortConfig: SortConfig;
  onSortChange: (column: keyof FuelRecord) => void;
  onUpdateRecord: (id: string, updates: Partial<FuelRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onDuplicateRecord: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onExportSelected: (records: FuelRecord[]) => void;
  settings: SheetSettings;
}

export const SpreadsheetTable: React.FC<SpreadsheetTableProps> = ({
  records,
  sortConfig,
  onSortChange,
  onUpdateRecord,
  onDeleteRecord,
  onDuplicateRecord,
  onDeleteMultiple,
  onExportSelected,
  settings,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof FuelRecord } | null>(null);
  const [cellDraftValue, setCellDraftValue] = useState<string>('');

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(records.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = records.length > 0 && selectedIds.length === records.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < records.length;

  // In-cell editing
  const startEditing = (id: string, field: keyof FuelRecord, initialVal: any) => {
    setEditingCell({ id, field });
    setCellDraftValue(initialVal !== undefined && initialVal !== null ? String(initialVal) : '');
  };

  const saveEditing = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const target = records.find(r => r.id === id);
    const updates: Partial<FuelRecord> = {};

    if (field === 'fuelAmount') {
      const num = parseFloat(cellDraftValue);
      const amt = isNaN(num) ? 0 : num;
      updates.fuelAmount = amt;
      const effectiveRate = target?.ratePerUnit ?? (target?.fuelType === 'Petrol' ? settings.petrolRate : settings.dieselRate);
      updates.totalCost = Number((amt * effectiveRate).toFixed(2));
    } else if (field === 'ratePerUnit') {
      const num = parseFloat(cellDraftValue);
      const rate = isNaN(num) ? 0 : num;
      updates.ratePerUnit = rate;
      const amt = target?.fuelAmount || 0;
      updates.totalCost = Number((amt * rate).toFixed(2));
    } else if (field === 'vehicleNumber' || field === 'couponNumber') {
      updates[field] = cellDraftValue.trim().toUpperCase();
    } else if (field === 'date') {
      updates.date = cellDraftValue;
    } else {
      (updates as any)[field] = cellDraftValue;
    }

    onUpdateRecord(id, updates);
    setEditingCell(null);
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setCellDraftValue('');
  };

  // Calculations for bottom summary row
  const totalFuelSum = records.reduce((sum, r) => sum + (r.fuelAmount || 0), 0);
  const totalCostSum = records.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  const avgFuel = records.length > 0 ? totalFuelSum / records.length : 0;

  // Selected records summary
  const selectedRecords = records.filter(r => selectedIds.includes(r.id));
  const selectedFuelSum = selectedRecords.reduce((sum, r) => sum + (r.fuelAmount || 0), 0);

  const renderSortIndicator = (column: keyof FuelRecord) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
      {/* Bulk Actions Bar if items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 dark:bg-neutral-800/90 border-b border-amber-200 dark:border-neutral-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {selectedIds.length} {selectedIds.length === 1 ? 'row' : 'rows'} selected
            </span>
            <span className="text-neutral-400">·</span>
            <span className="text-neutral-600 dark:text-neutral-400 font-mono">
              Sum: <strong className="text-amber-700 dark:text-amber-400">{selectedFuelSum.toFixed(1)} {settings.defaultUnit}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onExportSelected(selectedRecords)}
              className="px-2.5 py-1 font-medium bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-200"
            >
              Export Selected
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete ${selectedIds.length} records?`)) {
                  onDeleteMultiple(selectedIds);
                  setSelectedIds([]);
                }
              }}
              className="px-2.5 py-1 font-medium bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 px-1.5 py-1"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Grid Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              {/* Select All Checkbox */}
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={el => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={handleSelectAll}
                  className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                />
              </th>

              <th className="py-2.5 px-2 w-12 text-center font-mono">#</th>

              {/* Date */}
              <th
                onClick={() => onSortChange('date')}
                className="py-2.5 px-3 cursor-pointer select-none group hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  {renderSortIndicator('date')}
                </div>
              </th>

              {/* Vehicle Number */}
              <th
                onClick={() => onSortChange('vehicleNumber')}
                className="py-2.5 px-3 cursor-pointer select-none group hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <div className="flex items-center gap-1.5">
                  <span>Vehicle Number</span>
                  {renderSortIndicator('vehicleNumber')}
                </div>
              </th>

              {/* Fuel Amount Supplied */}
              <th
                onClick={() => onSortChange('fuelAmount')}
                className="py-2.5 px-3 text-right cursor-pointer select-none group hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Fuel Amount ({settings.defaultUnit})</span>
                  {renderSortIndicator('fuelAmount')}
                </div>
              </th>

              {/* Coupon Number */}
              <th
                onClick={() => onSortChange('couponNumber')}
                className="py-2.5 px-3 cursor-pointer select-none group hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <div className="flex items-center gap-1.5">
                  <span>Coupon #</span>
                  {renderSortIndicator('couponNumber')}
                </div>
              </th>

              {/* Fuel Grade */}
              <th
                onClick={() => onSortChange('fuelType')}
                className="py-2.5 px-3 cursor-pointer select-none group hover:text-neutral-900 dark:hover:text-neutral-100 hidden sm:table-cell"
              >
                <div className="flex items-center gap-1.5">
                  <span>Type</span>
                  {renderSortIndicator('fuelType')}
                </div>
              </th>

              {/* Fuel Rate */}
              <th
                onClick={() => onSortChange('ratePerUnit')}
                className="py-2.5 px-3 text-right cursor-pointer select-none group hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Rate ({settings.currencySymbol}/{settings.defaultUnit})</span>
                  {renderSortIndicator('ratePerUnit')}
                </div>
              </th>

              {/* Total Cost / Amount */}
              <th
                onClick={() => onSortChange('totalCost')}
                className="py-2.5 px-3 text-right cursor-pointer select-none group hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Total Amount ({settings.currencySymbol})</span>
                  {renderSortIndicator('totalCost')}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center text-neutral-400">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <FileSpreadsheet className="w-10 h-10 text-amber-500/40" />
                    <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
                      Spreadsheet is Clean &amp; Ready
                    </p>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      All default records have been cleared. Enter a vehicle number, fuel amount, coupon number, and date in the <strong>Speed Entry Row</strong> above to log your first voucher.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record, index) => {
                const isSelected = selectedIds.includes(record.id);

                return (
                  <tr
                    key={record.id}
                    className={`hover:bg-amber-50/40 dark:hover:bg-neutral-800/40 transition-colors ${
                      isSelected ? 'bg-amber-50/70 dark:bg-neutral-800/70' : ''
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(record.id)}
                        className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                      />
                    </td>

                    {/* Row Index */}
                    <td className="py-2.5 px-2 text-center font-mono text-neutral-400 text-[11px]">
                      {index + 1}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 font-mono text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {editingCell?.id === record.id && editingCell?.field === 'date' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={cellDraftValue}
                            onChange={(e) => setCellDraftValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-neutral-800 border border-amber-500 rounded"
                          />
                          <button onClick={saveEditing} className="text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEditing} className="text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={() => startEditing(record.id, 'date', record.date)}
                          className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1"
                          title="Double click to edit date"
                        >
                          <span>{record.date}</span>
                          <span className="text-[10px] text-neutral-400 hidden group-hover:inline">
                            {formatDateDisplay(record.date)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Vehicle Number */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                      {editingCell?.id === record.id && editingCell?.field === 'vehicleNumber' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={cellDraftValue}
                            onChange={(e) => setCellDraftValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 text-xs font-mono uppercase bg-white dark:bg-neutral-800 border border-amber-500 rounded w-28"
                          />
                          <button onClick={saveEditing} className="text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEditing} className="text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={() => startEditing(record.id, 'vehicleNumber', record.vehicleNumber)}
                          className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1"
                          title="Double click to edit vehicle number"
                        >
                          <span>{record.vehicleNumber}</span>
                        </div>
                      )}
                    </td>

                    {/* Fuel Amount */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                      {editingCell?.id === record.id && editingCell?.field === 'fuelAmount' ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={cellDraftValue}
                            onChange={(e) => setCellDraftValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 text-xs font-mono text-right bg-white dark:bg-neutral-800 border border-amber-500 rounded w-20"
                          />
                          <button onClick={saveEditing} className="text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEditing} className="text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={() => startEditing(record.id, 'fuelAmount', record.fuelAmount)}
                          className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400"
                          title="Double click to edit fuel amount"
                        >
                          <span className="text-amber-700 dark:text-amber-400">
                            {record.fuelAmount.toFixed(1)}
                          </span>
                          <span className="text-neutral-400 font-normal ml-1 text-[11px]">
                            {record.fuelUnit}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Coupon Number */}
                    <td className="py-2.5 px-3 font-mono text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                      {editingCell?.id === record.id && editingCell?.field === 'couponNumber' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={cellDraftValue}
                            onChange={(e) => setCellDraftValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 text-xs font-mono uppercase bg-white dark:bg-neutral-800 border border-amber-500 rounded w-28"
                          />
                          <button onClick={saveEditing} className="text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEditing} className="text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={() => startEditing(record.id, 'couponNumber', record.couponNumber)}
                          className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 font-medium"
                          title="Double click to edit coupon number"
                        >
                          <span>{record.couponNumber}</span>
                        </div>
                      )}
                    </td>

                    {/* Fuel Type / Grade (Click to toggle Diesel / Petrol and auto-switch rate) */}
                    <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300 hidden sm:table-cell whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          const nextType = record.fuelType === 'Petrol' ? 'Diesel' : 'Petrol';
                          const nextRate = nextType === 'Petrol' ? (settings.petrolRate ?? 103.5) : (settings.dieselRate ?? 94.5);
                          onUpdateRecord(record.id, {
                            fuelType: nextType,
                            ratePerUnit: nextRate,
                            totalCost: Number((record.fuelAmount * nextRate).toFixed(2)),
                          });
                        }}
                        title="Click to toggle Diesel / Petrol (auto-recalculates rate and amount)"
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          record.fuelType === 'Petrol'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {record.fuelType || 'Diesel'}
                      </button>
                    </td>

                    {/* Fuel Rate (Customizable & Editable In-Cell) */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                      {editingCell?.id === record.id && editingCell?.field === 'ratePerUnit' ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={cellDraftValue}
                            onChange={(e) => setCellDraftValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 text-xs font-mono text-right bg-white dark:bg-neutral-800 border border-amber-500 rounded w-20"
                          />
                          <button onClick={saveEditing} className="text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEditing} className="text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={() => startEditing(
                            record.id,
                            'ratePerUnit',
                            record.ratePerUnit || (record.fuelType === 'Petrol' ? settings.petrolRate : settings.dieselRate)
                          )}
                          className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400"
                          title="Double-click to change custom rate (Amount auto-updates)"
                        >
                          <span>
                            {settings.currencySymbol}
                            {(
                              record.ratePerUnit ??
                              (record.fuelType === 'Petrol' ? settings.petrolRate : settings.dieselRate)
                            ).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Total Amount (Auto-Calculated) */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                      <span>
                        {settings.currencySymbol}
                        {(
                          record.totalCost ??
                          record.fuelAmount * (record.ratePerUnit ?? (record.fuelType === 'Petrol' ? settings.petrolRate : settings.dieselRate))
                        ).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Spreadsheet Formula Summary Row (SUM, COUNT, AVG) */}
          {records.length > 0 && (
            <tfoot>
              <tr className="bg-neutral-100 dark:bg-neutral-800/90 border-t-2 border-neutral-300 dark:border-neutral-700 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                <td className="py-3 px-3 text-center text-neutral-400">∑</td>
                <td className="py-3 px-2 text-center text-[10px] text-neutral-500">TOTAL</td>
                <td className="py-3 px-3 text-neutral-500 font-sans font-medium text-xs">
                  {records.length} {records.length === 1 ? 'Record' : 'Records'}
                </td>
                <td className="py-3 px-3 text-neutral-500 font-sans font-medium text-xs">
                  {new Set(records.map(r => r.vehicleNumber)).size} Unique Vehicles
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-amber-700 dark:text-amber-400 font-bold text-sm">
                  {totalFuelSum.toFixed(1)} {settings.defaultUnit}
                </td>
                <td className="py-3 px-3 text-neutral-500 text-xs font-normal">
                  Avg: {avgFuel.toFixed(1)} {settings.defaultUnit}/fill
                </td>
                <td className="py-3 px-3 hidden sm:table-cell text-neutral-500 text-xs">
                  Fleet Total
                </td>
                <td className="py-3 px-3 text-right text-xs text-neutral-500 font-normal">
                  Total Value:
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-sm text-neutral-900 dark:text-neutral-100 font-bold">
                  {settings.currencySymbol}{totalCostSum.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
