let wWordList = [], wAllWords = [];
let wloaded = false, wWordLen = 5, wMaxGuesses = 6;
let wSecret = '', wGuesses = [], wCurrentGuess = '', wGameOver = false;
let wKeyState = {}, wLoadingWords = false;

const HU_ROWS = [
  ['ö','ő','ó','ü','ű','á','é','í','DEL'],
  ['q','w','e','r','t','z','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['y','x','c','v','b','n','m','ENTER'],
];

function showWordle() {
  currentScreen = 'wordle';
  document.getElementById('screen-main').classList.add('hidden');
  document.getElementById('screen-games').classList.remove('visible');
  document.getElementById('screen-wordle').classList.add('visible');
  document.getElementById('screen-szambetu').classList.remove('visible');
  document.getElementById('topbar-games-btn').style.display = 'none';
  // Prevent body scroll while Wordle is open
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
  if (typeof sbHandleKey !== 'undefined') document.removeEventListener('keydown', sbHandleKey);
  if (!wloaded) {
    initWordle();
  } else {
    document.removeEventListener('keydown', wHandleKey);
    if (!wGameOver) document.addEventListener('keydown', wHandleKey);
  }
}

function closeWordle() {
  currentScreen = 'games';
  document.getElementById('screen-wordle').classList.remove('visible');
  document.getElementById('screen-games').classList.add('visible');
  document.getElementById('topbar-games-btn').style.display = '';
  document.body.style.overflow = '';
  window.scrollTo(0, 0);
  document.removeEventListener('keydown', wHandleKey);
}

async function initWordle() {
  buildLenSlider();
  computeAndApplyLayout();
  buildKeyboard();
  await loadWordleWords();
  startNewGame();
}

async function loadWordleWords() {
  if (wloaded) return;
  wLoadingWords = true;
  setWordleStatus('Szólista betöltése...');
  if (!loaded) { try { await loadWords(); } catch(e) {} }
  wAllWords = wordList
    .map(e => (typeof e === 'object' ? e.word : e).toLowerCase())
    .filter(w => /^[a-záéíóöőúüű]+$/.test(w));
  wloaded = true;
  wLoadingWords = false;
}

function getWordleWordsForLen(len) { return wAllWords.filter(w => w.length === len); }

function buildLenSlider() {
  const row = document.getElementById('wordle-len-row');
  row.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'wordle-len-label';
  label.textContent = 'Hossz:';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 4; slider.max = 12; slider.value = wWordLen;
  slider.className = 'wordle-len-slider';
  slider.id = 'wordle-len-slider';

  const val = document.createElement('span');
  val.className = 'wordle-len-val';
  val.id = 'wordle-len-val';
  val.textContent = wWordLen;

  const updateFill = () => {
    const pct = ((slider.value - 4) / (12 - 4)) * 100;
    slider.style.setProperty('--pct', pct + '%');
  };
  updateFill();

  slider.addEventListener('input', () => { val.textContent = slider.value; updateFill(); });
  slider.addEventListener('change', () => {
    const newLen = parseInt(slider.value);
    if (newLen === wWordLen) return;
    wWordLen = newLen;
    computeAndApplyLayout();
    startNewGame();
  });

  row.appendChild(label);
  row.appendChild(slider);
  row.appendChild(val);
}

async function startNewGame() {
  if (wLoadingWords) return;
  if (!wloaded) { await loadWordleWords(); }
  hideResult();
  const pool = getWordleWordsForLen(wWordLen);
  if (pool.length === 0) { setWordleStatus('Nincs ' + wWordLen + ' betűs szó.'); return; }
  wSecret = pool[Math.floor(Math.random() * pool.length)];
  wGuesses = []; wCurrentGuess = ''; wGameOver = false; wKeyState = {};
  computeAndApplyLayout();
  buildGrid();
  buildKeyboard();
  updateGrid();
  setWordleStatus(wWordLen + ' betűs szó · ' + wMaxGuesses + ' kísérlet');
  hideMsg();
  document.removeEventListener('keydown', wHandleKey);
  document.addEventListener('keydown', wHandleKey);
}

function computeAndApplyLayout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw <= 480;
  const isTiny   = vw <= 375;

  const headerH = isTiny ? 48 : (isMobile ? 50 : 58);
  const topPad  = isMobile ? 4 : 8;
  const appMaxW = Math.min(vw, 520);
  const appPadH = isMobile ? 4 : 8;

  const headerRowH = isMobile ? 36 : 44;
  const sliderRowH = isMobile ? 22 : 28;
  const statusH    = isMobile ? 14 : 18;
  const headerMb   = isMobile ? 4 : 6;
  const sliderMb   = isMobile ? 3 : 4;
  const statusMb   = 3;

  const numKeyRows = HU_ROWS.length; // 4
  const keyGap     = isTiny ? 2 : (isMobile ? 3 : 5);
  const kbPadTop   = isMobile ? 4 : 6;
  const kbPadBot   = Math.max(isMobile ? 8 : 12, 0); // safe area handled by CSS
  const kbBorderTop = 1;

  const overhead = headerH + topPad + headerRowH + headerMb + sliderRowH + sliderMb + statusH + statusMb;

  const maxKH = isMobile ? 46 : 54;
  const minKH = isMobile ? 30 : 40;

  let bestKH = maxKH;
  let bestCell = 0;
  let bestCellGap = isMobile ? 3 : 5;

  for (let tryKH = maxKH; tryKH >= minKH; tryKH -= 1) {
    const kbH = kbPadTop + numKeyRows * tryKH + keyGap * (numKeyRows - 1) + kbPadBot + kbBorderTop;
    const availH = vh - overhead - kbH;
    const cellGap = isMobile ? 3 : 5;
    const cellFromH = (availH - cellGap * (wMaxGuesses - 1)) / wMaxGuesses;
    const availW = appMaxW - appPadH * 2;
    const cellFromW = (availW - cellGap * (wWordLen - 1)) / wWordLen;
    const capH = isMobile ? 50 : 64;
    const capW = isMobile ? 50 : 64;
    const cell = Math.min(capH, capW, cellFromH, cellFromW);
    if (cell >= bestCell && cell > 0) {
      bestCell = cell;
      bestKH = tryKH;
      bestCellGap = cellGap;
    }
    if (cell >= (isMobile ? 20 : 28)) break;
  }

  // Clamp minimum cell size
  bestCell = Math.max(isMobile ? 22 : 28, Math.floor(bestCell));

  // Apply CSS vars
  document.documentElement.style.setProperty('--wkey-h', bestKH + 'px');
  document.documentElement.style.setProperty('--wkey-fs', Math.max(10, Math.floor(bestKH * 0.28)) + 'px');
  document.documentElement.style.setProperty('--wkey-gap', keyGap + 'px');

  return { cellSize: bestCell, cellGap: bestCellGap };
}

