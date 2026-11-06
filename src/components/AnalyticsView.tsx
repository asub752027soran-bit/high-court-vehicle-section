import React, { useMemo } from 'react';
import { FuelRecord, SheetSettings } from '../types/fuel';
import { formatDateDisplay } from '../utils/fuelUtils';
import { BarChart3, PieChart, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AnalyticsViewProps {
  records: FuelRecord[];
  settings: SheetSettings;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ records, settings }) => {
  // Aggregate daily consumption (last 14 days sorted)
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      map.set(r.date, (map.get(r.date) || 0) + (r.fuelAmount || 0));
    });

    const dates = Array.from(map.keys()).sort();
    return dates.slice(-10).map(d => ({
      date: d,
      amount: map.get(d) || 0,
    }));
  }, [records]);

  const maxDaily = Math.max(...dailyData.map(d => d.amount), 50);

  // Fuel Type distribution
  const fuelTypeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      const type = r.fuelType || 'Diesel';
      map.set(type, (map.get(type) || 0) + (r.fuelAmount || 0));
    });
    return Array.from(map.entries()).map(([type, amount]) => ({ type, amount }));
  }, [records]);

  const totalFuelSum = records.reduce((s, r) => s + (r.fuelAmount || 0), 0);

  // Top 5 consuming vehicles
  const topVehicles = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      const v = r.vehicleNumber;
      map.set(v, (map.get(v) || 0) + (r.fuelAmount || 0));
    });
    return Array.from(map.entries())
      .map(([vehicle, amount]) => ({ vehicle, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [records]);

  const maxVehicleAmount = Math.max(...topVehicles.map(v => v.amount), 50);

  return (
    <div className="py-4 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          <span>Fuel Consumption Analytics</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Auditing fuel volume distribution, consumption trends, and top fleet consumers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Fuel Volume Trend */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Daily Fuel Supplied ({settings.defaultUnit})</span>
            </h3>
            <span className="text-xs text-neutral-400 font-mono">
              Last {dailyData.length} active days
            </span>
          </div>

          {dailyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-neutral-400">
              No daily records available
            </div>
          ) : (
            <div className="h-52 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 border-b border-neutral-200 dark:border-neutral-700">
              {dailyData.map((d) => {
                const heightPercent = Math.max(8, (d.amount / maxDaily) * 100);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-neutral-900 text-white text-[10px] font-mono py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow">
                      {d.amount.toFixed(1)} {settings.defaultUnit} ({d.date})
                    </div>
                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-amber-500/80 hover:bg-amber-500 rounded-t transition-all"
                    ></div>
                    {/* Date label */}
                    <span className="text-[10px] font-mono text-neutral-400 truncate w-full text-center">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Top 5 Consuming Vehicles */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-emerald-500" />
              <span>Top Consuming Vehicles</span>
            </h3>
            <span className="text-xs text-neutral-400 font-mono">
              Volume ({settings.defaultUnit})
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {topVehicles.map((item, idx) => {
              const widthPct = Math.max(10, (item.amount / maxVehicleAmount) * 100);
              const pctOfTotal = totalFuelSum > 0 ? (item.amount / totalFuelSum) * 100 : 0;

              return (
                <div key={item.vehicle} className="text-xs">
                  <div className="flex justify-between items-center mb-1 font-mono">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {idx + 1}. {item.vehicle}
                    </span>
                    <span className="tabular-nums font-bold text-amber-700 dark:text-amber-400">
                      {item.amount.toFixed(1)} {settings.defaultUnit} ({pctOfTotal.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className="bg-amber-600 dark:bg-amber-500 h-2 rounded-full transition-all"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fuel Grade Distribution & Audit Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            Fuel Grade Volume Breakdown
          </h3>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
            {fuelTypeDistribution.map((item) => {
              const share = totalFuelSum > 0 ? ((item.amount / totalFuelSum) * 100).toFixed(1) : '0';
              return (
                <div key={item.type} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {item.type}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      {item.amount.toFixed(1)} {settings.defaultUnit}
                    </span>
                    <span className="text-neutral-400 ml-2">({share}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            Fuel Rate &amp; Cost Overview
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                Current Custom Fuel Rate
              </span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                {settings.currencySymbol}{settings.defaultRate.toFixed(2)} / {settings.defaultUnit}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                Average Spend Per Voucher
              </span>
              <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                {settings.currencySymbol}
                {(records.length > 0
                  ? records.reduce((s, r) => s + (r.totalCost || 0), 0) / records.length
                  : 0
                ).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                Total Fleet Fuel Value
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {settings.currencySymbol}
                {records.reduce((s, r) => s + (r.totalCost || 0), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
