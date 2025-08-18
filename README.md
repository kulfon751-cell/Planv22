# Plan Produkcji - System Zarządzania Harmonogramem

Profesjonalny system planowania produkcji z widokiem Gantta, importem danych CSV/XLSX i systemem ról użytkowników.

## 🚀 Funkcjonalności

### 🔐 System Ról
- **Admin** - pełne uprawnienia (import/zmiany danych)
  - Login: `Admin` 
  - Hasło: `Admin1234`
- **Produkcja** - tylko podgląd (bez możliwości zmian)

### 📊 Widok Gantta
- Sticky kolumna „Maszyna” (lewa, nieprzewijana poziomo)
- Jeden viewport: jeden pionowy i jeden poziomy pasek przewijania
- Paski zleceń twardo przycięte do obszaru osi czasu (bez nachodzenia na etykiety)
- Dynamiczna oś czasu i siatka (zagęszczenie wg px/h, min. 60 px między etykietami)
- Zoom wokół kursora (Z + scroll), panoramowanie (X + scroll), linia „teraz” nad siatką
- Automatyczne pakowanie operacji w linie (lanes)
- Wirtualizacja (manualna) i overscan dla >500 wierszy (wydajność do 50k rekordów)
- Deterministyczne kolory maszyn i zleceń oraz marszruty między operacjami

### 📥 Import Danych
- Obsługa CSV, XLSX, XLSM (do 50k wierszy)
- Strumieniowy import w Web Workers
- Kreator mapowania kolumn z auto-detekcją
- Profile mapowania (zapisz/załaduj/domyślny)
- Walidacja i diagnostyka błędów; modal pozostaje otwarty przy błędach
- Krok podsumowania z pełną listą błędów i eksportem raportu do JSON
- Progress bar z możliwością anulowania

### 🔍 Wyszukiwanie i Filtrowanie
- Wyszukiwarka wielokrotnego wyboru zleceń
- Auto-dopasowanie widoku do wybranych operacji
- Tryb wielomarszruty z kolorami per zlecenie
- Filtry zasobów, partii i operacji
- Wklejanie list ID zleceń

### 📤 Eksporty
- PNG/PDF - wizualizacja całego Gantta
- CSV - dane z aktualnymi filtrami
- Nazwy plików z zakresem czasu/ID zleceń

## 📋 Wymagane Kolumny

### Obowiązkowe
- **Numer zlecenia** - identyfikator operacji
- **Zasób/Maszyna** - nazwa stanowiska pracy  
- **Data rozpoczęcia** - planowany start
- **Data zakończenia** - planowany koniec

### Opcjonalne
- **Nr operacji** - numer operacji w zleceniu
- **Nr partii** - identyfikator partii
- **Ilość** - planowana ilość
- **ID operacji** - unikalny identyfikator operacji
- **Kolejność** - sekwencja operacji
- **Uwagi** - dodatkowe notatki

## 📅 Obsługiwane Formaty Dat

System automatycznie rozpoznaje polskie formaty dat:

```
dd.MM.yyyy HH:mm:ss
dd.MM.yyyy HH:mm
dd.MM.yyyy
dd-MM-yyyy HH:mm:ss
dd-MM-yyyy HH:mm
dd-MM-yyyy
yyyy-MM-dd HH:mm:ss
yyyy-MM-dd HH:mm
yyyy-MM-dd
dd/MM/yyyy HH:mm:ss
dd/MM/yyyy HH:mm
dd/MM/yyyy
yyyy/MM/dd HH:mm:ss
```

**Uwaga:** Daty bez godziny są ustawiane na 00:00. Strefa czasowa: Europe/Warsaw.

Dodatkowo: obsługa dwucyfrowych lat (dd.MM.yy → 20yy), pojedynczych cyfr dnia/miesiąca,
oraz separatora przecinek w dacie/czasie (np. „10.01.25, 06:28:00”).

## 🏷️ Aliasy Kolumn

System rozpoznaje polskie i angielskie nazwy kolumn:

### Numer zlecenia
`order no`, `order no.`, `zlecenie`, `numer zlecenia`, `nr zlecenia`

