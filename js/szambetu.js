// ═══════════════════════════════════════════════════════
//  szambetu.js  —  Szám=Betű rejtvény
//  - Fix grid: Könnyű 15×15, Normál 20×20, Nehéz 25×25
//  - Natív telefon billentyűzet (hidden input focus)
//  - Jobb crossword: minél kevesebb üres hely
//  - Induláskor: 2 magánhangzó + 2-3 mássalhangzó reveal
//  - localStorage mentés
// ═══════════════════════════════════════════════════════

const SB_SAVE_KEY = 'lexikon_szambetu_state';

const HU_VOWELS     = ['a','á','e','é','i','í','o','ó','ö','ő','u','ú','ü','ű'];
const HU_CONSONANTS = ['b','c','cs','d','dz','dzs','f','g','gy','h','j','k','l','ly','m',
                       'n','ny','p','r','s','sz','t','ty','v','z','zs'];
const HU_SIMPLE_CONSONANTS = ['b','c','d','f','g','h','j','k','l','m','n','p','r','s','t','v','z'];

let sbLoaded  = false;
let sbWords   = [];
let sbGrid    = [], sbRows = 0, sbCols = 0;
let sbCipher  = {}, sbDecipher = {};
let sbGuesses = {};
let sbSelectedNum = null;
let sbStartTime = 0, sbMoves = 0;
let sbPlacedWords = [];
let sbDifficulty  = 'normal';

// Fixed grid sizes per difficulty
const SB_MODES = {
  easy:   { dim: 15, label: 'Könnyű', minLen: 3, maxLen: 7  },
  normal: { dim: 20, label: 'Normál', minLen: 4, maxLen: 10 },
  hard:   { dim: 25, label: 'Nehéz',  minLen: 4, maxLen: 14 },
};

function hideSbWin() {
  const w = document.getElementById('sb-win'); if (w) w.classList.remove('show');
}

// ── Save / Load ───────────────────────────────────────
function sbSave() {
  try {
    localStorage.setItem(SB_SAVE_KEY, JSON.stringify({
      sbDifficulty, sbCipher, sbDecipher, sbGuesses,
      sbGrid, sbRows, sbCols, sbPlacedWords,
      sbSelectedNum, sbStartTime, sbMoves
    }));
  } catch(e) {}
}

function sbLoadSave() {
  try {
    const raw = localStorage.getItem(SB_SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d.sbDecipher || Object.keys(d.sbDecipher).length === 0) return false;
    sbDifficulty   = d.sbDifficulty   || 'normal';
    sbCipher       = d.sbCipher       || {};
    sbDecipher     = d.sbDecipher     || {};
    sbGuesses      = d.sbGuesses      || {};
    sbGrid         = d.sbGrid         || [];
    sbRows         = d.sbRows         || 0;
    sbCols         = d.sbCols         || 0;
    sbPlacedWords  = d.sbPlacedWords  || [];
    sbSelectedNum  = null;
    sbStartTime    = d.sbStartTime    || Date.now();
    sbMoves        = d.sbMoves        || 0;
    return true;
  } catch(e) { return false; }
}

// ── Init ─────────────────────────────────────────────
async function initSzamBetu() {
  document.getElementById('sb-status-text').textContent = 'Szólista betöltése...';
  if (typeof loaded !== 'undefined' && !loaded) {
    try { await loadWords(); } catch(e) {}
  }
  sbLoaded = true;
  buildSbDifficultyChips();

  const saved = sbLoadSave();
  if (saved) {
    // Restore saved puzzle
    buildSbDifficultyChips(); // re-highlight correct chip
    restorePuzzle();
  } else {
    loadSbWords();
    startSzamBetu();
  }
}

