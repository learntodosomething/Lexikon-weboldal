let sbLoaded = false, sbWords = [];
let sbGrid = [], sbRows = 0, sbCols = 0;
let sbCipher = {}, sbDecipher = {};
let sbGuesses = {};
let sbSelectedNum = null;
let sbStartTime = 0, sbMoves = 0;
let sbPlacedWords = [];
let sbDifficulty = 'normal';

const SB_MAX_DIM = 30;
const SB_MODES = {
  easy:   { min: 3, max: 7,  label: 'Könnyű', targetWords: 30, poolSize: 400 },
  normal: { min: 4, max: 10, label: 'Normál', targetWords: 50, poolSize: 600 },
  hard:   { min: 4, max: 14, label: 'Nehéz',  targetWords: 70, poolSize: 800 },
};

function showSzamBetu() {
  currentScreen = 'szambetu';
  document.getElementById('screen-main').classList.add('hidden');
  document.getElementById('screen-games').classList.remove('visible');
  document.getElementById('screen-wordle').classList.remove('visible');
  document.getElementById('screen-szambetu').classList.add('visible');
  document.getElementById('topbar-games-btn').style.display = 'none';
  window.scrollTo(0, 0);
  if (typeof wHandleKey !== 'undefined') document.removeEventListener('keydown', wHandleKey);
  document.addEventListener('keydown', sbHandleKey);
  if (!sbLoaded) initSzamBetu();
}

function closeSzamBetu() {
  currentScreen = 'games';
  document.getElementById('screen-szambetu').classList.remove('visible');
  document.getElementById('screen-games').classList.add('visible');
  document.getElementById('topbar-games-btn').style.display = '';
  window.scrollTo(0, 0);
  document.removeEventListener('keydown', sbHandleKey);
  hideSbWin();
}

function hideSbWin() {
  const w = document.getElementById('sb-win'); if (w) w.classList.remove('show');
}

async function initSzamBetu() {
  document.getElementById('sb-status-text').textContent = 'Szólista betöltése...';
  if (!loaded) { try { await loadWords(); } catch(e) {} }
  sbLoaded = true;
  buildSbDifficultyChips();
  loadSbWords();
  startSzamBetu();
}

function loadSbWords() {
  const mode = SB_MODES[sbDifficulty];
  sbWords = wordList
    .map(e => (typeof e === 'object' ? e.word : e).toLowerCase())
    .filter(w => w.length >= mode.min && w.length <= mode.max && /^[a-záéíóöőúüű]+$/.test(w));
  // Shuffle once for variety
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
  // Use setTimeout so UI updates before heavy computation
  setTimeout(() => {
    let puzzle = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      puzzle = buildCrossword();
      if (puzzle && sbPlacedWords.length >= 8) break;
    }
    if (!puzzle || sbPlacedWords.length < 4) {
      document.getElementById('sb-status-text').textContent = 'Hiba — próbáld újra.';
      return;
    }
    renderPuzzle(puzzle);
    updateSbProgress();
  }, 10);
}

function buildCrossword() {
  const mode = SB_MODES[sbDifficulty];
  // Take a larger, freshly shuffled pool
  const pool = shuffle(sbWords.slice()).slice(0, mode.poolSize);
  if (pool.length < 5) return null;

  // Initialise empty grid
  const grid = Array.from({ length: SB_MAX_DIM }, () => Array(SB_MAX_DIM).fill(null));
  const placed = [];
  const center = Math.floor(SB_MAX_DIM / 2);

  // First word: longest available, placed horizontally through centre
  const sortedByLen = [...pool].sort((a, b) => b.length - a.length);
  const firstWord = sortedByLen[0];
  const startC = center - Math.floor(firstWord.length / 2);
  for (let i = 0; i < firstWord.length; i++) grid[center][startC + i] = firstWord[i];
  placed.push({ word: firstWord, row: center, col: startC, dir: 'H' });

  // Build lookup: letter → list of {wordIdx, charIdx} in pool
  // We use the pool directly for fast intersection lookups
  const used = new Set([firstWord]);

  // Multi-pass placement: keep trying until target reached or pool exhausted
  let changed = true;
  let passes = 0;
  const maxPasses = 6;

  while (changed && placed.length < mode.targetWords && passes < maxPasses) {
    changed = false;
    passes++;
    for (let wi = 0; wi < pool.length && placed.length < mode.targetWords; wi++) {
      const word = pool[wi];
      if (used.has(word)) continue;
      const pl = findBestPlacement(grid, word, placed);
      if (pl) {
        placeWord(grid, word, pl.row, pl.col, pl.dir);
        placed.push({ word, row: pl.row, col: pl.col, dir: pl.dir });
        used.add(word);
        changed = true;
      }
    }
  }

  if (placed.length < 4) return null;
  sbPlacedWords = placed;
  return trimGrid(grid);
}

