// Karty otwarte z linku (⌘-klik, środkowy przycisk, target=_blank) lądują
// na końcu listy kart, a nie zaraz pod bieżącą. Chrome wstawia je obok
// karty-rodzica i dokłada do jej grupy, co w pionowych kartach rozbija
// porządek w folderach. Ładowany w service workerze (importScripts
// w background.js).
//
// Kartę z linku poznajemy po webNavigation.onCreatedNavigationTarget —
// zdarzenie przychodzi tylko wtedy, gdy nową kartę otworzyła strona.
// Nie po openerTabId: ten mają też karty, które Chrome tworzy sam (przycisk
// „nowa grupa”, przywracanie sesji), a wyjęcie ich z grupy kasuje grupę.
// Z grupy wyjmujemy tylko kartę, która trafiła do grupy rodzica.

// Kilka linków otwartych szybko po sobie ma trafić na koniec w kolejności
// otwierania — stąd przenoszenie po jednej karcie.
let kolejkaKart = Promise.resolve();

async function przeniesNaKoniec({ tabId, sourceTabId }) {
  if (!(await wczytajUstawienia()).ogolne.kartyNaKoniec) return;
  try {
    const [karta, rodzic] = await Promise.all([chrome.tabs.get(tabId), chrome.tabs.get(sourceTabId)]);
    // Link otwarty w nowym oknie zostaje, jak jest.
    if (karta.windowId !== rodzic.windowId) return;
    if (karta.groupId !== -1) {
      if (karta.groupId !== rodzic.groupId) return;
      await chrome.tabs.ungroup(tabId);
    }
    await chrome.tabs.move(tabId, { index: -1 });
    // Gdy ostatnia w oknie jest grupa, Chrome potrafi dołączyć do niej
    // kartę postawioną za nią.
    if ((await chrome.tabs.get(tabId)).groupId !== -1) await chrome.tabs.ungroup(tabId);
  } catch (e) {
    // Karta albo rodzic zamknięte, zanim zdążyliśmy.
    console.warn('Page Tweaks: przenoszenie karty na koniec', e);
  }
}

// Bez uprawnienia webNavigation (manifest sprzed przeładowania) funkcja
// po prostu nie działa — reszta service workera musi się załadować.
if (chrome.webNavigation) {
  chrome.webNavigation.onCreatedNavigationTarget.addListener((cel) => {
    kolejkaKart = kolejkaKart.then(() => przeniesNaKoniec(cel));
    return kolejkaKart;
  });
} else {
  console.error('Page Tweaks: brak uprawnienia webNavigation — karty z linków zostają tam, gdzie postawi je Chrome');
}
