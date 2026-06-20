/**
 * Measurements tab hub: workflow, progress tracker, averages, experiment unlock.
 */
(function (global) {
    const MeasurementsHub = {
        initialized: false,

        init() {
            if (this.initialized) return;
            global.MeasurementSession.init();
            this.initialized = true;
            this.updateProgress();
            this.updateAveragesPanel();
            this.updateStepStates();

            if (global.ScrewGaugeTool) {
                global.ScrewGaugeTool.mount('screw-gauge-mount', () => this.onToolComplete());
            }
            if (global.VernierCaliperTool) {
                global.VernierCaliperTool.mount('vernier-caliper-mount', () => this.onToolComplete());
            }
        },

        onToolComplete() {
            const s = global.MeasurementSession.getState();
            
            this.updateProgress();
            this.updateStepStates();
            this.updateAveragesPanel();

            // WAKE UP VERNIER CALIPER: Brute-force unhide the container and render the tool
            if (s.screwGauge.completed && !s.vernier.completed) {
                const vcMount = document.getElementById('vernier-caliper-mount');
                if (vcMount) {
                    vcMount.style.display = 'block'; 
                }
                if (global.VernierCaliperTool) {
                    global.VernierCaliperTool.render(); 
                }
            }
            
            if (s.screwGauge.completed && s.vernier.completed) {
                this.finalizeAverages();
            }
        },

        finalizeAverages() {
            const ok = global.MeasurementSession.computeAverages();
            if (!ok) return;

            const s = global.MeasurementSession.getState();
            const rod = s.averages.rodMm;
            const pulley = s.averages.pulleyCm;

            const calcEl = document.getElementById('measurements-average-calc');
            const unlockEl = document.getElementById('measurements-unlock-msg');
            if (calcEl) {
                const r = s.screwGauge.studentFinals;
                const p = s.vernier.studentFinals;
                calcEl.innerHTML = `
                    <div class="formula-box" style="text-align:left;font-size:1em;">
                        <strong>Average Rod Diameter</strong><br>
                        (${r.map(v => v.toFixed(2)).join(' + ')}) / 4 = <strong>${rod.toFixed(2)} mm</strong>
                    </div>
                    <div class="formula-box" style="text-align:left;font-size:1em;margin-top:12px;">
                        <strong>Average Pulley Diameter</strong><br>
                        (${p.map(v => v.toFixed(2)).join(' + ')}) / 4 = <strong>${pulley.toFixed(2)} cm</strong>
                    </div>
                `;
                calcEl.style.display = 'block';
            }

            global.MeasurementSession.applyToExperimentFields();

            if (unlockEl) {
                unlockEl.innerHTML = '<strong style="color:var(--accent);">✓ Step 4: Experiment Simulation is now unlocked.</strong> Proceed to the Experiment Simulation tab.';
                unlockEl.style.display = 'block';
            }

            if (global.unlockExperimentTab) global.unlockExperimentTab();
            this.updateProgress();
            this.updateStepStates();
        },

        updateProgress() {
            const s = global.MeasurementSession.getState();
            const set = (id, done) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = done ? '✓' : '☐';
                    el.classList.toggle('progress-done', done);
                    el.classList.toggle('progress-pending', !done);
                }
            };
            set('prog-screw', s.screwGauge.completed);
            set('prog-vernier', s.vernier.completed);
            set('prog-experiment', s.experimentPerformed);
            set('prog-graph', s.graphGenerated);
        },

        updateStepStates() {
            const s = global.MeasurementSession.getState();
            const step2 = document.getElementById('measurements-step-2');
            const step3 = document.getElementById('measurements-step-3');
            const step4 = document.getElementById('measurements-step-4');

            if (step2) {
                const isActive = s.screwGauge.completed && !s.vernier.completed;
                step2.classList.toggle('measurements-step-active', isActive);
                
                // Dynamically update the instruction text
                const desc = step2.querySelector('p');
                if (desc) {
                    if (isActive) {
                        desc.innerHTML = '<span style="color: var(--accent); font-weight: bold;">Unlocked!</span> Measure the pulley diameter. Complete all four readings.';
                    } else if (s.vernier.completed) {
                        desc.textContent = "Pulley measurements complete.";
                    } else {
                        desc.textContent = 'Measure the pulley diameter. Available after Step 1 is complete.';
                    }
                }
            }

            if (step3) {
                const show = s.screwGauge.completed && s.vernier.completed;
                step3.style.display = show ? 'block' : 'none';
            }
            if (step4) {
                step4.style.display = s.experimentUnlocked ? 'block' : 'none';
            }
        },

        updateAveragesPanel() {
            const s = global.MeasurementSession.getState();
            if (!s.screwGauge.completed || !s.vernier.completed) return;
            if (s.averages.rodMm != null) return;
            this.finalizeAverages();
        },

        markExperimentPerformed() {
            global.MeasurementSession.getState().experimentPerformed = true;
            this.updateProgress();
        },

        markGraphGenerated() {
            global.MeasurementSession.getState().graphGenerated = true;
            this.updateProgress();
        },

        onThemeChange() {
            if (global.ScrewGaugeTool?.redraw) global.ScrewGaugeTool.redraw();
            if (global.VernierCaliperTool?.redraw) global.VernierCaliperTool.redraw();
        }
    };

    global.MeasurementsHub = MeasurementsHub;
})(typeof window !== 'undefined' ? window : global);