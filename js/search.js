const MODULES = [
  { id: 'biologia',    nev: 'Biológia',    leiras: 'Biológiai és élettudományi szakszókincs',       szin: '#7fff9f', ikon: '🧬' },
  { id: 'fizika',      nev: 'Fizika',      leiras: 'Fizikai és természettudományi szakszókincs',     szin: '#7fd4ff', ikon: '⚛️' },
  { id: 'foldrajz',    nev: 'Földrajz',    leiras: 'Földrajzi szakszókincs',                         szin: '#ffe07f', ikon: '🌍' },
  { id: 'informatika', nev: 'Informatika', leiras: 'Informatikai és számítástechnikai szakszókincs', szin: '#7fc9ff', ikon: '💻' },
  { id: 'kemia',       nev: 'Kémia',       leiras: 'Kémiai és vegyipari szakszókincs',               szin: '#d4a0ff', ikon: '⚗️' },
  { id: 'matematika',  nev: 'Matematika',  leiras: 'Matematikai és logikai szakszókincs',            szin: '#ff7fb4', ikon: '∑'  },
  { id: 'sport',       nev: 'Sport',       leiras: 'Sportszókincs és edzésterminológia',             szin: '#ff9f4f', ikon: '🏅' },
  { id: 'zene',        nev: 'Zene',        leiras: 'Zenei szakszókincs és terminológia',             szin: '#ffcf7f', ikon: '🎵' },
  { id: 'idegen',      nev: 'Idegen',      leiras: 'Idegen szavak és jövevényszók',                  szin: '#b4ffdf', ikon: '🌐' },
  { id: 'ifjusagi',    nev: 'Ifjúsági',    leiras: 'Ifjúsági irodalom és szókincs',                  szin: '#ff7fdf', ikon: '📖' },
  { id: 'regies',      nev: 'Régies',      leiras: 'Régies és archaikus szókincs',                   szin: '#d4b06a', ikon: '📜' },
];

let wordModuleMap = {};
let wordList = [];
let loaded = false;
let currentLen = 6;
let activeCategories = new Set();
let holdTimer = null, holdInterval = null;

function setLen(v) {
  v = Math.max(1, Math.min(40, v));
  if (v === currentLen) return;
  currentLen = v;
  document.getElementById('len-display').textContent = v;
  generateSlots();
  generateYellowSlots();
}
function stepLen(delta) { setLen(currentLen + delta); }
function startHold(delta) {
  stepLen(delta);
  holdTimer = setTimeout(() => {
    let speed = 300;
    function tick() { stepLen(delta); speed = Math.max(60, speed - 20); holdInterval = setTimeout(tick, speed); }
    holdInterval = setTimeout(tick, speed);
  }, 400);
}
function stopHold() { clearTimeout(holdTimer); clearTimeout(holdInterval); holdTimer = null; holdInterval = null; }

function bindBtn(id, delta) {
  const btn = document.getElementById(id);
  btn.addEventListener('mousedown', e => { e.preventDefault(); startHold(delta); });
  btn.addEventListener('touchstart', e => { e.preventDefault(); startHold(delta); }, { passive: false });
  window.addEventListener('mouseup', stopHold);
  window.addEventListener('touchend', stopHold);
}
bindBtn('btn-minus', -1);
bindBtn('btn-plus', +1);

function generateSlots() {
  const len = currentLen;
  const grid = document.getElementById('slots-grid');
  const existing = {};
  for (let i = 0; i < 40; i++) {
    const inp = document.getElementById('slot-' + i);
    if (inp && inp.value.trim()) existing[i] = inp.value.trim();
  }
  grid.innerHTML = '';
  for (let i = 0; i < len; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'slot-wrap';
    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = i + 1;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.maxLength = 2; inp.id = 'slot-' + i;
    inp.className = 'slot-input'; inp.autocomplete = 'off'; inp.autocorrect = 'off';
    inp.autocapitalize = 'off'; inp.spellcheck = false;
    if (existing[i]) { inp.value = existing[i].toUpperCase(); inp.classList.add('filled'); }
    inp.addEventListener('input', () => {
      inp.value = inp.value.toUpperCase();
      inp.classList.toggle('filled', inp.value.trim() !== '');
      if (inp.value.length >= 1) { const next = document.getElementById('slot-' + (i + 1)); if (next) next.focus(); }
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && inp.value === '') { const prev = document.getElementById('slot-' + (i - 1)); if (prev) prev.focus(); }
      if (e.key === 'Enter') search();
    });
    wrap.appendChild(label); wrap.appendChild(inp); grid.appendChild(wrap);
  }
  setStep(1);
  loadWords().catch(() => {});
}
generateSlots();

