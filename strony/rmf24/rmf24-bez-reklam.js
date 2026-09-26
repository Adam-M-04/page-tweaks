// Bez reklam na rmf24.pl — content script (document_start) do
// rmf24-bez-reklam.css i reguł sieciowych rmf24-reguly.json.
//
// rmf24.pl (stan: wrzesień 2026) to Bootstrap 5 z jQuery; strona główna,
// działy i artykuły mają te same klocki. Śmieci są z czterech źródeł:
//   - Google Ad Manager: sloty div#RMF_24_* (część dokłada jQuery po
//     załadowaniu, np. między zdjęciem a tekstem artykułu) w szarych
//     ramkach .bg-light.text-muted z min-height 200–300 px; przyklejone
//     #stickerSky z lewej i #sticker w bocznej kolumnie; Taboola;
//   - własne okno zgody Grupy RMF (www.rmf.fm/zgody/, 1500 partnerów,
//     ~1,7 MB w DOM) — dopiero ono uruchamia skrypty type="cm/javascript"
//     z <head>: WTG (reklamy), Blockthrough, Marfeel, Realtimely, piksel X
//     i SDK Facebooka. Bez niego posty z Facebooka w artykułach po 15 s
//     zostają samym linkiem do Facebooka; X, Instagram i YouTube to zwykłe
//     ramki i działają;
//   - wstawka #specialVideoCont: „Dalsza część artykułu pod materiałem
//     video" i rozmowa z RMF FM w odtwarzaczu OnNetwork, w każdym artykule,
//     niezwiązana z tematem. Własne filmy artykułów są na YouTube;
//   - autopromocja i treści płatne: pasek radia #belkaRadio, boks
//     „Sprawdzam! w RMF FM", „dodaj w Google", sekcja „Twoje Zdrowie",
//     pogoda i kafelki .news-card.sponsored.
// Do tego rmf-push.js, który przy każdym wejściu prosi o powiadomienia.
//
// Sieć odcinają reguły declarativeNetRequest (tylko dla żądań wychodzących
// z rmf24.pl), resztę chowa CSS pod html[data-ls-bez-reklam]. Ten skrypt
// tylko stawia atrybut i pilnuje włącznika.
//
// Włącznik: ustawienia → rmf24.pl → „Bez reklam" (chrome.storage.sync,
// `ustawienia.rmf24.bezReklam`, domyślnie włączony). Zmiana działa od razu
// na otwartych kartach; reguły sieciowe przełącza background.js.

(() => {
  const ATRYBUT = 'data-ls-bez-reklam';
  const html = document.documentElement;

  const wlacz = () => html.setAttribute(ATRYBUT, '');
  const wylacz = () => html.removeAttribute(ATRYBUT);

  const czyWlaczonyWUstawieniach = (u) => (u && u.rmf24 && u.rmf24.bezReklam) !== false;

  async function start() {
    // Atrybut od razu, zanim dojedzie odczyt ustawień — inaczej przy każdym
    // wejściu mignęłyby puste ramki. Wyłączona poprawka zdejmuje go chwilę
    // później.
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
  // tylko wystawia API — test/mock-rmf24.html włącza poprawkę sam.
  globalThis.__lsBezReklam = { wlacz, wylacz, czyWlaczonyWUstawieniach };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) start();
})();
