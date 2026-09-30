// Silnik ciemnego motywu „lustro arkuszy" — wspólny dla medium-dark.js
// i qnews-dark.js. Ładowany jako pierwszy skrypt content scriptu; wystawia
// `lsCiemnyMotyw(konfig)`, a plik strony dokłada paletę i włącznik.
// Nic nie klika, nic nie wysyła; czyta arkusze stylów strony i dokłada własny.
//
// Zamiast filtra invert() na całej stronie (rozmyte kolory, zdjęcia do
// odwracania z powrotem):
// 1. Każda reguła z kolorem — tokeny :root, klasy atomowe, arkusze motywu,
//    style stron trzecich — dostaje bliźniaczą regułę
//    `html[data-ls-dark] <selektor> { … }` we własnym arkuszu. Atrybut na
//    <html> podnosi specyficzność o jeden, więc bliźniak wygrywa z oryginałem
//    niezależnie od kolejności arkuszy, a po zdjęciu atrybutu cały motyw
//    znika bez przeładowania.
// 2. Kolor w bliźniaku: jasność odwrócona, odcień zachowany (biel → ~10 %,
//    czerń → biel, przezroczyste czernie cieni → przezroczyste biele),
//    a dla palety strony ręcznie dobrane pary (`konfig.reczne`).
// 3. Atrybuty fill/stroke w inline SVG oraz kolory w atrybutach style=""
//    (artykuły wklejone z Worda: białe tła na akapitach) — przemapowane
//    w DOM, przywracane po wyłączeniu.
// 4. Reguły dokładane przez insertRule (CSS-in-JS) łapie zegar co sekundę,
//    nowe <style>/<link> i nowe elementy — MutationObserver.
//
// konfig:
//   klucz               — ustawienia[klucz].ciemnyMotyw (chrome.storage.sync),
//                         brak klucza = włączony
//   reczne              — { 'r,g,b': [r, g, b] } pary dobrane ręcznie
//   czyStrona           — () => bool; po DOMContentLoaded: false → motyw
//                         schodzi (publikacja, która odeszła z platformy)
//   zachowajCiemneCienie — true: ciemne i kolorowe kolory w box-shadow/
//                         text-shadow zostają (cień pod kartą nie robi się
//                         łuną, pasek statusu nie zmienia barwy)
//   odRazu              — true: start() włącza motyw, zanim dojedzie odczyt
//                         ustawień, a wyłączony zdejmuje chwilę później
//                         (strony, które przy każdym kliknięciu wczytują się
//                         od nowa, nie mrugają bielą)
//   atrybut, idArkusza  — domyślnie data-ls-dark / ls-dark-lustro

