import { FuelRecord, FilterState, SortConfig } from '../types/fuel';

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateFleetStats(records: FuelRecord[]) {
  const count = records.length;
  let totalFuel = 0;
  let totalCost = 0;
  const vehicleSet = new Set<string>();
  const todayStr = getTodayDateString();
  let todayFuel = 0;
  let pendingCount = 0;

  records.forEach(r => {
    totalFuel += r.fuelAmount || 0;
    if (r.totalCost) totalCost += r.totalCost;
    if (r.vehicleNumber) vehicleSet.add(r.vehicleNumber);
    if (r.date === todayStr) todayFuel += r.fuelAmount || 0;
    if (r.status === 'pending') pendingCount += 1;
  });

  const avgFuelPerFill = count > 0 ? totalFuel / count : 0;

  return {
    count,
    totalFuel: Number(totalFuel.toFixed(1)),
    totalCost: Number(totalCost.toFixed(2)),
    uniqueVehicles: vehicleSet.size,
    avgFuelPerFill: Number(avgFuelPerFill.toFixed(1)),
    todayFuel: Number(todayFuel.toFixed(1)),
    pendingCount,
  };
}

export function filterAndSortRecords(
  records: FuelRecord[],
  filter: FilterState,
  sort: SortConfig
): FuelRecord[] {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  const filtered = records.filter(item => {
    // Search query matches vehicle, coupon, driver, station, notes
    if (filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchVehicle = item.vehicleNumber.toLowerCase().includes(q);
      const matchCoupon = item.couponNumber.toLowerCase().includes(q);
      const matchDriver = (item.driverName || '').toLowerCase().includes(q);
      const matchStation = (item.stationName || '').toLowerCase().includes(q);
      const matchDate = item.date.toLowerCase().includes(q);
      if (!matchVehicle && !matchCoupon && !matchDriver && !matchStation && !matchDate) {
        return false;
      }
    }

    // Vehicle specific filter
    if (filter.vehicleFilter !== 'all' && item.vehicleNumber !== filter.vehicleFilter) {
      return false;
    }

    // Fuel Type filter
    if (filter.fuelTypeFilter !== 'all' && item.fuelType !== filter.fuelTypeFilter) {
      return false;
    }

    // Status filter
    if (filter.statusFilter !== 'all' && item.status !== filter.statusFilter) {
      return false;
    }

    // Date range filter
    if (filter.dateRange === 'today') {
      return item.date === today;
    } else if (filter.dateRange === 'yesterday') {
      return item.date === yesterday;
    } else if (filter.dateRange === 'week') {
      const itemDate = new Date(item.date).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return itemDate >= sevenDaysAgo;
    } else if (filter.dateRange === 'month') {
      const itemDate = new Date(item.date).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return itemDate >= thirtyDaysAgo;
    } else if (filter.dateRange === 'custom') {
      if (filter.customStartDate && item.date < filter.customStartDate) return false;
      if (filter.customEndDate && item.date > filter.customEndDate) return false;
    }

    return true;
  });

  // Sort
  return filtered.sort((a, b) => {
    let aVal = a[sort.column];
    let bVal = b[sort.column];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });
}

export function exportRecordsToCsv(records: FuelRecord[], filename = 'fuel_speedsheet.csv') {
  const headers = [
    'Date',
    'Vehicle Number',
    'Fuel Amount',
    'Unit',
    'Coupon Number',
    'Fuel Grade',
    'Rate Per Unit',
    'Total Amount',
  ];

  const escapeCsv = (val: string | number | undefined) => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = records.map(r => [
    escapeCsv(r.date),
    escapeCsv(r.vehicleNumber),
    escapeCsv(r.fuelAmount),
    escapeCsv(r.fuelUnit),
    escapeCsv(r.couponNumber),
    escapeCsv(r.fuelType),
    escapeCsv(r.ratePerUnit || ''),
    escapeCsv(r.totalCost || (r.ratePerUnit ? (r.fuelAmount * r.ratePerUnit).toFixed(2) : '')),
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCsvText(csvText: string): Omit<FuelRecord, 'id' | 'createdAt'>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const parsedRecords: Omit<FuelRecord, 'id' | 'createdAt'>[] = [];
  // Detect if first line is header
  const firstLine = lines[0].toLowerCase();
  const startIndex = firstLine.includes('vehicle') || firstLine.includes('date') || firstLine.includes('coupon') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple regex CSV splitter handling quotes
    const cells: string[] = [];
    let insideQuotes = false;
    let currentCell = '';

    for (let charIndex = 0; charIndex < rawLine.length; charIndex++) {
      const char = rawLine[charIndex];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());

    if (cells.length < 3) continue;

    // Mapping logic:
    // Format 1 (Standard): Date, Vehicle, Fuel Amount, Unit, Coupon, FuelType, Rate, Cost...
    // Or flexible order
    let date = getTodayDateString();
    let vehicle = '';
    let amount = 0;
    let coupon = '';
    let fuelType: FuelRecord['fuelType'] = 'Diesel';
    let rate: number | undefined;
    let cost: number | undefined;

    // Check cells
    // If cell looks like a date (YYYY-MM-DD or MM/DD/YYYY)
    const dateIdx = cells.findIndex(c => /\d{4}-\d{2}-\d{2}/.test(c) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(c));
    if (dateIdx !== -1) {
      date = cells[dateIdx].replace(/["']/g, '');
    }

    // Number cell could be fuel amount
    const amountIdx = cells.findIndex((c, idx) => idx !== dateIdx && /^\d+(\.\d+)?$/.test(c.replace(/["']/g, '')));
    if (amountIdx !== -1) {
      amount = parseFloat(cells[amountIdx].replace(/["']/g, '')) || 0;
    }

    // Assign vehicle and coupon
    const remainingTextCells = cells.filter((_, idx) => idx !== dateIdx && idx !== amountIdx);
    if (remainingTextCells.length > 0) {
      vehicle = remainingTextCells[0].replace(/["']/g, '');
    }
    if (remainingTextCells.length > 1) {
      coupon = remainingTextCells[1].replace(/["']/g, '');
    }

    if (!vehicle && cells[1]) vehicle = cells[1].replace(/["']/g, '');
    if (!coupon && cells[4]) coupon = cells[4].replace(/["']/g, '');

    if (vehicle || coupon || amount > 0) {
      parsedRecords.push({
        date: date || getTodayDateString(),
        vehicleNumber: vehicle || 'UNKNOWN',
        fuelAmount: amount,
        fuelUnit: 'L',
        couponNumber: coupon || `CPN-${Date.now().toString().slice(-5)}`,
        fuelType,
        ratePerUnit: rate,
        totalCost: cost,
        status: 'pending',
      });
    }
  }

  return parsedRecords;
}
