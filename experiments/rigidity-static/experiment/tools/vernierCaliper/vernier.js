/**
 * Vernier Caliper module — measures pulley diameter (4 readings, guided flow).
 */
(function (global) {
    const TOLERANCE = 0.005;

    function approxEqual(a, b, tol = TOLERANCE) {
        return Math.abs(parseFloat(a) - parseFloat(b)) <= tol;
    }

    let currentAnimationId = null;

    function drawVernierSVG(svg, displayReading, options = {}) {
        const { highlightMSR = false, highlightVernier = false } = options;
        const { msr, vernier, final } = displayReading;
        
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#1E293B';
        const muted = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#64748B';
        const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#0EA5E9';
        const border = getComputedStyle(document.body).getPropertyValue('--border').trim() || '#94A3B8';
        const panelBg = getComputedStyle(document.body).getPropertyValue('--bg-panel').trim() || '#FFFFFF';
        
        // Define scaling: 1 cm = 60 pixels, 1 mm = 6 pixels
        const pxPerCm = 60;
        const pxPerMm = 6;
        const scaleStartX = 100; // X coordinate where 0 cm begins (and inner face of fixed jaw)
        const scaleMaxCm = 18;
        
        // Vernier zero is physically located at the exact final reading
        const vx = scaleStartX + final * pxPerCm;
        
        // MSR mark is the main scale mark just before (or equal to) the vernier zero
        const zeroMarkX = scaleStartX + msr * pxPerCm;

        let html = '';
        
        // ── Gradient definitions ──
        html += `<defs>
            <linearGradient id="metalMain" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#E2E8F0" />
                <stop offset="50%" stop-color="#F8FAFC" />
                <stop offset="100%" stop-color="#CBD5E1" />
            </linearGradient>
            <linearGradient id="metalDark" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#94A3B8" />
                <stop offset="50%" stop-color="#CBD5E1" />
                <stop offset="100%" stop-color="#64748B" />
            </linearGradient>
            <radialGradient id="pulleyGrad" cx="50%" cy="50%" r="50%">
                <stop offset="80%" stop-color="#334155" />
                <stop offset="100%" stop-color="#0F172A" />
            </radialGradient>
        </defs>`;

        // ═══════════════════════════════════════════
        // 1. OBJECT (PULLEY)
        // ═══════════════════════════════════════════
        // Placed between the fixed jaw (scaleStartX) and movable jaw (vx)
        const pulleyRadius = (vx - scaleStartX) / 2;
        const pulleyCX = scaleStartX + pulleyRadius;
        const pulleyCY = 150; // Align center with the jaws
        
        if (final > 0) {
            html += `<circle cx="${pulleyCX}" cy="${pulleyCY}" r="${pulleyRadius}" fill="url(#pulleyGrad)" stroke="#020617" stroke-width="2"/>`;
            html += `<circle cx="${pulleyCX}" cy="${pulleyCY}" r="${Math.max(pulleyRadius - 15, 0)}" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="6,4"/>`;
        }

        // ═══════════════════════════════════════════
        // 2. FIXED MAIN BODY (Beam + Fixed Jaw)
        // ═══════════════════════════════════════════
        // Main Beam
        const beamY = 60;
        const beamHeight = 40;
        const beamEndX = scaleStartX + scaleMaxCm * pxPerCm + 40;
        html += `<rect x="${scaleStartX - 60}" y="${beamY}" width="${beamEndX - (scaleStartX - 60)}" height="${beamHeight}" fill="url(#metalMain)" stroke="${border}" stroke-width="1"/>`;
        
        // Lower Fixed Jaw (points down)
        // Measuring face is exactly at x = scaleStartX
        html += `<path d="M ${scaleStartX - 30} ${beamY + beamHeight} 
                          L ${scaleStartX} ${beamY + beamHeight} 
                          L ${scaleStartX} 180 
                          L ${scaleStartX - 5} 180 
                          L ${scaleStartX - 30} 120 Z" 
                 fill="url(#metalDark)" stroke="${border}" stroke-width="1"/>`;
                 
        // Upper Fixed Jaw (points up)
        html += `<path d="M ${scaleStartX - 25} ${beamY} 
                          L ${scaleStartX} ${beamY} 
                          L ${scaleStartX} 20 
                          L ${scaleStartX - 5} 20 
                          L ${scaleStartX - 25} 40 Z" 
                 fill="url(#metalDark)" stroke="${border}" stroke-width="1"/>`;

        // ── Main Scale Graduations ──
        const numMm = scaleMaxCm * 10;
        for (let i = 0; i <= numMm; i++) {
            const x = scaleStartX + i * pxPerMm;
            const isCm = i % 10 === 0;
            const isHalf = i % 5 === 0 && !isCm;
            
            // Ticks drawn from the bottom of the beam upwards
            const tickTop = isCm ? (beamY + beamHeight - 18) : (isHalf ? (beamY + beamHeight - 12) : (beamY + beamHeight - 8));
            const tickWidth = isCm ? 1.5 : 1;
            
            html += `<line x1="${x}" y1="${beamY + beamHeight}" x2="${x}" y2="${tickTop}" stroke="#0F172A" stroke-width="${tickWidth}"/>`;
            
            if (isCm) {
                const label = i / 10;
                html += `<text x="${x}" y="${tickTop - 4}" text-anchor="middle" fill="#0F172A" font-size="11" font-weight="bold" font-family="monospace">${label}</text>`;
            }
        }

    
        // ═══════════════════════════════════════════
        // 3. SLIDING VERNIER ASSEMBLY
        // ═══════════════════════════════════════════
        const sliderWidth = 140;
        html += `<g transform="translate(${vx - scaleStartX}, 0)">`;
        
        // Slider Base Block (wraps below the beam)
        html += `<rect x="${scaleStartX}" y="${beamY + beamHeight}" width="${sliderWidth}" height="22" fill="url(#metalMain)" stroke="${border}" stroke-width="1" />`;
        
        // Slider Top Block (wraps above the beam)
        html += `<rect x="${scaleStartX}" y="${beamY - 10}" width="${sliderWidth}" height="10" fill="url(#metalMain)" stroke="${border}" stroke-width="1" />`;
        
        // Lower Movable Jaw
        // Measuring face exactly at x = scaleStartX (relative to the group)
        html += `<path d="M ${scaleStartX} ${beamY + beamHeight + 22} 
                          L ${scaleStartX + 30} ${beamY + beamHeight + 22} 
                          L ${scaleStartX + 5} 180 
                          L ${scaleStartX} 180 Z" 
                 fill="url(#metalDark)" stroke="${border}" stroke-width="1"/>`;
                 
        // Upper Movable Jaw
        html += `<path d="M ${scaleStartX} ${beamY - 10} 
                          L ${scaleStartX + 25} ${beamY - 10} 
                          L ${scaleStartX + 5} 20 
                          L ${scaleStartX} 20 Z" 
                 fill="url(#metalDark)" stroke="${border}" stroke-width="1"/>`;

        // ── Vernier Scale Graduations ──
        // 10 Vernier divisions = 9 Main divisions = 9 mm
        const vDivWidth = (9 * pxPerMm) / 10; 
        
        for (let v = 0; v <= 10; v++) {
            const vtickX = scaleStartX + v * vDivWidth;
            const isCoinc = v === vernier;
            const isMajor = v === 0 || v === 5 || v === 10;
            
            // Ticks drawn from the top of the slider base block downwards
            const tickBottom = isMajor ? (beamY + beamHeight + 12) : (beamY + beamHeight + 8);
            const tickWidth = isCoinc ? 2 : 1;
            const strokeColor = isCoinc ? '#f59e0b' : '#0F172A';
            
            html += `<line x1="${vtickX}" y1="${beamY + beamHeight}" x2="${vtickX}" y2="${tickBottom}" stroke="${strokeColor}" stroke-width="${tickWidth}"/>`;
            
            if (isMajor || isCoinc) {
                html += `<text x="${vtickX}" y="${tickBottom + 10}" text-anchor="middle" fill="${isCoinc ? '#f59e0b' : '#0F172A'}" font-size="10" font-weight="${isCoinc ? 'bold' : 'normal'}" font-family="monospace">${v}</text>`;
            }
        }

        // Highlight Vernier Coincidence
        if (highlightVernier) {
            const coinX = scaleStartX + vernier * vDivWidth;
            html += `<circle cx="${coinX}" cy="${beamY + beamHeight + 6}" r="8" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="2,1">
                <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" />
            </circle>`;
        }
        
        html += `</g>`;
        // Highlight MSR (Main Scale Reading)
        if (highlightMSR) {
            html += `<g class="vc-highlight-msr">`;
            html += `<line x1="${zeroMarkX}" y1="${beamY + beamHeight - 25}" x2="${zeroMarkX}" y2="${beamY + beamHeight + 35}" stroke="${accent}" stroke-width="2.5" stroke-dasharray="4,2"/>`;
            html += `<rect x="${zeroMarkX - 35}" y="${beamY + beamHeight + 40}" width="70" height="20" fill="${panelBg}" rx="4" stroke="${accent}" stroke-width="1"/>`;
            html += `<text x="${zeroMarkX}" y="${beamY + beamHeight + 54}" text-anchor="middle" fill="${accent}" font-size="11" font-weight="bold">MSR: ${msr.toFixed(1)}</text>`;
            html += `</g>`;
        }
        svg.innerHTML = html;
    }

    function getGuideContent(index, reading, mode) {
        const { msr, vernier, final } = reading;
        const LC = 0.01;
        if (mode === 'full') {
            return `
                <strong>Reading ${index + 1} — Fully Guided</strong>
                <p>Read the <strong>Main Scale (MSR)</strong> just before the vernier zero, and the <strong>Vernier coincidence</strong> division that aligns with a main scale line.</p>
                <p>Formula: <strong>Final = MSR + (Vernier × ${LC}) cm</strong></p>
                <div class="vc-answer-reveal">
                    MSR = ${msr.toFixed(1)} cm &nbsp;|&nbsp; Vernier = ${vernier} &nbsp;|&nbsp;
                    Final = ${msr.toFixed(1)} + (${vernier} × ${LC}) = <strong>${final.toFixed(2)} cm</strong>
                </div>
            `;
        }
        if (mode === 'partial') {
            return `
                <strong>Reading ${index + 1} — Partially Guided</strong>
                <p>Read MSR and vernier coincidence from the instrument, then compute the final diameter.</p>
                <p><em>Hint: Final = MSR + (Vernier × 0.01) cm</em></p>
            `;
        }
        return `
            <strong>Reading ${index + 1} — Independent</strong>
            <p>Read the vernier caliper and enter MSR, Vernier reading, and Final Reading below.</p>
        `;
    }

    const VernierCaliperTool = {
        container: null,
        root: null,
        onComplete: null,

        displayReading: null,

        mount(containerId, onComplete) {
            this.container = document.getElementById(containerId);
            if (!this.container) return;
            this.onComplete = onComplete;

            const useTemplate = () => {
                const tpl = document.getElementById('vernier-caliper-template');
                if (tpl && tpl.content) {
                    this.container.innerHTML = '';
                    this.container.appendChild(tpl.content.cloneNode(true));
                }
                this.root = this.container.querySelector('#vernier-caliper-root') || this.container.querySelector('.vernier-caliper-tool');
                this.bindEvents();
                this.initDisplay();
                if (global.initPanZoom) global.initPanZoom('vernier');
            };

            useTemplate();
        },

        initDisplay() {
            const vc = this.getSession();
            if (!this.displayReading) {
               this.displayReading = { ...vc.readings[vc.currentIndex] };
            }
            this.render();
        },

        bindEvents() {
            if (!this.root) return;
            this.root.querySelector('[data-vc-next]')?.addEventListener('click', () => this.advanceReading());
            this.root.querySelector('[data-vc-submit]')?.addEventListener('click', () => this.validateInputs());
        },

        getSession() {
            return global.MeasurementSession.getState().vernier;
        },

        animateTo(targetReading) {
            if (currentAnimationId) cancelAnimationFrame(currentAnimationId);
            
            const start = { ...this.displayReading };
            const startTime = performance.now();
            const duration = 600; // ms

            const step = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);

                this.displayReading.final = start.final + (targetReading.final - start.final) * ease;
                
                // Approximate for visuals
                const current = global.MeasurementSession.finalToVernierScale(this.displayReading.final);
                this.displayReading.msr = current.msr;
                this.displayReading.vernier = current.vernier;

                this.renderSVGOnly();

                if (progress < 1) {
                    currentAnimationId = requestAnimationFrame(step);
                } else {
                    this.displayReading = { ...targetReading };
                    this.render();
                    currentAnimationId = null;
                }
            };
            currentAnimationId = requestAnimationFrame(step);
        },

        renderSVGOnly() {
            if (!this.root) return;
            const vc = this.getSession();
            const svg = this.root.querySelector('[data-vc-svg]');
            if (svg) {
                drawVernierSVG(svg, this.displayReading, {
                    highlightMSR: vc.currentIndex <= 1,
                    highlightVernier: vc.currentIndex <= 1
                });
            }
        },

        setLocked(locked) {
            if (this.root) {
                this.root.classList.toggle('vc-locked', locked);
            }
        },

        render() {
            if (!this.root) return;
            const session = global.MeasurementSession.getState();
            const vc = session.vernier;

            let lockedMsg = this.container.querySelector('.vc-locked-msg');
            if (!session.screwGauge.completed) {
                this.root.style.display = 'none';
                if (!lockedMsg) {
                    lockedMsg = document.createElement('div');
                    lockedMsg.className = 'vc-locked-msg';
                    lockedMsg.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:24px;">Complete the Screw Gauge measurements first.</p>`;
                    this.container.appendChild(lockedMsg);
                }
                this.setLocked(true);
                return;
            } else {
                this.root.style.display = 'block'; // Make absolutely sure it un-hides
                if (lockedMsg) {
                    lockedMsg.remove();
                }
                this.setLocked(false);
            }

            if (vc.completed) {
                this.showComplete();
                return;
            }

            const idx = vc.currentIndex;
            const reading = vc.readings[idx];
            const mode = idx === 0 ? 'full' : idx === 1 ? 'partial' : 'independent';
            const isGuidedOnly = idx === 0;

            const badge = this.root.querySelector('[data-vc-badge]');
            if (badge) badge.textContent = `Reading ${idx + 1} of 4`;
            
            this.renderSVGOnly();
            this.renderHistory();

            const guideEl = this.root.querySelector('[data-vc-guide]');
            if (guideEl) guideEl.innerHTML = getGuideContent(idx, reading, mode);

            const inputSection = this.root.querySelector('[data-vc-inputs]');
            const nextBtn = this.root.querySelector('[data-vc-next]');
            const errEl = this.root.querySelector('[data-vc-error]');
            if (errEl) errEl.textContent = '';

            if (isGuidedOnly) {
                if (inputSection) inputSection.style.display = 'none';
                if (nextBtn) {
                    nextBtn.style.display = 'inline-block';
                    nextBtn.textContent = idx < 3 ? 'Next Reading' : 'Complete Vernier Caliper';
                }
            } else {
                if (inputSection) inputSection.style.display = 'block';
                if (nextBtn) nextBtn.style.display = 'none';
                const msr = this.root.querySelector('[data-vc-msr]');
                const vcs = this.root.querySelector('[data-vc-vernier]');
                const fin = this.root.querySelector('[data-vc-final]');
                if (msr) msr.value = '';
                if (vcs) vcs.value = '';
                if (fin) fin.value = '';
            }
        },

        renderHistory() {
            const vc = this.getSession();
            let historyEl = this.root.querySelector('.vc-history');
            if (!historyEl) {
                historyEl = document.createElement('div');
                historyEl.className = 'vc-history';
                this.root.appendChild(historyEl);
            }

            let html = '<h4>Measurement History</h4><div class="vc-history-list">';
            vc.studentFinals.forEach((val, i) => {
                const isCurrent = vc.currentIndex === i;
                html += `<div class="vc-history-item ${isCurrent ? 'active' : ''}" onclick="window.VernierCaliperTool.recallReading(${i})">
                    <span>Reading ${i+1}:</span> <strong>${val.toFixed(2)} cm</strong>
                </div>`;
            });
            if (vc.studentFinals.length === 0) html += '<p style="font-size:0.85em;color:var(--text-muted);">No readings taken yet.</p>';
            html += '</div>';
            historyEl.innerHTML = html;
        },

        recallReading(idx) {
            const vc = this.getSession();
            const reading = vc.readings[idx];
            if (reading) {
                this.animateTo(reading);
            }
        },

        validateInputs() {
            const vc = this.getSession();
            const idx = vc.currentIndex;
            const expected = vc.readings[idx];
            const errEl = this.root.querySelector('[data-vc-error]');

            const msrIn = parseFloat(this.root.querySelector('[data-vc-msr]').value);
            const vernierIn = parseInt(this.root.querySelector('[data-vc-vernier]').value, 10);
            const finalIn = parseFloat(this.root.querySelector('[data-vc-final]').value);

            if (isNaN(msrIn) || isNaN(vernierIn) || isNaN(finalIn)) {
                errEl.textContent = 'Please enter MSR, Vernier reading, and Final Reading.';
                return;
            }

            const msrOk = approxEqual(msrIn, expected.msr, 0.05);
            const vernierOk = vernierIn === expected.vernier;
            const finalOk = approxEqual(finalIn, expected.final, 0.01);

            if (!msrOk || !vernierOk || !finalOk) {
                errEl.textContent = ''; 
                window.analyzeAndShowError(
                    'vernier', 
                    msrIn, expected.msr, 
                    vernierIn, expected.vernier, 
                    finalIn, expected.final
                );
                return;
            }

            errEl.textContent = '';
            vc.studentFinals.push(expected.final);
            this.advanceReading();
        },

        advanceReading() {
            const vc = this.getSession();
            const idx = vc.currentIndex;

            if (idx === 0) {
                vc.studentFinals.push(vc.readings[0].final);
            }

            if (idx >= 3) {
                vc.completed = true;
                vc.currentIndex = 4;
                this.showComplete();
                if (this.onComplete) this.onComplete();
                if (global.MeasurementsHub) global.MeasurementsHub.onToolComplete();
                return;
            }

            vc.currentIndex += 1;
            const nextReading = vc.readings[vc.currentIndex];
            this.animateTo(nextReading);
        },

        showComplete() {
            const vc = this.getSession();
            const avg = vc.studentFinals.reduce((a, b) => a + b, 0) / vc.studentFinals.length;
            this.root.innerHTML = `
                <div class="vc-complete-banner">
                    <strong>✓ Vernier Caliper Completed</strong>
                    <p style="margin:8px 0 0;color:var(--text-muted);">Four readings recorded. Average pulley diameter: <strong style="color:var(--accent)">${avg.toFixed(2)} cm</strong></p>
                </div>
            `;
        },

        redraw() {
            if (this.root && !this.getSession().completed) this.render();
            else if (this.root && this.getSession().completed) this.showComplete();
        }
    };

    global.VernierCaliperTool = VernierCaliperTool;
})(typeof window !== 'undefined' ? window : global);