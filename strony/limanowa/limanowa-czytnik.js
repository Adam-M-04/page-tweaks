// Czytnik dla limanowa.in — content script (document_start) do
// limanowa-czytnik.css i reguł sieciowych limanowa-reguly.json.
//
// limanowa.in (stan: wrzesień 2026) to Laravel z jQuery; artykuły we
// wszystkich działach (aktualności, sport, PAP, urzędy, materiały partnerów)
// mają ten sam szkielet: .newsDetails__top z kolumną treści __left (tytuł,
// zdjęcia, data, .newsDetails__text, komentarze, „Może Cię zaciekawić")
// i boczną __right. Reklamy są z trzech źródeł:
//   - optad360 + Google Ad Manager + AdSense: sloty .ad-placeholder
//     z div#oa-360-* w środku, także w treści artykułu (z autoodtwarzanym
//     <video>) i między komentarzami; okno zgody Google Funding Choices
//     (.fc-consent-root) blokuje przewijanie przez body overflow: hidden;
//   - własny system banerów portalu (/banner/zobacz/…): #topBarner nad
//     menu, .floatingArd przyklejony do dołu — klasy z „Ard" zamiast „Ad",
//     żeby nie łapały ich listy filtrów;
//   - treści płatne: „Ogłoszenia promowane", „Firmy", „Materiały partnerów".
// Do tego okienko „włącz powiadomienia" (#notificationsPopup), SwG Google
// News i znaczek reCAPTCHA.
//
// Sieć reklamową odcinają reguły declarativeNetRequest (tylko dla żądań
// wychodzących z limanowa.in), resztę chowa CSS pod html[data-ls-czytnik],
// a ten skrypt: stawia atrybut, zdejmuje dymek „Wykryliśmy że korzystasz
// z Adblocka" (app.js pokazuje go, gdy #optadScript nie dojedzie) i chowa
// komentarze za przyciskiem.
//
// Włącznik: ustawienia → limanowa.in → „Czytnik bez reklam" (chrome.storage.sync,
// `ustawienia.limanowa.czytnik`, domyślnie włączony). Zmiana działa od razu
// na otwartych kartach; reguły sieciowe przełącza background.js.

(() => {
  const ATRYBUT = 'data-ls-czytnik';
  const KOMENTARZE = 'data-ls-komentarze';
  const html = document.documentElement;
  let obserwator = null;

  function usunDymkiAdblocka() {
    for (const dymek of document.querySelectorAll('#toast-container .toast')) {
      if (/adblock/i.test(dymek.textContent)) dymek.remove();
    }
  }

  function opisPrzycisku(liczba) {
    if (html.hasAttribute(KOMENTARZE)) return 'Schowaj komentarze';
    return liczba ? `Pokaż komentarze (${liczba})` : 'Pokaż komentarze';
  }

  function wstawPrzyciskKomentarzy() {
    const box = document.querySelector('.newsDetails__commentsBox');
    if (!box || document.querySelector('.ls-komentarze')) return;
    // „Komentarze (25)" — liczba z nagłówka sekcji.
    const liczba = (box.querySelector('.commentsBox__title')?.textContent.match(/\d+/) || [])[0];
    const przycisk = document.createElement('button');
    przycisk.type = 'button';
    przycisk.className = 'ls-komentarze';
    przycisk.textContent = opisPrzycisku(liczba);
    przycisk.addEventListener('click', () => {
      html.toggleAttribute(KOMENTARZE);
      przycisk.textContent = opisPrzycisku(liczba);
    });
    box.before(przycisk);
  }

  // Wołane po każdej paczce mutacji — dwa zapytania po id/klasie, tanio.
  function porzadki() {
    usunDymkiAdblocka();
    wstawPrzyciskKomentarzy();
  }

  function wlacz() {
    html.setAttribute(ATRYBUT, '');
    if (document.body) porzadki();
    if (!obserwator) {
      obserwator = new MutationObserver(porzadki);
      obserwator.observe(document, { childList: true, subtree: true });
    }
  }

  function wylacz() {
    html.removeAttribute(ATRYBUT);
    html.removeAttribute(KOMENTARZE);
    if (obserwator) { obserwator.disconnect(); obserwator = null; }
  }

  const czyWlaczonyWUstawieniach = (u) => (u && u.limanowa && u.limanowa.czytnik) !== false;

  async function start() {
    // Atrybut od razu, zanim dojedzie odczyt ustawień — inaczej przy każdym
    // wejściu mignęłaby strona z banerami. Wyłączony czytnik zdejmuje go
    // chwilę później.
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
  // tylko wystawia API — test/mock-limanowa.html włącza czytnik sam.
  globalThis.__lsCzytnik = { wlacz, wylacz, porzadki, czyWlaczonyWUstawieniach };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) start();
})();
