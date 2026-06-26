/* ============================================================
   Carey Foster Bridge — Virtual Lab
   Simulation Engine, Canvas Rendering & Interactive Logic
   ============================================================ */

// ── State ──
const state = {
  currentPart: 1,           // 1 = find ρ, 2 = find Y
  batteryOn: false,
  swapped: false,            // Whether X and Y are swapped
  resistanceX: 0.5,          // Known fractional resistance (Ω)
  jockeyPosition: 50.0,     // Position on wire (0-100 cm)
  
  // Physics constants
  actualRho: 0.0212,         // Actual ρ of bridge wire (Ω/cm) — realistic manganin
  actualY: 0.35,             // Actual unknown low resistance (Ω)
  wireLength: 100,           // 100 cm bridge wire
  endResistance: 0.005,      // Small end resistance (Ω) at each end
  
  // Computed
  balancePoint: null,        // Current computed balance point
  galvDeflection: 0,
  
  // Recorded readings for auto-fill
  part1Readings: [],         // [{x, l1, l2}]
  part2Readings: [],         // [{x, l1, l2}]
  
  // Results
  meanRho: null,
  meanY: null,
  
  // Animation
  jockeyAnimating: false,
  galvNeedleAngle: 0,
  galvTargetAngle: 0,
};

// Quiz answers
const quizAnswers = {
  q1: 1,  // Wheatstone Bridge
  q2: 1,  // Eliminate end resistances
  q3: 2,  // Manganin or Constantan
  q4: 2,  // No current — bridge balanced
  q5: 1,  // Maximum sensitivity
};

// ── DOM References ──
let simCanvas, simCtx;
let galvCanvas, galvCtx;
let diagramCanvas, diagramCtx;

// ── Initialization ──
document.addEventListener('DOMContentLoaded', () => {
  initCanvases();
  initTabs();
  initTheme();
  initScrollAnimations();
  
  // Initial draw
  drawAll();
  updateAllDisplays();
  
  // Resize handler
  window.addEventListener('resize', () => {
    initCanvases();
    drawAll();
  });
});

function initCanvases() {
  const isMobile = window.innerWidth <= 768;
  const isSmall = window.innerWidth <= 480;
  const dpr = window.devicePixelRatio || 1;
  
  // Responsive heights
  const simH = isSmall ? 220 : (isMobile ? 260 : 350);
  const galvH = isSmall ? 160 : (isMobile ? 180 : 220);
  const diagH = isSmall ? 240 : (isMobile ? 270 : 320);
  
  // Simulation canvas
  simCanvas = document.getElementById('simCanvas');
  if (simCanvas) {
    const rect = simCanvas.parentElement.getBoundingClientRect();
    simCanvas.width = rect.width * dpr;
    simCanvas.height = simH * dpr;
    simCanvas.style.height = simH + 'px';
    simCtx = simCanvas.getContext('2d');
    simCtx.scale(dpr, dpr);
    
    // Remove old listeners before adding (prevent duplicates on resize)
    simCanvas.removeEventListener('mousemove', handleSimMouseMove);
    simCanvas.removeEventListener('mousedown', handleSimMouseDown);
    simCanvas.removeEventListener('touchmove', handleSimTouchMove);
    simCanvas.removeEventListener('touchstart', handleSimTouchStart);
    
    // Mouse/Touch handlers on sim canvas
    simCanvas.addEventListener('mousemove', handleSimMouseMove);
    simCanvas.addEventListener('mousedown', handleSimMouseDown);
    simCanvas.addEventListener('touchmove', handleSimTouchMove, { passive: false });
    simCanvas.addEventListener('touchstart', handleSimTouchStart, { passive: false });
  }
  
  // Galvanometer canvas
  galvCanvas = document.getElementById('galvCanvas');
  if (galvCanvas) {
    const rect = galvCanvas.parentElement.getBoundingClientRect();
    galvCanvas.width = rect.width * dpr;
    galvCanvas.height = galvH * dpr;
    galvCanvas.style.height = galvH + 'px';
    galvCtx = galvCanvas.getContext('2d');
    galvCtx.scale(dpr, dpr);
  }
  
  // Theory diagram canvas
  diagramCanvas = document.getElementById('diagramCanvas');
  if (diagramCanvas) {
    const rect = diagramCanvas.parentElement.getBoundingClientRect();
    diagramCanvas.width = rect.width * dpr;
    diagramCanvas.height = diagH * dpr;
    diagramCanvas.style.height = diagH + 'px';
    diagramCtx = diagramCanvas.getContext('2d');
    diagramCtx.scale(dpr, dpr);
  }
}

// ── Theme Engine ──
function initTheme() {
  const saved = localStorage.getItem('cfb-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
  
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cfb-theme', next);
    updateThemeIcon(next);
    drawAll();
  });
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

function isDark() {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}

// ── Tab Navigation ──
function initTabs() {
  document.querySelectorAll('.custom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.custom-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active-page'));
      document.getElementById('page-' + btn.dataset.tab).classList.add('active-page');
      
      // Re-init canvases when switching tabs
      setTimeout(() => {
        initCanvases();
        drawAll();
      }, 50);
    });
  });
}

// ── Scroll Animations ──
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });
  
  document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
}

