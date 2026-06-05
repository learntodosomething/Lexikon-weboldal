// nav.js — shared navigation helper for multi-page Lexikon

function showToast(msg, dur = 2400) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

function showConfirm(message, confirmLabel, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  const msgEl   = document.getElementById('confirm-message');
  const okBtn   = document.getElementById('confirm-ok');
  const cancelBtn = document.getElementById('confirm-cancel');
  if (!overlay) return;

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

function comingSoon(name) {
  showToast('🚧 ' + name + ' — hamarosan elérhető!');
}
