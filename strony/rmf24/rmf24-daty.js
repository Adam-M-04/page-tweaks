// Godzina dodania wpisu na kafelkach rmf24.pl — content script
// (document_start) do rmf24-daty.css.
//
// Na stronie głównej (stan: wrzesień 2026) większość kafelków to samo
// zdjęcie i tytuł: czołówka (article.news-card.main-hero i cztery obok),
// siatka „Najważniejsze Fakty" (data jest, ale w .top-stories-mobile-meta,
// które Bootstrap pokazuje tylko poniżej 768 px), „Regiony w RMF24", „Radio
// RMF24" i kolumny działów na dole (kafelek i trzy linki .category-links).
// Swoją datę mają „Najnowsze Rozmowy" (.dark-card), podcasty i listy działów
// (article.cat-card) — tych nie ruszamy.
//
// Skąd data (klucz: numer wpisu z adresu „…,nIdn,1019291"):
//   - z samej strony: napisy „Dzisiaj, 26 września (12:28)", „Czwartek,
//     24 września (18:00)", „Niedziela, 20 września 2026 (09:23)" przy
//     linkach do wpisów (.top-stories-mobile-meta, .rozmowy-timestamp,
//     .cat-card__date, .mrf-date w panelu „Najpopularniejsze");
//   - kanał /feed — 50 najnowszych wpisów (mniej więcej doba) z pubDate;
//   - strona wpisu (JSON-LD datePublished) — dla kilku kafelków, których nie
//     ma nigdzie indziej (starsze rozmowy, kolumny działów).
// Data publikacji się nie zmienia, więc każdy wpis ustala się raz i leży
// w chrome.storage.local (klucz `rmf24Daty`); kanał najwyżej co 5 minut
// i tylko wtedy, gdy któryś widoczny kafelek nie ma jeszcze daty. Wszystko
// to zwykłe GET-y do rmf24.pl bez ciasteczek.
//
// Znaczek nad tytułem, w stylu dat z list działów: „14:56", „wczoraj 23:18",
// „24.09 10:35"; pełna data w podpowiedzi. Znane daty rysują się już
// w trakcie wczytywania strony (MutationObserver), więc kafelki nie
// przeskakują.
//
// Włącznik: ustawienia → rmf24.pl → „Godzina dodania na kafelkach"
// (chrome.storage.sync, `ustawienia.rmf24.daty`, domyślnie włączony).

