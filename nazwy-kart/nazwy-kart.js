// Własne nazwy kart: prawy przycisk na karcie (pasek kart, też pionowy) →
// „Zmień nazwę karty…”. Nazwa należy do tej jednej karty — zostaje przy
// przechodzeniu po stronach i po restarcie Chrome, a dwie karty tej samej
// domeny mogą nazywać się inaczej. Pusta nazwa przywraca tytuł strony.
// Ładowany w service workerze (importScripts w background.js); tytuł
// w karcie podmienia nazwa-karty.js.
//
// W trakcie sesji nazwy leżą w chrome.storage.session pod `nazwaKarty:<id>`.
// Po restarcie karty dostają nowe id, a storage.session jest pusty, więc
// nazwa-karty.js odkłada nazwę także w sessionStorage strony — Chrome
// przywraca go razem z kartą. Wpis niesie id sesji przeglądarki: z innej
// sesji to karta przywrócona, z tej samej to kopia sessionStorage w karcie
// otwartej z nazwanej (ta nazwy nie dziedziczy).

const MENU_NAZWA_KARTY = 'zmien-nazwe-karty';
const kluczNazwy = (idKarty) => `nazwaKarty:${idKarty}`;

// Menu jest tylko przy włączonej opcji. Z onChanged przychodzi surowy obiekt
// ze storage (bez domyślnych), więc brak pola znaczy „włączona".
async function ustawMenuNazwy(ustawienia) {
  const u = ustawienia || (await wczytajUstawienia());
  await chrome.contextMenus.remove(MENU_NAZWA_KARTY).catch(() => {});
  if (u.ogolne?.nazwyKart === false) return;
  // Callback połyka błąd duplikatu, gdy dwa wywołania się zazębią.
  chrome.contextMenus.create({ id: MENU_NAZWA_KARTY, title: 'Zmień nazwę karty…', contexts: ['tab'] }, () => chrome.runtime.lastError);
}
chrome.runtime.onInstalled.addListener(() => { ustawMenuNazwy(); });
chrome.storage.onChanged.addListener((zmiany, obszar) => {
  if (obszar === 'sync' && zmiany.ustawienia) ustawMenuNazwy(zmiany.ustawienia.newValue || {});
});

// Id sesji przeglądarki — nowe po każdym starcie Chrome, bo storage.session
// się wtedy czyści. Obietnica w zmiennej tylko po to, żeby karty ładowane
// naraz po restarcie nie wylosowały każda swojego.
let sesjaPrzegladarki = null;
function idSesji() {
  sesjaPrzegladarki ??= (async () => {
    const { sesja } = await chrome.storage.session.get('sesja');
    if (sesja) return sesja;
    const nowa = crypto.randomUUID();
    await chrome.storage.session.set({ sesja: nowa });
    return nowa;
  })();
  return sesjaPrzegladarki;
}

async function nazwaKarty(idKarty) {
  const klucz = kluczNazwy(idKarty);
  return (await chrome.storage.session.get(klucz))[klucz] || null;
}

const zapiszNazwe = (idKarty, nazwa) => nazwa
  ? chrome.storage.session.set({ [kluczNazwy(idKarty)]: nazwa })
  : chrome.storage.session.remove(kluczNazwy(idKarty));

chrome.tabs.onRemoved.addListener((idKarty) => { zapiszNazwe(idKarty, null); });
// Podmiana karty przez Chrome (prerender) — nazwa przechodzi na nową.
chrome.tabs.onReplaced.addListener(async (nowa, stara) => {
  const nazwa = await nazwaKarty(stara);
  if (!nazwa) return;
  await zapiszNazwe(nowa, nazwa);
  await zapiszNazwe(stara, null);
});

// nazwa-karty.js pyta o nazwę przy każdym wczytaniu strony w głównej ramce.
chrome.runtime.onMessage.addListener((wiadomosc, nadawca, odpowiedz) => {
  if (wiadomosc?.nazwaKarty !== 'pobierz' || !nadawca.tab || nadawca.frameId !== 0) return;
  (async () => {
    const sesja = await idSesji();
    let nazwa = await nazwaKarty(nadawca.tab.id);
    const zapisana = wiadomosc.zSesji;
    if (!nazwa && zapisana?.nazwa && zapisana.sesja !== sesja) {
      nazwa = zapisana.nazwa;
      await zapiszNazwe(nadawca.tab.id, nazwa);
    }
    odpowiedz(nazwa ? { nazwa, sesja } : null);
  })();
  return true;
});

// Wykonywana w stronie — bez odwołań do niczego z zewnątrz.
function zapytajONazwe(obecna) {
  return prompt('Nazwa karty (pusta przywraca tytuł strony):', obecna || document.title);
}

async function niePowiodloSie(idKarty) {
  await chrome.action.setBadgeBackgroundColor({ tabId: idKarty, color: '#dc2626' });
  await chrome.action.setBadgeText({ tabId: idKarty, text: '!' });
  setTimeout(() => chrome.action.setBadgeText({ tabId: idKarty, text: '' }).catch(() => {}), 1500);
}

chrome.contextMenus.onClicked.addListener(async (info, karta) => {
  if (info.menuItemId !== MENU_NAZWA_KARTY || !karta) return;
  // Bez url nie mamy dostępu do strony (chrome://, Web Store) — tam
  // i tak nie da się podmienić tytułu.
  if (!karta.url) return niePowiodloSie(karta.id);

  let nowa;
  try {
    // Okienko w karcie w tle czekałoby, aż ktoś na nią przejdzie.
    await chrome.tabs.update(karta.id, { active: true });
    [{ result: nowa }] = await chrome.scripting.executeScript({
      target: { tabId: karta.id },
      func: zapytajONazwe,
      args: [await nazwaKarty(karta.id)],
    });
  } catch (e) {
    console.warn('Page Tweaks: zmiana nazwy karty', e);
    return niePowiodloSie(karta.id);
  }
  if (typeof nowa !== 'string') return; // Anuluj

  nowa = nowa.trim() || null;
  await zapiszNazwe(karta.id, nowa);
  const wpis = nowa && { nazwa: nowa, sesja: await idSesji() };
  try {
    await chrome.tabs.sendMessage(karta.id, { nazwaKarty: wpis }, { frameId: 0 });
  } catch {
    // Strona otwarta przed wczytaniem rozszerzenia nie ma nazwa-karty.js —
    // wstrzyknięty sam zapyta o nazwę.
    await chrome.scripting.executeScript({ target: { tabId: karta.id }, files: ['nazwy-kart/nazwa-karty.js'] }).catch(() => {});
  }
});