function restorePuzzle() {
  if (!sbGrid || sbGrid.length === 0) { loadSbWords(); startSzamBetu(); return; }
  const mode = SB_MODES[sbDifficulty];
  const vw = window.innerWidth;
  const availW = Math.min(vw - 24, 860);
  const cellSize = Math.max(20, Math.min(40, Math.floor((availW - sbCols) / sbCols)));
  document.documentElement.style.setProperty('--sb-cell', cellSize + 'px');

  const gridEl = document.getElementById('sb-grid');
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${sbCols}, ${cellSize}px)`;
  gridEl.style.gridTemplateRows    = `repeat(${sbRows}, ${cellSize}px)`;
  const fsize    = Math.max(8, Math.floor(cellSize * 0.38));
  const numFsize = Math.max(7, Math.floor(cellSize * 0.22));

  for (let r = 0; r < sbRows; r++) {
    for (let c = 0; c < sbCols; c++) {
      const letter = sbGrid[r][c];
      const cell = document.createElement('div');
      if (!letter) {
        cell.className = 'sb-cell black';
      } else {
        const num = sbCipher[letter];
        cell.className = 'sb-cell letter';
        cell.dataset.num = num;
        cell.innerHTML =
          `<span class="sb-cell-num" style="font-size:${numFsize}px">${num}</span>` +
          `<span class="sb-cell-letter" style="font-size:${fsize}px"></span>`;
        cell.addEventListener('click', () => selectNum(num));
      }
      gridEl.appendChild(cell);
    }
  }
  buildKeyMap();
  renderGuesses();
  updateSbProgress();
}

function loadSbWords() {
  const mode = SB_MODES[sbDifficulty];
  sbWords = wordList
    .map(e => (typeof e === 'object' ? e.word : e).toLowerCase())
    .filter(w => w.length >= mode.minLen && w.length <= mode.maxLen
              && /^[a-záéíóöőúüű]+$/.test(w));
  sbWords = shuffle(sbWords);
}

function buildSbDifficultyChips() {
  const container = document.getElementById('sb-difficulty-chips');
  if (!container) return;
  container.innerHTML = '';
  ['easy','normal','hard'].forEach(d => {
    const chip = document.createElement('button');
    chip.className = 'sb-diff-chip' + (d === sbDifficulty ? ' active' : '');
    chip.textContent = SB_MODES[d].label;
    chip.addEventListener('click', () => {
      if (sbDifficulty === d) return;
      sbDifficulty = d;
      document.querySelectorAll('.sb-diff-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadSbWords();
      startSzamBetu();
    });
    container.appendChild(chip);
  });
}

function startSzamBetu() {
  hideSbWin();
  sbSelectedNum = null; sbMoves = 0; sbStartTime = Date.now();
  if (!sbLoaded || sbWords.length === 0) {
    document.getElementById('sb-status-text').textContent = 'Nincs elérhető szó.'; return;
  }
  document.getElementById('sb-status-text').textContent = 'Generálás...';
  setTimeout(() => {
    const puzzle = buildCrossword();
    if (!puzzle || sbPlacedWords.length < 4) {
      document.getElementById('sb-status-text').textContent = 'Hiba — próbáld újra.';
      return;
    }
    renderPuzzle(puzzle);
    updateSbProgress();
    sbSave();
  }, 10);
}

// ══════════════════════════════════════════════════════
//  CROSSWORD ENGINE — fix dim × dim grid
// ══════════════════════════════════════════════════════
function buildCrossword() {
  const mode = SB_MODES[sbDifficulty];
  const DIM  = mode.dim;

  // Blank grid (null = empty)
  let grid = Array.from({ length: DIM }, () => Array(DIM).fill(null));
  const placed = [];
  const usedWords = new Set();

  // Sort pool by length desc for denser fill
  const pool = shuffle(sbWords.slice()).sort((a, b) => b.length - a.length);

  // First word: longest, placed horizontally, centered
  const first = pool[0];
  usedWords.add(first);
  const r0 = Math.floor(DIM / 2);
  const c0 = Math.floor((DIM - first.length) / 2);
  placeWord(grid, first, r0, c0, 'H');
  placed.push({ word: first, row: r0, col: c0, dir: 'H' });

  // Second word: longest possible, placed vertically through centre of first word
  const secondPool = pool.filter(w => !usedWords.has(w));
  const midCol = c0 + Math.floor(first.length / 2);
  for (const w of secondPool) {
    // Find a letter in w that matches first[midCol - c0]
    const targetLetter = first[midCol - c0];
    const wi = w.indexOf(targetLetter);
    if (wi === -1) continue;
    const vr = r0 - wi;
    if (canPlace(grid, w, vr, midCol, 'V', DIM)) {
      placeWord(grid, w, vr, midCol, 'V');
      placed.push({ word: w, row: vr, col: midCol, dir: 'V' });
      usedWords.add(w);
      break;
    }
  }

  // Fill remaining words greedily — many passes
  let changed = true;
  let passes  = 0;
  const maxPasses = 12;

  while (changed && passes < maxPasses) {
    changed = false;
    passes++;
    for (const word of pool) {
      if (usedWords.has(word)) continue;
      const pl = findBestPlacement(grid, word, DIM);
      if (pl) {
        placeWord(grid, word, pl.row, pl.col, pl.dir);
        placed.push({ word, row: pl.row, col: pl.col, dir: pl.dir });
        usedWords.add(word);
        changed = true;
      }
    }
  }

  if (placed.length < 4) return null;
  sbPlacedWords = placed;

  // Trim to content (keep fixed DIM padding of 1 on each side)
  const result = trimToFixed(grid, DIM);
  return result;
}

function placeWord(grid, word, row, col, dir) {
  for (let i = 0; i < word.length; i++) {
    if (dir === 'H') grid[row][col + i] = word[i];
    else             grid[row + i][col] = word[i];
  }
}

function findBestPlacement(grid, word, DIM) {
  const candidates = [];
  for (let wi = 0; wi < word.length; wi++) {
    const ch = word[wi];
    for (let r = 0; r < DIM; r++) {
      for (let c = 0; c < DIM; c++) {
        if (grid[r][c] !== ch) continue;
        // Try H: word[wi] at (r, c)
        const hc = c - wi;
        if (canPlace(grid, word, r, hc, 'H', DIM)) {
          candidates.push({ row: r, col: hc, dir: 'H',
            score: scorePlace(grid, word, r, hc, 'H', DIM) });
        }
        // Try V: word[wi] at (r, c)
        const vr = r - wi;
        if (canPlace(grid, word, vr, c, 'V', DIM)) {
          candidates.push({ row: vr, col: c, dir: 'V',
            score: scorePlace(grid, word, vr, c, 'V', DIM) });
        }
      }
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function scorePlace(grid, word, row, col, dir, DIM) {
  let intersections = 0;
  let filledNeighbours = 0;
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'H' ? row     : row + i;
    const c = dir === 'H' ? col + i : col;
    if (grid[r][c] === word[i]) intersections++;
    // Reward placing near already-filled cells (denser grid)
    const nbrs = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    for (const [nr, nc] of nbrs) {
      if (nr >= 0 && nr < DIM && nc >= 0 && nc < DIM && grid[nr][nc] !== null) filledNeighbours++;
    }
  }
  const center = DIM / 2;
  const centerDist = Math.abs(row + word.length/2 - center) + Math.abs(col + word.length/2 - center);
  return intersections * 30 + filledNeighbours * 2 - centerDist * 0.8;
}

function canPlace(grid, word, row, col, dir, DIM) {
  // Boundary check — leave 0-cell margin (we work within full DIM)
  if (row < 0 || col < 0) return false;
  if (dir === 'H' && col + word.length > DIM) return false;
  if (dir === 'V' && row + word.length > DIM) return false;

  // Cell before word must be empty
  const preR = dir === 'H' ? row     : row - 1;
  const preC = dir === 'H' ? col - 1 : col;
  if (preR >= 0 && preC >= 0 && preR < DIM && preC < DIM) {
    if (grid[preR][preC] !== null) return false;
  }
  // Cell after word must be empty
  const aftR = dir === 'H' ? row               : row + word.length;
  const aftC = dir === 'H' ? col + word.length  : col;
  if (aftR >= 0 && aftC >= 0 && aftR < DIM && aftC < DIM) {
    if (grid[aftR][aftC] !== null) return false;
  }

  let hasIntersection = false;

  for (let i = 0; i < word.length; i++) {
    const r = dir === 'H' ? row     : row + i;
    const c = dir === 'H' ? col + i : col;
    const existing = grid[r]?.[c];

    if (existing !== null && existing !== undefined) {
      if (existing !== word[i]) return false;
      hasIntersection = true;
    } else {
      // Perpendicular neighbour conflict: only 1 empty cell gap allowed
      if (dir === 'H') {
        if ((grid[r-1]?.[c] !== null && grid[r-1]?.[c] !== undefined) ||
            (grid[r+1]?.[c] !== null && grid[r+1]?.[c] !== undefined)) return false;
      } else {
        if ((grid[r]?.[c-1] !== null && grid[r]?.[c-1] !== undefined) ||
            (grid[r]?.[c+1] !== null && grid[r]?.[c+1] !== undefined)) return false;
      }
    }
  }
  return hasIntersection;
}

function trimToFixed(grid, DIM) {
  // Find bounding box of content
  let minR = DIM, maxR = 0, minC = DIM, maxC = 0;
  for (let r = 0; r < DIM; r++)
    for (let c = 0; c < DIM; c++)
      if (grid[r][c] !== null) {
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      }

  // Add 1-cell border
  minR = Math.max(0, minR - 1); maxR = Math.min(DIM - 1, maxR + 1);
  minC = Math.max(0, minC - 1); maxC = Math.min(DIM - 1, maxC + 1);

  const result = [];
  for (let r = minR; r <= maxR; r++) {
    const row = [];
    for (let c = minC; c <= maxC; c++) row.push(grid[r][c]);
    result.push(row);
  }
  sbRows = result.length;
  sbCols = result[0]?.length || 0;
  sbPlacedWords = sbPlacedWords.map(p => ({
    ...p, row: p.row - minR, col: p.col - minC
  }));
  return result;
}

// ── Cipher & revealed starters ───────────────────────
function assignCipher(grid) {
  const letters = new Set();
  for (const row of grid) for (const cell of row) if (cell) letters.add(cell);
  const arr = shuffle([...letters]);
  sbCipher = {}; sbDecipher = {};
  arr.forEach((letter, i) => { sbCipher[letter] = i + 1; sbDecipher[i + 1] = letter; });
  sbGuesses = {};

  // Reveal 2 vowels + 2-3 consonants that actually appear in the puzzle
  const puzzleVowels     = arr.filter(l => HU_VOWELS.includes(l));
  const puzzleConsonants = arr.filter(l => !HU_VOWELS.includes(l));

  const revealVowels = shuffle(puzzleVowels).slice(0, Math.min(2, puzzleVowels.length));
  const consonantCount = Math.random() < 0.5 ? 2 : 3;
  const revealConsonants = shuffle(puzzleConsonants).slice(0, Math.min(consonantCount, puzzleConsonants.length));

  [...revealVowels, ...revealConsonants].forEach(l => {
    sbGuesses[sbCipher[l]] = l.toUpperCase();
  });
}

// ── Render ────────────────────────────────────────────
function renderPuzzle(grid) {
  assignCipher(grid);
  sbGrid = grid;

  const vw = window.innerWidth;
  const availW = Math.min(vw - 24, 860);
  const cellSize = Math.max(20, Math.min(40, Math.floor((availW - sbCols) / sbCols)));
  document.documentElement.style.setProperty('--sb-cell', cellSize + 'px');

  const gridEl = document.getElementById('sb-grid');
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${sbCols}, ${cellSize}px)`;
  gridEl.style.gridTemplateRows    = `repeat(${sbRows}, ${cellSize}px)`;

  const fsize    = Math.max(8, Math.floor(cellSize * 0.38));
  const numFsize = Math.max(7, Math.floor(cellSize * 0.22));

  for (let r = 0; r < sbRows; r++) {
    for (let c = 0; c < sbCols; c++) {
      const letter = grid[r][c];
      const cell = document.createElement('div');
      if (!letter) {
        cell.className = 'sb-cell black';
      } else {
        const num = sbCipher[letter];
        cell.className = 'sb-cell letter';
        cell.dataset.num = num;
        cell.innerHTML =
          `<span class="sb-cell-num" style="font-size:${numFsize}px">${num}</span>` +
          `<span class="sb-cell-letter" style="font-size:${fsize}px"></span>`;
        cell.addEventListener('click', () => selectNum(num));
      }
      gridEl.appendChild(cell);
    }
  }
  buildKeyMap();
  renderGuesses();
}

