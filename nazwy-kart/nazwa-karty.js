// Podmienia tytuł strony na własną nazwę karty (nazwy-kart.js) — pasek kart
// pokazuje właśnie document.title. Content script na wszystkich stronach,
// tylko w głównej ramce; wstrzykiwany też do kart otwartych przed
// wczytaniem rozszerzenia.
//
// Przy wczytaniu pyta service worker o nazwę tej karty i podaje wpis
// z sessionStorage — po restarcie Chrome tylko stamtąd nazwa wraca.
// Strony same zmieniają tytuł (liczniki powiadomień, aplikacje SPA), więc na
// stronie z nazwą obserwator pilnuje <title> i przywraca nazwę. Tytuł
// ustawiony przez stronę zapamiętujemy, żeby wrócił po usunięciu nazwy.
(() => {
  if (globalThis.pageTweaksNazwaKarty) return;
  globalThis.pageTweaksNazwaKarty = true;

  const KLUCZ = 'page-tweaks-nazwa-karty';
  let nazwa = null;
  let wlaczone = true;
  let nasza = null;       // nazwa, którą ostatnio wpisaliśmy w tytuł
  let tytulStrony = null; // tytuł ustawiony przez samą stronę
  let obserwator = null;

  function zastosuj() {
    const n = wlaczone ? nazwa : null;
    if (document.title !== nasza) tytulStrony = document.title;
    if (n) {
      nasza = n;
      if (document.title !== n) document.title = n;
      obserwuj();
    } else if (nasza !== null) {
      nasza = null;
      document.title = tytulStrony;
    }
  }

  // Cały dokument, bo przy document_start nie ma jeszcze <head>, a <title>
  // strona może podmienić w całości. Wywołanie to tylko porównanie napisów.
  function obserwuj() {
    if (obserwator) return;
    obserwator = new MutationObserver(zastosuj);
    obserwator.observe(document, { childList: true, subtree: true, characterData: true });
  }

  // sessionStorage bywa niedostępny (zablokowane dane witryn) — wtedy
  // nazwa działa do restartu.
  function zSesji() {
    try { return JSON.parse(sessionStorage.getItem(KLUCZ)); } catch { return null; }
  }
  function ustaw(wpis) {
    nazwa = wpis?.nazwa || null;
    try {
      if (nazwa) sessionStorage.setItem(KLUCZ, JSON.stringify(wpis));
      else sessionStorage.removeItem(KLUCZ);
    } catch {}
    zastosuj();
  }

  chrome.runtime.onMessage.addListener((wiadomosc, _nadawca, odpowiedz) => {
    if (!wiadomosc || !('nazwaKarty' in wiadomosc) || wiadomosc.nazwaKarty === 'pobierz') return;
    ustaw(wiadomosc.nazwaKarty);
    odpowiedz(true);
  });

  chrome.storage.onChanged.addListener((zmiany, obszar) => {
    if (obszar !== 'sync' || !zmiany.ustawienia) return;
    wlaczone = zmiany.ustawienia.newValue?.ogolne?.nazwyKart !== false;
    zastosuj();
  });

  (async () => {
    const [{ ustawienia }, wpis] = await Promise.all([
      chrome.storage.sync.get('ustawienia'),
      // Bez odpowiedzi (rozszerzenie przeładowane w trakcie) nie ruszamy
      // tego, co jest w sessionStorage.
      chrome.runtime.sendMessage({ nazwaKarty: 'pobierz', zSesji: zSesji() }).catch(() => undefined),
    ]);
    wlaczone = ustawienia?.ogolne?.nazwyKart !== false;
    if (wpis !== undefined) ustaw(wpis);
  })();
})();
