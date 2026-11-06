import React, { useState, useRef, useEffect } from 'react';
import { FuelRecord, SheetSettings } from '../types/fuel';
import { getTodayDateString, getYesterdayDateString } from '../utils/fuelUtils';
import { Plus, Check, Sparkles, Fuel } from 'lucide-react';

interface QuickEntryBarProps {
  onAddRecord: (record: Omit<FuelRecord, 'id' | 'createdAt'>) => FuelRecord | void;
  knownVehicles: string[];
  suggestedNextCoupon: string;
  settings: SheetSettings;
  onUpdateSettings: (newSettings: Partial<SheetSettings>) => void;
}

// Known petrol units in the fleet
const KNOWN_PETROL_VEHICLES = new Set(['OD-05-AN-3893']);

export const QuickEntryBar: React.FC<QuickEntryBarProps> = ({
  onAddRecord,
  knownVehicles,
  suggestedNextCoupon,
  settings,
  onUpdateSettings,
}) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [fuelType, setFuelType] = useState<FuelRecord['fuelType']>('Diesel');
  const [fuelAmount, setFuelAmount] = useState('');
  const [couponNumber, setCouponNumber] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [ratePerUnit, setRatePerUnit] = useState<string>(
    (settings.dieselRate ?? 94.5).toString()
  );
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);

  const vehicleInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const couponInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);

  // Sync rate when fuelType or settings changes
  const handleSelectFuelType = (type: 'Diesel' | 'Petrol') => {
    setFuelType(type);
    const targetRate = type === 'Petrol' ? (settings.petrolRate ?? 103.5) : (settings.dieselRate ?? 94.5);
    setRatePerUnit(targetRate.toString());
  };

  // Auto-detect fuel type based on vehicle
  const handleVehicleChange = (val: string) => {
    setVehicleNumber(val);
    const upper = val.trim().toUpperCase();
    if (KNOWN_PETROL_VEHICLES.has(upper)) {
      setFuelType('Petrol');
      setRatePerUnit((settings.petrolRate ?? 103.5).toString());
    } else if (upper.startsWith('OD-05-') && fuelType === 'Petrol' && !KNOWN_PETROL_VEHICLES.has(upper)) {
      setFuelType('Diesel');
      setRatePerUnit((settings.dieselRate ?? 94.5).toString());
    }
  };

  // Update custom rate and persist to settings for that fuel type
  const handleCustomRateChange = (val: string) => {
    setRatePerUnit(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      if (fuelType === 'Petrol') {
        onUpdateSettings({ petrolRate: num });
      } else {
        onUpdateSettings({ dieselRate: num, defaultRate: num });
      }
    }
  };

  // Initialize coupon with suggested coupon if empty
  useEffect(() => {
    if (!couponNumber && suggestedNextCoupon) {
      setCouponNumber(suggestedNextCoupon);
    }
  }, [suggestedNextCoupon]);

  // Autocomplete vehicle filtering
  const filteredVehicles = knownVehicles.filter(
    v => vehicleNumber.trim() && v.toLowerCase().includes(vehicleNumber.toLowerCase().trim()) && v !== vehicleNumber.toUpperCase().trim()
  );

  const parsedAmount = parseFloat(fuelAmount) || 0;
  const parsedRate = parseFloat(ratePerUnit) || 0;
  // Automatic calculation of amount
  const liveTotalAmount = Number((parsedAmount * parsedRate).toFixed(2));

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanVehicle = vehicleNumber.trim().toUpperCase();
    const cleanCoupon = couponNumber.trim().toUpperCase();

    if (!cleanVehicle) {
      vehicleInputRef.current?.focus();
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      amountInputRef.current?.focus();
      return;
    }

    if (!cleanCoupon) {
      couponInputRef.current?.focus();
      return;
    }

    const defaultForType = fuelType === 'Petrol' ? (settings.petrolRate ?? 103.5) : (settings.dieselRate ?? 94.5);
    const currentRate = !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : defaultForType;
    const totalCost = Number((parsedAmount * currentRate).toFixed(2));

    onAddRecord({
      vehicleNumber: cleanVehicle,
      fuelAmount: parsedAmount,
      fuelUnit: settings.defaultUnit,
      couponNumber: cleanCoupon,
      date: date || getTodayDateString(),
      fuelType,
      ratePerUnit: currentRate,
      totalCost,
      status: 'reconciled',
    });

    // Reset amount for next entry
    setFuelAmount('');

    // Flash success indicator
    setShowSuccessBadge(true);
    setTimeout(() => setShowSuccessBadge(false), 1200);

    // Keep focus ready for next entry
    if (settings.autoIncrementCoupon) {
      vehicleInputRef.current?.focus();
      vehicleInputRef.current?.select();
    } else {
      couponInputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm transition-all mb-6">
      {/* Top Bar with Fuel Rates Display */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            Speed Entry Row
          </span>
          <span className="text-xs text-neutral-400">·</span>
          {/* Active Rates Badges */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSelectFuelType('Diesel')}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-colors ${
                fuelType === 'Diesel'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Diesel: {settings.currencySymbol}{(settings.dieselRate ?? 94.5).toFixed(2)}/L
            </button>
            <button
              type="button"
              onClick={() => handleSelectFuelType('Petrol')}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-colors ${
                fuelType === 'Petrol'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Petrol: {settings.currencySymbol}{(settings.petrolRate ?? 103.5).toFixed(2)}/L
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-800 dark:hover:text-neutral-300">
            <input
              type="checkbox"
              checked={settings.autoIncrementCoupon}
              onChange={(e) => onUpdateSettings({ autoIncrementCoupon: e.target.checked })}
              className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Auto-increment Coupon #</span>
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* 1. Vehicle Number */}
          <div className="lg:col-span-3 relative">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Vehicle Number <span className="text-amber-500">*</span>
              </label>
              {knownVehicles.length > 0 && (
                <span className="text-[10px] text-neutral-400">
                  {knownVehicles.length} fleet
                </span>
              )}
            </div>
            <div className="relative">
              <input
                ref={vehicleInputRef}
                type="text"
                placeholder="e.g. OD-05-Y-0050"
                value={vehicleNumber}
                onChange={(e) => {
                  handleVehicleChange(e.target.value);
                  setShowVehicleSuggestions(true);
                }}
                onFocus={() => setShowVehicleSuggestions(true)}
                onBlur={() => setTimeout(() => setShowVehicleSuggestions(false), 200)}
                className="w-full px-3 py-2 text-sm font-mono uppercase bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-medium placeholder:normal-case placeholder:font-sans placeholder:text-neutral-400"
                required
              />
              {showVehicleSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700 sticky top-0">
                    Fleet Vehicles ({knownVehicles.length})
                  </div>
                  {(filteredVehicles.length > 0 ? filteredVehicles : knownVehicles).map((veh) => (
                    <button
                      key={veh}
                      type="button"
                      onMouseDown={() => {
                        handleVehicleChange(veh);
                        setShowVehicleSuggestions(false);
                        amountInputRef.current?.focus();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 text-neutral-800 dark:text-neutral-200 border-b border-neutral-50 dark:border-neutral-800/50 last:border-0 flex justify-between"
                    >
                      <span>{veh}</span>
                      <span className="text-[10px] text-neutral-400">
                        {KNOWN_PETROL_VEHICLES.has(veh) ? 'Petrol' : 'Diesel'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Fuel Type Selector (Diesel / Petrol) */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Fuel Type <span className="text-amber-500">*</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 h-[38px] items-center">
              <button
                type="button"
                onClick={() => handleSelectFuelType('Diesel')}
                className={`h-full text-xs font-semibold rounded transition-colors flex items-center justify-center ${
                  fuelType === 'Diesel'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Diesel
              </button>
              <button
                type="button"
                onClick={() => handleSelectFuelType('Petrol')}
                className={`h-full text-xs font-semibold rounded transition-colors flex items-center justify-center ${
                  fuelType === 'Petrol'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Petrol
              </button>
            </div>
          </div>

          {/* 3. Fuel Amount Supplied */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Amount ({settings.defaultUnit}) <span className="text-amber-500">*</span>
              </label>
            </div>
            <div className="relative">
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                min="0.1"
                placeholder="0.00"
                value={fuelAmount}
                onChange={(e) => setFuelAmount(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-sm font-mono tabular-nums bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-semibold"
                required
              />
              <span className="absolute right-2.5 top-2.5 text-xs font-mono font-medium text-neutral-400 pointer-events-none">
                {settings.defaultUnit}
              </span>
            </div>
          </div>

          {/* 4. Fuel Rate (Auto-filled by Fuel Type, customizable) */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Rate ({settings.currencySymbol}/{settings.defaultUnit})
              </label>
              <span className="text-[10px] text-neutral-400 font-mono">
                {fuelType}
              </span>
            </div>
            <div className="relative">
              <input
                ref={rateInputRef}
                type="number"
                step="0.01"
                min="0.1"
                placeholder="94.50"
                value={ratePerUnit}
                onChange={(e) => handleCustomRateChange(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-sm font-mono tabular-nums bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-bold text-neutral-900 dark:text-neutral-100"
                title={`Rate for ${fuelType}. Changes here update the custom ${fuelType} rate.`}
              />
              <span className="absolute right-2.5 top-2.5 text-xs font-mono font-medium text-neutral-400 pointer-events-none">
                {settings.currencySymbol}
              </span>
            </div>
          </div>

          {/* 5. Coupon Number */}
          <div className="lg:col-span-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                Coupon #
              </label>
            </div>
            <input
              ref={couponInputRef}
              type="text"
              placeholder="CPN..."
              value={couponNumber}
              onChange={(e) => setCouponNumber(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-mono uppercase bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-medium placeholder:normal-case placeholder:font-sans placeholder:text-neutral-400"
              required
            />
          </div>

          {/* 6. Date */}
          <div className="lg:col-span-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Date
              </label>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-1.5 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-neutral-800 dark:text-neutral-200"
              required
            />
          </div>

          {/* 7. Submit Button */}
          <div className="lg:col-span-1 flex flex-col justify-end">
            <button
              type="submit"
              className={`w-full py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                showSuccessBadge
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
              }`}
            >
              {showSuccessBadge ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Calculation Preview when entering amounts */}
        {parsedAmount > 0 && (
          <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                Auto-Calculating:
              </span>
              <span>
                {parsedAmount.toFixed(2)} {settings.defaultUnit} × {settings.currencySymbol}{parsedRate.toFixed(2)} ({fuelType})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Total:</span>
              <span className="font-bold text-amber-700 dark:text-amber-400 text-base">
                {settings.currencySymbol}{liveTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
