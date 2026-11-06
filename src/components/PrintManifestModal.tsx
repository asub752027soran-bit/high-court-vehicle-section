import React from 'react';
import { FuelRecord, SheetSettings } from '../types/fuel';
import { formatDateDisplay } from '../utils/fuelUtils';
import { Printer, X, Download } from 'lucide-react';

interface PrintManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: FuelRecord[];
  settings: SheetSettings;
}

export const PrintManifestModal: React.FC<PrintManifestModalProps> = ({
  isOpen,
  onClose,
  records,
  settings,
}) => {
  if (!isOpen) return null;

  const totalFuel = records.reduce((s, r) => s + (r.fuelAmount || 0), 0);
  const totalCost = records.reduce((s, r) => s + (r.totalCost || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Controls bar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between no-print bg-neutral-50 dark:bg-neutral-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-sm text-neutral-800 dark:text-neutral-100">
              Print Fuel Voucher Manifest
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Manifest</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="p-8 overflow-y-auto bg-white text-black font-sans text-xs">
          {/* Company / Fleet Header */}
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider text-black">
                Fuel Supply &amp; Coupon Audit Manifest
              </h1>
              <p className="text-xs text-neutral-600 mt-1">
                Fleet Logistics &amp; Fuel Disbursement Reconciliation Record
              </p>
            </div>
            <div className="text-right font-mono text-xs">
              <div><strong>Generated:</strong> {new Date().toLocaleDateString()}</div>
              <div><strong>Audited Records:</strong> {records.length}</div>
            </div>
          </div>

          {/* Key Totals Box */}
          <div className="grid grid-cols-4 gap-4 p-4 border border-neutral-300 rounded-lg mb-6 bg-neutral-50 font-mono">
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">Total Fuel Supplied</div>
              <div className="text-base font-bold">{totalFuel.toFixed(1)} {settings.defaultUnit}</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">Total Vouchers</div>
              <div className="text-base font-bold">{records.length} Coupons</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">Active Vehicles</div>
              <div className="text-base font-bold">{new Set(records.map(r => r.vehicleNumber)).size} Fleet Units</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">Total Value</div>
              <div className="text-base font-bold">{settings.currencySymbol}{totalCost.toFixed(2)}</div>
            </div>
          </div>

          {/* Vouchers Table */}
          <table className="w-full text-left border-collapse border border-neutral-300 text-xs mb-8">
            <thead>
              <tr className="bg-neutral-100 font-bold border-b border-neutral-300">
                <th className="p-2 border-r border-neutral-300">#</th>
                <th className="p-2 border-r border-neutral-300">Date</th>
                <th className="p-2 border-r border-neutral-300">Vehicle Number</th>
                <th className="p-2 border-r border-neutral-300 text-right">Fuel Supplied ({settings.defaultUnit})</th>
                <th className="p-2 border-r border-neutral-300">Coupon #</th>
                <th className="p-2 border-r border-neutral-300 text-right">Rate ({settings.currencySymbol}/{settings.defaultUnit})</th>
                <th className="p-2 text-right">Total Amount ({settings.currencySymbol})</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} className="border-b border-neutral-200">
                  <td className="p-2 font-mono border-r border-neutral-300">{i + 1}</td>
                  <td className="p-2 font-mono border-r border-neutral-300">{r.date}</td>
                  <td className="p-2 font-mono font-bold border-r border-neutral-300">{r.vehicleNumber}</td>
                  <td className="p-2 font-mono font-bold text-right border-r border-neutral-300">
                    {r.fuelAmount.toFixed(1)}
                  </td>
                  <td className="p-2 font-mono border-r border-neutral-300">{r.couponNumber}</td>
                  <td className="p-2 font-mono text-right border-r border-neutral-300">
                    {(r.ratePerUnit ?? settings.defaultRate).toFixed(2)}
                  </td>
                  <td className="p-2 font-mono font-bold text-right">
                    {(r.totalCost ?? r.fuelAmount * (r.ratePerUnit ?? settings.defaultRate)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-100 font-bold font-mono border-t border-neutral-300">
                <td colSpan={3} className="p-2 text-right border-r border-neutral-300">TOTAL</td>
                <td className="p-2 text-right border-r border-neutral-300 font-bold">
                  {totalFuel.toFixed(1)} {settings.defaultUnit}
                </td>
                <td colSpan={2} className="p-2 text-right border-r border-neutral-300">
                  {records.length} Vouchers
                </td>
                <td className="p-2 text-right font-bold">
                  {settings.currencySymbol}{totalCost.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Supervisor Sign-Off Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-8 border-t border-neutral-300">
            <div>
              <div className="border-b border-black h-12 mb-2"></div>
              <div className="font-semibold text-xs">Pump Operator / Fuel Attendant</div>
              <div className="text-[10px] text-neutral-500">Signature &amp; Date</div>
            </div>

            <div>
              <div className="border-b border-black h-12 mb-2"></div>
              <div className="font-semibold text-xs">Fleet Transport Supervisor / Auditor</div>
              <div className="text-[10px] text-neutral-500">Signature &amp; Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
