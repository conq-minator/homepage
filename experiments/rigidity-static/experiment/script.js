// --- PHYSICS LOGIC ---
const MATERIALS = { iron: 70e9, steel: 79e9, copper: 48e9 };

// Standard Least Counts for Virtual Lab Instruments
const LEAST_COUNTS = {
    L: 0.1,    // cm (Meter scale)
    D: 0.01,   // cm (Vernier Caliper)
    d: 0.01,   // mm (Screw Gauge)
    phi: 0.1   // degrees (Circular scale)
};

function calculatePhi(mass, L_cm, D_cm, rod_d_mm, materialKey) {
    const l = L_cm / 100;
    const d_pulley = D_cm / 100;
    const r_rod = (rod_d_mm / 1000) / 2;
    const g = 9.81;
    const eta = MATERIALS[materialKey];
    return (180 * l * d_pulley * g * mass) / (Math.pow(Math.PI, 2) * Math.pow(r_rod, 4) * eta);
}

// --- APP STATE ---
let currentMass = 0;
let tableData = {}; 
let myChart = null;
let currentT1 = 0;
let currentT2 = 0;

// --- THEME TOGGLE LOGIC ---
window.toggleTheme = () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    document.getElementById('theme-btn').innerHTML = isLight ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>' : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    
    // Redraw SVG scales to update text colors
    initBackgroundScales();
    drawPrecisionScales(currentT1, currentT2);

    // Redraw chart if it is currently open
    if (myChart && document.getElementById('modal').style.display === 'flex') {
        showPopupGraph();
    }
    if (typeof MeasurementsHub !== 'undefined') MeasurementsHub.onThemeChange();
};

// --- GENERAL HELP MODAL LOGIC ---
window.openHelpModal = () => document.getElementById('help-modal').style.display = 'flex';
window.closeHelpModal = () => document.getElementById('help-modal').style.display = 'none';

// --- INSTRUMENT HELP MODAL LOGIC ---
window.openInstrumentHelp = (instrument) => {
    const titleEl = document.getElementById('inst-help-title');
    const contentEl = document.getElementById('inst-help-content');
    const closeBtn = '<span style="cursor: pointer; color: var(--text-muted); font-size: 1.2em;" onclick="closeInstrumentHelp()">&times;</span>';

    if (instrument === 'screwGauge') {
        titleEl.innerHTML = `How to read the Screw Gauge ${closeBtn}`;
        contentEl.innerHTML = `
            <ol style="padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 15px;"><strong>Main Scale Reading (MSR):</strong> Look at the horizontal, non-moving cylinder. Find the last visible line right before the edge of the rotating thimble. The top marks are whole millimeters (0, 1, 2, 3...) and the bottom marks are half-millimeters (0.5, 1.5, 2.5...).</li>
                <li style="margin-bottom: 15px;"><strong>Circular Scale Reading (CSR):</strong> Look at the rotating thimble. Find the exact number that perfectly aligns with the long, horizontal reference line on the main scale.</li>
                <li><strong>Final Calculation:</strong> Multiply your CSR by the least count (0.01 mm) and add it to your MSR.<br><br>
                <div style="font-family: monospace; color: var(--accent); background: var(--bg-main); padding: 10px; border-radius: 4px; border: 1px solid var(--border); display: inline-block;">Final = MSR + (CSR &times; 0.01)</div>
                </li>
            </ol>
        `;
    } else if (instrument === 'vernier') {
        titleEl.innerHTML = `How to read the Vernier Caliper ${closeBtn}`;
        contentEl.innerHTML = `
            <ol style="padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 15px;"><strong>Main Scale Reading (MSR):</strong> Locate the <strong>0 (zero) mark</strong> on the bottom sliding scale (the Vernier scale). Look at the top, fixed scale and find the mark exactly to the <em>left</em> of that zero. Read this value in cm.</li>
                <li style="margin-bottom: 15px;"><strong>Vernier Coincidence:</strong> Look closely at the 10 small divisions on the bottom sliding scale. Find the <em>single line</em> that perfectly matches up to form an unbroken straight line with any mark on the top scale. This number (0 to 10) is your coincidence.</li>
                <li><strong>Final Calculation:</strong> Multiply the coincidence by the least count (0.01 cm) and add it to your MSR.<br><br>
                <div style="font-family: monospace; color: var(--accent); background: var(--bg-main); padding: 10px; border-radius: 4px; border: 1px solid var(--border); display: inline-block;">Final = MSR + (Vernier &times; 0.01)</div>
                </li>
            </ol>
        `;
    }
    
    document.getElementById('instrument-help-modal').style.display = 'flex';
};