function placeWord(grid, word, row, col, dir) {
  for (let i = 0; i < word.length; i++) {
    if (dir === 'H') grid[row][col + i] = word[i];
    else             grid[row + i][col] = word[i];
  }
}

function findBestPlacement(grid, word, placed) {
  const candidates = [];
  // For each letter in word, find matching cells in grid
  for (let wi = 0; wi < word.length; wi++) {
    const ch = word[wi];
    // Scan grid for this character
    for (let r = 1; r < SB_MAX_DIM - 1; r++) {
      for (let c = 1; c < SB_MAX_DIM - 1; c++) {
        if (grid[r][c] !== ch) continue;
        // Try to place word horizontally with wi at (r, c)
        const hc = c - wi;
        if (canPlace(grid, word, r, hc, 'H')) {
          const score = scorePlace(grid, word, r, hc, 'H', placed);
          candidates.push({ row: r, col: hc, dir: 'H', score });
        }
        // Try to place word vertically with wi at (r, c)
        const vr = r - wi;
        if (canPlace(grid, word, vr, c, 'V')) {
          const score = scorePlace(grid, word, vr, c, 'V', placed);
          candidates.push({ row: vr, col: c, dir: 'V', score });
        }
      }
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function scorePlace(grid, word, row, col, dir, placed) {
  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'H' ? row : row + i;
    const c = dir === 'H' ? col + i : col;
    if (grid[r][c] === word[i]) intersections++;
  }
  // Prefer more intersections; prefer positions near centre
  const centerDist = Math.abs(row - SB_MAX_DIM / 2) + Math.abs(col - SB_MAX_DIM / 2);
  return intersections * 20 - centerDist * 0.5;
}

function canPlace(grid, word, row, col, dir) {
  // Bounds check (leave 1-cell margin)
  if (row < 1 || col < 1) return false;
  if (dir === 'H' && col + word.length > SB_MAX_DIM - 1) return false;
  if (dir === 'V' && row + word.length > SB_MAX_DIM - 1) return false;

  const bR = dir === 'H' ? row     : row - 1;
  const bC = dir === 'H' ? col - 1 : col;
  const aR = dir === 'H' ? row     : row + word.length;
  const aC = dir === 'H' ? col + word.length : col;
  if (grid[bR]?.[bC] !== null && grid[bR]?.[bC] !== undefined) return false;
  if (grid[aR]?.[aC] !== null && grid[aR]?.[aC] !== undefined) return false;

  let hasIntersection = false;
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'H' ? row : row + i;
    const c = dir === 'H' ? col + i : col;
    const existing = grid[r]?.[c];

    if (existing !== null && existing !== undefined) {
      // Must match
      if (existing !== word[i]) return false;
      hasIntersection = true;
    } else {
      const s1r = dir === 'H' ? r - 1 : r;
      const s1c = dir === 'H' ? c     : c - 1;
      const s2r = dir === 'H' ? r + 1 : r;
      const s2c = dir === 'H' ? c     : c + 1;
      if (grid[s1r]?.[s1c] !== null && grid[s1r]?.[s1c] !== undefined) return false;
      if (grid[s2r]?.[s2c] !== null && grid[s2r]?.[s2c] !== undefined) return false;
    }
  }
  return hasIntersection;
}

function trimGrid(grid) {
  let minR = SB_MAX_DIM, maxR = 0, minC = SB_MAX_DIM, maxC = 0;
  for (let r = 0; r < SB_MAX_DIM; r++)
    for (let c = 0; c < SB_MAX_DIM; c++)
      if (grid[r][c] !== null) {
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      }
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

function assignCipher(grid) {
  const letters = new Set();
  for (const row of grid) for (const cell of row) if (cell) letters.add(cell);
  const arr = shuffle([...letters]);
  sbCipher = {}; sbDecipher = {};
  arr.forEach((letter, i) => { sbCipher[letter] = i + 1; sbDecipher[i + 1] = letter; });
  sbGuesses = {};
  const revealCount = Math.max(1, Math.floor(arr.length * 0.10));
  shuffle([...arr]).slice(0, revealCount).forEach(l => {
    sbGuesses[sbCipher[l]] = l.toUpperCase();
  });
}

function renderPuzzle(grid) {
  assignCipher(grid);
  sbGrid = grid;

  const vw = window.innerWidth;
  const appPad = vw <= 400 ? 20 : (vw <= 600 ? 20 : 32);
  const availW = Math.min(vw - appPad, 860);
  const cellSize = Math.max(24, Math.min(40, Math.floor((availW - sbCols) / sbCols)));
  document.documentElement.style.setProperty('--sb-cell', cellSize + 'px');

  const gridEl = document.getElementById('sb-grid');
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${sbCols}, ${cellSize}px)`;
  gridEl.style.gridTemplateRows    = `repeat(${sbRows}, ${cellSize}px)`;

  const fsize = Math.max(8, Math.floor(cellSize * 0.38));
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
    const guessed = sbGuesses[num];
    const correct = sbDecipher[num];
    const isSolved = guessed && guessed.toUpperCase() === correct.toUpperCase();

    document.querySelectorAll(`.sb-cell[data-num="${num}"] .sb-cell-letter`).forEach(el => {
      el.textContent = guessed || '';
      el.parentElement.classList.toggle('revealed', isSolved);
      el.parentElement.classList.toggle('guessed', !!guessed && !isSolved);
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
    cell.classList.toggle('selected', num === sbSelectedNum);
  });

  const hint = document.getElementById('sb-input-hint');
  if (hint) hint.textContent = sbSelectedNum !== null
    ? `Kiválasztott: ${sbSelectedNum} — gépelj betűt`
    : 'Kattints egy számra a kiválasztáshoz';
}

function selectNum(num) {
  const g = sbGuesses[num];
  if (g && g.toUpperCase() === sbDecipher[num].toUpperCase()) return;
  sbSelectedNum = sbSelectedNum === num ? null : num;
  renderGuesses();
}

function sbEnterLetter(letter) {
  if (sbSelectedNum === null) return;
  const num = sbSelectedNum;
  const correct = sbDecipher[num];
  const g = sbGuesses[num];
  if (g && g.toUpperCase() === correct.toUpperCase()) return;
  sbGuesses[num] = letter.toUpperCase();
  sbMoves++;
  renderGuesses();
  updateSbProgress();
  if (letter.toUpperCase() !== correct.toUpperCase()) {
    document.querySelectorAll(`.sb-cell[data-num="${num}"]`).forEach(cell => {
      cell.classList.add('wrong');
      setTimeout(() => cell.classList.remove('wrong'), 350);
    });
  } else {
    const next = findNextUnsolved(num);
    sbSelectedNum = next;
    renderGuesses();
    if (checkSbWin()) setTimeout(showSbWin, 400);
  }
}

function findNextUnsolved(current) {
  const nums = Object.keys(sbDecipher).map(Number).sort((a, b) => a - b);
  const idx = nums.indexOf(current);
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
}

function sbHint() {
  const unsolved = Object.keys(sbDecipher).map(Number).filter(n => {
    const g = sbGuesses[n]; return !g || g.toUpperCase() !== sbDecipher[n].toUpperCase();
  });
  if (!unsolved.length) { showToast('Minden megfejtve!'); return; }
  const num = unsolved[Math.floor(Math.random() * unsolved.length)];
  sbGuesses[num] = sbDecipher[num].toUpperCase();
  sbSelectedNum = findNextUnsolved(num);
  renderGuesses(); updateSbProgress();
  showToast('💡 ' + num + ' = ' + sbDecipher[num].toUpperCase());
  if (checkSbWin()) setTimeout(showSbWin, 500);
}

function sbSolveAll() {
  Object.keys(sbDecipher).forEach(num => { sbGuesses[parseInt(num)] = sbDecipher[num].toUpperCase(); });
  sbSelectedNum = null;
  renderGuesses(); updateSbProgress();
  setTimeout(showSbWin, 300);
}

function checkSbWin() {
  return Object.keys(sbDecipher).every(num => {
    const g = sbGuesses[parseInt(num)];
    return g && g.toUpperCase() === sbDecipher[num].toUpperCase();
  });
}

function updateSbProgress() {
  const total = Object.keys(sbDecipher).length;
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
}

function sbHandleKey(e) {
  if (currentScreen !== 'szambetu') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key;
  if (key === 'Backspace') { e.preventDefault(); sbBackspace(); }
  else if (key === 'Escape') { sbSelectedNum = null; renderGuesses(); }
  else if (key.length === 1 && /[a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]/.test(key)) {
    e.preventDefault(); sbEnterLetter(key);
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