function buildGrid() {
  const { cellSize, cellGap } = computeAndApplyLayout();
  const grid = document.getElementById('wordle-grid');
  grid.innerHTML = '';
  const fontSize = Math.max(10, Math.floor(cellSize * 0.45));
  const br = Math.max(4, Math.floor(cellSize * 0.14));

  grid.style.gap = cellGap + 'px';
  grid.style.position = 'relative';

  for (let r = 0; r < wMaxGuesses; r++) {
    const row = document.createElement('div');
    row.className = 'wordle-row';
    row.id = 'wrow-' + r;
    row.style.gap = cellGap + 'px';
    row.style.marginBottom = r < wMaxGuesses - 1 ? cellGap + 'px' : '0';

    for (let c = 0; c < wWordLen; c++) {
      const cell = document.createElement('div');
      cell.className = 'wordle-cell';
      cell.id = `wcell-${r}-${c}`;
      cell.style.width = cellSize + 'px';
      cell.style.height = cellSize + 'px';
      cell.style.fontSize = fontSize + 'px';
      cell.style.borderRadius = br + 'px';
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }
}

function updateGrid() {
  wGuesses.forEach((guess, r) => {
    const result = scoreGuess(guess, wSecret);
    for (let c = 0; c < wWordLen; c++) {
      const cell = document.getElementById(`wcell-${r}-${c}`); if (!cell) continue;
      cell.textContent = guess[c].toUpperCase(); cell.className = 'wordle-cell ' + result[c];
    }
  });
  const r = wGuesses.length;
  if (r < wMaxGuesses && !wGameOver) {
    for (let c = 0; c < wWordLen; c++) {
      const cell = document.getElementById(`wcell-${r}-${c}`); if (!cell) continue;
      const ch = wCurrentGuess[c];
      cell.textContent = ch ? ch.toUpperCase() : '';
      cell.className = 'wordle-cell' + (ch ? ' typed' : '');
    }
    for (let rr = r + 1; rr < wMaxGuesses; rr++)
      for (let c = 0; c < wWordLen; c++) {
        const cell = document.getElementById(`wcell-${rr}-${c}`);
        if (cell) { cell.textContent = ''; cell.className = 'wordle-cell'; }
      }
  }
}

function scoreGuess(guess, secret) {
  const result = Array(guess.length).fill('absent');
  const sArr = secret.split(''), gArr = guess.split(''), used = Array(secret.length).fill(false);
  for (let i = 0; i < guess.length; i++) if (gArr[i] === sArr[i]) { result[i] = 'correct'; used[i] = true; }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < secret.length; j++)
      if (!used[j] && gArr[i] === sArr[j]) { result[i] = 'present'; used[j] = true; break; }
  }
  return result;
}

