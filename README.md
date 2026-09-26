# Page Tweaks

```bash
curl -fsSL https://raw.githubusercontent.com/Adam-M-04/page-tweaks/master/instaluj.sh | bash
```

Instaluje i aktualizuje (macOS, Linux), bez gita.

Rozszerzenie do Chrome z poprawkami cudzych stron:

- **Medium i qnews.pl** — ciemny motyw (odwrócona jasność kolorów, obrazki bez zmian).
- **limanowa.in** — czytnik bez reklam i okienek oraz lista wpisów od najnowszego z datami.
- **rmf24.pl** — bez reklam, okna zgody, wideo w środku artykułów, treści sponsorowanych i autopromocji;
  wpisy z X, Instagrama i Facebooka za przyciskiem „Zobacz wpis".

Każdą poprawkę można wyłączyć osobno w ustawieniach (klik w ikonę rozszerzenia).

## Instalacja

Polecenie z góry kopiuje pliki do `~/Library/Application Support/page-tweaks`
(Linux: `~/.local/share/page-tweaks`). Za pierwszym razem `chrome://extensions`
→ **Tryb programisty** → **Wczytaj rozpakowane** → ten folder (ścieżka jest
w schowku: Cmd+Shift+G i wklej). Po aktualizacji ⟳ przy rozszerzeniu albo
restart Chrome.

Z repo: **Wczytaj rozpakowane** → katalog repo.

## Struktura

```
manifest.json
instaluj.sh         instalacja i aktualizacja bez gita
wspolne/            service worker, ustawienia, silnik ciemnego motywu
strony/medium/      paleta i CSS ciemnego motywu
strony/qnews/       paleta i CSS ciemnego motywu
strony/limanowa/    czytnik, daty wpisów, reguły blokowania reklam
strony/rmf24/       bez reklam (CSS, reguły blokowania), wpisy za przyciskiem
icons/
test/               atrapy stron z testami
```

Nowa strona: folder w `strony/`, wpis w `content_scripts` w manifeście, klucz
w `wspolne/ustawienia.js` i sekcja z przełącznikami w `wspolne/options.html`.
Reguły sieciowe: zestaw w `declarative_net_request` i wpis w `wspolne/background.js`.

## Testy

```bash
php -S localhost:8000
```

Potem `http://localhost:8000/test/mock-<strona>.html?auto=1`.