function buildKeyMap() {
  const keyGrid = document.getElementById('sb-key-grid');
  keyGrid.innerHTML = '';
  const nums = Object.keys(sbDecipher).map(Number).sort((a, b) => a - b);
  nums.forEach(num => {
    const item = document.createElement('div');
    item.className = 'sb-key-item'; item.dataset.num = num;
    item.innerHTML = `<div class="sb-key-num">${num}</div><div class="sb-key-letter"></div>`;
    item.addEventListener('click', () => selectNum(num));
    keyGrid.appendChild(item);
  });
  renderGuesses();
}

function renderGuesses() {
  Object.keys(sbDecipher).map(Number).forEach(num => {
    const guessed  = sbGuesses[num];
    const correct  = sbDecipher[num];
    const isSolved = guessed && guessed.toUpperCase() === correct.toUpperCase();

    document.querySelectorAll(`.sb-cell[data-num="${num}"] .sb-cell-letter`).forEach(el => {
      el.textContent = guessed || '';
      el.parentElement.classList.toggle('revealed', isSolved);
      el.parentElement.classList.toggle('guessed',  !!guessed && !isSolved);
    });

    const keyItem = document.querySelector(`.sb-key-item[data-num="${num}"]`);
    if (keyItem) {
      keyItem.querySelector('.sb-key-letter').textContent = guessed || '';
      keyItem.classList.toggle('solved', isSolved);
      keyItem.classList.toggle('active', num === sbSelectedNum);
    }
  });

  document.querySelectorAll('.sb-cell.letter').forEach(cell => {
    const num = parseInt(cell.dataset.num);
    cell.classList.toggle('selected',  num === sbSelectedNum);
    cell.classList.toggle('same-num',  num === sbSelectedNum);
  });

  const hint = document.getElementById('sb-input-hint');
  if (hint) hint.textContent = sbSelectedNum !== null
    ? `Kiválasztott: ${sbSelectedNum} — gépelj betűt`
    : 'Kattints egy számra a kiválasztáshoz';
}

