# Plan Produkcji - Wersja Desktop (Windows)

## Wymagania systemu

- **Windows 10** lub **Windows 11** (64-bit)
- **8 GB RAM** (minimalne), 16 GB zalecane
- **2 GB** wolnej przestrzeni dyskowej
- **Rozdzielczość ekranu:** minimum 1280x720, zalecane 1920x1080

## Budowanie aplikacji

### Wymagania deweloperskie

1. **Node.js 18.x** lub nowszy
2. **npm** lub **yarn**
3. **Git**

### Proces budowania

1. **Klonowanie repozytorium:**
   ```bash
   git clone https://github.com/Myszoniz/Planv22.git
   cd Planv22
   ```

2. **Instalacja zależności:**
   ```bash
   npm install
   ```

3. **Budowanie wersji desktop:**

   **Wersja Portable (.exe):**
   ```bash
   npm run build:portable
   ```
   
   **Instalator NSIS:**
   ```bash
   npm run build:nsis
   ```
   
   **Obie wersje:**
   ```bash
   npm run build:desktop
   ```

4. **Lokalizacja plików:**
   
   Gotowe pliki znajdziesz w katalogu `dist/`:
   - `PlanProdukcji-Portable.exe` - wersja portable
   - `PlanProdukcji-Setup.exe` - instalator NSIS

## Instalacja i uruchomienie

### Wersja Portable

1. Pobierz plik `PlanProdukcji-Portable.exe`
2. Uruchom plik - aplikacja startuje automatycznie
3. Dane konfiguracyjne są zapisywane w:
   - `%LOCALAPPDATA%\\PlanProdukcji` (standardowo)
   - Lokalny folder `data` (jeśli jest dostępny)

### Wersja z instalatorem (NSIS)

1. Pobierz plik `PlanProdukcji-Setup.exe`
2. Uruchom instalator jako Administrator
3. Wybierz katalog docelowy (domyślnie: `C:\\Program Files\\Plan Produkcji`)
4. Zaznacz opcje:
   - ✅ Utwórz skrót na pulpicie
   - ✅ Dodaj do Menu Start
5. Kliknij "Instaluj"
6. Aplikacja będzie dostępna w Menu Start i na pulpicie

## Funkcjonalność

Aplikacja desktop zawiera wszystkie funkcje wersji webowej:

- ✅ **Planowanie produkcji** - interaktywny harmonogram Gantta
- ✅ **Dashboard analityczny** - KPI, wykresy obciążenia, ranking zamówień
- ✅ **Import/Export danych** - obsługa plików CSV, PNG, PDF
- ✅ **Kontrola produkcji** - śledzenie postępu w czasie rzeczywistym
- ✅ **System backupów** - automatyczne i manualne kopie zapasowe
- ✅ **Tryb offline** - pełna funkcjonalność bez internetu
- ✅ **Bezpieczeństwo** - CSRF, rate limiting, audit logs

## Rozwiązywanie problemów

### Aplikacja nie uruchamia się

1. **Sprawdź Windows Defender/Antywirus:**
   - Dodaj aplikację do wyjątków
   - Tymczasowo wyłącz Real-time Protection

2. **Uruchom jako Administrator:**
   - Kliknij prawym przyciskiem na plik
   - Wybierz "Uruchom jako administrator"

3. **Sprawdź logi:**
   - Wersja portable: `%LOCALAPPDATA%\\PlanProdukcji\\plan-produkcji.log`
   - Wersja zainstalowana: `%APPDATA%\\Plan Produkcji\\plan-produkcji.log`

### Port już zajęty

Aplikacja automatycznie znajduje wolny port w zakresie 5123-5199. Jeśli wszystkie są zajęte:

1. Zamknij inne aplikacje korzystające z portów
2. Sprawdź, czy nie działa już inna instancja aplikacji
3. Uruchom aplikację ponownie

### Problemy z bazą danych

1. **Usuń katalog danych** (UWAGA: utracisz dane):
   - `%LOCALAPPDATA%\\PlanProdukcji`
   - lub lokalny folder `data`
   
2. **Przywróć kopię zapasową** z menu aplikacji

## Wsparcie techniczne

- **GitHub Issues:** https://github.com/Myszoniz/Planv22/issues
- **Email:** wsparcie@planprodukcji.pl (jeśli dostępny)
- **Dokumentacja:** https://github.com/Myszoniz/Planv22/wiki

## Licencja

Zobacz plik [LICENSE](../LICENSE) w głównym katalogu projektu.
