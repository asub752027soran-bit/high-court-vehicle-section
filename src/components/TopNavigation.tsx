import React from 'react';
import { ViewMode } from '../types/fuel';
import {
  Table2,
  Zap,
  Truck,
  BarChart3,
  Download,
  Upload,
  Printer,
  Plus,
} from 'lucide-react';

interface TopNavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenQuickAdd: () => void;
  onExportCsv: () => void;
  onOpenImport: () => void;
  onOpenPrint: () => void;
  totalRecordsCount: number;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentView,
  onViewChange,
  onOpenQuickAdd,
  onExportCsv,
  onOpenImport,
  onOpenPrint,
  totalRecordsCount,
}) => {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#speedsheet"
              onClick={(e) => {
                e.preventDefault();
                onViewChange('spreadsheet');
              }}
              className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-50 whitespace-nowrap shrink-0 flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-mono font-bold text-base border border-amber-500/20">
                ⛽
              </div>
              <span>Vehicle Section</span>
            </a>
          </div>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            <button
              onClick={() => onViewChange('spreadsheet')}
              className={`hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 border-b-2 ${
                currentView === 'spreadsheet'
                  ? 'border-amber-500 text-neutral-900 dark:text-white font-semibold'
                  : 'border-transparent'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>Spreadsheet Grid</span>
              <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
                ({totalRecordsCount})
              </span>
            </button>

            <button
              onClick={() => onViewChange('rapid-entry')}
              className={`hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 border-b-2 ${
                currentView === 'rapid-entry'
                  ? 'border-amber-500 text-neutral-900 dark:text-white font-semibold'
                  : 'border-transparent'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Rapid Entry Mode</span>
            </button>

            <button
              onClick={() => onViewChange('fleet-summary')}
              className={`hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 border-b-2 ${
                currentView === 'fleet-summary'
                  ? 'border-amber-500 text-neutral-900 dark:text-white font-semibold'
                  : 'border-transparent'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Fleet Summary</span>
            </button>

            <button
              onClick={() => onViewChange('analytics')}
              className={`hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 border-b-2 ${
                currentView === 'analytics'
                  ? 'border-amber-500 text-neutral-900 dark:text-white font-semibold'
                  : 'border-transparent'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Fuel Analytics</span>
            </button>
          </nav>

          {/* Zone 3: Primary actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Export for Google Sheets / Excel */}
            <button
              onClick={onExportCsv}
              title="Download spreadsheet compatible with Google Sheets and Excel"
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/80 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export for Google Sheets</span>
            </button>

            <button
              onClick={onOpenImport}
              title="Import spreadsheet CSV"
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              onClick={onOpenPrint}
              title="Print Manifest / Report"
              className="p-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenQuickAdd}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Entry</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden items-center justify-around py-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <button
            onClick={() => onViewChange('spreadsheet')}
            className={`py-1 px-2 font-medium ${
              currentView === 'spreadsheet' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-500'
            }`}
          >
            Spreadsheet
          </button>
          <button
            onClick={() => onViewChange('rapid-entry')}
            className={`py-1 px-2 font-medium ${
              currentView === 'rapid-entry' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-500'
            }`}
          >
            Rapid Entry
          </button>
          <button
            onClick={() => onViewChange('fleet-summary')}
            className={`py-1 px-2 font-medium ${
              currentView === 'fleet-summary' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-500'
            }`}
          >
            Fleet
          </button>
          <button
            onClick={() => onViewChange('analytics')}
            className={`py-1 px-2 font-medium ${
              currentView === 'analytics' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-neutral-500'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>
    </header>
  );
};
