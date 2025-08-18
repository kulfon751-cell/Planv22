import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductionOperation, ViewState, UserRole, AppSettings, ImportProfile, ViewPreset } from '@/lib/types';
import { startOfDay, endOfDay, addDays } from 'date-fns';

interface AppState {
  // Authentication
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  
  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Data
  operations: ProductionOperation[];
  setOperations: (operations: ProductionOperation[]) => void;
  addOperations: (operations: ProductionOperation[]) => void;
  updateOperation: (id: string, updates: Partial<ProductionOperation>) => void;
  removeOperation: (id: string) => void;
  clearOperations: () => void;
  
  // View state
  viewState: ViewState;
  updateViewState: (updates: Partial<ViewState>) => void;
  setResourceOrder: (order: string[]) => void;
  resetViewState: () => void;
  
  // View presets
  viewPresets: ViewPreset[];
  addViewPreset: (preset: ViewPreset) => void;
  updateViewPreset: (id: string, preset: Partial<ViewPreset>) => void;
  deleteViewPreset: (id: string) => void;
  applyViewPreset: (id: string) => void;
  
  // Import profiles
  importProfiles: ImportProfile[];
  addImportProfile: (profile: ImportProfile) => void;
  updateImportProfile: (id: string, profile: Partial<ImportProfile>) => void;
  deleteImportProfile: (id: string) => void;
  getDefaultImportProfile: () => ImportProfile | null;
  setDefaultImportProfile: (id: string) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  
  // Statistics
  getStatistics: () => {
    totalOperations: number;
    uniqueOrders: number;
    uniqueResources: number;
    dateRange: { start: Date; end: Date } | null;
    averageDuration: number;
  };
}

const defaultViewState: ViewState = {
  startTime: startOfDay(addDays(new Date(), -30)),
  endTime: endOfDay(addDays(new Date(), 30)),
  pixelsPerHour: 60,
  selectedOrderIds: [],
  searchQuery: '',
  resourceFilters: [],
  resourceOrder: [],
  partNoFilters: [],
  opNoFilters: []
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Authentication
      userRole: 'production',
      setUserRole: (role) => set({ userRole: role }),
      
      // Settings
      settings: {
        theme: 'dark',
        language: 'pl',
        timezone: 'Europe/Warsaw',
        autoFitPadding: 30
      },
      updateSettings: (updates) => set(state => ({
        settings: { ...state.settings, ...updates }
      })),
      
      // Data
      operations: [],
      setOperations: (operations) => set({ operations }),
      addOperations: (newOperations) => set(state => ({
        operations: [...state.operations, ...newOperations]
      })),
      updateOperation: (id, updates) => set(state => ({
        operations: state.operations.map(op => 
          op.id === id ? { ...op, ...updates } : op
        )
      })),
      removeOperation: (id) => set(state => ({
        operations: state.operations.filter(op => op.id !== id)
      })),
      clearOperations: () => set({ operations: [] }),
      
      // View state  
      viewState: defaultViewState,
      updateViewState: (updates) => set(state => ({
        viewState: { ...state.viewState, ...updates }
      })),
      setResourceOrder: (order) => set(state => ({
        viewState: { ...state.viewState, resourceOrder: order }
      })),
      resetViewState: () => set({ viewState: defaultViewState }),
      
      // View presets
      viewPresets: [],
      addViewPreset: (preset) => set(state => ({
        viewPresets: [...state.viewPresets, preset]
      })),
      updateViewPreset: (id, updates) => set(state => ({
        viewPresets: state.viewPresets.map(p => 
          p.id === id ? { ...p, ...updates } : p
        )
      })),
      deleteViewPreset: (id) => set(state => ({
        viewPresets: state.viewPresets.filter(p => p.id !== id)
      })),
      applyViewPreset: (id) => {
        const preset = get().viewPresets.find(p => p.id === id);
        if (preset) {
          set(state => ({
            viewState: { ...state.viewState, ...preset.viewState }
          }));
        }
      },
      
      // Import profiles
      importProfiles: [],
      addImportProfile: (profile) => set(state => ({
        importProfiles: [...state.importProfiles, profile]
      })),
      updateImportProfile: (id, updates) => set(state => ({
        importProfiles: state.importProfiles.map(p => 
          p.id === id ? { ...p, ...updates } : p
        )
      })),
      deleteImportProfile: (id) => set(state => ({
        importProfiles: state.importProfiles.filter(p => p.id !== id)
      })),
      getDefaultImportProfile: () => {
        return get().importProfiles.find(p => p.isDefault) || null;
      },
      setDefaultImportProfile: (id) => set(state => ({
        importProfiles: state.importProfiles.map(p => ({
          ...p,
          isDefault: p.id === id
        }))
      })),
      
      // Loading states
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      
      // Error handling
      error: null,
      setError: (error) => set({ error }),
      
      // Statistics
      getStatistics: () => {
        const { operations } = get();
        
        if (operations.length === 0) {
          return {
            totalOperations: 0,
            uniqueOrders: 0,
            uniqueResources: 0,
            dateRange: null,
            averageDuration: 0
          };
        }
        
        const uniqueOrders = new Set(operations.map(op => op.orderNo)).size;
        const uniqueResources = new Set(operations.map(op => op.resource)).size;
        
        const startTimes = operations.map(op => op.startTime.getTime());
        const endTimes = operations.map(op => op.endTime.getTime());
        const dateRange = {
          start: new Date(Math.min(...startTimes)),
          end: new Date(Math.max(...endTimes))
        };
        
        const totalDuration = operations.reduce((sum, op) => 
          sum + (op.endTime.getTime() - op.startTime.getTime()), 0
        );
        const averageDuration = totalDuration / operations.length / (1000 * 60 * 60); // hours
        
        return {
          totalOperations: operations.length,
          uniqueOrders,
          uniqueResources,
          dateRange,
          averageDuration
        };
      }
    }),
    {
      name: 'production-plan-store',
      partialize: (state) => ({
        settings: state.settings,
        importProfiles: state.importProfiles,
        viewPresets: state.viewPresets,
        userRole: state.userRole
      })
    }
  )
);