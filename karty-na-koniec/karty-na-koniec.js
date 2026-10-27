// Karty otwarte z linku (⌘-klik, środkowy przycisk, target=_blank) lądują
// na końcu listy kart, a nie zaraz pod bieżącą. Chrome wstawia je obok
// karty-rodzica i dokłada do jej grupy, co w pionowych kartach rozbija
// porządek w folderach. Ładowany w service workerze (importScripts
// w background.js).
//
// Kartę z linku poznajemy po openerTabId — nowa pusta karta (⌘T) i karty
// przywrócone z sesji go nie mają, więc zostają tam, gdzie postawił je
// Chrome. Bez uprawnienia `tabs`: openerTabId, index i groupId są zawsze
// dostępne, a tabs.move/ungroup go nie wymagają.

// Kilka linków otwartych szybko po sobie ma trafić na koniec w kolejności
// otwierania — stąd przenoszenie po jednej karcie.
let kolejkaKart = Promise.resolve();

async function przeniesNaKoniec(karta) {
  if (karta.openerTabId === undefined) return;
  if (!(await wczytajUstawienia()).ogolne.kartyNaKoniec) return;
  try {
    // Wyjęcie z grupy przed przeniesieniem: karta przeniesiona za ostatnią
    // kartę grupy mogłaby w niej zostać.
    if (karta.groupId !== -1) await chrome.tabs.ungroup(karta.id);
    await chrome.tabs.move(karta.id, { index: -1 });
    // Gdy ostatnia w oknie jest grupa, Chrome potrafi dołączyć do niej
    // kartę postawioną za nią.
    const poPrzeniesieniu = await chrome.tabs.get(karta.id);
    if (poPrzeniesieniu.groupId !== -1) await chrome.tabs.ungroup(karta.id);
  } catch (e) {
    // Karta zamknięta, zanim zdążyliśmy, albo okno w trakcie przeciągania.
    console.warn('Page Tweaks: przenoszenie karty na koniec', e);
  }
}

chrome.tabs.onCreated.addListener((karta) => {
  kolejkaKart = kolejkaKart.then(() => przeniesNaKoniec(karta));
  return kolejkaKart;
});
