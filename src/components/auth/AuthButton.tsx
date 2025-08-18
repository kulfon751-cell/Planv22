'use client';

import React, { useState } from 'react';
import { LogIn, LogOut, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/app-store';

interface LoginFormProps {
  onLogin: (login: string, password: string) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

function LoginForm({ onLogin, isLoading, error }: LoginFormProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(login, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="login" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Login
        </label>
        <input
          type="text"
          id="login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          required
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Hasło
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          required
        />
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Logowanie...' : 'Zaloguj jako Admin'}
      </Button>
    </form>
  );
}

export function AuthButton() {
  const { userRole, setUserRole, setError } = useAppStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>();

  const handleLogin = async (login: string, password: string) => {
    setIsLoading(true);
    setLoginError(undefined);
    
    try {
      // Sprawdź dane logowania bezpośrednio w komponencie
      if (login === 'Admin' && password === 'Admin1234') {
        setUserRole('admin');
        setShowLoginModal(false);
        setLoginError(undefined);
      } else {
        throw new Error('Nieprawidłowe dane logowania');
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Błąd logowania');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setUserRole('production');
  };

  return (
    <div className="flex items-center gap-3">
      {/* Role badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
        {userRole === 'admin' ? (
          <>
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Admin</span>
          </>
        ) : (
          <>
            <User className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Produkcja</span>
          </>
        )}
      </div>

      {/* Login/Logout button */}
      {userRole === 'admin' ? (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </Button>
      ) : (
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => setShowLoginModal(true)}
          className="flex items-center gap-2"
        >
          <LogIn className="h-4 w-4" />
          Zaloguj jako Admin
        </Button>
      )}

      {/* Login modal */}
      <Modal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Logowanie administratora"
      >
        <LoginForm 
          onLogin={handleLogin}
          isLoading={isLoading}
          error={loginError}
        />
      </Modal>
    </div>
  );
}