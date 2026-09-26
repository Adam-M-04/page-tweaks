// Bez bocznych paneli „Najnowsze" i „Najpopularniejsze" na rmf24.pl —
// content script (document_start) do rmf24-panele.css.
//
// Strona główna, działy i artykuły (stan: wrzesień 2026) mają ten sam układ
// Bootstrapa: .row z lewą kolumną .col-lg-8.col-xl-9 i boczną
// aside.col-lg-4.col-xl-3. W bocznej są zawsze te same klocki: „Najnowsze",
// „Sprawdzam!", reklama, „Najpopularniejsze", pogoda i przyklejona reklama —
// wszystko poza dwoma panelami chowa już „bez reklam", więc CSS chowa cały
// aside. Poniżej 992 px boczna kolumna i tak spada pod treść, więc tam po
// prostu znika.
//
// Od 992 px zostaje miejsce po prawej:
//   - strona główna (section.top-stories-section, tylko tam) i działy
//     (siatka .cat-grid) rozciągają lewą kolumnę na całą szerokość, a kafelki
//     zostają mniej więcej tej samej szerokości — na głównej 3 w rzędzie
//     zamiast 2 (od 1200 px 4 zamiast 3), w działach 3 zamiast 2;
//   - artykuły i reszta podstron zostają przy swojej szerokości, na środku —
//     szerszy tekst gorzej się czyta.
// Na stronie głównej znika też nagłówek „Najważniejsze Fakty" nad siatką
// (w artykułach ta sama klasa .top-stories-heading podpisuje listy pod
// tekstem i zostaje).
//
// Ten skrypt tylko stawia atrybut i pilnuje włącznika.
//
// Włącznik: ustawienia → rmf24.pl → „Bez paneli „Najnowsze" i
// „Najpopularniejsze"" (chrome.storage.sync, `ustawienia.rmf24.panele`,
// domyślnie włączony).

(() => {
  const ATRYBUT = 'data-ls-panele';
  const html = document.documentElement;

  const wlacz = () => html.setAttribute(ATRYBUT, '');
  const wylacz = () => html.removeAttribute(ATRYBUT);

  const czyWlaczonyWUstawieniach = (u) => (u && u.rmf24 && u.rmf24.panele) !== false;

  async function start() {
    // Od razu, zanim dojedzie odczyt ustawień — inaczej panele mignęłyby
    // przy każdym wejściu.
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
  // tylko wystawia API — test/mock-rmf24-panele.html włącza poprawkę sam.
  globalThis.__lsPanele = { wlacz, wylacz, czyWlaczonyWUstawieniach };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) start();
})();
