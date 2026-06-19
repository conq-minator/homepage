// ============================================
// FRANK-HERTZ VIRTUAL EXPERIMENT — Standalone JS
// ============================================

(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'frank-hertz-theme';

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function getTheme() {
    return document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
  }

  function setTheme(theme, { persist = true } = {}) {
    const isDark = theme === 'dark';
    document.documentElement.classList.add('theme-transition');
    document.documentElement.classList.toggle('theme-dark', isDark);

    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);

    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    setTheme(getTheme(), { persist: false });

    toggle.addEventListener('click', () => {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  initThemeToggle();

  // --- STATE ---
  let voltage = 0;
  let currentMultiplier = 1e-7;
  let dataPoints = []; // { voltage, current }
  let isRunning = false;
  let sweepInterval = null;

  // --- PHYSICS CONSTANTS ---
  const ARGON_EXCITATION = 11.6; // eV
  const VG1K = 1.5; // V
  const VG2A = 7.5; // V

  // --- DOM REFS ---
  const voltmeterDisplay = document.getElementById('voltmeter-display');
  const ammeterDisplay = document.getElementById('ammeter-display');
  const statusDisplay = document.getElementById('status-display');
  const voltageSlider = document.getElementById('voltage-slider');
  const voltageLabel = document.getElementById('voltage-label');
  const btnSweep = document.getElementById('btn-sweep');
  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');
  const dataTableBody = document.getElementById('data-table-body');
  const obsTableBody = document.getElementById('obs-table-body');

  // Canvases
  const vacuumCanvas = document.getElementById('vacuum-tube-canvas');
  const vacuumCtx = vacuumCanvas.getContext('2d');
  const graphCanvas = document.getElementById('iv-graph-canvas');
  const graphCtx = graphCanvas.getContext('2d');

  // --- PHYSICS: Calculate collector current ---
  function calculateCurrent(v) {
    if (v < VG1K) return 0;

    const effectiveVoltage = v - VG1K;

    // Base current increases smoothly with voltage (power law)
    const baseCurrent = Math.pow(effectiveVoltage / 60, 1.5);

    // Build smooth modulation using Gaussian peaks around excitation energies
    let modulation = 1.0;

    const peakWidth = 1.8;
    const peakDepth = 0.65;

    for (let i = 1; i <= 8; i++) {
      const excitationVoltage = i * ARGON_EXCITATION;
      const distance = effectiveVoltage - excitationVoltage;
      const gaussianPeak = Math.exp(-Math.pow(distance / peakWidth, 2));
      modulation *= (1.0 - peakDepth * gaussianPeak);
    }

    // Cosine modulation for smooth transitions
    const remainder = effectiveVoltage % ARGON_EXCITATION;
    const phase = (remainder / ARGON_EXCITATION) * Math.PI;
    const cosineModulation = 0.5 + 0.5 * Math.cos(phase + Math.PI);

    // Blend
    const blendedModulation = 0.7 * modulation + 0.3 * cosineModulation;

    let current = baseCurrent * blendedModulation;
    return current * currentMultiplier;
  }

  // --- UI UPDATE ---
  function updateDisplays() {
    const currentValue = calculateCurrent(voltage);

    voltmeterDisplay.textContent = voltage.toFixed(2);
    ammeterDisplay.textContent = currentValue.toExponential(2);
    voltageLabel.textContent = voltage.toFixed(1) + ' V';
    voltageSlider.value = voltage;

    // Status indicator
    if (isRunning) {
      statusDisplay.className = 'status-display active';
      statusDisplay.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:pulse 2s ease-in-out infinite"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        <span>SWEEPING</span>
      `;
    } else {
      statusDisplay.className = 'status-display';
      statusDisplay.innerHTML = `
        <div class="status-icon-idle"><div class="dot"></div></div>
        <span>STANDBY</span>
      `;
    }

    // Sweep button
    if (isRunning) {
      btnSweep.disabled = true;
      btnSweep.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        RUNNING
      `;
    } else {
      btnSweep.disabled = false;
      btnSweep.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        AUTO SWEEP
      `;
    }

    voltageSlider.disabled = isRunning;

    // Export button
    btnExport.disabled = dataPoints.length === 0;
  }

  // --- Record data point ---
  function recordDataPoint() {
    const current = calculateCurrent(voltage);
    dataPoints.push({ voltage, current });
    // Keep only last 200 points for performance
    if (dataPoints.length > 200) {
      dataPoints = dataPoints.slice(-200);
    }
    updateDataTable();
    updateObservationTable();
    drawGraph();
  }

  // --- DATA TABLE ---
  function updateDataTable() {
    if (dataPoints.length === 0) {
      dataTableBody.innerHTML = '<div class="empty">NO DATA RECORDED</div>';
      return;
    }

    let html = '';
    // Show most recent first
    for (let i = dataPoints.length - 1; i >= 0; i--) {
      const p = dataPoints[i];
      html += `<div class="data-row">
        <div class="voltage">${p.voltage.toFixed(2)}</div>
        <div class="current">${p.current.toExponential(3)}</div>
      </div>`;
    }
    dataTableBody.innerHTML = html;
  }

  // --- OBSERVATION TABLE (100 rows) ---
  function updateObservationTable() {
    let rows = [];

    if (dataPoints.length > 0) {
      for (let i = 0; i < 100; i++) {
        if (i < dataPoints.length) {
          rows.push({
            rowNumber: i + 1,
            voltage: dataPoints[i].voltage,
            current: dataPoints[i].current,
          });
        } else {
          const lastPoint = dataPoints[dataPoints.length - 1];
          rows.push({
            rowNumber: i + 1,
            voltage: lastPoint.voltage + (i - dataPoints.length + 1) * 0.1,
            current: lastPoint.current,
          });
        }
      }
    } else {
      for (let i = 0; i < 100; i++) {
        const v = (i / 100) * 60;
        const c = v > VG1K ? Math.pow((v - VG1K) / 60, 1.5) * 1e-7 : 0;
        rows.push({
          rowNumber: i + 1,
          voltage: v,
          current: c,
        });
      }
    }

    let html = '';
    for (const row of rows) {
      html += `<div class="obs-row">
        <div class="row-num">${row.rowNumber}</div>
        <div class="row-voltage">${row.voltage.toFixed(3)}</div>
        <div class="row-current">${row.current.toExponential(3)}</div>
      </div>`;
    }
    obsTableBody.innerHTML = html;
  }

  // --- SWEEP ---
  function startSweep() {
    voltage = 0;
    dataPoints = [];
    isRunning = true;
    updateDisplays();
    updateDataTable();

    sweepInterval = setInterval(() => {
      voltage += 0.75;
      if (voltage > 80) {
        voltage = 80;
        isRunning = false;
        clearInterval(sweepInterval);
        sweepInterval = null;
      }
      recordDataPoint();
      updateDisplays();
    }, 50);
  }

  function resetExperiment() {
    if (sweepInterval) {
      clearInterval(sweepInterval);
      sweepInterval = null;
    }
    voltage = 0;
    dataPoints = [];
    isRunning = false;
    updateDisplays();
    updateDataTable();
    updateObservationTable();
    drawGraph();
  }

  // --- EVENT LISTENERS ---
  voltageSlider.addEventListener('input', (e) => {
    if (isRunning) return;
    voltage = parseFloat(e.target.value);
    recordDataPoint();
    updateDisplays();
  });

  document.querySelectorAll('input[name="multiplier"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      currentMultiplier = parseFloat(e.target.value);
      // Recalculate existing data points with new multiplier
      dataPoints = [];
      updateDataTable();
      updateObservationTable();
      drawGraph();
      updateDisplays();
    });
  });

  btnSweep.addEventListener('click', startSweep);
  btnReset.addEventListener('click', resetExperiment);

  btnExport.addEventListener('click', () => {
    if (dataPoints.length === 0) return;
    const csv = ['Voltage (V),Current (A)']
      .concat(dataPoints.map((d) => `${d.voltage.toFixed(2)},${d.current.toExponential(3)}`))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frank_hertz_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // ============================================
  // VACUUM TUBE CANVAS ANIMATION
  // ============================================
  let electrons = [];
  let excitations = [];
  let animFrameVacuum;

  function animateVacuumTube() {
    const width = vacuumCanvas.width;
    const height = vacuumCanvas.height;

    const cathodeX = 50;
    const grid1X = 200;
    const grid2X = 350;
    const collectorX = 500;

    const instrumentBg = cssVar('--meter-background') || '#000000';
    const cathodeColor = cssVar('--accent-magenta') || '#9333ea';
    const gridColor = cssVar('--primary') || '#2563eb';
    const labelColor = cssVar('--instrument-text') || '#e5e7eb';
    const electronColor = cssVar('--canvas-electron') || '#ffffff';
    const excitationColor = cssVar('--canvas-excitation') || '#facc15';

    // Clear canvas
    vacuumCtx.fillStyle = instrumentBg;
    vacuumCtx.fillRect(0, 0, width, height);

    // Cathode
    vacuumCtx.strokeStyle = cathodeColor;
    vacuumCtx.lineWidth = 4;
    vacuumCtx.setLineDash([]);
    vacuumCtx.beginPath();
    vacuumCtx.moveTo(cathodeX, height * 0.3);
    vacuumCtx.lineTo(cathodeX, height * 0.7);
    vacuumCtx.stroke();

    vacuumCtx.fillStyle = labelColor;
    vacuumCtx.font = '12px Inter, sans-serif';
    vacuumCtx.fillText('K', cathodeX - 10, height * 0.8);

    // Grid 1
    vacuumCtx.strokeStyle = gridColor;
    vacuumCtx.lineWidth = 2;
    vacuumCtx.setLineDash([5, 5]);
    vacuumCtx.beginPath();
    vacuumCtx.moveTo(grid1X, height * 0.2);
    vacuumCtx.lineTo(grid1X, height * 0.8);
    vacuumCtx.stroke();
    vacuumCtx.fillText('G1', grid1X - 10, height * 0.85);

    // Grid 2
    vacuumCtx.beginPath();
    vacuumCtx.moveTo(grid2X, height * 0.2);
    vacuumCtx.lineTo(grid2X, height * 0.8);
    vacuumCtx.stroke();
    vacuumCtx.fillText('G2', grid2X - 10, height * 0.85);

    // Collector
    vacuumCtx.setLineDash([]);
    vacuumCtx.fillStyle = cathodeColor;
    vacuumCtx.fillRect(collectorX - 5, height * 0.3, 10, height * 0.4);
    vacuumCtx.fillStyle = labelColor;
    vacuumCtx.fillText('A', collectorX - 5, height * 0.8);

    // Spawn electrons
    if (voltage > 1.5 && Math.random() < 0.1) {
      electrons.push({
        x: cathodeX + 10,
        y: height * 0.3 + Math.random() * (height * 0.4),
        vx: 2 + voltage / 30,
        energy: voltage - 1.5,
        excited: false,
      });
    }

    // Update and draw electrons
    electrons = electrons.filter((electron) => {
      electron.x += electron.vx;

      // Check for excitation near grids
      if (
        (Math.abs(electron.x - grid1X) < 20 || Math.abs(electron.x - grid2X) < 20) &&
        !electron.excited
      ) {
        if (electron.energy >= ARGON_EXCITATION && Math.random() < 0.3) {
          electron.excited = true;
          electron.energy -= ARGON_EXCITATION;
          electron.vx *= 0.5;

          excitations.push({
            x: electron.x,
            y: electron.y,
            life: 20,
          });
        }
      }

      // Draw electron
      vacuumCtx.fillStyle = electron.excited ? excitationColor : electronColor;
      vacuumCtx.beginPath();
      vacuumCtx.arc(electron.x, electron.y, 3, 0, Math.PI * 2);
      vacuumCtx.fill();

      return electron.x < collectorX + 20;
    });

    // Update and draw excitations
    excitations = excitations.filter((exc) => {
      exc.life--;
      const alpha = exc.life / 20;
      vacuumCtx.globalAlpha = alpha;
      vacuumCtx.fillStyle = excitationColor;
      vacuumCtx.beginPath();
      vacuumCtx.arc(exc.x, exc.y, 8, 0, Math.PI * 2);
      vacuumCtx.fill();
      vacuumCtx.globalAlpha = 1;
      return exc.life > 0;
    });

    animFrameVacuum = requestAnimationFrame(animateVacuumTube);
  }

  animateVacuumTube();

  // ============================================
  // I-V GRAPH (Canvas based)
  // ============================================
  function resizeGraphCanvas() {
    const wrapper = graphCanvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    graphCanvas.width = rect.width * dpr;
    graphCanvas.height = rect.height * dpr;
    graphCtx.scale(dpr, dpr);
    graphCanvas.style.width = rect.width + 'px';
    graphCanvas.style.height = rect.height + 'px';
    drawGraph();
  }

  // Catmull-Rom spline interpolation for smooth curves
  function generateSmoothCurve(points) {
    if (points.length < 2) return points;

    const sorted = [...points].sort((a, b) => a.voltage - b.voltage);

    // Extend with phantom points
    const extended = [];
    if (sorted.length > 0) {
      const dx = (sorted[1] ? sorted[1].voltage : sorted[0].voltage + 1) - sorted[0].voltage;
      const dy = (sorted[1] ? sorted[1].current : sorted[0].current) - sorted[0].current;
      extended.push({
        voltage: sorted[0].voltage - dx,
        current: Math.max(0, sorted[0].current - dy),
      });
    }
    extended.push(...sorted);
    if (sorted.length > 1) {
      const n = sorted.length;
      const dx = sorted[n - 1].voltage - sorted[n - 2].voltage;
      const dy = sorted[n - 1].current - sorted[n - 2].current;
      extended.push({
        voltage: sorted[n - 1].voltage + dx,
        current: Math.max(0, sorted[n - 1].current + dy),
      });
    }

    const interpolated = [];
    for (let i = 1; i < extended.length - 2; i++) {
      const p0 = extended[i - 1];
      const p1 = extended[i];
      const p2 = extended[i + 1];
      const p3 = extended[i + 2];

      interpolated.push(p1);

      for (let t = 1; t <= 12; t++) {
        const s = t / 12;
        const s2 = s * s;
        const s3 = s2 * s;

        const q0 = -0.5 * s3 + s2 - 0.5 * s;
        const q1 = 1.5 * s3 - 2.5 * s2 + 1;
        const q2 = -1.5 * s3 + 2 * s2 + 0.5 * s;
        const q3 = 0.5 * s3 - 0.5 * s2;

        const v = q0 * p0.voltage + q1 * p1.voltage + q2 * p2.voltage + q3 * p3.voltage;
        const c = q0 * p0.current + q1 * p1.current + q2 * p2.current + q3 * p3.current;

        interpolated.push({
          voltage: Math.max(0, v),
          current: Math.max(0, c),
        });
      }
    }

    if (sorted.length > 0) {
      interpolated.push(sorted[sorted.length - 1]);
    }

    return interpolated;
  }

  function drawGraph() {
    const dpr = window.devicePixelRatio || 1;
    const width = graphCanvas.width / dpr;
    const height = graphCanvas.height / dpr;

    const canvasBg = cssVar('--graph-canvas-bg') || '#f3f4f6';
    const plotBg = cssVar('--graph-plot-bg') || '#ffffff';
    const gridColor = cssVar('--graph-grid') || '#d1d5db';
    const axisText = cssVar('--foreground') || '#111827';
    const lineColor = cssVar('--graph-line') || '#2563eb';
    const tooltipBg = cssVar('--surface') || '#ffffff';
    const tooltipBorder = cssVar('--border') || '#e5e7eb';

    graphCtx.clearRect(0, 0, width, height);

    // Margins
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    // Background
    graphCtx.fillStyle = canvasBg;
    graphCtx.fillRect(0, 0, width, height);

    graphCtx.fillStyle = plotBg;
    graphCtx.fillRect(margin.left, margin.top, plotW, plotH);

    // Border
    graphCtx.strokeStyle = gridColor;
    graphCtx.lineWidth = 1;
    graphCtx.strokeRect(margin.left, margin.top, plotW, plotH);

    // Grid lines
    graphCtx.strokeStyle = gridColor;
    graphCtx.setLineDash([3, 3]);
    graphCtx.lineWidth = 0.5;

    // X grid (Voltage)
    const xTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80];
    for (const tick of xTicks) {
      const x = margin.left + (tick / 80) * plotW;
      graphCtx.beginPath();
      graphCtx.moveTo(x, margin.top);
      graphCtx.lineTo(x, margin.top + plotH);
      graphCtx.stroke();
    }

    // Determine Y range
    let maxCurrent = 0;
    if (dataPoints.length > 0) {
      maxCurrent = Math.max(...dataPoints.map((d) => d.current));
    }
    if (maxCurrent <= 0) maxCurrent = currentMultiplier;

    // Y grid
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = margin.top + (i / yTicks) * plotH;
      graphCtx.beginPath();
      graphCtx.moveTo(margin.left, y);
      graphCtx.lineTo(margin.left + plotW, y);
      graphCtx.stroke();
    }

    graphCtx.setLineDash([]);

    // Axis labels
    graphCtx.fillStyle = axisText;
    graphCtx.font = '12px Inter, sans-serif';
    graphCtx.textAlign = 'center';

    // X axis tick labels
    for (const tick of xTicks) {
      const x = margin.left + (tick / 80) * plotW;
      graphCtx.fillText(tick.toString(), x, margin.top + plotH + 20);
    }

    // X axis label
    graphCtx.fillText('VG2K (V)', margin.left + plotW - 30, margin.top + plotH + 45);

    // Y axis tick labels
    graphCtx.textAlign = 'right';
    for (let i = 0; i <= yTicks; i++) {
      const val = maxCurrent * (1 - i / yTicks);
      const y = margin.top + (i / yTicks) * plotH;
      graphCtx.fillText(val.toExponential(1), margin.left - 10, y + 4);
    }

    // Y axis label (rotated)
    graphCtx.save();
    graphCtx.translate(15, margin.top + plotH / 2);
    graphCtx.rotate(-Math.PI / 2);
    graphCtx.textAlign = 'center';
    graphCtx.fillText('Collector Current (A)', 0, 0);
    graphCtx.restore();

    // Draw data curve
    if (dataPoints.length > 1) {
      const smoothed = generateSmoothCurve(dataPoints);

      graphCtx.strokeStyle = lineColor;
      graphCtx.lineWidth = 2.5;
      graphCtx.beginPath();

      let started = false;
      for (const pt of smoothed) {
        const x = margin.left + (pt.voltage / 80) * plotW;
        const y = margin.top + plotH - (pt.current / maxCurrent) * plotH;

        if (!started) {
          graphCtx.moveTo(x, y);
          started = true;
        } else {
          graphCtx.lineTo(x, y);
        }
      }
      graphCtx.stroke();

      // Glow effect
      graphCtx.strokeStyle = lineColor;
      graphCtx.globalAlpha = 0.25;
      graphCtx.lineWidth = 6;
      graphCtx.beginPath();
      started = false;
      for (const pt of smoothed) {
        const x = margin.left + (pt.voltage / 80) * plotW;
        const y = margin.top + plotH - (pt.current / maxCurrent) * plotH;
        if (!started) {
          graphCtx.moveTo(x, y);
          started = true;
        } else {
          graphCtx.lineTo(x, y);
        }
      }
      graphCtx.stroke();
      graphCtx.globalAlpha = 1;
    }

    // Tooltip crosshair at current voltage
    if (voltage > 0 && dataPoints.length > 0) {
      const currentVal = calculateCurrent(voltage);
      const cx = margin.left + (voltage / 80) * plotW;
      const cy = margin.top + plotH - (currentVal / maxCurrent) * plotH;

      // Vertical line
      graphCtx.strokeStyle = lineColor;
      graphCtx.globalAlpha = 0.35;
      graphCtx.lineWidth = 1;
      graphCtx.setLineDash([4, 4]);
      graphCtx.beginPath();
      graphCtx.moveTo(cx, margin.top);
      graphCtx.lineTo(cx, margin.top + plotH);
      graphCtx.stroke();
      graphCtx.setLineDash([]);
      graphCtx.globalAlpha = 1;

      // Dot
      graphCtx.fillStyle = lineColor;
      graphCtx.beginPath();
      graphCtx.arc(cx, cy, 5, 0, Math.PI * 2);
      graphCtx.fill();

      // Tooltip box
      const tooltipText = `V: ${voltage.toFixed(1)}V | I: ${currentVal.toExponential(2)}A`;
      graphCtx.font = '11px Inter, sans-serif';
      const textWidth = graphCtx.measureText(tooltipText).width;
      const tooltipX = Math.min(cx + 10, margin.left + plotW - textWidth - 20);
      const tooltipY = Math.max(cy - 30, margin.top + 10);

      graphCtx.fillStyle = tooltipBg;
      graphCtx.strokeStyle = tooltipBorder;
      graphCtx.lineWidth = 1;
      graphCtx.beginPath();
      graphCtx.roundRect(tooltipX - 6, tooltipY - 14, textWidth + 12, 22, 4);
      graphCtx.fill();
      graphCtx.stroke();

      graphCtx.fillStyle = axisText;
      graphCtx.textAlign = 'left';
      graphCtx.fillText(tooltipText, tooltipX, tooltipY);
    }
  }

  window.addEventListener('themechange', drawGraph);

  // --- RESIZE HANDLING ---
  window.addEventListener('resize', resizeGraphCanvas);
  // Initial sizing (delay to ensure layout is done)
  setTimeout(resizeGraphCanvas, 100);

  // ============================================
  // INTERSECTION OBSERVER (Scroll Animations)
  // ============================================
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '-100px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => {
    observer.observe(el);
  });

  // ============================================
  // INITIAL RENDER
  // ============================================
  updateDisplays();
  updateObservationTable();
  drawGraph();

})();