// ── Physics Engine ──
function computeBalancePoint() {
  // Carey Foster balance condition:
  // When bridge is balanced: X + α + l*ρ = Y + β + (L - l)*ρ
  // Where α, β are end resistances, L is wire length, l is balance point
  // Rearranging: l = (Y - X + β - α + L*ρ) / (2*ρ) ≈ (Y - X)/(2ρ) + L/2
  //
  // For the swap case, X and Y positions are interchanged:
  // X_eff and Y_eff are what's in each gap
  
  let X_eff, Y_eff;
  
  if (state.currentPart === 1) {
    // Part 1: Y is short-circuited (Y_gap = 0)
    if (!state.swapped) {
      X_eff = state.resistanceX;
      Y_eff = 0;
    } else {
      X_eff = 0;
      Y_eff = state.resistanceX;
    }
  } else {
    // Part 2: Y is actual unknown
    if (!state.swapped) {
      X_eff = state.resistanceX;
      Y_eff = state.actualY;
    } else {
      X_eff = state.actualY;
      Y_eff = state.resistanceX;
    }
  }
  
  const alpha = state.endResistance;
  const beta = state.endResistance;
  const L = state.wireLength;
  const rho = state.actualRho;
  
  // Balance: X_eff + alpha + l*rho = Y_eff + beta + (L - l)*rho
  // 2*l*rho = Y_eff - X_eff + beta - alpha + L*rho
  // l = (Y_eff - X_eff + beta - alpha + L*rho) / (2*rho)
  
  let l = (Y_eff - X_eff + beta - alpha + L * rho) / (2 * rho);
  
  // Clamp to wire length
  l = Math.max(0, Math.min(L, l));
  
  return l;
}

function computeGalvDeflection() {
  if (!state.batteryOn) return 0;
  
  const balanceL = computeBalancePoint();
  const diff = state.jockeyPosition - balanceL;
  
  // Galvanometer deflection proportional to unbalance
  // Use a sigmoid-like curve for realism
  const sensitivity = 15; // Higher = more sensitive
  const deflection = sensitivity * diff / (1 + Math.abs(diff) * 0.1);
  
  return Math.max(-50, Math.min(50, deflection));
}

// ── Controls ──
function selectPart(part) {
  state.currentPart = part;
  
  document.getElementById('btnPart1').classList.toggle('active', part === 1);
  document.getElementById('btnPart2').classList.toggle('active', part === 2);
  
  const desc = document.getElementById('partDescription');
  if (part === 1) {
    desc.textContent = 'Y is short-circuited (Y = 0). Determine resistance per unit length of the bridge wire.';
  } else {
    desc.textContent = 'Y is the unknown low resistance. Determine Y using the mean ρ from Part 1.';
  }
  
  // Reset swap
  state.swapped = false;
  updateSwapDisplay();
  
  updateAllDisplays();
  drawAll();
}

function toggleBattery() {
  state.batteryOn = !state.batteryOn;
  
  const btn = document.getElementById('btnBattery');
  const status = document.getElementById('batteryStatus');
  
  if (state.batteryOn) {
    btn.innerHTML = '🔋 Turn OFF Battery';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-danger');
    status.className = 'status-indicator status-on';
    status.innerHTML = '<span class="status-dot"></span> Battery ON';
    showToast('Battery turned ON — circuit is live!', 'success');
  } else {
    btn.innerHTML = '🔋 Turn ON Battery';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');
    status.className = 'status-indicator status-off';
    status.innerHTML = '<span class="status-dot"></span> Battery OFF';
    showToast('Battery turned OFF', 'info');
  }
  
  updateAllDisplays();
  drawAll();
}

function toggleSwap() {
  state.swapped = !state.swapped;
  updateSwapDisplay();
  updateAllDisplays();
  drawAll();
  
  if (state.swapped) {
    showToast('X and Y positions swapped!', 'info');
  } else {
    showToast('Positions restored to normal', 'info');
  }
}

function updateSwapDisplay() {
  const track = document.getElementById('swapTrack');
  const label = document.getElementById('swapLabel');
  
  if (state.swapped) {
    track.classList.add('active');
    label.textContent = 'Swapped: Y in left gap, X in right gap';
  } else {
    track.classList.remove('active');
    label.textContent = 'Normal: X in left gap, Y in right gap';
  }
}

function updateResistanceX(val) {
  state.resistanceX = parseFloat(val);
  document.getElementById('resistanceXDisplay').textContent = state.resistanceX.toFixed(1) + ' Ω';
  updateAllDisplays();
  drawAll();
}

function moveJockey(val) {
  state.jockeyPosition = parseFloat(val);
  document.getElementById('jockeyPositionDisplay').textContent = state.jockeyPosition.toFixed(1) + ' cm';
  updateAllDisplays();
  drawAll();
}

// ── Canvas Mouse/Touch Handlers ──
function getSimWireRange() {
  const w = simCanvas.width / (window.devicePixelRatio || 1);
  const wireStartX = 60;
  const wireEndX = w - 60;
  return { start: wireStartX, end: wireEndX };
}

function handleSimMouseMove(e) {
  if (e.buttons !== 1) return;
  moveJockeyFromCanvasX(e.offsetX);
}

function handleSimMouseDown(e) {
  moveJockeyFromCanvasX(e.offsetX);
}

function handleSimTouchMove(e) {
  e.preventDefault();
  const rect = simCanvas.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  moveJockeyFromCanvasX(x);
}

function handleSimTouchStart(e) {
  e.preventDefault();
  const rect = simCanvas.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  moveJockeyFromCanvasX(x);
}

