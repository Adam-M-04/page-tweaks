// Wpisy z X, Instagrama i Facebooka w artykułach rmf24.pl za przyciskiem —
// content script (document_start) do rmf24-wpisy.css.
//
// rmf24.pl (stan: wrzesień 2026, także w starych artykułach) osadza posty
// jako div.embed.embed-twitter-x / .embed-instagram-inpl / .embed-facebook-inpl:
// zaślepka z linkiem do wpisu (.x-/.ig-/.fb-embed-placeholder__link) plus
// ramka z platformy (X, Instagram) albo div.fb-post pod SDK Facebooka.
// app2.js strony pilnuje ich stanu (is-loading → is-loaded po zdarzeniu load
// ramki, is-fallback po 12–20 s bez niego) i daje wpisom z X min-height
// 520–560 px, więc dwa wpisy pod rząd to półtora ekranu.
//
// Ten skrypt wstawia przed każdym wpisem przycisk „Zobacz wpis @autor na X",
// a CSS chowa sam wpis; klik pokazuje go w tym samym miejscu. Ramki dostają
// prawdziwy src dopiero przy pierwszym pokazaniu (do tego czasu about:blank),
// więc schowane wpisy nie ściągają skryptów X i Instagrama. app2.js szuka
// ramki wpisu z X po src z platform.twitter.com albo po klasie x-embed-iframe
// — bez ramki od razu daje is-fallback i jego zaślepka zasłania potem wpis,
// więc odłożona ramka dostaje tę klasę. Wtedy load prawdziwej ramki i tak
// przestawia wpis na is-loaded (Instagram szuka po klasie ig-embed-iframe,
// którą ramka ma od strony). Wpis z Facebooka to od razu link — SDK
// Facebooka uruchamia dopiero okno zgody, które odcina „bez reklam", więc
// po rozwinięciu i tak zostałaby sama zaślepka.
//
// Włącznik: ustawienia → rmf24.pl → „Wpisy z X, Instagrama i Facebooka…"
// (chrome.storage.sync, `ustawienia.rmf24.wpisy`, domyślnie włączony).
// Wyłączenie od razu pokazuje wszystkie wpisy i wczytuje ich ramki.

