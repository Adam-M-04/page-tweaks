// Ciemny motyw dla Wirtualnego Dziekanatu PK (ehms.pk.edu.pl) — paleta
// i włącznik dla silnika ciemny-motyw.js, plus przycisk księżyc/słońce
// w nagłówku (content script, document_start).
//
// eHMS (stan: wrzesień 2026, wersja 8.36 Kalasoftu) to Bootstrap 5.0.2 bez
// zmiennych kolorów, do tego ~230 kolorów na sztywno w themes/common.css.php
// (tabele i widżety z czasów przed Bootstrapem: #B6CCEA, #F8FBFF…), motyw
// uczelni themes/polikrak/style.css (granat #1c508c, bordo #9F023C, tekst
// #033773) i jQuery UI z datepickerem. Wszystkie arkusze są z tej samej
// domeny, więc lustro arkuszy przemapowuje wszystko, czego nie maluje wprost
// nowy wygląd (ehms-wyglad.css ma własną ciemną paletę pod
// :root[data-ls-ehms][data-ls-dark]). ehms-dark.css dokłada color-scheme,
// tło i — gdy nowy wygląd jest wyłączony — ciemny granat pasków i menu.
//
// Każde kliknięcie w menu wczytuje stronę od nowa, więc motyw rusza od razu
// (odRazu), zanim przyjdzie odczyt ustawień. Na czas drukowania schodzi
// (jasny tekst na białym papierze byłby nieczytelny).
//
// Przycisk w nagłówku (obok konta; na stronie logowania w prawym górnym
// rogu) przełącza ten sam włącznik co ustawienia rozszerzenia. Nie jest
// w żadnym formularzu i nic nie wysyła do strony.
//
// Włącznik: ustawienia → ehms.pk.edu.pl → „Ciemny motyw" (chrome.storage.sync,
// `ustawienia.ehms.ciemnyMotyw`, domyślnie włączony).

(() => {
  // Pary dobrane ręcznie (klucz: „r,g,b" oryginału) — te same odcienie co
  // ciemna paleta ehms-wyglad.css, żeby widżety, których nowy wygląd nie
  // rusza, nie odstawały. Reszta idzie przez odwrócenie jasności w silniku.
  const RECZNE = {
    '255,255,255': [20, 27, 37],    // białe karty i tła → #141b25
    '248,249,250': [25, 34, 46],    // --bs-light, .bg-light
    '248,251,255': [22, 30, 41],    // #F8FBFF, tła starych tabel
    '250,250,250': [22, 30, 41],
    '233,236,239': [32, 42, 56],    // pola wyłączone
    '222,226,230': [38, 50, 65],    // obramowania Bootstrapa
    '206,212,218': [52, 67, 87],    // obramowania pól
    '33,37,41': [228, 234, 242],    // tekst Bootstrapa #212529
    '0,0,0': [236, 241, 247],
    '3,55,115': [214, 224, 238],    // tekst motywu PK #033773
    '28,80,140': [24, 40, 62],      // granat pasków i menu #1c508c
    '26,53,91': [170, 196, 236],    // stare linki #1a355b
    '29,35,89': [190, 205, 245],
    '182,204,234': [30, 45, 68],    // #B6CCEA, nagłówki starych tabel
    '193,207,225': [44, 58, 78],    // #c1cfe1
    '211,228,251': [27, 42, 64],    // #D3E4FB
    '225,233,245': [26, 36, 50],    // #e1e9f5
    '203,219,240': [30, 45, 68],    // #CBDBF0
    '231,239,248': [25, 34, 46],    // #E7EFF8
    '207,226,255': [23, 42, 69],    // .table-primary
    '255,243,205': [51, 41, 15],    // .table-warning
    '159,2,60': [255, 128, 168],    // bordo PK (linki, przyciski)
    '108,117,125': [158, 171, 189], // .text-muted
    '248,215,218': [58, 26, 32],    // .alert-danger
    '132,32,41': [255, 154, 168],
    '245,194,199': [92, 38, 48],
    '209,231,221': [18, 48, 31],    // .alert-success
    '15,81,50': [127, 220, 166],
    '186,219,204': [31, 77, 51],
  };

  const ATRYBUT = 'data-ls-dark';
  const html = document.documentElement;
  const magazyn = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
  const motyw = lsCiemnyMotyw({ klucz: 'ehms', reczne: RECZNE, zachowajCiemneCienie: true, odRazu: true });

  // ---------- przycisk w nagłówku ----------

  const ID_PRZYCISKU = 'ls-ehms-motyw';

  // Kliknięcie od razu przełącza motyw na tej karcie i zapisuje włącznik —
  // pozostałe karty dostaną go przez chrome.storage.onChanged w silniku.
  async function przelacz() {
    const wlaczony = !html.hasAttribute(ATRYBUT);
    if (wlaczony) motyw.wlacz(); else motyw.wylacz();
    if (!magazyn) return;   // strona testowa
    try {
      const u = (await chrome.storage.sync.get('ustawienia')).ustawienia || {};
      u.ehms = { ...(u.ehms || {}), ciemnyMotyw: wlaczony };
      await chrome.storage.sync.set({ ustawienia: u });
    } catch (e) { /* zostaje na tej karcie */ }
  }

  // Księżyc i słońce naraz, CSS pokazuje jedno z nich — zero stanu do pilnowania.
  function dodajPrzycisk() {
    if (document.getElementById(ID_PRZYCISKU)) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = ID_PRZYCISKU;
    b.title = 'Ciemny / jasny motyw';
    b.setAttribute('aria-label', 'Ciemny motyw');
    b.innerHTML = '<i class="ti ti-moon" aria-hidden="true"></i><i class="ti ti-sun" aria-hidden="true"></i>';
    b.addEventListener('click', przelacz);
    // Przed menu konta w górnym pasku; strona logowania go nie ma — tam róg ekranu.
    const konto = document.querySelector('.kal-topbar .dropdown #dropdownMenuButton');
    if (konto) konto.closest('.dropdown').before(b);
    else { b.classList.add('ls-ehms-motyw--rog'); document.body.append(b); }
  }

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dodajPrzycisk, { once: true });
  else dodajPrzycisk();

  // W rozszerzeniu: rusza od razu. Na stronie testowej (bez chrome.storage)
  // tylko wystawia API — test/mock-ehms.html włącza motyw sam.
  globalThis.__lsDark = motyw;
  globalThis.__lsEhmsMotyw = { przelacz, dodajPrzycisk, RECZNE };
  if (magazyn) motyw.start();
})();
