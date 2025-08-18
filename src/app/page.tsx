'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  BarChart3, 
  Upload, 
  Play, 
  Search, 
  Route, 
  Download, 
  Shield, 
  FileText,
  Zap,
  Target,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Calendar,
  Settings,
  Eye,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ImportWizard } from '@/components/import/ImportWizard';
import { useAppStore } from '@/store/app-store';
import { addDays, startOfDay, endOfDay } from 'date-fns';

// Animated counter component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setCount(value);
      return;
    }

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration, shouldReduceMotion]);

  return <span>{count.toLocaleString('pl-PL')}</span>;
}

// Mini Gantt animation component
function MiniGantt() {
  const isElectron = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '');
  const reducedFromOS = useReducedMotion();
  const shouldReduceMotion = reducedFromOS || isElectron;
  
  const bars = [
    { id: 1, start: 10, width: 80, color: '#3B82F6', delay: 0 },
    { id: 2, start: 100, width: 120, color: '#10B981', delay: 0.5 },
    { id: 3, start: 50, width: 90, color: '#F59E0B', delay: 1 },
    { id: 4, start: 180, width: 100, color: '#EF4444', delay: 1.5 },
  ];

  return (
    <div className="relative w-full h-32 bg-gray-800 rounded-lg overflow-hidden">
      {/* Grid lines */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gray-700"
            style={{ left: `${(i + 1) * 12.5}%` }}
          />
        ))}
      </div>
      
      {/* Machine labels */}
      <div className="absolute left-2 top-2 space-y-4 text-xs text-gray-400">
        <div>Maszyna-A1</div>
        <div>Maszyna-B2</div>
        <div>CNC-01</div>
        <div>Maszyna-C1</div>
      </div>
      
      {/* Animated bars */}
      {bars.map((bar, index) => (
        <motion.div
          key={bar.id}
          className="absolute h-4 rounded text-white text-xs flex items-center px-2"
          style={{
            backgroundColor: bar.color,
            top: 8 + index * 24,
            left: 60,
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ 
            width: shouldReduceMotion ? bar.width : [0, bar.width],
            opacity: shouldReduceMotion ? 1 : [0, 1]
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 1.5,
            delay: shouldReduceMotion ? 0 : bar.delay,
            repeat: shouldReduceMotion ? 0 : Infinity,
            repeatDelay: 3,
            ease: "easeOut"
          }}
        >
          ZL-{2025 + index}
        </motion.div>
      ))}
    </div>
  );
}

