import React, { useState } from 'react';
import { useFuelRecords } from './hooks/useFuelRecords';
import { GoogleSheetsView } from './components/GoogleSheetsView';
import { CsvImportModal } from './components/CsvImportModal';
import { PrintManifestModal } from './components/PrintManifestModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const {
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
    updateRates,
  } = useFuelRecords();

  const [currentTab, setCurrentTab] = useState<'sheet' | 'fleet' | 'analytics' | 'rapid'>('sheet');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col font-sans">
      {/* Primary Authentic Google Sheets View */}
      <GoogleSheetsView
        records={records}
        settings={settings}
        knownVehicles={knownVehicles}
        suggestedNextCoupon={suggestedNextCoupon}
        onAddRecord={addRecord}
        onUpdateRecord={updateRecord}
        onDeleteRecord={deleteRecord}
        onDeleteMultiple={deleteMultiple}
        onDuplicateRecord={duplicateRecord}
        onImportCsv={() => setIsImportModalOpen(true)}
        onOpenPrint={() => setIsPrintModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onClearAll={clearAll}
        onUpdateSettings={updateSettings}
        onUpdateRates={updateRates}
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
      />

      {/* CSV Import Modal (Accessible via File > Import CSV) */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(imported) => {
          importRecords(imported);
          setCurrentTab('sheet');
        }}
      />

      {/* Print Manifest Modal (Accessible via File > Print or Ribbon) */}
      <PrintManifestModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        records={records}
        settings={settings}
      />

      {/* Settings & Preferences Modal (Accessible via Tools > Preferences) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={updateSettings}
        onClearAllRecords={clearAll}
        onResetDemoData={resetToDemo}
      />
    </div>
  );
}

