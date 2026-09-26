// Ciemny motyw dla medium.com — paleta i włącznik dla silnika ciemny-motyw.js
// (content script, document_start, także w ramkach medium.com/media/*
// z osadzonymi gistami).
//
// Medium (stan: wrzesień 2026) maluje niemal wszystko tokenami z reguły
// `:root { color-scheme: light; --color-bg-neutral-primary: #ffffff; … }`
// (<style data-href="lite-color-scheme-tokens">), a kolory składni kodu ma już
// w `light-dark()`. Reszta to atomowe klasy Feli — jedna klasa = jedna
// deklaracja, nazwy losowe per build, reguły dokładane w locie przez
// insertRule — i kilkanaście kolorów na sztywno (zielony przycisk, cienie).
// Klas nie da się więc wskazać z góry, ale ich reguły da się przeczytać —
// stąd lustro arkuszy w ciemny-motyw.js. medium-dark.css dokłada to, czego
// z arkuszy nie widać: color-scheme: dark, tło zanim dojadą arkusze, jasny
// podkład pod przezroczystymi PNG w treści, ciemny motyw osadzonych gistów.
//
// Włącznik: ustawienia → medium.com → „Ciemny motyw" (chrome.storage.sync,
// `ustawienia.medium.ciemnyMotyw`, domyślnie włączony). Zmiana działa od razu
// na otwartych kartach.

(() => {
  // Pary dobrane ręcznie dla palety Medium (klucz: „r,g,b" oryginału),
  // żeby zieleń i szarości wyglądały jak w ich aplikacji. Reszta idzie przez
  // odwrócenie jasności w silniku.
  const RECZNE = {
    '255,255,255': [25, 25, 25],    // tło strony → #191919
    '249,249,249': [34, 34, 34],    // bloki kodu, tło trzeciorzędne
    '242,242,242': [44, 44, 44],    // chipy, hairline'y
    '229,229,229': [58, 58, 58],    // obramowania
    '210,210,210': [74, 74, 74],
    '179,179,179': [107, 107, 107], // wykresy
    '107,107,107': [163, 163, 163], // tekst drugorzędny
    '63,63,63': [212, 212, 212],
    '36,36,36': [232, 232, 232],    // tekst główny #242424 → #e8e8e8
    '25,25,25': [242, 242, 242],    // czarny przycisk → jasny
    '8,8,8': [255, 255, 255],
    '0,0,0': [255, 255, 255],
    '26,137,23': [75, 194, 71],     // zieleń Medium
    '21,109,18': [106, 209, 102],
    '201,74,74': [224, 112, 112],   // błąd
    '182,54,54': [234, 134, 134],
    '67,122,255': [122, 162, 255],  // niebieski
    '190,91,4': [240, 160, 80],
    '187,219,186': [47, 90, 46],    // jasne zielenie tła
    '159,204,158': [58, 109, 57],
    '210,231,209': [39, 69, 42],
    '232,243,232': [31, 51, 32],
    '255,250,225': [59, 52, 32],    // żółte tło
    '229,242,255': [30, 43, 59],    // niebieskie tło
    '247,244,237': [38, 36, 33],    // stopka artykułu
  };

  // Na domenach własnych publikacji (levelup.gitconnected.com, itnext.io…)
  // motyw rusza od razu, a po sparsowaniu <head> silnik sprawdza, czy to wciąż
  // Medium (meta al:android:package=com.medium.reader). Publikacja, która
  // z Medium odeszła, dostaje swój zwykły wygląd z powrotem.
  function czyMedium() {
    return /(^|\.)medium\.com$/.test(location.hostname)
      || !!document.querySelector('meta[property="al:android:package"][content="com.medium.reader"], meta[name="twitter:app:name:iphone"][content="Medium"]');
  }

  const motyw = lsCiemnyMotyw({ klucz: 'medium', reczne: RECZNE, czyStrona: czyMedium });

  // W rozszerzeniu: rusza od razu. Na stronie testowej (bez chrome.storage)
  // tylko wystawia API — test/mock-medium.html włącza motyw sam.
  globalThis.__lsDark = motyw;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) motyw.start();
})();