// ── Selection & input ─────────────────────────────────
function selectNum(num) {
  const g = sbGuesses[num];
  if (g && g.toUpperCase() === sbDecipher[num].toUpperCase()) return; // already solved
  sbSelectedNum = sbSelectedNum === num ? null : num;
  renderGuesses();
  // Focus hidden input to trigger native keyboard on mobile
  if (sbSelectedNum !== null) {
    const hi = document.getElementById('sb-hidden-input');
    if (hi) { hi.value = ''; hi.focus(); }
  }
}

function sbEnterLetter(letter) {
  if (sbSelectedNum === null) return;
  const num     = sbSelectedNum;
  const correct = sbDecipher[num];
  const g       = sbGuesses[num];
  if (g && g.toUpperCase() === correct.toUpperCase()) return;
  sbGuesses[num] = letter.toUpperCase();
  sbMoves++;
  renderGuesses();
  updateSbProgress();
  sbSave();
  if (letter.toUpperCase() !== correct.toUpperCase()) {
    document.querySelectorAll(`.sb-cell[data-num="${num}"]`).forEach(cell => {
      cell.classList.add('wrong');
      setTimeout(() => cell.classList.remove('wrong'), 350);
    });
  } else {
    const next = findNextUnsolved(num);
    sbSelectedNum = next;
    if (next !== null) {
      const hi = document.getElementById('sb-hidden-input');
      if (hi) { hi.value = ''; hi.focus(); }
    }
    renderGuesses();
    if (checkSbWin()) setTimeout(showSbWin, 400);
  }
}

