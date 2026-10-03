// Tytuł strony tagu nad listą zamiast w bocznej kolumnie — content script
// (document_start) do medium-tytul.css.
//
// Strony tagu „Recommended stories" i „Archive" (/tag/<tag>/recommended,
// /tag/<tag>/archive; stan: październik 2026) to flex w rzędzie:
//   1. przyklejona kolumna (div style="top: 57px") z okruszkiem
//      „Symfony > Recommended stories", wielkim h2 „Recommended stories in
//      "Symfony"" i stopką Help/Status/About…, ~374 px z lewej;
//   2. ten sam okruszek i h2 w wersji na wąski ekran — na szerokim
//      display: none;
//   3. pusty odstęp;
//   4. lista wpisów.
// Na wąskim ekranie Medium samo przestawia rząd w kolumnę, chowa 1. i pokazuje
// 2. nad listą. CSS robi to samo na każdej szerokości: lista na środku,
// 680 px jak w artykułach, a tytuł z okruszkiem nad nią, mniejszy.
//
// Klasy Feli są losowe, więc rząd wskazuje :has() — rodzic przyklejonej
// kolumny ze strzałką okruszka (svg aria-labelledby="arrow-right-title").
// Główna strona tagu (/tag/<tag>) ma inny układ i nie łapie się.
//
// Ten skrypt tylko stawia atrybut i pilnuje włącznika.
//
// Włącznik: ustawienia → medium.com → „Tytuł tagu nad listą"
// (chrome.storage.sync, `ustawienia.medium.tytul`, domyślnie włączony).

(() => {
  const ATRYBUT = 'data-ls-tytul';
  const html = document.documentElement;

  const wlacz = () => html.setAttribute(ATRYBUT, '');
  const wylacz = () => html.removeAttribute(ATRYBUT);

  const czyWlaczonyWUstawieniach = (u) => (u && u.medium && u.medium.tytul) !== false;

  async function start() {
    // Od razu, zanim dojedzie odczyt ustawień — inaczej boczna kolumna
    // mignęłaby przy każdym wejściu.
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
  // tylko wystawia API — test/mock-medium-tytul.html włącza poprawkę sam.
  globalThis.__lsTytul = { wlacz, wylacz, czyWlaczonyWUstawieniach };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) start();
})();