function moveJockeyFromCanvasX(canvasX) {
  const range = getSimWireRange();
  let fraction = (canvasX - range.start) / (range.end - range.start);
  fraction = Math.max(0, Math.min(1, fraction));
  const pos = fraction * 100;
  
  state.jockeyPosition = Math.round(pos * 10) / 10;
  document.getElementById('jockeySlider').value = state.jockeyPosition;
  document.getElementById('jockeyPositionDisplay').textContent = state.jockeyPosition.toFixed(1) + ' cm';
  
  updateAllDisplays();
  drawAll();
}

// ── Record Readings ──
function recordReading() {
  if (!state.batteryOn) {
    showToast('Turn on the battery first!', 'error');
    return;
  }
  
  const galvDefl = computeGalvDeflection();
  
  // Check if near null point (within ±1 µA)
  if (Math.abs(galvDefl) > 2) {
    showToast('Galvanometer is not at null! Move jockey closer to the balance point.', 'error');
    return;
  }
  
  const readings = state.currentPart === 1 ? state.part1Readings : state.part2Readings;
  const x = state.resistanceX;
  const l = state.jockeyPosition;
  
  // Check if this X value already has a reading for this swap state
  const existing = readings.find(r => Math.abs(r.x - x) < 0.01);
  
  if (existing) {
    if (!state.swapped && existing.l1 === null) {
      existing.l1 = l;
      showToast(`Recorded l₁ = ${l.toFixed(1)} cm for X = ${x.toFixed(1)} Ω (before swap)`, 'success');
    } else if (state.swapped && existing.l2 === null) {
      existing.l2 = l;
      showToast(`Recorded l₂ = ${l.toFixed(1)} cm for X = ${x.toFixed(1)} Ω (after swap)`, 'success');
    } else if (!state.swapped) {
      existing.l1 = l;
      showToast(`Updated l₁ = ${l.toFixed(1)} cm for X = ${x.toFixed(1)} Ω`, 'info');
    } else {
      existing.l2 = l;
      showToast(`Updated l₂ = ${l.toFixed(1)} cm for X = ${x.toFixed(1)} Ω`, 'info');
    }
  } else {
    const newReading = { x: x, l1: null, l2: null };
    if (!state.swapped) {
      newReading.l1 = l;
      showToast(`Recorded l₁ = ${l.toFixed(1)} cm for X = ${x.toFixed(1)} Ω. Now swap X & Y and find l₂!`, 'success');
    } else {
      newReading.l2 = l;
      showToast(`Recorded l₂ = ${l.toFixed(1)} cm for X = ${x.toFixed(1)} Ω. Now un-swap and record l₁!`, 'success');
    }
    readings.push(newReading);
  }
  
  autoFillTableFromReadings();
}

function autoFillTableFromReadings() {
  // Auto-fill Table 1 from Part 1 readings
  state.part1Readings.forEach((r, i) => {
    if (i >= 5) return;
    const row = i + 1;
    const xEl = document.getElementById(`t1_${row}_x`);
    const l1El = document.getElementById(`t1_${row}_l1`);
    const l2El = document.getElementById(`t1_${row}_l2`);
    
    if (xEl) xEl.value = r.x.toFixed(2);
    if (l1El && r.l1 !== null) l1El.value = r.l1.toFixed(2);
    if (l2El && r.l2 !== null) l2El.value = r.l2.toFixed(2);
  });
  
  // Auto-fill Table 2 from Part 2 readings
  state.part2Readings.forEach((r, i) => {
    if (i >= 5) return;
    const row = i + 1;
    const xEl = document.getElementById(`t2_${row}_x`);
    const l1El = document.getElementById(`t2_${row}_l1`);
    const l2El = document.getElementById(`t2_${row}_l2`);
    
    if (xEl) xEl.value = r.x.toFixed(2);
    if (l1El && r.l1 !== null) l1El.value = r.l1.toFixed(2);
    if (l2El && r.l2 !== null) l2El.value = r.l2.toFixed(2);
  });
}

// ── Table Calculations ──
function calculateRho() {
  let rhoValues = [];
  
  for (let i = 1; i <= 5; i++) {
    const xEl = document.getElementById(`t1_${i}_x`);
    const l1El = document.getElementById(`t1_${i}_l1`);
    const l2El = document.getElementById(`t1_${i}_l2`);
    
    const x = parseFloat(xEl?.value);
    const l1 = parseFloat(l1El?.value);
    const l2 = parseFloat(l2El?.value);
    
    const diffEl = document.getElementById(`t1_${i}_diff`);
    const rhoEl = document.getElementById(`t1_${i}_rho`);
    
    if (!isNaN(x) && !isNaN(l1) && !isNaN(l2)) {
      const diff = l2 - l1;
      diffEl.textContent = diff.toFixed(2);
      
      if (Math.abs(diff) > 0.01) {
        const rho = x / diff;
        rhoEl.textContent = rho.toFixed(4);
        rhoValues.push(rho);
      } else {
        rhoEl.textContent = '∞';
      }
    } else {
      diffEl.textContent = '—';
      rhoEl.textContent = '—';
    }
  }
  
  if (rhoValues.length > 0) {
    const meanRho = rhoValues.reduce((a, b) => a + b, 0) / rhoValues.length;
    state.meanRho = meanRho;
    document.getElementById('res_mean_rho').textContent = meanRho.toFixed(4);
    document.getElementById('final_rho').textContent = meanRho.toFixed(4);
    showToast(`Mean ρ = ${meanRho.toFixed(4)} Ω/cm calculated from ${rhoValues.length} observations`, 'success');
  } else {
    showToast('Please enter at least one complete row in Table 1', 'error');
  }
}

