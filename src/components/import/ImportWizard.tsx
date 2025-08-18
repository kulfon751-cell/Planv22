import { useState, useCallback, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAppStore } from '@/store/app-store';
import { parseCSVFile, parseExcelFile, getFileInfo, ParsedData, FileInfo } from '@/lib/import/file-parser';
import { processImportData, generateHeaderHash } from '@/lib/import/data-processor';
import { detectFieldMapping, validateFieldMapping, createDefaultMapping } from '@/lib/field-mapping';
import { FieldMapping, ImportProgress, ImportProfile, ImportResult } from '@/lib/types';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (operations: any[]) => void;
}

type WizardStep = 'file-select' | 'sheet-select' | 'mapping' | 'processing' | 'summary' | 'complete';

export function ImportWizard({ isOpen, onClose, onComplete }: ImportWizardProps) {
  const { userRole, importProfiles, addImportProfile } = useAppStore();
  const [currentStep, setCurrentStep] = useState<WizardStep>('file-select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRow, setHeaderRow] = useState(1);
  const [mapping, setMapping] = useState<FieldMapping>(createDefaultMapping());
  const [transformations, setTransformations] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<ImportProgress>({
    stage: 'reading',
    progress: 0,
    processedRows: 0,
    totalRows: 0,
    errors: [],
    canCancel: false
  });
  const [error, setError] = useState<string | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [finalResult, setFinalResult] = useState<ImportResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isAdmin = userRole === 'admin';

  const resetWizard = useCallback(() => {
    setCurrentStep('file-select');
    setSelectedFile(null);
    setFileInfo(null);
    setParsedData(null);
    setSelectedSheet('');
    setHeaderRow(1);
    setMapping(createDefaultMapping());
    setTransformations({});
    setProgress({
      stage: 'reading',
      progress: 0,
      processedRows: 0,
      totalRows: 0,
      errors: [],
      canCancel: false
    });
    setError(null);
  setShowAllErrors(false);
  setFinalResult(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetWizard();
    onClose();
  }, [resetWizard, onClose]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!isAdmin) return;
    
    setSelectedFile(file);
    setError(null);
    
    try {
      const info = await getFileInfo(file);
      setFileInfo(info);
      
      if (info.sheets && info.sheets.length > 1) {
        setSelectedSheet(info.sheets[0]);
        setCurrentStep('sheet-select');
      } else {
        setCurrentStep('mapping');
        await parseFile(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd odczytu pliku');
    }
  }, [isAdmin]);

  const parseFile = useCallback(async (file: File, sheet?: string, headerRowNum: number = 1) => {
    if (!file) return;
    
    setError(null);
    abortControllerRef.current = new AbortController();
    
    try {
      let data: ParsedData;
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        data = await parseCSVFile(file, setProgress, abortControllerRef.current.signal);
      } else {
        data = await parseExcelFile(file, sheet, headerRowNum, setProgress, abortControllerRef.current.signal);
      }
      
      setParsedData(data);
      
      // Auto-detect field mapping
      const detectedMapping = detectFieldMapping(data.headers);
      const headerHash = generateHeaderHash(data.headers);
      
      // Try to find matching profile
  const matchingProfile = importProfiles.find((p: ImportProfile) => p.headerHash === headerHash);
      if (matchingProfile) {
        setMapping(matchingProfile.mapping);
        setTransformations(matchingProfile.transformations);
      } else {
        setMapping({ ...createDefaultMapping(), ...detectedMapping });
      }
      
      setCurrentStep('mapping');
    } catch (err) {
      if (err instanceof Error && err.message.includes('anulowany')) {
        // Import was cancelled
        return;
      }
      setError(err instanceof Error ? err.message : 'Błąd parsowania pliku');
    }
  }, [importProfiles]);

  const handleSheetSelect = useCallback(() => {
    if (selectedFile && selectedSheet) {
      parseFile(selectedFile, selectedSheet, headerRow);
    }
  }, [selectedFile, selectedSheet, headerRow, parseFile]);

  const handleProcessData = useCallback(async () => {
    if (!parsedData || !isAdmin) return;
    
    const validation = validateFieldMapping(mapping);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }
    
    setCurrentStep('processing');
    setError(null);
    abortControllerRef.current = new AbortController();
    
    try {
      const result = await processImportData(
        parsedData.headers,
        parsedData.rows,
        { mapping, transformations },
        setProgress,
        abortControllerRef.current.signal
      );
      
      setProgress({
        stage: 'complete',
        progress: 100,
        processedRows: result.parsedOK,
        totalRows: result.total,
        errors: result.errors,
        canCancel: false
      });
      // Jeśli są błędy, nie zamykaj od razu – pokaż podsumowanie i umożliw pobranie raportu
      if (result.errors && result.errors.length > 0) {
        setFinalResult(result);
        setCurrentStep('summary');
      } else {
        onComplete(result.operations);
        setCurrentStep('complete');
      }
      
    } catch (err) {
      if (err instanceof Error && err.message.includes('anulowany')) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Błąd przetwarzania danych');
    }
  }, [parsedData, mapping, transformations, isAdmin, onComplete]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleForceDemoData = useCallback(() => {
    // Generate comprehensive demo data immediately
    const demoOps = [];
    const machines = ['Maszyna-A1', 'Maszyna-A2', 'Maszyna-B1', 'Maszyna-B2', 'Maszyna-C1', 'Centrum-CNC-01', 'Centrum-CNC-02'];
    const orders = ['ZL-2025-001', 'ZL-2025-002', 'ZL-2025-003', 'ZL-2025-004', 'ZL-2025-005', 'ZL-2025-006', 'ZL-2025-007', 'ZL-2025-008'];
    const parts = ['P001-A', 'P002-B', 'P003-C', 'P004-D', 'P005-E', 'P006-F', 'P007-G', 'P008-H'];
    
    let idCounter = 1;
    const baseDate = new Date();
    
    orders.forEach((orderNo, orderIndex) => {
      const operationsCount = 2 + Math.floor(Math.random() * 4); // 2-5 operations per order
      let currentTime = new Date(baseDate.getTime() + orderIndex * 3 * 60 * 60 * 1000); // Stagger orders by 3 hours
      
      for (let opIndex = 0; opIndex < operationsCount; opIndex++) {
        const machine = machines[Math.floor(Math.random() * machines.length)];
        const duration = 0.5 + Math.random() * 3; // 0.5-3.5 hours
        const startTime = new Date(currentTime);
        const endTime = new Date(currentTime.getTime() + duration * 60 * 60 * 1000);
        
        demoOps.push({
          id: (idCounter++).toString(),
          orderNo,
          resource: machine,
          startTime,
          endTime,
          opNo: ((opIndex + 1) * 10).toString(),
          partNo: parts[orderIndex],
          qty: 5 + Math.floor(Math.random() * 95),
          sequence: opIndex + 1,
          operationId: `OP-${orderNo}-${(opIndex + 1) * 10}`,
          notes: opIndex === 0 ? 'Operacja początkowa' : opIndex === operationsCount - 1 ? 'Operacja końcowa' : undefined
        });
        
        // Add gap between operations
        currentTime = new Date(endTime.getTime() + (0.25 + Math.random() * 1.5) * 60 * 60 * 1000);
      }
    });
    
    // Add some additional random operations for variety
    for (let i = 0; i < 20; i++) {
      const machine = machines[Math.floor(Math.random() * machines.length)];
      const orderNo = `ZL-2025-${String(100 + i).padStart(3, '0')}`;
      const startTime = new Date(baseDate.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000); // Random time in next 14 days
      const duration = 0.25 + Math.random() * 2; // 0.25-2.25 hours
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
      
      demoOps.push({
        id: (idCounter++).toString(),
        orderNo,
        resource: machine,
        startTime,
        endTime,
        opNo: '10',
        partNo: `P${String(i + 100).padStart(3, '0')}`,
        qty: 1 + Math.floor(Math.random() * 49),
        sequence: 1,
        operationId: `OP-${orderNo}-10`
      });
    }
    
    // Complete the import with demo data
    setProgress({
      stage: 'complete',
      progress: 100,
      processedRows: demoOps.length,
      totalRows: demoOps.length,
      errors: [],
      canCancel: false
    });
    
    onComplete(demoOps);
    setCurrentStep('complete');
  }, [onComplete]);

  const saveProfile = useCallback(() => {
    if (!parsedData) return;
    
    const profileName = prompt('Nazwa profilu mapowania:');
    if (!profileName) return;
    
    const profile: ImportProfile = {
      id: Date.now().toString(),
      name: profileName,
      isDefault: false,
      mapping,
      transformations,
      createdAt: new Date(),
      headerHash: generateHeaderHash(parsedData.headers)
    };
    
    addImportProfile(profile);
  }, [parsedData, mapping, transformations, addImportProfile]);

  const renderFileSelect = () => (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Wybierz plik do importu
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          CSV, XLSX lub XLSM (maksymalnie 50 000 wierszy)
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xlsm"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
          id="file-input"
          disabled={!isAdmin}
        />
        <label 
          htmlFor="file-input"
          className={`
            inline-flex items-center justify-center rounded-md font-medium transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            px-4 py-2 text-sm cursor-pointer
            ${!isAdmin 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {!isAdmin ? 'Dostęp tylko dla Admina' : 'Wybierz plik'}
        </label>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderSheetSelect = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Wybierz arkusz i wiersz nagłówka
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Arkusz
            </label>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
            >
              {fileInfo?.sheets?.map((sheet: string) => (
                <option key={sheet} value={sheet}>{sheet}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wiersz nagłówka
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={headerRow}
              onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setCurrentStep('file-select')}>
          Wstecz
        </Button>
        <Button onClick={handleSheetSelect}>
          Dalej
        </Button>
      </div>
    </div>
  );

  const renderMapping = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Mapowanie kolumn
        </h3>
        <Button variant="secondary" size="sm" onClick={saveProfile}>
          Zapisz profil
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {(Object.entries(mapping) as [keyof FieldMapping, string | undefined][]).map(([field, value]) => (
          <div key={String(field)}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field === 'orderNo' && 'Numer zlecenia *'}
              {field === 'resource' && 'Zasób/Maszyna *'}
              {field === 'startTime' && 'Data rozpoczęcia *'}
              {field === 'endTime' && 'Data zakończenia *'}
              {field === 'opNo' && 'Nr operacji'}
              {field === 'partNo' && 'Nr partii'}
              {field === 'productName' && 'Product'}
              {field === 'qty' && 'Ilość'}
              {field === 'operationId' && 'ID operacji'}
              {field === 'sequence' && 'Kolejność'}
              {field === 'notes' && 'Uwagi'}
            </label>
            <select
              value={value ?? ''}
              onChange={(e) => setMapping((prev: FieldMapping) => ({ ...prev, [field]: e.target.value } as FieldMapping))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
            >
              <option value="">-- Nie mapuj --</option>
              {parsedData?.headers.map((header: string) => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setCurrentStep(fileInfo?.sheets ? 'sheet-select' : 'file-select')}>
          Wstecz
        </Button>
        <Button onClick={handleProcessData} disabled={!isAdmin}>
          {!isAdmin ? 'Dostęp tylko dla Admina' : 'Przetwórz dane'}
        </Button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="space-y-6">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Przetwarzanie danych
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Etap: {progress.stage === 'reading' && 'Odczyt'}
          {progress.stage === 'parsing' && 'Parsowanie'}
          {progress.stage === 'validating' && 'Walidacja'}
          {progress.stage === 'saving' && 'Zapisywanie'}
        </p>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Postęp</span>
          <span>{Math.round(progress.progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Przetworzono: {progress.processedRows}</span>
          <span>Razem: {progress.totalRows}</span>
        </div>
      </div>
      
      {progress.errors.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
            Problemy ({progress.errors.length})
          </h4>
          <div className="mb-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAllErrors(v => !v)}>
              {showAllErrors ? 'Pokaż mniej' : 'Pokaż wszystkie'}
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded border border-amber-200 dark:border-amber-800 bg-white/40 dark:bg-black/20 p-2">
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              {(showAllErrors ? progress.errors : progress.errors.slice(0, 5)).map((errMsg: string, idx: number) => (
                <li key={idx}>• {errMsg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Advanced diagnostics panel */}
      {progress.diagnostics && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
            Diagnostyka wydajności
          </h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-blue-700 dark:text-blue-300">
                <strong>Poprawne operacje:</strong> {progress.diagnostics.validOperations}
              </div>
              <div className="text-blue-700 dark:text-blue-300">
                <strong>Pominięte wiersze:</strong> {progress.diagnostics.skippedRows}
              </div>
              <div className="text-blue-700 dark:text-blue-300">
                <strong>Normalizacje dat:</strong> {progress.diagnostics.dateNormalizations}
              </div>
            </div>
            
            <div>
              <div className="text-blue-700 dark:text-blue-300">
                <strong>Śr. czas/wiersz:</strong> {progress.diagnostics.avgProcessingTime.toFixed(2)}ms
              </div>
              <div className="text-blue-700 dark:text-blue-300">
                <strong>Najwolniejszy wiersz:</strong> #{progress.diagnostics.slowestRow}
              </div>
              {progress.diagnostics.memoryUsage && (
                <div className="text-blue-700 dark:text-blue-300">
                  <strong>Pamięć:</strong> {(progress.diagnostics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                </div>
              )}
            </div>
          </div>
          
          {/* Error breakdown */}
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">Podział błędów:</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>Brak pól: {progress.diagnostics.errorBreakdown.missingFields}</div>
              <div>Błędy dat: {progress.diagnostics.errorBreakdown.dateParsingErrors}</div>
              <div>Duplikaty: {progress.diagnostics.errorBreakdown.duplicates}</div>
            </div>
          </div>
        </div>
      )}
      
      {progress.canCancel && (
        <div className="text-center">
          <Button variant="danger" onClick={handleCancel}>
            Anuluj
          </Button>
        </div>
      )}
      
      {/* Emergency fallback - force demo data */}
      {progress.stage === 'validating' && progress.progress >= 100 && (
        <div className="text-center mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="space-y-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Import utknął na 100%? Sprawdź diagnostykę powyżej lub wymuś demo:
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={handleForceDemoData}>
                Wymuś załadowanie demo
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  console.log('Current progress state:', progress);
                  console.log('Diagnostics:', progress.diagnostics);
                }}
              >
                Pokaż szczegóły w konsoli
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-6 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Import zakończony pomyślnie
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Przetworzono {progress.processedRows} z {progress.totalRows} wierszy
        </p>
      </div>
      
      <div className="flex justify-center">
        <Button onClick={handleClose}>
          Zamknij
        </Button>
      </div>
    </div>
  );

  const downloadReport = useCallback(() => {
    if (!finalResult) return;
    const payload = {
      meta: {
        generatedAt: new Date().toISOString(),
        fileName: selectedFile?.name,
        headers: parsedData?.headers,
      },
      summary: {
        total: finalResult.total,
        parsedOK: finalResult.parsedOK,
        skippedMissing: finalResult.skippedMissing,
        skippedDateError: finalResult.skippedDateError,
        skippedEndBeforeStart: finalResult.skippedEndBeforeStart,
        errorsCount: finalResult.errors.length,
      },
      errors: finalResult.errors,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raport-bledow-importu.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [finalResult, parsedData?.headers, selectedFile?.name]);

  const renderSummary = () => (
    <div className="space-y-6">
      <div className="text-center">
        <AlertCircle className="h-14 w-14 text-amber-500 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Import zakończony z problemami
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Poprawne wiersze: {finalResult?.parsedOK ?? 0} / {finalResult?.total ?? progress.totalRows}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <div><strong>Łącznie:</strong> {finalResult?.total}</div>
          <div><strong>Poprawne:</strong> {finalResult?.parsedOK}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <div><strong>Braki pól:</strong> {finalResult?.skippedMissing}</div>
          <div><strong>Błędy dat:</strong> {finalResult?.skippedDateError}</div>
          <div><strong>End ≤ Start:</strong> {finalResult?.skippedEndBeforeStart}</div>
        </div>
      </div>

      {progress.errors.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              Lista błędów ({finalResult?.errors.length ?? progress.errors.length})
            </h4>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAllErrors(v => !v)}>
                {showAllErrors ? 'Pokaż mniej' : 'Pokaż wszystkie'}
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadReport}>
                Pobierz raport
              </Button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded border border-amber-200 dark:border-amber-800 bg-white/40 dark:bg-black/20 p-2 text-sm">
            <ul className="space-y-1 text-amber-700 dark:text-amber-300">
              {(showAllErrors ? (finalResult?.errors || progress.errors) : (finalResult?.errors || progress.errors).slice(0, 20)).map((msg: string, idx: number) => (
                <li key={idx}>• {msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={handleClose}>Zamknij</Button>
        {finalResult && finalResult.parsedOK > 0 && (
          <Button onClick={() => onComplete(finalResult.operations)}>
            Załaduj poprawne rekordy
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Import danych produkcyjnych" 
      size="lg"
    >
      {currentStep === 'file-select' && renderFileSelect()}
      {currentStep === 'sheet-select' && renderSheetSelect()}
      {currentStep === 'mapping' && renderMapping()}
      {currentStep === 'processing' && renderProcessing()}
  {currentStep === 'summary' && renderSummary()}
      {currentStep === 'complete' && renderComplete()}
    </Modal>
  );
}