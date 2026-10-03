// Ciemny motyw rmf24.pl — content script (document_start) do rmf24-dark.css.
//
// rmf24.pl (stan: październik 2026) to Bootstrap 5.3.2 z jsdelivr i kilka
// własnych arkuszy (app, components, home, article, category, regiony —
// razem ~250 kolorów na sztywno). Lustro arkuszy z ciemny-motyw.js tu nie
// pasuje: Bootstrapa z innej domeny nie przeczyta, a strona ma już ciemne
// sekcje (#2f2f2f: górny pasek, „Najnowsze Rozmowy", stopka, panele
// „Najnowsze" i „Najpopularniejsze") z białym tekstem — odwrócenie zrobiłoby
// z nich jasne. Dlatego:
//   - Bootstrap dostaje swój własny tryb data-bs-theme="dark" (formularze,
//     rozwijane menu, tabele, .text-muted), z tokenami podmienionymi na
//     neutralną szarość strony;
//   - jasne części arkuszy strony przemalowuje ręczna paleta
//     w rmf24-dark.css; ciemne sekcje zostają, jakie są;
//   - żółty pasek z menu też zostaje — logo to PNG z żółtym tłem.
//
// Motyw rusza od razu, zanim dojedzie odczyt ustawień (inaczej każde wejście
// mrugałoby bielą); wyłączony schodzi chwilę później. Na czas drukowania
// też schodzi — jasny tekst na białym papierze byłby nieczytelny.
//
// Włącznik: ustawienia → rmf24.pl → „Ciemny motyw" (chrome.storage.sync,
// `ustawienia.rmf24.ciemnyMotyw`, domyślnie włączony).

(() => {
  const ATRYBUT = 'data-ls-dark';
  const MOTYW_BS = 'data-bs-theme';
  const html = document.documentElement;
  let motywStrony = null;   // data-bs-theme sprzed włączenia (strona dziś go nie ustawia)

  function wlacz() {
    if (html.hasAttribute(ATRYBUT)) return;
    motywStrony = html.getAttribute(MOTYW_BS);
    html.setAttribute(ATRYBUT, '');
    html.setAttribute(MOTYW_BS, 'dark');
  }

  function wylacz() {
    if (!html.hasAttribute(ATRYBUT)) return;
    html.removeAttribute(ATRYBUT);
    if (motywStrony === null) html.removeAttribute(MOTYW_BS); else html.setAttribute(MOTYW_BS, motywStrony);
  }

  const czyWlaczonyWUstawieniach = (u) => (u && u.rmf24 && u.rmf24.ciemnyMotyw) !== false;

  let wlaczony = true;   // stan z ustawień; druk zdejmuje motyw tylko na chwilę
  window.addEventListener('beforeprint', wylacz);
  window.addEventListener('afterprint', () => { if (wlaczony) wlacz(); });

  async function start() {
    wlacz();
    let ustawienia = null;
    try { ustawienia = (await chrome.storage.sync.get('ustawienia')).ustawienia; } catch (e) { /* domyślnie włączony */ }
    wlaczony = czyWlaczonyWUstawieniach(ustawienia);
    if (!wlaczony) wylacz();
    chrome.storage.onChanged.addListener((zmiany, obszar) => {
      if (obszar !== 'sync' || !zmiany.ustawienia) return;
      wlaczony = czyWlaczonyWUstawieniach(zmiany.ustawienia.newValue);
      if (wlaczony) wlacz(); else wylacz();
    });
  }

  // W rozszerzeniu: rusza od razu. Na stronie testowej (bez chrome.storage)
  // tylko wystawia API — test/mock-rmf24-dark.html włącza motyw sam.
  globalThis.__lsDark = { wlacz, wylacz, czyWlaczonyWUstawieniach };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) start();
})();