function wSubmit() {
  if (wGameOver) return;
  const guess = wCurrentGuess.toLowerCase(), r = wGuesses.length;
  if (guess.length < wWordLen) { shakeRow(r); showMsg('Még ' + (wWordLen - guess.length) + ' betű hiányzik!'); return; }
  if (wAllWords.length > 0 && !wAllWords.includes(guess)) { shakeRow(r); showMsg('Ismeretlen szó'); return; }
  wGuesses.push(guess); wCurrentGuess = '';
  const result = scoreGuess(guess, wSecret);
  revealRow(r, result, guess, () => {
    result.forEach((state, i) => {
      const key = guess[i], prev = wKeyState[key];
      if (prev === 'correct') return;
      if (state === 'correct') wKeyState[key] = 'correct';
      else if (state === 'present' && prev !== 'correct') wKeyState[key] = 'present';
      else if (!prev) wKeyState[key] = 'absent';
    });
    updateKeyboard();
    const won = result.every(s => s === 'correct');
    if (won) { wGameOver = true; bounceRow(r, () => showResult(true, r + 1)); }
    else if (wGuesses.length >= wMaxGuesses) { wGameOver = true; setTimeout(() => showResult(false, 0), 800); }
    else updateGrid();
  });
}

function revealRow(r, result, guess, onDone) {
  for (let c = 0; c < wWordLen; c++) {
    const cell = document.getElementById(`wcell-${r}-${c}`); if (!cell) continue;
    setTimeout(() => {
      cell.classList.add('flip');
      setTimeout(() => { cell.textContent = guess[c].toUpperCase(); cell.className = 'wordle-cell ' + result[c]; }, 250);
    }, c * 80);
  }
  setTimeout(onDone, wWordLen * 80 + 280);
}

function bounceRow(r, onDone) {
  for (let c = 0; c < wWordLen; c++) {
    const cell = document.getElementById(`wcell-${r}-${c}`); if (!cell) continue;
    setTimeout(() => cell.classList.add('bounce'), c * 60);
  }
  if (onDone) setTimeout(onDone, wWordLen * 60 + 600);
}

function shakeRow(r) {
  const row = document.getElementById('wrow-' + r); if (!row) return;
  row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake');
  row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
}

let msgTimer = null;
function showMsg(text, dur = 1600) {
  const el = document.getElementById('wordle-msg'); el.textContent = text; el.classList.add('show');
  clearTimeout(msgTimer); msgTimer = setTimeout(() => el.classList.remove('show'), dur);
}
function hideMsg() { clearTimeout(msgTimer); document.getElementById('wordle-msg').classList.remove('show'); }
function setWordleStatus(text) { document.getElementById('wordle-status-text').textContent = text; }

