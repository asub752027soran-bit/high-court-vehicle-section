export interface FuelRecord {
  id: string;
  vehicleNumber: string;
  fuelAmount: number; // Volume in liters or gallons
  fuelUnit: 'L' | 'gal';
  couponNumber: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  fuelType: 'Diesel' | 'Petrol' | 'Gasoline' | 'Octane 95' | 'CNG' | 'Other';
  ratePerUnit?: number;
  totalCost?: number;
  driverName?: string;
  meterReading?: number; // km or miles
  stationName?: string;
  notes?: string;
  status: 'reconciled' | 'pending' | 'flagged';
  createdAt: number;
}

export type ViewMode = 'spreadsheet' | 'rapid-entry' | 'fleet-summary' | 'analytics';

export interface FilterState {
  searchQuery: string;
  vehicleFilter: string;
  dateRange: 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  fuelTypeFilter: string;
  statusFilter: string;
}

export interface SortConfig {
  column: keyof FuelRecord;
  direction: 'asc' | 'desc';
}

export interface SheetSettings {
  defaultUnit: 'L' | 'gal';
  currencySymbol: string;
  defaultRate: number; // fallback
  dieselRate: number; // specific Diesel rate per unit
  petrolRate: number; // specific Petrol rate per unit
  autoIncrementCoupon: boolean;
  couponPrefix: string;
}
