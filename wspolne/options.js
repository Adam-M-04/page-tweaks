// Strona ustawień: każdy przełącznik to para data-klucz / data-pole
// w obiekcie `ustawienia` (ustawienia.js). Zapis od razu po zmianie —
// content scripty i background.js słuchają chrome.storage.onChanged.

const przelaczniki = [...document.querySelectorAll('input[data-klucz]')];
let ustawienia = structuredClone(DOMYSLNE_USTAWIENIA);
let zegarKomunikatu = null;

function pokazZapisano() {
  const el = document.getElementById('zapisano');
  el.textContent = 'zapisane';
  clearTimeout(zegarKomunikatu);
  zegarKomunikatu = setTimeout(() => (el.textContent = ''), 1500);
}

function wypelnij() {
  for (const p of przelaczniki) p.checked = ustawienia[p.dataset.klucz][p.dataset.pole] !== false;
}

for (const p of przelaczniki) {
  p.addEventListener('change', async () => {
    ustawienia[p.dataset.klucz] = { ...ustawienia[p.dataset.klucz], [p.dataset.pole]: p.checked };
    await zapiszUstawienia(ustawienia);
    pokazZapisano();
  });
}

// Skróty ustawia użytkownik w Chrome, nie tutaj — pokazujemy
// aktualny i odsyłamy do chrome://extensions/shortcuts (zwykły link tam nie
// otworzy, tabs.create tak).
async function pokazSkrot() {
  for (const komenda of await chrome.commands.getAll()) {
    const el = document.getElementById('skrot-' + komenda.name);
    if (el) el.textContent = komenda.shortcut || 'brak skrótu';
  }
}
document.getElementById('zmien-skrot').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
// Po powrocie z ustawień skrótów.
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && pokazSkrot());

(async () => {
  ustawienia = await wczytajUstawienia();
  wypelnij();
  pokazSkrot();
})();
