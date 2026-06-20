/**
 * Shared measurement session: hidden true dimensions and generated readings.
 * Used by screw gauge, vernier caliper, and experiment integration.
 */
(function (global) {
    const SCREW_LC = 0.01;   // mm (pitch 1 mm, 100 circular divisions)
    const SCREW_CSR_DIVISIONS = 50;
    const VERNIER_LC = 0.01; // cm
    const ROD_VARIATION = 0.05;
    const PULLEY_VARIATION = 0.05;
    const NUM_READINGS = 4;

    function randInRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function round2(n) {
        return Math.round(n * 100) / 100;
    }

    /** Screw gauge: Final = MSR + CSR × 0.01 mm (100 divisions, pitch 1 mm) */
    function finalToScrewScale(finalMm) {
        const final = round2(finalMm);
        let msr = Math.floor(final * 2) / 2;
        let csr = Math.round((final - msr) / SCREW_LC);
        if (csr >= SCREW_CSR_DIVISIONS) {
            msr = round2(msr + 0.5);
            csr -= SCREW_CSR_DIVISIONS;
        }
        if (csr < 0) {
            msr = round2(msr - 0.5);
            csr += SCREW_CSR_DIVISIONS;
        }
        msr = round2(msr);
        csr = Math.max(0, Math.min(SCREW_CSR_DIVISIONS - 1, csr));
        return { msr, csr, final };
    }

    /** Vernier: Final = MSR + Vernier × 0.01 cm */
    function finalToVernierScale(finalCm) {
        const final = round2(finalCm);
        let vernier = Math.round((final - Math.floor(final * 10) / 10) / VERNIER_LC);
        let msr = round2(final - vernier * VERNIER_LC);
        if (vernier >= 10) {
            msr = round2(msr + 0.1);
            vernier -= 10;
        }
        if (vernier < 0) {
            msr = round2(msr - 0.1);
            vernier += 10;
        }
        msr = round2(msr);
        return { msr, vernier, final };
    }

    function generateReadingsAround(trueValue, variation, count) {
        const readings = [];
        for (let i = 0; i < count; i++) {
            const offset = randInRange(-variation, variation);
            readings.push(round2(trueValue + offset));
        }
        return readings;
    }

    function createSession() {
        const trueRodMm = round2(randInRange(3.4, 3.6));
        const truePulleyCm = round2(randInRange(14.9, 15.1));

        const rodFinals = generateReadingsAround(trueRodMm, ROD_VARIATION, NUM_READINGS);
        const pulleyFinals = generateReadingsAround(truePulleyCm, PULLEY_VARIATION, NUM_READINGS);

        return {
            trueRodMm,
            truePulleyCm,
            screwGauge: {
                readings: rodFinals.map(finalToScrewScale),
                completed: false,
                currentIndex: 0,
                studentFinals: []
            },
            vernier: {
                readings: pulleyFinals.map(finalToVernierScale),
                completed: false,
                currentIndex: 0,
                studentFinals: []
            },
            averages: {
                rodMm: null,
                pulleyCm: null
            },
            experimentUnlocked: false,
            experimentPerformed: false,
            graphGenerated: false
        };
    }

    const MeasurementSession = {
        state: null,

        init() {
            if (!this.state) {
                this.state = createSession();
            }
            return this.state;
        },

        reset() {
            this.state = createSession();
            return this.state;
        },

        getState() {
            if (!this.state) this.init();
            return this.state;
        },

        computeAverages() {
            const s = this.getState();
            const rod = s.screwGauge.studentFinals;
            const pulley = s.vernier.studentFinals;
            if (rod.length !== NUM_READINGS || pulley.length !== NUM_READINGS) return false;

            s.averages.rodMm = round2(rod.reduce((a, b) => a + b, 0) / NUM_READINGS);
            s.averages.pulleyCm = round2(pulley.reduce((a, b) => a + b, 0) / NUM_READINGS);
            s.experimentUnlocked = s.screwGauge.completed && s.vernier.completed;
            return true;
        },

        isExperimentUnlocked() {
            const s = this.getState();
            return s.experimentUnlocked && s.averages.rodMm != null && s.averages.pulleyCm != null;
        },

        applyToExperimentFields() {
            if (!this.isExperimentUnlocked()) return false;
            const { rodMm, pulleyCm } = this.getState().averages;
            const rodEl = document.getElementById('rod-d');
            const pulleyEl = document.getElementById('pulley-d');
            if (rodEl) {
                rodEl.value = rodMm.toFixed(2);
                rodEl.readOnly = true;
            }
            if (pulleyEl) {
                pulleyEl.value = pulleyCm.toFixed(2);
                pulleyEl.readOnly = true;
            }
            return true;
        },

        finalToScrewScale,
        finalToVernierScale,
        NUM_READINGS,
        SCREW_LC,
        SCREW_CSR_DIVISIONS,
        VERNIER_LC
    };

    global.MeasurementSession = MeasurementSession;
})(typeof window !== 'undefined' ? window : global);
