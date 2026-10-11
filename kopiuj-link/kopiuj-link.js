// Skrót „kopiuj link" jak w Arc: ⌘⇧C (Ctrl+Shift+C poza macOS) kopiuje
// adres bieżącej karty i pokazuje na stronie dymek „Skopiowano link".
// Ładowany w service workerze (importScripts w background.js).
//
// Skrót to komenda `kopiuj-link` z manifestu — zmiana w
// chrome://extensions/shortcuts. Wyłączony w ustawieniach (ogolne.kopiujLink)
// skrót dalej należy do rozszerzenia, bo Chrome nie pozwala zwolnić go
// z kodu; po prostu nic nie robi.
//
// Schowek: service worker nie ma do niego dostępu, a skrypt wstrzyknięty
// w stronę nie skopiuje, gdy fokus jest w pasku adresu, ani na stronach
// chrome://. Stąd dokument offscreen (schowek.html) z execCommand('copy').
// Dymek wstrzykuje scripting (activeTab z komendy); tam, gdzie się nie da
// (chrome://, Web Store), potwierdzeniem jest ✓ na ikonie rozszerzenia.

const SCHOWEK = 'kopiuj-link/schowek.html';
let tworzenieSchowka = null;

async function dokumentSchowka() {
  if (await chrome.offscreen.hasDocument()) return;
  // Dwa szybkie naciśnięcia nie mogą tworzyć dwóch dokumentów.
  tworzenieSchowka ??= chrome.offscreen
    .createDocument({ url: SCHOWEK, reasons: ['CLIPBOARD'], justification: 'Kopiowanie adresu karty do schowka' })
    .finally(() => (tworzenieSchowka = null));
  await tworzenieSchowka;
}

// Wykonywana w stronie (świat izolowany) — bez odwołań do niczego z zewnątrz.
// Shadow DOM, żeby CSS strony nie dosięgał dymka; bez innerHTML, bo strony
// z Trusted Types by go odrzuciły.
function dymek(tekst, udane) {
  document.getElementById('page-tweaks-dymek')?.remove();
  const host = document.createElement('div');
  host.id = 'page-tweaks-dymek';
  host.style.cssText = 'all: initial; position: fixed; top: 16px; right: 16px; z-index: 2147483647; pointer-events: none;';
  const cien = host.attachShadow({ mode: 'closed' });
  const styl = document.createElement('style');
  styl.textContent = `
    div {
      display: flex; align-items: center; gap: 8px; padding: 9px 14px 9px 11px;
      border-radius: 10px; background: rgba(17, 24, 39, .92); color: #f9fafb;
      font: 500 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      box-shadow: 0 8px 24px rgba(0, 0, 0, .25), 0 0 0 1px rgba(255, 255, 255, .08);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      animation: wejdz .18s ease-out;
    }
    i { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%;
        background: ${udane ? '#22c55e' : '#ef4444'}; color: #fff; font: 700 11px/1 system-ui; font-style: normal; }
    div.znika { opacity: 0; transform: translateY(-6px); transition: opacity .2s, transform .2s; }
    @keyframes wejdz { from { opacity: 0; transform: translateY(-6px); } }
    @media (prefers-reduced-motion: reduce) { div, div.znika { animation: none; transition: none; transform: none; } }
  `;
  const ramka = document.createElement('div');
  const znak = document.createElement('i');
  znak.textContent = udane ? '✓' : '!';
  ramka.append(znak, tekst);
  cien.append(styl, ramka);
  document.documentElement.append(host);
  setTimeout(() => ramka.classList.add('znika'), 1400);
  setTimeout(() => host.remove(), 1650);
}

async function potwierdz(idKarty, udane) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: idKarty },
      func: dymek,
      args: [udane ? 'Skopiowano link' : 'Nie udało się skopiować linku', udane],
    });
  } catch {
    await chrome.action.setBadgeBackgroundColor({ tabId: idKarty, color: udane ? '#16a34a' : '#dc2626' });
    await chrome.action.setBadgeText({ tabId: idKarty, text: udane ? '✓' : '!' });
    setTimeout(() => chrome.action.setBadgeText({ tabId: idKarty, text: '' }).catch(() => {}), 1500);
  }
}

chrome.commands.onCommand.addListener(async (komenda, karta) => {
  if (komenda !== 'kopiuj-link') return;
  if (!(await wczytajUstawienia()).ogolne.kopiujLink) return;
  karta ??= (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  const adres = karta && (karta.url || karta.pendingUrl);
  if (!adres) return;

  let udane = false;
  try {
    await dokumentSchowka();
    udane = (await chrome.runtime.sendMessage({ schowek: adres })) === true;
  } catch (e) {
    console.warn('Page Tweaks: kopiowanie linku', e);
  }
  await potwierdz(karta.id, udane);
});