function calculateY() {
  if (state.meanRho === null) {
    showToast('Calculate ρ from Table 1 first!', 'error');
    return;
  }
  
  let yValues = [];
  
  for (let i = 1; i <= 5; i++) {
    const xEl = document.getElementById(`t2_${i}_x`);
    const l1El = document.getElementById(`t2_${i}_l1`);
    const l2El = document.getElementById(`t2_${i}_l2`);
    
    const x = parseFloat(xEl?.value);
    const l1 = parseFloat(l1El?.value);
    const l2 = parseFloat(l2El?.value);
    
    const diffEl = document.getElementById(`t2_${i}_diff`);
    const yEl = document.getElementById(`t2_${i}_y`);
    
    if (!isNaN(x) && !isNaN(l1) && !isNaN(l2)) {
      const diff = l2 - l1;
      diffEl.textContent = diff.toFixed(2);
      
      const y = x - diff * state.meanRho;
      yEl.textContent = y.toFixed(4);
      yValues.push(y);
    } else {
      diffEl.textContent = '—';
      yEl.textContent = '—';
    }
  }
  
  if (yValues.length > 0) {
    const meanY = yValues.reduce((a, b) => a + b, 0) / yValues.length;
    state.meanY = meanY;
    document.getElementById('final_Y').textContent = meanY.toFixed(4);
    document.getElementById('final_Y_actual').textContent = state.actualY.toFixed(4);
    
    const pctError = Math.abs((meanY - state.actualY) / state.actualY * 100);
    document.getElementById('final_error').textContent = pctError.toFixed(2) + '%';
    
    showToast(`Mean Y = ${meanY.toFixed(4)} Ω calculated from ${yValues.length} observations`, 'success');
  } else {
    showToast('Please enter at least one complete row in Table 2', 'error');
  }
}

function clearTable(tableId) {
  if (tableId === 'table1') {
    for (let i = 1; i <= 5; i++) {
      ['x', 'l1', 'l2'].forEach(f => {
        const el = document.getElementById(`t1_${i}_${f}`);
        if (el) el.value = '';
      });
      ['diff', 'rho'].forEach(f => {
        const el = document.getElementById(`t1_${i}_${f}`);
        if (el) el.textContent = '—';
      });
    }
    state.part1Readings = [];
    state.meanRho = null;
    document.getElementById('res_mean_rho').textContent = '—';
    document.getElementById('final_rho').textContent = '—';
    showToast('Table 1 cleared', 'info');
  } else {
    for (let i = 1; i <= 5; i++) {
      ['x', 'l1', 'l2'].forEach(f => {
        const el = document.getElementById(`t2_${i}_${f}`);
        if (el) el.value = '';
      });
      ['diff', 'y'].forEach(f => {
        const el = document.getElementById(`t2_${i}_${f}`);
        if (el) el.textContent = '—';
      });
    }
    state.part2Readings = [];
    state.meanY = null;
    document.getElementById('final_Y').textContent = '—';
    document.getElementById('final_Y_actual').textContent = '—';
    document.getElementById('final_error').textContent = '—';
    showToast('Table 2 cleared', 'info');
  }
}

// ── Update Displays ──
function updateAllDisplays() {
  const galvDefl = computeGalvDeflection();
  state.galvDeflection = galvDefl;
  state.galvTargetAngle = galvDefl;
  
  const balanceL = computeBalancePoint();
  
  // Galvanometer display
  const galvEl = document.getElementById('galvDeflection');
  galvEl.textContent = state.batteryOn ? galvDefl.toFixed(2) : '0.00';
  
  if (state.batteryOn && Math.abs(galvDefl) < 0.5) {
    galvEl.className = 'galvanometer-value null';
  } else {
    galvEl.className = 'galvanometer-value deflected';
  }
  
  // Live measurement panel
  document.getElementById('livePosition').innerHTML = state.jockeyPosition.toFixed(1) + '<span class="m-unit"> cm</span>';
  document.getElementById('liveResX').innerHTML = state.resistanceX.toFixed(1) + '<span class="m-unit"> Ω</span>';
  document.getElementById('liveGalv').innerHTML = (state.batteryOn ? galvDefl.toFixed(2) : '0.00') + '<span class="m-unit"> µA</span>';
  
  if (state.batteryOn && Math.abs(galvDefl) < 0.5) {
    document.getElementById('liveBalance').innerHTML = '<span style="color:var(--accent-green);">✓ NULL</span>';
  } else if (state.batteryOn) {
    document.getElementById('liveBalance').textContent = '—';
  } else {
    document.getElementById('liveBalance').textContent = 'OFF';
  }
}

// ── Toast Notifications ──
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 3500);
}

// ── Quiz Logic ──
function selectOption(questionId, optionIdx) {
  const questionEl = document.getElementById(questionId);
  const options = questionEl.querySelectorAll('.quiz-option');
  const correctIdx = quizAnswers[questionId];
  
  // Remove previous selections
  options.forEach(opt => {
    opt.classList.remove('selected', 'correct', 'wrong');
  });
  
  // Mark selected
  options[optionIdx].classList.add('selected');
  
  if (optionIdx === correctIdx) {
    options[optionIdx].classList.add('correct');
  } else {
    options[optionIdx].classList.add('wrong');
    options[correctIdx].classList.add('correct');
  }
}

// ═══════════════════════════════════════════════════════════════
//  CANVAS DRAWING
// ═══════════════════════════════════════════════════════════════

function drawAll() {
  drawDiagram();
  drawSimulation();
  drawGalvanometer();
}

