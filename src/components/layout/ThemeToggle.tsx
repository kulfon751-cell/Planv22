'use client';

import React, { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/app-store';

export function ThemeToggle() {
  const { settings, updateSettings } = useAppStore();

  // Zastosuj motyw do dokumentu
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const toggleTheme = () => {
    updateSettings({ 
      theme: settings.theme === 'dark' ? 'light' : 'dark' 
    });
  };

  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={toggleTheme}
      className="flex items-center gap-2"
      title={`Przełącz na ${settings.theme === 'dark' ? 'jasny' : 'ciemny'} motyw`}
    >
      {settings.theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}