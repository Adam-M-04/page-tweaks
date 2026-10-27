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
//
// Tu też skrót ⌘D (komenda `duplikuj-karte` z manifestu): duplikat bieżącej
// karty na końcu listy, poza grupą, w tle. Kartę tworzymy sami, więc wiemy,
// którą przenieść.

// Kilka linków otwartych szybko po sobie ma trafić na koniec w kolejności
// otwierania — stąd przenoszenie po jednej karcie.
let kolejkaKart = Promise.resolve();

async function postawNaKoncu(karta) {
  if (karta.groupId !== -1) await chrome.tabs.ungroup(karta.id);
  await chrome.tabs.move(karta.id, { index: -1 });
  // Gdy ostatnia w oknie jest grupa, Chrome potrafi dołączyć do niej
  // kartę postawioną za nią.
  if ((await chrome.tabs.get(karta.id)).groupId !== -1) await chrome.tabs.ungroup(karta.id);
}

async function przeniesNaKoniec({ tabId, sourceTabId }) {
  if (!(await wczytajUstawienia()).ogolne.kartyNaKoniec) return;
  try {
    const [karta, rodzic] = await Promise.all([chrome.tabs.get(tabId), chrome.tabs.get(sourceTabId)]);
    // Link otwarty w nowym oknie zostaje, jak jest.
    if (karta.windowId !== rodzic.windowId) return;
    if (karta.groupId !== -1 && karta.groupId !== rodzic.groupId) return;
    await postawNaKoncu(karta);
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

chrome.commands.onCommand.addListener(async (komenda, karta) => {
  if (komenda !== 'duplikuj-karte') return;
  if (!(await wczytajUstawienia()).ogolne.duplikujKarte) return;
  karta ??= (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  if (!karta) return;
  try {
    const kopia = await chrome.tabs.duplicate(karta.id);
    // Chrome przełącza na duplikat — wracamy do oryginału.
    await chrome.tabs.update(karta.id, { active: true });
    await postawNaKoncu(kopia);
  } catch (e) {
    console.warn('Page Tweaks: duplikowanie karty', e);
  }
});
