// Physics Variable Setup
const g = 981.0; // cm/s^2

// These are now dynamic variables modified by the sliders/instruments
let L = 70.0;  // Support length in cm
let b = 2.50;  // Breadth in cm
let d = 0.50;  // Depth in cm

// Constants of materials in CGS units (dyne/cm^2)
const materials = {
    steel: { youngs: 2.0e12, label: "Steel" },
    brass: { youngs: 1.0e12, label: "Brass" }
};

let currentMaterial = 'steel';
let currentMassKG = 0.0; // Dynamic load applied

// Data tracker for the matrix table array records
let loggedData = {
    0.0: { inc: null, dec: null }, 0.5: { inc: null, dec: null },
    1.0: { inc: null, dec: null }, 1.5: { inc: null, dec: null },
    2.0: { inc: null, dec: null }, 2.5: { inc: null, dec: null },
    3.0: { inc: null, dec: null }, 3.5: { inc: null, dec: null }
};

const baseMicroscopeReading = 4.500; 

const canvas = document.getElementById('labCanvas');
const ctx = canvas.getContext('2d');
let myChart = null; 

function getCalculatedDepression(m_kg) {
    let m_g = m_kg * 1000.0;
    let Y = materials[currentMaterial].youngs;
    let depression = (g * Math.pow(L, 3) * m_g) / (4.0 * b * Math.pow(d, 3) * Y);
    return depression; 
}

function updateUI() {
    let l_cm = getCalculatedDepression(currentMassKG);
    let microscopePos = baseMicroscopeReading - l_cm; 

    document.getElementById('readoutMass').innerText = currentMassKG.toFixed(2);
    document.getElementById('readoutMicroscope').innerText = microscopePos.toFixed(3);
    document.getElementById('readoutDeflection').innerText = l_cm.toFixed(3);

    renderSimulation(l_cm);
}

function adjustLoad(step) {
    let target = currentMassKG + step;
    if (target >= 0.0 && target <= 3.5) {
        currentMassKG = target;
        updateUI();
    }
}

function clearParameters() {
    for (let m in loggedData) {
        loggedData[m].inc = null;
        loggedData[m].dec = null;
    }
    updateUI();
    renderTable();
}

function changeMaterial() {
    currentMaterial = document.getElementById('materialSelect').value;
    clearParameters();
}

document.getElementById('breadthSlider').addEventListener('input', function(e) {
    b = parseFloat(e.target.value);
    document.getElementById('valB').innerText = b.toFixed(2);
    clearParameters();
});

document.getElementById('depthSlider').addEventListener('input', function(e) {
    d = parseFloat(e.target.value);
    document.getElementById('valD').innerText = d.toFixed(2);
    clearParameters();
});

document.getElementById('spanSlider').addEventListener('input', function(e) {
    L = parseFloat(e.target.value);
    document.getElementById('valL').innerText = L.toFixed(1);
    clearParameters();
});

// --- Config Locking Functions & Measurement Trigger ---
function commitConfig() {
    document.getElementById('materialSelect').disabled = true;
    document.getElementById('breadthSlider').disabled = true;
    document.getElementById('depthSlider').disabled = true;
    document.getElementById('spanSlider').disabled = true;
    
    document.getElementById('commitConfigBtn').disabled = true;
    document.getElementById('editConfigBtn').disabled = false;
    
    if(window.MeasurementSession) {
        // Generate values for both instruments based on the locked variables 'b' and 'd'
        window.MeasurementSession.generateScrewReadings(d);
        window.MeasurementSession.generateVernierReadings(b);
        
        if (window.ScrewGaugeTool) {
            window.ScrewGaugeTool.mount('sg-container-slot', function() {});
        }
        if (window.VernierCaliperTool) {
            window.VernierCaliperTool.mount('vc-container-slot', function() {});
        }
    }
}

function editConfig() {
    document.getElementById('materialSelect').disabled = false;
    document.getElementById('breadthSlider').disabled = false;
    document.getElementById('depthSlider').disabled = false;
    document.getElementById('spanSlider').disabled = false;
    
    document.getElementById('commitConfigBtn').disabled = false;
    document.getElementById('editConfigBtn').disabled = true;
    
    const fallbackHTML = `
        <div style="padding: 20px; text-align:center; background: var(--muted-bg); border-radius:8px; border: 1px solid var(--border);">
            <em>Awaiting Specimen...<br>Please configure and lock the Bar Dimensions in the main workspace first.</em>
        </div>`;
    document.getElementById('sg-container-slot').innerHTML = fallbackHTML;
    document.getElementById('vc-container-slot').innerHTML = fallbackHTML;
}

function logData(direction) {
    let l_cm = getCalculatedDepression(currentMassKG);
    let microscopePos = baseMicroscopeReading - l_cm;

    if (direction === 'increasing') {
        loggedData[currentMassKG].inc = microscopePos;
    } else {
        loggedData[currentMassKG].dec = microscopePos;
    }
    renderTable();
}

function splitReading(totalVal) {
    if (totalVal === null || isNaN(totalVal)) return { main: '-', vernier: '-', total: '-' };
    let mainScale = Math.floor(totalVal / 0.05) * 0.05;
    let remainder = totalVal - mainScale;
    let vernierDivisions = Math.round(remainder / 0.001);
    if (vernierDivisions >= 50) { vernierDivisions = 0; mainScale += 0.05; }
    let vernierScale = (vernierDivisions * 0.001);
    return { main: mainScale.toFixed(3), vernier: vernierScale.toFixed(3), total: totalVal.toFixed(3) };
}

