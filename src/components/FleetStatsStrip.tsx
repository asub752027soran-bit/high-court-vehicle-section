import React from 'react';
import { FuelRecord, SheetSettings } from '../types/fuel';
import { calculateFleetStats } from '../utils/fuelUtils';
import { Fuel, Receipt, Truck, Calendar, DollarSign, Clock } from 'lucide-react';

interface FleetStatsStripProps {
  records: FuelRecord[];
  settings: SheetSettings;
}

export const FleetStatsStrip: React.FC<FleetStatsStripProps> = ({ records, settings }) => {
  const stats = calculateFleetStats(records);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
      {/* 1. Total Fuel Supplied */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-neutral-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Total Fuel</span>
          <Fuel className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
          {stats.totalFuel.toLocaleString()}
          <span className="text-xs font-normal text-neutral-400 ml-1">
            {settings.defaultUnit}
          </span>
        </div>
        <div className="text-[11px] text-neutral-400 mt-0.5">
          Avg {stats.avgFuelPerFill} {settings.defaultUnit}/fill
        </div>
      </div>

      {/* 2. Total Vouchers */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-neutral-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Coupons Logged</span>
          <Receipt className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
          {stats.count}
        </div>
        <div className="text-[11px] text-neutral-400 mt-0.5">
          Audited vouchers
        </div>
      </div>

      {/* 3. Unique Fleet Vehicles */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-neutral-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Active Fleet</span>
          <Truck className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
          {stats.uniqueVehicles}
        </div>
        <div className="text-[11px] text-neutral-400 mt-0.5">
          Distinct vehicle numbers
        </div>
      </div>

      {/* 4. Today's Fuel Volume */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-neutral-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Today's Fuel</span>
          <Calendar className="w-4 h-4 text-purple-500" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
          {stats.todayFuel.toFixed(1)}
          <span className="text-xs font-normal text-neutral-400 ml-1">
            {settings.defaultUnit}
          </span>
        </div>
        <div className="text-[11px] text-neutral-400 mt-0.5">
          Logged today
        </div>
      </div>

      {/* 5. Total Cost */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-neutral-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Total Value</span>
          <DollarSign className="w-4 h-4 text-green-600" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
          {settings.currencySymbol}{stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[11px] text-neutral-400 mt-0.5">
          Cumulative fuel expenditure
        </div>
      </div>

      {/* 6. Active Fuel Rates (Diesel & Petrol) */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-neutral-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Current Rates</span>
          <Fuel className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="text-xs sm:text-sm font-bold font-mono text-neutral-800 dark:text-neutral-200 flex justify-between items-center">
            <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">Diesel</span>
            <span>{settings.currencySymbol}{(settings.dieselRate ?? 94.5).toFixed(2)}/L</span>
          </div>
          <div className="text-xs sm:text-sm font-bold font-mono text-neutral-800 dark:text-neutral-200 flex justify-between items-center">
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">Petrol</span>
            <span>{settings.currencySymbol}{(settings.petrolRate ?? 103.5).toFixed(2)}/L</span>
          </div>
        </div>
        <div className="text-[10px] text-neutral-400 mt-1">
          Auto-applied by grade
        </div>
      </div>
    </div>
  );
};
