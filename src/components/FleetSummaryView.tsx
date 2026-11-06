import React, { useState, useMemo } from 'react';
import { FuelRecord, SheetSettings } from '../types/fuel';
import { formatDateDisplay } from '../utils/fuelUtils';
import { FLEET_VEHICLES } from '../data/initialRecords';
import { Truck, Search, ArrowRight, Fuel, Calendar, Receipt } from 'lucide-react';

interface FleetSummaryViewProps {
  records: FuelRecord[];
  settings: SheetSettings;
  onSelectVehicle: (vehicleNumber: string) => void;
}

export const FleetSummaryView: React.FC<FleetSummaryViewProps> = ({
  records,
  settings,
  onSelectVehicle,
}) => {
  const [search, setSearch] = useState('');

  // Group records by vehicleNumber
  const vehicleStats = useMemo(() => {
    const map = new Map<
      string,
      {
        vehicleNumber: string;
        totalFuel: number;
        totalCost: number;
        couponCount: number;
        latestDate: string;
        fuelTypes: Set<string>;
        records: FuelRecord[];
      }
    >();

    // Pre-populate with all official fleet vehicles
    FLEET_VEHICLES.forEach(v => {
      map.set(v, {
        vehicleNumber: v,
        totalFuel: 0,
        totalCost: 0,
        couponCount: 0,
        latestDate: '',
        fuelTypes: new Set<string>(),
        records: [],
      });
    });

    records.forEach(r => {
      const v = r.vehicleNumber.trim().toUpperCase();
      if (!map.has(v)) {
        map.set(v, {
          vehicleNumber: v,
          totalFuel: 0,
          totalCost: 0,
          couponCount: 0,
          latestDate: r.date,
          fuelTypes: new Set<string>(),
          records: [],
        });
      }

      const item = map.get(v)!;
      item.totalFuel += r.fuelAmount || 0;
      if (r.totalCost) item.totalCost += r.totalCost;
      item.couponCount += 1;
      item.records.push(r);
      if (r.fuelType) item.fuelTypes.add(r.fuelType);
      if (r.date > item.latestDate) {
        item.latestDate = r.date;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalFuel - a.totalFuel);
  }, [records]);

  const filtered = vehicleStats.filter(v =>
    v.vehicleNumber.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            <span>Fleet Vehicle Breakdown</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Total fuel consumed, voucher frequency, and audit status aggregated per vehicle.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search vehicle number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* Grid of Vehicles */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center text-neutral-400">
          <Truck className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
          <p className="font-semibold text-sm text-neutral-700 dark:text-neutral-300">
            No vehicles found
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Try adjusting your search query or log new fuel entries.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const avgPerFill = item.couponCount > 0 ? item.totalFuel / item.couponCount : 0;
            const fuelGrade = Array.from(item.fuelTypes).join(', ') || 'Diesel';

            return (
              <div
                key={item.vehicleNumber}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 tracking-wide">
                        {item.vehicleNumber}
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <span>{item.couponCount > 0 ? fuelGrade : 'Registered Fleet'}</span>
                        <span>·</span>
                        {item.latestDate ? (
                          <span>Last filled {formatDateDisplay(item.latestDate)}</span>
                        ) : (
                          <span className="italic text-neutral-400">Ready for entry</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
                        {item.totalFuel.toFixed(1)} {settings.defaultUnit}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Total Volume
                      </div>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-neutral-100 dark:border-neutral-800 text-center my-3 text-xs">
                    <div>
                      <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {item.couponCount}
                      </div>
                      <div className="text-[10px] text-neutral-400">Coupons</div>
                    </div>
                    <div>
                      <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {avgPerFill.toFixed(1)} {settings.defaultUnit}
                      </div>
                      <div className="text-[10px] text-neutral-400">Avg/Fill</div>
                    </div>
                    <div>
                      <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {settings.currencySymbol}{item.totalCost.toFixed(0)}
                      </div>
                      <div className="text-[10px] text-neutral-400">Est. Spend</div>
                    </div>
                  </div>
                </div>

                {/* Filter Spreadsheet Action */}
                <button
                  onClick={() => onSelectVehicle(item.vehicleNumber)}
                  className="w-full mt-2 py-2 px-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-neutral-700 dark:text-neutral-300 hover:text-amber-700 dark:hover:text-amber-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-neutral-200 dark:border-neutral-700"
                >
                  <span>Filter Spreadsheet for this Vehicle</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
