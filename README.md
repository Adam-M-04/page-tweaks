# Lepsze strony

Rozszerzenie do Chrome, które poprawia cudze strony tam, gdzie same o siebie
nie zadbały:

1. **Ciemny motyw na Medium i qnews.pl** — te strony nie mają trybu
   ciemnego, więc rozszerzenie odwraca jasność ich kolorów (tekst, tło, kod,
   przyciski), zostawiając obrazki.
2. **Czytnik na limanowa.in** — z lokalnego portalu zostaje sama treść:
   bez banerów, reklam wideo, okna zgody i okienek, artykuł w jednej
   kolumnie większą czcionką, komentarze za przyciskiem.
3. **Daty wpisów na limanowa.in** — główna sekcja strony głównej jako
   lista od najnowszego ze znaczkiem „dziś 05:30" / „wczoraj 16:25" /
   „3 dni temu", bez felietonów i nekrologów; ten sam znaczek na kafelkach
   skrzynek.

Każda poprawka jest włączona domyślnie i osobno do wyłączenia w ustawieniach
(klik w ikonę rozszerzenia). Zmiana działa od razu na otwartych kartach.

Wcześniej te poprawki siedziały w rozszerzeniu myFund Turbo (repo
MyFund) — tam zostało tylko to, co dotyczy portfela.

## Instalacja

1. `chrome://extensions` → włącz **Tryb programisty** (prawy górny róg).
2. **Wczytaj rozpakowane** → wskaż ten katalog.
3. Po zmianie w `manifest.json` (nowa strona, nowe `matches`) — przycisk
   odświeżania przy rozszerzeniu; zmiany w CSS/JS łapie przeładowanie karty
   po odświeżeniu rozszerzenia.

Ustawienia siedzą w `chrome.storage.sync` pod kluczem `ustawienia`, po
jednym obiekcie na stronę (`ustawienia.medium.ciemnyMotyw`,
`ustawienia.qnews.ciemnyMotyw`, `ustawienia.limanowa.czytnik`,
`ustawienia.limanowa.daty`) — domyślne
w `ustawienia.js`.

## Kolejna strona

Ciemny motyw: para `<strona>-dark.js` (paleta `reczne` + włącznik,
`lsCiemnyMotyw({ klucz: '<strona>', … })`) i `<strona>-dark.css`
(statyczne poprawki pod `html[data-ls-dark]`), wpis w `content_scripts`,
klucz w `DOMYSLNE_USTAWIENIA` i przełącznik w `options.html`
(`data-klucz` / `data-pole` — `options.js` obsłuży go sam). Czytnik: tak
samo, z własnym atrybutem na `<html>` i — jeśli trzeba odciąć sieć
reklamową — zestawem reguł w `declarative_net_request` przełączanym
w `background.js`.

## Ciemny motyw: Medium i qnews.pl

Wspólny silnik `ciemny-motyw.js` (`lsCiemnyMotyw(konfig)`) plus po jednym
pliku palety i jednym CSS na stronę: `medium-dark.js` + `medium-dark.css`
(manifest, `document_start`, `all_frames`) na `medium.com`, `*.medium.com`
i kilku publikacjach Medium na własnych domenach (`levelup.gitconnected.com`,
`itnext.io`, `*.plainenglish.io`, `blog.stackademic.com`, `blog.devgenius.io`,
`betterprogramming.pub`, `codeburst.io`, `blog.bitsrc.io`, `faun.pub`,
`towardsdev.com`) oraz `qnews-dark.js` + `qnews-dark.css` na `qnews.pl`.
Kolejną publikację dopisuje się do `matches` w manifeście, kolejną stronę —
jako nową parę plików z własną paletą. Nic nie klika, nic nie wysyła — czyta
arkusze stylów strony i dokłada własny.

**Jak Medium maluje stronę (stan: wrzesień 2026).** Niemal wszystko idzie
z tokenów `:root { color-scheme: light; --color-bg-neutral-primary: #ffffff;
--color-fg-neutral-primary: #242424; … }` (`<style data-href="lite-color-scheme-tokens">`),
kolory składni kodu są już w `light-dark(#cf222e, #ff7b72)`, a reszta to
atomowe klasy Feli — jedna klasa = jedna deklaracja, nazwy losowe per build,
reguły dokładane w locie przez `insertRule`. Kolorów na sztywno jest
kilkanaście (zielony przycisk, cienie, hover). Klas nie da się więc wskazać
z góry, ale ich reguły da się przeczytać z CSSOM.