function generateYellowSlots() {
  const len = currentLen;
  const grid = document.getElementById('yellow-slots-grid');
  const existing = {};
  for (let i = 0; i < 40; i++) {
    const inp = document.getElementById('yslot-' + i);
    if (inp && inp.value.trim()) existing[i] = inp.value.trim();
  }
  grid.innerHTML = '';
  for (let i = 0; i < len; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'yellow-slot-wrap';
    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = i + 1;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.maxLength = 6; inp.id = 'yslot-' + i;
    inp.className = 'yellow-slot-input'; inp.autocomplete = 'off'; inp.autocorrect = 'off';
    inp.autocapitalize = 'off'; inp.spellcheck = false; inp.placeholder = '·';
    if (existing[i]) { inp.value = existing[i].toUpperCase(); inp.classList.add('has-value'); }
    inp.addEventListener('input', () => {
      inp.value = inp.value.toUpperCase().replace(/[^A-ZÁÉÍÓÖŐÚÜŰ]/g, '');
      inp.classList.toggle('has-value', inp.value.trim() !== '');
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && inp.value === '') { const prev = document.getElementById('yslot-' + (i - 1)); if (prev) prev.focus(); }
      if (e.key === 'Enter') search();
    });
    wrap.appendChild(label); wrap.appendChild(inp); grid.appendChild(wrap);
  }
}
generateYellowSlots();

function getYellowConstraints() {
  const result = {};
  for (let i = 0; i < currentLen; i++) {
    const inp = document.getElementById('yslot-' + i);
    if (inp && inp.value.trim()) {
      const letters = [...new Set(inp.value.trim().toLowerCase().split('').filter(c => /[a-záéíóöőúüű]/.test(c)))];
      if (letters.length > 0) result[i] = letters;
    }
  }
  return result;
}

function setStep(idx) {
  document.querySelectorAll('.step-dot').forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i < idx) d.classList.add('done');
    else if (i === idx) d.classList.add('active');
  });
  for (let i = 0; i < 3; i++) {
    const line = document.getElementById('line-' + i);
    if (line) line.classList.toggle('done', i < idx);
  }
}

function updatePills(inputId, pillsId, cls) {
  const val = document.getElementById(inputId).value.trim();
  const chars = val ? [...new Set(val.split('').map(c => c.toLowerCase()).filter(c => c.trim() && c !== ' '))] : [];
  const pills = document.getElementById(pillsId);
  pills.innerHTML = '';
  chars.forEach(c => {
    const span = document.createElement('span');
    span.className = 'pill ' + cls;
    span.textContent = c.toUpperCase();
    pills.appendChild(span);
  });
}
document.getElementById('excluded-input').addEventListener('input', () => updatePills('excluded-input','excluded-pills','pill-excluded'));
document.getElementById('required-input').addEventListener('input', () => updatePills('required-input','required-pills','pill-required'));

function normalize(s) { return s.toLowerCase(); }

function getModuleMeta(id) {
  return MODULES.find(m => m.id === id) || { nev: 'Alap', leiras: 'Alapszókincs', szin: '#a894ff', ikon: '📚' };
}

function highlightWord(word, greenConstraints, yellowConstraints, filterStr) {
  const yellowFlat = Object.values(yellowConstraints).flat();
  return word.split('').map((ch, i) => {
    if (greenConstraints[i]) return `<span class="pos-match">${ch}</span>`;
    if (yellowFlat.includes(ch)) return `<span class="yellow-match">${ch}</span>`;
    if (filterStr && filterStr.includes(ch)) return `<span class="match">${ch}</span>`;
    return ch;
  }).join('');
}

function buildTooltip(modules) {
  const primary = getModuleMeta(modules[0]);
  const extras = modules.slice(1).map(m => getModuleMeta(m).nev).join(', ');
  return `<div class="tooltip"><div class="tooltip-cat"><span class="cat-dot" style="background:${primary.szin}"></span><span style="color:${primary.szin}">${primary.ikon} ${primary.nev}</span></div><div class="tooltip-desc">${primary.leiras}${extras ? '<br><span style="color:var(--text-tertiary);font-size:10px;">+ ' + extras + '</span>' : ''}</div><div class="tooltip-arrow"></div></div>`;
}

