import React from 'react';
import { FilterState } from '../types/fuel';
import { Search, Filter, X, Calendar } from 'lucide-react';

interface FilterControlsProps {
  filter: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  knownVehicles: string[];
  totalCount: number;
  filteredCount: number;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filter,
  onFilterChange,
  knownVehicles,
  totalCount,
  filteredCount,
}) => {
  const hasActiveFilters =
    filter.searchQuery.trim() !== '' ||
    filter.vehicleFilter !== 'all' ||
    filter.dateRange !== 'all' ||
    filter.fuelTypeFilter !== 'all';

  const resetFilters = () => {
    onFilterChange({
      searchQuery: '',
      vehicleFilter: 'all',
      dateRange: 'all',
      fuelTypeFilter: 'all',
      statusFilter: 'all',
      customStartDate: undefined,
      customEndDate: undefined,
    });
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 sm:p-4 mb-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Vehicle #, Coupon #, Date, Driver..."
            value={filter.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-medium placeholder:text-neutral-400"
          />
          {filter.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Vehicle Filter */}
          <select
            value={filter.vehicleFilter}
            onChange={(e) => onFilterChange({ vehicleFilter: e.target.value })}
            className="px-2.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium text-neutral-700 dark:text-neutral-300"
          >
            <option value="all">All Vehicles ({knownVehicles.length})</option>
            {knownVehicles.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          {/* Date Range Filter */}
          <select
            value={filter.dateRange}
            onChange={(e) =>
              onFilterChange({
                dateRange: e.target.value as FilterState['dateRange'],
              })
            }
            className="px-2.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium text-neutral-700 dark:text-neutral-300"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="custom">Custom Range...</option>
          </select>

          {/* Fuel Grade Filter */}
          <select
            value={filter.fuelTypeFilter}
            onChange={(e) => onFilterChange({ fuelTypeFilter: e.target.value })}
            className="px-2.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium text-neutral-700 dark:text-neutral-300 hidden sm:block"
          >
            <option value="all">All Grades</option>
            <option value="Diesel">Diesel</option>
            <option value="Petrol">Petrol</option>
            <option value="Octane 95">Octane 95</option>
            <option value="CNG">CNG</option>
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg font-medium flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Pickers if custom is selected */}
      {filter.dateRange === 'custom' && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 text-xs">
          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-500">From:</span>
          <input
            type="date"
            value={filter.customStartDate || ''}
            onChange={(e) => onFilterChange({ customStartDate: e.target.value })}
            className="px-2 py-1 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded"
          />
          <span className="text-neutral-500">To:</span>
          <input
            type="date"
            value={filter.customEndDate || ''}
            onChange={(e) => onFilterChange({ customEndDate: e.target.value })}
            className="px-2 py-1 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded"
          />
        </div>
      )}

      {/* Showing counter */}
      <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
        <span>
          Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> fuel vouchers
        </span>
        {filteredCount !== totalCount && (
          <span className="text-amber-600 dark:text-amber-400">
            Filters active ({totalCount - filteredCount} hidden)
          </span>
        )}
      </div>
    </div>
  );
};