**Co robi rozszerzenie.** Zamiast filtra `invert()` na całej stronie:

1. `html[data-ls-dark]` — atrybut na `<html>` włącza wszystko; zdjęcie
   atrybutu (odznaczenie w ustawieniach) wyłącza motyw od razu, bez
   przeładowania. `color-scheme: dark` przełącza formularze, paski
   przewijania i `light-dark()` w kodzie.
2. **Lustro arkuszy.** Każda reguła z kolorem — tokeny `:root`, klasy Feli,
   style stron trzecich — dostaje bliźniaczą regułę
   `html[data-ls-dark] <selektor> { … }` we własnym `<style id="ls-dark-lustro">`.
   Atrybut podnosi specyficzność o jeden, więc bliźniak wygrywa niezależnie od
   kolejności arkuszy (także `.x:hover` ma swojego bliźniaka). Zapytania
   medialne Fela trzyma na `<style media="…">`, nie w `@media` — lustro
   opakowuje bliźniaki w `@media` z `sheet.media`. Nowe `<style>` łapie
   `MutationObserver`, a reguły dokładane przez `insertRule` (tego obserwator
   nie widzi) — zegar co sekundę po ~1000 obiektach reguł, z `WeakSet`
   przetworzonych.
3. **Kolory.** Jasność odwrócona w HSL z zachowanym odcieniem (`1.09 − 0.99·L`;
   nasycone ściągane ku środkowi, żeby zieleń nie zbladła), a dla palety
   Medium ręcznie dobrane pary: `#ffffff → #191919`, `#f9f9f9 → #222`
   (bloki kodu), `#242424 → #e8e8e8` (tekst), `#191919 → #f2f2f2` (czarny
   przycisk staje się jasny, jego biały tekst ciemny), `#1a8917 → #4bc247`
   (zieleń). Przezroczyste czernie cieni i hoverów stają się przezroczystymi
   bielami z tą samą alfą. Pomijane: `url(…)`, `light-dark(…)`, `var(…)`
   bez literału. Gradient zanikania tekstu przy paywallu stoi na
   `color-mix(var(--color-bg-neutral-primary) …)`, więc przełącza się sam.
4. **Inline SVG** (logotyp, ikona M) ma `fill="#242424"` w atrybucie —
   przemapowany w DOM, zapamiętany w `WeakMap`, przywracany po wyłączeniu;
   `currentColor` nietknięty. Tak samo kolory w atrybutach `style=""`
   (qnews: artykuły wklejone z Worda mają `background-color: #fff` na
   każdym akapicie) — przepisywane deklaracja po deklaracji przez
   `CSSStyleDeclaration`, więc `url(…)` obok zostaje, a po wyłączeniu wraca
   ostatnia wersja ustawiona przez stronę.
5. **Obrazki bez zmian.** Zdjęcia i zrzuty ekranu zostają, jak są; `article img`
   dostaje podkład `#e6e6e6`, którego pod obrazkiem kryjącym nie widać, a pod
   przezroczystym PNG (diagram czarną kreską) ratuje czytelność.
6. **Gisty** siedzą w ramkach `medium.com/media/*` (stąd `all_frames`), ale
   ich arkusz jest cross-origin — `medium-dark.css` ma dla `.gist` gotową
   paletę GitHub dark z `!important`.
7. Na domenach publikacji motyw rusza od razu, a po `DOMContentLoaded`
   sprawdza metę `al:android:package=com.medium.reader`; publikacja, która
   z Medium odeszła, wraca do swojego wyglądu.

Czego nie obejmuje: osadzone treści cross-origin (YouTube, X, CodePen) —
zostają w swoich kolorach; publikacje Medium na domenach, których nie ma
w `matches`.