(() => {
  const ATRYBUT = 'data-ls-daty';
  const KLUCZ_PAMIECI = 'rmf24Daty';
  const KANAL = '/feed';
  const MINUTA = 60e3, DZIEN = 864e5;
  const WAZNOSC_KANALU = 5 * MINUTA;
  const PONOWNIE_WPIS = DZIEN;         // strona wpisu bez daty — nie próbuj częściej
  const MAKS_WPISOW = 12;              // tyle stron wpisów najwyżej na jedno wejście
  const TRZYMAJ = 45 * DZIEN;
  const KAFELKI = 'article.news-card:not(.dark-card), .category-links > li';
  const NAPISY = '.top-stories-mobile-meta time, .cat-card__date, .rozmowy-timestamp, .mrf-date';
  const LINK = 'a[href*=",nIdn,"]';
  const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const WZOR_NAPISU = new RegExp(`(\\d{1,2}) (${MIESIACE.join('|')})(?: (\\d{4}))? \\((\\d{1,2}):(\\d{2})\\)`, 'i');
  const html = document.documentElement;
  const magazyn = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  // wpisy: numer → ISO; pobrane: '/feed' albo numer wpisu → kiedy.
  let pamiec = null;
  let trwa = null;
  let obserwator = null;

  // „/fakty/polska/news-nawrocki-…,nIdn,1019291" (też pełny adres z ?utm_rs=…) → „1019291".
  function numerWpisu(href) {
    let u;
    try { u = new URL(href, location.origin); } catch (e) { return null; }
    if (u.origin !== location.origin && !/(^|\.)rmf24\.pl$/.test(u.hostname)) return null;
    const m = u.pathname.match(/,nIdn,(\d+)(?:,|$)/);
    return m ? m[1] : null;
  }

  // „Dzisiaj, 26 września (12:28)" → Date. Rok strona pisze tylko przy
  // starszych; bez roku „31 grudnia" oglądane 1 stycznia to zeszły rok.
  function zNapisu(tekst, teraz = Date.now()) {
    const m = tekst.replace(/\s+/g, ' ').match(WZOR_NAPISU);
    if (!m) return null;
    const rok = m[3] ? +m[3] : new Date(teraz).getFullYear();
    const data = new Date(rok, MIESIACE.indexOf(m[2].toLowerCase()), +m[1], +m[4], +m[5]);
    if (!m[3] && data - teraz > DZIEN) data.setFullYear(rok - 1);
    return data;
  }

  // Gotowe formatery: toLocaleTimeString za każdym razem buduje nowy, a to
  // kilkadziesiąt razy wolniej — przy rysowaniu z obserwatora ~15 ms zamiast ~1.
  const FORMAT_GODZINY = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const FORMAT_DATY = new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const poczatekDnia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const godzina = (d) => FORMAT_GODZINY.format(d);
  const pelnaData = (d) => FORMAT_DATY.format(d);

  function etykieta(data, teraz = Date.now()) {
    // Różnica dni kalendarzowych; round, bo przy zmianie czasu doba ma 23 albo 25 h.
    const dni = Math.round((poczatekDnia(new Date(teraz)) - poczatekDnia(data)) / DZIEN);
    const g = godzina(data);
    const tytul = `Opublikowano ${pelnaData(data)} ${g}`;
    if (dni <= 0) return { tekst: g, tytul };
    if (dni === 1) return { tekst: `wczoraj ${g}`, tytul };
    const dzien = data.getFullYear() === new Date(teraz).getFullYear() ? pelnaData(data).slice(0, 5) : pelnaData(data);
    return { tekst: `${dzien} ${g}`, tytul };
  }

  // ---------- pamięć ----------

  async function wczytajPamiec() {
    if (pamiec) return pamiec;
    let zapisana = null;
    try { zapisana = magazyn && (await magazyn.get(KLUCZ_PAMIECI))[KLUCZ_PAMIECI]; } catch (e) { /* pusta */ }
    pamiec = { wpisy: {}, pobrane: {}, ...(zapisana || {}) };
    return pamiec;
  }

  function przytnijPamiec(teraz) {
    for (const [k, w] of Object.entries(pamiec.wpisy)) if (teraz - new Date(w) > TRZYMAJ) delete pamiec.wpisy[k];
    for (const [k, t] of Object.entries(pamiec.pobrane)) if (teraz - t > 2 * DZIEN) delete pamiec.pobrane[k];
  }

  async function zapiszPamiec(teraz) {
    przytnijPamiec(teraz);
    try { if (magazyn) await magazyn.set({ [KLUCZ_PAMIECI]: pamiec }); } catch (e) { /* zostaje w pamięci karty */ }
  }

  // ---------- źródła dat ----------

  function zbierzZeStrony(teraz) {
    for (const napis of document.querySelectorAll(NAPISY)) {
      const blok = napis.closest(`${LINK}, article, li`);
      const link = blok && (blok.matches(LINK) ? blok : blok.querySelector(LINK));
      const numer = link && numerWpisu(link.getAttribute('href'));
      if (!numer || pamiec.wpisy[numer]) continue;
      const data = zNapisu(napis.textContent, teraz);
      if (data) pamiec.wpisy[numer] = data.toISOString();
    }
  }

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
      const numer = numerWpisu(item.querySelector('link')?.textContent.trim());
      const data = new Date(item.querySelector('pubDate')?.textContent.trim());
      if (numer && !isNaN(data)) pamiec.wpisy[numer] = data.toISOString();
    }
  }

  async function odswiezWpis(kafelek, teraz) {
    pamiec.pobrane[kafelek.numer] = teraz;
    try {
      const m = (await pobierz(kafelek.sciezka)).match(/"datePublished"\s*:\s*"([^"]+)"/);
      const data = m && new Date(m[1]);
      if (data && !isNaN(data)) pamiec.wpisy[kafelek.numer] = data.toISOString();
    } catch (e) { /* bez znaczka */ }
  }

  // ---------- kafelki ----------

  function kafelki() {
    const wynik = [];
    for (const el of document.querySelectorAll(KAFELKI)) {
      const a = el.querySelector(LINK);
      const numer = a && numerWpisu(a.getAttribute('href'));
      if (numer) wynik.push({ el, numer, sciezka: new URL(a.href).pathname });
    }
    return wynik;
  }

  // Nad tytułem; w czołówce na kolorowym pasku z tytułem, w linkach pod
  // kafelkami działów — w wierszu przed tytułem. W trakcie wczytywania
  // kafelek może nie mieć jeszcze tytułu — wtedy false i dokończy go
  // następna paczka mutacji.
  function wstawZnaczek(el, znaczek) {
    const pasek = el.querySelector('.hero-title-overlay');
    const tytul = el.querySelector('h2, h3, h4');
    if (el.matches('li')) el.prepend(znaczek);
    else if (pasek) pasek.prepend(znaczek);
    else if (tytul && !el.matches('.main-hero')) tytul.before(znaczek);
    else return false;
    return true;
  }

  // Wołane też z obserwatora, więc rusza DOM tylko wtedy, gdy coś się
  // zmieniło — inaczej wołałoby samo siebie w kółko.
  function rysuj(teraz = Date.now()) {
    if (!html.hasAttribute(ATRYBUT) || !pamiec) return;
    zbierzZeStrony(teraz);
    for (const k of kafelki()) {
      const wartosc = pamiec.wpisy[k.numer];
      if (!wartosc) continue;
      const { tekst, tytul } = etykieta(new Date(wartosc), teraz);
      let znaczek = k.el.querySelector('.ls-data');
      if (!znaczek) {
        znaczek = document.createElement('time');
        znaczek.className = 'ls-data';
        if (!wstawZnaczek(k.el, znaczek)) continue;
      }
      if (znaczek.dateTime !== wartosc) znaczek.dateTime = wartosc;
      if (znaczek.title !== tytul) znaczek.title = tytul;
      if (znaczek.textContent !== tekst) znaczek.textContent = tekst;
    }
  }

  // ---------- przebieg ----------

  // Po wczytaniu strony: czego nie było na niej samej, z kanału, a resztę
  // ze stron wpisów. Schowane kafelki (sponsorowane, „Twoje Zdrowie" pod
  // „bez reklam") nie kosztują żadnego pobrania.
  function odswiez(teraz = Date.now()) {
    if (trwa) return trwa;
    trwa = (async () => {
      await wczytajPamiec();
      rysuj(teraz);
      const bezDaty = () => kafelki().filter((k) => !pamiec.wpisy[k.numer] && k.el.getClientRects().length);
      if (!bezDaty().length) return;
      await odswiezKanal(teraz);
      rysuj(teraz);
      // Po kolei, żeby nie zasypać portalu naraz; ten sam wpis bywa w kilku kafelkach.
      const doStron = [];
      for (const k of bezDaty()) {
        if (doStron.length >= MAKS_WPISOW) break;
        if (teraz - (pamiec.pobrane[k.numer] || 0) >= PONOWNIE_WPIS && !doStron.some((x) => x.numer === k.numer)) doStron.push(k);
      }
      for (const k of doStron) {
        await odswiezWpis(k, teraz);
        rysuj(teraz);
      }
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
    if (!obserwator) {
      obserwator = new MutationObserver(() => rysuj());
      obserwator.observe(document, { childList: true, subtree: true });
    }
    wczytajPamiec().then(() => rysuj());
    poZaladowaniu(() => { if (html.hasAttribute(ATRYBUT)) odswiez(); });
  }

  function wylacz() {
    html.removeAttribute(ATRYBUT);
    if (obserwator) { obserwator.disconnect(); obserwator = null; }
    for (const e of document.querySelectorAll('.ls-data')) e.remove();
  }

  const czyWlaczoneWUstawieniach = (u) => (u && u.rmf24 && u.rmf24.daty) !== false;

  async function start() {
    let ustawienia = null;
    try { ustawienia = (await chrome.storage.sync.get('ustawienia')).ustawienia; } catch (e) { /* domyślnie włączone */ }
    if (czyWlaczoneWUstawieniach(ustawienia)) wlacz();
    chrome.storage.onChanged.addListener((zmiany, obszar) => {
      if (obszar !== 'sync' || !zmiany.ustawienia) return;
      if (czyWlaczoneWUstawieniach(zmiany.ustawienia.newValue)) wlacz(); else wylacz();
    });
    // Karta otwarta od wczoraj — po powrocie „14:56" ma znaczyć dziś.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') rysuj();
    });
  }

  // W rozszerzeniu: rusza od razu. Na stronie testowej (bez chrome.storage)
  // tylko wystawia API — test/mock-rmf24-daty.html podstawia fetch i czas,
  // więc jej wlacz to sam atrybut; pełne (z obserwatorem, który rysuje
  // w bieżącym czasie) to wlaczZObserwatorem.
  globalThis.__lsDaty = {
    wlacz: () => html.setAttribute(ATRYBUT, ''), wlaczZObserwatorem: wlacz, wylacz, odswiez, rysuj, etykieta, zNapisu,
    numerWpisu, czyWlaczoneWUstawieniach, pamiec: () => pamiec, wyczyscPamiec: () => { pamiec = null; },
  };
  if (magazyn && chrome.storage.sync) start();
})();