### Zasób/Maszyna  
`resource`, `machine`, `maszyna`, `stanowisko`, `gniazdo`

### Data rozpoczęcia
`start`, `start time`, `początek`, `poczatek`, `od`

### Data zakończenia
`end`, `end time`, `koniec`, `do`

## 🚀 Uruchomienie

### Wersja Portable (EXE)

1.  Uruchom komendę `npm run build:portable`, aby wygenerować folder `dist` z plikiem `PlanProdukcji-Portable.exe`.
2.  Skopiuj cały folder `dist` na udział sieciowy lub pendrive.
3.  Kliknięcie `PlanProdukcji-Portable.exe` uruchamia aplikację. Ustawienia i logi są zapisywane w `%LOCALAPPDATA%\PlanProdukcji`.

### Wersja z instalatorem (NSIS)

1.  Uruchom komendę `npm run build:nsis`.
2.  Instalator utworzy skróty na pulpicie i w menu Start oraz wpis w "Programy i funkcje".

### Build produkcyjny (web)
```bash
npm run build:web
npm start
```

### Build portable/installer (Electron)
```bash
# Build aplikacji webowej
npm run build:web

# Build artefaktów Windows (portable + nsis) jednym poleceniem
cd electron
npm install
npm run build
cd ..

# Uruchomienie w trybie desktop (dev)
npm run dev:desktop

# (Opcjonalnie) osobne buildy
# Portable .exe:   (w folderze electron)
#   npm run build:portable
# Instalator NSIS: (w folderze electron)
#   npm run build:nsis
```

**Artefakty:**
- Portable: `dist/PlanProdukcji-Portable.exe`
- Instalator: `dist/PlanProdukcji-Setup.exe`

### Ikona aplikacji (Windows + okno)
- Umieść plik PNG z logo pod: `electron/assets/icon.png` (zalecane 1024×1024, tło przezroczyste).
- Podczas builda generowane są automatycznie: `electron/icon.ico` (dla .exe) oraz `electron/icon.png` (dla ikony okna).
- Jeśli `electron/assets/icon.png` nie istnieje lub jest niepoprawny, użyta zostanie domyślna ikona Electron.

### Automatyczny build (CI)
- Workflow GitHub Actions: `.github/workflows/build-windows.yml`
- Build na każdą zmianę w `main` oraz na tagi `v*.*.*`.
- Dla tagów tworzony jest GitHub Release z załączonymi artefaktami (`Portable` i `NSIS`).

## 📁 Struktura Projektu

```
.
├── next.config.js               # Konfiguracja Next.js (allowedDevOrigins, standalone)
├── jest.config.cjs              # Testy jednostkowe (Jest + jsdom)
├── eslint.config.js             # ESLint 9 + TypeScript
├── tailwind.config.js           # Konfiguracja Tailwind CSS
├── tsconfig.json                # Ustawienia TypeScript (ES2020, downlevelIteration)
├── __tests__/                   # Testy jednostkowe
│   ├── colors.test.ts
│   ├── date-utils.test.ts
│   └── SearchBar.test.tsx
├── cypress/                     # E2E (Cypress)
│   ├── cypress.config.js
│   └── e2e/
│       └── login.cy.js
├── electron/                    # Wersja portable (desktop)
│   ├── main.js
│   └── package.json
├── profiles/                    # Profile mapowania kolumn
│   └── default.mapping.json
├── demo/
│   └── Demo.csv                 # Dane demonstracyjne
└── src/
  ├── app/                     # App Router (Next.js 14)
  │   ├── api/
  │   │   └── auth/
  │   │       ├── login/route.ts
  │   │       └── logout/route.ts
  │   ├── dashboard/page.tsx   # Dashboard KPI/wykresy
  │   ├── login/page.tsx       # Logowanie
  │   ├── planner/page.tsx     # Gantt (planner)
  │   ├── globals.css
  │   ├── layout.tsx
  │   └── page.tsx             # Strona główna
  ├── components/
  │   ├── auth/
  │   │   └── AuthButton.tsx
  │   ├── dashboard/
  │   │   ├── FilterPanel.tsx
  │   │   ├── KPICards.tsx
  │   │   ├── LoadChart.tsx
  │   │   ├── OrderRanking.tsx
  │   │   └── ResourceTable.tsx
  │   ├── gantt/
  │   │   └── GanttGrid.tsx    # Sticky kolumna, jeden viewport, zoom/pan, dynamiczna oś
  │   ├── import/
  │   │   ├── ImportModal.tsx
  │   │   └── ImportWizard.tsx
  │   ├── layout/
  │   │   ├── Header.tsx
  │   │   └── ThemeToggle.tsx
  │   ├── toolbar/
  │   │   ├── SearchBar.tsx
  │   │   └── Toolbar.tsx
  │   └── ui/
  │       ├── Button.tsx
  │       ├── LoadingSpinner.tsx
  │       └── Modal.tsx
  ├── hooks/
  │   └── useDashboardData.ts
  ├── lib/
  │   ├── auth.ts
  │   ├── colors.ts
  │   ├── date-utils.ts        # Rozszerzone parsowanie PL + dwucyfrowe lata
  │   ├── field-mapping.ts
  │   ├── lane-packing.ts
  │   ├── types.ts
  │   ├── utils.ts
  │   ├── dashboard/
  │   │   └── data-aggregation.ts
  │   ├── export/
  │   │   ├── dashboard-export.ts
  │   │   └── export-utils.ts
  │   └── import/
  │       ├── data-processor.ts
  │       └── file-parser.ts
  └── store/
    └── app-store.ts         # Zustand (viewState, ustawienia, profile importu)
```