function showResult(won, guessCount) {
  hideMsg();
  hideResult();
  const msgs = ['Zseni! 🧠','Fantasztikus!','Remek!','Nagyszerű!','Sikerült!','Uff, megvan!'];
  const emoji = won ? ['🏆','🎉','✨','🌟','🎊','🙌'][guessCount-1] : '😞';

  const overlay = document.createElement('div');
  overlay.id = 'wordle-result-panel';
  overlay.className = 'wordle-result-overlay';

  overlay.innerHTML = `
    <div class="wordle-result-inner">
      <span class="wordle-result-emoji">${emoji}</span>
      <div class="wordle-result-title${won ? '' : ' lose'}">${won ? msgs[guessCount-1] : 'Sajnos nem sikerült'}</div>
      <div class="wordle-result-word">${wSecret.toUpperCase()}</div>
      <div class="wordle-result-stat">${won ? guessCount + '. próbálkozásból · ' + wWordLen + ' betűs szó' : 'A szó: ' + wSecret.toUpperCase()}</div>
      <button class="wordle-result-btn" onclick="startNewGame()">↻ &nbsp;Új játék</button>
    </div>
  `;

  const gridWrap = document.querySelector('.wordle-grid-wrap');
  gridWrap.style.position = 'relative';
  gridWrap.appendChild(overlay);

  document.removeEventListener('keydown', wHandleKey);
}
function hideResult() {
  const old = document.getElementById('wordle-result-panel'); if (old) old.remove();
}

function buildKeyboard() {
  const kb = document.getElementById('wordle-keyboard');
  kb.innerHTML = '';

  HU_ROWS.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'wkey-row';
    row.forEach(key => {
      const btn = document.createElement('button');
      const isWide = key === 'ENTER' || key === 'DEL';
      let cls = 'wkey';
      if (isWide) cls += ' wkey-wide';
      if (key === 'ENTER') cls += ' wkey-enter';
      if (key === 'DEL')   cls += ' wkey-del';
      btn.className = cls; btn.dataset.key = key;
      btn.textContent = key === 'DEL' ? '⌫' : key === 'ENTER' ? '↵' : key.toUpperCase();
      btn.addEventListener('click', () => wHandleVirtualKey(key));
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });
}

function updateKeyboard() {
  document.querySelectorAll('.wkey').forEach(btn => {
    const key = btn.dataset.key; if (!key || key === 'ENTER' || key === 'DEL') return;
    const state = wKeyState[key];
    let cls = 'wkey';
    if (btn.classList.contains('wkey-wide')) cls += ' wkey-wide';
    if (btn.classList.contains('wkey-enter')) cls += ' wkey-enter';
    if (btn.classList.contains('wkey-del'))   cls += ' wkey-del';
    if (state) cls += ' ' + state;
    btn.className = cls;
  });
}

function wHandleVirtualKey(key) {
  if (wGameOver) return;
  if (key === 'DEL' || key === 'BACKSPACE') {
    if (wCurrentGuess.length > 0) { wCurrentGuess = wCurrentGuess.slice(0, -1); updateGrid(); }
  } else if (key === 'ENTER') {
    wSubmit();
  } else if (key.length === 1 && /[a-záéíóöőúüű]/i.test(key)) {
    if (wCurrentGuess.length < wWordLen) { wCurrentGuess += key.toLowerCase(); updateGrid(); }
  }
}

function wHandleKey(e) {
  if (currentScreen !== 'wordle') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key;
  if (key === 'Backspace') { e.preventDefault(); wHandleVirtualKey('BACKSPACE'); }
  else if (key === 'Enter') { e.preventDefault(); wHandleVirtualKey('ENTER'); }
  else if (key.length === 1) { wHandleVirtualKey(key); }
}

let wResizeTimer = null;
window.addEventListener('resize', () => {
  if (currentScreen !== 'wordle' || !wloaded) return;
  clearTimeout(wResizeTimer);
  wResizeTimer = setTimeout(() => {
    computeAndApplyLayout();
    buildGrid();
    updateGrid();
    buildKeyboard();
  }, 80);
});