**qnews.pl** (stan: wrzesień 2026) to Drupal z motywem „q": dwa zagregowane
arkusze same-origin, ~170 kolorów na sztywno, zero zmiennych CSS i inline
SVG. Tło strony to gradient na `html, body` (biel → beż `#dfd5c5`), treść
na białych i kremowych (`#f3f0ec`) kartach z 60-pikselowym cieniem, beżowe
(`#e5d9c7`) guziki, brązowe (`#776654`) bloki „Info" i ankiety z białym
tekstem, tekst `#444036`. Paleta w `qnews-dark.js` odwraca to w ciepłe
ciemne tony (biel → `#1f1e1b`, tekst → `#ded8cc`, brązowe bloki → jasny brąz
z ciemnym tekstem — odwrócenie jest spójne, więc białe napisy na nich też
ciemnieją). `zachowajCiemneCienie` zostawia ciemne i kolorowe kolory
w `box-shadow` (cień pod kartą nie robi się łuną, pasek statusu nie zmienia
barwy). `qnews-dark.css` odwraca logo filtrem (czarny napis na przezroczystym
PNG) i daje jasny podkład pod obrazki w treści; wykresy i tabele-obrazki są
kryjące, więc zostają, jak są.

## Czytnik: limanowa.in

`limanowa-czytnik.js` + `limanowa-czytnik.css` (manifest, `document_start`)
na `limanowa.in` i `www.limanowa.in` oraz zestaw reguł declarativeNetRequest
`limanowa-reguly.json`. Wszystko idzie za jednym włącznikiem
(`ustawienia.limanowa.czytnik`, domyślnie włączony): CSS działa pod
`html[data-ls-czytnik]`, reguły przełącza `background.js`
(`updateEnabledRulesets`, także przy `onInstalled`/`onStartup`, bo Chrome
nie pamięta włączonych zestawów po aktualizacji rozszerzenia).

**Jak portal jest zbudowany (stan: wrzesień 2026).** Laravel z jQuery,
artykuły we wszystkich działach (aktualności, sport, PAP, urzędy, materiały
partnerów) na jednym szkielecie: `.newsDetails__top` z kolumną treści
`.newsDetails__left` (tytuł, zdjęcia, data, `.newsDetails__text`, komentarze,
„Może Cię zaciekawić") i boczną `.newsDetails__right`. Reklamy z trzech źródeł:

- **optad360** (prebid + Google Ad Manager + AdSense): sloty `.ad-placeholder`
  z `div#oa-360-*` w środku — nad treścią, w treści artykułu (z
  autoodtwarzanym `<video>`), między komentarzami, w bocznej kolumnie; do
  tego okno zgody Google Funding Choices (`.fc-consent-root`), które
  blokuje przewijanie przez `body { overflow: hidden }`;
- **własne banery portalu** (`/banner/zobacz/…`): `#topBarner` nad menu
  i `.floatingArd` przyklejony do dołu — klasy z „Ard" zamiast „Ad", żeby
  nie łapały ich listy filtrów;
- **treści płatne** na stronie głównej: „Ogłoszenia promowane" i „Firmy"
  (`section.announcements`), „Materiały partnerów".

Do tego sekcje strony głównej niepotrzebne w czytniku: „Region - Polska - Świat"
(`section.polandAndWorld`, wiadomości krajowe z PAP), „Sport"
(`section.sport`) i skrzynka „Felietony".

Plus okienko „włącz powiadomienia" (`#notificationsPopup`; Firebase pyta
przeglądarkę o zgodę dopiero po kliknięciu w nim, więc wystarczy je
schować), SwG Google News, znaczek reCAPTCHA.

**Co robi rozszerzenie.**

1. **Reguły sieciowe** blokują `optad360.io/.net`, `optad360-video.com`,
   `statsforads.com` (`#optadScript`), `onnetwork.tv`, `doubleclick.net`,
   `googlesyndication.com`, `googleadservices.com`, `adtrafficquality.google`,
   `fundingchoicesmessages.google.com`, `news.google.com/swg/`, prebid
   i openplayer z jsDelivr oraz analitykę (`googletagmanager.com`,
   `google-analytics.com`) — tylko dla żądań wychodzących z `limanowa.in`
   (`initiatorDomains`), więc reszta internetu tego nie odczuwa. Bez tego
   ukryte przez CSS reklamy wideo dalej by się ładowały i grały w tle.
   Nietknięte: sam portal, `img.limanowa.in`, fonty, reCAPTCHA (formularze
   komentarzy), Firebase.
