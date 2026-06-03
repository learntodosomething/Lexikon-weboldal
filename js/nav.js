let currentScreen = 'main';

function showGames() {
  if (currentScreen === 'games') return;
  document.getElementById('screen-main').classList.add('hidden');
  document.getElementById('screen-games').classList.add('visible');
  document.getElementById('screen-wordle').classList.remove('visible');
  document.getElementById('screen-szambetu').classList.remove('visible');
  document.getElementById('topbar-games-btn').style.display = '';
  currentScreen = 'games';
  window.scrollTo(0, 0);
  if (typeof wHandleKey !== 'undefined') document.removeEventListener('keydown', wHandleKey);
  if (typeof sbHandleKey !== 'undefined') document.removeEventListener('keydown', sbHandleKey);
}

function goHome() {
  if (currentScreen === 'main') return;
  document.getElementById('screen-main').classList.remove('hidden');
  document.getElementById('screen-games').classList.remove('visible');
  document.getElementById('screen-wordle').classList.remove('visible');
  document.getElementById('screen-szambetu').classList.remove('visible');
  document.getElementById('topbar-games-btn').style.display = '';
  currentScreen = 'main';
  window.scrollTo(0, 0);
  if (typeof wHandleKey !== 'undefined') document.removeEventListener('keydown', wHandleKey);
  if (typeof sbHandleKey !== 'undefined') document.removeEventListener('keydown', sbHandleKey);
  hideSbWin();
}

function comingSoon(name) {
  showToast('🚧 ' + name + ' — hamarosan elérhető!');
}

function showToast(msg, dur = 2400) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

function showConfirm(message, confirmLabel, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  const msgEl   = document.getElementById('confirm-message');
  const okBtn   = document.getElementById('confirm-ok');
  const cancelBtn = document.getElementById('confirm-cancel');

  msgEl.textContent = message;
  okBtn.textContent = confirmLabel;
  overlay.classList.add('show');

  const doConfirm = () => {
    overlay.classList.remove('show');
    okBtn.removeEventListener('click', doConfirm);
    cancelBtn.removeEventListener('click', doCancel);
    onConfirm();
  };
  const doCancel = () => {
    overlay.classList.remove('show');
    okBtn.removeEventListener('click', doConfirm);
    cancelBtn.removeEventListener('click', doCancel);
  };

  okBtn.addEventListener('click', doConfirm);
  cancelBtn.addEventListener('click', doCancel);
}
