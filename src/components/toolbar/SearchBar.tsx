'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Target } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/app-store';
import { getOrderColor } from '../../lib/colors';

interface SearchSuggestion {
  id: string;
  label: string;
  type: 'order' | 'resource' | 'part';
}

export function SearchBar() {
  const { operations, viewState, updateViewState } = useAppStore();

  // Dropdown states
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isResourceOpen, setIsResourceOpen] = useState(false);

  // Queries
  const [orderQuery, setOrderQuery] = useState('');
  const [resourceQuery, setResourceQuery] = useState('');

  // Suggestions
  const [orderSuggestions, setOrderSuggestions] = useState<SearchSuggestion[]>([]);
  const [resourceSuggestions, setResourceSuggestions] = useState<SearchSuggestion[]>([]);

  // Refs – osobne dla każdego pola
  const orderInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Suggestion generators ---
  const generateOrderSuggestions = useCallback((query: string) => {
    if (!query.trim()) { setOrderSuggestions([]); return; }
    const lower = query.toLowerCase();
    const orderNos = (Array.from(new Set(operations.map((op: any) => String(op.orderNo)))) as string[])
      .filter(o => o.toLowerCase().includes(lower))
      .slice(0, 10)
      .map(o => ({ id: o, label: o, type: 'order' as const }));
    setOrderSuggestions(orderNos);
  }, [operations]);

  const generateResourceSuggestions = useCallback((query: string) => {
    if (!query.trim()) { setResourceSuggestions([]); return; }
    const lower = query.toLowerCase();
    const resources = (Array.from(new Set(operations.map((op: any) => String(op.resource)))) as string[])
      .filter(r => r.toLowerCase().includes(lower))
      .slice(0, 10)
      .map(r => ({ id: r, label: r, type: 'resource' as const }));
    setResourceSuggestions(resources);
  }, [operations]);

  // --- Input handlers ---
  const handleOrderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOrderQuery(value);
    generateOrderSuggestions(value);
    setIsOrderOpen(true);
  }, [generateOrderSuggestions]);

  const handleResourceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setResourceQuery(value);
    generateResourceSuggestions(value);
    setIsResourceOpen(true);
  }, [generateResourceSuggestions]);

  // --- Selection handlers ---
  const handleOrderSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'order') {
      const next = [...viewState.selectedOrderIds];
      if (!next.includes(suggestion.id)) {
        next.push(suggestion.id);
        updateViewState({ selectedOrderIds: next });
      }
    }
    setOrderQuery('');
    setOrderSuggestions([]);
    setIsOrderOpen(false);
  }, [viewState, updateViewState]);

  const handleResourceSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'resource') {
      const next = [...viewState.resourceFilters];
      if (!next.includes(suggestion.id)) {
        next.push(suggestion.id);
        updateViewState({ resourceFilters: next });
      }
    }
    setResourceQuery('');
    setResourceSuggestions([]);
    setIsResourceOpen(false);
  }, [viewState, updateViewState]);

  // --- Paste handler (orders only) ---
  const handleOrderPaste = useCallback((e: React.ClipboardEvent) => {
    const ids = e.clipboardData.getData('text')
      .split(/[,;\s\n]+/).map(s => s.trim()).filter(Boolean);
    if (ids.length > 1) {
      e.preventDefault();
      const valid = ids.filter(id => operations.some((op: any) => op.orderNo === id));
      if (valid.length > 0) {
        const next = [...new Set([...viewState.selectedOrderIds, ...valid])];
        updateViewState({ selectedOrderIds: next });
        setOrderQuery('');
        setIsOrderOpen(false);
      }
    }
  }, [operations, viewState.selectedOrderIds, updateViewState]);

  // --- Remove / Clear ---
  const removeSelectedOrder = useCallback((orderId: string) => {
    updateViewState({ selectedOrderIds: viewState.selectedOrderIds.filter((id: string) => id !== orderId) });
  }, [viewState.selectedOrderIds, updateViewState]);

  const clearAllSelections = useCallback(() => {
    updateViewState({ selectedOrderIds: [], resourceFilters: [], partNoFilters: [], opNoFilters: [] });
  }, [updateViewState]);

  // --- View helpers ---
  const autoFitView = useCallback(() => {
    if (typeof (window as any).ganttAutoFit === 'function') (window as any).ganttAutoFit();
  }, []);

  const addAllVisibleOrders = useCallback(() => {
    const visibleOrderIds = [...new Set(operations.map((op: any) => String(op.orderNo)))];
    updateViewState({ selectedOrderIds: visibleOrderIds });
  }, [operations, updateViewState]);

  // --- Close dropdowns on outside click or Esc ---
  useEffect(() => {
    const handleOutside = (event: Event) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOrderOpen(false);
        setIsResourceOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const hasActiveFilters = true; // Dodano tymczasową wartość, należy dostosować do logiki aplikacji
  // Local UI: show/hide chips panel
  const [showChips, setShowChips] = useState(true);

  // Re-open chips panel when selections change
  useEffect(() => {
    if (viewState.selectedOrderIds.length > 0 || viewState.resourceFilters.length > 0 || viewState.partNoFilters.length > 0) {
      setShowChips(true);
    }
  }, [viewState.selectedOrderIds, viewState.resourceFilters, viewState.partNoFilters]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        {/* Orders */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={orderInputRef}
            type="text"
            value={orderQuery}
            onChange={handleOrderChange}
            onPaste={handleOrderPaste}
            placeholder="Szukaj zleceń..."
            className="pl-10 pr-4 py-2 w-64 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onFocus={() => setIsOrderOpen(true)}
          />
          {orderQuery && (
            <button
              onClick={() => { setOrderQuery(''); setOrderSuggestions([]); setIsOrderOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isOrderOpen && orderSuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {orderSuggestions.map(s => (
                <button
                  key={`order-${s.id}`}
                  onClick={() => handleOrderSelect(s)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                >
                  <span className="text-gray-900 dark:text-gray-100">{s.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Zlecenie</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={resourceInputRef}
            type="text"
            value={resourceQuery}
            onChange={handleResourceChange}
            placeholder="Szukaj maszyn..."
            className="pl-10 pr-4 py-2 w-64 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onFocus={() => setIsResourceOpen(true)}
          />
          {resourceQuery && (
            <button
              onClick={() => { setResourceQuery(''); setResourceSuggestions([]); setIsResourceOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isResourceOpen && resourceSuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {resourceSuggestions.map(s => (
                <button
                  key={`resource-${s.id}`}
                  onClick={() => handleResourceSelect(s)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                >
                  <span className="text-gray-900 dark:text-gray-100">{s.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Maszyna</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <Button
          variant="secondary"
          size="sm"
          onClick={autoFitView}
          disabled={viewState.selectedOrderIds.length === 0}
          title="Dopasuj widok do wybranych zleceń"
        >
          <Target className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={addAllVisibleOrders}
          title="Dodaj wszystkie widoczne zlecenia"
        >
          Dodaj wszystkie
        </Button>

        {hasActiveFilters && (
          <Button
            variant="danger"
            size="sm"
            onClick={clearAllSelections}
            title="Wyczyść wszystkie filtry"
          >
            Wyczyść
          </Button>
        )}
      </div>

      {/* Chips */}
      {(viewState.selectedOrderIds.length > 0 ||
        viewState.resourceFilters.length > 0 ||
        viewState.partNoFilters.length > 0) && showChips && (
        <div className="absolute top-full left-0 mt-1 w-1/2">
          <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 shadow-lg">
            <button
              aria-label="Zamknij panel wybranych"
              onClick={() => setShowChips(false)}
              className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
            {/* Orders */}
            {viewState.selectedOrderIds.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Wybrane zlecenia ({viewState.selectedOrderIds.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {viewState.selectedOrderIds.map((orderId: string) => (
                    <div
                      key={orderId}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white"
                      style={{ backgroundColor: getOrderColor(orderId) }}
                    >
                      <span>{orderId}</span>
                      <button onClick={() => removeSelectedOrder(orderId)} className="hover:bg-black hover:bg-opacity-20 rounded">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {viewState.resourceFilters.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Wybrane maszyny ({viewState.resourceFilters.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {viewState.resourceFilters.map((resource: string) => (
                    <div key={resource} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                      <span>{resource}</span>
                      <button
                        onClick={() => {
                          const newFilters = viewState.resourceFilters.filter((r: string) => r !== resource);
                          updateViewState({ resourceFilters: newFilters });
                        }}
                        className="hover:bg-gray-300 dark:hover:bg-gray-500 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parts */}
            {viewState.partNoFilters.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Wybrane partie ({viewState.partNoFilters.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {viewState.partNoFilters.map((partNo: string) => (
                    <div key={partNo} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                      <span>{partNo}</span>
                      <button
                        onClick={() => {
                          const newFilters = viewState.partNoFilters.filter((p: string) => p !== partNo);
                          updateViewState({ partNoFilters: newFilters });
                        }}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
