import React, { useState } from 'react';
import { FLEET_VEHICLES } from '../data/initialRecords';
import { SheetSettings, FuelRecord } from '../types/fuel';
import { exportRecordsToCsv, getTodayDateString } from '../utils/fuelUtils';
import {
  ExternalLink,
  Download,
  Copy,
  Check,
  X,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Code,
  Layers,
} from 'lucide-react';

interface RunInGoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: FuelRecord[];
  settings: SheetSettings;
}

export const RunInGoogleSheetsModal: React.FC<RunInGoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  records,
  settings,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quick' | 'formulas' | 'script'>('quick');

  if (!isOpen) return null;

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleDownload = () => {
    const filename = `vehicle_section_ledger_${getTodayDateString()}.csv`;
    exportRecordsToCsv(records, filename);
  };

  const vehiclesCsvList = FLEET_VEHICLES.join(', ');

  const appsScriptCode = `/**
 * Google Apps Script for Vehicle Section Fuel Ledger
 * Paste this in Google Sheets > Extensions > Apps Script
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⛽ Vehicle Section')
    .addItem('Apply 44 Fleet Vehicle Validation', 'applyVehicleValidation')
    .addItem('Calculate Total Amounts', 'calculateTotals')
    .addItem('Set Fuel Rates (Diesel/Petrol)', 'setRates')
    .addToUi();
}

function applyVehicleValidation() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var vehicles = [
    "${FLEET_VEHICLES.slice(0, 15).join('", "')}",
    "${FLEET_VEHICLES.slice(15, 30).join('", "')}",
    "${FLEET_VEHICLES.slice(30).join('", "')}"
  ];
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(vehicles, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("B2:B500").setDataValidation(rule);
  SpreadsheetApp.getUi().alert('Success: 44 OD-05 fleet vehicles dropdown applied to Column B!');
}

function calculateTotals() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = Math.max(sheet.getLastRow(), 2);
  sheet.getRange("G2:G" + lastRow).setFormula("=C2*F2");
  SpreadsheetApp.getUi().alert('Totals calculated: Column G = Fuel Amount (C) * Rate (F)');
}
`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-text">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0f9d58] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H5v-2h9v2zm0-4H5v-2h9v2zm0-4H5V7h9v2zm5 8h-3v-2h3v2zm0-4h-3v-2h3v2zm0-4h-3V7h3v2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base">How to Run in Google Sheets</h3>
              <p className="text-xs text-white/80">
                Run your Vehicle Section ledger with 44 OD-05 vehicles and auto-calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center border-b border-neutral-200 bg-neutral-50 px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('quick')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'quick'
                ? 'border-[#0f9d58] text-[#0f9d58]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>3-Step Quick Start</span>
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'formulas'
                ? 'border-[#0f9d58] text-[#0f9d58]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Formulas &amp; 44 Vehicle Dropdown</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-[#0f9d58] text-[#0f9d58]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Google Apps Script (Optional)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-neutral-700">
          {activeTab === 'quick' && (
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#0f9d58] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-sm">Download your Spreadsheet File</h4>
                  <p className="text-neutral-600 mt-0.5">
                    Downloads a standard spreadsheet file with all columns (Date, Vehicle Number, Fuel Amount, Coupon #, Fuel Grade, Rate, Total Amount).
                  </p>
                  <button
                    onClick={handleDownload}
                    className="mt-2.5 px-3.5 py-1.5 bg-[#0f9d58] hover:bg-[#0b8043] text-white font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV for Google Sheets</span>
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#1a73e8] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-sm">Open a New Google Sheet</h4>
                  <p className="text-neutral-600 mt-0.5">
                    Click the button below to open an empty Google Sheet directly in your Google account:
                  </p>
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    <span>Open sheets.new</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 text-sm">Import the File into Google Sheets</h4>
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-neutral-600">
                    <li>In Google Sheets, click <strong>File</strong> in the top menu.</li>
                    <li>Click <strong>Import</strong>.</li>
                    <li>Select the <strong>Upload</strong> tab and choose your downloaded CSV file.</li>
                    <li>Choose <strong>Replace current sheet</strong> and click <strong>Import data</strong>.</li>
                  </ol>
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] font-medium">
                    ✓ That's it! Your Vehicle Section spreadsheet is now running inside real Google Sheets.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'formulas' && (
            <div className="space-y-4">
              <p className="text-neutral-600">
                Copy and paste these formulas into Google Sheets to enable auto-calculations and dropdowns:
              </p>

              {/* Vehicle Dropdown Validation List */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-neutral-900">1. All 44 OD-05 Fleet Vehicles (For Data Validation Dropdown)</span>
                  <button
                    onClick={() => handleCopy(vehiclesCsvList, 'vehicles')}
                    className="px-2.5 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 rounded text-neutral-700 font-medium flex items-center gap-1 shadow-2xs"
                  >
                    {copiedSection === 'vehicles' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'vehicles' ? 'Copied!' : 'Copy 44 Vehicles'}</span>
                  </button>
                </div>
                <p className="text-neutral-500 text-[11px] mb-2">
                  In Google Sheets: Select Column B &gt; <strong>Data</strong> &gt; <strong>Data validation</strong> &gt; <strong>Add rule</strong> &gt; <strong>Dropdown (from a range or list)</strong> &gt; Paste this list.
                </p>
                <div className="p-2.5 bg-white border border-neutral-200 rounded-lg font-mono text-[11px] text-neutral-700 max-h-24 overflow-y-auto leading-relaxed">
                  {vehiclesCsvList}
                </div>
              </div>

              {/* Total Amount Formula */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-neutral-900">2. Total Amount Formula (Column G)</span>
                  <button
                    onClick={() => handleCopy('=C2*F2', 'formula-total')}
                    className="px-2.5 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 rounded text-neutral-700 font-medium flex items-center gap-1 shadow-2xs"
                  >
                    {copiedSection === 'formula-total' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'formula-total' ? 'Copied!' : 'Copy Formula'}</span>
                  </button>
                </div>
                <p className="text-neutral-500 text-[11px] mb-2">
                  In Google Sheets: Paste into cell <strong>G2</strong> and double-click the small corner square to apply down the column:
                </p>
                <div className="p-2.5 bg-white border border-neutral-200 rounded-lg font-mono text-sm font-bold text-[#1a73e8]">
                  =C2*F2
                </div>
              </div>

              {/* Auto Rate by Fuel Type Formula */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-neutral-900">3. Auto Price Formula by Petrol vs Diesel (Column F)</span>
                  <button
                    onClick={() => handleCopy(`=IF(E2="Petrol", ${settings.petrolRate ?? 103.20}, ${settings.dieselRate ?? 94.50})`, 'formula-rate')}
                    className="px-2.5 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 rounded text-neutral-700 font-medium flex items-center gap-1 shadow-2xs"
                  >
                    {copiedSection === 'formula-rate' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'formula-rate' ? 'Copied!' : 'Copy Rate Formula'}</span>
                  </button>
                </div>
                <p className="text-neutral-500 text-[11px] mb-2">
                  In Google Sheets: Paste into cell <strong>F2</strong> to automatically pick Petrol (₹{settings.petrolRate}) or Diesel (₹{settings.dieselRate}):
                </p>
                <div className="p-2.5 bg-white border border-neutral-200 rounded-lg font-mono text-xs font-bold text-amber-700">
                  {`=IF(E2="Petrol", ${settings.petrolRate ?? 103.20}, ${settings.dieselRate ?? 94.50})`}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-neutral-900">Google Apps Script for Google Sheets</h4>
                  <p className="text-neutral-500 text-[11px]">
                    Adds a custom "⛽ Vehicle Section" menu directly inside Google Sheets with 1-click validation!
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(appsScriptCode, 'script')}
                  className="px-3 py-1.5 bg-[#0f9d58] hover:bg-[#0b8043] text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {copiedSection === 'script' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'script' ? 'Copied Code!' : 'Copy Script'}</span>
                </button>
              </div>

              <div className="p-2 bg-neutral-100 rounded-lg text-neutral-600 text-[11px]">
                <strong>How to use:</strong> In Google Sheets, click <strong>Extensions</strong> &gt; <strong>Apps Script</strong> &gt; paste this code &gt; click <strong>Save</strong> (Ctrl+S) &gt; Refresh your sheet!
              </div>

              <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
                {appsScriptCode}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between shrink-0">
          <div className="text-neutral-500 text-[11px]">
            No Google account authorization required · Direct import via CSV
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold rounded-lg transition-colors text-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