// ── Helper: get theme-aware colors ──
function getColors() {
  const dark = isDark();
  return {
    bg: dark ? '#0f1629' : '#f0f2f8',
    wire: dark ? '#8a94a6' : '#4a5568',
    wireGlow: dark ? 'rgba(79,140,255,0.3)' : 'rgba(79,140,255,0.15)',
    copper: dark ? '#d4956b' : '#b87333',
    copperBright: dark ? '#f0c090' : '#d4956b',
    text: dark ? '#e8ecf4' : '#1a1e2e',
    textMuted: dark ? '#5a6478' : '#9ca3af',
    accent: '#4f8cff',
    accentGlow: 'rgba(79,140,255,0.4)',
    green: '#22c55e',
    greenGlow: 'rgba(34,197,94,0.4)',
    red: '#ef4444',
    redGlow: 'rgba(239,68,68,0.4)',
    amber: '#f59e0b',
    purple: '#a855f7',
    cyan: '#06b6d4',
    cardBg: dark ? 'rgba(15,22,45,0.5)' : 'rgba(255,255,255,0.5)',
    gridLine: dark ? 'rgba(79,140,255,0.06)' : 'rgba(79,140,255,0.08)',
  };
}

// ── Draw Theory Diagram ──
function drawDiagram() {
  if (!diagramCtx) return;
  const c = getColors();
  const W = diagramCanvas.width / (window.devicePixelRatio || 1);
  const H = diagramCanvas.height / (window.devicePixelRatio || 1);
  const ctx = diagramCtx;
  
  ctx.clearRect(0, 0, W, H);
  
  // Background
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  
  // Grid
  ctx.strokeStyle = c.gridLine;
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  
  const cx = W / 2;
  const cy = H / 2;
  
  // Draw Wheatstone bridge diamond
  const size = Math.min(W, H) * 0.35;
  
  const topY = cy - size * 0.7;
  const botY = cy + size * 0.7;
  const leftX = cx - size;
  const rightX = cx + size;
  
  // Points: A(top), B(left), C(bottom), D(right)
  const A = { x: cx, y: topY };
  const B = { x: leftX, y: cy };
  const C = { x: cx, y: botY };
  const D = { x: rightX, y: cy };
  
  // Draw bridge arms
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = c.wire;
  
  // A-B (P)
  drawLine(ctx, A.x, A.y, B.x, B.y);
  // A-D (Q)
  drawLine(ctx, A.x, A.y, D.x, D.y);
  // B-C top half (X gap — wire goes to bridge wire)
  drawLine(ctx, B.x, B.y, cx - size * 0.6, botY);
  // D-C top half (Y gap)
  drawLine(ctx, D.x, D.y, cx + size * 0.6, botY);
  
  // Bridge wire (bottom, B to D through C)
  ctx.strokeStyle = c.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.6, botY);
  ctx.lineTo(cx + size * 0.6, botY);
  ctx.stroke();
  
  // Scale markings on wire
  ctx.strokeStyle = c.textMuted;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 10; i++) {
    const tx = (cx - size * 0.6) + (size * 1.2) * (i / 10);
    ctx.beginPath();
    ctx.moveTo(tx, botY - 5);
    ctx.lineTo(tx, botY + 5);
    ctx.stroke();
  }
  
  // Labels on wire
  ctx.fillStyle = c.textMuted;
  ctx.font = '10px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText('0', cx - size * 0.6, botY + 18);
  ctx.fillText('50', cx, botY + 18);
  ctx.fillText('100 cm', cx + size * 0.6, botY + 18);
  
  // Resistance labels
  ctx.font = 'bold 14px "Outfit"';
  ctx.fillStyle = c.accent;
  ctx.textAlign = 'center';
  
  // P label
  ctx.fillText('P', (A.x + B.x) / 2 - 14, (A.y + B.y) / 2 - 8);
  // Q label
  ctx.fillText('Q', (A.x + D.x) / 2 + 14, (A.y + D.y) / 2 - 8);
  // X label
  ctx.fillStyle = c.green;
  ctx.fillText('X', (B.x + cx - size * 0.6) / 2 - 14, (B.y + botY) / 2);
  // Y label
  ctx.fillStyle = c.amber;
  ctx.fillText('Y', (D.x + cx + size * 0.6) / 2 + 14, (D.y + botY) / 2);
  
  // Draw resistance box symbols
  drawResistorSymbol(ctx, (A.x + B.x) / 2, (A.y + B.y) / 2, 0.75, c.wire);
  drawResistorSymbol(ctx, (A.x + D.x) / 2, (A.y + D.y) / 2, -0.75, c.wire);
  
  // Battery at top
  ctx.strokeStyle = c.wire;
  ctx.lineWidth = 2;
  drawLine(ctx, A.x - 20, A.y - 30, A.x + 20, A.y - 30);
  drawLine(ctx, A.x, A.y, A.x, A.y - 30);
  
  // Battery symbol
  ctx.lineWidth = 3;
  ctx.strokeStyle = c.red;
  drawLine(ctx, A.x - 10, A.y - 35, A.x - 10, A.y - 25);
  ctx.lineWidth = 2;
  ctx.strokeStyle = c.accent;
  drawLine(ctx, A.x + 10, A.y - 40, A.x + 10, A.y - 20);
  
  ctx.font = 'bold 11px "Outfit"';
  ctx.fillStyle = c.red;
  ctx.textAlign = 'center';
  ctx.fillText('E (Battery)', A.x, A.y - 46);
  
  // Galvanometer at center connected A to wire
  ctx.strokeStyle = c.wire;
  ctx.lineWidth = 1.5;
  drawLine(ctx, A.x, A.y, A.x, cy);
  
  // G circle
  ctx.beginPath();
  ctx.arc(A.x, cy, 14, 0, Math.PI * 2);
  ctx.fillStyle = c.cardBg;
  ctx.fill();
  ctx.strokeStyle = c.purple;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.font = 'bold 12px "Outfit"';
  ctx.fillStyle = c.purple;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G', A.x, cy);
  ctx.textBaseline = 'alphabetic';
  
  // Jockey line from G to wire
  ctx.strokeStyle = c.cyan;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  drawLine(ctx, A.x, cy + 14, A.x, botY - 5);
  ctx.setLineDash([]);
  
  // Jockey indicator
  ctx.beginPath();
  ctx.arc(A.x, botY, 5, 0, Math.PI * 2);
  ctx.fillStyle = c.cyan;
  ctx.fill();
  
  ctx.font = '11px "Outfit"';
  ctx.fillStyle = c.cyan;
  ctx.fillText('Jockey', A.x + 22, botY + 4);
  
  // Node dots
  [A, B, D].forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = c.wire;
    ctx.fill();
  });
  
  // Title
  ctx.font = 'bold 12px "Outfit"';
  ctx.fillStyle = c.text;
  ctx.textAlign = 'left';
  ctx.fillText('Carey Foster Bridge — Circuit Diagram', 16, 22);
}