## 🔧 Technologie

- **Next.js 14** - Framework React z App Router
- **React 18** - Biblioteka UI z hooks
- **TypeScript** - Typowanie statyczne
- **Tailwind CSS** - Style CSS utility-first
- **Framer Motion** - Animacje i przejścia
- **Zustand** - Zarządzanie stanem aplikacji
- **date-fns** - Operacje na datach (locale pl)
- **papaparse** - Parser CSV z streaming
- **xlsx** - Parser Excel (XLSX/XLSM)
- **html-to-image** - Eksport PNG
- **jsPDF** - Eksport PDF
- **Virtualizacja (manualna)** - Wydajne renderowanie wierszy Gantta
- **Lucide React** - Ikony SVG
- **Electron** - Desktop wrapper (portable)

## ⚡ Wydajność

### KPI Docelowe
- **TTFR ≤ 3s** (10k rekordów), **≤ 8s** (50k rekordów)
- **FPS ≥ 55** przy przewijaniu Gantta
- **Pamięć < 300 MB** (50k rekordów)

### Optymalizacje
- Strumieniowy import w Web Workers
- Wirtualizacja wierszy (manualna, overscan)
- Memoizacja obliczeń layout-u
- Indeksowanie operacji po zasobach
- Chunked processing (1000 wierszy/chunk)

## 🆕 Zmiany w wersji v0.2.0 (2025-08-13)

### Gantt i UX
- Sticky kolumna „Maszyna”, jeden viewport (jeden scroll pion/poziom).
- Twarde przycięcie pasków do osi czasu — brak nachodzenia na etykiety.
- Dynamiczna oś czasu i siatka z adaptacyjnymi progami zagęszczenia; min. 60 px między etykietami.
- Zoom wokół kursora (Z + scroll) i panoramowanie poziome (X + scroll), od razu regenerują ticki.
- Manualna wirtualizacja wierszy z overscanem dla dużych datasetów.
- Sticky nagłówek osi czasu; linia „teraz” ponad siatką.

### Import i walidacja
- Kreator importu: modal nie zamyka się przy błędach, dodany krok podsumowania z listą błędów.
- Eksport raportu błędów do JSON.
- Akceptacja operacji o zerowym czasie (End == Start → normalizacja +1 minuta).

### Parsowanie dat
- Obsługa dwucyfrowych lat (dd.MM.yy → 20yy) i pojedynczych cyfr dnia/miesiąca.
- Obsługa separatora z przecinkiem („10.01.25, 06:28:00”).

### Inne
- Poprawki kolorowania wykresów (Recharts) i drobne poprawki typów/tsconfig.
- Domyślny zakres widoku: dziś −30 dni do dziś +30 dni.
- Dev: allowedDevOrigins dla localhost/127.0.0.1 (ciszej w dev).