window.closeInstrumentHelp = () => {
    document.getElementById('instrument-help-modal').style.display = 'none';
};

// --- SMART TUTOR LOGIC ---
window.closeSmartHint = () => {
    const modal = document.getElementById('smart-hint-modal');
    modal.style.opacity = '0'; // Trigger fade out
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = ''; // Reset for next time
    }, 300);
};

window.analyzeAndShowError = (instrument, userMSR, actualMSR, userCSR, actualCSR, userFinal, actualFinal) => {
    let hint = "";
    
    // Convert inputs to numbers for safe comparison
    const uMSR = parseFloat(userMSR);
    const uCSR = parseInt(userCSR);
    const uFinal = parseFloat(userFinal);
    
    // 1. Did they mess up the Main Scale Reading?
    if (uMSR !== actualMSR) {
        if (instrument === 'screwGauge') {
            if (Math.abs(uMSR - actualMSR) === 0.5) {
                hint = "<strong>Your Main Scale Reading is slightly off.</strong><br><br>You are off by exactly 0.5 mm. Check the visual closely: is there a bottom half-millimeter tick mark just barely peeking out from under the rotating thimble?";
            } else {
                hint = "<strong>Your Main Scale Reading (MSR) is incorrect.</strong><br><br>Count the fully visible marks on the stationary cylinder. Remember, the top marks represent full millimeters, and the bottom marks represent half-millimeters.";
            }
        } else if (instrument === 'vernier') {
            hint = "<strong>Your Main Scale Reading (MSR) is incorrect.</strong><br><br>Locate the <strong>0 (zero) mark</strong> on the sliding Vernier scale. Your MSR is the value on the fixed main scale that is immediately to the <em>left</em> of that zero mark.";
        }
    }
    // 2. Did they mess up the Circular/Vernier Coincidence?
    else if (uCSR !== actualCSR) {
        if (instrument === 'screwGauge') {
            hint = "<strong>Good job on the Main Scale! But your Circular Scale Reading (CSR) is off.</strong><br><br>Look at the central horizontal reference line on the main scale. Which number on the rotating thimble aligns perfectly with it?";
        } else if (instrument === 'vernier') {
            hint = "<strong>Main Scale is correct! But your Vernier Coincidence is off.</strong><br><br>Scan carefully along both scales. Find the <em>one specific line</em> on the Vernier scale that forms a perfectly straight, unbroken line with any mark above it on the main scale.";
        }
    }
    // 3. Did they get the readings right, but mess up the math?
    else if (uFinal !== actualFinal) {
        const lc = instrument === 'screwGauge' ? "0.01 mm" : "0.01 cm";
        hint = `<strong>Your individual readings are perfect!</strong> 🎉<br><br>However, your final calculation has a math error. Remember the formula:<br><br><div style="background: var(--bg-main); padding: 10px; margin-top: 10px; border-radius: 6px; text-align: center; font-family: monospace; color: var(--accent);">Final = MSR + (Coincidence &times; ${lc})</div>`;
    }
    // Fallback
    else {
        hint = "Hmm, something isn't quite right. Double-check your numbers!";
    }

    // Inject the tailored hint and show the modal
    document.getElementById('hint-text').innerHTML = hint;
    document.getElementById('smart-hint-modal').style.display = 'flex';
};

