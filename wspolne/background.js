// Service worker: przełącza reguły sieciowe czytnika limanowa.in i otwiera
// ustawienia po kliknięciu ikony. Cała reszta dzieje się w content scriptach.
importScripts('ustawienia.js');

// Reguły sieciowe (limanowa-reguly.json) idą za tym samym włącznikiem co CSS
// czytnika. Włączone zestawy Chrome pamięta między sesjami, ale nie po
// aktualizacji rozszerzenia — stąd też onInstalled.
async function ustawRegulyLimanowej(ustawienia) {
  const u = ustawienia || (await wczytajUstawienia());
  const wlaczony = (u.limanowa && u.limanowa.czytnik) !== false;
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    wlaczony ? { enableRulesetIds: ['limanowa'] } : { disableRulesetIds: ['limanowa'] },
  );
}
chrome.runtime.onInstalled.addListener(() => { ustawRegulyLimanowej(); });
chrome.runtime.onStartup.addListener(() => { ustawRegulyLimanowej(); });
chrome.storage.onChanged.addListener((zmiany, obszar) => {
  if (obszar === 'sync' && zmiany.ustawienia) ustawRegulyLimanowej(zmiany.ustawienia.newValue || {});
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