// FAQ Item component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">{question}</span>
        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-6 pb-4"
        >
          <p className="text-gray-600 dark:text-gray-400">{answer}</p>
        </motion.div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { operations, setOperations, clearOperations, setError, updateViewState, userRole } = useAppStore();
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const router = useRouter();
  // Detect Electron to avoid heavy entrance animations that feel like UI lag
  const isElectron = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '');
  const reducedFromOS = useReducedMotion();
  const shouldReduceMotion = reducedFromOS || isElectron;

  const screenshots = [
    { title: 'Widok Gantta', description: 'Spójny harmonogram z sticky kolumną maszyn' },
    { title: 'Kreator importu', description: 'Mapowanie kolumn z auto-detekcją' },
    { title: 'Wyszukiwarka', description: 'Multi-select zleceń i maszyn' },
    { title: 'Marszruty', description: 'Kolorowe trasy operacji' },
    { title: 'Eksport', description: 'PNG, PDF, CSV z filtrami' }
  ];

  const features = [
    {
      icon: Upload,
      title: 'Import CSV/XLSX do 50 000 wierszy',
      description: 'Strumieniowy import z podglądem, mapowaniem kolumn i walidacją błędów'
    },
    {
      icon: BarChart3,
      title: 'Jeden, spójny Gantt',
      description: 'Sticky kolumna maszyn, zoom, auto-dopasowanie i wirtualizacja dla wydajności'
    },
    {
      icon: Search,
      title: 'Wyszukiwarka rozdzielona',
      description: 'Multi-select zleceń i maszyn z auto-dopasowaniem widoku'
    },
    {
      icon: Route,
      title: 'Marszruty i kolory',
      description: 'Kolorowe trasy zleceń z legendą i deterministycznymi kolorami'
    },
    {
      icon: Download,
      title: 'Eksport PNG/PDF/CSV',
      description: 'Eksport z uwzględnieniem aktywnych filtrów i zakresu czasu'
    },
    {
      icon: Shield,
      title: 'Role i bezpieczeństwo',
      description: 'Rozdzielenie uprawnień Admin/Produkcja z HttpOnly cookies'
    }
  ];

  const steps = [
    {
      icon: Upload,
      title: 'Wgraj plik',
      description: 'Uruchom kreator mapowania kolumn'
    },
    {
      icon: CheckCircle,
      title: 'Zweryfikuj dane',
      description: 'Popraw błędy i zaakceptuj import'
    },
    {
      icon: Target,
      title: 'Planuj na Gantcie',
      description: 'Filtruj, wyszukuj i eksportuj'
    }
  ];

  const faqItems = [
    {
      question: 'Jakie formaty plików są obsługiwane?',
      answer: 'System obsługuje CSV, XLSX i XLSM do 50 000 wierszy. Automatycznie rozpoznaje polskie i angielskie nazwy kolumn oraz różne formaty dat.'
    },
    {
      question: 'Jak działają role użytkowników?',
      answer: 'Rola "Admin" ma pełne uprawnienia (import, zmiany). Rola "Produkcja" ma dostęp tylko do podglądu. Przełączanie przez przycisk logowania.'
    },
    {
      question: 'Czy aplikacja działa offline?',
      answer: 'Tak, dostępna jest wersja portable .exe dla Windows, która działa całkowicie offline z lokalnym serwerem i automatycznym wykrywaniem portów.'
    },
    {
      question: 'Jakie formaty dat są obsługiwane?',
      answer: 'System automatycznie rozpoznaje polskie formaty: dd.MM.yyyy, dd-MM-yyyy, dd/MM/yyyy z opcjonalnym czasem HH:mm:ss. Strefa czasowa: Europe/Warsaw.'
    },
    {
      question: 'Jaka jest wydajność systemu?',
      answer: 'Optymalizacja dla 50k rekordów: TTFR ≤8s, FPS ≥55 przy przewijaniu, pamięć <300MB. Wirtualizacja i Web Workers dla strumieniowego importu.'
    }
  ];

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
    
    // Auto-fit view and redirect to planner
    if (newOperations.length > 0) {
      const startTimes = newOperations.map(op => op.startTime.getTime());
      const endTimes = newOperations.map(op => op.endTime.getTime());
      
      const dataStart = new Date(Math.min(...startTimes));
      const dataEnd = new Date(Math.max(...endTimes));
      
      const totalMs = dataEnd.getTime() - dataStart.getTime();
      const padding = Math.max(totalMs * 0.1, 30 * 60 * 1000);
      
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
    
    // Redirect to planner (no full reload)
    router.push('/planner');
  }, [setOperations, updateViewState, router]);

  const handleLoadDemo = useCallback(() => {
    // Generate demo data
    const demoOps = [];
    const machines = ['Maszyna-A1', 'Maszyna-A2', 'Maszyna-B1', 'Maszyna-B2', 'Centrum-CNC-01'];
    const orders = ['ZL-2025-001', 'ZL-2025-002', 'ZL-2025-003', 'ZL-2025-004', 'ZL-2025-005'];
    
    let idCounter = 1;
    const baseDate = new Date();
    
    orders.forEach((orderNo, orderIndex) => {
      const operationsCount = 3 + Math.floor(Math.random() * 3);
      let currentTime = new Date(baseDate.getTime() + orderIndex * 2 * 60 * 60 * 1000);
      
      for (let opIndex = 0; opIndex < operationsCount; opIndex++) {
        const machine = machines[Math.floor(Math.random() * machines.length)];
        const duration = 1 + Math.random() * 4;
        const startTime = new Date(currentTime);
        const endTime = new Date(currentTime.getTime() + duration * 60 * 60 * 1000);
        
        demoOps.push({
          id: (idCounter++).toString(),
          orderNo,
          resource: machine,
          startTime,
          endTime,
          opNo: ((opIndex + 1) * 10).toString(),
          partNo: `P${String(orderIndex + 1).padStart(3, '0')}-${String.fromCharCode(65 + opIndex)}`,
          qty: 10 + Math.floor(Math.random() * 90),
          sequence: opIndex + 1,
          operationId: `OP-${orderNo}-${(opIndex + 1) * 10}`
        });
        
        currentTime = new Date(endTime.getTime() + (0.5 + Math.random() * 2) * 60 * 60 * 1000);
      }
    });
    
    setOperations(demoOps);
    
    // Set view to show demo data
    const startTimes = demoOps.map(op => op.startTime.getTime());
    const endTimes = demoOps.map(op => op.endTime.getTime());
    
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
    
    // Redirect to planner (client navigation)
    router.push('/planner');
  }, [setOperations, updateViewState, router]);

  // Calculate live metrics
  const metrics = {
    orders: new Set(operations.map(op => op.orderNo)).size,
    machines: new Set(operations.map(op => op.resource)).size,
    operations: operations.length,
    timeSpan: operations.length > 0 ? Math.ceil(
      (Math.max(...operations.map(op => op.endTime.getTime())) - 
       Math.min(...operations.map(op => op.startTime.getTime()))) / (1000 * 60 * 60 * 24)
    ) : 0
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
  <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-gray-900 to-purple-900 text-white">
  {/* Animated background (non-interactive) */}
  <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"
            animate={shouldReduceMotion ? {} : {
              background: [
                'linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
                'linear-gradient(225deg, rgba(147, 51, 234, 0.2), rgba(59, 130, 246, 0.2))',
                'linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))'
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.6 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-blue-400">PM</span> — Plan Produkcji
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Harmonogram. Diagnostyka. Import 50 000+ rekordów. Działa jako portable .exe.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  onClick={() => router.push('/planner')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Otwórz Planner
                </Button>
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={handleImport}
                  disabled={userRole !== 'admin'}
                  title={userRole !== 'admin' ? 'Dostęp tylko dla Admina' : 'Wgraj dane CSV/XLSX'}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Wgraj dane
                </Button>
                <Button 
                  size="lg" 
                  variant="ghost"
                  onClick={handleLoadDemo}
                  className="text-white border-white hover:bg-white hover:text-gray-900"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Zobacz demo
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.6, delay: shouldReduceMotion ? 0 : 0.1 }}
              className="lg:pl-8"
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-200">Podgląd Gantta</h3>
                <MiniGantt />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funkcje" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Najważniejsze możliwości
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Profesjonalne narzędzie do planowania produkcji
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: shouldReduceMotion ? 0.2 : 0.4, delay: shouldReduceMotion ? 0 : index * 0.08 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="jak-to-dziala" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Jak to działa
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Trzy proste kroki do profesjonalnego planowania
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: shouldReduceMotion ? 0.2 : 0.4, delay: shouldReduceMotion ? 0 : index * 0.15 }}
                className="text-center relative"
              >
                <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <step.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
                
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 h-6 w-6 text-gray-400" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Metrics Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {operations.length > 0 ? 'Metryki na żywo' : 'Przykładowe metryki'}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {operations.length > 0 ? 'Aktualne dane z załadowanego planu' : 'Dane po załadowaniu pliku'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.4 }}
              className="text-center bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6"
            >
              <div className="text-4xl font-bold text-blue-600 mb-2">
                <AnimatedCounter value={operations.length > 0 ? metrics.orders : 127} />
              </div>
              <div className="text-gray-600 dark:text-gray-400">Zlecenia</div>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.4, delay: shouldReduceMotion ? 0 : 0.08 }}
              className="text-center bg-green-50 dark:bg-green-900/20 rounded-xl p-6"
            >
              <div className="text-4xl font-bold text-green-600 mb-2">
                <AnimatedCounter value={operations.length > 0 ? metrics.machines : 23} />
              </div>
              <div className="text-gray-600 dark:text-gray-400">Maszyny</div>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.4, delay: shouldReduceMotion ? 0 : 0.15 }}
              className="text-center bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6"
            >
              <div className="text-4xl font-bold text-purple-600 mb-2">
                <AnimatedCounter value={operations.length > 0 ? metrics.operations : 1847} />
              </div>
              <div className="text-gray-600 dark:text-gray-400">Operacje</div>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.4, delay: shouldReduceMotion ? 0 : 0.22 }}
              className="text-center bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6"
            >
              <div className="text-4xl font-bold text-orange-600 mb-2">
                <AnimatedCounter value={operations.length > 0 ? metrics.timeSpan : 14} />
              </div>
              <div className="text-gray-600 dark:text-gray-400">Dni</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section id="zrzuty-ekranu" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Zrzuty ekranu
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Zobacz interfejs aplikacji w akcji
            </p>
          </motion.div>

          <div className="relative">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Eye className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {screenshots[currentScreenshot].title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {screenshots[currentScreenshot].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Screenshot navigation */}
            <div className="flex justify-center mt-8 space-x-2">
              {screenshots.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentScreenshot(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentScreenshot 
                      ? 'bg-blue-600' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Często zadawane pytania
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Znajdź odpowiedzi na najważniejsze pytania
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: shouldReduceMotion ? 0.2 : 0.4, delay: shouldReduceMotion ? 0 : index * 0.08 }}
              >
                <FAQItem question={item.question} answer={item.answer} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <BarChart3 className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold">PM — Plan Produkcji</span>
            </div>
            
            <div className="flex space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Polityka prywatności</a>
              <a href="#" className="hover:text-white transition-colors">Licencja PM</a>
              <a href="#" className="hover:text-white transition-colors">Kontakt</a>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 PM - Plan Produkcji. Wszystkie prawa zastrzeżone.</p>
          </div>
        </div>
      </footer>

      {/* Import Wizard */}
      <ImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onComplete={handleImportComplete}
      />
    </div>
  );
}