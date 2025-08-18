'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Filter } from 'lucide-react';
import { DashboardFilters, FilterOptions } from '@/hooks/useDashboardData';

interface FilterPanelProps {
  filters: DashboardFilters;
  availableOptions: FilterOptions;
  onChange: (filters: DashboardFilters) => void;
}

export function FilterPanel({ filters, availableOptions, onChange }: FilterPanelProps) {
  const [searchQueries, setSearchQueries] = useState({
    resources: '',
    departments: '',
    months: '',
    weeks: ''
  });

  const handleFilterToggle = (
    category: keyof Omit<DashboardFilters, 'granularity'>,
    value: string
  ) => {
    const currentValues = filters[category] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onChange({
      ...filters,
      [category]: newValues
    });
  };

  const FilterSection = ({ 
    title, 
    category, 
    items, 
    searchKey 
  }: {
    title: string;
    category: keyof Omit<DashboardFilters, 'granularity'>;
    items: any[];
    searchKey: keyof typeof searchQueries;
  }) => {
    const searchQuery = searchQueries[searchKey].toLowerCase();
    const filteredItems = items.filter(item => 
      (typeof item === 'string' ? item : item.name)
        .toLowerCase()
        .includes(searchQuery)
    );

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h4>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {(filters[category] as string[]).length}/{items.length}
          </span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Szukaj ${title.toLowerCase()}...`}
            value={searchQueries[searchKey]}
            onChange={(e) => setSearchQueries(prev => ({
              ...prev,
              [searchKey]: e.target.value
            }))}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          />
        </div>
        
        {/* Items */}
        <div className="max-h-40 overflow-y-auto space-y-1">
          {filteredItems.map((item, index) => {
            const value = typeof item === 'string' ? item : item.id;
            const label = typeof item === 'string' ? item : item.name;
            const isSelected = (filters[category] as string[]).includes(value);
            
            return (
              <motion.button
                key={value}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleFilterToggle(category, value)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{label}</span>
                  {isSelected && (
                    <X className="h-3 w-3 ml-2 flex-shrink-0" />
                  )}
                </div>
                {typeof item === 'object' && item.department && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.department}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Filtry
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FilterSection
            title="Działy"
            category="departments"
            items={availableOptions.departments}
            searchKey="departments"
          />
          
          <FilterSection
            title="Urządzenia"
            category="resources"
            items={availableOptions.resources}
            searchKey="resources"
          />
          
          {filters.granularity === 'month' && (
            <FilterSection
              title="Miesiące"
              category="months"
              items={availableOptions.months}
              searchKey="months"
            />
          )}
          
          {filters.granularity === 'week' && (
            <FilterSection
              title="Tygodnie"
              category="weeks"
              items={availableOptions.weeks}
              searchKey="weeks"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}