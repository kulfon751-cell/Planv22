'use client';

import React from 'react';
import { BarChart3, Home } from 'lucide-react';
import { AuthButton } from '@/components/auth/AuthButton';
import { ThemeToggle } from './ThemeToggle';
import { useRouter, usePathname } from 'next/navigation';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              PM — Plan Produkcji
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              System zarządzania harmonogramem produkcji
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Left nav link 'Dashboard' removed to avoid duplicate with right-side button */}
            <a
              href="/control"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Zarządzanie i kontrola produkcji
            </a>
            <a 
              href="/#funkcje" 
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Funkcje
            </a>
            <a 
              href="/#jak-to-dziala" 
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Jak to działa
            </a>
            <a 
              href="/#zrzuty-ekranu" 
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Zrzuty ekranu
            </a>
            <a 
              href="/#faq" 
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            {!isHomePage && (
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <Home className="h-4 w-4" />
                Strona główna
              </button>
            )}
            {/* Open Planner button (kept on right side) */}
            {pathname !== '/planner' && (
              <button
                onClick={() => router.push('/planner')}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Otwórz Planner
              </button>
            )}
            {/* Control button: Zarządzanie i kontrola produkcji */}
            {pathname !== '/control' && (
              <button
                onClick={() => router.push('/control')}
                className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                Zarządzanie i kontrola produkcji
              </button>
            )}
            {pathname !== '/dashboard' && (
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Dashboard
              </button>
            )}
          </div>

          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}