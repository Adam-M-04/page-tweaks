// Ustawienia rozszerzenia — jeden obiekt `ustawienia` w chrome.storage.sync,
// po kluczu na stronę. Ładowane w opcjach i w service workerze
// (importScripts); content scripty czytają ten sam obiekt same, bo działają
// od document_start i nie czekają na nic więcej niż storage.

const DOMYSLNE_USTAWIENIA = {
  medium: {
    ciemnyMotyw: true,  // ciemny motyw na medium.com (ciemny-motyw.js + medium-dark.js)
  },
  qnews: {
    ciemnyMotyw: true,  // ciemny motyw na qnews.pl (ciemny-motyw.js + qnews-dark.js)
  },
  limanowa: {
    czytnik: true,      // czytnik bez reklam na limanowa.in (limanowa-czytnik.* + limanowa-reguly.json)
    daty: true,         // główna sekcja jako lista od najnowszego, daty na kafelkach (limanowa-daty.*)
  },
};

async function wczytajUstawienia() {
  const u = (await chrome.storage.sync.get('ustawienia')).ustawienia || {};
  const wynik = {};
  for (const [klucz, domyslne] of Object.entries(DOMYSLNE_USTAWIENIA)) {
    wynik[klucz] = { ...domyslne, ...(u[klucz] || {}) };
  }
  return wynik;
}

const zapiszUstawienia = (ustawienia) => chrome.storage.sync.set({ ustawienia });
