// Ustawienia rozszerzenia — jeden obiekt `ustawienia` w chrome.storage.sync,
// po kluczu na stronę. Ładowane w opcjach i w service workerze
// (importScripts); content scripty czytają ten sam obiekt same, bo działają
// od document_start i nie czekają na nic więcej niż storage.
//
// Nowa strona: folder w strony/, wpis w content_scripts w manifeście, klucz
// tutaj i sekcja z przełącznikami w options.html. Reguły sieciowe: zestaw
// w declarative_net_request i wpis w background.js. Atrapa z testami
// w test/mock-<strona>.html — `php -S localhost:8000`, potem
// http://localhost:8000/test/mock-<strona>.html?auto=1.

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
  rmf24: {
    bezReklam: true,    // bez reklam, okna zgody, wstawek wideo i autopromocji na rmf24.pl (rmf24-bez-reklam.* + rmf24-reguly.json)
    wpisy: true,        // wpisy z X, Instagrama i Facebooka w artykułach za przyciskiem „Zobacz wpis” (rmf24-wpisy.*)
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