function drawLine(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawResistorSymbol(ctx, cx, cy, angle, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = 'none';
  
  // Zigzag
  const w = 18;
  const h = 5;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  for (let i = 0; i < 4; i++) {
    const x = -w + (w * 2 / 4) * (i + 0.25);
    ctx.lineTo(x, i % 2 === 0 ? -h : h);
  }
  ctx.lineTo(w, 0);
  ctx.stroke();
  
  ctx.restore();
}

// ── Draw Main Simulation ──
function drawSimulation() {
  if (!simCtx) return;
  const c = getColors();
  const W = simCanvas.width / (window.devicePixelRatio || 1);
  const H = simCanvas.height / (window.devicePixelRatio || 1);
  const ctx = simCtx;
  
  ctx.clearRect(0, 0, W, H);
  
  // Background
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  
  // Grid
  ctx.strokeStyle = c.gridLine;
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  
  const margin = 60;
  const wireStartX = margin;
  const wireEndX = W - margin;
  const wireY = H * 0.55;
  const wireLen = wireEndX - wireStartX;
  
  // ── Draw the bridge board ──
  ctx.fillStyle = isDark() ? 'rgba(40, 30, 20, 0.4)' : 'rgba(180, 150, 120, 0.2)';
  const boardPadding = 20;
  roundRect(ctx, wireStartX - boardPadding, wireY - 70, wireLen + boardPadding * 2, 130, 8);
  ctx.fill();
  ctx.strokeStyle = isDark() ? 'rgba(160, 130, 80, 0.3)' : 'rgba(120, 90, 50, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // ── Copper strips (thick terminals at ends and gaps) ──
  const gapWidth = 16;
  const stripHeight = 14;
  const gapPositions = [
    wireStartX - 10,               // Left end terminal
    wireStartX + wireLen * 0.32,   // Left inner gap (X or Y)
    wireStartX + wireLen * 0.5,    // Center gap (wire connects)
    wireStartX + wireLen * 0.68,   // Right inner gap (Y or X)
    wireEndX + 10,                 // Right end terminal
  ];
  
  // Draw copper strip blocks
  const stripColor = c.copper;
  const stripGlow = isDark() ? 'rgba(212, 149, 107, 0.3)' : 'rgba(184, 115, 51, 0.15)';
  
  // Left terminal block
  ctx.fillStyle = stripColor;
  roundRect(ctx, wireStartX - 14, wireY - stripHeight / 2 - 2, 20, stripHeight + 4, 3);
  ctx.fill();
  
  // Right terminal block
  roundRect(ctx, wireEndX - 6, wireY - stripHeight / 2 - 2, 20, stripHeight + 4, 3);
  ctx.fill();
  
  // ── Bridge wire ──
  ctx.strokeStyle = c.copper;
  ctx.lineWidth = 3;
  ctx.shadowColor = stripGlow;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(wireStartX, wireY);
  ctx.lineTo(wireEndX, wireY);
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // ── Scale markings ──
  ctx.strokeStyle = c.textMuted;
  ctx.lineWidth = 0.7;
  ctx.font = '9px "JetBrains Mono"';
  ctx.fillStyle = c.textMuted;
  ctx.textAlign = 'center';
  
  for (let i = 0; i <= 100; i += 5) {
    const x = wireStartX + (wireLen * i / 100);
    const isMajor = i % 10 === 0;
    ctx.beginPath();
    ctx.moveTo(x, wireY + 8);
    ctx.lineTo(x, wireY + (isMajor ? 20 : 14));
    ctx.stroke();
    
    if (isMajor) {
      ctx.fillText(i.toString(), x, wireY + 32);
    }
  }
  
  ctx.font = '10px "Outfit"';
  ctx.fillText('cm', wireEndX + 20, wireY + 32);
  
  // ── Gap labels and resistance boxes ──
  const gap1X = wireStartX + wireLen * 0.25;
  const gap2X = wireStartX + wireLen * 0.75;
  
  // Determine what's in each gap based on swap state
  let leftLabel, rightLabel, leftColor, rightColor;
  if (state.currentPart === 1) {
    if (!state.swapped) {
      leftLabel = `X = ${state.resistanceX.toFixed(1)} Ω`;
      rightLabel = 'Y = 0 (short)';
      leftColor = c.green;
      rightColor = c.textMuted;
    } else {
      leftLabel = 'Y = 0 (short)';
      rightLabel = `X = ${state.resistanceX.toFixed(1)} Ω`;
      leftColor = c.textMuted;
      rightColor = c.green;
    }
  } else {
    if (!state.swapped) {
      leftLabel = `X = ${state.resistanceX.toFixed(1)} Ω`;
      rightLabel = `Y = ? Ω`;
      leftColor = c.green;
      rightColor = c.amber;
    } else {
      leftLabel = `Y = ? Ω`;
      rightLabel = `X = ${state.resistanceX.toFixed(1)} Ω`;
      leftColor = c.amber;
      rightColor = c.green;
    }
  }
  
  // Left gap box
  drawGapBox(ctx, gap1X, wireY - 55, leftLabel, leftColor, c);
  // Right gap box
  drawGapBox(ctx, gap2X, wireY - 55, rightLabel, rightColor, c);
  
  // Connection lines from gap boxes to wire
  ctx.strokeStyle = c.wire;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  drawLine(ctx, gap1X, wireY - 30, gap1X, wireY - 6);
  drawLine(ctx, gap2X, wireY - 30, gap2X, wireY - 6);
  ctx.setLineDash([]);
  
  // ── Ratio arms P and Q at the ends ──
  drawSmallBox(ctx, wireStartX - 10, wireY - 90, 'P', c.accent, c);
  drawSmallBox(ctx, wireEndX - 20, wireY - 90, 'Q', c.accent, c);
  
  // ── Battery indicator ──
  const battX = W / 2;
  const battY = 30;
  
  ctx.fillStyle = state.batteryOn ? c.green : c.textMuted;
  ctx.font = 'bold 11px "Outfit"';
  ctx.textAlign = 'center';
  ctx.fillText(state.batteryOn ? '🔋 ON' : '🔋 OFF', battX, battY);
  
  if (state.batteryOn) {
    ctx.shadowColor = c.greenGlow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(battX - 28, battY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  // ── Galvanometer (circle) ──
  const galvX = W / 2;
  const galvY = wireY - 105;
  
  ctx.beginPath();
  ctx.arc(galvX, galvY, 18, 0, Math.PI * 2);
  ctx.fillStyle = c.cardBg;
  ctx.fill();
  ctx.strokeStyle = c.purple;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.font = 'bold 13px "Outfit"';
  ctx.fillStyle = c.purple;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G', galvX, galvY);
  ctx.textBaseline = 'alphabetic';
  
  // Connection from G to jockey position
  const jockeyX = wireStartX + (wireLen * state.jockeyPosition / 100);
  
  ctx.strokeStyle = c.purple;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(galvX, galvY + 18);
  ctx.quadraticCurveTo(galvX, wireY - 30, jockeyX, wireY - 15);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // ── Jockey ──
  // Triangle pointer
  ctx.fillStyle = c.cyan;
  ctx.shadowColor = isDark() ? c.accentGlow : 'rgba(6,182,212,0.3)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(jockeyX, wireY - 6);
  ctx.lineTo(jockeyX - 7, wireY - 18);
  ctx.lineTo(jockeyX + 7, wireY - 18);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Jockey handle
  ctx.strokeStyle = c.cyan;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  drawLine(ctx, jockeyX, wireY - 18, jockeyX, wireY - 38);
  ctx.lineCap = 'butt';
  
  // Jockey position label
  ctx.font = 'bold 11px "JetBrains Mono"';
  ctx.fillStyle = c.cyan;
  ctx.textAlign = 'center';
  ctx.fillText(state.jockeyPosition.toFixed(1) + ' cm', jockeyX, wireY - 44);
  
  // ── Balance point indicator (if battery on) ──
  if (state.batteryOn) {
    const balanceL = computeBalancePoint();
    const balanceX = wireStartX + (wireLen * balanceL / 100);
    
    // Subtle balance indicator
    ctx.fillStyle = c.greenGlow;
    ctx.beginPath();
    ctx.arc(balanceX, wireY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // If jockey is very near the balance point, show glow
    if (Math.abs(state.jockeyPosition - balanceL) < 1) {
      ctx.shadowColor = c.greenGlow;
      ctx.shadowBlur = 20;
      ctx.fillStyle = c.green;
      ctx.beginPath();
      ctx.arc(jockeyX, wireY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.font = 'bold 11px "Outfit"';
      ctx.fillStyle = c.green;
      ctx.fillText('✓ NULL POINT', jockeyX, wireY + 50);
    }
  }
  
  // ── Label ──
  ctx.font = '10px "Outfit"';
  ctx.fillStyle = c.textMuted;
  ctx.textAlign = 'left';
  ctx.fillText('Drag jockey on wire or use slider below', margin, H - 12);
  
  // Swap indicator
  if (state.swapped) {
    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.fillStyle = c.amber;
    ctx.textAlign = 'right';
    ctx.fillText('⇄ SWAPPED', W - margin, H - 12);
  }
}

function drawGapBox(ctx, cx, cy, label, color, c) {
  const boxW = 100;
  const boxH = 24;
  
  ctx.fillStyle = isDark() ? 'rgba(20,28,55,0.8)' : 'rgba(255,255,255,0.9)';
  roundRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, 6);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  ctx.font = 'bold 10px "JetBrains Mono"';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
  ctx.textBaseline = 'alphabetic';
}

function drawSmallBox(ctx, x, y, label, color, c) {
  const boxW = 32;
  const boxH = 22;
  
  ctx.fillStyle = isDark() ? 'rgba(20,28,55,0.7)' : 'rgba(255,255,255,0.8)';
  roundRect(ctx, x, y, boxW, boxH, 4);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  ctx.font = 'bold 11px "Outfit"';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + boxW / 2, y + boxH / 2);
  ctx.textBaseline = 'alphabetic';
}

// ── Draw Galvanometer Canvas ──
function drawGalvanometer() {
  if (!galvCtx) return;
  const c = getColors();
  const W = galvCanvas.width / (window.devicePixelRatio || 1);
  const H = galvCanvas.height / (window.devicePixelRatio || 1);
  const ctx = galvCtx;
  
  ctx.clearRect(0, 0, W, H);
  
  // Background
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  
  const cx = W / 2;
  const cy = H * 0.7;
  const radius = Math.min(W, H) * 0.35;
  
  // ── Meter face (semicircle) ──
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = isDark() ? 'rgba(20, 28, 55, 0.6)' : 'rgba(245, 248, 255, 0.8)';
  ctx.fill();
  ctx.strokeStyle = c.purple;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Inner arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 4, Math.PI, 0);
  ctx.strokeStyle = isDark() ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // ── Scale markings ──
  const scaleMin = -50;
  const scaleMax = 50;
  const numMajor = 10;
  
  for (let i = 0; i <= numMajor; i++) {
    const fraction = i / numMajor;
    const angle = Math.PI + fraction * Math.PI;
    const val = scaleMin + (scaleMax - scaleMin) * fraction;
    
    const isMajor = i % 2 === 0;
    const innerR = radius - (isMajor ? 20 : 14);
    const outerR = radius - 6;
    
    const x1 = cx + innerR * Math.cos(angle);
    const y1 = cy + innerR * Math.sin(angle);
    const x2 = cx + outerR * Math.cos(angle);
    const y2 = cy + outerR * Math.sin(angle);
    
    ctx.strokeStyle = c.textMuted;
    ctx.lineWidth = isMajor ? 1.5 : 0.8;
    drawLine(ctx, x1, y1, x2, y2);
    
    if (isMajor) {
      const labelR = radius - 30;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);
      
      ctx.font = '9px "JetBrains Mono"';
      ctx.fillStyle = c.textMuted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val.toFixed(0), lx, ly);
    }
  }
  
  // Zero marker (center top)
  ctx.strokeStyle = c.green;
  ctx.lineWidth = 2;
  const zeroAngle = Math.PI + 0.5 * Math.PI;
  const zx1 = cx + (radius - 24) * Math.cos(zeroAngle);
  const zy1 = cy + (radius - 24) * Math.sin(zeroAngle);
  const zx2 = cx + (radius - 2) * Math.cos(zeroAngle);
  const zy2 = cy + (radius - 2) * Math.sin(zeroAngle);
  drawLine(ctx, zx1, zy1, zx2, zy2);
  
  // ── Needle ──
  const deflection = state.batteryOn ? state.galvDeflection : 0;
  const normalizedDefl = Math.max(-50, Math.min(50, deflection)) / 50;
  const needleAngle = Math.PI + (0.5 + normalizedDefl * 0.45) * Math.PI;
  
  const needleLen = radius - 10;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);
  
  // Needle color based on proximity to zero
  const nearNull = Math.abs(deflection) < 1;
  const needleColor = nearNull ? c.green : c.red;
  const needleGlow = nearNull ? c.greenGlow : c.redGlow;
  
  ctx.strokeStyle = needleColor;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = needleGlow;
  ctx.shadowBlur = 10;
  drawLine(ctx, cx, cy, nx, ny);
  ctx.shadowBlur = 0;
  
  // Center pivot
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = needleColor;
  ctx.fill();
  ctx.strokeStyle = isDark() ? '#1a1e2e' : '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // ── Labels ──
  ctx.font = 'bold 12px "Outfit"';
  ctx.fillStyle = c.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('GALVANOMETER', cx, 24);
  
  ctx.font = '10px "JetBrains Mono"';
  ctx.fillStyle = nearNull && state.batteryOn ? c.green : c.textMuted;
  ctx.fillText(
    state.batteryOn ? `${deflection.toFixed(2)} µA` : 'OFF',
    cx, cy + 26
  );
  
  if (nearNull && state.batteryOn) {
    ctx.font = 'bold 11px "Outfit"';
    ctx.fillStyle = c.green;
    ctx.fillText('✓ BALANCED', cx, cy + 42);
  }
  
  // µA unit
  ctx.font = '9px "Outfit"';
  ctx.fillStyle = c.textMuted;
  ctx.textAlign = 'left';
  ctx.fillText('µA', cx + radius - 10, cy + 6);
  ctx.textAlign = 'right';
  ctx.fillText('µA', cx - radius + 10, cy + 6);
}

// ── Utility: Rounded Rect ──
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Animation Loop (for smooth galvanometer needle) ──
function animateGalvanometer() {
  const diff = state.galvTargetAngle - state.galvNeedleAngle;
  state.galvNeedleAngle += diff * 0.15;
  
  if (Math.abs(diff) > 0.01) {
    drawGalvanometer();
    requestAnimationFrame(animateGalvanometer);
  }
}