function isExperimentUnlocked() {
    return typeof MeasurementSession !== 'undefined' && MeasurementSession.isExperimentUnlocked();
}

window.goToMeasurementsTab = () => {
    const btn = document.querySelector('.tab-btn[onclick*="measurements"]');
    switchTab({ currentTarget: btn }, 'measurements');
};

function showExperimentLockToast() {
    const toast = document.getElementById('experiment-lock-toast');
    if (!toast) return;
    toast.textContent = 'Complete all required measurements before accessing the experiment.';
    toast.classList.add('visible');
    clearTimeout(showExperimentLockToast._timer);
    showExperimentLockToast._timer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

window.unlockExperimentTab = () => {
    const expTab = document.getElementById('experiment-tab-btn');
    const expContent = document.getElementById('experiment');
    const overlay = document.getElementById('experiment-lock-overlay');
    if (expTab) {
        expTab.classList.remove('tab-btn-locked');
        expTab.removeAttribute('title');
    }
    if (expContent) expContent.classList.remove('experiment-locked');
    if (overlay) overlay.style.display = 'none';
    MeasurementSession.applyToExperimentFields();
};

window.switchTab = (evt, tabId) => {
    if (tabId === 'experiment' && !isExperimentUnlocked()) {
        showExperimentLockToast();
        if (evt && evt.currentTarget) evt.currentTarget.classList.remove('active');
        const measurementsBtn = Array.from(document.querySelectorAll('.tab-btn')).find(
            b => b.getAttribute('onclick')?.includes("'measurements'")
        );
        if (measurementsBtn && !document.getElementById('measurements').classList.contains('active')) {
            /* keep current tab active */
        }
        return;
    }

    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');

    if (tabId === 'measurements' && typeof MeasurementsHub !== 'undefined') {
        MeasurementsHub.init();
    }
    if (tabId === 'experiment' && typeof MeasurementsHub !== 'undefined') {
        MeasurementsHub.markExperimentPerformed();
    }
};

function drawPrecisionScales(t1, t2) {
    document.getElementById('pulley-group').style.transform = `rotate(${t2 - t1}deg)`;
    document.getElementById('zoomed-pointer1').style.transform = `rotate(${t1}deg)`;
    document.getElementById('zoomed-pointer2').style.transform = `rotate(${t2}deg)`;

    const weightGroup = document.getElementById('dynamic-weights');
    weightGroup.innerHTML = '';
    const numWeights = currentMass / 0.5;
    document.getElementById('string').setAttribute('y2', 200 + (numWeights * 8));
    for(let i=0; i < numWeights; i++) {
        const w = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        w.setAttribute("x", "190"); w.setAttribute("y", 200 + (i * 8));
        w.setAttribute("width", "30"); w.setAttribute("height", "7");
        w.setAttribute("fill", "var(--svg-pulley)"); weightGroup.appendChild(w);
    }
}

window.updateSim = (mode) => {
    if (!isExperimentUnlocked()) {
        return alert("Complete all required measurements in the Measurements tab before running the experiment.");
    }
    const l_in = document.getElementById('pin-sep').value;
    const d_in = document.getElementById('pulley-d').value;
    const r_in = document.getElementById('rod-d').value;
    if (!l_in || !d_in || !r_in) return alert("Rod and pulley diameters must be obtained from instrument measurements. Complete the Measurements tab first.");
    if (mode === 'rem' && currentMass <= 0) return;

    if (mode === 'add') {
        // Pre-calculate to ensure pointer doesn't overflow scale before applying the mass
        const testPhi = calculatePhi(currentMass + 0.5, parseFloat(l_in), parseFloat(d_in), parseFloat(r_in), document.getElementById('material').value);
        // Scale 2 rotates faster (phi * 1.4). The maximum reading on the visual scale is 50°.
        if (testPhi * 1.4 >= 49) {
            return alert("Cannot add more weight. The pointer will exceed the maximum scale limit (50°). Proceed to plot the graph with current readings.");
        }
        
        // Hard physical limit of hanger
        if (currentMass >= 5.0) {
            return alert("Maximum weight hanger capacity (5.0 kg) reached.");
        }
    }

    currentMass += (mode === 'add' ? 0.5 : -0.5);
    
    // Calculate theoretical phi
    let phi = calculatePhi(currentMass, parseFloat(l_in), parseFloat(d_in), parseFloat(r_in), document.getElementById('material').value);
    
    // Introduce slight, realistic experimental noise (+/- 1%)
    if (currentMass > 0) {
        const errorFactor = 1 + (Math.random() * 0.02 - 0.01); 
        phi = phi * errorFactor;
    }

    currentT1 = phi * 0.4; 
    currentT2 = phi * 1.4; 
    const diff = currentT2 - currentT1;

    if (!tableData[currentMass]) {
        tableData[currentMass] = { inc: {t1:'-', t2:'-', d:'-'}, dec: {t1:'-', t2:'-', d:'-'} };
    }
    
    if (mode === 'add') {
        tableData[currentMass].inc = { t1: currentT1.toFixed(2), t2: currentT2.toFixed(2), d: diff.toFixed(2) };
    } else {
        tableData[currentMass].dec = { t1: currentT1.toFixed(2), t2: currentT2.toFixed(2), d: diff.toFixed(2) };
    }

    document.getElementById('load-display').innerText = currentMass.toFixed(1) + " kg";
    document.getElementById('live-t1').innerText = currentT1.toFixed(2);
    document.getElementById('live-t2').innerText = currentT2.toFixed(2);
    document.getElementById('live-diff').innerText = diff.toFixed(2);
    drawPrecisionScales(currentT1, currentT2);
    renderTable();
};

function renderTable() {
    const tbody = document.querySelector("#obs-table tbody"); tbody.innerHTML = '';
    const sortedMasses = Object.keys(tableData).map(Number).sort((a,b)=>a-b);
    
    sortedMasses.forEach((m, i) => {
        const row = tableData[m];
        let phi_mean = "-";
        if (row.inc.d !== '-' && row.dec.d !== '-') {
            phi_mean = ((parseFloat(row.inc.d) + parseFloat(row.dec.d)) / 2).toFixed(2);
        } else if (row.inc.d !== '-') {
            phi_mean = row.inc.d;
        } else if (row.dec.d !== '-') {
            phi_mean = row.dec.d;
        }

        tbody.innerHTML += `<tr><td>${i+1}</td><td>${m.toFixed(1)}</td><td>${row.inc.t1}</td><td>${row.inc.t2}</td><td>${row.inc.d}</td><td>${row.dec.t1}</td><td>${row.dec.t2}</td><td>${row.dec.d}</td><td><strong>${phi_mean}</strong></td></tr>`;
    });
    if (sortedMasses.length >= 3) document.getElementById('plot-btn').style.display = 'block';
}

window.showPopupGraph = () => {
    if (!isExperimentUnlocked()) {
        return alert("Complete all required measurements before viewing analysis.");
    }
    document.getElementById('modal').style.display = 'flex';
    if (typeof MeasurementsHub !== 'undefined') MeasurementsHub.markGraphGenerated();
    const ctx = document.getElementById('graph-canvas').getContext('2d');
    
    // Dynamically grab CSS colors based on current theme
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-main').trim();
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border').trim();
    
    let sumXY = 0;
    let sumX2 = 0;
    let max_phi_reading = 0;

    const points = Object.keys(tableData).map(Number).sort((a,b)=>a-b).map(m => {
        const row = tableData[m];
        let yVal = 0;
        if (row.inc.d !== '-' && row.dec.d !== '-') yVal = (parseFloat(row.inc.d) + parseFloat(row.dec.d)) / 2;
        else if (row.inc.d !== '-') yVal = parseFloat(row.inc.d);
        else if (row.dec.d !== '-') yVal = parseFloat(row.dec.d);
        
        if (m > 0) {
            sumXY += m * yVal;
            sumX2 += m * m;
            max_phi_reading = Math.max(max_phi_reading, yVal);
        }

        return {x: m, y: yVal};
    });

    const slope = sumX2 === 0 ? 0 : sumXY / sumX2; 
    
    const L_raw = parseFloat(document.getElementById('pin-sep').value);
    const D_raw = parseFloat(document.getElementById('pulley-d').value);
    const d_raw = parseFloat(document.getElementById('rod-d').value);

    const l_m = L_raw / 100;
    const D_m = D_raw / 100;
    const r_m = d_raw / 2000; 
    const g = 9.81;
    
    const eta_exp = (180 * l_m * D_m * g) / (Math.pow(Math.PI, 2) * Math.pow(r_m, 4) * slope);
    
    let identifiedMaterial = "Unknown";
    let minDiff = Infinity;
    for (const [mat, theoretical_eta] of Object.entries(MATERIALS)) {
        let diff = Math.abs(eta_exp - theoretical_eta);
        if (diff < minDiff) {
            minDiff = diff;
            identifiedMaterial = mat;
        }
    }

    const err_frac_L = LEAST_COUNTS.L / L_raw;
    const err_frac_D = LEAST_COUNTS.D / D_raw;
    const err_frac_d = LEAST_COUNTS.d / d_raw;
    const err_frac_phi = LEAST_COUNTS.phi / max_phi_reading;

    const total_frac_error = err_frac_L + err_frac_D + (4 * err_frac_d) + err_frac_phi;

    document.getElementById('res-slope').innerText = slope.toFixed(4);
    
    const eta_dyne = eta_exp * 10;
    document.getElementById('res-eta').innerHTML = (eta_dyne / 1e11).toFixed(2) + " &times; 10<sup>11</sup>";
    document.getElementById('res-mat').innerText = identifiedMaterial;

    document.getElementById('err-L').innerText = err_frac_L.toFixed(4);
    document.getElementById('err-D').innerText = err_frac_D.toFixed(4);
    document.getElementById('err-d').innerText = (4 * err_frac_d).toFixed(4);
    document.getElementById('err-phi').innerText = err_frac_phi.toFixed(4);
    document.getElementById('err-frac').innerText = total_frac_error.toFixed(4);
    document.getElementById('err-pct').innerText = (total_frac_error * 100).toFixed(2);

    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line', 
        data: { 
            datasets: [{
                label: 'Mean Twist φ (°)', 
                data: points, 
                borderColor: '#0EA5E9', 
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                tension: 0.1,
                fill: true
            }] 
        },
        options: { 
            scales: { 
                x: { 
                    type: 'linear', 
                    title: { display: true, text: 'Mass (kg)', color: textColor }, 
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: { 
                    title: { display: true, text: 'Twist φ (°)', color: textColor }, 
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            },
            plugins: { legend: { labels: { color: textColor } } }
        }
    });
};

window.closeModal = () => document.getElementById('modal').style.display = 'none';

function initBackgroundScales() {
    // Dynamic text colors for SVG based on theme
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#fff';
    const mutedColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#8b949e';

    const draw = (id) => {
        const g = document.getElementById(id); g.innerHTML = '';
        for (let i = -10; i <= 50; i++) {
            const isMajor = i % 10 === 0; const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", "0"); line.setAttribute("y1", "-100"); line.setAttribute("x2", "0"); line.setAttribute("y2", isMajor ? "-85" : "-95");
            line.setAttribute("stroke", isMajor ? textColor : mutedColor); line.setAttribute("transform", `rotate(${i})`); g.appendChild(line);
            if (isMajor) {
                const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
                t.setAttribute("y", "-105"); t.setAttribute("text-anchor", "middle"); t.setAttribute("transform", `rotate(${i})`); t.textContent = i; t.setAttribute("fill", textColor); t.setAttribute("font-size", "10"); g.appendChild(t);
            }
        }
    };
    draw('scale-ticks-1'); draw('scale-ticks-2');
}

function preventDimensionTampering() {
    ['rod-d', 'pulley-d'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.readOnly = true;
        el.addEventListener('keydown', e => e.preventDefault());
        el.addEventListener('paste', e => e.preventDefault());
        el.addEventListener('drop', e => e.preventDefault());
    });
}