(() => {
  const ATRYBUT = 'data-ls-wpisy';
  const OTWARTY = 'data-ls-wpis-otwarty';        // na wpisie: pokazany
  const WCZYTANY = 'data-ls-wpis-wczytany';      // na wpisie: ramki mają już prawdziwy src
  const Z_PRZYCISKIEM = 'data-ls-wpis-przycisk'; // na wpisie: przycisk już stoi przed nim
  const ODLOZONY_SRC = 'data-ls-src';            // na ramce: src czekający na pierwsze pokazanie
  const html = document.documentElement;
  let obserwator = null;

  const RODZAJE = [
    { klasa: 'embed-twitter-x', gdzie: 'na X', link: '.x-embed-placeholder__link', klasaRamki: 'x-embed-iframe', autor: /^\/([A-Za-z0-9_]{1,15})\/status\// },
    { klasa: 'embed-instagram-inpl', gdzie: 'na Instagramie', link: '.ig-embed-placeholder__link', autor: /^\/([A-Za-z0-9._]+)\/(?:p|reel|tv)\// },
    { klasa: 'embed-facebook-inpl', gdzie: 'na Facebooku', link: '.fb-embed-placeholder__link', naZewnatrz: true },
  ];
  const WPISY = RODZAJE.map((r) => '.' + r.klasa).join(', ');

  const rodzajWpisu = (wpis) => RODZAJE.find((r) => wpis.classList.contains(r.klasa));

  // twitter.com/PolskaPolicja/status/… → „@PolskaPolicja"; instagram.com/p/… → „".
  function autorWpisu(rodzaj, adres) {
    if (!rodzaj.autor || !adres) return '';
    try {
      const m = new URL(adres).pathname.match(rodzaj.autor);
      return m ? '@' + m[1] : '';
    } catch (e) { return ''; }
  }

  function opis(przycisk, wpis) {
    const { gdzie, autor } = przycisk.dataset;
    if (!wpis.hasAttribute(OTWARTY)) return ['Zobacz wpis', autor, gdzie].filter(Boolean).join(' ');
    return ['Schowaj wpis', autor].filter(Boolean).join(' ');
  }

  function wczytajRamki(wpis) {
    for (const ramka of wpis.querySelectorAll(`iframe[${ODLOZONY_SRC}]`)) {
      ramka.src = ramka.getAttribute(ODLOZONY_SRC);
      ramka.removeAttribute(ODLOZONY_SRC);
    }
    wpis.setAttribute(WCZYTANY, '');
  }

  // Parser może dopiero wstawiać ramkę — about:blank przerywa jej ładowanie.
  function odlozRamki(wpis, rodzaj) {
    if (wpis.hasAttribute(WCZYTANY)) return;
    for (const ramka of wpis.querySelectorAll(`iframe:not([${ODLOZONY_SRC}])`)) {
      const src = ramka.getAttribute('src');
      if (!src || src === 'about:blank') continue;
      if (rodzaj.klasaRamki) ramka.classList.add(rodzaj.klasaRamki);
      ramka.setAttribute(ODLOZONY_SRC, src);
      ramka.src = 'about:blank';
    }
  }

  function wstawPrzycisk(wpis, rodzaj) {
    const link = wpis.querySelector(rodzaj.link);
    if (!link || wpis.hasAttribute(Z_PRZYCISKIEM)) return;
    const przycisk = document.createElement(rodzaj.naZewnatrz ? 'a' : 'button');
    przycisk.className = 'ls-wpis';
    przycisk.dataset.gdzie = rodzaj.gdzie;
    przycisk.dataset.autor = autorWpisu(rodzaj, link.href);
    if (rodzaj.naZewnatrz) {
      przycisk.href = link.href;
      przycisk.target = '_blank';
      przycisk.rel = 'noopener nofollow';
      przycisk.classList.add('ls-wpis--link');
    } else {
      przycisk.type = 'button';
      przycisk.setAttribute('aria-expanded', 'false');
      przycisk.addEventListener('click', () => {
        wpis.toggleAttribute(OTWARTY);
        if (wpis.hasAttribute(OTWARTY)) wczytajRamki(wpis);
        przycisk.setAttribute('aria-expanded', String(wpis.hasAttribute(OTWARTY)));
        przycisk.textContent = opis(przycisk, wpis);
      });
    }
    przycisk.textContent = opis(przycisk, wpis);
    wpis.before(przycisk);
    wpis.setAttribute(Z_PRZYCISKIEM, '');
  }

  // Wołane po każdej paczce mutacji, także w trakcie parsowania — wpis może
  // być jeszcze bez linku albo ramki, wtedy dokończy go następna paczka.
  function porzadki() {
    for (const wpis of document.querySelectorAll(WPISY)) {
      const rodzaj = rodzajWpisu(wpis);
      odlozRamki(wpis, rodzaj);
      wstawPrzycisk(wpis, rodzaj);
    }
  }

  function wlacz() {
    html.setAttribute(ATRYBUT, '');
    porzadki();
    if (!obserwator) {
      obserwator = new MutationObserver(porzadki);
      obserwator.observe(document, { childList: true, subtree: true });
    }
  }

  function wylacz() {
    html.removeAttribute(ATRYBUT);
    if (obserwator) { obserwator.disconnect(); obserwator = null; }
    for (const wpis of document.querySelectorAll(WPISY)) wczytajRamki(wpis);
  }

  const czyWlaczonyWUstawieniach = (u) => (u && u.rmf24 && u.rmf24.wpisy) !== false;

  async function start() {
    // Od razu, zanim dojedzie odczyt ustawień — inaczej ramki wpisów
    // zaczęłyby się ładować, a wpisy mignęłyby w pełnej wysokości.
    wlacz();
    let ustawienia = null;
    try { ustawienia = (await chrome.storage.sync.get('ustawienia')).ustawienia; } catch (e) { /* domyślnie włączony */ }
    if (!czyWlaczonyWUstawieniach(ustawienia)) wylacz();
    chrome.storage.onChanged.addListener((zmiany, obszar) => {
      if (obszar !== 'sync' || !zmiany.ustawienia) return;
      if (czyWlaczonyWUstawieniach(zmiany.ustawienia.newValue)) wlacz(); else wylacz();
    });
  }

  // W rozszerzeniu: rusza od razu. Na stronie testowej (bez chrome.storage)
  // tylko wystawia API — test/mock-rmf24-wpisy.html włącza poprawkę sam.
  globalThis.__lsWpisy = { wlacz, wylacz, porzadki, czyWlaczonyWUstawieniach };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) start();
})();
