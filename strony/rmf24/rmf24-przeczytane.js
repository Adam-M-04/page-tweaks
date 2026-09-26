// Przeczytane wpisy przygaszone na rmf24.pl — content script
// (document_start) do rmf24-przeczytane.css.
//
// Wejście na stronę wpisu (adres „…,nIdn,1019291", stan: wrzesień 2026)
// zapisuje jego numer w chrome.storage.local (klucz `rmf24Przeczytane`,
// numer → kiedy, 60 dni). Kafelki (article.news-card, article.cat-card),
// linki pod kafelkami działów (.category-links > li) i listy pod artykułem
// („Najważniejsze Fakty" .article-related__card, „Zobacz również"
// .article-see-also__row), które prowadzą do zapisanego numeru, dostają
// data-ls-przeczytany, a CSS przygasza im zdjęcie i tytuł. Przeczytany znaczy
// otwarty — kliknięty w tej samej karcie, w nowej albo wklejony adres.
//
// Nie :visited — przez historię przeglądarki Chrome pozwala zmienić tylko
// kolor tekstu linku, zdjęcia by nie przygasił.
//
// Kafelki oznacza MutationObserver już w trakcie wczytywania strony, więc
// nie mrugają. Wpis otwarty w innej karcie przygasza kafelek od razu
// (chrome.storage.onChanged), powrót „wstecz" z pamięci podręcznej
// przeglądarki czyta pamięć jeszcze raz (pageshow).
//
// Włącznik: ustawienia → rmf24.pl → „Przeczytane wpisy przygaszone"
// (chrome.storage.sync, `ustawienia.rmf24.przeczytane`, domyślnie
// włączony). Wyłączony nic nie zapisuje.

(() => {
  const ATRYBUT = 'data-ls-przeczytane';
  const PRZECZYTANY = 'data-ls-przeczytany';     // na kafelku
  const KLUCZ_PAMIECI = 'rmf24Przeczytane';
  const TRZYMAJ = 60 * 864e5;
  const KAFELKI = 'article.news-card, article.cat-card, .category-links > li, .article-related__card, .article-see-also__row';
  const LINK = 'a[href*=",nIdn,"]';
  const html = document.documentElement;
  const magazyn = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  let przeczytane = {};   // numer → kiedy otwarty
  let obserwator = null;

  // „/fakty/polska/news-nawrocki-…,nIdn,1019291" (też pełny adres z ?utm_rs=…) → „1019291".
  function numerWpisu(href) {
    let u;
    try { u = new URL(href, location.origin); } catch (e) { return null; }
    if (u.origin !== location.origin && !/(^|\.)rmf24\.pl$/.test(u.hostname)) return null;
    const m = u.pathname.match(/,nIdn,(\d+)(?:,|$)/);
    return m ? m[1] : null;
  }

  // Obserwator patrzy tylko na dodane i usunięte węzły, więc atrybuty
  // stawiane tutaj go nie budzą.
  function oznacz() {
    if (!html.hasAttribute(ATRYBUT)) return;
    for (const el of document.querySelectorAll(KAFELKI)) {
      const a = el.querySelector(LINK);
      el.toggleAttribute(PRZECZYTANY, !!(a && przeczytane[numerWpisu(a.getAttribute('href'))]));
    }
  }

  async function wczytaj() {
    if (!magazyn) return;   // strona testowa: pamięć podstawia test
    let zapisane = null;
    try { zapisane = (await magazyn.get(KLUCZ_PAMIECI))[KLUCZ_PAMIECI]; } catch (e) { /* pusta */ }
    przeczytane = zapisane || {};
  }

  // Czyta pamięć tuż przed zapisem — druga karta mogła w międzyczasie dopisać swój wpis.
  async function zapamietaj(numer, teraz = Date.now()) {
    await wczytaj();
    przeczytane[numer] = teraz;
    for (const [k, t] of Object.entries(przeczytane)) if (teraz - t > TRZYMAJ) delete przeczytane[k];
    try { if (magazyn) await magazyn.set({ [KLUCZ_PAMIECI]: przeczytane }); } catch (e) { /* zostaje w pamięci karty */ }
  }

  async function wlacz() {
    html.setAttribute(ATRYBUT, '');
    if (!obserwator) {
      obserwator = new MutationObserver(oznacz);
      obserwator.observe(document, { childList: true, subtree: true });
    }
    const biezacy = numerWpisu(location.href);
    if (biezacy) await zapamietaj(biezacy); else await wczytaj();
    oznacz();
  }

  function wylacz() {
    html.removeAttribute(ATRYBUT);
    if (obserwator) { obserwator.disconnect(); obserwator = null; }
    for (const el of document.querySelectorAll(`[${PRZECZYTANY}]`)) el.removeAttribute(PRZECZYTANY);
  }

  const czyWlaczoneWUstawieniach = (u) => (u && u.rmf24 && u.rmf24.przeczytane) !== false;

  async function start() {
    let ustawienia = null;
    try { ustawienia = (await chrome.storage.sync.get('ustawienia')).ustawienia; } catch (e) { /* domyślnie włączone */ }
    if (czyWlaczoneWUstawieniach(ustawienia)) wlacz();
    chrome.storage.onChanged.addListener((zmiany, obszar) => {
      if (obszar === 'local' && zmiany[KLUCZ_PAMIECI]) {
        przeczytane = zmiany[KLUCZ_PAMIECI].newValue || {};
        oznacz();
      }
      if (obszar !== 'sync' || !zmiany.ustawienia) return;
      if (czyWlaczoneWUstawieniach(zmiany.ustawienia.newValue)) wlacz(); else wylacz();
    });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted && html.hasAttribute(ATRYBUT)) wczytaj().then(oznacz);
    });
  }

  // W rozszerzeniu: rusza od razu. Na stronie testowej (bez chrome.storage)
  // tylko wystawia API — test/mock-rmf24-przeczytane.html podstawia pamięć.
  globalThis.__lsPrzeczytane = {
    wlacz, wylacz, oznacz, zapamietaj, numerWpisu, czyWlaczoneWUstawieniach,
    przeczytane: () => przeczytane, ustawPrzeczytane: (p) => { przeczytane = p; },
  };
  if (magazyn && chrome.storage.sync) start();
})();
