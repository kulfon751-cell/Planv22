## CHANGELOG

All notable changes to this project will be documented in this file.

### 2025-08-15 — Zmiany UI nagłówka (Unreleased)

- Usunięto duplikujące elementy w nagłówku:
  - usunięto lewy link "Dashboard" z nawigacji (był duplikatem przycisku po prawej).
  - czasowo usunięto lewy przycisk "Otwórz Planner", a następnie przywrócono go po prawej stronie.
- Dodano przycisk akcji po prawej: "Zarządzanie i kontrola produkcji" prowadzący do `/control`.
- Efekt: po prawej stronie nagłówka znajdują się teraz trzy akcje (w zależności od strony):
  - Otwórz Planner (niebieski)
  - Zarządzanie i kontrola produkcji (zielony)
  - Dashboard (fioletowy)

Powiązane commity:

- 95d46b1 — UI: remove left 'Otwórz Planner' button from Header, keep only Dashboard button
- 5472f79 — UI: remove duplicate left Dashboard nav link; keep only right Dashboard button
- 9356019 — UI: restore 'Otwórz Planner' as right-side action button, keep single Dashboard button
- 3539f41 — UI: add 'Zarządzanie i kontrola produkcji' action button next to 'Otwórz Planner'

Uwagi:
- Zmiany zostały wprowadzone bezpośrednio na gałęzi `main` i wypchnięte do origin.