function renderTable() {
    const tbody = document.querySelector('#observationTable tbody');
    tbody.innerHTML = '';
    let index = 1;
    let targetMasses = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
    
    targetMasses.forEach(m => {
        let rowData = loggedData[m];
        let incSplit = splitReading(rowData.inc);
        let decSplit = splitReading(rowData.dec);
        let meanStr = '-'; let depressionStr = '-';
        
        if (rowData.inc !== null && rowData.dec !== null) {
            let mean = (rowData.inc + rowData.dec) / 2;
            meanStr = mean.toFixed(3);
            let zeroMean = baseMicroscopeReading; 
            if(loggedData[0.0].inc !== null && loggedData[0.0].dec !== null) zeroMean = (loggedData[0.0].inc + loggedData[0.0].dec) / 2;
            depressionStr = Math.abs(zeroMean - mean).toFixed(3);
        }

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index++}</td><td><b>${m.toFixed(1)}</b></td>
            <td>${incSplit.main}</td><td>${incSplit.vernier}</td><td style="font-weight:600;">${incSplit.total}</td>
            <td>${decSplit.main}</td><td>${decSplit.vernier}</td><td style="font-weight:600;">${decSplit.total}</td>
            <td>${meanStr}</td><td style="color:var(--secondary); font-weight:bold;">${depressionStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

function resetExperiment() { currentMassKG = 0.0; clearParameters(); }

function renderSimulation(depression) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleFactor = 45.0; 
    let visualDepression = depression * scaleFactor;

    ctx.strokeStyle = "#f0f0f0"; ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
    for(let j=0; j<canvas.height; j+=40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke(); }

    ctx.fillStyle = "#4a5568";
    ctx.fillRect(50, 300, 700, 25); ctx.fillRect(100, 325, 60, 55); ctx.fillRect(640, 325, 60, 55);

    let visualSpan = L * (440.0 / 70.0); 
    let leftX = 400 - (visualSpan / 2); let rightX = 400 + (visualSpan / 2); let midX = 400; let neutralY = 200; 

    ctx.fillStyle = "#718096";
    ctx.beginPath(); ctx.moveTo(leftX - 15, 300); ctx.lineTo(leftX + 15, 300); ctx.lineTo(leftX, neutralY); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(rightX - 15, 300); ctx.lineTo(rightX + 15, 300); ctx.lineTo(rightX, neutralY); ctx.closePath(); ctx.fill();

    ctx.strokeStyle = currentMaterial === 'steel' ? "#718096" : "#ecc94b";
    ctx.lineWidth = Math.max(4, d * 24); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(100, neutralY); ctx.quadraticCurveTo(midX, neutralY + (visualDepression * 2), 700, neutralY); ctx.stroke();

    let centerBarY = neutralY + visualDepression;
    ctx.strokeStyle = "#1a202c"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(midX, centerBarY + 12 + (d * 10), 8, 0, Math.PI * 2); ctx.moveTo(midX, centerBarY + 20 + (d * 10)); ctx.lineTo(midX, centerBarY + 100); ctx.stroke();

    let numWeights = Math.floor(currentMassKG / 0.5);
    let startWeightY = centerBarY + 90;
    for(let w=0; w<numWeights; w++) {
        ctx.fillStyle = w % 2 === 0 ? "#3b82f6" : "#1d4ed8";
        ctx.fillRect(midX - 30, startWeightY - (w * 12), 60, 10); ctx.clearRect(midX - 4, startWeightY - (w * 12) - 1, 8, 12);
    }

    ctx.strokeStyle = "rgba(229, 62, 62, 0.8)"; ctx.lineWidth = 1.5; let scopeTargetY = neutralY + visualDepression;
    ctx.beginPath(); ctx.arc(midX, scopeTargetY, 18, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX - 30, scopeTargetY); ctx.lineTo(midX + 30, scopeTargetY); ctx.moveTo(midX, scopeTargetY - 30); ctx.lineTo(midX, scopeTargetY + 30); ctx.stroke();

    ctx.fillStyle = varText = "#1a365d"; ctx.font = "bold 12px sans-serif";
    ctx.fillText("N1", leftX - 10, 315); ctx.fillText("N2", rightX - 10, 315); ctx.fillText(`Specimen Bar (${materials[currentMaterial].label})`, 110, 175);
    ctx.fillStyle = "#e53e3e"; ctx.fillText("Microscope Target", midX + 35, scopeTargetY + 4);
}

updateUI(); renderTable();

function toggleTheme() {
    const htmlElement = document.documentElement;
    if (document.getElementById('theme-checkbox').checked) { htmlElement.setAttribute('data-theme', 'dark'); } 
    else { htmlElement.removeAttribute('data-theme'); }
}

function toggleFolderMenu(event) {
    document.getElementById('folderMenuWrapper').classList.toggle('open');
    event.stopPropagation();
}

document.addEventListener('click', function(event) {
    const menu = document.getElementById('folderMenuWrapper');
    if (menu && menu.classList.contains('open') && !menu.contains(event.target)) { menu.classList.remove('open'); }
});

function openSidebar(sidebarId) {
    document.getElementById('folderMenuWrapper').classList.remove('open');
    closeAllSidebars();
    setTimeout(() => { document.getElementById(sidebarId).classList.add('open'); document.getElementById('sidebarOverlay').classList.add('show'); }, 50);
}

function closeAllSidebars() {

    const sidebars = [
        'theorySidebar',
        'procedureSidebar',
        'apparatusSidebar',
        'errorSidebar',
        'vernierSidebar',
        'screwGaugeSidebar',
        'resultSidebar'
    ];

    sidebars.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.remove('open');
    });

    document.getElementById('sidebarOverlay').classList.remove('show');
}

function calculateSlope(xValues, yValues) {
    let n = xValues.length; if (n < 2) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) { sumX += xValues[i]; sumY += yValues[i]; sumXY += xValues[i] * yValues[i]; sumX2 += xValues[i] * xValues[i]; }
    return ((n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX));
}

