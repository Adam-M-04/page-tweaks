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

(async () => {
  ustawienia = await wczytajUstawienia();
  wypelnij();
})();