function findNextUnsolved(current) {
  const nums = Object.keys(sbDecipher).map(Number).sort((a, b) => a - b);
  const idx  = nums.indexOf(current);
  for (let i = 1; i <= nums.length; i++) {
    const next = nums[(idx + i) % nums.length];
    const g = sbGuesses[next];
    if (!g || g.toUpperCase() !== sbDecipher[next].toUpperCase()) return next;
  }
  return null;
}

function sbBackspace() {
  if (sbSelectedNum === null) return;
  const g = sbGuesses[sbSelectedNum];
  if (g && g.toUpperCase() === sbDecipher[sbSelectedNum].toUpperCase()) return;
  sbGuesses[sbSelectedNum] = '';
  renderGuesses();
  sbSave();
}

// ── Helpers ───────────────────────────────────────────
function sbHint() {
  const unsolved = Object.keys(sbDecipher).map(Number).filter(n => {
    const g = sbGuesses[n]; return !g || g.toUpperCase() !== sbDecipher[n].toUpperCase();
  });
  if (!unsolved.length) { showToast('Minden megfejtve!'); return; }
  const num = unsolved[Math.floor(Math.random() * unsolved.length)];
  sbGuesses[num] = sbDecipher[num].toUpperCase();
  sbSelectedNum  = findNextUnsolved(num);
  renderGuesses(); updateSbProgress(); sbSave();
  showToast('💡 ' + num + ' = ' + sbDecipher[num].toUpperCase());
  if (checkSbWin()) setTimeout(showSbWin, 500);
}