function clearAll() {
  showConfirm('Mindent akarsz törölni?', 'Igen, töröl', () => {
    for (let i = 0; i < currentLen; i++) {
      const inp = document.getElementById('slot-' + i);
      if (inp) { inp.value = ''; inp.classList.remove('filled'); }
      const yinp = document.getElementById('yslot-' + i);
      if (yinp) { yinp.value = ''; yinp.classList.remove('has-value'); }
    }
    document.getElementById('excluded-input').value = '';
    document.getElementById('required-input').value = '';
    document.getElementById('excluded-pills').innerHTML = '';
    document.getElementById('required-pills').innerHTML = '';
    document.getElementById('results').innerHTML = '';
    activeCategories.clear();
    showToast('✓ Mezők törölve');
  });
}

const RAW_BASE = 'https://raw.githubusercontent.com/laszlonemeth/magyarispell/master/szotar/';
const MODULE_URLS = {
  biologia: RAW_BASE + 'biologia/fonev.1', fizika: RAW_BASE + 'fizika/fonev.1',
  foldrajz: RAW_BASE + 'foldrajz/fonev.1', informatika: RAW_BASE + 'informatika/fonev.1',
  kemia: RAW_BASE + 'kemia/fonev.1', matematika: RAW_BASE + 'matematika/fonev.1',
  sport: RAW_BASE + 'sport/fonev.1', zene: RAW_BASE + 'zene/fonev.1',
  idegen: RAW_BASE + 'idegen/fonev.1', ifjusagi: RAW_BASE + 'ifjusagi/fonev.1',
  regies: RAW_BASE + 'regies/fonev.1',
};
const FALLBACK_URL = 'https://gist.githubusercontent.com/Konstantinusz/f9517357e46fa827c3736031ac8d01c7/raw/fc98429a6357d1c4fcc644e1b70c2431bd046cf0/magyar-szavak.txt';

async function tryFetch(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return await r.text(); }
  catch { return null; }
}

async function loadWords() {
  if (loaded) return;
  let mainText = await tryFetch(FALLBACK_URL);
  if (!mainText) throw new Error('Nem sikerült betölteni a szólistát.');
  const rawWords = mainText.split('\n').map(l => {
    const slash = l.indexOf('/');
    return (slash > -1 ? l.slice(0, slash) : l).trim().toLowerCase();
  }).filter(w => w.length > 0 && !w.startsWith('#') && /^[a-záéíóöőúüű]+$/i.test(w));
  const wordSet = new Set(rawWords);
  wordModuleMap = {};
  wordSet.forEach(w => { wordModuleMap[w] = ['alap']; });
  const fetchPromises = Object.entries(MODULE_URLS).map(async ([modId, url]) => {
    const text = await tryFetch(url);
    if (!text) return;
    text.split('\n').forEach(line => {
      const word = line.trim().split(/\s+/)[0].toLowerCase();
      if (!word || word.startsWith('#') || !/^[a-záéíóöőúüű]+$/i.test(word)) return;
      if (wordModuleMap[word]) { if (!wordModuleMap[word].includes(modId)) wordModuleMap[word].push(modId); }
      else { wordModuleMap[word] = [modId]; wordSet.add(word); }
    });
  });
  await Promise.allSettled(fetchPromises);
  wordList = [...wordSet].map(w => ({ word: w, modules: wordModuleMap[w] || ['alap'] }));
  loaded = true;
}

