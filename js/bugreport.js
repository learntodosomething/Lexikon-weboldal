let brCurrentType = 'hiba';
const BR_ENDPOINT = 'https://formspree.io/f/mvzngvzg';

function brOpenModal() {
  const overlay = document.getElementById('br-modal-overlay');
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden'; // prevent background scroll
  // Focus title input after animation — keeps keyboard behaviour natural
  setTimeout(() => {
    const inp = document.getElementById('br-title');
    if (inp) inp.focus();
  }, 350);
}

function brCloseModal() {
  const overlay = document.getElementById('br-modal-overlay');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

// Close when tapping the dark backdrop (but not the modal card itself)
function brOverlayClick(e) {
  if (e.target === document.getElementById('br-modal-overlay')) brCloseModal();
}

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('br-modal-overlay').classList.contains('show')) {
    brCloseModal();
  }
});

function brSetType(btn, type) {
  brCurrentType = type;
  document.querySelectorAll('.br-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

document.getElementById('br-detail').addEventListener('input', function() {
  document.getElementById('br-charcount').textContent = this.value.length + ' / 1000';
});

async function brSubmit() {
  const title  = document.getElementById('br-title').value.trim();
  const detail = document.getElementById('br-detail').value.trim();
  const btn    = document.getElementById('br-submit-btn');
  const lbl    = document.getElementById('br-submit-label');

  if (!title) {
    document.getElementById('br-title').focus();
    showToast('⚠️ Kérlek írd le röviden a problémát!');
    return;
  }

  btn.disabled = true;
  lbl.textContent = 'Küldés...';

  const typeLabels = { hiba: '🐛 Hiba', otlet: '💡 Ötlet', egyeb: '💬 Egyéb' };

  try {
    const res = await fetch(BR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        tipus:     typeLabels[brCurrentType] || brCurrentType,
        leiras:    title,
        reszletek: detail || '(nem adott meg részleteket)',
        oldal:     window.location.href
      })
    });

    if (res.ok) {
      // Show success, hide form
      document.getElementById('br-form-wrap').style.display = 'none';
      document.getElementById('br-success').classList.add('show');
      // Reset form for next time
      document.getElementById('br-title').value  = '';
      document.getElementById('br-detail').value = '';
      document.getElementById('br-charcount').textContent = '0 / 1000';
      brCurrentType = 'hiba';
      document.querySelectorAll('.br-type-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    } else {
      throw new Error('server');
    }
  } catch {
    showToast('❌ Hiba a küldésnél — próbáld újra!');
    btn.disabled = false;
    lbl.textContent = 'Küldés';
  }
}

// When modal closes after success, reset back to form view
document.getElementById('br-modal-overlay').addEventListener('transitionend', function() {
  if (!this.classList.contains('show')) {
    const fw = document.getElementById('br-form-wrap');
    const sc = document.getElementById('br-success');
    const btn = document.getElementById('br-submit-btn');
    const lbl = document.getElementById('br-submit-label');
    fw.style.display = '';
    sc.classList.remove('show');
    btn.disabled = false;
    lbl.textContent = 'Küldés';
  }
});