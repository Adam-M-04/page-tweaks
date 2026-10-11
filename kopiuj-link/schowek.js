// Dokument offscreen: dostaje tekst z service workera i wkłada go do schowka.
// navigator.clipboard tu nie działa (dokument nigdy nie ma fokusu), więc
// klasycznie: textarea + execCommand('copy').
chrome.runtime.onMessage.addListener((wiadomosc, _nadawca, odpowiedz) => {
  if (typeof wiadomosc?.schowek !== 'string') return;
  const pole = document.querySelector('textarea');
  pole.value = wiadomosc.schowek;
  pole.select();
  odpowiedz(document.execCommand('copy'));
  pole.value = '';
});