2. **CSS** chowa resztę: banery portalu, puste sloty, okna i okienka,
   okruszki, reakcje, udostępnianie, pogodę i ikonki z paska, boczną kolumnę,
   „Może Cię zaciekawić", ostatnie komentarze, stopkę, sekcje płatne ze
   strony głównej (`:has()` po linku `/materialy-partnerow`) oraz
   „Region - Polska - Świat", „Sport" i „Felietony" (`:has()` po linku
   `/kategoria/felietony`).
3. **Układ do czytania** na stronach szczegółów (listy mają
   `.newsDetails__top--wrap` i zostają w siatce): jedna kolumna 760 px
   (galeria 1100 px), tytuł 36 px, tekst 20 px szeryfowym krojem
   (Charter → Georgia) z interlinią 1.7, cytaty z kreską zamiast
   80-pikselowych cudzysłowów, miniatury zdjęć w rzędzie pod głównym. Do
   650 px mniejsze stopnie. Na szerokim ekranie menu przestaje być
   przyklejone; do 1024 px `header` to wysuwane menu, a przyklejony pasek
   to `.quickNavigation` — tam układ zostaje.
4. **Skrypt** stawia atrybut od razu (bez czekania na `chrome.storage`,
   żeby nie mignęła strona z banerami), wstawia przycisk „Pokaż komentarze
   (N)" przed schowanymi komentarzami i zdejmuje dymek toastr „Wykryliśmy że
   korzystasz z Adblocka" — `app.js` pokazuje go, gdy `#optadScript` nie
   dojedzie. Inne dymki (np. po dodaniu komentarza) zostają.

## Daty wpisów: limanowa.in

Kafelki na stronie głównej to samo zdjęcie i tytuł, ułożone w mozaikę
w kolejności redakcji — nie widać, co jest z dziś, a co wisi od dwóch dni. Daty są gdzie indziej (stan: wrzesień 2026):

- **kanał `/rss`** — 50 najnowszych aktualności z godziną publikacji
  (`pubDate` w ISO) i kategorią (`<category>` = `articleSection` wpisu:
  Newsroom, Kronika policyjna, Felietony…); bez „Region - Polska - Świat",
  sport ma osobny `/rss/sport` — pomijany, jak cała sekcja;