async function search() {
  const len = currentLen;
  const btn = document.getElementById('search-btn');
  const results = document.getElementById('results');
  const bar = document.getElementById('loading-bar');
  btn.innerHTML = '<span class="spinner"></span>Keresés...';
  btn.disabled = true; bar.classList.add('active'); setStep(3);
  try { await loadWords(); }
  catch(e) {
    results.innerHTML = '<p style="color:rgba(255,100,100,0.8);font-size:13px;">Hiba a szólista betöltésekor.</p>';
    btn.innerHTML = 'Keresés <span class="btn-icon">→</span>'; btn.disabled = false; bar.classList.remove('active'); return;
  }
  const constraints = {};
  for (let i = 0; i < len; i++) {
    const inp = document.getElementById('slot-' + i);
    if (inp && inp.value.trim()) constraints[i] = normalize(inp.value.trim());
  }
  const yellowConstraints = getYellowConstraints();
  const excVal = document.getElementById('excluded-input').value.trim();
  const reqVal = document.getElementById('required-input').value.trim();
  const excluded = excVal ? [...new Set(excVal.split('').map(c => c.toLowerCase()).filter(c => c.trim()))] : [];
  const required = reqVal ? [...new Set(reqVal.split('').map(c => c.toLowerCase()).filter(c => c.trim()))] : [];

  let matches = wordList.filter(({ word }) => {
    const w = normalize(word);
    if (w.length !== len) return false;
    for (const [pos, ch] of Object.entries(constraints)) { if (w[parseInt(pos)] !== ch) return false; }
    for (const ch of required) { if (!w.includes(ch)) return false; }
    for (const [pos, letters] of Object.entries(yellowConstraints)) {
      for (const ch of letters) { if (!w.includes(ch)) return false; if (w[parseInt(pos)] === ch) return false; }
    }
    const knownCount = {};
    for (const ch of Object.values(constraints)) knownCount[ch] = (knownCount[ch] || 0) + 1;
    for (const letters of Object.values(yellowConstraints)) for (const ch of letters) knownCount[ch] = (knownCount[ch] || 0) + 1;
    for (const ch of excluded) {
      const occ = w.split('').filter(l => l === ch).length;
      if (ch in knownCount) { if (occ !== knownCount[ch]) return false; }
      else { if (occ > 0) return false; }
    }
    return true;
  });

  btn.innerHTML = 'Keresés <span class="btn-icon">→</span>'; btn.disabled = false; bar.classList.remove('active');
  results.innerHTML = '';
  setTimeout(() => document.getElementById('sec-results').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  const meta = document.createElement('div'); meta.className = 'results-meta';
  const countEl = document.createElement('div'); countEl.className = 'results-count'; countEl.textContent = matches.length + ' találat';
  meta.appendChild(countEl);
  const tags = document.createElement('div'); tags.className = 'filter-tags';
  const kn = Object.keys(constraints).length, yn = Object.keys(yellowConstraints).length;
  if (kn) tags.innerHTML += `<span class="filter-tag">${kn} zöld</span>`;
  if (yn) tags.innerHTML += `<span class="filter-tag">${yn} sárga</span>`;
  if (excluded.length) tags.innerHTML += `<span class="filter-tag">${excluded.length} kizárt</span>`;
  if (required.length) tags.innerHTML += `<span class="filter-tag">${required.length} kötelező</span>`;
  meta.appendChild(tags); results.appendChild(meta);

  if (matches.length === 0) {
    const msg = document.createElement('div'); msg.className = 'no-results'; msg.textContent = 'Nincs találat — lazíts a feltételeken'; results.appendChild(msg); return;
  }

  const fsWrap = document.createElement('div'); fsWrap.className = 'results-search-wrap';
  fsWrap.innerHTML = `<span class="results-search-icon">⌕</span>`;
  const fsInp = document.createElement('input'); fsInp.type = 'text'; fsInp.placeholder = 'Szűrés a találatok között...'; fsInp.autocomplete = 'off';
  fsWrap.appendChild(fsInp); results.appendChild(fsWrap);
  const grid = document.createElement('div'); grid.className = 'words-grid'; results.appendChild(grid);
  const noteEl = document.createElement('p'); noteEl.className = 'truncate-note'; results.appendChild(noteEl);

  function renderChips(list, filterStr) {
    grid.innerHTML = '';
    list.slice(0, 200).forEach((item, idx) => {
      const { word, modules } = item;
      const chip = document.createElement('span'); chip.className = 'word-chip';
      chip.style.animationDelay = Math.min(idx * 0.01, 0.35) + 's';
      const primary = getModuleMeta(modules[0]);
      chip.style.borderLeftColor = primary.szin + '66'; chip.style.borderLeftWidth = '2px';
      chip.innerHTML = `<span style="position:relative;z-index:1">${highlightWord(word, constraints, yellowConstraints, filterStr)}</span>` + buildTooltip(modules);
      chip.addEventListener('click', () => {
        for (let i = 0; i < word.length; i++) { const inp = document.getElementById('slot-' + i); if (inp) { inp.value = word[i].toUpperCase(); inp.classList.add('filled'); } }
        showToast('„' + word + '" beillesztve');
      });
      grid.appendChild(chip);
    });
    noteEl.textContent = list.length > 200 ? `Csak az első 200 jelenik meg ${list.length}-ből — szűkíts tovább` : '';
  }
  renderChips(matches, '');
  countEl.textContent = matches.length + ' találat';
  fsInp.addEventListener('input', () => {
    const f = normalize(fsInp.value.trim());
    const filtered = f ? matches.filter(({ word }) => word.includes(f)) : matches;
    countEl.textContent = filtered.length + ' találat'; renderChips(filtered, f);
  });
}

setTimeout(() => {
  const btn = document.getElementById('excl-info-btn');
  if (btn) {
    btn.addEventListener('click', e => { e.stopPropagation(); btn.classList.toggle('open'); });
    document.addEventListener('click', () => btn.classList.remove('open'));
  }
}, 200);
