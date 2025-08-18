# Plan Produkcji - Wersja Desktop dla Windows

## 📦 Dostępne Wersje

### 🚀 Wersja Portable (PlanProdukcji-Portable.exe)
- **Rozmiar**: ~157 MB
- **Instalacja**: Nie wymagana
- **Użycie**: Pobierz i uruchom bezpośrednio
- **Zalety**: 
  - Nie pozostawia śladów w systemie
  - Można uruchomić z pendrive'a
  - Nie wymaga uprawnień administratora
- **Lokalizacja danych**: Tworzy folder `data/` w tym samym katalogu co plik .exe

### 📋 Installer NSIS (PlanProdukcji-Setup.exe)
- **Rozmiar**: ~498 KB
- **Instalacja**: Standardowy proces instalacji Windows
- **Użycie**: Uruchom installer i postępuj zgodnie z instrukcjami
- **Zalety**:
  - Tworzy skróty na pulpicie i w menu start
  - Standardowa integracja z systemem Windows
  - Opcja automatycznego uruchamiania
- **Lokalizacja danych**: `%LOCALAPPDATA%\PlanProdukcji\`

## 🖥️ Wymagania Systemowe

- **System operacyjny**: Windows 10/11 (x64)
- **RAM**: Minimum 4 GB (zalecane 8 GB)
- **Miejsce na dysku**: 200 MB wolnego miejsca
- **Procesor**: Intel/AMD x64
- **Połączenie internetowe**: Opcjonalne (dla synchronizacji danych)

## 🚦 Pierwsze Uruchomienie

### Wersja Portable
1. Pobierz plik `PlanProdukcji-Portable.exe`
2. Umieść w wybranym katalogu (np. `C:\PlanProdukcji\`)
3. Uruchom dwukrotnym kliknięciem
4. Aplikacja automatycznie:
   - Uruchomi serwer na porcie 5123-5199
   - Otworzy przeglądarkę z interfejsem
   - Utworzy folder `data/` dla bazy danych

### Installer
1. Pobierz plik `PlanProdukcji-Setup.exe`
2. Uruchom jako administrator (opcjonalnie)
3. Postępuj zgodnie z instrukcjami kreatora instalacji
4. Po instalacji aplikacja będzie dostępna w menu Start
5. Pierwsze uruchomienie automatycznie konfiguruje środowisko

## ⚙️ Konfiguracja

### Porty sieciowe
Aplikacja automatycznie znajduje wolny port w zakresie 5123-5199. 
Jeśli wszystkie porty są zajęte, sprawdź:
```
netstat -an | findstr :5123
```

### Folder danych
**Wersja Portable**: `./data/` (względem pliku exe)
**Wersja Installed**: `%LOCALAPPDATA%\PlanProdukcji\`

### Backup i przywracanie
- Automatyczny backup co 24 godziny
- Ręczne backup przez interfejs web
- Kopie zapasowe w folderze `backups/`

## 🔧 Rozwiązywanie Problemów

### Aplikacja nie uruchamia się
1. Sprawdź czy port nie jest zajęty
2. Uruchom jako administrator
3. Sprawdź logi w folderze `logs/`
4. Wyłącz antywirus tymczasowo

### Nie można otworzyć interfejsu
1. Sprawdź czy serwer jest uruchomiony (ikona w zasobniku systemowym)
2. Przejdź ręcznie do `http://localhost:5123`
3. Sprawdź firewall Windows

### Problemy z danymi
1. Sprawdź uprawnienia do folderu danych
2. Sprawdź miejsce na dysku
3. Przywróć z backupu jeśli potrzebne

### Logi i diagnostyka
- Pliki logów: `logs/app.log`
- Konfiguracja: `config/settings.json`
- Baza danych: `data/database.sqlite`

## 🔄 Aktualizacje

### Wersja Portable
1. Pobierz nową wersję
2. Zamknij aktualną aplikację
3. Zastąp stary plik .exe nowym
4. Uruchom ponownie (dane zostają zachowane)

### Wersja Installed
1. Pobierz nowy installer
2. Uruchom installer (automatycznie zaktualizuje)
3. Dane i konfiguracja zostają zachowane

## 📞 Wsparcie

W przypadku problemów:
1. Sprawdź ten plik README
2. Zajrzyj do logów aplikacji
3. Zgłoś problem na GitHub: [Issues](https://github.com/Myszoniz/Planv22/issues)

## 🔒 Bezpieczeństwo

- Aplikacja uruchamia lokalny serwer (tylko localhost)
- Brak połączeń wychodzących bez zgody użytkownika
- Dane przechowywane lokalnie w formacie SQLite
- Szyfrowanie opcjonalne dla wrażliwych danych

## ⚡ Wydajność

- Czas uruchomienia: 3-5 sekund
- Wykorzystanie RAM: 150-300 MB
- Wykorzystanie CPU: Minimalne w spoczynku
- Rozmiar bazy danych: Zależny od ilości danych

---

**Wersja**: 1.0.1  
**Data**: Sierpień 2024  
**Autor**: Myszoniz  
**Licencja**: Zobacz plik LICENSE

## 🔗 Tryb uruchamiania z udziału sieciowego (UNC)

Jeżeli chcesz uruchamiać aplikację bez instalacji z udziału sieciowego (np. \\SERWER\Aplikacje\PM\PlanProdukcji-Portable.exe), dodaliśmy mechanizm, który:

- wykrywa, że plik wykonywalny został uruchomiony bezpośrednio z UNC;
- kopiuje lokalnie całą paczkę do katalogu cache użytkownika (%LOCALAPPDATA%\PlanProdukcji\cache\vX.Y.Z\);
- uruchamia lokalną kopię i zamyka proces działający z udziału sieciowego, co zapobiega blokowaniu pliku na serwerze i przyspiesza kolejne starty.

Jak to działa:

1. Wersja portable sprawdza, czy `process.execPath` zaczyna się od `\\` (UNC).
2. Jeśli tak, tworzy katalog cache w `%LOCALAPPDATA%\PlanProdukcji\cache\v<wersja>` i kopiuje tam plik (lub całą zawartość folderu, jeśli system plików na to pozwala).
3. Następnie uruchamia lokalnie skopiowany plik i kończy obecny proces.

Uwagi i ograniczenia:

- Mechanizm działa w trybie best-effort — w środowiskach z ograniczonymi uprawnieniami kopiowanie całego folderu może się nie powieść; wtedy próbujemy skopiować sam plik exe.
- Jeżeli chcesz wymusić zawsze pełne kopiowanie zasobów, rozważ wcześniejsze zapewnienie, że serwer udostępnia pełną strukturę katalogów (nie tylko sam plik exe).
- Po aktualizacji pliku na udziale sieciowym użytkownik powinien ponownie pobrać lub uruchomić exe, aby cache zostało zaktualizowane (mechanizm używa numeru wersji do separacji katalogów cache).

Bezpieczeństwo:

- Kopia lokalna przechowywana jest w katalogu aplikacji użytkownika i korzysta z uprawnień użytkownika — nie nadpisuje systemowych lokalizacji.
- Mechanizm nie wykonuje automatycznych modyfikacji na serwerze sieciowym.
