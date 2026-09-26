// Daty wpisów na limanowa.in — content script (document_start) do
// limanowa-daty.css.
//
// Kafelki na stronie głównej mają tylko zdjęcie i tytuł, więc nie widać, co
// jest z dziś, a co wisi od dwóch dni. Daty są w trzech miejscach (stan:
// wrzesień 2026):
//   - kanał /rss — 50 najnowszych aktualności (bez „Region - Polska - Świat";
//     sport ma osobny /rss/sport, pomijany jak cała sekcja) z godziną
//     publikacji w pubDate;
//   - listy kategorii (/pap, /urzedy/kategoria/…, /aktualnosci/kategoria/…) —
//     16 wpisów na stronę z samą datą (.newsList-item__data „26.09.2026");
//     skrzynki na stronie głównej linkują do swojej kategorii w nagłówku;
//   - strona wpisu (JSON-LD datePublished) — w ostateczności, dla kilku
//     kafelków, których nie ma ani w kanale, ani na pierwszej stronie listy.
// Data publikacji się nie zmienia, więc każdy wpis pobiera się raz i leży
// w chrome.storage.local (klucz `limanowaDaty`); kanał co 5 minut, listę
// kategorii tylko wtedy, gdy któryś jej kafelek nie ma jeszcze daty.
// Wszystko to zwykłe GET-y do limanowa.in bez ciasteczek.
//
// Na kafelku znaczek nad tytułem: „dziś 05:30", „wczoraj 16:25",
// „3 dni temu", „12.09". Mozaikę głównej sekcji (.homepage__top — duży
// kafelek, małe i sloty reklam w kolejności redakcji) zastępuje lista od
// najnowszego: miniatura, znaczek, tytuł, komentarze. Bez felietonów
// (kategoria z kanału, jak skrzynkę „Felietony" chowa czytnik), wpisów
// z działu /sport/ i codziennego „Odeszli w ostatnich dniach…" (po tytule).
// Teksty o sporcie, które redakcja wrzuca do „Newsroomu", zostają — nic ich
// pewnie nie odróżnia od zwykłych wiadomości.
//
// Włącznik: ustawienia → „daty wpisów na limanowa.in" (chrome.storage.sync,
// `ustawienia.limanowa.daty`, domyślnie włączony).