function openGraphModal() {
    let labels = []; let dataPoints = []; let xValues = []; let targetMasses = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
    let zeroMean = baseMicroscopeReading;
    if (loggedData[0.0].inc !== null && loggedData[0.0].dec !== null) zeroMean = (loggedData[0.0].inc + loggedData[0.0].dec) / 2;
    targetMasses.forEach(m => {
        let rowData = loggedData[m];
        if (rowData.inc !== null && rowData.dec !== null) {
            let mean = (rowData.inc + rowData.dec) / 2; let depression = Math.abs(zeroMean - mean);
            labels.push(m.toFixed(1)); dataPoints.push(depression); xValues.push(m);
        }
    });

    if (dataPoints.length === 0) { alert("Graph requires data. Please log at least one complete observation."); return; }

    const slope = calculateSlope(xValues, dataPoints);
    document.getElementById('slopeValue').innerText = slope.toFixed(6);

    let bestFitLine = []; for (let i = 0; i < xValues.length; i++) { bestFitLine.push(slope * xValues[i]); }

    document.getElementById('graphModal').classList.add('show');
    const ctxChart = document.getElementById('graphCanvas').getContext('2d');
    if (myChart) { myChart.destroy(); }

    const customCanvasBackgroundColor = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
            const { ctx } = chart; ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = options.color || '#ffffff'; ctx.fillRect(0, 0, chart.width, chart.height); ctx.restore();
        }
    };

    myChart = new Chart(ctxChart, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Observed Depression', data: dataPoints, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 3, pointBackgroundColor: '#1e3a8a', pointRadius: 6, pointHoverRadius: 8, fill: false, tension: 0.1 },
                { label: 'Best Fit Line', data: bestFitLine, borderColor: '#ef4444', borderWidth: 2, pointRadius: 0, fill: false, tension: 0 }
            ]
        },
        options: {
            responsive: true,
            scales: { x: { title: { display: true, text: 'Total Load m (kg)', font: { size: 14, weight: 'bold' }, color: '#111827' }, ticks: { color: '#111827' } }, y: { title: { display: true, text: 'Depression l (cm)', font: { size: 14, weight: 'bold' }, color: '#111827' }, ticks: { color: '#111827' } } },
            plugins: { legend: { labels: { color: '#111827', font: { size: 14 } } }, customCanvasBackgroundColor: { color: 'white' } }
        },
        plugins: [customCanvasBackgroundColor]
    });
}

function closeGraphModal(event) {
    if (event) { if(event.target.id === 'graphModal') document.getElementById('graphModal').classList.remove('show'); } 
    else { document.getElementById('graphModal').classList.remove('show'); }
}

function downloadGraph() { const link = document.createElement('a'); link.download = 'Youngs_Modulus_Graph.png'; link.href = document.getElementById('graphCanvas').toDataURL('image/png'); link.click(); }

function calculateError() {
    let deltaL = parseFloat(document.getElementById('deltaL').value); let deltaB = parseFloat(document.getElementById('deltaB').value); let deltaD = parseFloat(document.getElementById('deltaD').value); let deltaSmallL = parseFloat(document.getElementById('deltaLsmall').value);
    let l = getCalculatedDepression(currentMassKG);

    document.getElementById('currentL').innerText = L.toFixed(2); document.getElementById('currentB').innerText = b.toFixed(3); document.getElementById('currentD').innerText = d.toFixed(3); document.getElementById('currentDepression').innerText = l.toFixed(4);

    if (l <= 0) { document.getElementById('errorResult').innerHTML = "<b>Please apply a load first.</b>"; return; }
    let fractionalError = (3 * deltaL / L) + (deltaB / b) + (3 * deltaD / d) + (deltaSmallL / l);
    document.getElementById('errorResult').innerHTML = `<b>Maximum Fractional Error</b><br>${(fractionalError).toFixed(5)}<br><br><b>Maximum Percentage Error</b><br>${(fractionalError * 100).toFixed(2)} %`;
}

function downloadDataset() {
    let csvContent = "No. of Obs.,Load (kg),Increasing Main Scale (cm),Increasing Vernier Scale (cm),Increasing Total (cm),Decreasing Main Scale (cm),Decreasing Vernier Scale (cm),Decreasing Total (cm),Mean Reading (cm),Depression l (cm)\n";
    let index = 1; let targetMasses = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
    let zeroMean = baseMicroscopeReading; 
    if (loggedData[0.0].inc !== null && loggedData[0.0].dec !== null) { zeroMean = (loggedData[0.0].inc + loggedData[0.0].dec) / 2; }
    targetMasses.forEach(m => {
        let rowData = loggedData[m]; let incSplit = splitReading(rowData.inc); let decSplit = splitReading(rowData.dec);
        let meanStr = '-'; let depressionStr = '-';
        if (rowData.inc !== null && rowData.dec !== null) { let mean = (rowData.inc + rowData.dec) / 2; meanStr = mean.toFixed(3); depressionStr = Math.abs(zeroMean - mean).toFixed(3); }
        csvContent += `${index},${m.toFixed(1)},${incSplit.main},${incSplit.vernier},${incSplit.total},${decSplit.main},${decSplit.vernier},${decSplit.total},${meanStr},${depressionStr}\n`; index++;
    });
    const link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }))); link.setAttribute("download", "Youngs_Modulus_Flexure_Dataset.csv"); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}


/* =========================================================================================
   INSTRUMENTS EMBEDDED LOGIC (Screw Gauge & Vernier Calipers)
   ========================================================================================= */
window.openInstrumentHelp = function(toolName) {
    if(toolName === 'screwGauge') alert("How to Read:\n1. Note the Main Scale Reading (MSR) visible just before the thimble.\n2. Note the Circular Scale line (CSR) aligning with the reference line.\n3. Final = MSR + (CSR × 0.01) mm");
    if(toolName === 'vernierCaliper') alert("How to Read:\n1. Note the Main Scale Reading (MSR) just before the vernier zero.\n2. Note the Vernier division line that perfectly aligns with any main scale line.\n3. Final = MSR + (Vernier × 0.01) cm");
};

