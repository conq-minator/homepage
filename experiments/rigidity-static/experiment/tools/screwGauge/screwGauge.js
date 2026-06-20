/**
 * Screw Gauge module — measures rod diameter (4 readings, guided flow).
 */
(function (global) {
    const TOLERANCE = 0.005;
    const CSR_DIVISIONS = 50;
    const SCREW_LC = 0.01;
    const PITCH_MM = 0.5;

    function approxEqual(a, b, tol = TOLERANCE) {
        return Math.abs(parseFloat(a) - parseFloat(b)) <= tol;
    }

    let currentAnimationId = null;

    function drawScrewGaugeSVG(svg, displayReading, options = {}) {
        const { msr, csr, final } = displayReading;

        // Realistic Lab Palette
        const colors = {
            metalBody: '#CBD5E1',
            metalDark: '#94A3B8',
            metalHighlight: '#F8FAFC',
            markings: '#0F172A',
            refLine: '#0F172A',
            shadow: 'rgba(0,0,0,0.15)'
        };

        const pxPerMm = 45;

        // Layout
        const sleeveStartX = 30;
        const sleeveWidth = 3500;     // Extend far to the right so it never ends on-screen
        const sleeveHeight = 44;
        const centerY = 135;          // center of sleeve
        const refLineY = centerY;     // reference line at center of sleeve

        // Thimble
        const thimbleEdgeX = sleeveStartX + final * pxPerMm;
        const thimbleWidth = 2500;    // Extend thimble to infinity (covers sleeve behind it)
        const thimbleHeight = 76;
        const bevelWidth = 16;

        let html = '';

        // ── Gradient definitions ──
        html += `<defs>
            <linearGradient id="sleeveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stop-color="${colors.metalDark}"      />
                <stop offset="25%"  stop-color="${colors.metalHighlight}" />
                <stop offset="75%"  stop-color="${colors.metalBody}"      />
                <stop offset="100%" stop-color="${colors.metalDark}"      />
            </linearGradient>
            <linearGradient id="thimbleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stop-color="${colors.metalDark}"      />
                <stop offset="18%"  stop-color="${colors.metalHighlight}" />
                <stop offset="50%"  stop-color="${colors.metalBody}"      />
                <stop offset="82%"  stop-color="${colors.metalHighlight}" />
                <stop offset="100%" stop-color="${colors.metalDark}"      />
            </linearGradient>
        </defs>`;

        // ═══════════════════════════════════════════
        // 1. SLEEVE (Main Scale Body)
        // ═══════════════════════════════════════════
        html += `<rect x="${sleeveStartX - 20}" y="${centerY - sleeveHeight / 2}"
                       width="${sleeveWidth}" height="${sleeveHeight}"
                       fill="url(#sleeveGrad)" stroke="${colors.metalDark}"
                       stroke-width="0.5" rx="2"/>`;

        // Reference line (horizontal datum line)
        html += `<line x1="${sleeveStartX - 20}" y1="${refLineY}"
                       x2="${sleeveStartX + sleeveWidth}" y2="${refLineY}"
                       stroke="${colors.refLine}" stroke-width="1.5"/>`;

        // ── Main Scale Graduations ──
        // Draw up to 25 mm, which covers standard micrometer range
        const scaleMin = 0;
        const scaleMax = 25;

        for (let mm = scaleMin; mm <= scaleMax; mm++) {
            const x = sleeveStartX + mm * pxPerMm;

            // ── Whole mm tick (ABOVE reference line) ──
            const wholeTickLen = 14;
            html += `<line x1="${x}" y1="${refLineY}"
                           x2="${x}" y2="${refLineY - wholeTickLen}"
                           stroke="${colors.markings}" stroke-width="1.2"/>`;

            // ── Whole mm label (painted directly on the sleeve) ──
            // We label 0 to 10 as requested, plus standard 15, 20, 25
            if (mm <= 10 || mm % 5 === 0) {
                html += `<text x="${x}" y="${refLineY - wholeTickLen - 3}"
                               text-anchor="middle" fill="${colors.markings}"
                               font-size="11"
                               font-weight="bold"
                               font-family="monospace">${mm}</text>`;
            }

            // ── Half mm tick (BELOW reference line) ──
            if (mm < scaleMax) {
                const halfX = x + pxPerMm / 2;
                const halfTickLen = 10;
                html += `<line x1="${halfX}" y1="${refLineY}"
                               x2="${halfX}" y2="${refLineY + halfTickLen}"
                               stroke="${colors.markings}" stroke-width="1"/>`;
            }
        }

        // ═══════════════════════════════════════════
        // 2. THIMBLE (Circular Scale)
        // ═══════════════════════════════════════════
        const tX = thimbleEdgeX;
        const tTopY = centerY - thimbleHeight / 2;

        // Drop shadow
        html += `<rect x="${tX + 3}" y="${tTopY + 3}"
                       width="${thimbleWidth}" height="${thimbleHeight}"
                       fill="black" opacity="0.08" rx="3"/>`;

        // Thimble body with bevel - covers the hidden part of the sleeve
        html += `<path d="M ${tX} ${refLineY - (sleeveHeight / 2 + 6)}
                          L ${tX + bevelWidth} ${tTopY}
                          L ${tX + thimbleWidth} ${tTopY}
                          L ${tX + thimbleWidth} ${tTopY + thimbleHeight}
                          L ${tX + bevelWidth} ${tTopY + thimbleHeight}
                          L ${tX} ${refLineY + (sleeveHeight / 2 + 6)} Z"
                       fill="url(#thimbleGrad)" stroke="${colors.metalDark}" stroke-width="0.5"/>`;

        // ── Rotating graduations (cylinder projection) ──
        // CSR is the division sitting right at the reference line (angle = 0).
        // Divisions offset from CSR map to angles on a cylinder.
        const visibleRange = 12;
        for (let dOffset = -visibleRange; dOffset <= visibleRange; dOffset++) {
            const d = (csr + dOffset + CSR_DIVISIONS) % CSR_DIVISIONS;

            // Map offset to angle on cylinder surface
            const angle = (dOffset / CSR_DIVISIONS) * 2 * Math.PI;
            if (Math.abs(angle) > Math.PI / 2) continue;

            const yPos = refLineY + (thimbleHeight / 2 - 6) * Math.sin(angle);
            const opacity = Math.cos(angle);
            if (opacity < 0.15) continue;

            const isMajor = d % 5 === 0;
            const isCoinc = dOffset === 0;  // the one right at the reference line
            const tickLen = isMajor ? 12 : 5;

            html += `<line x1="${tX}" y1="${yPos}" x2="${tX + tickLen}" y2="${yPos}"
                           stroke="${colors.markings}"
                           stroke-width="${isCoinc ? 2 : isMajor ? 1 : 0.7}"
                           stroke-opacity="${opacity.toFixed(2)}"/>`;

            if (isMajor) {
                html += `<text x="${tX + 16}" y="${yPos + 3}"
                               fill="${colors.markings}" font-size="9"
                               font-weight="${isCoinc ? 'bold' : 'normal'}"
                               font-family="monospace"
                               fill-opacity="${opacity.toFixed(2)}">${d}</text>`;
            }
        }

        // ── Knurled grip lines ──
        const gripStart = tX + 40; // Start knurling a bit after the bevel
        for (let gx = gripStart; gx < tX + thimbleWidth - 8; gx += 4) {
            html += `<line x1="${gx}" y1="${tTopY + 4}" x2="${gx}" y2="${tTopY + thimbleHeight - 4}"
                           stroke="${colors.metalDark}" stroke-width="0.8" stroke-opacity="0.25"/>`;
        }

        // ── Info label ──
        const muted = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94A3B8';
        html += `<text x="260" y="230" text-anchor="middle" fill="${muted}" font-size="10"
                       font-style="italic">Pitch ${PITCH_MM} mm  ·  LC ${SCREW_LC} mm  ·  Circular Scale: ${CSR_DIVISIONS} divisions</text>`;

        svg.innerHTML = html;
    }

    function roundMm(mm) {
        return Math.round(mm * 10) / 10;
    }

    function getGuideContent(index, reading, mode) {
        const { msr, csr, final } = reading;
        const LC = 0.01;
        if (mode === 'full') {
            return `
                <strong>Reading ${index + 1} — Fully Guided</strong>
                <p>Identify the <strong>Main Scale Reading (MSR)</strong> on the sleeve at the thimble edge, and the <strong>Circular Scale Reading (CSR)</strong> where a division aligns with the reference line.</p>
                <p>Formula: <strong>Final = MSR + (CSR × ${LC}) mm</strong></p>
                <div class="sg-answer-reveal">
                    MSR = ${msr.toFixed(1)} mm &nbsp;|&nbsp; CSR = ${csr} &nbsp;|&nbsp;
                    Final = ${msr.toFixed(1)} + (${csr} × ${LC}) = <strong>${final.toFixed(2)} mm</strong>
                </div>
            `;
        }
        if (mode === 'partial') {
            return `
                <strong>Reading ${index + 1} — Partially Guided</strong>
                <p>Read MSR and CSR from the instrument, then compute the final diameter. Enter all three values below.</p>
                <p><em>Hint: Final = MSR + (CSR × 0.01) mm</em></p>
            `;
        }
        return `
            <strong>Reading ${index + 1} — Independent</strong>
            <p>Read the screw gauge and enter MSR, CSR, and Final Reading below.</p>
        `;
    }

    const ScrewGaugeTool = {
        container: null,
        root: null,
        onComplete: null,

        displayReading: null,

        mount(containerId, onComplete) {
            this.container = document.getElementById(containerId);
            if (!this.container) return;
            this.onComplete = onComplete;

            const useTemplate = () => {
                const tpl = document.getElementById('screw-gauge-template');
                if (tpl && tpl.content) {
                    this.container.innerHTML = '';
                    this.container.appendChild(tpl.content.cloneNode(true));
                }
                this.root = this.container.querySelector('#screw-gauge-root') || this.container.querySelector('.screw-gauge-tool');
                this.bindEvents();
                this.initDisplay();
                if (global.initPanZoom) global.initPanZoom('screwGauge');
            };

            useTemplate();
        },

        initDisplay() {
            const sg = this.getSession();
            if (!this.displayReading) {
                this.displayReading = { ...sg.readings[sg.currentIndex] };
            }
            this.render();
        },

        bindEvents() {
            if (!this.root) return;
            const nextBtn = this.root.querySelector('[data-sg-next]');
            const submitBtn = this.root.querySelector('[data-sg-submit]');
            nextBtn?.addEventListener('click', () => this.advanceReading());
            submitBtn?.addEventListener('click', () => this.validateInputs());
        },

        getSession() {
            return global.MeasurementSession.getState().screwGauge;
        },

        animateTo(targetReading) {
            if (currentAnimationId) cancelAnimationFrame(currentAnimationId);

            const start = { ...this.displayReading };
            const startTime = performance.now();
            const duration = 600; // ms

            const step = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

                this.displayReading.final = start.final + (targetReading.final - start.final) * ease;

                // Back-calculate approximate MSR/CSR for visual consistency during animation
                const current = global.MeasurementSession.finalToScrewScale(this.displayReading.final);
                this.displayReading.msr = current.msr;
                this.displayReading.csr = current.csr;

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
            const svg = this.root.querySelector('[data-sg-svg]');
            drawScrewGaugeSVG(svg, this.displayReading);
        },

        render() {
            if (!this.root) return;
            const session = global.MeasurementSession.getState();
            const sg = session.screwGauge;

            if (sg.completed) {
                this.showComplete();
                return;
            }

            const idx = sg.currentIndex;
            const reading = sg.readings[idx];
            const mode = idx === 0 ? 'full' : idx === 1 ? 'partial' : 'independent';
            const isGuidedOnly = idx === 0;

            const badge = this.root.querySelector('[data-sg-badge]');
            if (badge) badge.textContent = `Reading ${idx + 1} of 4`;

            this.renderSVGOnly();
            this.renderHistory();

            const guideEl = this.root.querySelector('[data-sg-guide]');
            if (guideEl) guideEl.innerHTML = getGuideContent(idx, reading, mode);

            const inputSection = this.root.querySelector('[data-sg-inputs]');
            const nextBtn = this.root.querySelector('[data-sg-next]');
            const errEl = this.root.querySelector('[data-sg-error]');
            if (errEl) errEl.textContent = '';

            if (isGuidedOnly) {
                if (inputSection) inputSection.style.display = 'none';
                if (nextBtn) {
                    nextBtn.style.display = 'inline-block';
                    nextBtn.textContent = idx < 3 ? 'Next Reading' : 'Complete Screw Gauge';
                }
            } else {
                if (inputSection) inputSection.style.display = 'block';
                if (nextBtn) nextBtn.style.display = 'none';
                const msr = this.root.querySelector('[data-sg-msr]');
                const csr = this.root.querySelector('[data-sg-csr]');
                const fin = this.root.querySelector('[data-sg-final]');
                if (msr) msr.value = '';
                if (csr) csr.value = '';
                if (fin) fin.value = '';
            }
        },

        renderHistory() {
            const sg = this.getSession();
            let historyEl = this.root.querySelector('.sg-history');
            if (!historyEl) {
                historyEl = document.createElement('div');
                historyEl.className = 'sg-history';
                this.root.appendChild(historyEl);
            }

            let html = '<h4>Measurement History</h4><div class="sg-history-list">';
            sg.studentFinals.forEach((val, i) => {
                const isCurrent = sg.currentIndex === i;
                html += `<div class="sg-history-item ${isCurrent ? 'active' : ''}" onclick="window.ScrewGaugeTool.recallReading(${i})">
                    <span>Reading ${i + 1}:</span> <strong>${val.toFixed(2)} mm</strong>
                </div>`;
            });
            if (sg.studentFinals.length === 0) html += '<p style="font-size:0.85em;color:var(--text-muted);">No readings taken yet.</p>';
            html += '</div>';
            historyEl.innerHTML = html;
        },

        recallReading(idx) {
            const sg = this.getSession();
            const reading = sg.readings[idx];
            if (reading) {
                this.animateTo(reading);
            }
        },

        validateInputs() {
            const sg = this.getSession();
            const idx = sg.currentIndex;
            const expected = sg.readings[idx];
            const errEl = this.root.querySelector('[data-sg-error]');

            const msrIn = parseFloat(this.root.querySelector('[data-sg-msr]').value);
            const csrIn = parseInt(this.root.querySelector('[data-sg-csr]').value, 10);
            const finalIn = parseFloat(this.root.querySelector('[data-sg-final]').value);

            if (isNaN(msrIn) || isNaN(csrIn) || isNaN(finalIn)) {
                errEl.textContent = 'Please enter MSR, CSR, and Final Reading.';
                return;
            }

            const msrOk = approxEqual(msrIn, expected.msr, 0.05);
            const csrOk = csrIn === expected.csr;
            const finalOk = approxEqual(finalIn, expected.final, 0.01);

            if (!msrOk || !csrOk || !finalOk) {
                errEl.textContent = '';
                window.analyzeAndShowError(
                    'screwGauge', 
                    msrIn, expected.msr, 
                    csrIn, expected.csr, 
                    finalIn, expected.final
                );
                return;
            }

            errEl.textContent = '';
            sg.studentFinals.push(expected.final);
            this.advanceReading();
        },

        advanceReading() {
            const sg = this.getSession();
            const idx = sg.currentIndex;

            if (idx === 0) {
                sg.studentFinals.push(sg.readings[0].final);
            }

            if (idx >= 3) {
                sg.completed = true;
                sg.currentIndex = 4;
                this.showComplete();
                
                // CRITICAL FIX: Only fire ONE callback to let the measurementsController handle it
                if (this.onComplete) {
                    this.onComplete(); 
                }
                return;
            }

            sg.currentIndex += 1;
            const nextReading = sg.readings[sg.currentIndex];
            this.animateTo(nextReading);
        },

        showComplete() {
            const sg = this.getSession();
            const avg = sg.studentFinals.reduce((a, b) => a + b, 0) / sg.studentFinals.length;
            this.root.innerHTML = `
                <div class="sg-complete-banner">
                    <strong>✓ Screw Gauge Completed</strong>
                    <p style="margin:8px 0 0;color:var(--text-muted);">Four readings recorded. Average rod diameter: <strong style="color:var(--accent)">${avg.toFixed(2)} mm</strong></p>
                </div>
            `;
        },

        redraw() {
            if (this.root && !this.getSession().completed) this.render();
        }
    };

    global.ScrewGaugeTool = ScrewGaugeTool;
})(typeof window !== 'undefined' ? window : global);