(() => {
  const ATRYBUT = 'data-ls-daty';
  const KLUCZ_PAMIECI = 'limanowaDaty';
  const KANAL = '/rss';
  const MINUTA = 60e3, DZIEN = 864e5;
  const WAZNOSC_KANALU = 5 * MINUTA;
  const WAZNOSC_LISTY = 15 * MINUTA;
  const PONOWNIE_WPIS = DZIEN;         // strona wpisu bez daty — nie próbuj częściej
  const MAKS_WPISOW = 6;               // tyle stron wpisów najwyżej na jedno wejście
  const TRZYMAJ = 45 * DZIEN;
  const POMIJANE_KATEGORIE = new Set(['Felietony']);   // <category> z kanału = articleSection wpisu
  const POMIJANE_DZIALY = new Set(['sport']);          // pierwszy człon adresu
  // Codzienne zestawienie nekrologów (kategoria „Ludzie"); końcówka tytułu
  // się zmienia: „...", „…", „....", „... (AKTUALIZACJA)".
  const POMIJANE_TYTULY = [/^Odeszli w ostatnich dniach/i];
  const html = document.documentElement;
  const magazyn = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  // wpisy: klucz → ISO z godziną (kanał, JSON-LD) albo 'RRRR-MM-DD' (lista);
  // kategorie: klucz → kategoria z kanału; pobrane: adres → kiedy.
  let pamiec = null;
  let trwa = null;

  // „/aktualnosci/spor-o-…/84198" → „aktualnosci/84198". Slug poprawiają
  // razem z tytułem, dział i numer zostają.
  function kluczWpisu(href) {
    let u;
    try { u = new URL(href, location.origin); } catch (e) { return null; }
    if (u.origin !== location.origin && !/(^|\.)limanowa\.in$/.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/([a-z-]+)\/[^/]+\/(\d+)\/?$/);
    return m ? `${m[1]}/${m[2]}` : null;
  }

  const poczatekDnia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const zGodzina = (w) => w.length > 10;
  const naDate = (w) => zGodzina(w) ? new Date(w) : new Date(+w.slice(0, 4), +w.slice(5, 7) - 1, +w.slice(8, 10));
  const godzina = (d) => d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const pelnaData = (d) => d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  function etykieta(wartosc, teraz = Date.now()) {
    const data = naDate(wartosc);
    // Różnica dni kalendarzowych; round, bo przy zmianie czasu doba ma 23 albo 25 h.
    const dni = Math.round((poczatekDnia(new Date(teraz)) - poczatekDnia(data)) / DZIEN);
    const g = zGodzina(wartosc) ? ' ' + godzina(data) : '';
    const tytul = `Opublikowano ${pelnaData(data)}${g}`;
    if (dni <= 0) return { tekst: 'dziś' + g, stopien: 'dzis', tytul };
    if (dni === 1) return { tekst: 'wczoraj' + g, stopien: 'wczoraj', tytul };
    if (dni < 7) return { tekst: `${dni} dni temu`, stopien: 'starsze', tytul };
    return { tekst: pelnaData(data).slice(0, 5), stopien: 'starsze', tytul };
  }

  // odmiana(5, ['komentarz', 'komentarze', 'komentarzy']) → „5 komentarzy"
  function odmiana(n, [jeden, kilka, wiele]) {
    const d = n % 10, s = n % 100;
    if (n === 1) return `1 ${jeden}`;
    if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return `${n} ${kilka}`;
    return `${n} ${wiele}`;
  }

  // ---------- pamięć ----------

  async function wczytajPamiec() {
    if (pamiec) return pamiec;
    let zapisana = null;
    try { zapisana = magazyn && (await magazyn.get(KLUCZ_PAMIECI))[KLUCZ_PAMIECI]; } catch (e) { /* pusta */ }
    pamiec = { wpisy: {}, kategorie: {}, pobrane: {}, ...(zapisana || {}) };
    return pamiec;
  }

  function przytnijPamiec(teraz) {
    for (const [k, w] of Object.entries(pamiec.wpisy)) if (teraz - naDate(w) > TRZYMAJ) delete pamiec.wpisy[k];
    for (const k of Object.keys(pamiec.kategorie)) if (!pamiec.wpisy[k]) delete pamiec.kategorie[k];
    for (const [u, t] of Object.entries(pamiec.pobrane)) if (teraz - t > 2 * DZIEN) delete pamiec.pobrane[u];
  }

  async function zapiszPamiec(teraz) {
    przytnijPamiec(teraz);
    try { if (magazyn) await magazyn.set({ [KLUCZ_PAMIECI]: pamiec }); } catch (e) { /* zostaje w pamięci karty */ }
  }

  // Data z godziną wygrywa z samą datą z listy.
  function zapamietaj(klucz, wartosc) {
    if (!klucz || !wartosc) return;
    if (!zGodzina(wartosc) && pamiec.wpisy[klucz] && zGodzina(pamiec.wpisy[klucz])) return;
    pamiec.wpisy[klucz] = wartosc;
  }

  // ---------- źródła dat ----------

  async function pobierz(url) {
    const odp = await fetch(url, { credentials: 'omit' });
    if (!odp.ok) throw new Error(`${url}: ${odp.status}`);
    return odp.text();
  }

  async function odswiezKanal(teraz) {
    if (teraz - (pamiec.pobrane[KANAL] || 0) < WAZNOSC_KANALU) return;
    pamiec.pobrane[KANAL] = teraz;
    let xml;
    try { xml = new DOMParser().parseFromString(await pobierz(KANAL), 'text/xml'); } catch (e) { return; }
    for (const item of xml.querySelectorAll('item')) {
      const link = item.querySelector('link')?.textContent.trim();
      const data = new Date(item.querySelector('pubDate')?.textContent.trim());
      const klucz = link && kluczWpisu(link);
      if (!klucz || isNaN(data)) continue;
      zapamietaj(klucz, data.toISOString());
      const kategoria = item.querySelector('category')?.textContent.trim();
      if (kategoria) pamiec.kategorie[klucz] = kategoria;
    }
  }

  async function odswiezListe(url, teraz) {
    if (teraz - (pamiec.pobrane[url] || 0) < WAZNOSC_LISTY) return;
    pamiec.pobrane[url] = teraz;
    let dok;
    try { dok = new DOMParser().parseFromString(await pobierz(url), 'text/html'); } catch (e) { return; }
    for (const a of dok.querySelectorAll('a.newsList-item')) {
      const m = a.querySelector('.newsList-item__data')?.textContent.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (m) zapamietaj(kluczWpisu(a.getAttribute('href')), `${m[3]}-${m[2]}-${m[1]}`);
    }
  }

  async function odswiezWpis(kafelek, teraz) {
    pamiec.pobrane[kafelek.sciezka] = teraz;
    try {
      const m = (await pobierz(kafelek.sciezka)).match(/"datePublished"\s*:\s*"([^"]+)"/);
      const data = m && new Date(m[1]);
      if (data && !isNaN(data)) zapamietaj(kafelek.klucz, data.toISOString());
    } catch (e) { /* bez znaczka */ }
  }

  // ---------- kafelki ----------

  const tytulKafelka = (el) => (el.querySelector('.title') || el.querySelector('a[href]')).textContent.trim();

  // Wpis, którego nie pokazujemy w liście głównej sekcji.
  function pominiety(el, klucz) {
    if (POMIJANE_TYTULY.some((wzor) => wzor.test(tytulKafelka(el)))) return true;
    return !!klucz && (POMIJANE_DZIALY.has(klucz.split('/')[0]) || POMIJANE_KATEGORIE.has(pamiec.kategorie[klucz]));
  }

  // Skąd brać datę kafelka spoza kanału: skrzynki („Felietony", „PAP",
  // urzędy…) mają w nagłówku link do kategorii, reszta — lista swojego
  // działu (/aktualnosci to wszystkie kategorie naraz).
  function listaDlaKafelka(el, klucz) {
    const naglowek = el.closest('.homepageThreeBoxesNews__box')?.querySelector('.heading a[href]');
    if (naglowek) return new URL(naglowek.getAttribute('href'), location.origin).pathname;
    return '/' + klucz.split('/')[0];
  }

  // Widoczne kafelki wpisów — schowane (np. „Materiały partnerów" pod
  // czytnikiem) nie kosztują żadnego pobrania. Wyjątek: główna sekcja, którą
  // chowa nasza własna lista — tam odpadają tylko wpisy spoza listy.
  function kafelki() {
    const wynik = [];
    for (const el of document.querySelectorAll('.news-item')) {
      const a = el.querySelector('a[href]');
      const klucz = a && kluczWpisu(a.getAttribute('href'));
      const glowny = !!el.closest('.homepage__top');
      if (!klucz || (glowny ? pominiety(el, klucz) : !el.getClientRects().length)) continue;
      wynik.push({ el, klucz, glowny, sciezka: new URL(a.href).pathname });
    }
    return wynik;
  }

  function nowyZnaczek(wartosc, teraz) {
    const e = etykieta(wartosc, teraz);
    const znaczek = element('span', `ls-data ls-data--${e.stopien}`, e.tekst);
    znaczek.title = e.tytul;
    return znaczek;
  }

  function rysujZnaczki(teraz) {
    for (const k of kafelki()) {
      const wartosc = !k.glowny && pamiec.wpisy[k.klucz];
      if (!wartosc) continue;
      const znaczek = nowyZnaczek(wartosc, teraz);
      const stary = k.el.querySelector('.ls-data');
      const tytul = k.el.querySelector('.title');
      if (stary) stary.replaceWith(znaczek);
      else if (tytul) tytul.before(znaczek);
      else k.el.querySelector('a[href]').append(znaczek);
    }
  }

  // ---------- główna sekcja jako lista ----------

  function element(tag, klasa, tekst) {
    const e = document.createElement(tag);
    if (klasa) e.className = klasa;
    if (tekst != null) e.textContent = tekst;
    return e;
  }

  // Od najnowszego; sama data z listy liczy się jako północ (pod wpisami
  // z godziną z tego dnia), bez daty — na koniec w kolejności redakcji.
  function wierszeListy() {
    const wiersze = [];
    for (const [i, el] of [...document.querySelectorAll('.homepage__top .news-item')].entries()) {
      const a = el.querySelector('a[href]');
      if (!a) continue;                                    // slot reklamy
      const klucz = kluczWpisu(a.getAttribute('href'));
      if (pominiety(el, klucz)) continue;
      const wartosc = klucz && pamiec.wpisy[klucz];
      wiersze.push({ el, a, i, wartosc, czas: wartosc ? naDate(wartosc).getTime() : -Infinity });
    }
    return wiersze.sort((x, y) => y.czas - x.czas || x.i - y.i);
  }

  function rysujListe(teraz, koniec) {
    const siatka = document.querySelector('.homepage__top');
    if (!siatka) return;
    const wiersze = wierszeListy();
    // Zanim dojadą daty nowych wpisów, zostaje mozaika — lepiej niż lista,
    // która za chwilę przeskoczy.
    if (!koniec && !document.querySelector('.ls-lista') && wiersze.some((w) => !w.wartosc)) return;
    const ol = element('ol', 'ls-lista');
    for (const w of wiersze) {
      const a = element('a');
      a.href = w.a.getAttribute('href');
      const img = w.el.querySelector('img');
      const src = img && (img.dataset.medSrc || img.getAttribute('src') || img.dataset.src);
      if (src) {
        const zdjecie = element('img', 'ls-lista__zdjecie');
        zdjecie.src = src;
        zdjecie.alt = '';
        zdjecie.loading = 'lazy';
        a.append(zdjecie);
      } else {
        a.append(element('span', 'ls-lista__zdjecie'));
      }
      const tekst = element('span', 'ls-lista__tekst');
      if (w.wartosc) tekst.append(nowyZnaczek(w.wartosc, teraz));
      tekst.append(element('span', 'ls-lista__tytul', tytulKafelka(w.el)));
      // „Komentarze" to goły tekst obok ikony w .stats (w SVG są liczby z komentarzy Illustratora).
      const stats = w.el.querySelector('.stats');
      const komentarze = stats ? +[...stats.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim() : 0;
      if (komentarze > 0) tekst.append(element('span', 'ls-lista__komentarze', odmiana(komentarze, ['komentarz', 'komentarze', 'komentarzy'])));
      a.append(tekst);
      const li = element('li');
      li.append(a);
      ol.append(li);
    }
    const stara = document.querySelector('.ls-lista');
    if (stara) stara.replaceWith(ol); else siatka.before(ol);
  }

  // ---------- przebieg ----------

  function rysuj(teraz, koniec = false) {
    if (!html.hasAttribute(ATRYBUT) || !pamiec) return;
    rysujZnaczki(teraz);
    rysujListe(teraz, koniec);
  }

  function odswiez(teraz = Date.now()) {
    if (trwa) return trwa;
    trwa = (async () => {
      await wczytajPamiec();
      const naStronie = kafelki();
      if (!naStronie.length && !document.querySelector('.homepage__top')) return;
      rysuj(teraz);
      await odswiezKanal(teraz);
      rysuj(teraz);
      const bezDaty = () => kafelki().filter((k) => !pamiec.wpisy[k.klucz]);
      const listy = new Set(bezDaty().map((k) => listaDlaKafelka(k.el, k.klucz)));
      await Promise.all([...listy].map((url) => odswiezListe(url, teraz)));
      rysuj(teraz);
      // Po kolei, żeby nie zasypać portalu naraz.
      const doStron = bezDaty().filter((k) => teraz - (pamiec.pobrane[k.sciezka] || 0) >= PONOWNIE_WPIS).slice(0, MAKS_WPISOW);
      for (const k of doStron) await odswiezWpis(k, teraz);
      rysuj(teraz, true);
      await zapiszPamiec(teraz);
    })().finally(() => { trwa = null; });
    return trwa;
  }

  function poZaladowaniu(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function wlacz() {
    html.setAttribute(ATRYBUT, '');
    poZaladowaniu(() => { if (html.hasAttribute(ATRYBUT)) odswiez(); });
  }

  function wylacz() {
    html.removeAttribute(ATRYBUT);
    for (const e of document.querySelectorAll('.ls-data, .ls-lista')) e.remove();
  }

  const czyWlaczoneWUstawieniach = (u) => (u && u.limanowa && u.limanowa.daty) !== false;

  async function start() {
    let ustawienia = null;
    try { ustawienia = (await chrome.storage.sync.get('ustawienia')).ustawienia; } catch (e) { /* domyślnie włączone */ }
    if (czyWlaczoneWUstawieniach(ustawienia)) wlacz();
    chrome.storage.onChanged.addListener((zmiany, obszar) => {
      if (obszar !== 'sync' || !zmiany.ustawienia) return;
      if (czyWlaczoneWUstawieniach(zmiany.ustawienia.newValue)) wlacz(); else wylacz();
    });
    // Karta otwarta od wczoraj — po powrocie „dziś" ma znaczyć dziś.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') rysuj(Date.now(), true);
    });
  }

  // W rozszerzeniu: rusza od razu. Na stronie testowej (bez chrome.storage)
  // tylko wystawia API — test/mock-limanowa-daty.html podstawia fetch i czas.
  globalThis.__lsDaty = {
    wlacz: () => html.setAttribute(ATRYBUT, ''), wylacz, odswiez, etykieta, odmiana, kluczWpisu,
    czyWlaczoneWUstawieniach, pamiec: () => pamiec, wyczyscPamiec: () => { pamiec = null; },
  };
  if (magazyn && chrome.storage.sync) start();
})();
