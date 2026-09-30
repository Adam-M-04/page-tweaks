// Nowy wygląd Wirtualnego Dziekanatu PK (ehms.pk.edu.pl) — content script
// (document_start) do ehms-wyglad.css.
//
// Cały wygląd jest w CSS pod :root[data-ls-ehms] — ten skrypt stawia atrybut,
// pilnuje włącznika, oznacza w bocznym menu bieżącą podstronę
// (data-ls-biezacy), bo strona tego nie robi, i powiększa pole kliknięcia
// zwijanych sekcji na cały wiersz. Poza tym w HTML zmienia tylko tekst linków
// pod kartą logowania — bez nawiasów „[…]", wracają po wyłączeniu. Żadnego
// przenoszenia ani podmiany elementów, więc przyciski, formularze i skrypty
// strony (xajax, jQuery, Bootstrap) widzą ten sam DOM.
//
// Bieżąca podstrona: link z bocznego menu o tych samych parametrach tab i sub
// co adres strony (?tab=5&sub=2 → „Plan zajęć"), a gdy adres nie ma sub
// (pierwsze wejście w zakładkę) — link o tej samej nazwie co tytuł karty
// z treścią („Program studiów") albo taki, od którego ten tytuł się zaczyna
// („Moje dane osobowe" → „Moje dane"). Pierwszego linku z brzegu nie bierze:
// w Poczcie domyślna jest druga pozycja.
//
// Włącznik: ustawienia → ehms.pk.edu.pl → „Nowy wygląd" (chrome.storage.sync,
// `ustawienia.ehms.wyglad`, domyślnie włączony).

(() => {
  const ATRYBUT = 'data-ls-ehms';
  const BIEZACY = 'data-ls-biezacy';
  const html = document.documentElement;

  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function parametry(href) {
    try { const u = new URL(href, location.href); return [u.searchParams.get('tab'), u.searchParams.get('sub')]; } catch (e) { return [null, null]; }
  }

  function oznaczBiezacy() {
    if (!html.hasAttribute(ATRYBUT)) return;
    const linki = [...document.querySelectorAll('.kal-sidemenu a.nav-link[href]')];
    if (!linki.length) return;
    const [tab, sub] = parametry(location.href);
    let biezacy = null;
    if (sub !== null) biezacy = linki.find((a) => { const [t, s] = parametry(a.getAttribute('href')); return t === tab && s === sub; });
    if (!biezacy) {
      const tytul = norm(document.querySelector('.kal-main .content > .bg-white > .border-bottom b')?.textContent);
      // Dokładnie ta sama nazwa, a jak nie ma — najdłuższa, od której tytuł się
      // zaczyna („Skrzynka odbiorcza, jan kowalski" → „Skrzynka odbiorcza").
      if (tytul) {
        biezacy = linki.find((a) => norm(a.textContent) === tytul) ||
          linki.filter((a) => norm(a.textContent) && tytul.startsWith(norm(a.textContent)))
            .sort((a, b) => norm(b.textContent).length - norm(a.textContent).length)[0];
      }
    }
    for (const a of linki) a.toggleAttribute(BIEZACY, a === biezacy);
  }

  // Zwijane sekcje („Dane podstawowe", „Dane dodatkowe"… w Moich danych)
  // otwiera tylko ikonka 17 px z onclick="show_hide(this,…)". Klik w resztę
  // wiersza przekazujemy do tej ikonki — ta sama funkcja strony, nic więcej.
  function klikWierszaSekcji(e) {
    if (!html.hasAttribute(ATRYBUT) || e.button !== 0 || !(e.target instanceof Element)) return;
    const wiersz = e.target.closest('.kal-main .content div.d-flex');
    const ikona = wiersz && wiersz.querySelector(':scope > i.ti[onclick^="show_hide"]');
    if (!ikona || ikona.contains(e.target) || e.target.closest('a, button, input, select, textarea, label')) return;
    ikona.click();
  }
  document.addEventListener('click', klikWierszaSekcji);

  // Linki pod kartą logowania: „[rejestracja/odzyskiwanie kont studentów]" →
  // bez nawiasów. Zmienia się tylko tekst w węzłach tekstowych, oryginał
  // czeka w mapie na wyłączenie.
  const zNawiasami = new Map();
  function zdejmijNawiasy() {
    for (const a of document.querySelectorAll('.kal-login__footer-links > a')) {
      for (const t of a.childNodes) {
        if (t.nodeType !== Node.TEXT_NODE || !/^\s*\[|\]\s*$/.test(t.data)) continue;
        zNawiasami.set(t, t.data);
        t.data = t.data.replace(/^(\s*)\[/, '$1').replace(/\](\s*)$/, '$1');
      }
    }
  }
  function przywrocNawiasy() {
    for (const [t, tekst] of zNawiasami) t.data = tekst;
    zNawiasami.clear();
  }

  // Po DOMContentLoaded — ustawienia mogły już wyłączyć wygląd.
  function poWczytaniu() {
    if (!html.hasAttribute(ATRYBUT)) return;
    oznaczBiezacy();
    zdejmijNawiasy();
  }

  function wlacz() {
    html.setAttribute(ATRYBUT, '');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poWczytaniu, { once: true });
    else poWczytaniu();
  }

  function wylacz() {
    html.removeAttribute(ATRYBUT);
    for (const a of document.querySelectorAll(`[${BIEZACY}]`)) a.removeAttribute(BIEZACY);
    przywrocNawiasy();
  }

  const czyWlaczonyWUstawieniach = (u) => (u && u.ehms && u.ehms.wyglad) !== false;

  async function start() {
    // Od razu, zanim dojedzie odczyt ustawień — strona wczytuje się od nowa
    // przy każdym kliknięciu w menu i stary wygląd mignąłby za każdym razem.
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
  // tylko wystawia API — test/mock-ehms.html włącza wygląd sam.
  globalThis.__lsEhmsWyglad = { wlacz, wylacz, oznaczBiezacy, czyWlaczonyWUstawieniach };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) start();
})();