window.analyzeAndShowError = function(tool, msrIn, msrExp, vsrIn, vsrExp, finalIn, finalExp) {
    const selector = tool === 'screwGauge' ? '[data-sg-error]' : '[data-vc-error]';
    const errEl = document.querySelector(selector);
    const varName = tool === 'screwGauge' ? 'CSR' : 'Vernier';
    const unit = tool === 'screwGauge' ? 'mm' : 'cm';
    if(errEl) errEl.innerHTML = `Incorrect. Expected MSR: ${msrExp}, ${varName}: ${vsrExp}, Final: ${finalExp.toFixed(2)} ${unit}`;
};

window.MeasurementSession = {
    state: {
        screwGauge: { completed: false, currentIndex: 0, readings: [], studentFinals: [] },
        vernier: { completed: false, currentIndex: 0, readings: [], studentFinals: [] }
    },
    getState() { return this.state; },
    
    finalToScrewScale(val) {
        val = Math.round(val * 100) / 100;
        let msr = Math.floor(val); let remainder = val - msr; let csr = Math.round(remainder / 0.01);
        if (csr >= 100) { csr -= 100; msr += 1; }
        return { msr, csr, final: msr + csr * 0.01 };
    },
    
    finalToVernierScale(val) {
        val = Math.round(val * 100) / 100;
        let msr = Math.floor(val * 10) / 10; let remainder = val - msr; let vernier = Math.round(remainder / 0.01);
        if (vernier >= 10) { vernier -= 10; msr += 0.1; }
        return { msr, vernier, final: msr + vernier * 0.01 };
    },

    generateScrewReadings(baseDepthCm) {
        let baseMm = baseDepthCm * 10;
        this.state.screwGauge.readings = []; this.state.screwGauge.studentFinals = []; this.state.screwGauge.currentIndex = 0; this.state.screwGauge.completed = false;
        this.state.screwGauge.readings.push(this.finalToScrewScale(baseMm));
        for(let i = 1; i < 4; i++) {
            let randomVariation = (Math.floor(Math.random() * 5) - 2) * 0.01; 
            let val = Math.max(0, baseMm + randomVariation);
            this.state.screwGauge.readings.push(this.finalToScrewScale(val));
        }
    },
    
    generateVernierReadings(baseBreadthCm) {
        this.state.vernier.readings = []; this.state.vernier.studentFinals = []; this.state.vernier.currentIndex = 0; this.state.vernier.completed = false;
        this.state.vernier.readings.push(this.finalToVernierScale(baseBreadthCm));
        for(let i = 1; i < 4; i++) {
            let randomVariation = (Math.floor(Math.random() * 5) - 2) * 0.01; 
            let val = Math.max(0, baseBreadthCm + randomVariation);
            this.state.vernier.readings.push(this.finalToVernierScale(val));
        }
    }
};

