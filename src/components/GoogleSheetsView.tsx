import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { FuelRecord, SheetSettings, SortConfig } from '../types/fuel';
import { FLEET_VEHICLES } from '../data/initialRecords';
import { formatDateDisplay, getTodayDateString, exportRecordsToCsv } from '../utils/fuelUtils';
import {
  Undo2,
  Redo2,
  Printer,
  ChevronDown,
  Search,
  Filter,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  RotateCcw,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Settings as SettingsIcon,
  HelpCircle,
  Menu,
  Star,
  FolderOpen,
  Cloud,
  Share2,
  Bold,
  Italic,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Percent,
  TrendingUp,
  Truck,
  Zap,
  Fuel,
  ArrowRight,
  X,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { RunInGoogleSheetsModal } from './RunInGoogleSheetsModal';

interface GoogleSheetsViewProps {

  records: FuelRecord[];
  settings: SheetSettings;
  knownVehicles: string[];
  suggestedNextCoupon: string;
  onAddRecord: (data: Omit<FuelRecord, 'id' | 'createdAt'>) => FuelRecord;
  onUpdateRecord: (id: string, updates: Partial<FuelRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onDuplicateRecord: (id: string) => void;
  onImportCsv: () => void;
  onOpenPrint: () => void;
  onOpenSettings: () => void;
  onClearAll: () => void;
  onUpdateSettings: (settings: Partial<SheetSettings>) => void;
  onUpdateRates?: (rates: { dieselRate?: number; petrolRate?: number }, updateExisting?: boolean) => void;
  currentTab: 'sheet' | 'fleet' | 'analytics' | 'rapid';
  onChangeTab: (tab: 'sheet' | 'fleet' | 'analytics' | 'rapid') => void;
}

// Columns definition for the Google Sheet
interface ColumnDef {
  key: keyof FuelRecord | 'calculatedTotal';
  letter: string;
  title: string;
  width: string;
  align: 'left' | 'center' | 'right';
  editable: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'date', letter: 'A', title: 'DATE', width: 'w-32 min-w-[120px]', align: 'center', editable: true },
  { key: 'vehicleNumber', letter: 'B', title: 'VEHICLE NUMBER', width: 'w-48 min-w-[180px]', align: 'left', editable: true },
  { key: 'fuelAmount', letter: 'C', title: 'FUEL AMOUNT (L)', width: 'w-36 min-w-[140px]', align: 'right', editable: true },
  { key: 'couponNumber', letter: 'D', title: 'COUPON #', width: 'w-36 min-w-[140px]', align: 'left', editable: true },
  { key: 'fuelType', letter: 'E', title: 'FUEL GRADE', width: 'w-36 min-w-[130px]', align: 'center', editable: true },
  { key: 'ratePerUnit', letter: 'F', title: 'RATE (₹/L)', width: 'w-32 min-w-[120px]', align: 'right', editable: true },
  { key: 'calculatedTotal', letter: 'G', title: 'TOTAL AMOUNT (₹)', width: 'w-40 min-w-[150px]', align: 'right', editable: false },
];

const TOTAL_GRID_ROWS = 35; // Number of display rows in Google Sheets grid

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({
  records,
  settings,
  knownVehicles,
  suggestedNextCoupon,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onDeleteMultiple,
  onDuplicateRecord,
  onImportCsv,
  onOpenPrint,
  onOpenSettings,
  onClearAll,
  onUpdateSettings,
  onUpdateRates,
  currentTab,
  onChangeTab,
}) => {
  // Spreadsheet title
  const [sheetTitle, setSheetTitle] = useState('Vehicle Section - Fuel & Coupon Ledger');
  const [isStarred, setIsStarred] = useState(false);
  const [showFormulaBar, setShowFormulaBar] = useState(true);
  const [showGridlines, setShowGridlines] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Active cell coordinate: rowIndex (0-indexed) and colIndex (0-6)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Selected row checkbox IDs for bulk operations
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    row: number;
    recordId?: string;
  } | null>(null);

  // ==========================================
  // 1. VEHICLE FINDER & FILTER STATE
  // ==========================================
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [isFinderOpen, setIsFinderOpen] = useState(false);
  const [activeVehicleFilter, setActiveVehicleFilter] = useState<string>('all');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const finderInputRef = useRef<HTMLInputElement>(null);

  // In-cell vehicle dropdown state
  const [showInCellVehicleDropdown, setShowInCellVehicleDropdown] = useState(false);
  const [inCellVehicleQuery, setInCellVehicleQuery] = useState('');
  const [inCellHighlightedIndex, setInCellHighlightedIndex] = useState(0);

  // ==========================================
  // 2. PETROL & DIESEL RATES STATE
  // ==========================================
  const [dieselPriceInput, setDieselPriceInput] = useState<number>(settings.dieselRate ?? 94.5);
  const [petrolPriceInput, setPetrolPriceInput] = useState<number>(settings.petrolRate ?? 103.2);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [updateExistingConfirm, setUpdateExistingConfirm] = useState(true);
  const [showRunInSheetsModal, setShowRunInSheetsModal] = useState(false);


  // Sync inputs if settings change externally
  useEffect(() => {
    if (settings.dieselRate) setDieselPriceInput(settings.dieselRate);
    if (settings.petrolRate) setPetrolPriceInput(settings.petrolRate);
  }, [settings.dieselRate, settings.petrolRate]);

  // Formatting state (Google Sheets style toggles)
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [statusAggregate, setStatusAggregate] = useState<'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX'>('SUM');
  const [showAggregateMenu, setShowAggregateMenu] = useState(false);

  // Filtered records based on active vehicle filter
  const displayedRecords = useMemo(() => {
    if (activeVehicleFilter === 'all') return records;
    return records.filter(r => r.vehicleNumber === activeVehicleFilter);
  }, [records, activeVehicleFilter]);

  // Helper to determine rate for a given fuel type
  const getRateForFuel = useCallback((fuelType: string | undefined): number => {
    if (fuelType === 'Petrol' || fuelType === 'Gasoline' || fuelType === 'Octane 95') {
      return settings.petrolRate ?? 103.2;
    }
    return settings.dieselRate ?? settings.defaultRate ?? 94.5;
  }, [settings]);

  // Handle setting Diesel price
  const handleSetDieselPrice = (val: number, updateExisting: boolean = true) => {
    setDieselPriceInput(val);
    if (onUpdateRates) {
      onUpdateRates({ dieselRate: val }, updateExisting);
    } else {
      onUpdateSettings({ dieselRate: val, defaultRate: val });
    }
  };

  // Handle setting Petrol price
  const handleSetPetrolPrice = (val: number, updateExisting: boolean = true) => {
    setPetrolPriceInput(val);
    if (onUpdateRates) {
      onUpdateRates({ petrolRate: val }, updateExisting);
    } else {
      onUpdateSettings({ petrolRate: val });
    }
  };

  // Cell reference name (e.g. "B2")
  const activeCellCoord = useMemo(() => {
    const colLetter = COLUMNS[selectedCell.col]?.letter || 'A';
    const rowNum = selectedCell.row + 1;
    return `${colLetter}${rowNum}`;
  }, [selectedCell]);

  // Total rows combined (actual records + empty slots)
  const gridRowsCount = Math.max(displayedRecords.length + 15, TOTAL_GRID_ROWS);

  // Get record at row index if it exists
  const getRecordAtRow = useCallback((rowIndex: number): FuelRecord | undefined => {
    return displayedRecords[rowIndex];
  }, [displayedRecords]);

  // Get cell display value and formula representation
  const getCellDetails = useCallback((rowIndex: number, colIndex: number) => {
    const record = getRecordAtRow(rowIndex);
    const col = COLUMNS[colIndex];
    if (!col) return { display: '', formula: '', raw: '' };

    if (!record) {
      return { display: '', formula: '', raw: '' };
    }

    if (col.key === 'calculatedTotal') {
      const rate = record.ratePerUnit ?? getRateForFuel(record.fuelType);
      const total = record.totalCost ?? Number((record.fuelAmount * rate).toFixed(2));
      const rowRef = rowIndex + 1;
      return {
        display: `${settings.currencySymbol} ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        formula: `=C${rowRef}*F${rowRef}`,
        raw: String(total),
      };
    }

    if (col.key === 'fuelAmount') {
      return {
        display: `${record.fuelAmount.toFixed(1)} ${record.fuelUnit}`,
        formula: String(record.fuelAmount),
        raw: String(record.fuelAmount),
      };
    }

    if (col.key === 'ratePerUnit') {
      const rate = record.ratePerUnit ?? getRateForFuel(record.fuelType);
      return {
        display: `${settings.currencySymbol} ${rate.toFixed(2)}`,
        formula: String(rate),
        raw: String(rate),
      };
    }

    if (col.key === 'date') {
      return {
        display: record.date,
        formula: record.date,
        raw: record.date,
      };
    }

    if (col.key === 'vehicleNumber') {
      return {
        display: record.vehicleNumber,
        formula: record.vehicleNumber,
        raw: record.vehicleNumber,
      };
    }

    if (col.key === 'couponNumber') {
      return {
        display: record.couponNumber,
        formula: record.couponNumber,
        raw: record.couponNumber,
      };
    }

    if (col.key === 'fuelType') {
      return {
        display: record.fuelType || 'Diesel',
        formula: record.fuelType || 'Diesel',
        raw: record.fuelType || 'Diesel',
      };
    }

    return { display: '', formula: '', raw: '' };
  }, [getRecordAtRow, settings, getRateForFuel]);

  // Current active cell formula representation
  const activeCellFormula = useMemo(() => {
    const details = getCellDetails(selectedCell.row, selectedCell.col);
    return details.formula || details.raw || '';
  }, [selectedCell, getCellDetails]);

  // Commit editing changes to record or create new record if in empty row
  const commitEdit = useCallback((rowIndex: number, colIndex: number, value: string) => {
    const col = COLUMNS[colIndex];
    if (!col || col.key === 'calculatedTotal') return;

    const existingRecord = getRecordAtRow(rowIndex);

    if (existingRecord) {
      const updates: Partial<FuelRecord> = {};
      if (col.key === 'fuelAmount') {
        const parsed = parseFloat(value);
        updates.fuelAmount = isNaN(parsed) ? 0 : parsed;
        const rate = existingRecord.ratePerUnit ?? getRateForFuel(existingRecord.fuelType);
        updates.totalCost = Number((updates.fuelAmount * rate).toFixed(2));
      } else if (col.key === 'ratePerUnit') {
        const parsed = parseFloat(value);
        updates.ratePerUnit = isNaN(parsed) ? getRateForFuel(existingRecord.fuelType) : parsed;
        updates.totalCost = Number((existingRecord.fuelAmount * updates.ratePerUnit).toFixed(2));
      } else if (col.key === 'vehicleNumber') {
        updates.vehicleNumber = value.trim().toUpperCase();
      } else if (col.key === 'couponNumber') {
        updates.couponNumber = value.trim().toUpperCase();
      } else if (col.key === 'date') {
        updates.date = value.trim() || getTodayDateString();
      } else if (col.key === 'fuelType') {
        const newFuelType = (value.trim() as FuelRecord['fuelType']) || 'Diesel';
        updates.fuelType = newFuelType;
        // Auto-apply specific Petrol or Diesel rate
        const appropriateRate = getRateForFuel(newFuelType);
        updates.ratePerUnit = appropriateRate;
        updates.totalCost = Number((existingRecord.fuelAmount * appropriateRate).toFixed(2));
      }

      onUpdateRecord(existingRecord.id, updates);
    } else {
      if (!value.trim()) return;

      const fuelType = (col.key === 'fuelType' ? value.trim() : 'Diesel') as FuelRecord['fuelType'];
      const autoRate = getRateForFuel(fuelType);

      const newRecordData: Omit<FuelRecord, 'id' | 'createdAt'> = {
        date: col.key === 'date' ? value.trim() : getTodayDateString(),
        vehicleNumber: col.key === 'vehicleNumber' ? value.trim().toUpperCase() : (knownVehicles[0] || 'OD-05-Y-0050'),
        fuelAmount: col.key === 'fuelAmount' ? (parseFloat(value) || 20) : 20,
        fuelUnit: settings.defaultUnit,
        couponNumber: col.key === 'couponNumber' ? value.trim().toUpperCase() : suggestedNextCoupon,
        fuelType,
        ratePerUnit: col.key === 'ratePerUnit' ? (parseFloat(value) || autoRate) : autoRate,
        status: 'pending',
      };

      onAddRecord(newRecordData);
    }
  }, [getRecordAtRow, settings, knownVehicles, suggestedNextCoupon, onUpdateRecord, onAddRecord, getRateForFuel]);

  // Start in-cell edit
  const startEditCell = useCallback((rowIndex: number, colIndex: number) => {
    const col = COLUMNS[colIndex];
    if (!col || !col.editable) return;
    const details = getCellDetails(rowIndex, colIndex);
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(details.raw || '');

    if (col.key === 'vehicleNumber') {
      setShowInCellVehicleDropdown(true);
      setInCellVehicleQuery(details.raw || '');
      setInCellHighlightedIndex(0);
    } else {
      setShowInCellVehicleDropdown(false);
    }
  }, [getCellDetails]);

  // Save current cell edit and move or stay
  const finishEdit = useCallback((save: boolean = true) => {
    if (editingCell && save) {
      commitEdit(editingCell.row, editingCell.col, editValue);
    }
    setEditingCell(null);
    setShowInCellVehicleDropdown(false);
  }, [editingCell, editValue, commitEdit]);

  // Keyboard navigation across Google Sheets grid
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Global shortcut: Ctrl+F or Cmd+F opens smooth vehicle finder
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setIsFinderOpen(true);
      setTimeout(() => finderInputRef.current?.focus(), 100);
      return;
    }

    // In-cell editing navigation
    if (editingCell) {
      if (showInCellVehicleDropdown) {
        // Arrow down in vehicle autocomplete
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setInCellHighlightedIndex(prev => prev + 1);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setInCellHighlightedIndex(prev => Math.max(0, prev - 1));
          return;
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        finishEdit(true);
        setSelectedCell(prev => ({
          row: Math.min(gridRowsCount - 1, prev.row + 1),
          col: prev.col,
        }));
      } else if (e.key === 'Tab') {
        e.preventDefault();
        finishEdit(true);
        setSelectedCell(prev => {
          if (prev.col < COLUMNS.length - 1) {
            return { row: prev.row, col: prev.col + 1 };
          }
          return { row: Math.min(gridRowsCount - 1, prev.row + 1), col: 0 };
        });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishEdit(false);
      }
      return;
    }

    // Grid navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCell(prev => ({ ...prev, row: Math.max(0, prev.row - 1) }));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCell(prev => ({ ...prev, row: Math.min(gridRowsCount - 1, prev.row + 1) }));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedCell(prev => ({ ...prev, col: Math.max(0, prev.col - 1) }));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSelectedCell(prev => ({ ...prev, col: Math.min(COLUMNS.length - 1, prev.col + 1) }));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        setSelectedCell(prev => {
          if (prev.col > 0) return { row: prev.row, col: prev.col - 1 };
          return { row: Math.max(0, prev.row - 1), col: COLUMNS.length - 1 };
        });
      } else {
        setSelectedCell(prev => {
          if (prev.col < COLUMNS.length - 1) return { row: prev.row, col: prev.col + 1 };
          return { row: Math.min(gridRowsCount - 1, prev.row + 1), col: 0 };
        });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startEditCell(selectedCell.row, selectedCell.col);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const record = getRecordAtRow(selectedCell.row);
      const col = COLUMNS[selectedCell.col];
      if (record && col && col.editable) {
        if (col.key === 'fuelAmount') {
          onUpdateRecord(record.id, { fuelAmount: 0, totalCost: 0 });
        } else if (col.key === 'couponNumber') {
          onUpdateRecord(record.id, { couponNumber: '' });
        }
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const col = COLUMNS[selectedCell.col];
      if (col && col.editable) {
        setEditingCell({ row: selectedCell.row, col: selectedCell.col });
        setEditValue(e.key);
        if (col.key === 'vehicleNumber') {
          setShowInCellVehicleDropdown(true);
          setInCellVehicleQuery(e.key);
        }
      }
    }
  }, [
    editingCell,
    finishEdit,
    gridRowsCount,
    startEditCell,
    selectedCell,
    getRecordAtRow,
    onUpdateRecord,
    showInCellVehicleDropdown,
  ]);

  // Aggregates calculation for bottom right status bar
  const aggregates = useMemo(() => {
    const totalFuel = displayedRecords.reduce((acc, r) => acc + (r.fuelAmount || 0), 0);
    const totalCost = displayedRecords.reduce((acc, r) => {
      const rate = r.ratePerUnit ?? getRateForFuel(r.fuelType);
      return acc + (r.totalCost ?? r.fuelAmount * rate);
    }, 0);
    const count = displayedRecords.length;
    const avg = count > 0 ? totalFuel / count : 0;
    const amounts = displayedRecords.map(r => r.fuelAmount || 0);
    const min = amounts.length > 0 ? Math.min(...amounts) : 0;
    const max = amounts.length > 0 ? Math.max(...amounts) : 0;

    return {
      totalFuel,
      totalCost,
      count,
      avg,
      min,
      max,
    };
  }, [displayedRecords, getRateForFuel]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      setActiveMenu(null);
      setContextMenu(null);
      setShowAggregateMenu(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filtered vehicles for the dedicated Smooth Vehicle Finder
  const matchingFinderVehicles = useMemo(() => {
    const query = vehicleSearchQuery.toUpperCase().trim();
    if (!query) return FLEET_VEHICLES;
    return FLEET_VEHICLES.filter(v => v.includes(query));
  }, [vehicleSearchQuery]);

  // Filtered vehicles for in-cell autocomplete
  const matchingInCellVehicles = useMemo(() => {
    const query = inCellVehicleQuery.toUpperCase().trim();
    if (!query) return FLEET_VEHICLES;
    return FLEET_VEHICLES.filter(v => v.includes(query));
  }, [inCellVehicleQuery]);

  // Highlight helper for search matches
  const renderHighlightedVehicle = (vehicle: string, query: string) => {
    if (!query.trim()) return <span>{vehicle}</span>;
    const upperVeh = vehicle.toUpperCase();
    const upperQuery = query.toUpperCase().trim();
    const idx = upperVeh.indexOf(upperQuery);
    if (idx === -1) return <span>{vehicle}</span>;

    const before = vehicle.slice(0, idx);
    const match = vehicle.slice(idx, idx + query.length);
    const after = vehicle.slice(idx + query.length);

    return (
      <span>
        {before}
        <mark className="bg-amber-200 text-neutral-900 font-bold px-0.5 rounded">{match}</mark>
        {after}
      </span>
    );
  };

  // Add new row with a specified vehicle
  const handleAddNewRowForVehicle = (veh: string, fuelType: 'Diesel' | 'Petrol' = 'Diesel') => {
    const rate = getRateForFuel(fuelType);
    onAddRecord({
      date: getTodayDateString(),
      vehicleNumber: veh,
      fuelAmount: 20,
      fuelUnit: settings.defaultUnit,
      couponNumber: suggestedNextCoupon,
      fuelType,
      ratePerUnit: rate,
      status: 'pending',
    });
    setIsFinderOpen(false);
    setVehicleSearchQuery('');
    setActiveVehicleFilter('all');
    setSelectedCell({ row: 0, col: 2 }); // Focus Fuel Amount cell!
  };

  // Standard Add New Row
  const handleAddNewRow = () => {
    onAddRecord({
      date: getTodayDateString(),
      vehicleNumber: knownVehicles[0] || 'OD-05-Y-0050',
      fuelAmount: 20,
      fuelUnit: settings.defaultUnit,
      couponNumber: suggestedNextCoupon,
      fuelType: 'Diesel',
      ratePerUnit: settings.dieselRate ?? 94.5,
      status: 'pending',
    });
    setSelectedCell({ row: 0, col: 1 });
  };

  const handleExportCSV = () => {
    const filename = `${sheetTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${getTodayDateString()}.csv`;
    exportRecordsToCsv(displayedRecords, filename);
  };

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-white text-[#202124] select-none font-sans"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* ======================================================== */}
      {/* 1. GOOGLE SHEETS TOP HEADER (Title, Star, Status, Share) */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-[#dadce0] px-4 pt-2.5 pb-1 flex flex-col justify-between shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Google Sheets Green Icon + Title + Menu Bar */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              onClick={() => onChangeTab('sheet')}
              className="mt-0.5 cursor-pointer hover:opacity-90 transition-opacity shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-[#0f9d58] shadow-xs"
              title="Google Sheets - Vehicle Section Ledger"
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H5v-2h9v2zm0-4H5v-2h9v2zm0-4H5V7h9v2zm5 8h-3v-2h3v2zm0-4h-3v-2h3v2zm0-4h-3V7h3v2z" />
              </svg>
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  className="text-lg font-normal text-[#202124] px-1.5 py-0.5 rounded hover:border hover:border-[#dadce0] focus:border-[#1a73e8] focus:bg-white focus:outline-none transition-all truncate max-w-md"
                  title="Rename spreadsheet"
                />

                <button
                  onClick={() => setIsStarred(!isStarred)}
                  className="p-1 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors"
                  title={isStarred ? 'Starred' : 'Star document'}
                >
                  <Star className={`w-4 h-4 ${isStarred ? 'text-[#f4b400] fill-[#f4b400]' : ''}`} />
                </button>

                <div
                  className="flex items-center gap-1.5 text-xs text-[#5f6368] ml-2 px-1.5 py-0.5 rounded hover:bg-[#f1f3f4] cursor-default"
                  title="All changes saved to browser storage"
                >
                  <Cloud className="w-4 h-4 text-[#1e8e3e]" />
                  <span className="hidden md:inline">Saved in browser storage</span>
                </div>
              </div>

              {/* Menus */}
              <div className="flex items-center gap-0.5 text-sm text-[#202124] -ml-1 mt-0.5 relative">
                {/* File */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'file' ? null : 'file');
                    }}
                    className={`px-2 py-0.5 rounded text-[13px] hover:bg-[#f1f3f4] ${
                      activeMenu === 'file' ? 'bg-[#e8f0fe] text-[#1a73e8]' : ''
                    }`}
                  >
                    File
                  </button>
                  {activeMenu === 'file' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-64 bg-white border border-[#dadce0] rounded-lg shadow-xl py-1 z-50 text-[13px]"
                    >
                      <button
                        onClick={() => {
                          handleAddNewRow();
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center justify-between"
                      >
                        <span>Add New Entry Row</span>
                        <span className="text-xs text-[#5f6368] font-mono">Ctrl+N</span>
                      </button>
                      <button
                        onClick={() => {
                          onImportCsv();
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-[#5f6368]" />
                        <span>Import CSV Data...</span>
                      </button>
                      <button
                        onClick={() => {
                          handleExportCSV();
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center gap-2"
                      >
                        <Download className="w-4 h-4 text-[#5f6368]" />
                        <span>Download as CSV (.csv)</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowRunInSheetsModal(true);
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#e8f0fe] text-[#1a73e8] font-semibold flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-[#0f9d58]" />
                          <span>Run in Google Sheets...</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#1a73e8]" />
                      </button>
                      <div className="border-t border-[#dadce0] my-1" />

                      <button
                        onClick={() => {
                          onOpenPrint();
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Printer className="w-4 h-4 text-[#5f6368]" />
                          <span>Print Manifest</span>
                        </div>
                        <span className="text-xs text-[#5f6368] font-mono">Ctrl+P</span>
                      </button>
                      <div className="border-t border-[#dadce0] my-1" />
                      <button
                        onClick={() => {
                          if (confirm('Wipe all records from this sheet?')) onClearAll();
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear All Sheet Records</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'edit' ? null : 'edit');
                    }}
                    className={`px-2 py-0.5 rounded text-[13px] hover:bg-[#f1f3f4] ${
                      activeMenu === 'edit' ? 'bg-[#e8f0fe] text-[#1a73e8]' : ''
                    }`}
                  >
                    Edit
                  </button>
                  {activeMenu === 'edit' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-64 bg-white border border-[#dadce0] rounded-lg shadow-xl py-1 z-50 text-[13px]"
                    >
                      <button
                        onClick={() => {
                          setIsFinderOpen(true);
                          setActiveMenu(null);
                          setTimeout(() => finderInputRef.current?.focus(), 100);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center justify-between text-[#1a73e8] font-medium"
                      >
                        <span>Find Vehicle Number</span>
                        <span className="text-xs text-[#5f6368]">Ctrl+F</span>
                      </button>
                      <div className="border-t border-[#dadce0] my-1" />
                      <button
                        onClick={() => {
                          const record = getRecordAtRow(selectedCell.row);
                          if (record) onDuplicateRecord(record.id);
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center justify-between"
                      >
                        <span>Duplicate Selected Row</span>
                      </button>
                      <button
                        onClick={() => {
                          const record = getRecordAtRow(selectedCell.row);
                          if (record) onDeleteRecord(record.id);
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center justify-between text-red-600"
                      >
                        <span>Delete Row #{selectedCell.row + 1}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Tools: Price of Petrol & Diesel */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'tools' ? null : 'tools');
                    }}
                    className={`px-2 py-0.5 rounded text-[13px] hover:bg-[#f1f3f4] ${
                      activeMenu === 'tools' ? 'bg-[#e8f0fe] text-[#1a73e8]' : ''
                    }`}
                  >
                    Tools
                  </button>
                  {activeMenu === 'tools' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-72 bg-white border border-[#dadce0] rounded-lg shadow-xl py-1 z-50 text-[13px]"
                    >
                      <button
                        onClick={() => {
                          setShowPriceModal(true);
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center justify-between text-amber-700 font-semibold"
                      >
                        <span>⛽ Set Petrol &amp; Diesel Prices</span>
                        <Sliders className="w-4 h-4" />
                      </button>
                      <div className="border-t border-[#dadce0] my-1" />
                      <button
                        onClick={() => {
                          onChangeTab('rapid');
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4 text-[#f4b400]" />
                        <span>Rapid Voucher Keypad Entry</span>
                      </button>
                      <button
                        onClick={() => {
                          onOpenSettings();
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center gap-2"
                      >
                        <SettingsIcon className="w-4 h-4 text-[#5f6368]" />
                        <span>Sheet Preferences</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Header: Vehicle Find Quick Button + Add Entry + Export CSV */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Find Vehicle Button */}
            <button
              onClick={() => {
                setIsFinderOpen(true);
                setTimeout(() => finderInputRef.current?.focus(), 100);
              }}
              className="px-3 py-1.5 bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043] font-medium text-xs rounded-full flex items-center gap-1.5 transition-colors border border-[#dadce0]"
              title="Find vehicle smoothly (Ctrl+F)"
            >
              <Search className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span className="hidden sm:inline">Find Vehicle</span>
              <kbd className="hidden md:inline bg-white px-1 border border-neutral-300 rounded text-[10px] text-[#5f6368]">
                Ctrl+F
              </kbd>
            </button>

            {/* Quick "+ New Row" */}
            <button
              onClick={handleAddNewRow}
              className="px-3 py-1.5 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] font-medium text-xs rounded-full flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>

            {/* Run in Google Sheets Guide Button */}
            <button
              onClick={() => setShowRunInSheetsModal(true)}
              className="px-3.5 py-1.5 bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] font-semibold text-xs rounded-full flex items-center gap-1.5 transition-colors border border-[#a8dab5] shadow-xs"
              title="How to run this project in Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0f9d58]" />
              <span className="hidden md:inline">Run in Google Sheets</span>
              <span className="md:hidden">Google Sheets</span>
              <ExternalLink className="w-3 h-3 text-[#137333]" />
            </button>

            {/* Google Sheets Green Share / Export Button */}
            <button
              onClick={handleExportCSV}
              className="px-4 py-1.5 bg-[#0f9d58] hover:bg-[#0b8043] text-white font-medium text-xs rounded-full flex items-center gap-2 transition-colors shadow-xs"
              title="Download spreadsheet as CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>


        {/* ======================================================== */}
        {/* 2. GOOGLE SHEETS ACTION RIBBON WITH PETROL & DIESEL RATES */}
        {/* ======================================================== */}
        <div className="mt-2 bg-[#f0f4f9] rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto text-[#444746] text-xs">
          {/* Left Ribbon Tools */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenPrint}
              className="p-1.5 rounded-full hover:bg-[#dfe3e7] text-[#444746]"
              title="Print Manifest (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-[#dadce0] mx-1" />

            {/* Zoom */}
            <div className="flex items-center px-1.5 py-1 rounded hover:bg-[#dfe3e7] cursor-pointer">
              <span>{zoomLevel}%</span>
              <ChevronDown className="w-3 h-3 ml-1 text-[#5f6368]" />
            </div>

            <div className="w-[1px] h-4 bg-[#dadce0] mx-1" />

            {/* Bold, Italic */}
            <button
              onClick={() => setIsBold(!isBold)}
              className={`p-1.5 rounded hover:bg-[#dfe3e7] ${isBold ? 'bg-[#d3e3fd] text-[#0b57d0]' : ''}`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsItalic(!isItalic)}
              className={`p-1.5 rounded hover:bg-[#dfe3e7] ${isItalic ? 'bg-[#d3e3fd] text-[#0b57d0]' : ''}`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-[#dadce0] mx-1" />

            {/* Alignment */}
            <button
              onClick={() => setTextAlign('left')}
              className={`p-1.5 rounded hover:bg-[#dfe3e7] ${textAlign === 'left' ? 'bg-[#d3e3fd] text-[#0b57d0]' : ''}`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTextAlign('center')}
              className={`p-1.5 rounded hover:bg-[#dfe3e7] ${textAlign === 'center' ? 'bg-[#d3e3fd] text-[#0b57d0]' : ''}`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTextAlign('right')}
              className={`p-1.5 rounded hover:bg-[#dfe3e7] ${textAlign === 'right' ? 'bg-[#d3e3fd] text-[#0b57d0]' : ''}`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center-Right: USER'S REQUESTED PETROL & DIESEL PRICE CONTROLS */}
          <div className="flex items-center gap-2 shrink-0">
            {/* DIESEL PRICE BADGE INPUT */}
            <div
              className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-lg px-2 py-1 shadow-2xs hover:border-amber-500 transition-colors"
              title="Set price of Diesel per liter (auto-calculates diesel vouchers)"
            >
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-bold text-[11px] text-amber-900">Diesel:</span>
              </div>
              <span className="text-[11px] text-[#5f6368] font-bold">₹</span>
              <input
                type="number"
                step="0.05"
                value={dieselPriceInput}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleSetDieselPrice(val, true);
                }}
                className="w-14 font-mono font-bold text-xs text-amber-900 focus:outline-none bg-transparent"
              />
              <span className="text-[10px] text-[#5f6368]">/L</span>
            </div>

            {/* PETROL PRICE BADGE INPUT */}
            <div
              className="flex items-center gap-1.5 bg-white border border-blue-300 rounded-lg px-2 py-1 shadow-2xs hover:border-blue-500 transition-colors"
              title="Set price of Petrol per liter (auto-calculates petrol vouchers)"
            >
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span className="font-bold text-[11px] text-blue-900">Petrol:</span>
              </div>
              <span className="text-[11px] text-[#5f6368] font-bold">₹</span>
              <input
                type="number"
                step="0.05"
                value={petrolPriceInput}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleSetPetrolPrice(val, true);
                }}
                className="w-14 font-mono font-bold text-xs text-blue-900 focus:outline-none bg-transparent"
              />
              <span className="text-[10px] text-[#5f6368]">/L</span>
            </div>

            {/* More Price Options Dialog */}
            <button
              onClick={() => setShowPriceModal(true)}
              className="p-1 rounded hover:bg-[#dfe3e7] text-[#5f6368]"
              title="Fuel Rate Settings & Batch Recalculation"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ACTIVE FILTER NOTIFICATION STRIP IF FILTERED */}
        {activeVehicleFilter !== 'all' && (
          <div className="mt-1 flex items-center justify-between bg-amber-50 border border-amber-200 px-3 py-1 rounded text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Filtered by Vehicle: <strong>{activeVehicleFilter}</strong> ({displayedRecords.length} vouchers found)
              </span>
            </div>
            <button
              onClick={() => setActiveVehicleFilter('all')}
              className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-white px-2 py-0.5 border border-amber-300 rounded"
            >
              <X className="w-3 h-3" />
              <span>Show All Vehicles</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. GOOGLE SHEETS FORMULA BAR */}
        {/* ======================================================== */}
        {showFormulaBar && (
          <div className="flex items-center gap-0 border-t border-b border-[#dadce0] -mx-4 px-4 py-1 mt-1 bg-white">
            <div className="w-16 font-mono text-center text-xs font-semibold text-[#5f6368] py-0.5 border-r border-[#dadce0] shrink-0 select-text">
              {activeCellCoord}
            </div>

            <div className="px-3 text-[#5f6368] font-serif italic text-sm font-semibold select-none shrink-0">
              fx
            </div>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={editingCell ? editValue : activeCellFormula}
                onChange={(e) => {
                  if (editingCell) {
                    setEditValue(e.target.value);
                  } else {
                    startEditCell(selectedCell.row, selectedCell.col);
                    setEditValue(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') finishEdit(true);
                }}
                placeholder="Select a cell or enter value / formula"
                className="w-full text-xs font-mono text-[#202124] focus:outline-none bg-transparent select-text"
              />
            </div>
          </div>
        )}
      </header>

      {/* ======================================================== */}
      {/* 4. MAIN WORKSPACE / SPREADSHEET GRID */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-auto relative bg-[#f8f9fa]">
        {/* Tab: Fleet Directory */}
        {currentTab === 'fleet' && (
          <div className="p-6 max-w-6xl mx-auto bg-white min-h-full">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#dadce0]">
              <div>
                <h2 className="text-lg font-bold text-[#202124] flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#0f9d58]" />
                  <span>Fleet Directory (44 Registered OD-05 Vehicles)</span>
                </h2>
                <p className="text-xs text-[#5f6368]">
                  Click any vehicle to log fuel or filter its ledger records.
                </p>
              </div>
              <button
                onClick={() => onChangeTab('sheet')}
                className="px-3 py-1.5 bg-[#1a73e8] text-white text-xs font-medium rounded-md hover:bg-[#1557b0]"
              >
                Back to Spreadsheet
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {FLEET_VEHICLES.map((v) => {
                const vehicleRecords = records.filter(r => r.vehicleNumber === v);
                const fuelTotal = vehicleRecords.reduce((acc, r) => acc + (r.fuelAmount || 0), 0);

                return (
                  <div
                    key={v}
                    onClick={() => {
                      handleAddNewRowForVehicle(v);
                      onChangeTab('sheet');
                    }}
                    className="p-2.5 border border-[#dadce0] rounded-lg bg-white hover:border-[#1a73e8] hover:bg-[#e8f0fe] cursor-pointer transition-colors text-center group"
                    title={`Click to log fuel for ${v}`}
                  >
                    <div className="font-mono text-xs font-bold text-[#202124] group-hover:text-[#1a73e8]">{v}</div>
                    <div className="text-[10px] text-[#5f6368] mt-1">
                      {vehicleRecords.length} fills · {fuelTotal.toFixed(0)} L
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Analytics */}
        {currentTab === 'analytics' && (
          <div className="p-6 max-w-6xl mx-auto bg-white min-h-full">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#dadce0]">
              <div>
                <h2 className="text-lg font-bold text-[#202124] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#1a73e8]" />
                  <span>Consumption &amp; Voucher Analytics</span>
                </h2>
              </div>
              <button
                onClick={() => onChangeTab('sheet')}
                className="px-3 py-1.5 bg-[#1a73e8] text-white text-xs font-medium rounded-md hover:bg-[#1557b0]"
              >
                Back to Spreadsheet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border border-[#dadce0] rounded-xl bg-[#f8f9fa]">
                <div className="text-xs text-[#5f6368]">Total Fuel Volume</div>
                <div className="text-2xl font-bold font-mono text-[#188038] mt-1">
                  {aggregates.totalFuel.toFixed(1)} {settings.defaultUnit}
                </div>
              </div>
              <div className="p-4 border border-[#dadce0] rounded-xl bg-[#f8f9fa]">
                <div className="text-xs text-[#5f6368]">Total Cost</div>
                <div className="text-2xl font-bold font-mono text-[#1a73e8] mt-1">
                  {settings.currencySymbol} {aggregates.totalCost.toFixed(2)}
                </div>
              </div>
              <div className="p-4 border border-[#dadce0] rounded-xl bg-[#f8f9fa]">
                <div className="text-xs text-[#5f6368]">Total Vouchers</div>
                <div className="text-2xl font-bold font-mono text-[#202124] mt-1">
                  {aggregates.count}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEFAULT TAB: AUTHENTIC GOOGLE SHEETS GRID */}
        {currentTab === 'sheet' && (
          <table
            className={`w-full border-collapse text-xs bg-white ${
              showGridlines ? 'table-fixed' : ''
            }`}
            style={{ zoom: `${zoomLevel}%` }}
          >
            <colgroup>
              <col className="w-12" />
              {COLUMNS.map(col => (
                <col key={col.key} className={col.width} />
              ))}
            </colgroup>

            <thead className="sticky top-0 z-30 shadow-2xs">
              {/* Row 1: Google Sheets Letters (A, B, C...) */}
              <tr className="bg-[#f8f9fa] border-b border-[#dadce0] text-[#5f6368] font-mono text-[11px] h-6">
                <th
                  onClick={() => setSelectedRowIds(displayedRecords.map(r => r.id))}
                  className="w-12 border-r border-[#dadce0] bg-[#f8f9fa] text-center cursor-pointer hover:bg-[#e8eaed]"
                  title="Select all"
                >
                  <div className="w-2.5 h-2.5 border-r border-b border-[#5f6368] mx-auto opacity-40" />
                </th>

                {COLUMNS.map((col, cIdx) => {
                  const isColActive = selectedCell.col === cIdx;
                  return (
                    <th
                      key={col.letter}
                      onClick={() => setSelectedCell({ row: 0, col: cIdx })}
                      className={`border-r border-[#dadce0] text-center font-normal cursor-pointer select-none py-0.5 transition-colors ${
                        isColActive ? 'bg-[#e8f0fe] text-[#1a73e8] font-bold' : 'hover:bg-[#e8eaed]'
                      }`}
                    >
                      {col.letter}
                    </th>
                  );
                })}
              </tr>

              {/* Row 2: Human Field Names */}
              <tr className="bg-[#f1f3f4] border-b-2 border-[#c7c7c7] text-[#202124] text-[11px] font-semibold tracking-wider h-8">
                <th className="border-r border-[#dadce0] bg-[#f1f3f4] text-center text-[#5f6368] font-mono font-normal">
                  #
                </th>
                {COLUMNS.map((col, cIdx) => {
                  const isColActive = selectedCell.col === cIdx;
                  return (
                    <th
                      key={`title-${col.key}`}
                      onClick={() => setSelectedCell({ row: 0, col: cIdx })}
                      className={`border-r border-[#dadce0] px-3 py-1.5 cursor-pointer text-${col.align} select-none ${
                        isColActive ? 'bg-[#e8f0fe] text-[#1a73e8]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{col.title}</span>
                        {col.key === 'vehicleNumber' && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsFinderOpen(true);
                              setTimeout(() => finderInputRef.current?.focus(), 100);
                            }}
                            className="text-[10px] text-[#188038] bg-green-50 border border-green-200 px-1 py-0.2 rounded font-normal hover:bg-green-100 cursor-pointer"
                            title="Click to search 44 vehicles smoothly"
                          >
                            44 fleet 🔍
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: gridRowsCount }).map((_, rIdx) => {
                const record = getRecordAtRow(rIdx);
                const isRowActive = selectedCell.row === rIdx;
                const isRowSelected = record ? selectedRowIds.includes(record.id) : false;

                return (
                  <tr
                    key={`row-${rIdx}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        row: rIdx,
                        recordId: record?.id,
                      });
                    }}
                    className={`h-7 transition-colors ${
                      isRowSelected
                        ? 'bg-[#e8f0fe]'
                        : isRowActive
                        ? 'bg-[#f8fafd]'
                        : 'hover:bg-[#f8f9fa]'
                    }`}
                  >
                    {/* Row Header */}
                    <td
                      onClick={() => {
                        setSelectedCell({ row: rIdx, col: 0 });
                        if (record) {
                          setSelectedRowIds(prev =>
                            prev.includes(record.id)
                              ? prev.filter(id => id !== record.id)
                              : [...prev, record.id]
                          );
                        }
                      }}
                      className={`border-r border-b border-[#dadce0] text-center font-mono text-[11px] select-none cursor-pointer ${
                        isRowActive
                          ? 'bg-[#e8f0fe] text-[#1a73e8] font-bold'
                          : 'bg-[#f8f9fa] text-[#5f6368] hover:bg-[#e8eaed]'
                      }`}
                    >
                      {rIdx + 1}
                    </td>

                    {/* Columns A to G */}
                    {COLUMNS.map((col, cIdx) => {
                      const isCellActive = selectedCell.row === rIdx && selectedCell.col === cIdx;
                      const isEditing = editingCell?.row === rIdx && editingCell?.col === cIdx;
                      const { display } = getCellDetails(rIdx, cIdx);

                      return (
                        <td
                          key={`cell-${rIdx}-${col.key}`}
                          onClick={() => {
                            setSelectedCell({ row: rIdx, col: cIdx });
                          }}
                          onDoubleClick={() => startEditCell(rIdx, cIdx)}
                          className={`relative px-2 py-0.5 border-r border-b border-[#e0e0e0] font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis ${
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                              ? 'text-right'
                              : 'text-left'
                          } ${
                            isCellActive
                              ? 'ring-2 ring-[#1a73e8] ring-inset z-20 bg-white'
                              : ''
                          } ${
                            !record ? 'text-[#80868b]' : 'text-[#202124]'
                          } ${isBold ? 'font-bold' : ''} ${isItalic ? 'italic' : ''}`}
                        >
                          {isCellActive && !isEditing && (
                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#1a73e8] border border-white z-30 cursor-crosshair pointer-events-none" />
                          )}

                          {/* INLINE EDIT MODE */}
                          {isEditing ? (
                            <div className="w-full h-full flex items-center">
                              {col.key === 'vehicleNumber' ? (
                                <div className="relative w-full">
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => {
                                      setEditValue(e.target.value);
                                      setInCellVehicleQuery(e.target.value);
                                      setShowInCellVehicleDropdown(true);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (matchingInCellVehicles[inCellHighlightedIndex]) {
                                          const picked = matchingInCellVehicles[inCellHighlightedIndex];
                                          setEditValue(picked);
                                          commitEdit(rIdx, cIdx, picked);
                                          setEditingCell(null);
                                          setShowInCellVehicleDropdown(false);
                                          setSelectedCell({ row: rIdx, col: 2 }); // Advance to Liters
                                        } else {
                                          finishEdit(true);
                                        }
                                      }
                                    }}
                                    onBlur={() => {
                                      setTimeout(() => finishEdit(true), 180);
                                    }}
                                    autoFocus
                                    placeholder="Type vehicle number..."
                                    className="w-full text-xs font-mono font-bold uppercase bg-white border border-[#1a73e8] px-1 py-0.5 rounded shadow-sm focus:outline-none"
                                  />

                                  {/* SMOOTH IN-CELL AUTOCOMPLETE DROPDOWN */}
                                  {showInCellVehicleDropdown && (
                                    <div className="fixed sm:absolute left-0 top-full mt-1 w-72 max-h-64 overflow-y-auto bg-white border border-[#dadce0] rounded-xl shadow-2xl z-50 py-1 text-left">
                                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#5f6368] bg-[#f8f9fa] border-b border-[#dadce0] flex items-center justify-between">
                                        <span>44 OD-05 Fleet ({matchingInCellVehicles.length})</span>
                                        <span className="text-[9px] text-[#1a73e8] lowercase">↑↓ enter to pick</span>
                                      </div>
                                      {matchingInCellVehicles.length === 0 ? (
                                        <div className="p-3 text-xs text-neutral-400 text-center">
                                          No vehicles match "{inCellVehicleQuery}"
                                        </div>
                                      ) : (
                                        matchingInCellVehicles.map((veh, vIdx) => (
                                          <button
                                            key={veh}
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              setEditValue(veh);
                                              commitEdit(rIdx, cIdx, veh);
                                              setEditingCell(null);
                                              setShowInCellVehicleDropdown(false);
                                              setSelectedCell({ row: rIdx, col: 2 });
                                            }}
                                            className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#e8f0fe] hover:text-[#1a73e8] flex items-center justify-between transition-colors ${
                                              vIdx === inCellHighlightedIndex || editValue === veh
                                                ? 'bg-[#e8f0fe] text-[#1a73e8] font-bold'
                                                : 'text-[#202124]'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] text-neutral-400 font-sans">#{vIdx + 1}</span>
                                              <span>{renderHighlightedVehicle(veh, inCellVehicleQuery)}</span>
                                            </div>
                                            {editValue === veh && <Check className="w-3.5 h-3.5 text-[#1a73e8]" />}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : col.key === 'fuelType' ? (
                                <select
                                  value={editValue}
                                  onChange={(e) => {
                                    setEditValue(e.target.value);
                                    commitEdit(rIdx, cIdx, e.target.value);
                                    setEditingCell(null);
                                  }}
                                  onBlur={() => finishEdit(true)}
                                  autoFocus
                                  className="w-full text-xs font-mono font-bold bg-white border border-[#1a73e8] px-1 py-0.5 rounded shadow-sm focus:outline-none"
                                >
                                  <option value="Diesel">Diesel (₹{settings.dieselRate ?? 94.50})</option>
                                  <option value="Petrol">Petrol (₹{settings.petrolRate ?? 103.20})</option>
                                  <option value="CNG">CNG</option>
                                  <option value="Other">Other</option>
                                </select>
                              ) : col.key === 'date' ? (
                                <input
                                  type="date"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => finishEdit(true)}
                                  autoFocus
                                  className="w-full text-xs font-mono bg-white border border-[#1a73e8] px-1 py-0.5 rounded shadow-sm focus:outline-none"
                                />
                              ) : (
                                <input
                                  type={col.key === 'fuelAmount' || col.key === 'ratePerUnit' ? 'number' : 'text'}
                                  step={col.key === 'fuelAmount' || col.key === 'ratePerUnit' ? '0.01' : undefined}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => finishEdit(true)}
                                  autoFocus
                                  className={`w-full text-xs font-mono bg-white border border-[#1a73e8] px-1 py-0.5 rounded shadow-sm focus:outline-none ${
                                    col.align === 'right' ? 'text-right' : ''
                                  }`}
                                />
                              )}
                            </div>
                          ) : (
                            /* DISPLAY MODE */
                            <div className="flex items-center justify-between w-full h-full">
                              <span
                                className={`truncate ${
                                  col.key === 'vehicleNumber' && record
                                    ? 'font-bold text-[#202124]'
                                    : col.key === 'calculatedTotal' && record
                                    ? 'font-bold text-[#188038]'
                                    : col.key === 'fuelType' && record
                                    ? record.fuelType === 'Petrol'
                                      ? 'text-blue-700 font-semibold'
                                      : 'text-amber-800 font-semibold'
                                    : ''
                                }`}
                              >
                                {display}
                              </span>

                              {col.key === 'vehicleNumber' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditCell(rIdx, cIdx);
                                  }}
                                  className="ml-1 opacity-40 hover:opacity-100 text-[#5f6368] p-0.5 rounded hover:bg-[#dadce0]"
                                  title="Pick from 44 registered OD-05 fleet"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ======================================================== */}
        {/* SMOOTH VEHICLE FINDER MODAL / POPUP (Ctrl+F) */}
        {/* ======================================================== */}
        {isFinderOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-start justify-center pt-16 p-4"
            onClick={() => setIsFinderOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Search Input */}
              <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center gap-3">
                <Search className="w-5 h-5 text-[#1a73e8] shrink-0" />
                <input
                  ref={finderInputRef}
                  type="text"
                  placeholder="Find vehicle number smoothly (e.g. BU, 50, 0001, 3893, 7001)..."
                  value={vehicleSearchQuery}
                  onChange={(e) => {
                    setVehicleSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsFinderOpen(false);
                    } else if (e.key === 'Enter') {
                      if (matchingFinderVehicles[highlightedIndex]) {
                        handleAddNewRowForVehicle(matchingFinderVehicles[highlightedIndex]);
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedIndex(prev => Math.min(matchingFinderVehicles.length - 1, prev + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedIndex(prev => Math.max(0, prev - 1));
                    }
                  }}
                  className="w-full bg-transparent text-sm font-mono font-bold text-neutral-900 focus:outline-none"
                  autoFocus
                />
                {vehicleSearchQuery && (
                  <button
                    onClick={() => setVehicleSearchQuery('')}
                    className="text-neutral-400 hover:text-neutral-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsFinderOpen(false)}
                  className="text-xs text-neutral-500 hover:text-neutral-800 px-2 py-1 bg-white border border-neutral-200 rounded"
                >
                  Esc
                </button>
              </div>

              {/* Status and count */}
              <div className="px-4 py-2 bg-[#f8f9fa] border-b border-neutral-100 flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>
                  Showing {matchingFinderVehicles.length} of 44 OD-05 Registered Vehicles
                </span>
                <span className="text-[11px] text-[#1a73e8]">
                  Click to log voucher or filter
                </span>
              </div>

              {/* List of matching vehicles */}
              <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                {matchingFinderVehicles.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No registered vehicles match "{vehicleSearchQuery}"</p>
                  </div>
                ) : (
                  matchingFinderVehicles.map((v, i) => {
                    const vRecords = records.filter(r => r.vehicleNumber === v);
                    const totalLiters = vRecords.reduce((acc, r) => acc + (r.fuelAmount || 0), 0);
                    const isSelected = i === highlightedIndex;

                    return (
                      <div
                        key={v}
                        className={`p-3 flex items-center justify-between hover:bg-[#e8f0fe]/60 transition-colors ${
                          isSelected ? 'bg-[#e8f0fe]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-neutral-400 w-6 text-right">
                            #{i + 1}
                          </span>
                          <div>
                            <div className="font-mono font-bold text-sm text-neutral-900">
                              {renderHighlightedVehicle(v, vehicleSearchQuery)}
                            </div>
                            <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                              <span>{vRecords.length} vouchers logged</span>
                              <span>·</span>
                              <span>{totalLiters.toFixed(1)} L supplied</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Filter Sheet by this vehicle */}
                          <button
                            onClick={() => {
                              setActiveVehicleFilter(v);
                              setIsFinderOpen(false);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg flex items-center gap-1 shadow-2xs"
                            title="Filter spreadsheet table for this vehicle only"
                          >
                            <Filter className="w-3 h-3 text-amber-600" />
                            <span>Filter</span>
                          </button>

                          {/* 1-Click Log Fuel Voucher */}
                          <button
                            onClick={() => handleAddNewRowForVehicle(v)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-[#0f9d58] hover:bg-[#0b8043] rounded-lg flex items-center gap-1 shadow-xs"
                            title="Create new fuel entry for this vehicle"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Log Fuel</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PETROL & DIESEL RATES MODAL */}
        {/* ======================================================== */}
        {showPriceModal && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4"
            onClick={() => setShowPriceModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md overflow-hidden p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900">
                      Configure Fuel Prices
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Set specific rates for Petrol and Diesel per {settings.defaultUnit}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 py-4 text-xs">
                {/* Diesel Rate */}
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <label className="block font-bold text-amber-900 text-xs mb-1 flex items-center justify-between">
                    <span>Diesel Price ({settings.currencySymbol}/{settings.defaultUnit})</span>
                    <span className="text-[10px] text-amber-700 font-normal">Primary Fleet Fuel</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-amber-900">{settings.currencySymbol}</span>
                    <input
                      type="number"
                      step="0.05"
                      value={dieselPriceInput}
                      onChange={(e) => setDieselPriceInput(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 font-mono font-bold text-base bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-900"
                    />
                  </div>
                </div>

                {/* Petrol Rate */}
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <label className="block font-bold text-blue-900 text-xs mb-1 flex items-center justify-between">
                    <span>Petrol Price ({settings.currencySymbol}/{settings.defaultUnit})</span>
                    <span className="text-[10px] text-blue-700 font-normal">Secondary Fleet Fuel</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-blue-900">{settings.currencySymbol}</span>
                    <input
                      type="number"
                      step="0.05"
                      value={petrolPriceInput}
                      onChange={(e) => setPetrolPriceInput(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 font-mono font-bold text-base bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900"
                    />
                  </div>
                </div>

                {/* Recalculate Existing Records Checkbox */}
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExistingConfirm}
                    onChange={(e) => setUpdateExistingConfirm(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-semibold text-neutral-800">
                      Update existing spreadsheet rows to these prices
                    </span>
                    <p className="text-neutral-500 text-[11px] mt-0.5">
                      Automatically recalculates Total Amount for all existing Diesel and Petrol records.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleSetDieselPrice(dieselPriceInput, updateExistingConfirm);
                    handleSetPetrolPrice(petrolPriceInput, updateExistingConfirm);
                    setShowPriceModal(false);
                  }}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Prices</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Click Context Menu */}
        {contextMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed bg-white border border-[#dadce0] rounded-lg shadow-2xl py-1 z-50 w-56 text-xs text-[#202124]"
          >
            <button
              onClick={() => {
                handleAddNewRow();
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center justify-between"
            >
              <span>Insert 1 row above</span>
            </button>
            <button
              onClick={() => {
                handleAddNewRow();
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center justify-between"
            >
              <span>Insert 1 row below</span>
            </button>
            {contextMenu.recordId && (
              <>
                <div className="border-t border-[#dadce0] my-1" />
                <button
                  onClick={() => {
                    onDuplicateRecord(contextMenu.recordId!);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#f1f3f4] flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>Duplicate row</span>
                </button>
                <button
                  onClick={() => {
                    onDeleteRecord(contextMenu.recordId!);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete row #{contextMenu.row + 1}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. GOOGLE SHEETS BOTTOM BAR & SHEET TABS */}
      {/* ======================================================== */}
      <footer className="bg-[#f8f9fa] border-t border-[#dadce0] px-3 py-1 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddNewRow}
            className="p-1 rounded hover:bg-[#e8eaed] text-[#444746]"
            title="Add entry row"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => alert('Sheets: Vehicle Section, Fleet Directory, Analytics, Rapid Voucher')}
            className="p-1 rounded hover:bg-[#e8eaed] text-[#444746]"
            title="All sheets"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center ml-1">
            <div
              onClick={() => onChangeTab('sheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium cursor-pointer border-t-2 transition-all ${
                currentTab === 'sheet'
                  ? 'bg-white border-[#0f9d58] text-[#0f9d58] shadow-xs'
                  : 'bg-transparent border-transparent text-[#5f6368] hover:bg-[#e8eaed]'
              }`}
            >
              <span>Vehicle Section</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </div>

            <div
              onClick={() => onChangeTab('fleet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium cursor-pointer border-t-2 transition-all ${
                currentTab === 'fleet'
                  ? 'bg-white border-[#0f9d58] text-[#0f9d58] shadow-xs'
                  : 'bg-transparent border-transparent text-[#5f6368] hover:bg-[#e8eaed]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Fleet Directory (44)</span>
            </div>

            <div
              onClick={() => onChangeTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium cursor-pointer border-t-2 transition-all ${
                currentTab === 'analytics'
                  ? 'bg-white border-[#0f9d58] text-[#0f9d58] shadow-xs'
                  : 'bg-transparent border-transparent text-[#5f6368] hover:bg-[#e8eaed]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </div>

            <div
              onClick={() => onChangeTab('rapid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium cursor-pointer border-t-2 transition-all ${
                currentTab === 'rapid'
                  ? 'bg-white border-[#0f9d58] text-[#0f9d58] shadow-xs'
                  : 'bg-transparent border-transparent text-[#5f6368] hover:bg-[#e8eaed]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#f4b400]" />
              <span>Rapid Entry</span>
            </div>
          </div>
        </div>

        {/* Right: Authentic Google Sheets Status Aggregate Pill */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-[#5f6368] hidden sm:inline">
            {displayedRecords.length} {displayedRecords.length === 1 ? 'record' : 'records'} logged
          </div>

          <div
            onClick={() => setShowAggregateMenu(!showAggregateMenu)}
            className="flex items-center gap-1.5 bg-white border border-[#dadce0] rounded px-2.5 py-1 text-xs cursor-pointer hover:bg-[#f1f3f4] font-mono shadow-2xs"
            title="Click to change formula aggregate"
          >
            <span className="font-semibold text-[#188038]">{statusAggregate}:</span>
            <span className="font-bold text-[#202124]">
              {statusAggregate === 'SUM' && `${settings.currencySymbol} ${aggregates.totalCost.toFixed(2)}`}
              {statusAggregate === 'AVG' && `${aggregates.avg.toFixed(1)} ${settings.defaultUnit}`}
              {statusAggregate === 'COUNT' && `${aggregates.count} vouchers`}
              {statusAggregate === 'MIN' && `${aggregates.min.toFixed(1)} ${settings.defaultUnit}`}
              {statusAggregate === 'MAX' && `${aggregates.max.toFixed(1)} ${settings.defaultUnit}`}
            </span>
            <ChevronDown className="w-3 h-3 text-[#5f6368]" />
          </div>
        </div>
      </footer>

      {/* How to Run in Google Sheets Modal */}
      <RunInGoogleSheetsModal
        isOpen={showRunInSheetsModal}
        onClose={() => setShowRunInSheetsModal(false)}
        records={displayedRecords}
        settings={settings}
      />
    </div>
  );
};

