import type { Metadata } from 'next';
import './globals.css';
import { Header } from '../components/layout/Header';

export const metadata: Metadata = {
  title: 'PM — Plan Produkcji (portable .exe)',
  description: 'Profesjonalny harmonogram produkcji z Ganttem, importem CSV/XLSX (50 000+), diagnostyką i rolami Admin/Produkcja. Działa offline jako portable .exe.',
  openGraph: {
    title: 'PM — Plan Produkcji',
    description: 'Profesjonalny harmonogram produkcji z Ganttem, importem CSV/XLSX (50 000+), diagnostyką i rolami Admin/Produkcja. Działa offline jako portable .exe.',
    type: 'website',
    locale: 'pl_PL',
  },
};
import { ServerStatusBar } from '../components/admin/ServerStatusBar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning className="dark">
      <body className={`min-h-screen bg-gray-50 dark:bg-gray-900`}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col">
            {children}
            <ServerStatusBar />
          </main>
        </div>
      </body>
    </html>
  );
}