/* --- Screw Gauge Tool --- */
(function (global) {
    function approxEqual(a, b, tol = 0.005) { return Math.abs(parseFloat(a) - parseFloat(b)) <= tol; }
    let currentAnimationId = null;

    function drawScrewGaugeSVG(svg, displayReading) {
        const { msr, csr, final } = displayReading;
        const colors = { metalBody: '#CBD5E1', metalDark: '#94A3B8', metalHighlight: '#F8FAFC', markings: '#0F172A', refLine: '#0F172A' };
        const pxPerMm = 45; const sleeveStartX = 30; const sleeveWidth = 3500; const centerY = 135; const refLineY = centerY; 
        const thimbleEdgeX = sleeveStartX + final * pxPerMm; const thimbleWidth = 2500; const thimbleHeight = 76; const bevelWidth = 16;
        let html = `<defs><linearGradient id="sleeveGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${colors.metalDark}"/><stop offset="25%" stop-color="${colors.metalHighlight}"/><stop offset="75%" stop-color="${colors.metalBody}"/><stop offset="100%" stop-color="${colors.metalDark}"/></linearGradient><linearGradient id="thimbleGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${colors.metalDark}"/><stop offset="18%" stop-color="${colors.metalHighlight}"/><stop offset="50%" stop-color="${colors.metalBody}"/><stop offset="82%" stop-color="${colors.metalHighlight}"/><stop offset="100%" stop-color="${colors.metalDark}"/></linearGradient></defs>`;
        html += `<rect x="${sleeveStartX - 20}" y="${centerY - 22}" width="${sleeveWidth}" height="44" fill="url(#sleeveGrad)" stroke="${colors.metalDark}" stroke-width="0.5" rx="2"/>`;
        html += `<line x1="${sleeveStartX - 20}" y1="${refLineY}" x2="${sleeveStartX + sleeveWidth}" y2="${refLineY}" stroke="${colors.refLine}" stroke-width="1.5"/>`;
        for (let mm = 0; mm <= 25; mm++) {
            const x = sleeveStartX + mm * pxPerMm;
            html += `<line x1="${x}" y1="${refLineY}" x2="${x}" y2="${refLineY - 14}" stroke="${colors.markings}" stroke-width="1.2"/>`;
            if (mm <= 10 || mm % 5 === 0) html += `<text x="${x}" y="${refLineY - 17}" text-anchor="middle" fill="${colors.markings}" font-size="11" font-weight="bold" font-family="monospace">${mm}</text>`;
            if (mm < 25) html += `<line x1="${x + pxPerMm / 2}" y1="${refLineY}" x2="${x + pxPerMm / 2}" y2="${refLineY + 10}" stroke="${colors.markings}" stroke-width="1"/>`;
        }
        const tX = thimbleEdgeX; const tTopY = centerY - thimbleHeight / 2;
        html += `<rect x="${tX + 3}" y="${tTopY + 3}" width="${thimbleWidth}" height="${thimbleHeight}" fill="black" opacity="0.08" rx="3"/>`;
        html += `<path d="M ${tX} ${refLineY - 28} L ${tX + bevelWidth} ${tTopY} L ${tX + thimbleWidth} ${tTopY} L ${tX + thimbleWidth} ${tTopY + thimbleHeight} L ${tX + bevelWidth} ${tTopY + thimbleHeight} L ${tX} ${refLineY + 28} Z" fill="url(#thimbleGrad)" stroke="${colors.metalDark}" stroke-width="0.5"/>`;
        for (let dOffset = -12; dOffset <= 12; dOffset++) {
            const d = (csr + dOffset + 100) % 100; const angle = (dOffset / 100) * 2 * Math.PI;
            if (Math.abs(angle) > Math.PI / 2) continue;
            const yPos = refLineY + (thimbleHeight / 2 - 6) * Math.sin(angle); const opacity = Math.cos(angle);
            if (opacity < 0.15) continue; const isMajor = d % 5 === 0; const isCoinc = dOffset === 0;
            html += `<line x1="${tX}" y1="${yPos}" x2="${tX + (isMajor ? 12 : 5)}" y2="${yPos}" stroke="${colors.markings}" stroke-width="${isCoinc ? 2 : isMajor ? 1 : 0.7}" stroke-opacity="${opacity.toFixed(2)}"/>`;
            if (isMajor) html += `<text x="${tX + 16}" y="${yPos + 3}" fill="${colors.markings}" font-size="9" font-weight="${isCoinc ? 'bold' : 'normal'}" font-family="monospace" fill-opacity="${opacity.toFixed(2)}">${d}</text>`;
        }
        for (let gx = tX + 40; gx < tX + thimbleWidth - 8; gx += 4) { html += `<line x1="${gx}" y1="${tTopY + 4}" x2="${gx}" y2="${tTopY + thimbleHeight - 4}" stroke="${colors.metalDark}" stroke-width="0.8" stroke-opacity="0.25"/>`; }
        html += `<text x="260" y="230" text-anchor="middle" fill="#94A3B8" font-size="10" font-style="italic">Pitch 1 mm · LC 0.01 mm · Circular Scale: 100 divisions</text>`;
        svg.innerHTML = html;
    }

    const ScrewGaugeTool = {
        container: null, root: null, displayReading: null,
        mount(containerId) {
            this.container = document.getElementById(containerId);
            const tpl = document.getElementById('screw-gauge-template');
            this.container.innerHTML = ''; this.container.appendChild(tpl.content.cloneNode(true));
            this.root = this.container.querySelector('#screw-gauge-root');
            this.bindEvents(); this.initDisplay();
        },
        initDisplay() { const sg = window.MeasurementSession.getState().screwGauge; this.displayReading = { ...sg.readings[sg.currentIndex] }; this.render(); },
        bindEvents() {
            this.root.querySelector('[data-sg-next]')?.addEventListener('click', () => this.advanceReading());
            this.root.querySelector('[data-sg-submit]')?.addEventListener('click', () => this.validateInputs());
        },
        animateTo(targetReading) {
            if (currentAnimationId) cancelAnimationFrame(currentAnimationId);
            const start = { ...this.displayReading }; const startTime = performance.now();
            const step = (now) => {
                const progress = Math.min((now - startTime) / 600, 1); const ease = 1 - Math.pow(1 - progress, 3);
                this.displayReading.final = start.final + (targetReading.final - start.final) * ease;
                const current = window.MeasurementSession.finalToScrewScale(this.displayReading.final);
                this.displayReading.msr = current.msr; this.displayReading.csr = current.csr;
                drawScrewGaugeSVG(this.root.querySelector('[data-sg-svg]'), this.displayReading);
                if (progress < 1) currentAnimationId = requestAnimationFrame(step); 
                else { this.displayReading = { ...targetReading }; this.render(); }
            };
            currentAnimationId = requestAnimationFrame(step);
        },
        render() {
            const sg = window.MeasurementSession.getState().screwGauge;
            if (sg.completed) { this.showComplete(); return; }
            const idx = sg.currentIndex; const reading = sg.readings[idx];
            this.root.querySelector('[data-sg-badge]').textContent = `Reading ${idx + 1} of 4`;
            drawScrewGaugeSVG(this.root.querySelector('[data-sg-svg]'), this.displayReading);
            
            let historyEl = this.root.querySelector('.sg-history');
            if (!historyEl) { historyEl = document.createElement('div'); historyEl.className = 'sg-history'; this.root.appendChild(historyEl); }
            let histHtml = '<h4>Measurement History</h4><div class="sg-history-list">';
            sg.studentFinals.forEach((val, i) => { histHtml += `<div class="sg-history-item ${sg.currentIndex === i ? 'active' : ''}"><span>Reading ${i + 1}:</span> <strong>${val.toFixed(2)} mm</strong></div>`; });
            if (sg.studentFinals.length === 0) histHtml += '<p style="font-size:0.85em;color:var(--sub-text);">No readings taken yet.</p>';
            historyEl.innerHTML = histHtml + '</div>';

            const mode = idx === 0 ? 'full' : idx === 1 ? 'partial' : 'independent';
            let guide = '';
            if (mode === 'full') guide = `<strong>Reading ${idx + 1} — Fully Guided</strong><p>Formula: Final = MSR + (CSR × 0.01) mm</p><div class="sg-answer-reveal">MSR = ${reading.msr.toFixed(1)} mm | CSR = ${reading.csr} | Final = <strong>${reading.final.toFixed(2)} mm</strong></div>`;
            else if (mode === 'partial') guide = `<strong>Reading ${idx + 1} — Partially Guided</strong><p>Hint: Final = MSR + (CSR × 0.01) mm</p>`;
            else guide = `<strong>Reading ${index + 1} — Independent</strong>`;
            this.root.querySelector('[data-sg-guide]').innerHTML = guide;

            const inSec = this.root.querySelector('[data-sg-inputs]'); const nxtBtn = this.root.querySelector('[data-sg-next]');
            if (idx === 0) { inSec.style.display = 'none'; nxtBtn.style.display = 'inline-block'; nxtBtn.textContent = 'Next Reading'; } 
            else { inSec.style.display = 'block'; nxtBtn.style.display = 'none'; this.root.querySelector('[data-sg-msr]').value = ''; this.root.querySelector('[data-sg-csr]').value = ''; this.root.querySelector('[data-sg-final]').value = ''; }
        },
        validateInputs() {
            const sg = window.MeasurementSession.getState().screwGauge; const idx = sg.currentIndex; const exp = sg.readings[idx];
            const msrIn = parseFloat(this.root.querySelector('[data-sg-msr]').value); const csrIn = parseInt(this.root.querySelector('[data-sg-csr]').value, 10); const finalIn = parseFloat(this.root.querySelector('[data-sg-final]').value);
            if (isNaN(msrIn) || isNaN(csrIn) || isNaN(finalIn)) return;
            if (!approxEqual(msrIn, exp.msr, 0.05) || csrIn !== exp.csr || !approxEqual(finalIn, exp.final, 0.01)) {
                window.analyzeAndShowError('screwGauge', msrIn, exp.msr, csrIn, exp.csr, finalIn, exp.final); return;
            }
            this.root.querySelector('[data-sg-error]').textContent = ''; sg.studentFinals.push(exp.final); this.advanceReading();
        },
        advanceReading() {
            const sg = window.MeasurementSession.getState().screwGauge;
            if (sg.currentIndex === 0) sg.studentFinals.push(sg.readings[0].final);
            if (sg.currentIndex >= 3) { sg.completed = true; sg.currentIndex = 4; this.showComplete(); return; }
            sg.currentIndex += 1; this.animateTo(sg.readings[sg.currentIndex]);
        },
        showComplete() {
            const sg = window.MeasurementSession.getState().screwGauge;
            const avg = sg.studentFinals.reduce((a, b) => a + b, 0) / sg.studentFinals.length;
            
            // Overwrite global depth 'd' with measured average (convert mm to cm)
            d = avg / 10.0;
            document.getElementById('valD').innerText = d.toFixed(3);
            updateUI(); renderTable();

            this.root.innerHTML = `<div class="sg-complete-banner"><strong>✓ Screw Gauge Completed</strong><p style="margin:8px 0 0;color:var(--sub-text);">Four readings recorded. Average measured depth: <strong style="color:var(--secondary)">${avg.toFixed(2)} mm</strong></p></div>`;
        }
    };
    global.ScrewGaugeTool = ScrewGaugeTool;
})(window);
function calculateYoungsModulus() {

    let maxLoad = 0;
    let depression = 0;

    const masses = [0.0,0.5,1.0,1.5,2.0,2.5,3.0,3.5];

    let zeroMean = baseMicroscopeReading;

    if (
        loggedData[0.0].inc !== null &&
        loggedData[0.0].dec !== null
    ) {
        zeroMean =
            (loggedData[0.0].inc + loggedData[0.0].dec) / 2;
    }

    masses.forEach(m => {

        const row = loggedData[m];

        if(row.inc !== null && row.dec !== null){

            const mean =
                (row.inc + row.dec) / 2;

            const dep =
                Math.abs(zeroMean - mean);

            if(m > maxLoad){
                maxLoad = m;
                depression = dep;
            }
        }
    });

    if(maxLoad === 0 || depression === 0){

        document.getElementById('youngResult').innerHTML =
            '<b>Insufficient experimental data.</b>';

        document.getElementById('youngResultSI').innerHTML = '';

        return;
    }

    const m_g = maxLoad * 1000;

    const Y =
        (g * Math.pow(L,3) * m_g) /
        (4 * b * Math.pow(d,3) * depression);

    const Y_SI = Y * 0.1;

    document.getElementById('resultL').textContent =
        L.toFixed(2);

    document.getElementById('resultB').textContent =
        b.toFixed(2);

    document.getElementById('resultD').textContent =
        d.toFixed(3);

    document.getElementById('resultM').textContent =
        maxLoad.toFixed(2);

    document.getElementById('resultDepression').textContent =
        depression.toFixed(4);

    document.getElementById('youngResult').innerHTML =
        `Young's Modulus = <b>${Y.toExponential(3)}</b> dyne/cm²`;

    document.getElementById('youngResultSI').innerHTML =
        `≈ <b>${Y_SI.toExponential(3)}</b> N/m²`;
}

