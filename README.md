# Page Tweaks

Rozszerzenie do Chrome z poprawkami cudzych stron:

- **Medium i qnews.pl** — ciemny motyw (odwrócona jasność kolorów, obrazki bez zmian).
- **limanowa.in** — czytnik bez reklam i okienek oraz lista wpisów od najnowszego z datami.

Każdą poprawkę można wyłączyć osobno w ustawieniach (klik w ikonę rozszerzenia).

## Instalacja

`chrome://extensions` → **Tryb programisty** → **Wczytaj rozpakowane** → ten katalog.

## Struktura

```
manifest.json
wspolne/            service worker, ustawienia, silnik ciemnego motywu
strony/medium/      paleta i CSS ciemnego motywu
strony/qnews/       paleta i CSS ciemnego motywu
strony/limanowa/    czytnik, daty wpisów, reguły blokowania reklam
icons/
test/               atrapy stron z testami
```

Nowa strona: folder w `strony/`, wpis w `content_scripts` w manifeście, klucz
w `wspolne/ustawienia.js` i przełącznik w `wspolne/options.html`.

## Testy

```bash
php -S localhost:8000
```

Potem `http://localhost:8000/test/mock-<strona>.html?auto=1`.
