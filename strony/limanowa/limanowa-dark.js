// Ciemny motyw dla limanowa.in — paleta i włącznik dla silnika ciemny-motyw.js
// (content script, document_start).
//
// limanowa.in (stan: październik 2026) ma jeden arkusz z tej samej domeny
// (/css/home.css: Foundation, toastr i style portalu, ~90 kolorów na
// sztywno, bez zmiennych CSS), więc lustro arkuszy przemapowuje go całego.
// Paleta portalu: białe tło, granatowy tekst #02364b, błękit #009dd5
// w znaczkach i akcentach, szarość #f4f5f6 pod sekcjami. Granat jest też
// tłem górnego paska z białym menu — ten pasek zostaje ciemny, jak jest
// (`pomijane`), podobnie napisy na zdjęciach (czarne półprzezroczyste
// nakładki z białym tekstem na kafelkach i w galeriach), bo odwrócone
// zrobiłyby się mleczne.
// limanowa-dark.css odwraca logo (granatowy napis na przezroczystym PNG)
// i przemalowuje kolory, które dokładają czytnik i daty — content scripty
// rozszerzenia nie są w document.styleSheets, więc lustro ich nie widzi.
//
// Każde kliknięcie wczytuje stronę od nowa, więc motyw rusza od razu
// (odRazu), zanim przyjdzie odczyt ustawień. Na czas drukowania schodzi
// (jasny tekst na białym papierze byłby nieczytelny).
//
// Włącznik: ustawienia → limanowa.in → „Ciemny motyw" (chrome.storage.sync,
// `ustawienia.limanowa.ciemnyMotyw`, domyślnie włączony).

(() => {
  // Pary dobrane ręcznie (klucz: „r,g,b" oryginału) — chłodna szarość pod
  // granat portalu zamiast neutralnej. Reszta przez odwrócenie jasności.
  const RECZNE = {
    '255,255,255': [19, 24, 27],     // tło i karty → #13181b
    '254,254,254': [19, 24, 27],     // body #fefefe
    '244,245,246': [27, 33, 37],     // szare sekcje #f4f5f6
    '245,245,245': [26, 32, 36],     // co drugi wiersz tabel
    '238,238,238': [36, 43, 48],     // #eee: zaślepki zdjęć, ramki
    '229,229,229': [40, 48, 53],     // #e5e5e5: kreski między wpisami
    '221,221,221': [46, 55, 61],     // ramki tabel
    '212,217,222': [55, 65, 72],     // ramki pól formularzy
    '202,202,202': [70, 80, 87],     // hr, podpisy
    '2,54,75': [213, 227, 234],      // tekst granatowy #02364b → #d5e3ea
    '0,0,0': [233, 239, 242],
    '140,172,188': [128, 156, 170],  // etykiety i placeholdery pól
  };

  // Zostają w kolorach strony: granatowy pasek z menu (desktop) i wysuwane
  // menu (do 1024 px), granatowe guziki „Przeczytaj więcej", napisy i maski
  // na zdjęciach kafelków (bez kafelków „standard" z tekstem pod zdjęciem
  // na telefonie), galerii i ogłoszeń, licznik zdjęć galerii.
  const POMIJANE = new RegExp([
    /^header\b/,
    /^\.btn(-dark)?\b(?!-)/,
    /\.news-item(?!\S*standard-item)\S* (\.post (> )?)?\.(content|stats|mask|title)\b/,
    /\.photoWrap \.(mask|title)\b/,
    /\.galleries \.item \.count\b/,
    /\.announcement-item \.mask\b/,
    /\.announcement-item--main \.title/,
    /\.items-grid--special \.announcement-item:first-child \.title/,
  ].map((r) => r.source).join('|'));

  const ATRYBUT = 'data-ls-dark';
  const html = document.documentElement;
  const motyw = lsCiemnyMotyw({
    klucz: 'limanowa', reczne: RECZNE, pomijane: POMIJANE,
    zachowajCiemneCienie: true, zachowajSlowaKluczowe: true, odRazu: true,
  });

  // ---------- druk ----------

  let przedDrukiem = false;
  window.addEventListener('beforeprint', () => {
    przedDrukiem = html.hasAttribute(ATRYBUT);
    if (przedDrukiem) motyw.wylacz();
  });
  window.addEventListener('afterprint', () => {
    if (przedDrukiem) motyw.wlacz();
    przedDrukiem = false;
  });

  // W rozszerzeniu: rusza od razu. Na stronie testowej (bez chrome.storage)
  // tylko wystawia API — test/mock-limanowa-dark.html włącza motyw sam.
  globalThis.__lsDark = motyw;
  globalThis.__lsLimanowaMotyw = { RECZNE, POMIJANE };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) motyw.start();
})();
