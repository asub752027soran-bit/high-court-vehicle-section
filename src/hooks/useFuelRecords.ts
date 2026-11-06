import { useState, useEffect, useMemo, useCallback } from 'react';
import { FuelRecord, SheetSettings } from '../types/fuel';
import { INITIAL_FUEL_RECORDS, FLEET_VEHICLES } from '../data/initialRecords';

const STORAGE_KEY_RECORDS = 'fuel_speedsheet_records_v4_clean';
const STORAGE_KEY_SETTINGS = 'fuel_speedsheet_settings_v4_clean';

const DEFAULT_SETTINGS: SheetSettings = {
  defaultUnit: 'L',
  currencySymbol: '₹',
  defaultRate: 94.5,
  dieselRate: 94.5,
  petrolRate: 103.5,
  autoIncrementCoupon: true,
  couponPrefix: 'CPN-',
};

export function useFuelRecords() {
  // Purge any older demo keys from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('fuel_speedsheet_records_v1');
      localStorage.removeItem('fuel_speedsheet_records_v2');
    } catch {
      // ignore
    }
  }, []);

  const [records, setRecords] = useState<FuelRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved fuel records from localStorage', e);
    }
    return INITIAL_FUEL_RECORDS; // completely empty []
  });

  const [settings, setSettings] = useState<SheetSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const loaded = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...loaded,
          dieselRate: loaded.dieselRate ?? loaded.defaultRate ?? DEFAULT_SETTINGS.dieselRate,
          petrolRate: loaded.petrolRate ?? DEFAULT_SETTINGS.petrolRate,
        };
      }
    } catch (e) {
      console.warn('Failed to parse settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Save records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save records to localStorage', e);
    }
  }, [records]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }, [settings]);

  // Complete list of fleet vehicle numbers combining official user fleet list and any logged records
  const knownVehicles = useMemo(() => {
    const set = new Set<string>(FLEET_VEHICLES);
    records.forEach(r => {
      if (r.vehicleNumber?.trim()) {
        set.add(r.vehicleNumber.trim().toUpperCase());
      }
    });
    return Array.from(set);
  }, [records]);

  // Suggest next coupon number (e.g. CPN-10001 when empty, or auto-incrementing from last coupon)
  const suggestedNextCoupon = useMemo(() => {
    if (!records.length) return `${settings.couponPrefix}10001`;

    let maxNum = 0;
    let foundPrefix = settings.couponPrefix;

    for (const r of records) {
      const match = r.couponNumber.match(/^([A-Za-z_-]*)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
          if (prefix) foundPrefix = prefix;
        }
      }
    }

    if (maxNum > 0) {
      const nextNum = maxNum + 1;
      const digits = String(nextNum).length;
      const padLength = Math.max(5, digits);
      return `${foundPrefix}${String(nextNum).padStart(padLength, '0')}`;
    }

    return `${settings.couponPrefix}10001`;
  }, [records, settings.couponPrefix]);

  const addRecord = useCallback((data: Omit<FuelRecord, 'id' | 'createdAt'>): FuelRecord => {
    const newRecord: FuelRecord = {
      ...data,
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
      couponNumber: data.couponNumber.trim().toUpperCase(),
      totalCost: data.totalCost ?? (data.ratePerUnit ? Number((data.fuelAmount * data.ratePerUnit).toFixed(2)) : undefined),
    };

    setRecords(prev => [newRecord, ...prev]);
    return newRecord;
  }, []);

  const updateRecord = useCallback((id: string, updates: Partial<FuelRecord>) => {
    setRecords(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          if (updates.vehicleNumber) {
            updated.vehicleNumber = updates.vehicleNumber.trim().toUpperCase();
          }
          if (updates.couponNumber) {
            updated.couponNumber = updates.couponNumber.trim().toUpperCase();
          }
          if (updates.fuelAmount !== undefined || updates.ratePerUnit !== undefined) {
            const amount = updates.fuelAmount ?? item.fuelAmount;
            const rate = updates.ratePerUnit ?? item.ratePerUnit;
            if (rate && amount) {
              updated.totalCost = Number((amount * rate).toFixed(2));
            }
          }
          return updated;
        }
        return item;
      })
    );
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(item => item.id !== id));
  }, []);

  const deleteMultiple = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setRecords(prev => prev.filter(item => !idSet.has(item.id)));
  }, []);

  const duplicateRecord = useCallback((id: string) => {
    setRecords(prev => {
      const target = prev.find(item => item.id === id);
      if (!target) return prev;
      const duplicated: FuelRecord = {
        ...target,
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
        couponNumber: `${target.couponNumber}-COPY`,
      };
      return [duplicated, ...prev];
    });
  }, []);

  const importRecords = useCallback((newRecords: Omit<FuelRecord, 'id' | 'createdAt'>[]) => {
    const formatted: FuelRecord[] = newRecords.map((r, i) => ({
      ...r,
      id: `rec-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now() - i * 1000,
      vehicleNumber: r.vehicleNumber.trim().toUpperCase(),
      couponNumber: r.couponNumber.trim().toUpperCase(),
      totalCost: r.totalCost ?? (r.ratePerUnit ? Number((r.fuelAmount * r.ratePerUnit).toFixed(2)) : undefined),
    }));

    setRecords(prev => [...formatted, ...prev]);
    return formatted.length;
  }, []);

  const resetToDemo = useCallback(() => {
    setRecords([]);
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<SheetSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    records,
    settings,
    knownVehicles,
    suggestedNextCoupon,
    addRecord,
    updateRecord,
    deleteRecord,
    deleteMultiple,
    duplicateRecord,
    importRecords,
    resetToDemo,
    clearAll,
    updateSettings,
  };
}