## 🖥️ Wymagania Systemowe

- **Node.js** 18.17+
- **npm** lub **yarn**
- **Windows 10/11, x64** (dla wersji Electron)
- **RAM** 4GB+ (zalecane 8GB dla dużych datasetów)
- **Dysk** 100MB wolnego miejsca

## 🔒 Bezpieczeństwo

- HttpOnly cookies dla sesji
- Walidacja uprawnień na API endpoints
- Context isolation w Electron
- Sandbox mode dla renderer process
- Brak połączeń zewnętrznych w trybie portable
- Blokada nawigacji poza localhost

## 📦 Wersja Portable

### Funkcjonalności
- **Single instance lock** - tylko jedna instancja aplikacji
- **Auto-port detection** - zakres 5123-5199
- **Magazyn danych**: `%LOCALAPPDATA%/PlanProdukcji` lub `./data` (obok EXE)
- **Działanie z dysku sieciowego** (UNC paths)
- **Zapamiętywanie** rozmiaru/położenia okna
- **Offline** - zero zależności zewnętrznych

### Uruchomienie
1. Pobierz `PlanProdukcji-Portable.exe`
2. Uruchom z dowolnej lokalizacji (lokalnej lub sieciowej)
3. Aplikacja automatycznie:
   - Znajdzie wolny port
   - Uruchomi lokalny serwer
   - Otworzy okno aplikacji

#### Uruchamianie z udziału sieciowego (UNC i zmapowane dyski)
- Aplikacja wykrywa start z lokalizacji sieciowej (UNC `\\\\server\\share` oraz zmapowane dyski, np. `Z:\\`).
- Przy pierwszym uruchomieniu kopiuje się do lokalnego cache: `%LOCALAPPDATA%/PlanProdukcji/cache/v<wersja>` i uruchamia z lokalnej kopii (szybszy start, mniejsze ryzyko blokad plików).
- W razie problemów z kopiowaniem (np. `ENOSPC` — brak miejsca) pojawi się czytelny komunikat z lokalizacjami źródła i celu.

## 📊 Dane Demonstracyjne

Plik `demo/Demo.csv` zawiera przykładowe dane produkcyjne:
- 15 operacji na 8 maszynach
- 8 różnych zleceń
- Różne partie i ilości
- Polskie formaty dat i nazwy

## 🎯 Profile Mapowania

### Domyślny profil (`profiles/default.mapping.json`)
```json
{
  "mapping": {
    "orderNo": "Numer zlecenia",
    "resource": "Maszyna", 
    "startTime": "Data rozpoczęcia",
    "endTime": "Data zakończenia",
    "opNo": "Nr operacji",
    "partNo": "Nr partii",
    "qty": "Ilość",
    "notes": "Uwagi"
  }
}
```

### Auto-detekcja
- Hash nagłówków dla dopasowania profili
- Normalizacja bez diakrytyków
- Case-insensitive matching
- Aliasy polskie i angielskie

## 🚨 Ograniczenia

- **Maksymalnie 50 000 wierszy** na import
- **Formaty plików**: CSV, XLSX, XLSM
- **Strefa czasowa**: Europe/Warsaw (fixed)
- **Język interfejsu**: Polski (pl-PL)
- **Platforma desktop**: Windows 10/11

## 📝 Licencja

Proprietary - wszystkie prawa zastrzeżone

---

**Wersja:** v0.2.0  
**Data:** Sierpień 2025  
**Autor:** Plan Produkcji Team

---

## 🔗 Wydania i pobieranie

- Ostatnie wydanie: zakładka Releases w repozytorium GitHub.
- Artefakty (Windows): Portable `.exe` oraz instalator NSIS `.exe` do pobrania z wydania.

### Publikacja nowego wydania
1. Zmień wersję w `package.json` i `electron/package.json`.
2. Utwórz tag semver (np. `v1.0.2`) i wypchnij:
  ```bash
  git tag v1.0.2
  git push origin v1.0.2
  ```
3. CI (GitHub Actions) zbuduje artefakty i utworzy Release z plikami `.exe`.