# Page Tweaks

Rozszerzenie do Chrome (macOS, Linux).

## Instalacja

**1.** Wklej w Terminalu:

```bash
curl -fsSL https://raw.githubusercontent.com/Adam-M-04/page-tweaks/master/instaluj.sh | bash
```

**2.** W Chrome wejdź na `chrome://extensions` i włącz **Tryb programisty** (prawy górny róg).

**3.** Kliknij **Wczytaj rozpakowane** i wskaż folder:

- macOS: `~/Library/Application Support/page-tweaks`
  (ścieżka jest już w schowku: w oknie wyboru naciśnij **Cmd+Shift+G** i wklej)
- Linux: `~/.local/share/page-tweaks`

Gotowe. Ustawienia otwiera klik w ikonę rozszerzenia.

**⌘⇧C** (Ctrl+Shift+C na Linuksie) kopiuje link bieżącej karty, jak w Arc. Skrót zmienisz w `chrome://extensions/shortcuts`, a wyłączysz w ustawieniach.

Karta otwarta z linku (⌘-klik, środkowy przycisk) trafia na koniec listy kart i poza grupę, zamiast pod bieżącą. Też do wyłączenia w ustawieniach.

**⌘D** duplikuje bieżącą kartę na koniec listy, poza grupę, i zostawia ją w tle (zamiast dodawać zakładkę). Jeśli w `chrome://extensions/shortcuts` przy tej komendzie nie ma ⌘D, przypisz go tam.

Prawy przycisk na karcie → **Zmień nazwę karty…** nadaje jej własną nazwę. Nazwa należy do tej jednej karty: zostaje, gdy przechodzisz w niej po stronach, i wraca po restarcie Chrome. Pusta przywraca tytuł strony. Nie działa na stronach `chrome://` i w Chrome Web Store.

## Aktualizacja

Uruchom to samo polecenie z kroku 1, potem w `chrome://extensions` kliknij **⟳** przy Page Tweaks.
