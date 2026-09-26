// Ciemny motyw dla qnews.pl — paleta i włącznik dla silnika ciemny-motyw.js
// (content script, document_start).
//
// qnews.pl (stan: wrzesień 2026) to Drupal z motywem „q": dwa zagregowane
// arkusze same-origin, ~170 kolorów wpisanych na sztywno, zero zmiennych CSS,
// zero inline'owych kolorów i inline SVG. Tło strony to gradient na html/body
// (biel → beż #dfd5c5), treść na białych i kremowych (#f3f0ec) kartach
// z 60-pikselowym cieniem, beżowe (#e5d9c7) guziki i pole szukania, brązowe
// (#776654) bloki „Info" i ankiety z białym tekstem, tekst #444036.
// Lustro arkuszy odwraca to w ciepłą ciemną paletę; brązowe bloki stają się
// jasnobrązowe z ciemnym tekstem (odwrócenie jest spójne: białe napisy na nich
// też ciemnieją). Cienie pod kartami zostają ciemne (zachowajCiemneCienie),
// żeby nie zrobiła się z nich łuna. qnews-dark.css odwraca logo (czarny napis
// na przezroczystym PNG) i daje jasny podkład pod obrazki w treści.
//
// Włącznik: ustawienia → „ciemny motyw na qnews.pl" (chrome.storage.sync,
// `ustawienia.qnews.ciemnyMotyw`, domyślnie włączony).

(() => {
  // Pary dobrane ręcznie dla palety qnews (klucz: „r,g,b" oryginału) —
  // ciepłe szarości zamiast neutralnych, żeby strona nie zsiniała.
  const RECZNE = {
    '255,255,255': [31, 30, 27],    // karty i góra gradientu → #1f1e1b
    '223,213,197': [41, 38, 34],    // dół gradientu tła
    '243,240,236': [38, 37, 34],    // kremowe bloki
    '229,217,199': [58, 52, 44],    // beżowe guziki, pole szukania
    '68,64,54': [222, 216, 204],    // tekst główny #444036 → #ded8cc
    '100,89,82': [190, 178, 168],   // menu, linki drugorzędne
    '119,102,84': [154, 138, 118],  // brązowe bloki Info/ankieta → jasny brąz
    '120,119,118': [160, 158, 156], // dolna nawigacja
    '0,0,0': [240, 236, 228],       // czerń → ciepła biel
  };

  const motyw = lsCiemnyMotyw({ klucz: 'qnews', reczne: RECZNE, zachowajCiemneCienie: true });

  globalThis.__lsDark = motyw;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) motyw.start();
})();
