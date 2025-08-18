import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
}

export function ImportModal({ isOpen, onClose, onFileSelect }: ImportModalProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && isValidFileType(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFileType(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    return validTypes.includes(file.type) || 
           file.name.toLowerCase().endsWith('.csv') ||
           file.name.toLowerCase().endsWith('.xlsx') ||
           file.name.toLowerCase().endsWith('.xlsm');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import danych produkcyjnych" size="lg">
      <div className="space-y-6">
        {/* File drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }
          `}
        >
          <div className="flex flex-col items-center space-y-4">
            <Upload className="h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Przeciągnij i upuść plik tutaj
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                lub kliknij, aby wybrać plik
              </p>
            </div>
            
            <input
              type="file"
              accept=".csv,.xlsx,.xlsm"
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="inline-block">
              <Button type="button" className="cursor-pointer">
                Wybierz plik
              </Button>
            </label>
          </div>
        </div>

        {/* Supported formats */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Obsługiwane formaty
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                <li>• CSV - pliki tekstowe z separatorami</li>
                <li>• XLSX - arkusze kalkulacyjne Excel</li>
                <li>• XLSM - arkusze Excel z makrami</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Wymagane kolumny
              </h4>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                <li>• <strong>Numer zlecenia</strong> - identyfikator operacji</li>
                <li>• <strong>Zasób/Maszyna</strong> - nazwa stanowiska pracy</li>
                <li>• <strong>Data rozpoczęcia</strong> - planowany start</li>
                <li>• <strong>Data zakończenia</strong> - planowany koniec</li>
              </ul>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                System automatycznie rozpozna polskie i angielskie nazwy kolumn.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
        </div>
      </div>
    </Modal>
  );
}