// --- ZOOM & PAN LOGIC ---
const zoomState = {
    screwGauge: { scale: 1, translateX: 0, translateY: 0, isDragging: false, startX: 0, startY: 0 },
    vernier: { scale: 1, translateX: 0, translateY: 0, isDragging: false, startX: 0, startY: 0 }
};

window.zoomInstrument = (instrument, factor) => {
    const state = zoomState[instrument];
    state.scale *= factor;
    state.scale = Math.max(0.5, Math.min(state.scale, 5));
    applyZoom(instrument);
};

window.resetZoom = (instrument) => {
    const state = zoomState[instrument];
    state.scale = 1;
    state.translateX = 0;
    state.translateY = 0;
    applyZoom(instrument);
};

function applyZoom(instrument) {
    const selector = instrument === 'screwGauge' ? '.sg-svg' : '.vc-svg';
    const svgEl = document.querySelector(selector);
    if (svgEl) {
        const state = zoomState[instrument];
        svgEl.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
    }
}

window.initPanZoom = (instrument) => {
    const wrapperSelector = instrument === 'screwGauge' ? '.sg-instrument-wrap' : '.vc-instrument-wrap';
    const wrapper = document.querySelector(wrapperSelector);
    if (!wrapper || wrapper.dataset.panZoomInit) return;
    wrapper.dataset.panZoomInit = 'true';

    const state = zoomState[instrument];
    
    // Mouse Events
    wrapper.addEventListener('mousedown', (e) => {
        if(e.target.closest('.zoom-toolbar')) return; // ignore toolbar clicks
        state.isDragging = true;
        state.startX = e.clientX - state.translateX;
        state.startY = e.clientY - state.translateY;
        wrapper.style.cursor = 'grabbing';
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!state.isDragging) return;
        state.translateX = e.clientX - state.startX;
        state.translateY = e.clientY - state.startY;
        applyZoom(instrument);
    });
    
    window.addEventListener('mouseup', () => {
        if(state.isDragging) {
            state.isDragging = false;
            wrapper.style.cursor = 'grab';
        }
    });

    // Touch Events for Mobile
    wrapper.addEventListener('touchstart', (e) => {
        if(e.target.closest('.zoom-toolbar')) return;
        if(e.touches.length === 1) {
            state.isDragging = true;
            state.startX = e.touches[0].clientX - state.translateX;
            state.startY = e.touches[0].clientY - state.translateY;
        }
    }, { passive: true });

    wrapper.addEventListener('touchmove', (e) => {
        if (!state.isDragging) return;
        if(e.touches.length === 1) {
            e.preventDefault(); // Prevent page scroll while panning
            state.translateX = e.touches[0].clientX - state.startX;
            state.translateY = e.touches[0].clientY - state.startY;
            applyZoom(instrument);
        }
    }, { passive: false });

    wrapper.addEventListener('touchend', () => {
        if(state.isDragging) {
            state.isDragging = false;
        }
    });
    
    // Mouse Wheel Zoom
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        window.zoomInstrument(instrument, factor);
    }, { passive: false });
};

window.onload = () => {
    if (typeof MeasurementSession !== 'undefined') MeasurementSession.init();
    preventDimensionTampering();
    initBackgroundScales();
    tableData[0] = { inc:{t1:'0.00',t2:'0.00',d:'0.00'}, dec:{t1:'-',t2:'-',d:'-'} };
    renderTable();
};