- **listy kategorii** (`/pap`, `/urzedy/kategoria/…`,
  `/aktualnosci/kategoria/…`, `/aktualnosci`) — 16 wpisów na stronę
  z samą datą (`.newsList-item__data` „26.09.2026"); skrzynki na stronie
  głównej linkują do swojej kategorii w nagłówku;
- **strona wpisu** — JSON-LD `datePublished` i `dateModified`, na stronie
  „Opublikowano … Zaktualizowano …". `dateModified` to zwykle poprawka
  literówki kilka minut po publikacji, więc na kafelkach go nie ma.

**Co robi rozszerzenie** (`limanowa-daty.js`, `limanowa-daty.css`, atrybut
`html[data-ls-daty]`, włącznik `ustawienia.limanowa.daty`; działa z czytnikiem
i bez niego):

1. Na stronie głównej pobiera kanał, a dla kafelków spoza kanału — listę
   ich kategorii (tylko gdy któryś kafelek nie ma jeszcze daty). Kilka
   kafelków, których nie ma na pierwszej stronie listy, dostaje datę ze
   strony wpisu (najwyżej 6 na wejście, po kolei). Schowane kafelki
   (np. „Materiały partnerów" pod czytnikiem) nic nie kosztują.
2. Daty trzyma `chrome.storage.local` (`limanowaDaty`) przez 45 dni — data
   publikacji się nie zmienia, więc każdy wpis pobiera się raz. Kanał
   najwyżej co 5 minut, lista co 15; typowe wejście po pierwszym to jedno
   żądanie o kanał. Wszystko to GET-y do limanowa.in bez ciasteczek.
3. Znaczek z datą: zielony „dziś 05:30", granatowy „wczoraj 16:25", szary
   „3 dni temu" / „12.09" (z listy — bez godziny). Po najechaniu pełna
   data. Na kafelkach skrzynek siedzi nad tytułem.
4. Mozaikę głównej sekcji (`.homepage__top`) zastępuje lista od
   najnowszego: miniatura, znaczek, tytuł, liczba komentarzy (przeczytane
   szare przez `:visited`). Sama data z listy liczy się jako północ, wpisy
   bez daty idą na koniec w kolejności redakcji, sloty reklam odpadają.
   Dopóki nowe wpisy nie mają dat, zostaje mozaika — lista nie przeskakuje.
5. Z listy wypadają felietony (kategoria z kanału, `pamiec.kategorie`),
   wpisy z działu `/sport/` i codzienne „Odeszli w ostatnich dniach…"
   (po początku tytułu — końcówka się zmienia: „...", „…", „(AKTUALIZACJA)";
   pojedyncze wspomnienia typu „Odszedł …" zostają). Teksty o sporcie, które redakcja wrzuca do
   „Newsroomu" (bez tagów i innej kategorii), zostają — nic ich pewnie nie
   odróżnia od zwykłych wiadomości, a filtr po słowach mógłby schować coś
   ważnego.
6. Po powrocie do karty znaczki i lista przeliczają „dziś" na nowo; nowe
   wpisy dopiero po przeładowaniu.

## Testy

Cztery atrapy w `test/`, bez kontaktu z prawdziwymi stronami:

```bash
php -S localhost:8000
```

(uruchomione w tym katalogu). Klik **uruchom testy** albo `?auto=1`
w adresie.

- `http://localhost:8000/test/mock-medium.html` — Medium w pigułce:
  tokeny `:root` jak z żywej strony, klasy atomowe Feli, arkusze
  z `media="print"` i `media="all and …"`, SVG z `fill`, gist z jasnym
  arkuszem, obrazek w `article`, do tego `medium-dark.css` z manifestu. Bez
  `chrome.storage` skrypt tylko wystawia `__lsDark`, a test sam włącza motyw
  i czyta kolory wyliczone przez przeglądarkę: czyste funkcje (mapowanie
  kolorów, gradienty, `url(#id)`, prefiksowanie list selektorów, `:root`),
  tokeny i klasy po włączeniu, `light-dark()` składni, media, brak bliźniaków
  dla własnych reguł, reguła z `insertRule` (zegar), nowy `<style>`
  (obserwator), podmiana `fill` w locie, wyłączenie i ponowne włączenie bez
  duplikatów.
- `http://localhost:8000/test/mock-qnews.html` — motyw „q"
  w pigułce: gradient na `html/body`, biała karta z 60-pikselowym cieniem,
  kremowy blok, brązowy blok Info z białym tekstem, beżowy guzik, akapit
  wklejony z Worda ze stylami inline (`background-color: #fff`), `url(#id)`
  obok koloru w `style=""`, logo, obrazek w treści, do tego `qnews-dark.css`.
  Sprawdza paletę, ciemne i kolorowe cienie bez zmian a jasną łunę
  odwróconą, przepisanie stylów inline i ich powrót po wyłączeniu (także po
  podmianie stylu przez stronę w trakcie), filtr na logo.
- `http://localhost:8000/test/mock-limanowa.html` — szkielet
  limanowa.in z klasami z żywej strony: banery, przyklejone menu, sloty
  optad360 (także w treści z `<video>` i między komentarzami), boczna
  kolumna, cytat z pseudo-cudzysłowami, okno zgody z `body overflow:
  hidden`, okienko powiadomień, pasek na dole, sekcje płatne, „Region -
  Polska - Świat", „Sport" i „Felietony" ze strony głównej, do tego
  `limanowa-czytnik.css`. Sprawdza, że 28 śmieci znika
  a treść zostaje, układ kolumny i kroje (próg 650 px i 1024 px zależnie od
  szerokości okna), przycisk komentarzy, zdjęcie dymku o Adblocku przy
  zostawieniu innych, powrót strony po wyłączeniu, a na koniec
  `limanowa-reguly.json` (tylko `initiatorDomains: limanowa.in`, żadnej
  blokady portalu, reCAPTCHA ani fontów) i wpisy w manifeście.
- `http://localhost:8000/test/mock-limanowa-daty.html` — strona główna
  limanowa.in w pigułce: główna sekcja z dużym kafelkiem (komentarze obok
  SVG z liczbami Illustratora), zwykłymi (zdjęcie z `src`, z `data-med-src`
  i bez zdjęcia), felietonem, wpisem z działu sport, „Odeszli w ostatnich
  dniach…", slotem reklamy i obcym adresem; kafelki „static" ze zdjęciem na float, skrzynka z kategorią
  w nagłówku, schowana skrzynka partnerów, galeria, do tego
  `limanowa-daty.css`. `fetch` i czas są podstawione (sobota 26.09.2026,
  12:00): kanał RSS z kategoriami i złą datą, listy kategorii, strona wpisu
  z JSON-LD i jedna 404. Sprawdza etykiety (też doby 23- i 25-godzinne przy
  zmianie czasu), odmianę „komentarz/komentarze/komentarzy", klucze wpisów,
  znaczki na kafelkach skrzynek i ich miejsce, listę pobrań (każde raz, bez
  sportu, bez ciasteczek), listę głównej sekcji (kolejność od najnowszego,
  bez felietonu, działu sport, nekrologów i reklamy, komentarze, miniatury), pamięć przy
  kolejnych wejściach (minuta, 6 i 16 minut, następny ranek, przycinanie
  dat i kategorii po 50 dniach), wyłączenie i ponowne włączenie, wpisy
  w manifeście i ustawieniach.

Na żywej stronie: panel przeglądarki w Claude Code nie ładuje rozszerzeń,
a `<script src="http://localhost:…">` z cudzej strony jest blokowany — kod
trzeba wkleić (silnik + plik strony przez `javascript_tool`, CSS jako
`<style>`) i włączyć przez `__lsDark.wlacz()` / `__lsCzytnik.wlacz()`
(daty: `__lsDaty.wlacz(); __lsDaty.odswiez()` — bez `chrome.storage` pamięć
dat żyje tylko do przeładowania karty).
Reguł sieciowych tak się nie sprawdzi — tylko w Chrome z wczytanym
rozszerzeniem (DevTools → Network).

## Pliki

| plik | rola |
| --- | --- |
| `manifest.json` | content scripty per strona, zestaw reguł `limanowa`, ikona otwiera ustawienia |
| `background.js` | service worker: przełącza reguły sieciowe czytnika, otwiera ustawienia |
| `ustawienia.js` | domyślne ustawienia, odczyt i zapis (`chrome.storage.sync`) |
| `options.html`, `options.js` | strona ustawień — przełączniki zapisywane od razu |
| `ciemny-motyw.js` | silnik ciemnego motywu: lustro arkuszy z odwróconą jasnością, SVG, style inline, zegar i obserwator, włącznik z `chrome.storage` |
| `medium-dark.js`, `medium-dark.css` | paleta Medium + statyczna część motywu (tło, podkład pod PNG, gisty) |
| `qnews-dark.js`, `qnews-dark.css` | paleta qnews.pl + statyczna część motywu (tło, odwrócone logo, podkład pod obrazki) |
| `limanowa-czytnik.js`, `limanowa-czytnik.css` | czytnik limanowa.in: chowanie śmieci, kolumna do czytania, przycisk komentarzy, zdjęcie dymku o Adblocku |
| `limanowa-reguly.json` | reguły declarativeNetRequest: sieć reklamowa i analityka, tylko dla żądań z limanowa.in |
| `limanowa-daty.js`, `limanowa-daty.css` | daty wpisów limanowa.in: główna sekcja jako lista od najnowszego (bez felietonów, działu sport i nekrologów), znaczki na kafelkach skrzynek, pamięć dat w `chrome.storage.local` |
| `icons/` | ikona (linie tekstu + półksiężyc) |
| `test/` | atrapy z testami |

## Czego to nie robi

- nie działa poza stronami z `matches` w manifeście,
- na Medium i qnews.pl tylko czyta arkusze stylów i dokłada własny — bez
  klikania i bez żądań sieciowych,
- na limanowa.in chowa elementy, blokuje żądania do sieci reklamowej
  wychodzące z tej jednej strony i pobiera z niej kanał RSS, listy kategorii
  i pojedyncze strony wpisów (same GET-y, bez ciasteczek) — niczego nie
  klika i nie wysyła,
- nie zbiera ani nie wysyła żadnych danych.
