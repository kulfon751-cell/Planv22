# 🚀 Plan Produkcji - Release Notes

## Wersja 1.0.1 - Desktop dla Windows

### 📦 Pliki do Pobrania

Pliki desktop są dostępne w sekcji **Releases** tego repozytorium:

1. **PlanProdukcji-Portable.exe** (~157 MB)
   - Wersja portable - nie wymaga instalacji
   - Uruchom bezpośrednio z dowolnego miejsca na Windows 10/11 x64

2. **PlanProdukcji-Setup.exe** (~498 KB)  
   - Installer NSIS z kreatorem instalacji
   - Automatyczna integracja z systemem Windows

### 🔗 Linki

- 📥 [Pobierz najnowszą wersję](https://github.com/Myszoniz/Planv22/releases)
- 📖 [Instrukcja dla Windows](WINDOWS-README.md)
- 🛠️ [Szczegóły buildowania](DESKTOP-BUILD-SUMMARY.md)

### ⚡ Szybki Start

#### Wersja Web (zawsze aktualna)
```bash
git clone https://github.com/Myszoniz/Planv22.git
cd Planv22
npm install
npm run dev
```

#### Wersja Desktop
1. Przejdź do [Releases](https://github.com/Myszoniz/Planv22/releases)
2. Pobierz odpowiednią wersję dla Windows
3. Uruchom zgodnie z [instrukcją](WINDOWS-README.md)

### 🏗️ Budowanie Desktop (dla deweloperów)

```bash
# Zainstaluj zależności Electron
cd electron
npm install

# Zbuduj aplikację web
cd ..
npm run build

# Zbuduj wersję desktop
npm run build:desktop
```

Pliki zostaną utworzone w katalogu `dist/`:
- `PlanProdukcji-Portable.exe` - wersja portable
- `PlanProdukcji-Setup.exe` - installer NSIS

### 🔧 Wymagania Buildowania

- Node.js 18+
- Wine (na Linux/macOS dla buildów Windows)
- Python 3.x (dla natywnych modułów)

---

**Uwaga**: Pliki binarne (.exe) nie są przechowywane w repozytorium Git. Pobierz je z sekcji Releases.