globalThis.lsCiemnyMotyw = function utworzCiemnyMotyw(konfig = {}) {
  const ATRYBUT = konfig.atrybut || 'data-ls-dark';
  const ID_ARKUSZA = konfig.idArkusza || 'ls-dark-lustro';
  const KLUCZ = konfig.klucz;
  const RECZNE = new Map(Object.entries(konfig.reczne || {}));
  const czyStrona = konfig.czyStrona || (() => true);
  const zachowajCiemneCienie = !!konfig.zachowajCiemneCienie;
  const odRazu = !!konfig.odRazu;

  // ---------- kolory ----------

  function rgbNaHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return [0, 0, l, 0];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    return [h, s, l, d];
  }

  function hslNaRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v + m)) * 255));
  }

  // Odwrócenie jasności z zachowaniem odcienia. Biel → ~10 %, czerń → biel;
  // kolory nasycone (chroma > 0,2) są ściągane ku środkowi, żeby zieleń
  // przycisku nie zbladła do pastelu, ale nadal kontrastowała z tekstem,
  // który odwraca się tą samą funkcją.
  function mapujRgb(r, g, b) {
    const reczne = RECZNE.get(`${r},${g},${b}`);
    if (reczne) return reczne;
    const [h, s, l, chroma] = rgbNaHsl(r, g, b);
    let l2 = Math.min(1, Math.max(0, 1.09 - 0.99 * l));
    if (chroma > 0.2) l2 = 0.5 + (l2 - 0.5) * 0.6;
    return hslNaRgb(h, s, l2);
  }

  const NAZWANE = { white: [255, 255, 255], black: [0, 0, 0] };

  // „rgb(255, 255, 255)", „rgba(0, 0, 0, 0.05)", „rgb(0 0 0 / 50%)", „#fff",
  // „#ffffff80", „white" → { r, g, b, a } albo null.
  function parsujKolor(tekst) {
    const t = tekst.trim().toLowerCase();
    if (NAZWANE[t]) { const [r, g, b] = NAZWANE[t]; return { r, g, b, a: 1 }; }
    if (t[0] === '#') {
      let h = t.slice(1);
      if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
      if (h.length !== 6 && h.length !== 8) return null;
      const n = parseInt(h, 16);
      if (Number.isNaN(n)) return null;
      if (h.length === 6) return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
      return { r: n >>> 24, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: (n & 255) / 255 };
    }
    if (/^rgba?\(/.test(t)) {
      const liczby = t.slice(t.indexOf('(') + 1, -1).match(/-?[\d.]+%?/g);
      if (!liczby || liczby.length < 3) return null;
      const kanal = (s) => Math.round(Math.min(255, Math.max(0, s.endsWith('%') ? parseFloat(s) * 2.55 : parseFloat(s))));
      const a = liczby[3] === undefined ? 1
        : liczby[3].endsWith('%') ? parseFloat(liczby[3]) / 100 : parseFloat(liczby[3]);
      return { r: kanal(liczby[0]), g: kanal(liczby[1]), b: kanal(liczby[2]), a: Math.min(1, Math.max(0, a)) };
    }
    return null;
  }

  function zapiszKolor(r, g, b, a) {
    return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`;
  }

  // Cień „do zostawienia": ciemny (zwykły cień pod kartą) albo kolorowy
  // (pasek statusu narysowany box-shadow) — łuna z białym kolorem nie.
  const czyCienDoZostawienia = (k) => { const [, , l, chroma] = rgbNaHsl(k.r, k.g, k.b); return l < 0.5 || chroma > 0.2; };

  // Jeden kolor CSS → jego ciemny odpowiednik (tekst wejściowy, gdy nie kolor).
  function mapujKolor(tekst) {
    const k = parsujKolor(tekst);
    if (!k || k.a === 0) return tekst;
    const [r, g, b] = mapujRgb(k.r, k.g, k.b);
    return zapiszKolor(r, g, b, k.a);
  }

  const RE_KOLOR = /rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|\b(?:white|black)\b/gi;

  // Wartość deklaracji z przemapowanymi kolorami albo null, gdy nie ma czego
  // mapować. Pomija url(…) (dane obrazków, odwołania #id) i light-dark(…),
  // które przełącza się samo razem z color-scheme. `nazwa` pozwala zostawić
  // ciemne cienie w spokoju (zachowajCiemneCienie).
  function przemapujWartosc(wartosc, nazwa = '') {
    if (!wartosc || /url\(|light-dark\(/i.test(wartosc)) return null;
    const cien = zachowajCiemneCienie && /shadow/.test(nazwa);
    let zmieniono = false;
    const wynik = wartosc.replace(RE_KOLOR, (m) => {
      if (cien) { const k = parsujKolor(m); if (k && czyCienDoZostawienia(k)) return m; }
      const nowy = mapujKolor(m);
      if (nowy !== m) zmieniono = true;
      return nowy;
    });
    return zmieniono ? wynik : null;
  }

  // ---------- selektory ----------

  // Podział listy selektorów po przecinkach najwyższego poziomu
  // (:is(a, b) i [x="a,b"] zostają w całości).
  function podzielSelektory(tekst) {
    const czesci = [];
    let glebokosc = 0, cudzyslow = null, start = 0;
    for (let i = 0; i < tekst.length; i++) {
      const c = tekst[i];
      if (cudzyslow) { if (c === cudzyslow && tekst[i - 1] !== '\\') cudzyslow = null; continue; }
      if (c === '"' || c === "'") cudzyslow = c;
      else if (c === '(' || c === '[') glebokosc++;
      else if (c === ')' || c === ']') glebokosc--;
      else if (c === ',' && glebokosc === 0) { czesci.push(tekst.slice(start, i)); start = i + 1; }
    }
    czesci.push(tekst.slice(start));
    return czesci.map((s) => s.trim()).filter(Boolean);
  }

  // `.x` → `html[data-ls-dark] .x`; `:root` → `:root[data-ls-dark]`;
  // `html.y` → `html[data-ls-dark].y`.
  function prefiksujSelektor(tekst) {
    return podzielSelektory(tekst).map((s) => {
      const m = /^(html|:root)(?![\w-])/i.exec(s);
      if (m) return `${m[1]}[${ATRYBUT}]${s.slice(m[0].length)}`;
      return `html[${ATRYBUT}] ${s}`;
    }).join(', ');
  }

  // ---------- lustro arkuszy ----------

  let arkusz = null;                 // <style id=ls-dark-lustro>
  const przetworzone = new WeakSet(); // CSSStyleRule, które już mają bliźniaka
  const dodane = new Set();           // teksty bliźniaków (bez duplikatów)

  function mojArkusz() {
    if (arkusz && arkusz.isConnected && arkusz.sheet) return arkusz.sheet;
    arkusz = document.getElementById(ID_ARKUSZA);
    if (!arkusz) {
      arkusz = document.createElement('style');
      arkusz.id = ID_ARKUSZA;
      (document.head || document.documentElement).appendChild(arkusz);
    }
    return arkusz.sheet;
  }

  function czyWlasciwoscKolorowa(nazwa) {
    return nazwa.startsWith('--') || /color|background|border|outline|shadow|fill|stroke/.test(nazwa);
  }

  // Bliźniak reguły stylu: tylko deklaracje z kolorem, priorytet zachowany.
  // Reguły już pod html[data-ls-dark] (statyczny CSS strony, własne lustro)
  // nie dostają bliźniaka — inaczej tło #191919 wróciłoby odwrócone do jasnego.
  function bliznak(regula) {
    if (!regula.selectorText || regula.selectorText.includes(`[${ATRYBUT}]`)) return null;
    const st = regula.style;
    const deklaracje = [];
    for (let i = 0; i < st.length; i++) {
      const p = st[i];
      if (!czyWlasciwoscKolorowa(p)) continue;
      const nowa = przemapujWartosc(st.getPropertyValue(p), p);
      if (nowa === null) continue;
      const pri = st.getPropertyPriority(p);
      deklaracje.push(`${p}: ${nowa}${pri ? ` !${pri}` : ''}`);
    }
    if (!deklaracje.length) return null;
    return `${prefiksujSelektor(regula.selectorText)} { ${deklaracje.join('; ')} }`;
  }

  function dodajRegule(tekst, opakowania) {
    for (let i = opakowania.length - 1; i >= 0; i--) tekst = `${opakowania[i]} { ${tekst} }`;
    if (dodane.has(tekst)) return;
    dodane.add(tekst);
    const s = mojArkusz();
    if (!s) return;
    try { s.insertRule(tekst, s.cssRules.length); } catch (e) { /* egzotyczny selektor — pomijamy */ }
  }

  function przetworzReguly(reguly, opakowania) {
    for (const r of reguly) {
      if (r.type === CSSRule.STYLE_RULE) {
        if (przetworzone.has(r)) continue;
        przetworzone.add(r);
        const t = bliznak(r);
        if (t) dodajRegule(t, opakowania);
      } else if (r.type === CSSRule.MEDIA_RULE) {
        przetworzReguly(r.cssRules, [...opakowania, `@media ${r.conditionText || r.media.mediaText}`]);
      } else if (r.type === CSSRule.SUPPORTS_RULE) {
        przetworzReguly(r.cssRules, [...opakowania, `@supports ${r.conditionText}`]);
      }
    }
  }

  function przetworzArkusz(s) {
    if (!s || (s.ownerNode && s.ownerNode.id === ID_ARKUSZA)) return;
    let reguly;
    try { reguly = s.cssRules; } catch (e) { return; } // cross-origin (czcionki, gist)
    if (!reguly) return;
    // Zapytania medialne bywają na <style media="…">, nie w @media (Fela).
    const media = s.media && s.media.mediaText;
    przetworzReguly(reguly, media && media !== 'all' ? [`@media ${media}`] : []);
  }

  function skanujArkusze() {
    for (const s of document.styleSheets) przetworzArkusz(s);
  }

  // ---------- inline SVG ----------

  const svgStan = new WeakMap(); // element → { fill, stroke, orgfill, orgstroke }
  const ATRYBUTY_SVG = ['fill', 'stroke'];

  function naprawElementSvg(el) {
    for (const a of ATRYBUTY_SVG) {
      const v = el.getAttribute(a);
      if (!v || !parsujKolor(v)) continue;
      const stan = svgStan.get(el) || {};
      if (stan[a] === v) continue; // to już nasza wartość
      const nowy = mapujKolor(v);
      if (nowy === v) continue;
      stan[`org${a}`] = v;
      stan[a] = nowy;
      svgStan.set(el, stan);
      el.setAttribute(a, nowy);
    }
  }

  function naprawSvg(korzen) {
    if (!korzen || korzen.nodeType !== 1) return;
    if (korzen.namespaceURI === 'http://www.w3.org/2000/svg') naprawElementSvg(korzen);
    else if (!korzen.querySelector('svg')) return;
    korzen.querySelectorAll('svg, svg *').forEach(naprawElementSvg);
  }

  function przywrocSvg() {
    document.querySelectorAll('svg, svg *').forEach((el) => {
      const stan = svgStan.get(el);
      if (!stan) return;
      for (const a of ATRYBUTY_SVG) {
        if (stan[a] !== undefined && el.getAttribute(a) === stan[a]) el.setAttribute(a, stan[`org${a}`]);
      }
      svgStan.delete(el);
    });
  }

  // ---------- style="" z kolorami ----------

  const inlineStan = new WeakMap(); // element → { org: atrybut przed nami, nasz: atrybut po nas }
  const RE_MA_KOLOR = /rgba?\(|#[0-9a-f]{3,8}\b|\b(?:white|black)\b/i;

  // Styl inline wygrywa z każdym arkuszem, więc kolory trzeba przepisać
  // w samym atrybucie. Deklaracja po deklaracji, przez CSSStyleDeclaration,
  // żeby nie rozbijać url(…) i priorytetów.
  function naprawInline(el) {
    const atrybut = el.getAttribute('style');
    if (!atrybut || !RE_MA_KOLOR.test(atrybut)) return;
    const stan = inlineStan.get(el);
    if (stan && stan.nasz === atrybut) return; // to już nasza wersja
    const st = el.style;
    const zmiany = [];
    for (let i = 0; i < st.length; i++) {
      const p = st[i];
      if (!czyWlasciwoscKolorowa(p)) continue;
      const nowa = przemapujWartosc(st.getPropertyValue(p), p);
      if (nowa !== null) zmiany.push([p, nowa, st.getPropertyPriority(p)]);
    }
    if (!zmiany.length) return;
    for (const [p, v, pri] of zmiany) st.setProperty(p, v, pri);
    // `atrybut` ≠ nasza wersja, więc to strona go ustawiła — to do niego
    // wracamy po wyłączeniu, nie do wersji sprzed pierwszego przepisania.
    inlineStan.set(el, { org: atrybut, nasz: el.getAttribute('style') });
  }

  function naprawInlineW(korzen) {
    if (!korzen || korzen.nodeType !== 1) return;
    if (korzen.hasAttribute('style')) naprawInline(korzen);
    korzen.querySelectorAll('[style]').forEach(naprawInline);
  }

  function przywrocInline() {
    document.querySelectorAll('[style]').forEach((el) => {
      const stan = inlineStan.get(el);
      if (!stan) return;
      if (el.getAttribute('style') === stan.nasz) el.setAttribute('style', stan.org);
      inlineStan.delete(el);
    });
  }

  // ---------- obserwacja ----------

  let obserwator = null;
  let zegar = null;
  let skanZaplanowany = false;

  function zaplanujSkan() {
    if (skanZaplanowany) return;
    skanZaplanowany = true;
    queueMicrotask(() => { skanZaplanowany = false; skanujArkusze(); });
  }

  function obsluzMutacje(mutacje) {
    let style = false;
    for (const m of mutacje) {
      if (m.type === 'attributes') {
        if (m.attributeName === 'style') naprawInline(m.target); else naprawElementSvg(m.target);
        continue;
      }
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) {
          const tag = n.tagName;
          if (tag === 'STYLE' || tag === 'LINK') style = true;
          else { naprawSvg(n); naprawInlineW(n); }
          // Reguły <link> są w document.styleSheets dopiero po wczytaniu
          // pliku — bez tego czekałyby na zegar do sekundy, w jasnym kolorze.
          if (tag === 'LINK') n.addEventListener('load', zaplanujSkan, { once: true });
        } else if (n.nodeType === 3 && n.parentNode && n.parentNode.tagName === 'STYLE') {
          style = true;
        }
      }
    }
    if (style) zaplanujSkan();
  }

  function wlacz() {
    document.documentElement.setAttribute(ATRYBUT, '');
    mojArkusz();
    skanujArkusze();
    naprawSvg(document.documentElement);
    naprawInlineW(document.documentElement);
    if (!obserwator) {
      obserwator = new MutationObserver(obsluzMutacje);
      obserwator.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: [...ATRYBUTY_SVG, 'style'] });
    }
    // insertRule (CSS-in-JS) MutationObserver nie widzi — stąd rzadki zegar;
    // koszt to przejście po ~1000 obiektach reguł z pominięciem znanych.
    if (!zegar) zegar = setInterval(skanujArkusze, 1000);
  }

  function wylacz() {
    document.documentElement.removeAttribute(ATRYBUT);
    if (obserwator) { obserwator.disconnect(); obserwator = null; }
    if (zegar) { clearInterval(zegar); zegar = null; }
    przywrocSvg();
    przywrocInline();
  }

  // ---------- włącznik (chrome.storage) ----------

  const czyWlaczonyWUstawieniach = (u) => !KLUCZ || (u && u[KLUCZ] && u[KLUCZ].ciemnyMotyw) !== false;

  let obcaStrona = false;

  function sprawdzStrone() {
    if (czyStrona()) return;
    obcaStrona = true;
    wylacz();
  }

  async function start() {
    if (odRazu) wlacz();
    let ustawienia = null;
    try { ustawienia = (await chrome.storage.sync.get('ustawienia')).ustawienia; } catch (e) { /* domyślnie włączony */ }
    if (czyWlaczonyWUstawieniach(ustawienia)) wlacz(); else if (odRazu) wylacz();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sprawdzStrone, { once: true });
    else sprawdzStrone();
    chrome.storage.onChanged.addListener((zmiany, obszar) => {
      if (obszar !== 'sync' || !zmiany.ustawienia || obcaStrona) return;
      if (czyWlaczonyWUstawieniach(zmiany.ustawienia.newValue)) wlacz(); else wylacz();
    });
  }

  return {
    mapujKolor, przemapujWartosc, parsujKolor, podzielSelektory, prefiksujSelektor,
    czyWlaczonyWUstawieniach, czyStrona, wlacz, wylacz, skanujArkusze, start,
  };
};