/* --- Vernier Caliper Tool --- */
(function (global) {
    function approxEqual(a, b, tol = 0.005) { return Math.abs(parseFloat(a) - parseFloat(b)) <= tol; }
    let currentAnimationId = null;

    function drawVernierSVG(svg, displayReading, options = {}) {
        const { highlightMSR = false, highlightVernier = false } = options;
        const { msr, vernier, final } = displayReading;
        const pxPerCm = 60; const pxPerMm = 6; const scaleStartX = 100; const vx = scaleStartX + final * pxPerCm;
        const zeroMarkX = scaleStartX + msr * pxPerCm;

        let html = `<defs><linearGradient id="metalMain" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#E2E8F0"/><stop offset="50%" stop-color="#F8FAFC"/><stop offset="100%" stop-color="#CBD5E1"/></linearGradient><linearGradient id="metalDark" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#94A3B8"/><stop offset="50%" stop-color="#CBD5E1"/><stop offset="100%" stop-color="#64748B"/></linearGradient><radialGradient id="specimenGrad" cx="50%" cy="50%" r="50%"><stop offset="80%" stop-color="#ecc94b"/><stop offset="100%" stop-color="#d69e2e"/></radialGradient></defs>`;
        
        // Draw the flat bar specimen instead of a pulley
        const barWidth = (vx - scaleStartX);
        if (final > 0) {
            html += `<rect x="${scaleStartX}" y="100" width="${barWidth}" height="40" fill="url(#specimenGrad)" stroke="#020617" stroke-width="2"/>`;
        }

        const beamY = 60; const beamHeight = 40; const beamEndX = scaleStartX + 18 * pxPerCm + 40;
        html += `<rect x="${scaleStartX - 60}" y="${beamY}" width="${beamEndX - (scaleStartX - 60)}" height="${beamHeight}" fill="url(#metalMain)" stroke="#94A3B8" stroke-width="1"/>`;
        html += `<path d="M ${scaleStartX - 30} ${beamY + beamHeight} L ${scaleStartX} ${beamY + beamHeight} L ${scaleStartX} 180 L ${scaleStartX - 5} 180 L ${scaleStartX - 30} 120 Z" fill="url(#metalDark)" stroke="#94A3B8" stroke-width="1"/>`;
        html += `<path d="M ${scaleStartX - 25} ${beamY} L ${scaleStartX} ${beamY} L ${scaleStartX} 20 L ${scaleStartX - 5} 20 L ${scaleStartX - 25} 40 Z" fill="url(#metalDark)" stroke="#94A3B8" stroke-width="1"/>`;

        for (let i = 0; i <= 180; i++) {
            const x = scaleStartX + i * pxPerMm; const isCm = i % 10 === 0; const isHalf = i % 5 === 0 && !isCm;
            const tickTop = isCm ? (beamY + beamHeight - 18) : (isHalf ? (beamY + beamHeight - 12) : (beamY + beamHeight - 8));
            html += `<line x1="${x}" y1="${beamY + beamHeight}" x2="${x}" y2="${tickTop}" stroke="#0F172A" stroke-width="${isCm ? 1.5 : 1}"/>`;
            if (isCm) html += `<text x="${x}" y="${tickTop - 4}" text-anchor="middle" fill="#0F172A" font-size="11" font-weight="bold" font-family="monospace">${i / 10}</text>`;
        }

        if (highlightMSR) {
            html += `<g class="vc-highlight-msr"><line x1="${zeroMarkX}" y1="${beamY + beamHeight - 25}" x2="${zeroMarkX}" y2="${beamY + beamHeight + 35}" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4,2"/><rect x="${zeroMarkX - 35}" y="${beamY + beamHeight + 40}" width="70" height="20" fill="#ffffff" rx="4" stroke="#ef4444" stroke-width="1"/><text x="${zeroMarkX}" y="${beamY + beamHeight + 54}" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="bold">MSR: ${msr.toFixed(1)}</text></g>`;
        }

        const sliderWidth = 140;
        html += `<g transform="translate(${vx - scaleStartX}, 0)">`;
        html += `<rect x="${scaleStartX}" y="${beamY + beamHeight}" width="${sliderWidth}" height="22" fill="url(#metalMain)" stroke="#94A3B8" stroke-width="1" />`;
        html += `<rect x="${scaleStartX}" y="${beamY - 10}" width="${sliderWidth}" height="10" fill="url(#metalMain)" stroke="#94A3B8" stroke-width="1" />`;
        html += `<path d="M ${scaleStartX} ${beamY + beamHeight + 22} L ${scaleStartX + 30} ${beamY + beamHeight + 22} L ${scaleStartX + 5} 180 L ${scaleStartX} 180 Z" fill="url(#metalDark)" stroke="#94A3B8" stroke-width="1"/>`;
        html += `<path d="M ${scaleStartX} ${beamY - 10} L ${scaleStartX + 25} ${beamY - 10} L ${scaleStartX + 5} 20 L ${scaleStartX} 20 Z" fill="url(#metalDark)" stroke="#94A3B8" stroke-width="1"/>`;

        const vDivWidth = (9 * pxPerMm) / 10; 
        for (let v = 0; v <= 10; v++) {
            const vtickX = scaleStartX + v * vDivWidth; const isCoinc = v === vernier; const isMajor = v === 0 || v === 5 || v === 10;
            const tickBottom = isMajor ? (beamY + beamHeight + 12) : (beamY + beamHeight + 8);
            html += `<line x1="${vtickX}" y1="${beamY + beamHeight}" x2="${vtickX}" y2="${tickBottom}" stroke="${isCoinc ? '#f59e0b' : '#0F172A'}" stroke-width="${isCoinc ? 2 : 1}"/>`;
            if (isMajor || isCoinc) html += `<text x="${vtickX}" y="${tickBottom + 10}" text-anchor="middle" fill="${isCoinc ? '#f59e0b' : '#0F172A'}" font-size="10" font-weight="${isCoinc ? 'bold' : 'normal'}" font-family="monospace">${v}</text>`;
        }
        if (highlightVernier) html += `<circle cx="${scaleStartX + vernier * vDivWidth}" cy="${beamY + beamHeight + 6}" r="8" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="2,1"><animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" /></circle>`;
        html += `</g>`;

        svg.innerHTML = html;
    }

    const VernierCaliperTool = {
        container: null, root: null, displayReading: null,
        mount(containerId) {
            this.container = document.getElementById(containerId);
            const tpl = document.getElementById('vernier-caliper-template');
            this.container.innerHTML = ''; this.container.appendChild(tpl.content.cloneNode(true));
            this.root = this.container.querySelector('#vernier-caliper-root');
            this.bindEvents(); this.initDisplay();
        },
        initDisplay() { const vc = window.MeasurementSession.getState().vernier; this.displayReading = { ...vc.readings[vc.currentIndex] }; this.render(); },
        bindEvents() {
            this.root.querySelector('[data-vc-next]')?.addEventListener('click', () => this.advanceReading());
            this.root.querySelector('[data-vc-submit]')?.addEventListener('click', () => this.validateInputs());
        },
        animateTo(targetReading) {
            if (currentAnimationId) cancelAnimationFrame(currentAnimationId);
            const start = { ...this.displayReading }; const startTime = performance.now();
            const step = (now) => {
                const progress = Math.min((now - startTime) / 600, 1); const ease = 1 - Math.pow(1 - progress, 3);
                this.displayReading.final = start.final + (targetReading.final - start.final) * ease;
                const current = window.MeasurementSession.finalToVernierScale(this.displayReading.final);
                this.displayReading.msr = current.msr; this.displayReading.vernier = current.vernier;
                drawVernierSVG(this.root.querySelector('[data-vc-svg]'), this.displayReading);
                if (progress < 1) currentAnimationId = requestAnimationFrame(step); 
                else { this.displayReading = { ...targetReading }; this.render(); }
            };
            currentAnimationId = requestAnimationFrame(step);
        },
        render() {
            const vc = window.MeasurementSession.getState().vernier;
            if (vc.completed) { this.showComplete(); return; }
            const idx = vc.currentIndex; const reading = vc.readings[idx];
            this.root.querySelector('[data-vc-badge]').textContent = `Reading ${idx + 1} of 4`;
            drawVernierSVG(this.root.querySelector('[data-vc-svg]'), this.displayReading, { highlightMSR: idx <= 1, highlightVernier: idx <= 1 });
            
            let historyEl = this.root.querySelector('.vc-history');
            if (!historyEl) { historyEl = document.createElement('div'); historyEl.className = 'vc-history'; this.root.appendChild(historyEl); }
            let histHtml = '<h4>Measurement History</h4><div class="vc-history-list">';
            vc.studentFinals.forEach((val, i) => { histHtml += `<div class="vc-history-item ${vc.currentIndex === i ? 'active' : ''}"><span>Reading ${i + 1}:</span> <strong>${val.toFixed(2)} cm</strong></div>`; });
            if (vc.studentFinals.length === 0) histHtml += '<p style="font-size:0.85em;color:var(--sub-text);">No readings taken yet.</p>';
            historyEl.innerHTML = histHtml + '</div>';

            const mode = idx === 0 ? 'full' : idx === 1 ? 'partial' : 'independent';
            let guide = '';
            if (mode === 'full') guide = `<strong>Reading ${idx + 1} — Fully Guided</strong><p>Formula: Final = MSR + (Vernier × 0.01) cm</p><div class="vc-answer-reveal">MSR = ${reading.msr.toFixed(1)} cm | Vernier = ${reading.vernier} | Final = <strong>${reading.final.toFixed(2)} cm</strong></div>`;
            else if (mode === 'partial') guide = `<strong>Reading ${idx + 1} — Partially Guided</strong><p>Hint: Final = MSR + (Vernier × 0.01) cm</p>`;
            else guide = `<strong>Reading ${index + 1} — Independent</strong>`;
            this.root.querySelector('[data-vc-guide]').innerHTML = guide;

            const inSec = this.root.querySelector('[data-vc-inputs]'); const nxtBtn = this.root.querySelector('[data-vc-next]');
            if (idx === 0) { inSec.style.display = 'none'; nxtBtn.style.display = 'inline-block'; nxtBtn.textContent = 'Next Reading'; } 
            else { inSec.style.display = 'block'; nxtBtn.style.display = 'none'; this.root.querySelector('[data-vc-msr]').value = ''; this.root.querySelector('[data-vc-vernier]').value = ''; this.root.querySelector('[data-vc-final]').value = ''; }
        },
        validateInputs() {
            const vc = window.MeasurementSession.getState().vernier; const idx = vc.currentIndex; const exp = vc.readings[idx];
            const msrIn = parseFloat(this.root.querySelector('[data-vc-msr]').value); const vernierIn = parseInt(this.root.querySelector('[data-vc-vernier]').value, 10); const finalIn = parseFloat(this.root.querySelector('[data-vc-final]').value);
            if (isNaN(msrIn) || isNaN(vernierIn) || isNaN(finalIn)) return;
            if (!approxEqual(msrIn, exp.msr, 0.05) || vernierIn !== exp.vernier || !approxEqual(finalIn, exp.final, 0.01)) {
                window.analyzeAndShowError('vernier', msrIn, exp.msr, vernierIn, exp.vernier, finalIn, exp.final); return;
            }
            this.root.querySelector('[data-vc-error]').textContent = ''; vc.studentFinals.push(exp.final); this.advanceReading();
        },
        advanceReading() {
            const vc = window.MeasurementSession.getState().vernier;
            if (vc.currentIndex === 0) vc.studentFinals.push(vc.readings[0].final);
            if (vc.currentIndex >= 3) { vc.completed = true; vc.currentIndex = 4; this.showComplete(); return; }
            vc.currentIndex += 1; this.animateTo(vc.readings[vc.currentIndex]);
        },
        showComplete() {
            const vc = window.MeasurementSession.getState().vernier;
            const avg = vc.studentFinals.reduce((x, y) => x + y, 0) / vc.studentFinals.length;
            
            // Overwrite global breadth 'b' with measured average (in cm)
            b = avg;
            document.getElementById('valB').innerText = b.toFixed(3);
            updateUI(); renderTable();

            this.root.innerHTML = `<div class="vc-complete-banner"><strong>✓ Vernier Caliper Completed</strong><p style="margin:8px 0 0;color:var(--sub-text);">Four readings recorded. Average measured breadth: <strong style="color:var(--secondary)">${avg.toFixed(3)} cm</strong></p></div>`;
        }
    };
    global.VernierCaliperTool = VernierCaliperTool;
})(window);