// Service worker: przełącza zestawy reguł sieciowych i otwiera ustawienia
// po kliknięciu ikony. Cała reszta dzieje się w content scriptach.
importScripts('ustawienia.js');

// Zestaw reguł (id z manifestu → declarative_net_request) idzie za tym samym
// włącznikiem co CSS danej poprawki.
const ZESTAWY_REGUL = [
  { id: 'limanowa', klucz: 'limanowa', pole: 'czytnik' },  // strony/limanowa/limanowa-reguly.json
  { id: 'rmf24', klucz: 'rmf24', pole: 'bezReklam' },       // strony/rmf24/rmf24-reguly.json
];

// Włączone zestawy Chrome pamięta między sesjami, ale nie po aktualizacji
// rozszerzenia — stąd też onInstalled. Z onChanged przychodzi surowy obiekt
// ze storage (bez domyślnych), więc brak pola znaczy „włączony".
async function ustawReguly(ustawienia) {
  const u = ustawienia || (await wczytajUstawienia());
  const wlaczone = [];
  const wylaczone = [];
  for (const z of ZESTAWY_REGUL) {
    ((u[z.klucz] && u[z.klucz][z.pole]) !== false ? wlaczone : wylaczone).push(z.id);
  }
  await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: wlaczone, disableRulesetIds: wylaczone });
}
chrome.runtime.onInstalled.addListener(() => { ustawReguly(); });
chrome.runtime.onStartup.addListener(() => { ustawReguly(); });
chrome.storage.onChanged.addListener((zmiany, obszar) => {
  if (obszar === 'sync' && zmiany.ustawienia) ustawReguly(zmiany.ustawienia.newValue || {});
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
