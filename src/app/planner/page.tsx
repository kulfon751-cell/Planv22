'use client';

import React, { useState, useCallback } from 'react';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { GanttGrid } from '@/components/gantt/GanttGrid';
import { ImportWizard } from '@/components/import/ImportWizard';
import { useAppStore } from '@/store/app-store';
import { exportGanttAsPNG, exportGanttAsPDF, exportOperationsAsCSV, generateExportFilename } from '@/lib/export/export-utils';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export default function PlannerPage() {
  const { operations, setOperations, clearOperations, setError, viewState, updateViewState, userRole } = useAppStore();
  const [showImportWizard, setShowImportWizard] = useState(false);

  const handleImport = useCallback(() => {
    if (userRole !== 'admin') {
      setError('Dostęp tylko dla administratora');
      return;
    }
    setShowImportWizard(true);
  }, [userRole, setError]);

  const handleImportComplete = useCallback((newOperations: any[]) => {
    setOperations(newOperations);
    setShowImportWizard(false);
    
    // Auto-fit view to imported data
    if (newOperations.length > 0) {
      const startTimes = newOperations.map(op => op.startTime.getTime());
      const endTimes = newOperations.map(op => op.endTime.getTime());
      
      const dataStart = new Date(Math.min(...startTimes));
      const dataEnd = new Date(Math.max(...endTimes));
      
      // Add 10% padding
      const totalMs = dataEnd.getTime() - dataStart.getTime();
      const padding = Math.max(totalMs * 0.1, 30 * 60 * 1000); // Minimum 30 minutes
      
      const paddedStart = new Date(dataStart.getTime() - padding);
      const paddedEnd = new Date(dataEnd.getTime() + padding);

      updateViewState({
        startTime: paddedStart,
        endTime: paddedEnd,
        selectedOrderIds: [],
        resourceFilters: [],
        partNoFilters: [],
        opNoFilters: []
      });
    }
    
    // Show success message
    const successMsg = `Załadowano ${newOperations.length} operacji`;
    setError(null);
    
    // Temporary success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = successMsg;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }, [setOperations, updateViewState, setError]);

  const handleLoadDemo = useCallback(() => {
    if (userRole !== 'admin') {
      setError('Dostęp tylko dla administratora');
      return;
    }

    // Generate comprehensive demo data
    const demoOps = [];
    const machines = ['Maszyna-A1', 'Maszyna-A2', 'Maszyna-B1', 'Maszyna-B2', 'Maszyna-C1', 'Centrum-CNC-01', 'Centrum-CNC-02'];
    const orders = ['ZL-2025-001', 'ZL-2025-002', 'ZL-2025-003', 'ZL-2025-004', 'ZL-2025-005'];
    const parts = ['P001-A', 'P002-B', 'P003-C', 'P004-D', 'P005-E'];
    
    let idCounter = 1;
    const baseDate = new Date();
    
    orders.forEach((orderNo, orderIndex) => {
      const operationsCount = 3 + Math.floor(Math.random() * 4); // 3-6 operations per order
      let currentTime = new Date(baseDate.getTime() + orderIndex * 2 * 60 * 60 * 1000); // Stagger orders by 2 hours
      
      for (let opIndex = 0; opIndex < operationsCount; opIndex++) {
        const machine = machines[Math.floor(Math.random() * machines.length)];
        const duration = 1 + Math.random() * 4; // 1-5 hours
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
          qty: 10 + Math.floor(Math.random() * 90),
          sequence: opIndex + 1,
          operationId: `OP-${orderNo}-${(opIndex + 1) * 10}`,
          notes: opIndex === 0 ? 'Operacja początkowa' : opIndex === operationsCount - 1 ? 'Operacja końcowa' : undefined
        });
        
        // Add some gap between operations
        currentTime = new Date(endTime.getTime() + (0.5 + Math.random() * 2) * 60 * 60 * 1000);
      }
    });
    
    // Add some overlapping operations for different orders on same machines
    const additionalOps = [];
    for (let i = 0; i < 10; i++) {
      const machine = machines[Math.floor(Math.random() * machines.length)];
      const orderNo = `ZL-2025-${String(100 + i).padStart(3, '0')}`;
      const startTime = new Date(baseDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in next 7 days
      const duration = 0.5 + Math.random() * 3; // 0.5-3.5 hours
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
      
      additionalOps.push({
        id: (idCounter++).toString(),
        orderNo,
        resource: machine,
        startTime,
        endTime,
        opNo: '10',
        partNo: `P${String(i + 10).padStart(3, '0')}`,
        qty: 5 + Math.floor(Math.random() * 45),
        sequence: 1,
        operationId: `OP-${orderNo}-10`
      });
    }
    
    const allOps = [...demoOps, ...additionalOps];
    setOperations(allOps);
    
    // Set view to show demo data
    const startTimes = allOps.map(op => op.startTime.getTime());
    const endTimes = allOps.map(op => op.endTime.getTime());
    
    const dataStart = new Date(Math.min(...startTimes));
    const dataEnd = new Date(Math.max(...endTimes));
    
    updateViewState({
      startTime: startOfDay(dataStart),
      endTime: endOfDay(dataEnd),
      pixelsPerHour: 60,
      selectedOrderIds: [],
      resourceFilters: [],
      partNoFilters: [],
      opNoFilters: []
    });
    
    setError(null);
  }, [userRole, setOperations, updateViewState, setError]);

  const handleExport = useCallback(async (format: 'png' | 'pdf' | 'csv') => {
    if (operations.length === 0) {
      setError('Brak danych do eksportu');
      return;
    }

    try {
      const filename = generateExportFilename(format, viewState, viewState.selectedOrderIds);
      
      if (format === 'csv') {
        exportOperationsAsCSV(operations, filename, viewState);
      } else {
        const ganttElement = document.querySelector('.gantt-container') as HTMLElement;
        if (!ganttElement) {
          setError('Nie znaleziono elementu Gantta do eksportu');
          return;
        }
        
        if (format === 'png') {
          await exportGanttAsPNG('gantt-container', filename);
        } else if (format === 'pdf') {
          await exportGanttAsPDF('gantt-container', filename);
        }
      }
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      notification.textContent = `Eksport ${format.toUpperCase()} zakończony pomyślnie`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : `Błąd eksportu ${format.toUpperCase()}`);
    }
  }, [operations, viewState, setError]);

  const handleClearData = useCallback(() => {
    if (userRole !== 'admin') {
      setError('Dostęp tylko dla administratora');
      return;
    }
    
    if (confirm('Czy na pewno chcesz wyczyścić wszystkie dane?')) {
      clearOperations();
      updateViewState({
        selectedOrderIds: [],
        resourceFilters: [],
        partNoFilters: [],
        opNoFilters: []
      });
    }
  }, [userRole, clearOperations, updateViewState, setError]);

  return (
    <div className="flex-1 flex flex-col">
      <Toolbar
        onImport={handleImport}
        onLoadDemo={handleLoadDemo}
        onExport={handleExport}
        onClearData={handleClearData}
      />
      
      <div className="flex-1 flex" id="gantt-container">
        {operations.length > 0 ? (
          <GanttGrid />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">📊</div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Brak danych do wyświetlenia
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Załaduj dane CSV/XLSX lub użyj danych demonstracyjnych, aby rozpocząć planowanie produkcji
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleImport}
                  disabled={userRole !== 'admin'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {userRole === 'admin' ? 'Załaduj dane' : 'Dostęp tylko dla Admina'}
                </button>
                <button
                  onClick={handleLoadDemo}
                  disabled={userRole !== 'admin'}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Demo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onComplete={handleImportComplete}
      />
    </div>
  );
}