function sbSolveAll() {
  Object.keys(sbDecipher).forEach(num => {
    sbGuesses[parseInt(num)] = sbDecipher[num].toUpperCase();
  });
  sbSelectedNum = null;
  renderGuesses(); updateSbProgress(); sbSave();
  setTimeout(showSbWin, 300);
}

function checkSbWin() {
  return Object.keys(sbDecipher).every(num => {
    const g = sbGuesses[parseInt(num)];
    return g && g.toUpperCase() === sbDecipher[num].toUpperCase();
  });
}

function updateSbProgress() {
  const total  = Object.keys(sbDecipher).length;
  const solved = Object.keys(sbDecipher).filter(num => {
    const g = sbGuesses[parseInt(num)];
    return g && g.toUpperCase() === sbDecipher[num].toUpperCase();
  }).length;
  const pct = total > 0 ? Math.round(solved / total * 100) : 0;
  document.getElementById('sb-progress-fill').style.width = pct + '%';
  document.getElementById('sb-status-text').textContent =
    `${sbPlacedWords.length} szó · ${solved} / ${total} betű megfejtve`;
}

function showSbWin() {
  const elapsed = Math.round((Date.now() - sbStartTime) / 1000);
  const min = Math.floor(elapsed / 60), sec = elapsed % 60;
  const timeStr = min > 0 ? `${min} perc ${sec} mp` : `${sec} mp`;
  document.getElementById('sb-win-stat').textContent =
    `${sbMoves} lépés · ${timeStr} · ${SB_MODES[sbDifficulty].label} · ${sbPlacedWords.length} szó`;
  document.getElementById('sb-win').classList.add('show');
  // Clear save so next visit starts fresh
  try { localStorage.removeItem(SB_SAVE_KEY); } catch(e) {}
}

// ── Keyboard (physical + native mobile) ──────────────
function sbHandleKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key;
  if (key === 'Backspace') { e.preventDefault(); sbBackspace(); }
  else if (key === 'Escape') { sbSelectedNum = null; renderGuesses(); }
  else if (key.length === 1 && /[a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]/.test(key)) {
    e.preventDefault(); sbEnterLetter(key);
  }
}
document.addEventListener('keydown', sbHandleKey);

// ── Utility ───────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
