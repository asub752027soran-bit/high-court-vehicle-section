import React, { useState, useRef, useEffect } from 'react';
import { FuelRecord, SheetSettings } from '../types/fuel';
import { getTodayDateString, getYesterdayDateString } from '../utils/fuelUtils';
import { Zap, Check, ArrowRight, CornerDownLeft, Sparkles, RotateCcw } from 'lucide-react';

interface RapidEntryViewProps {
  onAddRecord: (record: Omit<FuelRecord, 'id' | 'createdAt'>) => FuelRecord;
  knownVehicles: string[];
  suggestedNextCoupon: string;
  recentRecords: FuelRecord[];
  onDeleteRecord: (id: string) => void;
  settings: SheetSettings;
  onSwitchToSpreadsheet: () => void;
}

export const RapidEntryView: React.FC<RapidEntryViewProps> = ({
  onAddRecord,
  knownVehicles,
  suggestedNextCoupon,
  recentRecords,
  onDeleteRecord,
  settings,
  onSwitchToSpreadsheet,
}) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [fuelAmount, setFuelAmount] = useState('');
  const [couponNumber, setCouponNumber] = useState(suggestedNextCoupon);
  const [date, setDate] = useState(getTodayDateString());
  const [fuelType, setFuelType] = useState<FuelRecord['fuelType']>('Diesel');
  const [ratePerUnit, setRatePerUnit] = useState<string>((settings.dieselRate ?? 94.5).toString());
  const [justAddedRecord, setJustAddedRecord] = useState<FuelRecord | null>(null);

  const vehicleInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const couponInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFuelType = (type: 'Diesel' | 'Petrol') => {
    setFuelType(type);
    const targetRate = type === 'Petrol' ? (settings.petrolRate ?? 103.5) : (settings.dieselRate ?? 94.5);
    setRatePerUnit(targetRate.toString());
  };

  const handleVehicleChange = (val: string) => {
    setVehicleNumber(val);
    const upper = val.trim().toUpperCase();
    if (upper === 'OD-05-AN-3893') {
      handleSelectFuelType('Petrol');
    }
  };

  useEffect(() => {
    vehicleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (suggestedNextCoupon) {
      setCouponNumber(suggestedNextCoupon);
    }
  }, [suggestedNextCoupon]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanVehicle = vehicleNumber.trim().toUpperCase();
    const parsedAmount = parseFloat(fuelAmount);
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

    const parsedRate = parseFloat(ratePerUnit);
    const fallbackRate = fuelType === 'Petrol' ? (settings.petrolRate ?? 103.5) : (settings.dieselRate ?? 94.5);
    const currentRate = !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : fallbackRate;
    const totalCost = Number((parsedAmount * currentRate).toFixed(2));

    const record = onAddRecord({
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

    if (record) {
      setJustAddedRecord(record as FuelRecord);
    }

    // Reset amount
    setFuelAmount('');
    // Focus vehicle for next quick voucher
    vehicleInputRef.current?.focus();
    vehicleInputRef.current?.select();
  };

  const quickAmounts = [20, 40, 50, 60, 100, 120];

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Header & Mode Explanation */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Speed Kiosk Entry Mode
              </h2>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              High-speed keyboard flow: type vehicle, fuel amount, coupon, and press Enter to instantly record next voucher.
            </p>
          </div>
          <button
            onClick={onSwitchToSpreadsheet}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg shadow-sm whitespace-nowrap self-start sm:self-center transition-colors"
          >
            Switch to Spreadsheet Table
          </button>
        </div>
      </div>

      {/* Main Kiosk Form */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm mb-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* 1. Vehicle Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                1. Vehicle Number <span className="text-amber-500">*</span>
              </label>
              <input
                ref={vehicleInputRef}
                type="text"
                value={vehicleNumber}
                onChange={(e) => handleVehicleChange(e.target.value)}
                placeholder="e.g. OD-05-Y-0050"
                className="w-full px-4 py-3 text-lg font-mono uppercase bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 font-bold tracking-wide"
                required
              />

              {/* Known Vehicles Quick Chips */}
              {knownVehicles.length > 0 && (
                <div className="mt-2.5">
                  <div className="text-[10px] text-neutral-400 uppercase font-semibold mb-1">
                    Fleet Quick Select ({knownVehicles.length} vehicles registered):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-100 dark:border-neutral-800">
                    {knownVehicles.map((veh) => (
                      <button
                        key={veh}
                        type="button"
                        onClick={() => {
                          handleVehicleChange(veh);
                          amountInputRef.current?.focus();
                        }}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                          vehicleNumber.toUpperCase() === veh
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-white dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        {veh}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Fuel Grade & Rate */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  2. Fuel Type &amp; Rate <span className="text-amber-500">*</span>
                </label>
                <span className="text-[11px] font-mono text-neutral-500">
                  Active: {fuelType} ({settings.currencySymbol}{parseFloat(ratePerUnit || '0').toFixed(2)}/L)
                </span>
              </div>

              {/* Fuel Type Segmented Selector */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handleSelectFuelType('Diesel')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                    fuelType === 'Diesel'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="text-sm font-bold">Diesel</span>
                  <span className="text-[10px] font-mono opacity-90">
                    {settings.currencySymbol}{(settings.dieselRate ?? 94.5).toFixed(2)} / {settings.defaultUnit}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectFuelType('Petrol')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                    fuelType === 'Petrol'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="text-sm font-bold">Petrol</span>
                  <span className="text-[10px] font-mono opacity-90">
                    {settings.currencySymbol}{(settings.petrolRate ?? 103.5).toFixed(2)} / {settings.defaultUnit}
                  </span>
                </button>
              </div>

              {/* Custom Override Fuel Rate */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 whitespace-nowrap">Custom Rate:</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={ratePerUnit}
                    onChange={(e) => setRatePerUnit(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 text-xs font-mono font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:border-amber-500 focus:outline-none"
                    placeholder="94.50"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-neutral-400 font-mono">
                    {settings.currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Fuel Amount Supplied */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                3. Fuel Amount ({settings.defaultUnit}) <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={fuelAmount}
                  onChange={(e) => setFuelAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-4 pr-12 py-3 text-2xl font-mono font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  required
                />
                <span className="absolute right-4 top-3.5 text-sm font-mono font-semibold text-neutral-400">
                  {settings.defaultUnit}
                </span>
              </div>

              {/* Quick Amount presets */}
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-neutral-400 uppercase font-medium mr-1">
                  Preset:
                </span>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setFuelAmount(amt.toString());
                      couponInputRef.current?.focus();
                    }}
                    className="text-xs font-mono px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-400 rounded text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    +{amt}L
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Coupon Number & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 truncate">
                    4. Coupon # <span className="text-amber-500">*</span>
                  </label>
                  {suggestedNextCoupon && (
                    <button
                      type="button"
                      onClick={() => setCouponNumber(suggestedNextCoupon)}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 font-medium"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      #{suggestedNextCoupon}
                    </button>
                  )}
                </div>
                <input
                  ref={couponInputRef}
                  type="text"
                  value={couponNumber}
                  onChange={(e) => setCouponNumber(e.target.value)}
                  placeholder="e.g. CPN-78105"
                  className="w-full px-3 py-3 text-sm font-mono uppercase bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                  5. Date <span className="text-amber-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-3 text-sm font-mono bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Automatic Calculation Preview */}
          {parseFloat(fuelAmount) > 0 && (
            <div className="mb-6 p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl flex flex-wrap items-center justify-between gap-3 font-mono">
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">Formula: </span>
                {parseFloat(fuelAmount).toFixed(2)} {settings.defaultUnit} × {settings.currencySymbol}{parseFloat(ratePerUnit || '0').toFixed(2)} ({fuelType})
              </div>
              <div className="text-sm">
                <span className="text-neutral-400 mr-2 text-xs">Total Amount:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-lg">
                  {settings.currencySymbol}{(parseFloat(fuelAmount) * parseFloat(ratePerUnit || '0')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 flex items-center gap-1.5">
              <CornerDownLeft className="w-4 h-4 text-neutral-400" />
              <span>Press <strong>Enter</strong> anywhere to record and start next row</span>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Record Voucher &amp; Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Just Logged Voucher confirmation */}
      {justAddedRecord && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Logged Voucher #{justAddedRecord.couponNumber}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                Vehicle: {justAddedRecord.vehicleNumber} · {justAddedRecord.fuelAmount} {justAddedRecord.fuelUnit} ({justAddedRecord.fuelType}) · {justAddedRecord.date}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onDeleteRecord(justAddedRecord.id);
              setJustAddedRecord(null);
            }}
            className="text-xs text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Recent Entries from this session */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center justify-between">
          <span>Recent Logged Vouchers ({recentRecords.slice(0, 5).length})</span>
          <button
            onClick={onSwitchToSpreadsheet}
            className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
          >
            View Full Spreadsheet →
          </button>
        </h3>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {recentRecords.slice(0, 5).map((rec) => (
            <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 w-24">
                  {rec.vehicleNumber}
                </span>
                <span className="font-mono text-neutral-500 w-24">
                  #{rec.couponNumber}
                </span>
                <span className="font-mono text-neutral-400 hidden sm:inline">
                  {rec.date}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {rec.fuelAmount.toFixed(1)} {rec.fuelUnit}
                </span>
                <button
                  onClick={() => onDeleteRecord(rec.id)}
                  className="text-neutral-400 hover:text-red-500 transition-colors"
                  title="Remove entry"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
