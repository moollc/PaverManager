// Fallback JavaScript calculations for standalone HTML operation
// This provides basic functionality when WASM module is not available
// Logic mirrors wasm/src/lib.rs exactly — keep in sync when changing either.

// Densities (kg/m³)
const FB_PORTLAND_DENSITY = 1506;
const FB_WHITE_CEMENT_DENSITY = 1134;
const FB_SAND_DENSITY = 1700;
const FB_REGULAR_GRAVEL_DENSITY = 1600;
const FB_CHIP_GRAVEL_DENSITY = 1600;
const FB_WHITE_GRAVEL_DENSITY = 1600;
const FB_STONE_DUST_DENSITY = 1500;
const FB_GCC400_DENSITY = 900;
const FB_WHITE_LIME_DENSITY = 500;

// Admixture densities (kg/L)
const FB_WATER_REDUCER_DENSITY = 1.08;
const FB_HARDENER_DENSITY = 1.05;
const FB_MACRO_FIBRE_DENSITY = 0.91;

// Pigment densities (kg/L) — mirrors lib.rs lines 41-49
const FB_PIGMENT_DENSITY = {
    'Red Iron Oxide':         1.037,
    'Yellow Iron Oxide':      0.454,
    'Black Iron Oxide':       1.451,
    'Blue Pigment':           1.08,
    'Green Pigment':          1.148,
    'Brown Pigment':          1.09,
    'White Titanium Dioxide': 1.037,
    'None':                   1.0
};

// Pigment prices (JMD/L) — mirrors app.js getPigmentPrice()
const FB_PIGMENT_PRICE = {
    'Red Iron Oxide':         1371.72,
    'Yellow Iron Oxide':      600.54,
    'Black Iron Oxide':       1919.34,
    'Blue Pigment':           7143,
    'Green Pigment':          1518.57,
    'Brown Pigment':          3000,
    'White Titanium Dioxide': 2591.32,
    'None':                   0
};

// Conversions
const FB_INCH_TO_ML = 16.387;
const FB_KG_TO_LB = 2.20462;
const FB_PORTLAND_BAG_LB = 94;
const FB_WHITE_BAG_LB = 88;
const FB_M_TO_YD = 1.30795;
const FB_L_TO_GAL = 0.264172;

const FB_PIGMENT_OPTIONS = ['Red Iron Oxide', 'Yellow Iron Oxide', 'Black Iron Oxide', 'Blue Pigment', 'Green Pigment', 'Brown Pigment', 'White Titanium Dioxide', 'None'];

const FB_PIGMENT_COLORS = {
    'Red Iron Oxide':         [140, 82, 57],
    'Yellow Iron Oxide':      [175, 128, 80],
    'Black Iron Oxide':       [58, 58, 58],
    'Blue Pigment':           [74, 111, 165],
    'Green Pigment':          [90, 125, 107],
    'Brown Pigment':          [122, 92, 58],
    'White Titanium Dioxide': [239, 239, 239],
    'None':                   null,
};
const FB_BASE_GREY  = [154, 154, 148];
const FB_BASE_WHITE = [239, 239, 239];

const fbLerpColor = (a, b, t) => [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
];

const fbComputePaverColor = (mix) => {
    const a = mix.addition_a;
    const portland = a.portland || 0;
    const white = a.white || 0;
    const custom = a.custom || 0;
    const total = portland + white + custom || 1;
    const greyFrac = (portland + custom) / total;
    const base = fbLerpColor(FB_BASE_WHITE, FB_BASE_GREY, greyFrac);

    const pct = mix.pigments.total_percent || 0;
    if (pct <= 0) return base;

    const p1 = FB_PIGMENT_COLORS[mix.pigments.pigment1_name];
    const p2 = FB_PIGMENT_COLORS[mix.pigments.pigment2_name];
    const parts1 = mix.pigments.pigment1_parts || 0;
    const parts2 = mix.pigments.pigment2_parts || 0;

    let pigmentColor;
    if (!p1 && !p2) return base;
    if (!p2 || parts2 === 0) {
        pigmentColor = p1 || base;
    } else if (!p1 || parts1 === 0) {
        pigmentColor = p2 || base;
    } else {
        const tp = parts1 + parts2;
        pigmentColor = [
            Math.round(p1[0] * parts1 / tp + p2[0] * parts2 / tp),
            Math.round(p1[1] * parts1 / tp + p2[1] * parts2 / tp),
            Math.round(p1[2] * parts1 / tp + p2[2] * parts2 / tp),
        ];
    }

    const saturation = Math.min(pct / 6.0, 1.0);
    return fbLerpColor(base, pigmentColor, saturation);
};

const fbApplyColorPreview = (colorPreview, mix) => {
    const header = document.querySelector('.header');
    if (!header) return;
    const hppEl = document.getElementById('header-profit-per-paver');
    // Snapshot positive/negative from the element's data attribute (set by updateUI)
    const isProfit = hppEl ? hppEl.dataset.profit === '1' : true;
    if (!colorPreview) {
        header.style.background = '';
        header.style.color = '';
        if (hppEl && hppEl.textContent !== '--') {
            hppEl.style.color = isProfit ? '#4ade80' : '#f87171';
        }
        return;
    }
    const rgb = fbComputePaverColor(mix);
    header.style.background = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    const lightBg = luminance > 0.5;
    header.style.color = lightBg ? '#1f2937' : '#ffffff';
    if (hppEl && hppEl.textContent !== '--') {
        hppEl.style.color = isProfit
            ? (lightBg ? '#166534' : '#4ade80')
            : (lightBg ? '#b91c1c' : '#f87171');
    }
};

const fbCreateDefaultMix = (name) => ({
    name,
    mix_parts: { cement: 1, sand: 2, coarse_agg: 3 },
    addition_a: { portland: 50, white: 50, custom: 0, custom_density: 1440 },
    addition_b: { sand: 50, stone_dust: 35, gcc400: 15, custom: 0, custom_density: 1600 },
    addition_c: { regular_gravel: 0, chip_gravel: 50, white_gravel: 50, stone_dust: 0, gcc400: 0, white_lime: 0, custom: 0, custom_density: 1600 },
    water: { wc_ratio: 0.45, wet_cast_factor: 1.57 },
    admixtures: { micro_fibre: 0.6, macro_fibre: 0, water_reducer: 3, hardener: 0 },
    pigments: { total_percent: 0, pigment1_name: 'Red Iron Oxide', pigment1_parts: 1, pigment2_name: 'None', pigment2_parts: 0 },
});

class ConcreteCalculator {
    constructor() {
        this.state = {
            project: {
                projectName: '',
                length: 2,
                width: 1,
                thickness: 2,
                quantity: 10,
                waste: 1.1,
                paversPerDay: 10,
                workers: 1,
                wageRate: 0,
                transport: 0,
                sellingPrice: 0
            },
            mixes: [fbCreateDefaultMix('Mix 1')],
            activeMix: 0,
            deletedMixes: [],
            settings: {
                businessName: '',
                businessAddress: '',
                businessPhone: '',
                businessEmail: '',
                businessTaxId: '',
                taxRate: 15,
            },
            noCosts: false,
            colorPreview: false,
            prices: {
                portland: 1750,
                white: 3810,
                sand: 5000,
                stoneDust: 1800,
                gcc400: 17891,
                regularGravel: 4000,
                chipGravel: 4000,
                whiteGravel: 1600,
                whiteLime: 55,
                microFibre: 1622.6,
                macroFibre: 2200,
                waterReducer: 1378.34,
                hardener: 0,
                portlandPqty: 1,
                whitePqty: 1,
                sandPqty: 1,
                stoneDustPqty: 1,
                gcc400Pqty: 1,
                regularGravelPqty: 1,
                chipGravelPqty: 1,
                whiteGravelPqty: 1,
                whiteLimePqty: 1,
                microFibrePqty: 1,
                macroFibrePqty: 1,
                waterReducerPqty: 1,
                hardenerPqty: 1,
                waterPqty: 1000,
                waterUnlimited: true
            }
        };
    }

    getActiveMix() {
        return this.state.mixes[this.state.activeMix];
    }

    addMix(name) {
        this.state.mixes.push(fbCreateDefaultMix(name || `Mix ${this.state.mixes.length + 1}`));
    }

    duplicateMix(index) {
        const copy = JSON.parse(JSON.stringify(this.state.mixes[index]));
        copy.name = copy.name + ' (copy)';
        this.state.mixes.splice(index + 1, 0, copy);
        if (this.state.activeMix > index) this.state.activeMix++;
    }

    deleteMix(index) {
        if (this.state.mixes.length <= 1) return;
        const removed = this.state.mixes.splice(index, 1)[0];
        this.state.deletedMixes.push({ mix: removed, original_index: index });
        if (this.state.activeMix >= this.state.mixes.length) this.state.activeMix = this.state.mixes.length - 1;
        else if (this.state.activeMix > index) this.state.activeMix--;
    }

    restoreMix(deletedIndex) {
        const entry = this.state.deletedMixes.splice(deletedIndex, 1)[0];
        const insertAt = Math.min(entry.original_index, this.state.mixes.length);
        this.state.mixes.splice(insertAt, 0, entry.mix);
        if (this.state.activeMix >= insertAt) this.state.activeMix++;
    }

    permanentlyDeleteMix(deletedIndex) {
        this.state.deletedMixes.splice(deletedIndex, 1);
    }

    setActiveMix(index) {
        if (index >= 0 && index < this.state.mixes.length) {
            this.state.activeMix = index;
        }
    }

    // ─── Rendering ───────────────────────────────────────────────────────────

    buildMixSectionHTML(mix, i) {
        const isActive = i === this.state.activeMix;
        const p1opts = FB_PIGMENT_OPTIONS.map(n => `<option value="${n}"${mix.pigments.pigment1_name === n ? ' selected' : ''}>${n}</option>`).join('');
        const p2opts = FB_PIGMENT_OPTIONS.map(n => `<option value="${n}"${mix.pigments.pigment2_name === n ? ' selected' : ''}>${n}</option>`).join('');
        const showPig = mix.pigments.total_percent > 0;
        const showP2parts = mix.pigments.pigment2_name !== 'None';
        return `
<div class="mix-section" id="mix-section-${i}">
  <div class="mix-section-header${isActive ? ' active-mix-header' : ''}" id="mix-header-${i}">
    <input type="text" class="mix-section-name" id="mix-name-${i}" value="${mix.name || 'Mix ' + (i+1)}" placeholder="Mix name">
    ${isActive ? '<span class="mix-active-badge">Active</span>' : ''}
    <button class="mix-section-btn" id="mix-dup-${i}" title="Duplicate">Dup</button>
    <button class="mix-section-btn delete" id="mix-del-${i}" title="Delete">Delete</button>
    <svg class="mix-chevron${isActive ? ' expanded' : ''}" id="mix-chevron-${i}" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>
  <div class="mix-section-body${isActive ? ' expanded' : ''}" id="mix-body-${i}">
    <!-- Addition A -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-header">
        <h2 class="card-title">Addition A - Cement</h2>
        <span class="validation-badge" id="add-a-validation-${i}">100% OK</span>
      </div>
      <div class="slider-group">
        <div class="slider-item"><div class="slider-label"><span>Portland Cement</span><span class="slider-value" id="add-a-portland-value-${i}">${mix.addition_a.portland}%</span></div><input type="range" id="add-a-portland-${i}" class="slider" min="0" max="100" value="${mix.addition_a.portland}"></div>
        <div class="slider-item"><div class="slider-label"><span>White Cement</span><span class="slider-value" id="add-a-white-value-${i}">${mix.addition_a.white}%</span></div><input type="range" id="add-a-white-${i}" class="slider" min="0" max="100" value="${mix.addition_a.white}"></div>
        <div class="slider-item"><div class="slider-label"><span>Custom</span><span class="slider-value" id="add-a-custom-value-${i}">${mix.addition_a.custom}%</span></div><input type="range" id="add-a-custom-${i}" class="slider" min="0" max="100" value="${mix.addition_a.custom}"></div>
      </div>
      <div class="input-group"><label class="input-label">Custom Density (kg/m³)</label><input type="number" id="add-a-custom-density-${i}" class="input-number" value="${mix.addition_a.custom_density}" min="500" max="3000"${mix.addition_a.custom === 0 ? ' disabled' : ''}></div>
      <div class="results-section">
        <div class="result-row"><span class="result-label">Portland</span><span class="result-value" id="cement-portland-${i}">0 L / 0 bags</span></div>
        <div class="result-row"><span class="result-label">White</span><span class="result-value" id="cement-white-${i}">0 L / 0 bags</span></div>
        <div class="result-row highlight"><span class="result-label">Total Cement</span><span class="result-value" id="cement-total-${i}">0 kg</span></div>
      </div>
    </div>
    <!-- Addition B -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-header">
        <h2 class="card-title">Addition B - Fine Agg</h2>
        <span class="validation-badge" id="add-b-validation-${i}">100% OK</span>
      </div>
      <div class="slider-group">
        <div class="slider-item"><div class="slider-label"><span>Sand</span><span class="slider-value" id="add-b-sand-value-${i}">${mix.addition_b.sand}%</span></div><input type="range" id="add-b-sand-${i}" class="slider" min="0" max="100" value="${mix.addition_b.sand}"></div>
        <div class="slider-item"><div class="slider-label"><span>Stone Dust</span><span class="slider-value" id="add-b-stone-dust-value-${i}">${mix.addition_b.stone_dust}%</span></div><input type="range" id="add-b-stone-dust-${i}" class="slider" min="0" max="100" value="${mix.addition_b.stone_dust}"></div>
        <div class="slider-item"><div class="slider-label"><span>GCC 400</span><span class="slider-value" id="add-b-gcc400-value-${i}">${mix.addition_b.gcc400}%</span></div><input type="range" id="add-b-gcc400-${i}" class="slider" min="0" max="100" value="${mix.addition_b.gcc400}"></div>
        <div class="slider-item"><div class="slider-label"><span>Custom</span><span class="slider-value" id="add-b-custom-value-${i}">${mix.addition_b.custom}%</span></div><input type="range" id="add-b-custom-${i}" class="slider" min="0" max="100" value="${mix.addition_b.custom}"></div>
      </div>
      <div class="results-section">
        <div class="result-row"><span class="result-label">Sand</span><span class="result-value" id="fine-sand-${i}">0 L</span></div>
        <div class="result-row"><span class="result-label">Stone Dust</span><span class="result-value" id="fine-stone-dust-${i}">0 L</span></div>
        <div class="result-row"><span class="result-label">GCC 400</span><span class="result-value" id="fine-gcc400-${i}">0 L</span></div>
        <div class="result-row highlight"><span class="result-label">Total Fine Agg</span><span class="result-value" id="fine-total-${i}">0 L</span></div>
      </div>
    </div>
    <!-- Addition C -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-header">
        <h2 class="card-title">Addition C - Coarse</h2>
        <span class="validation-badge" id="add-c-validation-${i}">100% OK</span>
      </div>
      <div class="slider-group">
        <div class="slider-item"><div class="slider-label"><span>Regular Gravel ¾″</span><span class="slider-value" id="add-c-regular-value-${i}">${mix.addition_c.regular_gravel}%</span></div><input type="range" id="add-c-regular-${i}" class="slider" min="0" max="100" value="${mix.addition_c.regular_gravel}"></div>
        <div class="slider-item"><div class="slider-label"><span>Chip Gravel ⅜″</span><span class="slider-value" id="add-c-chip-value-${i}">${mix.addition_c.chip_gravel}%</span></div><input type="range" id="add-c-chip-${i}" class="slider" min="0" max="100" value="${mix.addition_c.chip_gravel}"></div>
        <div class="slider-item"><div class="slider-label"><span>White Gravel</span><span class="slider-value" id="add-c-white-value-${i}">${mix.addition_c.white_gravel}%</span></div><input type="range" id="add-c-white-${i}" class="slider" min="0" max="100" value="${mix.addition_c.white_gravel}"></div>
        <div class="slider-item"><div class="slider-label"><span>Stone Dust</span><span class="slider-value" id="add-c-stone-dust-value-${i}">${mix.addition_c.stone_dust}%</span></div><input type="range" id="add-c-stone-dust-${i}" class="slider" min="0" max="100" value="${mix.addition_c.stone_dust}"></div>
        <div class="slider-item"><div class="slider-label"><span>GCC 400</span><span class="slider-value" id="add-c-gcc400-value-${i}">${mix.addition_c.gcc400}%</span></div><input type="range" id="add-c-gcc400-${i}" class="slider" min="0" max="100" value="${mix.addition_c.gcc400}"></div>
        <div class="slider-item"><div class="slider-label"><span>White Lime</span><span class="slider-value" id="add-c-white-lime-value-${i}">${mix.addition_c.white_lime}%</span></div><input type="range" id="add-c-white-lime-${i}" class="slider" min="0" max="100" value="${mix.addition_c.white_lime}"></div>
        <div class="slider-item"><div class="slider-label"><span>Custom</span><span class="slider-value" id="add-c-custom-value-${i}">${mix.addition_c.custom}%</span></div><input type="range" id="add-c-custom-${i}" class="slider" min="0" max="100" value="${mix.addition_c.custom}"></div>
      </div>
      <div class="input-group"><label class="input-label">Custom Density (kg/m³)</label><input type="number" id="add-c-custom-density-${i}" class="input-number" value="${mix.addition_c.custom_density}" min="500" max="3000"${mix.addition_c.custom === 0 ? ' disabled' : ''}></div>
      <div class="results-section">
        <div class="result-row highlight"><span class="result-label">Total Coarse</span><span class="result-value" id="coarse-total-${i}">0 L (0 yd³)</span></div>
      </div>
    </div>
    <!-- Mix Ratio -->
    <div class="card" style="margin-bottom:12px;">
      <h2 class="card-title">Mix Ratio</h2>
      <div class="grid-3">
        <div class="input-group"><label class="input-label">Cement</label><div class="input-row"><input type="number" id="mix-cement-${i}" class="input-number" value="${mix.mix_parts.cement}" min="1" max="10"><span class="input-unit">parts</span></div></div>
        <div class="input-group"><label class="input-label">Sand</label><div class="input-row"><input type="number" id="mix-sand-${i}" class="input-number" value="${mix.mix_parts.sand}" min="0" max="10"><span class="input-unit">parts</span></div></div>
        <div class="input-group"><label class="input-label">Coarse</label><div class="input-row"><input type="number" id="mix-coarse-${i}" class="input-number" value="${mix.mix_parts.coarse_agg}" min="0" max="10"><span class="input-unit">parts</span></div></div>
      </div>
      <div class="mix-ratio-display" id="mix-ratio-display-${i}">Mix: ${mix.mix_parts.cement}:${mix.mix_parts.sand}:${mix.mix_parts.coarse_agg}</div>
    </div>
    <!-- Water -->
    <div class="card water-card" style="margin-bottom:12px;">
      <h2 class="card-title">Water Required</h2>
      <div class="input-group"><label class="input-label">Water-Cement Ratio</label><div class="input-row"><input type="number" id="water-wc-ratio-${i}" class="input-number" value="${mix.water.wc_ratio}" min="0.3" max="0.7" step="0.01"></div></div>
      <div class="input-hint">0.20 and 0.30 ratios possible with super plasticizer</div>
      <div class="input-group"><label class="input-label">Wet Cast Factor</label><div class="input-row"><input type="number" id="water-wet-cast-${i}" class="input-number" value="${mix.water.wet_cast_factor}" min="1" max="2" step="0.01"><span class="input-unit">×</span></div></div>
      <div class="result-row highlight"><span class="result-label">Volume</span><span class="result-value" id="water-volume-${i}">0 L</span></div>
      <div class="result-row"><span class="result-label">Gallons</span><span class="result-value" id="water-gallons-${i}">0 gal</span></div>
      <div class="result-row"><span class="result-label">Weight</span><span class="result-value" id="water-weight-${i}">0 kg</span></div>
      <div class="water-split">
        <div class="split-title">Water Proportions (80/20 Mix)</div>
        <div class="result-row"><span class="result-label">80% Initial Water</span><span class="result-value" id="water-80-${i}">0 L</span></div>
        <div class="result-row"><span class="result-label">20% Final Water</span><span class="result-value" id="water-20-${i}">0 L</span></div>
      </div>
    </div>
    <!-- Volume results -->
    <div class="card volume-card" style="margin-bottom:12px;">
      <h2 class="card-title">Volume Calculations</h2>
      <div class="result-row"><span class="result-label">Per Paver</span><span class="result-value" id="volume-per-paver-${i}">0 in³</span></div>
      <div class="result-row highlight"><span class="result-label">Total Volume</span><span class="result-value" id="total-volume-${i}">0 L</span></div>
      <div class="result-row"><span class="result-label">Cubic Meters</span><span class="result-value" id="volume-m3-${i}">0 m³</span></div>
      <div class="result-row"><span class="result-label">Cubic Yards</span><span class="result-value" id="volume-yd3-${i}">0 yd³</span></div>
    </div>
    <!-- Admixtures -->
    <div class="card" style="margin-bottom:12px;">
      <h2 class="card-title">Admixtures</h2>
      <div class="input-group"><label class="input-label">Micro Fibre (g/L of mix)</label><div class="input-row"><input type="number" id="admixture-micro-${i}" class="input-number" value="${mix.admixtures.micro_fibre}" min="0" max="2" step="0.1"></div></div>
      <div class="input-hint">Standard: 0.6 g/L | Industrial: 0.9 g/L</div>
      <div class="input-group"><label class="input-label">Macro Fibre (% of cement)</label><div class="input-row"><input type="number" id="admixture-macro-${i}" class="input-number" value="${mix.admixtures.macro_fibre}" min="0" max="5" step="0.1"></div></div>
      <div class="input-group"><label class="input-label">Water Reducer (mL/kg of cement)</label><div class="input-row"><input type="number" id="admixture-water-reducer-${i}" class="input-number" value="${mix.admixtures.water_reducer}" min="0" max="10" step="0.5"></div></div>
      <div class="input-hint">Low: 0.65–1.5 mL/kg | Standard: 1.5–2.5 mL/kg | High: 2.5–3.9 mL/kg | 4.0+ consult supplier</div>
      <div class="input-group"><label class="input-label">Hardener (% of cement)</label><div class="input-row"><input type="number" id="admixture-hardener-${i}" class="input-number" value="${mix.admixtures.hardener}" min="0" max="5" step="0.1"></div></div>
      <div class="input-hint" id="hardener-zero-price-note-${i}" style="display:none; color:#d97706;">Hardener price is JMD 0. Set in Settings tab to include in costs.</div>
      <div class="results-section">
        <div class="result-row"><span class="result-label">Micro Fibre</span><span class="result-value" id="admixture-micro-result-${i}">0 g (0 kg)</span></div>
        <div class="result-row" id="admixture-macro-row-${i}" style="display:none;"><span class="result-label">Macro Fibre</span><span class="result-value" id="admixture-macro-result-${i}">0 kg</span></div>
        <div class="result-row highlight"><span class="result-label">Water Reducer</span><span class="result-value" id="admixture-water-reducer-result-${i}">0 mL</span></div>
        <div class="result-row"><span class="result-label">Water Mixer (5:1 ratio)</span><span class="result-value" id="admixture-mixer-water-${i}">0 mL</span></div>
        <div class="result-row"><span class="result-label">Total Mixer Volume</span><span class="result-value" id="admixture-mixer-total-${i}">0 mL (0 L)</span></div>
        <div class="result-row" id="admixture-hardener-row-${i}" style="display:none;"><span class="result-label">Hardener</span><span class="result-value" id="admixture-hardener-result-${i}">0 kg</span></div>
      </div>
    </div>
    <!-- Pigments -->
    <div class="card" style="margin-bottom:0;">
      <h2 class="card-title">Pigments</h2>
      <div class="input-group"><label class="input-label">Total Pigment (% of cement)</label><div class="input-row"><input type="number" id="pigment-total-${i}" class="input-number" value="${mix.pigments.total_percent}" min="0" max="10" step="0.5"></div></div>
      <div id="pigment-section-${i}" style="display:${showPig ? 'block' : 'none'};">
        <div class="pigment-input">
          <label class="input-label">Pigment 1</label>
          <select id="pigment-1-name-${i}" class="input-select">${p1opts}</select>
          <div class="input-group"><label class="input-label">Parts</label><input type="number" id="pigment-1-parts-${i}" class="input-number" value="${mix.pigments.pigment1_parts}" min="0" max="10"></div>
        </div>
        <div class="pigment-input">
          <label class="input-label">Pigment 2</label>
          <select id="pigment-2-name-${i}" class="input-select">${p2opts}</select>
          <div class="input-group" id="pigment-2-parts-group-${i}" style="display:${showP2parts ? 'block' : 'none'};"><label class="input-label">Parts</label><input type="number" id="pigment-2-parts-${i}" class="input-number" value="${mix.pigments.pigment2_parts}" min="0" max="10"></div>
        </div>
        <div class="results-section">
          <div class="result-row"><span class="result-label" id="pigment-1-label-${i}">${mix.pigments.pigment1_name}</span><span class="result-value" id="pigment-1-result-${i}">0 mL (0 L / 0 kg)</span></div>
          <div class="result-row" id="pigment-2-row-${i}" style="display:${showP2parts ? 'flex' : 'none'};"><span class="result-label" id="pigment-2-label-${i}">${mix.pigments.pigment2_name}</span><span class="result-value" id="pigment-2-result-${i}">0 mL (0 L / 0 kg)</span></div>
          <div class="result-row highlight"><span class="result-label">Total Pigment</span><span class="result-value" id="pigment-total-result-${i}">0 kg</span></div>
        </div>
      </div>
    </div>
  </div>
</div>`;
    }

    wireMixSectionEvents(i, onUpdate) {
        const mix = this.state.mixes[i];
        const gEl = (id) => document.getElementById(id);

        const header = gEl(`mix-header-${i}`);
        const body = gEl(`mix-body-${i}`);
        const chevron = gEl(`mix-chevron-${i}`);
        if (header) {
            header.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                const expanded = body.classList.toggle('expanded');
                chevron.classList.toggle('expanded', expanded);
                header.classList.toggle('expanded', expanded);
                if (i !== this.state.activeMix) {
                    this.setActiveMix(i);
                    this.renderMixSections(onUpdate);
                    this.renderMixSelector();
                    onUpdate();
                }
            });
        }

        const nameEl = gEl(`mix-name-${i}`);
        if (nameEl) nameEl.addEventListener('input', (e) => {
            this.state.mixes[i].name = e.target.value;
            this.renderMixSelector();
            onUpdate();
        });

        const dupBtn = gEl(`mix-dup-${i}`);
        if (dupBtn) dupBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.duplicateMix(i);
            this.renderMixSections(onUpdate);
            this.renderMixSelector();
            onUpdate();
        });

        const delBtn = gEl(`mix-del-${i}`);
        if (delBtn) {
            let confirmTimer = null;
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (delBtn.classList.contains('confirm')) {
                    clearTimeout(confirmTimer);
                    this.deleteMix(i);
                    this.renderMixSections(onUpdate);
                    this.renderMixSelector();
                    onUpdate();
                } else {
                    delBtn.classList.add('confirm');
                    delBtn.textContent = 'Confirm?';
                    confirmTimer = setTimeout(() => {
                        delBtn.classList.remove('confirm');
                        delBtn.textContent = 'Delete';
                    }, 3000);
                }
            });
        }

        const wireMixNum = (sfx, setter) => {
            const el = gEl(`${sfx}-${i}`);
            if (el) el.addEventListener('input', (e) => {
                setter(parseFloat(e.target.value) || 0);
                onUpdate();
            });
        };

        wireMixNum('mix-cement', v => { mix.mix_parts.cement = v; const d = gEl(`mix-ratio-display-${i}`); if (d) d.textContent = `Mix: ${mix.mix_parts.cement}:${mix.mix_parts.sand}:${mix.mix_parts.coarse_agg}`; });
        wireMixNum('mix-sand', v => { mix.mix_parts.sand = v; const d = gEl(`mix-ratio-display-${i}`); if (d) d.textContent = `Mix: ${mix.mix_parts.cement}:${mix.mix_parts.sand}:${mix.mix_parts.coarse_agg}`; });
        wireMixNum('mix-coarse', v => { mix.mix_parts.coarse_agg = v; const d = gEl(`mix-ratio-display-${i}`); if (d) d.textContent = `Mix: ${mix.mix_parts.cement}:${mix.mix_parts.sand}:${mix.mix_parts.coarse_agg}`; });
        wireMixNum('water-wc-ratio', v => { mix.water.wc_ratio = v; });
        wireMixNum('water-wet-cast', v => { mix.water.wet_cast_factor = v; });
        wireMixNum('admixture-micro', v => { mix.admixtures.micro_fibre = v; });
        wireMixNum('admixture-macro', v => { mix.admixtures.macro_fibre = v; });
        wireMixNum('admixture-water-reducer', v => { mix.admixtures.water_reducer = v; });
        wireMixNum('admixture-hardener', v => { mix.admixtures.hardener = v; });

        const pigTotalEl = gEl(`pigment-total-${i}`);
        if (pigTotalEl) pigTotalEl.addEventListener('input', (e) => {
            mix.pigments.total_percent = parseFloat(e.target.value) || 0;
            const ps = gEl(`pigment-section-${i}`);
            if (ps) ps.style.display = mix.pigments.total_percent > 0 ? 'block' : 'none';
            onUpdate();
        });

        const pig1NameEl = gEl(`pigment-1-name-${i}`);
        if (pig1NameEl) pig1NameEl.addEventListener('change', (e) => { mix.pigments.pigment1_name = e.target.value; onUpdate(); });
        wireMixNum('pigment-1-parts', v => { mix.pigments.pigment1_parts = v; });

        const pig2NameEl = gEl(`pigment-2-name-${i}`);
        if (pig2NameEl) pig2NameEl.addEventListener('change', (e) => {
            mix.pigments.pigment2_name = e.target.value;
            const ppg = gEl(`pigment-2-parts-group-${i}`);
            const pr = gEl(`pigment-2-row-${i}`);
            if (ppg) ppg.style.display = e.target.value !== 'None' ? 'block' : 'none';
            if (pr) pr.style.display = e.target.value !== 'None' ? 'flex' : 'none';
            if (e.target.value === 'None') mix.pigments.pigment2_parts = 0;
            onUpdate();
        });
        wireMixNum('pigment-2-parts', v => { mix.pigments.pigment2_parts = v; });

        const fbUpdateValidation = (addObj, badgeId) => {
            const total = Object.entries(addObj)
                .filter(([k]) => !k.includes('density'))
                .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
            const isValid = Math.abs(total - 100) < 0.01;
            const el = gEl(badgeId);
            if (el) {
                el.textContent = `${Math.round(total)}% ${isValid ? 'OK' : '!'}`;
                el.style.backgroundColor = isValid ? '#dcfce7' : '#fee2e2';
                el.style.color = isValid ? '#166534' : '#991b1b';
            }
        };

        const wireSlider = (sfx, setter) => {
            const el = gEl(`${sfx}-${i}`);
            const valEl = gEl(`${sfx}-value-${i}`);
            const letter = sfx[4]; // 'a', 'b', or 'c'
            const addObj = letter === 'a' ? mix.addition_a : letter === 'b' ? mix.addition_b : mix.addition_c;
            if (el) el.addEventListener('input', (e) => {
                setter(parseFloat(e.target.value) || 0);
                if (valEl) valEl.textContent = `${e.target.value}%`;
                fbUpdateValidation(addObj, `add-${letter}-validation-${i}`);
                onUpdate();
            });
        };

        wireSlider('add-a-portland', v => { mix.addition_a.portland = v; });
        wireSlider('add-a-white', v => { mix.addition_a.white = v; });
        wireSlider('add-a-custom', v => {
            mix.addition_a.custom = v;
            const densEl = gEl(`add-a-custom-density-${i}`);
            if (densEl) densEl.disabled = v === 0;
        });
        wireMixNum('add-a-custom-density', v => { mix.addition_a.custom_density = v; });

        wireSlider('add-b-sand', v => { mix.addition_b.sand = v; });
        wireSlider('add-b-stone-dust', v => { mix.addition_b.stone_dust = v; });
        wireSlider('add-b-gcc400', v => { mix.addition_b.gcc400 = v; });
        wireSlider('add-b-custom', v => {
            mix.addition_b.custom = v;
            const densEl = gEl(`add-b-custom-density-${i}`);
            if (densEl) densEl.disabled = v === 0;
        });
        wireMixNum('add-b-custom-density', v => { mix.addition_b.custom_density = v; });

        wireSlider('add-c-regular', v => { mix.addition_c.regular_gravel = v; });
        wireSlider('add-c-chip', v => { mix.addition_c.chip_gravel = v; });
        wireSlider('add-c-white', v => { mix.addition_c.white_gravel = v; });
        wireSlider('add-c-stone-dust', v => { mix.addition_c.stone_dust = v; });
        wireSlider('add-c-gcc400', v => { mix.addition_c.gcc400 = v; });
        wireSlider('add-c-white-lime', v => { mix.addition_c.white_lime = v; });
        wireSlider('add-c-custom', v => {
            mix.addition_c.custom = v;
            const densEl = gEl(`add-c-custom-density-${i}`);
            if (densEl) densEl.disabled = v === 0;
        });
        wireMixNum('add-c-custom-density', v => { mix.addition_c.custom_density = v; });
    }

    renderRestoreSection(container, onUpdate) {
        if (this.state.deletedMixes.length === 0) return;
        const gEl = (id) => document.getElementById(id);
        const restoreDiv = document.createElement('div');
        restoreDiv.className = 'restore-section';
        restoreDiv.innerHTML = `
<div class="restore-section-header" id="restore-header">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  Restore Mix (${this.state.deletedMixes.length})
</div>
<div class="restore-section-body" id="restore-body">
${this.state.deletedMixes.map((entry, di) => `
  <div class="restore-mix-item">
    <span class="restore-mix-name">${entry.mix.name || 'Unnamed'}</span>
    <button class="mix-section-btn" id="restore-btn-${di}">Restore</button>
    <button class="mix-section-btn delete" id="restore-del-btn-${di}">Delete</button>
  </div>`).join('')}
</div>`;
        container.appendChild(restoreDiv);

        this.state.deletedMixes.forEach((_, di) => {
            const rBtn = gEl(`restore-btn-${di}`);
            if (rBtn) rBtn.addEventListener('click', () => {
                this.restoreMix(di);
                this.renderMixSections(onUpdate);
                this.renderMixSelector();
                onUpdate();
            });
            const dBtn = gEl(`restore-del-btn-${di}`);
            if (dBtn) {
                let ct = null;
                dBtn.addEventListener('click', () => {
                    if (dBtn.classList.contains('confirm')) {
                        clearTimeout(ct);
                        this.permanentlyDeleteMix(di);
                        this.renderMixSections(onUpdate);
                        onUpdate();
                    } else {
                        dBtn.classList.add('confirm');
                        dBtn.textContent = 'Confirm?';
                        ct = setTimeout(() => { dBtn.classList.remove('confirm'); dBtn.textContent = 'Delete'; }, 3000);
                    }
                });
            }
        });
    }

    renderMixSections(onUpdate) {
        const container = document.getElementById('mix-sections-container');
        if (!container) return;
        container.innerHTML = '';

        this.state.mixes.forEach((mix, i) => {
            const div = document.createElement('div');
            div.innerHTML = this.buildMixSectionHTML(mix, i);
            container.appendChild(div.firstElementChild);
            this.wireMixSectionEvents(i, onUpdate);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-mix';
        addBtn.textContent = '+ Add Mix';
        addBtn.addEventListener('click', () => {
            this.addMix();
            this.renderMixSections(onUpdate);
            this.renderMixSelector();
            onUpdate();
        });
        container.appendChild(addBtn);

        this.renderRestoreSection(container, onUpdate);
    }

    renderMixSelector() {
        const sel = document.getElementById('active-mix-select');
        if (!sel) return;
        sel.innerHTML = '';
        this.state.mixes.forEach((mix, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = mix.name || `Mix ${idx + 1}`;
            if (idx === this.state.activeMix) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    // ─── Calculations ────────────────────────────────────────────────────────

    // Volume calculations — mirrors calculate_volumes() in lib.rs
    calculateVolume() {
        const { length, width, thickness, quantity, waste } = this.state.project;

        const volumePerPaver = (length * 12) * (width * 12) * thickness; // in³
        const totalVolumeIn3 = volumePerPaver * quantity;
        const totalVolumeMl = totalVolumeIn3 * FB_INCH_TO_ML;
        const adjustedVolumeMl = totalVolumeMl * waste;
        const totalVolumeL = adjustedVolumeMl / 1000;
        const totalVolumeM3 = totalVolumeL / 1000;
        const totalVolumeYd3 = totalVolumeM3 * FB_M_TO_YD;

        return { perPaver: volumePerPaver, totalIn3: totalVolumeIn3, totalL: totalVolumeL, totalM3: totalVolumeM3, totalYd3: totalVolumeYd3 };
    }

    // Mix proportions
    calculateMixProportions() {
        const mix = this.getActiveMix();
        const { cement, sand, coarse_agg } = mix.mix_parts;
        const total = cement + sand + coarse_agg;
        return { cement: cement / total, sand: sand / total, coarse: coarse_agg / total };
    }

    // Material quantities — mirrors calculate_cement/fine/coarse/water in lib.rs
    calculateMaterials() {
        const volume = this.calculateVolume();
        const mixProp = this.calculateMixProportions();
        const activeMix = this.getActiveMix();
        const { wet_cast_factor: wetCast, wc_ratio: wcRatio } = activeMix.water;
        const totalM3 = volume.totalM3;

        // ── Cement (Addition A) ─────────────────────────────────────────────
        const a = activeMix.addition_a;
        const baseCementVolM3 = totalM3 * mixProp.cement * wetCast;
        const baseCementWeightKg = baseCementVolM3 * FB_PORTLAND_DENSITY;

        const portlandWeightKg = baseCementWeightKg * (a.portland / 100);
        const whiteWeightKg = baseCementWeightKg * (a.white / 100);
        const portlandVolumeL = portlandWeightKg / FB_PORTLAND_DENSITY * 1000;
        const whiteVolumeL = whiteWeightKg / FB_WHITE_CEMENT_DENSITY * 1000;
        const portlandBags = portlandWeightKg * FB_KG_TO_LB / FB_PORTLAND_BAG_LB;
        const whiteBags = whiteWeightKg * FB_KG_TO_LB / FB_WHITE_BAG_LB;
        const totalCementKg = baseCementWeightKg;

        // ── Fine aggregates (Addition B) ────────────────────────────────────
        const b = activeMix.addition_b;
        const addBVolM3 = totalM3 * mixProp.sand * wetCast;
        const addBVolL = addBVolM3 * 1000;

        const sandVolL = addBVolL * (b.sand / 100);
        const stoneDustBVolL = addBVolL * (b.stone_dust / 100);
        const gcc400BVolL = addBVolL * (b.gcc400 / 100);
        const customBVolL = addBVolL * (b.custom / 100);

        const sandWeightKg = sandVolL * FB_SAND_DENSITY / 1000;
        const stoneDustBWeightKg = stoneDustBVolL * FB_STONE_DUST_DENSITY / 1000;
        const gcc400BWeightKg = gcc400BVolL * FB_GCC400_DENSITY / 1000;
        const customBWeightKg = customBVolL * (b.custom_density || 1600) / 1000;
        const totalFineWeightKg = sandWeightKg + stoneDustBWeightKg + gcc400BWeightKg + customBWeightKg;

        // ── Coarse aggregates (Addition C) ──────────────────────────────────
        const c = activeMix.addition_c;
        const addCVolM3 = totalM3 * mixProp.coarse * wetCast;
        const addCVolL = addCVolM3 * 1000;

        const aggCalc = (pct, density) => {
            const volM3 = addCVolM3 * (pct / 100);
            return { volL: volM3 * 1000, volM3, weightKg: volM3 * density };
        };

        const regular = aggCalc(c.regular_gravel, FB_REGULAR_GRAVEL_DENSITY);
        const chip = aggCalc(c.chip_gravel, FB_CHIP_GRAVEL_DENSITY);
        const whiteGravel = aggCalc(c.white_gravel, FB_WHITE_GRAVEL_DENSITY);
        const stoneDustC = aggCalc(c.stone_dust, FB_STONE_DUST_DENSITY);
        const gcc400C = aggCalc(c.gcc400, FB_GCC400_DENSITY);
        const whiteLime = aggCalc(c.white_lime, FB_WHITE_LIME_DENSITY);
        const customC = aggCalc(c.custom, c.custom_density || 1600);

        const totalCoarseWeightKg = regular.weightKg + chip.weightKg + whiteGravel.weightKg +
            stoneDustC.weightKg + gcc400C.weightKg + whiteLime.weightKg + customC.weightKg;

        // ── Water ─────────────────────────────────────────────────────────
        const waterWeightKg = totalCementKg * wcRatio;
        const waterVolumeL = waterWeightKg;
        const waterGallons = waterVolumeL * FB_L_TO_GAL;

        return {
            portland: { volumeL: portlandVolumeL, weightKg: portlandWeightKg, bags: portlandBags },
            white:    { volumeL: whiteVolumeL,    weightKg: whiteWeightKg,    bags: whiteBags },
            totalCementKg,
            sand:       { volumeL: sandVolL,         weightKg: sandWeightKg },
            stoneDustB: { volumeL: stoneDustBVolL,   weightKg: stoneDustBWeightKg },
            gcc400B:    { volumeL: gcc400BVolL,      weightKg: gcc400BWeightKg },
            totalFineL: addBVolL,
            totalFineWeightKg,
            regularGravel: regular,
            chipGravel: chip,
            whiteGravel,
            stoneDustC,
            gcc400C,
            whiteLime,
            totalCoarseL: addCVolL,
            totalCoarseWeightKg,
            water: { volumeL: waterVolumeL, weightKg: waterWeightKg, gallons: waterGallons, water80L: waterVolumeL * 0.8, water20L: waterVolumeL * 0.2 },
            totalConcreteKg: totalCementKg + totalFineWeightKg + totalCoarseWeightKg + waterWeightKg
        };
    }

    // Admixtures — mirrors calculate_admixtures() in lib.rs
    calculateAdmixtures() {
        const materials = this.calculateMaterials();
        const totalCementKg = materials.totalCementKg;
        const totalVolumeM3 = this.calculateVolume().totalM3;
        const adm = this.getActiveMix().admixtures;
        const { micro_fibre: micro, macro_fibre: macro, water_reducer: waterReducer, hardener } = adm;

        const microFibreKg = totalVolumeM3 * micro;
        const microFibreG = microFibreKg * 1000;
        const macroFibreKg = totalCementKg * (macro / 100);
        const macroFibreMl = macroFibreKg > 0 ? macroFibreKg * 1000 / FB_MACRO_FIBRE_DENSITY : 0;
        const waterReducerMl = totalCementKg * waterReducer;
        const waterReducerKg = waterReducerMl * FB_WATER_REDUCER_DENSITY / 1000;
        const hardenerKg = totalCementKg * (hardener / 100);
        const hardenerMl = hardenerKg > 0 ? hardenerKg * 1000 / FB_HARDENER_DENSITY : 0;
        const waterMixerMl = waterReducerMl * 5;
        const totalMixerMl = waterReducerMl + waterMixerMl;

        return {
            microFibreKg, microFibreG,
            macroFibreKg, macroFibreMl,
            waterReducerMl, waterReducerKg,
            hardenerKg, hardenerMl,
            waterMixerMl,
            totalMixerMl, totalMixerL: totalMixerMl / 1000
        };
    }

    // Pigment calculations — mirrors calculate_pigments() in lib.rs
    calculatePigments() {
        const m = this.calculateMaterials();
        const totalCementKg = m.totalCementKg;
        const pg = this.getActiveMix().pigments;
        const totalPercent = pg.total_percent;

        if (totalPercent <= 0) {
            return { totalKg: 0, pigment1Kg: 0, pigment1L: 0, pigment2Kg: 0, pigment2L: 0, pigment1Cost: 0, pigment2Cost: 0 };
        }

        const totalPigmentKg = totalCementKg * (totalPercent / 100);
        const totalParts = (pg.pigment1_parts || 0) + (pg.pigment2_parts || 0);

        const p1Parts = totalParts > 0 ? (pg.pigment1_parts || 0) / totalParts : 1;
        const p2Parts = totalParts > 0 ? (pg.pigment2_parts || 0) / totalParts : 0;

        const pigment1Kg = totalPigmentKg * p1Parts;
        const pigment2Kg = totalPigmentKg * p2Parts;

        const d1 = FB_PIGMENT_DENSITY[pg.pigment1_name] || 1.0;
        const d2 = FB_PIGMENT_DENSITY[pg.pigment2_name] || 1.0;

        const pigment1L = pigment1Kg / d1;
        const pigment2L = pigment2Kg / d2;

        const pr1 = FB_PIGMENT_PRICE[pg.pigment1_name] || 0;
        const pr2 = FB_PIGMENT_PRICE[pg.pigment2_name] || 0;

        return {
            totalKg: totalPigmentKg,
            pigment1Kg, pigment1L, pigment2Kg, pigment2L,
            pigment1Cost: pigment1L * pr1,
            pigment2Cost: pigment2L * pr2
        };
    }

    // Cost calculations — mirrors calculate_costs() in lib.rs
    calculateCosts() {
        const m = this.calculateMaterials();
        const adm = this.calculateAdmixtures();
        const pig = this.calculatePigments();
        const { quantity, paversPerDay, wageRate, workers, transport } = this.state.project;
        const totalWageRate = wageRate * (workers || 1);
        const p = this.state.prices;

        const lToYd3 = v => (v / 1000) * FB_M_TO_YD;
        const m3ToYd3 = v => v * FB_M_TO_YD;

        const portlandCost    = m.portland.bags * p.portland;
        const whiteCost       = m.white.bags * p.white;

        const sandCost        = lToYd3(m.sand.volumeL) * p.sand;
        const stoneDustBCost  = lToYd3(m.stoneDustB.volumeL) * p.stoneDust;
        const gcc400BCost     = lToYd3(m.gcc400B.volumeL) * p.gcc400;
        const addBCost        = sandCost + stoneDustBCost + gcc400BCost;

        const regularCost     = m3ToYd3(m.regularGravel.volM3) * p.regularGravel;
        const chipCost        = m3ToYd3(m.chipGravel.volM3) * p.chipGravel;
        const whiteGravelCost = m3ToYd3(m.whiteGravel.volM3) * p.whiteGravel;
        const stoneDustCCost  = m3ToYd3(m.stoneDustC.volM3) * p.stoneDust;
        const gcc400CCost     = m3ToYd3(m.gcc400C.volM3) * p.gcc400;
        const whiteLimeCost   = m3ToYd3(m.whiteLime.volM3) * p.whiteLime;
        const addCCost        = regularCost + chipCost + whiteGravelCost + stoneDustCCost + gcc400CCost + whiteLimeCost;

        const microFibreCost    = adm.microFibreKg * p.microFibre;
        const macroFibreCost    = adm.macroFibreKg * p.macroFibre;
        const waterReducerCost  = adm.waterReducerKg * p.waterReducer;
        const hardenerCost      = adm.hardenerKg * p.hardener;

        const pigment1Cost = pig.pigment1Cost;
        const pigment2Cost = pig.pigment2Cost;

        const totalMaterial = portlandCost + whiteCost + addBCost + addCCost +
            microFibreCost + macroFibreCost + waterReducerCost + hardenerCost +
            pigment1Cost + pigment2Cost;

        const materialPerPaver   = quantity > 0 ? totalMaterial / quantity : 0;
        const labourPerPaver     = paversPerDay > 0 ? totalWageRate / paversPerDay : 0;
        const transportPerPaver  = quantity > 0 ? transport / quantity : 0;
        const totalPerPaver      = materialPerPaver + labourPerPaver + transportPerPaver;
        const grandTotal         = totalPerPaver * quantity;

        return {
            portlandCost, whiteCost,
            sandCost, stoneDustBCost, gcc400BCost, addBCost,
            regularCost, chipCost, whiteGravelCost, stoneDustCCost, gcc400CCost, whiteLimeCost, addCCost,
            microFibreCost, macroFibreCost, waterReducerCost, hardenerCost,
            pigment1Cost, pigment2Cost,
            totalMaterial, materialPerPaver, labourPerPaver, transportPerPaver, totalPerPaver, grandTotal
        };
    }

    // Update UI with calculated values — writes to indexed IDs for mix results
    updateUI() {
        const vol = this.calculateVolume();
        const m   = this.calculateMaterials();
        const adm = this.calculateAdmixtures();
        const c   = this.calculateCosts();
        const mix = this.getActiveMix();
        const i   = this.state.activeMix;

        const fmt = (v, d=1) => isNaN(v) ? '0' : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
        const fmtC = v => isNaN(v) ? 'JMD 0' : 'JMD ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Indexed helpers for active mix section results
        const sEl = (sfx, v) => { const el = document.getElementById(`${sfx}-${i}`); if (el) el.textContent = v; };
        const sElStyle = (sfx, prop, v) => { const el = document.getElementById(`${sfx}-${i}`); if (el) el.style[prop] = v; };

        // Volume (indexed)
        sEl('volume-per-paver', `${fmt(vol.perPaver)} in³`);
        sEl('total-volume', `${fmt(vol.totalL)} L`);
        sEl('volume-m3', `${fmt(vol.totalM3, 4)} m³`);
        sEl('volume-yd3', `${fmt(vol.totalYd3, 3)} yd³`);

        // Cement (indexed)
        sEl('cement-portland', `${fmt(m.portland.volumeL)} L / ${fmt(m.portland.bags, 1)} bags`);
        sEl('cement-white',    `${fmt(m.white.volumeL)} L / ${fmt(m.white.bags, 1)} bags`);
        sEl('cement-total',    `${fmt(m.totalCementKg)} kg`);

        // Fine aggregates (indexed)
        sEl('fine-sand',       `${fmt(m.sand.volumeL)} L`);
        sEl('fine-stone-dust', `${fmt(m.stoneDustB.volumeL)} L`);
        sEl('fine-gcc400',     `${fmt(m.gcc400B.volumeL)} L`);
        sEl('fine-total',      `${fmt(m.totalFineL)} L`);

        // Coarse (indexed)
        sEl('coarse-total', `${fmt(m.totalCoarseL)} L (${fmt(m.totalCoarseL / 764.555, 3)} yd³)`);

        // Water (indexed)
        sEl('water-volume',  `${fmt(m.water.volumeL)} L`);
        sEl('water-gallons', `${fmt(m.water.gallons, 2)} gal`);
        sEl('water-weight',  `${fmt(m.water.weightKg)} kg`);
        sEl('water-80',      `${fmt(m.water.water80L)} L`);
        sEl('water-20',      `${fmt(m.water.water20L)} L`);

        // Admixtures (indexed)
        sEl('admixture-micro-result',         `${fmt(adm.microFibreG)} g (${fmt(adm.microFibreKg, 3)} kg)`);
        sElStyle('admixture-macro-row', 'display', adm.macroFibreKg > 0 ? 'flex' : 'none');
        if (adm.macroFibreKg > 0) sEl('admixture-macro-result', `${fmt(adm.macroFibreKg, 3)} kg`);
        sEl('admixture-water-reducer-result', `${fmt(adm.waterReducerMl, 1)} mL`);
        sEl('admixture-mixer-water',          `${fmt(adm.waterMixerMl, 1)} mL`);
        sEl('admixture-mixer-total',          `${fmt(adm.totalMixerMl, 1)} mL (${fmt(adm.totalMixerL, 3)} L)`);
        sElStyle('admixture-hardener-row', 'display', adm.hardenerKg > 0 ? 'flex' : 'none');
        if (adm.hardenerKg > 0) sEl('admixture-hardener-result', `${fmt(adm.hardenerKg, 3)} kg`);

        // Hardener zero-price warning (indexed)
        sElStyle('hardener-zero-price-note', 'display', (mix.admixtures.hardener > 0 && this.state.prices.hardener === 0) ? 'block' : 'none');

        // Pigments (indexed)
        const pig = this.calculatePigments();
        const showPigments = mix.pigments.total_percent > 0;
        sElStyle('pigment-section', 'display', showPigments ? 'block' : 'none');
        if (showPigments) {
            sEl('pigment-1-label', mix.pigments.pigment1_name);
            sEl('pigment-1-result', `${fmt(pig.pigment1L * 1000, 1)} mL (${fmt(pig.pigment1L, 3)} L / ${fmt(pig.pigment1Kg, 3)} kg)`);
            const showP2 = mix.pigments.pigment2_name !== 'None' && (mix.pigments.pigment2_parts || 0) > 0;
            sElStyle('pigment-2-row', 'display', showP2 ? 'flex' : 'none');
            if (showP2) {
                sEl('pigment-2-label', mix.pigments.pigment2_name);
                sEl('pigment-2-result', `${fmt(pig.pigment2L * 1000, 1)} mL (${fmt(pig.pigment2L, 3)} L / ${fmt(pig.pigment2Kg, 3)} kg)`);
            }
            sEl('pigment-total-result', `${fmt(pig.totalKg, 3)} kg`);
        }

        // Pigment visibility
        sElStyle('pigment-2-parts-group', 'display', mix.pigments.pigment2_name !== 'None' ? 'block' : 'none');

        // Slider percentage labels (indexed)
        sEl('add-a-portland-value', `${mix.addition_a.portland}%`);
        sEl('add-a-white-value',    `${mix.addition_a.white}%`);
        sEl('add-a-custom-value',   `${mix.addition_a.custom}%`);
        sEl('add-b-sand-value',     `${mix.addition_b.sand}%`);
        sEl('add-b-stone-dust-value', `${mix.addition_b.stone_dust}%`);
        sEl('add-b-gcc400-value',   `${mix.addition_b.gcc400}%`);
        sEl('add-b-custom-value',   `${mix.addition_b.custom}%`);
        sEl('add-c-regular-value',  `${mix.addition_c.regular_gravel}%`);
        sEl('add-c-chip-value',     `${mix.addition_c.chip_gravel}%`);
        sEl('add-c-white-value',    `${mix.addition_c.white_gravel}%`);
        sEl('add-c-stone-dust-value', `${mix.addition_c.stone_dust}%`);
        sEl('add-c-gcc400-value',   `${mix.addition_c.gcc400}%`);
        sEl('add-c-white-lime-value', `${mix.addition_c.white_lime}%`);
        sEl('add-c-custom-value',   `${mix.addition_c.custom}%`);

        // Cost summary (non-indexed)
        this.updateElement('labour-cost-per-paver',     fmtC(c.labourPerPaver));
        this.updateElement('transport-cost-per-paver-display', fmtC(c.transportPerPaver));

        var qty = this.state.project.quantity;
        this.updateElement('cost-summary-qty', qty);
        this.updateElement('cost-summary-grand-qty', qty);
        this.updateElement('cost-summary-div-qty', fmtC(c.totalMaterial) + ' \u00f7 ' + qty);
        this.updateElement('cost-total-sub-detail', 'Material: ' + fmtC(c.materialPerPaver) + ' + Labour: ' + fmtC(c.labourPerPaver) + ' + Transport: ' + fmtC(c.transportPerPaver));
        this.updateElement('cost-material-total', fmtC(c.totalMaterial));
        this.updateElement('cost-material-per-paver', fmtC(c.materialPerPaver));
        this.updateElement('cost-total-per-paver', fmtC(c.totalPerPaver));
        this.updateElement('cost-grand-total', fmtC(c.grandTotal));

        // Cost breakdown (non-indexed)
        this.updateElement('cost-portland',      fmtC(c.portlandCost));
        this.updateElement('cost-white',         fmtC(c.whiteCost));
        this.updateElement('cost-sand',          fmtC(c.sandCost));
        this.updateElement('cost-stone-dust-b',  fmtC(c.stoneDustBCost));
        this.updateElement('cost-gcc400-b',      fmtC(c.gcc400BCost));
        this.updateElement('cost-add-b-total',   fmtC(c.addBCost));

        // Update cost breakdown labels with actual quantities
        this.updateElement('cost-portland-label', `Portland (${fmt(m.portland.bags, 1)} bags)`);
        this.updateElement('cost-white-label', `White Cement (${fmt(m.white.bags, 1)} bags)`);
        this.updateElement('cost-gcc400-b-label', `GCC 400 (${fmt(m.gcc400B.volumeL / 1000 * FB_M_TO_YD, 3)} yd³)`);

        this.toggleRow('cost-regular-gravel-row', m.regularGravel.weightKg > 0);
        this.toggleRow('cost-chip-gravel-row',    m.chipGravel.weightKg > 0);
        this.toggleRow('cost-white-gravel-row',   m.whiteGravel.weightKg > 0);
        this.toggleRow('cost-stone-dust-c-row',   m.stoneDustC.weightKg > 0);
        this.toggleRow('cost-gcc400-c-row',       m.gcc400C.weightKg > 0);
        this.toggleRow('cost-white-lime-row',     m.whiteLime.weightKg > 0);

        this.updateElement('cost-regular-gravel',  fmtC(c.regularCost));
        this.updateElement('cost-chip-gravel',     fmtC(c.chipCost));
        this.updateElement('cost-white-gravel',    fmtC(c.whiteGravelCost));
        this.updateElement('cost-stone-dust-c',    fmtC(c.stoneDustCCost));
        this.updateElement('cost-gcc400-c',        fmtC(c.gcc400CCost));
        this.updateElement('cost-white-lime',      fmtC(c.whiteLimeCost));
        this.updateElement('cost-add-c-total',     fmtC(c.addCCost));

        this.toggleRow('cost-micro-fibre-row',    adm.microFibreKg > 0);
        this.toggleRow('cost-macro-fibre-row',    adm.macroFibreKg > 0);
        this.toggleRow('cost-water-reducer-row',  adm.waterReducerKg > 0);
        this.toggleRow('cost-hardener-row',       adm.hardenerKg > 0);

        this.updateElement('cost-micro-fibre',    fmtC(c.microFibreCost));
        this.updateElement('cost-macro-fibre',    fmtC(c.macroFibreCost));
        this.updateElement('cost-water-reducer',  fmtC(c.waterReducerCost));
        this.updateElement('cost-hardener',       fmtC(c.hardenerCost));

        // Pigment costs (non-indexed)
        const costPigTitle = document.getElementById('cost-pigments-title');
        if (costPigTitle) costPigTitle.style.display = showPigments ? 'block' : 'none';
        this.toggleRow('cost-pigment-1-row', showPigments);
        this.toggleRow('cost-pigment-2-row', showPigments && mix.pigments.pigment2_name !== 'None' && (mix.pigments.pigment2_parts || 0) > 0);
        if (showPigments) {
            this.updateElement('cost-pigment-1-label', mix.pigments.pigment1_name);
            this.updateElement('cost-pigment-1', fmtC(c.pigment1Cost));
            this.updateElement('cost-pigment-2-label', mix.pigments.pigment2_name);
            this.updateElement('cost-pigment-2', fmtC(c.pigment2Cost));
        }

        // Material summary (non-indexed)
        this.updateElement('summary-portland', `${fmt(m.portland.volumeL)} L`);
        this.updateElement('summary-white',    `${fmt(m.white.volumeL)} L`);
        this.updateElement('summary-cement',   `${fmt(m.totalCementKg)} kg`);
        this.updateElement('summary-fine',     `${fmt(m.totalFineL)} L`);
        this.updateElement('summary-coarse',   `${fmt(m.totalCoarseL)} L`);
        this.updateElement('summary-water',    `${fmt(m.water.volumeL)} L`);
        this.updateElement('summary-total',    `${fmt(m.totalConcreteKg)} kg`);

        // Header dashboard
        this.updateElement('header-project-name', this.state.project.projectName || 'Concrete Mix Calculator');
        this.updateElement('header-mix-name', mix.name);
        this.updateElement('header-quantity', this.state.project.quantity);
        this.updateElement('header-cost-per-paver', fmtC(c.totalPerPaver));
        
        // Profit calculations for Project tab
        var sellingPrice = this.state.project.sellingPrice || 0;
        var profitPerPaver = sellingPrice - c.totalPerPaver;
        var profitMarginPct = sellingPrice > 0 ? (profitPerPaver / sellingPrice) * 100 : 0;
        var totalProfit = profitPerPaver * this.state.project.quantity;
        
        // Update Project tab profit elements
        this.updateElement('quick-cost-per-paver', fmtC(c.totalPerPaver));
        this.updateElement('quick-profit-per-paver', fmtC(profitPerPaver));
        this.updateElement('quick-profit-margin', fmt(profitMarginPct, 1) + '%');
        
        // Update Costs tab profit summary
        var profitBox = document.getElementById('profit-summary-box');
        if (profitBox) {
            if (sellingPrice > 0) {
                profitBox.style.display = 'block';
                this.updateElement('cost-profit-per-paver', fmtC(profitPerPaver));
                this.updateElement('cost-profit-sub', 'Margin: ' + fmt(profitMarginPct, 1) + '%');
                this.updateElement('cost-profit-total', 'Total Profit: ' + fmtC(totalProfit));
                
                // Apply profit color styling
                var profitValueEl = document.getElementById('cost-profit-per-paver');
                if (profitValueEl) {
                    profitValueEl.style.color = profitPerPaver >= 0 ? '#4ade80' : '#f87171';
                }
            } else {
                profitBox.style.display = 'none';
            }
        }
        
        // Update header profit
        var hppEl = document.getElementById('header-profit-per-paver');
        if (hppEl) {
            if (sellingPrice > 0) {
                hppEl.textContent = fmtC(profitPerPaver);
                hppEl.style.color = profitPerPaver >= 0 ? '#4ade80' : '#f87171';
                hppEl.dataset.profit = profitPerPaver >= 0 ? '1' : '0';
            } else {
                hppEl.textContent = '--';
                hppEl.style.color = '';
                hppEl.dataset.profit = '1';
            }
        }
    }

    async copySummary(showToast) {
        const vol = this.calculateVolume();
        const m = this.calculateMaterials();
        const adm = this.calculateAdmixtures();
        const pig = this.calculatePigments();
        const c = this.calculateCosts();
        const mix = this.getActiveMix();
        const s = this.state;
        const qty = s.project.quantity;

        const fmt2 = (v, d) => (v || 0).toFixed(d !== undefined ? d : 2);
        const fmtC2 = (v) => 'JMD ' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let pigmentSection = '';
        if (mix.pigments.total_percent > 0) {
            pigmentSection = '\nPIGMENTS:\n';
            if (mix.pigments.pigment1_parts > 0) {
                pigmentSection += '  \u2022 ' + mix.pigments.pigment1_name + '\n    ' + fmt2(pig.pigment1Kg * 1000) + ' mL (' + fmt2(pig.pigment1L, 3) + ' L)\n';
            }
            if (mix.pigments.pigment2_name !== 'None' && mix.pigments.pigment2_parts > 0) {
                pigmentSection += '  \u2022 ' + mix.pigments.pigment2_name + '\n    ' + fmt2(pig.pigment2Kg * 1000) + ' mL (' + fmt2(pig.pigment2L, 3) + ' L)\n';
            }
            pigmentSection += '  \u2022 Total Pigment: ' + fmt2(pig.totalKg, 3) + ' kg\n';
        }

        const sellingPrice = s.project.sellingPrice || 0;
        const profitPerPaver = sellingPrice - c.totalPerPaver;
        const profitMarginPct = sellingPrice > 0 ? (profitPerPaver / sellingPrice) * 100 : 0;
        const totalProfit = profitPerPaver * qty;
        const profitLines = sellingPrice > 0
            ? '\n  \u2022 Selling Price/Paver: ' + fmtC2(sellingPrice) +
              '\n  \u2022 Profit/Paver: ' + fmtC2(profitPerPaver) +
              '\n  \u2022 Margin: ' + fmt2(profitMarginPct, 1) + '%' +
              '\n  \u2022 Total Profit (' + qty + ' pavers): ' + fmtC2(totalProfit)
            : '';

        const costSection = s.noCosts ? '' : '\n\nCOST BREAKDOWN:\n' +
            '  \u2022 Material Cost/Paver: ' + fmtC2(c.materialPerPaver) + '\n' +
            '  \u2022 Labour Cost/Paver: ' + fmtC2(c.labourPerPaver) + '\n' +
            '  \u2022 Transport Cost/Paver: ' + fmtC2(c.transportPerPaver) + '\n' +
            '  \u2022 TOTAL COST/PAVER: ' + fmtC2(c.totalPerPaver) + '\n' +
            '  \u2022 GRAND TOTAL (' + qty + ' pavers): ' + fmtC2(c.grandTotal) + profitLines;

        let coarseLines = '';
        if (mix.addition_c.chip_gravel > 0) coarseLines += '\n  \u2022 Chip Gravel: ' + fmt2(m.chipGravel.volL) + ' L (' + mix.addition_c.chip_gravel + '%)';
        if (mix.addition_c.white_gravel > 0) coarseLines += '\n  \u2022 White Gravel: ' + fmt2(m.whiteGravel.volL) + ' L (' + mix.addition_c.white_gravel + '%)';
        if (mix.addition_c.regular_gravel > 0) coarseLines += '\n  \u2022 Regular Gravel: ' + fmt2(m.regularGravel.volL) + ' L (' + mix.addition_c.regular_gravel + '%)';
        if (mix.addition_c.stone_dust > 0) coarseLines += '\n  \u2022 Stone Dust: ' + fmt2(m.stoneDustC.volL) + ' L (' + mix.addition_c.stone_dust + '%)';
        if (mix.addition_c.gcc400 > 0) coarseLines += '\n  \u2022 GCC 400: ' + fmt2(m.gcc400C.volL) + ' L (' + mix.addition_c.gcc400 + '%)';
        if (mix.addition_c.white_lime > 0) coarseLines += '\n  \u2022 White Lime: ' + fmt2(m.whiteLime.volL) + ' L (' + mix.addition_c.white_lime + '%)';

        let admixLines = '\n  \u2022 Micro Fibre: ' + fmt2(adm.microFibreG) + ' g';
        if (adm.macroFibreKg > 0) admixLines += '\n  \u2022 Macro Fibre: ' + fmt2(adm.macroFibreKg, 3) + ' kg';
        admixLines += '\n  \u2022 Water Reducer: ' + fmt2(adm.waterReducerMl) + ' mL';
        if (adm.hardenerKg > 0) admixLines += '\n  \u2022 Hardener: ' + fmt2(adm.hardenerKg, 3) + ' kg';

        const nameHeader = s.project.projectName ? s.project.projectName + '\n' : '';
        const mixHeader = mix.name !== 'Mix 1' ? 'MIX: ' + mix.name + '\n' : '';
        const summary = 'CONCRETE MIX SUMMARY\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n' +
            nameHeader + mixHeader +
            'PROJECT: ' + qty + ' pavers (' + s.project.length + 'ft \u00D7 ' + s.project.width + 'ft \u00D7 ' + s.project.thickness + 'in)\n' +
            'TOTAL VOLUME: ' + fmt2(vol.totalL) + ' L (' + fmt2(vol.totalM3, 3) + ' m\u00B3)\n\n' +
            'CEMENT (' + mix.mix_parts.cement + ':' + mix.mix_parts.sand + ':' + mix.mix_parts.coarse_agg + ' mix):\n' +
            '  \u2022 Portland: ' + fmt2(m.portland.volumeL) + ' L (' + fmt2(m.portland.bags, 1) + ' bags)\n' +
            '  \u2022 White: ' + fmt2(m.white.volumeL) + ' L (' + fmt2(m.white.bags, 1) + ' bags)\n' +
            '  \u2022 Total: ' + fmt2(m.totalCementKg, 3) + ' kg\n\n' +
            'WATER: ' + fmt2(m.water.volumeL) + ' L (W/C: ' + mix.water.wc_ratio + ')\n\n' +
            'FINE AGGREGATES (Addition B): ' + fmt2(m.totalFineL) + ' L\n' +
            '  \u2022 Sand: ' + fmt2(m.sand.volumeL) + ' L (' + mix.addition_b.sand + '%)\n' +
            '  \u2022 Stone Dust: ' + fmt2(m.stoneDustB.volumeL) + ' L (' + mix.addition_b.stone_dust + '%)\n' +
            '  \u2022 GCC 400: ' + fmt2(m.gcc400B.volumeL) + ' L (' + mix.addition_b.gcc400 + '%)\n\n' +
            'COARSE AGGREGATES (Addition C): ' + fmt2(m.totalCoarseL) + ' L' + coarseLines + '\n\n' +
            'ADMIXTURES:' + admixLines + pigmentSection + costSection + '\n' +
            '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(summary);
                showToast('Summary copied. You can now paste it into WhatsApp or Email.');
                return;
            }
        } catch (_) {}

        try {
            const ta = document.createElement('textarea');
            ta.value = summary;
            ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('Summary copied.');
            return;
        } catch (_) {}

        // Last resort: show a selectable overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
        const box = document.createElement('div');
        box.style.cssText = 'background:#fff;color:#000;padding:1rem;border-radius:8px;max-width:90vw;max-height:80vh;overflow:auto;white-space:pre;font-family:monospace;font-size:0.75rem;';
        box.textContent = summary;
        const close = document.createElement('button');
        close.textContent = 'Close';
        close.style.cssText = 'display:block;margin-top:0.5rem;padding:0.4rem 1rem;background:#1a56db;color:#fff;border:none;border-radius:4px;cursor:pointer;';
        close.onclick = () => document.body.removeChild(overlay);
        box.appendChild(close);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        showToast('Select the text above and copy manually.');
    }

    downloadCSV(showToast) {
        const vol = this.calculateVolume();
        const m = this.calculateMaterials();
        const adm = this.calculateAdmixtures();
        const pig = this.calculatePigments();
        const c = this.calculateCosts();
        const mix = this.getActiveMix();
        const s = this.state;
        const qty = s.project.quantity;

        const fmt2 = (v, d) => (v || 0).toFixed(d !== undefined ? d : 2);
        const lToYd3 = (l) => (l / 1000) * FB_M_TO_YD;
        const m3ToYd3 = (v) => v * FB_M_TO_YD;

        const sellingPrice = s.project.sellingPrice || 0;
        const profitLines = sellingPrice > 0
            ? '\nPROFIT ANALYSIS\nCategory,Value (JMD)\n' +
              'Selling Price per Paver,' + fmt2(sellingPrice) + '\n' +
              'Profit per Paver,' + fmt2(sellingPrice - c.totalPerPaver) + '\n' +
              'Profit Margin,' + fmt2((sellingPrice - c.totalPerPaver) / sellingPrice * 100, 1) + '%\n' +
              'Total Profit (' + qty + ' pavers),' + fmt2((sellingPrice - c.totalPerPaver) * qty) + '\n'
            : '';

        const csvContent = 'Concrete Mix Calculator - Calculation Results\n' +
            'Generated: ' + new Date().toLocaleString() +
            (s.project.projectName ? '\nProject: ' + s.project.projectName : '') +
            (mix.name !== 'Mix 1' ? '\nMix: ' + mix.name : '') + '\n\n' +

            'PROJECT DETAILS\nParameter,Value,Unit\n' +
            'Length,' + s.project.length + ',ft\n' +
            'Width,' + s.project.width + ',ft\n' +
            'Thickness,' + s.project.thickness + ',in\n' +
            'Batch Size,' + qty + ',pavers\n' +
            'Waste Factor,' + s.project.waste + ',\u00D7\n' +
            'Pavers Per Day,' + s.project.paversPerDay + ',pavers/day\n' +
            'Workers,' + (s.project.workers || 1) + ',workers\n' +
            'Wage Rate (per worker),' + s.project.wageRate + ',JMD/day\n' +
            'Raw Material Transport,' + s.project.transport + ',JMD\n\n' +

            'VOLUME CALCULATIONS\nParameter,Value,Unit\n' +
            'Volume per Paver,' + fmt2(vol.perPaver) + ',in\u00B3\n' +
            'Total Volume,' + fmt2(vol.totalL) + ',L\n' +
            'Total Volume,' + fmt2(vol.totalM3, 4) + ',m\u00B3\n' +
            'Total Volume,' + fmt2(vol.totalYd3, 3) + ',yd\u00B3\n\n' +

            'MIX PROPORTIONS\n' +
            'Mix Ratio,' + mix.mix_parts.cement + ':' + mix.mix_parts.sand + ':' + mix.mix_parts.coarse_agg + '\n' +
            'Water-Cement Ratio,' + mix.water.wc_ratio + '\n' +
            'Wet Cast Factor,' + mix.water.wet_cast_factor + '\n\n' +

            'CEMENT (ADDITION A)\nMaterial,Percentage,Volume (L),Weight (kg),Bags\n' +
            'Portland Cement,' + mix.addition_a.portland + '%,' + fmt2(m.portland.volumeL) + ',' + fmt2(m.portland.weightKg) + ',' + fmt2(m.portland.bags, 1) + '\n' +
            'White Cement,' + mix.addition_a.white + '%,' + fmt2(m.white.volumeL) + ',' + fmt2(m.white.weightKg) + ',' + fmt2(m.white.bags, 1) + '\n' +
            'Total Cement,,' + fmt2(m.portland.volumeL + m.white.volumeL) + ',' + fmt2(m.totalCementKg) + '\n\n' +

            'WATER\nParameter,Value,Unit\n' +
            'Water Required,' + fmt2(m.water.volumeL) + ',L\n' +
            'Water Required,' + fmt2(m.water.gallons, 2) + ',gal\n' +
            'Water Weight,' + fmt2(m.water.weightKg) + ',kg\n\n' +

            'FINE AGGREGATES (ADDITION B)\nMaterial,Percentage,Volume (L),Weight (kg)\n' +
            'Sand,' + mix.addition_b.sand + '%,' + fmt2(m.sand.volumeL) + ',' + fmt2(m.sand.weightKg) + '\n' +
            'Stone Dust,' + mix.addition_b.stone_dust + '%,' + fmt2(m.stoneDustB.volumeL) + ',' + fmt2(m.stoneDustB.weightKg) + '\n' +
            'GCC 400,' + mix.addition_b.gcc400 + '%,' + fmt2(m.gcc400B.volumeL) + ',' + fmt2(m.gcc400B.weightKg) + '\n' +
            'Total Fine Aggregates,,' + fmt2(m.totalFineL) + ',' + fmt2(m.totalFineWeightKg) + '\n\n' +

            'COARSE AGGREGATES (ADDITION C)\nMaterial,Percentage,Volume (L),Weight (kg)\n' +
            'Regular Gravel,' + mix.addition_c.regular_gravel + '%,' + fmt2(m.regularGravel.volL) + ',' + fmt2(m.regularGravel.weightKg) + '\n' +
            'Chip Gravel,' + mix.addition_c.chip_gravel + '%,' + fmt2(m.chipGravel.volL) + ',' + fmt2(m.chipGravel.weightKg) + '\n' +
            'White Gravel,' + mix.addition_c.white_gravel + '%,' + fmt2(m.whiteGravel.volL) + ',' + fmt2(m.whiteGravel.weightKg) + '\n' +
            'Stone Dust,' + mix.addition_c.stone_dust + '%,' + fmt2(m.stoneDustC.volL) + ',' + fmt2(m.stoneDustC.weightKg) + '\n' +
            'GCC 400,' + mix.addition_c.gcc400 + '%,' + fmt2(m.gcc400C.volL) + ',' + fmt2(m.gcc400C.weightKg) + '\n' +
            'White Lime,' + mix.addition_c.white_lime + '%,' + fmt2(m.whiteLime.volL) + ',' + fmt2(m.whiteLime.weightKg) + '\n' +
            'Total Coarse Aggregates,,' + fmt2(m.totalCoarseL) + ',' + fmt2(m.totalCoarseWeightKg) + '\n\n' +

            'ADMIXTURES\nMaterial,Dosage Rate,Quantity,Unit\n' +
            'Micro Fibre,' + mix.admixtures.micro_fibre + ' g/L,' + fmt2(adm.microFibreG) + ',g\n' +
            'Macro Fibre,' + mix.admixtures.macro_fibre + '% of cement,' + fmt2(adm.macroFibreKg, 3) + ',kg\n' +
            'Water Reducer,' + mix.admixtures.water_reducer + ' mL/kg cement,' + fmt2(adm.waterReducerMl) + ',mL\n' +
            'Hardener,' + mix.admixtures.hardener + '% of cement,' + fmt2(adm.hardenerKg, 3) + ',kg\n\n' +

            'PIGMENTS\nMaterial,Parts Ratio,Volume (mL),Volume (L),Weight (kg)\n' +
            mix.pigments.pigment1_name + ',' + mix.pigments.pigment1_parts + ',' + fmt2(pig.pigment1L * 1000, 1) + ',' + fmt2(pig.pigment1L, 3) + ',' + fmt2(pig.pigment1Kg, 3) + '\n' +
            (mix.pigments.pigment2_name !== 'None' && mix.pigments.pigment2_parts > 0
                ? mix.pigments.pigment2_name + ',' + mix.pigments.pigment2_parts + ',' + fmt2(pig.pigment2L * 1000, 1) + ',' + fmt2(pig.pigment2L, 3) + ',' + fmt2(pig.pigment2Kg, 3) + '\n' : '') +
            'Total Pigment,,' + fmt2((pig.pigment1L + pig.pigment2L) * 1000, 1) + ',' + fmt2(pig.pigment1L + pig.pigment2L, 3) + ',' + fmt2(pig.totalKg, 3) + '\n\n' +

            'COST ANALYSIS\nCategory,Item,Quantity,Unit Price (JMD),Total Cost (JMD)\n' +
            'Cement,Portland Cement,' + fmt2(m.portland.bags, 1) + ' bags,' + s.prices.portland + ',' + fmt2(c.portlandCost) + '\n' +
            'Cement,White Cement,' + fmt2(m.white.bags, 1) + ' bags,' + s.prices.white + ',' + fmt2(c.whiteCost) + '\n' +
            'Fine Aggregates,Sand,' + fmt2(lToYd3(m.sand.volumeL), 3) + ' yd\u00B3,' + s.prices.sand + ',' + fmt2(c.sandCost) + '\n' +
            'Fine Aggregates,Stone Dust,' + fmt2(lToYd3(m.stoneDustB.volumeL), 3) + ' yd\u00B3,' + s.prices.stoneDust + ',' + fmt2(c.stoneDustBCost) + '\n' +
            'Fine Aggregates,GCC 400,' + fmt2(lToYd3(m.gcc400B.volumeL), 3) + ' yd\u00B3,' + s.prices.gcc400 + ',' + fmt2(c.gcc400BCost) + '\n' +
            'Coarse Aggregates,Regular Gravel,' + fmt2(m3ToYd3(m.regularGravel.volM3), 3) + ' yd\u00B3,' + s.prices.regularGravel + ',' + fmt2(c.regularCost) + '\n' +
            'Coarse Aggregates,Chip Gravel,' + fmt2(m3ToYd3(m.chipGravel.volM3), 3) + ' yd\u00B3,' + s.prices.chipGravel + ',' + fmt2(c.chipCost) + '\n' +
            'Coarse Aggregates,White Gravel,' + fmt2(m3ToYd3(m.whiteGravel.volM3), 3) + ' yd\u00B3,' + s.prices.whiteGravel + ',' + fmt2(c.whiteGravelCost) + '\n' +
            'Coarse Aggregates,Stone Dust (C),' + fmt2(m3ToYd3(m.stoneDustC.volM3), 3) + ' yd\u00B3,' + s.prices.stoneDust + ',' + fmt2(c.stoneDustCCost) + '\n' +
            'Coarse Aggregates,GCC 400 (C),' + fmt2(m3ToYd3(m.gcc400C.volM3), 3) + ' yd\u00B3,' + s.prices.gcc400 + ',' + fmt2(c.gcc400CCost) + '\n' +
            'Coarse Aggregates,White Lime,' + fmt2(m3ToYd3(m.whiteLime.volM3), 3) + ' yd\u00B3,' + s.prices.whiteLime + ',' + fmt2(c.whiteLimeCost) + '\n' +
            'Admixtures,Micro Fibre,' + fmt2(adm.microFibreKg, 3) + ' kg,' + s.prices.microFibre + ',' + fmt2(c.microFibreCost) + '\n' +
            'Admixtures,Macro Fibre,' + fmt2(adm.macroFibreKg, 3) + ' kg,' + s.prices.macroFibre + ',' + fmt2(c.macroFibreCost) + '\n' +
            'Admixtures,Water Reducer,' + fmt2(adm.waterReducerKg, 3) + ' kg,' + s.prices.waterReducer + ',' + fmt2(c.waterReducerCost) + '\n' +
            'Admixtures,Hardener,' + fmt2(adm.hardenerKg, 3) + ' kg,' + s.prices.hardener + ',' + fmt2(c.hardenerCost) + '\n' +
            'Pigments,' + mix.pigments.pigment1_name + ',' + fmt2(pig.pigment1L, 3) + ' L,' + (FB_PIGMENT_PRICE[mix.pigments.pigment1_name] || 0) + ',' + fmt2(c.pigment1Cost) + '\n' +
            (mix.pigments.pigment2_name !== 'None' && mix.pigments.pigment2_parts > 0
                ? 'Pigments,' + mix.pigments.pigment2_name + ',' + fmt2(pig.pigment2L, 3) + ' L,' + (FB_PIGMENT_PRICE[mix.pigments.pigment2_name] || 0) + ',' + fmt2(c.pigment2Cost) + '\n' : '') + '\n' +

            'COST SUMMARY\nCategory,Cost (JMD)\n' +
            'Material Cost (Total),' + fmt2(c.totalMaterial) + '\n' +
            'Material Cost per Paver,' + fmt2(c.materialPerPaver) + '\n' +
            'Labour Cost per Paver,' + fmt2(c.labourPerPaver) + '\n' +
            'Transport Cost per Paver,' + fmt2(c.transportPerPaver) + '\n' +
            'TOTAL COST PER PAVER,' + fmt2(c.totalPerPaver) + '\n' +
            'GRAND TOTAL (' + qty + ' pavers),' + fmt2(c.grandTotal) + '\n' +
            profitLines;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'concrete_mix_calculation_' + new Date().toISOString().split('T')[0] + '.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV downloaded.');
    }

    updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    toggleRow(id, show) {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'flex' : 'none';
    }
}

// Initialize fallback calculator when DOM is loaded (only if WASM path fails)
// app.js handles WASM loading; this module is loaded as a separate script tag
// and activates only if window.__fallbackActive is set by app.js error handling.
document.addEventListener('DOMContentLoaded', () => {
    if (!window.__fallbackActive) return;

    console.log('WASM module not available, using JavaScript fallback');
    const calculator = new ConcreteCalculator();

    const FB_STATE_KEY = 'sprat-calculator-state';

    const fbLoadState = () => {
        try {
            const raw = localStorage.getItem(FB_STATE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (!saved) return;

            if (saved._version === 1) {
                // Migrate v1 flat format → mixes array
                calculator.state.mixes = [{
                    name: 'Mix 1',
                    mix_parts: saved.mix_parts ? { cement: saved.mix_parts.cement || 1, sand: saved.mix_parts.sand || 2, coarse_agg: saved.mix_parts.coarse_agg || 3 } : fbCreateDefaultMix('Mix 1').mix_parts,
                    addition_a: saved.addition_a ? { portland: saved.addition_a.portland || 0, white: saved.addition_a.white || 0, custom: saved.addition_a.custom || 0, custom_density: saved.addition_a.custom_density || 1440 } : fbCreateDefaultMix('Mix 1').addition_a,
                    addition_b: saved.addition_b ? { sand: saved.addition_b.sand || 0, stone_dust: saved.addition_b.stone_dust || 0, gcc400: saved.addition_b.gcc400 || 0, custom: saved.addition_b.custom || 0, custom_density: saved.addition_b.custom_density || 1600 } : fbCreateDefaultMix('Mix 1').addition_b,
                    addition_c: saved.addition_c ? { regular_gravel: saved.addition_c.regular_gravel || 0, chip_gravel: saved.addition_c.chip_gravel || 0, white_gravel: saved.addition_c.white_gravel || 0, stone_dust: saved.addition_c.stone_dust || 0, gcc400: saved.addition_c.gcc400 || 0, white_lime: saved.addition_c.white_lime || 0, custom: saved.addition_c.custom || 0, custom_density: saved.addition_c.custom_density || 1600 } : fbCreateDefaultMix('Mix 1').addition_c,
                    water: saved.water ? { wc_ratio: saved.water.wc_ratio || 0.45, wet_cast_factor: saved.water.wet_cast_factor || 1.57 } : fbCreateDefaultMix('Mix 1').water,
                    admixtures: saved.admixtures ? { micro_fibre: saved.admixtures.micro_fibre || 0, macro_fibre: saved.admixtures.macro_fibre || 0, water_reducer: saved.admixtures.water_reducer || 0, hardener: saved.admixtures.hardener || 0 } : fbCreateDefaultMix('Mix 1').admixtures,
                    pigments: saved.pigments ? { total_percent: saved.pigments.total_percent || 0, pigment1_name: saved.pigments.pigment1_name || 'Red Iron Oxide', pigment1_parts: saved.pigments.pigment1_parts || 1, pigment2_name: saved.pigments.pigment2_name || 'None', pigment2_parts: saved.pigments.pigment2_parts || 0 } : fbCreateDefaultMix('Mix 1').pigments,
                }];
                calculator.state.activeMix = 0;
                calculator.state.deletedMixes = [];
            } else if (saved._version === 2) {
                if (Array.isArray(saved.mixes) && saved.mixes.length > 0) calculator.state.mixes = saved.mixes;
                if (typeof saved.active_mix === 'number') calculator.state.activeMix = Math.min(saved.active_mix, calculator.state.mixes.length - 1);
                if (Array.isArray(saved.deleted_mixes)) calculator.state.deletedMixes = saved.deleted_mixes;
            }

            // Project (both versions)
            if (saved.project) {
                const s = calculator.state;
                if (saved.project.project_name !== undefined) s.project.projectName  = saved.project.project_name;
                if (saved.project.length       !== undefined) s.project.length       = saved.project.length;
                if (saved.project.width        !== undefined) s.project.width        = saved.project.width;
                if (saved.project.thickness    !== undefined) s.project.thickness    = saved.project.thickness;
                if (saved.project.quantity     !== undefined) s.project.quantity     = saved.project.quantity;
                if (saved.project.waste_factor !== undefined) s.project.waste        = saved.project.waste_factor;
                if (saved.project.pavers_per_day !== undefined) s.project.paversPerDay = saved.project.pavers_per_day;
                if (saved.project.workers      !== undefined) s.project.workers      = saved.project.workers;
                if (saved.project.wage_rate    !== undefined) s.project.wageRate     = saved.project.wage_rate;
                if (saved.project.raw_material_transport !== undefined) s.project.transport = saved.project.raw_material_transport;
                if (saved.project.selling_price !== undefined) s.project.sellingPrice = saved.project.selling_price;
            }
            if (saved.settings) {
                const bs = calculator.state.settings;
                if (saved.settings.business_name    !== undefined) bs.businessName    = saved.settings.business_name;
                if (saved.settings.business_address !== undefined) bs.businessAddress = saved.settings.business_address;
                if (saved.settings.business_phone   !== undefined) bs.businessPhone   = saved.settings.business_phone;
                if (saved.settings.business_email   !== undefined) bs.businessEmail   = saved.settings.business_email;
                if (saved.settings.business_tax_id  !== undefined) bs.businessTaxId   = saved.settings.business_tax_id;
                if (saved.settings.tax_rate         !== undefined) bs.taxRate         = saved.settings.tax_rate;
            }
            if (saved.no_costs !== undefined) calculator.state.noCosts = saved.no_costs;
            if (typeof saved.color_preview === 'boolean') calculator.state.colorPreview = saved.color_preview;
            if (saved.prices) {
                const p = calculator.state.prices;
                if (saved.prices.portland_bag    !== undefined) p.portland      = saved.prices.portland_bag;
                if (saved.prices.white_bag       !== undefined) p.white         = saved.prices.white_bag;
                if (saved.prices.sand            !== undefined) p.sand          = saved.prices.sand;
                if (saved.prices.stone_dust      !== undefined) p.stoneDust     = saved.prices.stone_dust;
                if (saved.prices.gcc400          !== undefined) p.gcc400        = saved.prices.gcc400;
                if (saved.prices.regular_gravel  !== undefined) p.regularGravel = saved.prices.regular_gravel;
                if (saved.prices.chip_gravel     !== undefined) p.chipGravel    = saved.prices.chip_gravel;
                if (saved.prices.white_gravel    !== undefined) p.whiteGravel   = saved.prices.white_gravel;
                if (saved.prices.white_lime      !== undefined) p.whiteLime     = saved.prices.white_lime;
                if (saved.prices.micro_fibre     !== undefined) p.microFibre    = saved.prices.micro_fibre;
                if (saved.prices.macro_fibre     !== undefined) p.macroFibre    = saved.prices.macro_fibre;
                if (saved.prices.water_reducer   !== undefined) p.waterReducer  = saved.prices.water_reducer;
                if (saved.prices.hardener        !== undefined) p.hardener      = saved.prices.hardener;
            }
        } catch (_) {}
    };

    const fbSaveState = () => {
        try {
            const s = calculator.state;
            localStorage.setItem(FB_STATE_KEY, JSON.stringify({
                _version: 2,
                project: {
                    project_name: s.project.projectName || '',
                    length: s.project.length, width: s.project.width, thickness: s.project.thickness,
                    quantity: s.project.quantity, waste_factor: s.project.waste,
                    pavers_per_day: s.project.paversPerDay, workers: s.project.workers || 1, wage_rate: s.project.wageRate,
                    raw_material_transport: s.project.transport, selling_price: s.project.sellingPrice
                },
                mixes: s.mixes,
                active_mix: s.activeMix,
                deleted_mixes: s.deletedMixes,
                prices: { portland_bag: s.prices.portland, white_bag: s.prices.white, sand: s.prices.sand, stone_dust: s.prices.stoneDust, gcc400: s.prices.gcc400, regular_gravel: s.prices.regularGravel, chip_gravel: s.prices.chipGravel, white_gravel: s.prices.whiteGravel, white_lime: s.prices.whiteLime, micro_fibre: s.prices.microFibre, macro_fibre: s.prices.macroFibre, water_reducer: s.prices.waterReducer, hardener: s.prices.hardener },
                settings: { business_name: s.settings.businessName, business_address: s.settings.businessAddress, business_phone: s.settings.businessPhone, business_email: s.settings.businessEmail, business_tax_id: s.settings.businessTaxId, tax_rate: s.settings.taxRate },
                no_costs: s.noCosts || false,
                color_preview: s.colorPreview || false
            }));
            if (window.SheetSync) window.SheetSync.markDirty('prices');
        } catch (_) {}
    };

    const fbSyncProjectAndPrices = () => {
        const s = calculator.state;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('project-name', s.project.projectName || '');
        set('project-length', s.project.length);
        set('project-width', s.project.width);
        set('project-thickness', s.project.thickness);
        set('project-quantity', s.project.quantity);
        set('project-waste', s.project.waste);
        set('project-pavers-per-day', s.project.paversPerDay);
        set('project-workers', s.project.workers || 1);
        set('project-wage-rate', s.project.wageRate);
        set('project-transport', s.project.transport);
        set('project-selling-price', s.project.sellingPrice);
        // Prices
        set('price-portland', s.prices.portland);
        set('price-white', s.prices.white);
        set('price-sand', s.prices.sand);
        set('price-stone-dust', s.prices.stoneDust);
        set('price-gcc400', s.prices.gcc400);
        set('price-regular-gravel', s.prices.regularGravel);
        set('price-chip-gravel', s.prices.chipGravel);
        set('price-white-gravel', s.prices.whiteGravel);
        set('price-white-lime', s.prices.whiteLime);
        set('price-micro-fibre', s.prices.microFibre);
        set('price-macro-fibre', s.prices.macroFibre);
        set('price-water-reducer', s.prices.waterReducer);
        set('price-hardener', s.prices.hardener);
        // Business identity + tax
        set('biz-name',    s.settings.businessName);
        set('biz-address', s.settings.businessAddress);
        set('biz-phone',   s.settings.businessPhone);
        set('biz-email',   s.settings.businessEmail);
        set('biz-tax-id',  s.settings.businessTaxId);
        set('tax-rate',    s.settings.taxRate);
    };

    // The onUpdate callback called whenever any input changes
    const onUpdate = () => {
        calculator.updateUI();
        fbSaveState();
    };

    fbLoadState();
    calculator.renderMixSections(onUpdate);
    calculator.renderMixSelector();
    fbSyncProjectAndPrices();
    calculator.updateUI();

    // Sync no-costs toggle from persisted state
    (function() {
        const nc = document.getElementById('toggle-no-costs');
        if (nc && calculator.state.noCosts) {
            nc.classList.add('active');
            const sl = nc.querySelector('.toggle-slider');
            if (sl) sl.style.transform = 'translateX(20px)';
        }
        const cp = document.getElementById('toggle-color-preview');
        if (cp) {
            cp.classList.toggle('active', calculator.state.colorPreview);
            cp.setAttribute('aria-checked', String(calculator.state.colorPreview));
            const csl = cp.querySelector('.toggle-slider');
            if (csl) csl.style.transform = calculator.state.colorPreview ? 'translateX(20px)' : 'translateX(0)';
        }
    })();

    // Wire project inputs
    const projectNameEl = document.getElementById('project-name');
    if (projectNameEl) projectNameEl.addEventListener('input', () => {
        calculator.state.project.projectName = projectNameEl.value;
        onUpdate();
    });

    const projectFields = ['project-length', 'project-width', 'project-thickness', 'project-quantity', 'project-waste', 'project-pavers-per-day', 'project-workers', 'project-wage-rate', 'project-transport', 'project-selling-price'];
    projectFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            const v = parseFloat(el.value) || 0;
            const key = id.replace('project-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            if (key === 'waste') calculator.state.project.waste = v;
            else if (key === 'paversPerDay') calculator.state.project.paversPerDay = v;
            else if (key === 'wageRate') calculator.state.project.wageRate = v;
            else if (key === 'transport') calculator.state.project.transport = v;
            else if (key === 'sellingPrice') calculator.state.project.sellingPrice = v;
            else calculator.state.project[key] = v;
            onUpdate();
        });
    });

    // Wire active mix selector (Project tab)
    const activeMixSel = document.getElementById('active-mix-select');
    if (activeMixSel) activeMixSel.addEventListener('change', (e) => {
        calculator.setActiveMix(parseInt(e.target.value, 10));
        calculator.renderMixSections(onUpdate);
        onUpdate();
    });

    // Wire price inputs
    const priceMap = {
        'price-portland': 'portland', 'price-white': 'white', 'price-sand': 'sand',
        'price-stone-dust': 'stoneDust', 'price-gcc400': 'gcc400',
        'price-regular-gravel': 'regularGravel', 'price-chip-gravel': 'chipGravel',
        'price-white-gravel': 'whiteGravel', 'price-white-lime': 'whiteLime',
        'price-micro-fibre': 'microFibre', 'price-macro-fibre': 'macroFibre',
        'price-water-reducer': 'waterReducer', 'price-hardener': 'hardener',
    };
    Object.entries(priceMap).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
            calculator.state.prices[key] = parseFloat(el.value) || 0;
            onUpdate();
        });
    });

    // Business identity + tax inputs
    const bizFieldMapFb = { 'biz-name': 'businessName', 'biz-address': 'businessAddress', 'biz-phone': 'businessPhone', 'biz-email': 'businessEmail', 'biz-tax-id': 'businessTaxId' };
    Object.entries(bizFieldMapFb).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { calculator.state.settings[key] = el.value; fbSaveState(); });
    });
    const fbTaxRateEl = document.getElementById('tax-rate');
    if (fbTaxRateEl) fbTaxRateEl.addEventListener('input', () => { calculator.state.settings.taxRate = parseFloat(fbTaxRateEl.value) || 0; fbSaveState(); });

    // Reset prices
    const btnResetPrices = document.getElementById('btn-reset-prices');
    if (btnResetPrices) btnResetPrices.addEventListener('click', () => {
        calculator.state.prices = { portland: 1750, white: 3810, sand: 5000, stoneDust: 1800, gcc400: 17891, regularGravel: 4000, chipGravel: 4000, whiteGravel: 1600, whiteLime: 55, microFibre: 1622.6, macroFibre: 2200, waterReducer: 1378.34, hardener: 0 };
        fbSyncProjectAndPrices();
        onUpdate();
    });

    // Reset All
    const btnResetAll = document.getElementById('btn-reset-all');
    if (btnResetAll) btnResetAll.addEventListener('click', () => {
        localStorage.removeItem(FB_STATE_KEY);
        location.reload();
    });

    // Recipe presets
    const FB_RECIPES_KEY = 'sprat-recipes';
    const FB_RECIPES_MAX = 20;

    const fbLoadRecipes = () => {
        try { const arr = JSON.parse(localStorage.getItem(FB_RECIPES_KEY) || 'null'); return Array.isArray(arr) ? arr : []; } catch (_) { return []; }
    };
    const fbSaveRecipes = (recipes) => {
        try { localStorage.setItem(FB_RECIPES_KEY, JSON.stringify(recipes)); } catch (_) {}
    };

    const fbShowToast = (msg) => {
        const t = document.getElementById('toast');
        const tm = document.getElementById('toast-message');
        if (t && tm) { tm.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }
        else if (t) { t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }
    };

    const fbRenderRecipes = () => {
        const list = document.getElementById('recipe-list');
        if (!list) return;
        const recipes = fbLoadRecipes();
        if (recipes.length === 0) { list.innerHTML = '<div class="recipe-empty">No presets saved yet.</div>'; return; }
        list.innerHTML = '';
        recipes.forEach((recipe, idx) => {
            const row = document.createElement('div');
            row.className = 'recipe-row';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'recipe-name';
            nameSpan.textContent = recipe.name;
            const loadBtn = document.createElement('button');
            loadBtn.className = 'recipe-btn recipe-btn-load';
            loadBtn.textContent = 'Load';
            loadBtn.addEventListener('click', () => {
                const s = recipe.state;
                if (s.project) {
                    const ps = calculator.state.project;
                    if (s.project.length !== undefined)              ps.length       = s.project.length;
                    if (s.project.width !== undefined)               ps.width        = s.project.width;
                    if (s.project.thickness !== undefined)           ps.thickness    = s.project.thickness;
                    if (s.project.quantity !== undefined)            ps.quantity     = s.project.quantity;
                    if (s.project.waste_factor !== undefined)        ps.waste        = s.project.waste_factor;
                    if (s.project.pavers_per_day !== undefined)      ps.paversPerDay = s.project.pavers_per_day;
                    if (s.project.workers !== undefined)             ps.workers      = s.project.workers;
                    if (s.project.wage_rate !== undefined)           ps.wageRate     = s.project.wage_rate;
                    if (s.project.raw_material_transport !== undefined) ps.transport = s.project.raw_material_transport;
                }
                // Handle new format (mixes array) or old flat format
                if (Array.isArray(s.mixes) && s.mixes.length > 0) {
                    calculator.state.mixes = JSON.parse(JSON.stringify(s.mixes));
                    calculator.state.activeMix = typeof s.active_mix === 'number' ? Math.min(s.active_mix, s.mixes.length - 1) : 0;
                } else {
                    // old flat format
                    calculator.state.mixes[0] = {
                        name: 'Mix 1',
                        mix_parts: s.mix_parts ? { ...s.mix_parts } : calculator.state.mixes[0].mix_parts,
                        addition_a: s.addition_a ? { ...s.addition_a } : calculator.state.mixes[0].addition_a,
                        addition_b: s.addition_b ? { ...s.addition_b } : calculator.state.mixes[0].addition_b,
                        addition_c: s.addition_c ? { ...s.addition_c } : calculator.state.mixes[0].addition_c,
                        water: s.water ? { ...s.water } : calculator.state.mixes[0].water,
                        admixtures: s.admixtures ? { ...s.admixtures } : calculator.state.mixes[0].admixtures,
                        pigments: s.pigments ? { ...s.pigments } : calculator.state.mixes[0].pigments,
                    };
                    calculator.state.activeMix = 0;
                }
                calculator.renderMixSections(onUpdate);
                calculator.renderMixSelector();
                fbSyncProjectAndPrices();
                onUpdate();
                fbShowToast('Recipe "' + recipe.name + '" loaded.');
            });
            const delBtn = document.createElement('button');
            delBtn.className = 'recipe-btn recipe-btn-del';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', () => {
                const r2 = fbLoadRecipes(); r2.splice(idx, 1); fbSaveRecipes(r2); fbRenderRecipes();
            });
            row.appendChild(nameSpan); row.appendChild(loadBtn); row.appendChild(delBtn);
            list.appendChild(row);
        });
    };

    const fbSaveCurrentAsRecipe = () => {
        const input = document.getElementById('recipe-name-input');
        const name = input ? input.value.trim() : '';
        if (!name) { fbShowToast('Enter a preset name first.'); return; }
        const recipes = fbLoadRecipes();
        if (recipes.length >= FB_RECIPES_MAX) { fbShowToast('Max ' + FB_RECIPES_MAX + ' presets reached. Delete one first.'); return; }
        const s = calculator.state;
        recipes.push({
            name,
            created: new Date().toISOString(),
            state: {
                project: { length: s.project.length, width: s.project.width, thickness: s.project.thickness, quantity: s.project.quantity, waste_factor: s.project.waste, pavers_per_day: s.project.paversPerDay, workers: s.project.workers || 1, wage_rate: s.project.wageRate, raw_material_transport: s.project.transport },
                mixes: JSON.parse(JSON.stringify(s.mixes)),
                active_mix: s.activeMix,
            },
        });
        fbSaveRecipes(recipes);
        fbRenderRecipes();
        if (input) input.value = '';
        fbShowToast('Recipe "' + name + '" saved.');
    };

    const btnSaveRecipe = document.getElementById('btn-save-recipe');
    if (btnSaveRecipe) btnSaveRecipe.addEventListener('click', fbSaveCurrentAsRecipe);

    fbRenderRecipes();

    // Wire Copy Summary button
    const btnCopy = document.getElementById('btn-copy-summary');
    if (btnCopy) btnCopy.addEventListener('click', () => { calculator.copySummary(fbShowToast); });

    // Wire Download CSV button
    const btnCSV = document.getElementById('btn-download-csv');
    if (btnCSV) btnCSV.addEventListener('click', () => { calculator.downloadCSV(fbShowToast); });

    // Wire No Costs toggle
    const toggleNC = document.getElementById('toggle-no-costs');
    if (toggleNC) {
        toggleNC.addEventListener('click', () => {
            calculator.state.noCosts = !calculator.state.noCosts;
            toggleNC.classList.toggle('active', calculator.state.noCosts);
            const slider = toggleNC.querySelector('.toggle-slider');
            if (slider) slider.style.transform = calculator.state.noCosts ? 'translateX(20px)' : 'translateX(0)';
            fbSaveState();
        });
    }

    // Wire Color Preview toggle
    const toggleCP = document.getElementById('toggle-color-preview');
    if (toggleCP) {
        toggleCP.addEventListener('click', () => {
            calculator.state.colorPreview = !calculator.state.colorPreview;
            toggleCP.classList.toggle('active', calculator.state.colorPreview);
            toggleCP.setAttribute('aria-checked', String(calculator.state.colorPreview));
            const cpSlider = toggleCP.querySelector('.toggle-slider');
            if (cpSlider) cpSlider.style.transform = calculator.state.colorPreview ? 'translateX(20px)' : 'translateX(0)';
            fbApplyColorPreview(calculator.state.colorPreview, calculator.getActiveMix());
            fbSaveState();
        });
    }

    // ── Inventory ─────────────────────────────────────────────────────────────
    const FB_INV_KEY_FB = 'sprat-inventory';
    const fbInvState = { linked: true, stock: {}, produced: 0 };
    const FB_L_TO_YD3_FB = 1.30795 / 1000;

    // Load persisted inventory
    (() => {
        try {
            const saved = JSON.parse(localStorage.getItem(FB_INV_KEY_FB) || 'null');
            if (saved) {
                if (typeof saved.linked_to_calculator === 'boolean') fbInvState.linked = saved.linked_to_calculator;
                if (saved.stock && typeof saved.stock === 'object') fbInvState.stock = saved.stock;
                const today = new Date().toISOString().split('T')[0];
                if (saved.production_date === today && typeof saved.pavers_produced_today === 'number') {
                    fbInvState.produced = saved.pavers_produced_today;
                }
            }
        } catch (_) {}
    })();

    const fbInvSave = () => {
        try {
            localStorage.setItem(FB_INV_KEY_FB, JSON.stringify({
                linked_to_calculator: fbInvState.linked,
                stock: fbInvState.stock,
                pavers_produced_today: fbInvState.produced,
                production_date: new Date().toISOString().split('T')[0],
            }));
            if (window.SheetSync) window.SheetSync.markDirty('inventory');
        } catch (_) {}
    };

    const fbInvGetUnit = (k) => {
        if (k.endsWith('_bags')) return 'bags';
        if (k.endsWith('_yd3')) return 'yd\u00B3';
        if (k.endsWith('_kg'))  return 'kg';
        if (k === 'water_l' || k.endsWith('_l')) return 'L';
        return '';
    };

    const fbInvFmtVal = (val, k) => {
        const u = fbInvGetUnit(k);
        if (u === 'bags') return val.toFixed(1) + ' bags';
        if (u === 'yd\u00B3') return val.toFixed(3) + ' yd\u00B3';
        if (u === 'kg')  return val.toFixed(3) + ' kg';
        if (u === 'L')   return val.toFixed(2) + ' L';
        return val.toFixed(3);
    };

    const fbInvFmtC = (v) => 'JMD ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fbInvIsActionable = (k) => k !== 'water_l';

    const fbInvGetPrice = (stockKey) => {
        const p = calculator.state.prices;
        const mix = calculator.getActiveMix();
        switch (stockKey) {
            case 'portland_bags':      return p.portland || 0;
            case 'white_bags':         return p.white || 0;
            case 'sand_yd3':           return p.sand || 0;
            case 'stone_dust_b_yd3':   return p.stoneDust || 0;
            case 'gcc400_b_yd3':       return p.gcc400 || 0;
            case 'regular_gravel_yd3': return p.regularGravel || 0;
            case 'chip_gravel_yd3':    return p.chipGravel || 0;
            case 'white_gravel_yd3':   return p.whiteGravel || 0;
            case 'stone_dust_c_yd3':   return p.stoneDust || 0;
            case 'gcc400_c_yd3':       return p.gcc400 || 0;
            case 'white_lime_yd3':     return p.whiteLime || 0;
            case 'water_l':            return 0;
            case 'micro_fibre_kg':     return p.microFibre || 0;
            case 'macro_fibre_kg':     return p.macroFibre || 0;
            case 'water_reducer_kg':   return p.waterReducer || 0;
            case 'hardener_kg':        return p.hardener || 0;
            case 'pigment1_l':         return FB_PIGMENT_PRICE[mix.pigments.pigment1_name] || 0;
            case 'pigment2_l':         return FB_PIGMENT_PRICE[mix.pigments.pigment2_name] || 0;
            default:                   return 0;
        }
    };

    const fbInvRoundUnit = (qty, k) => {
        if (k.endsWith('_bags')) return Math.ceil(qty);
        if (k.endsWith('_yd3'))  return Math.ceil(qty * 4) / 4;
        if (k.endsWith('_kg'))   return Math.ceil(qty * 10) / 10;
        if (k.endsWith('_l'))    return Math.ceil(qty * 10) / 10;
        return qty;
    };

    const fbInvBuildMaterials = () => {
        const mat = calculator.calculateMaterials();
        const adm = calculator.calculateAdmixtures();
        const pig = calculator.calculatePigments();
        const mix = calculator.getActiveMix();
        const qty = calculator.state.project.quantity * calculator.state.project.waste;
        if (qty <= 0) return [];
        const ppd = calculator.state.project.paversPerDay || 0;
        const produced = fbInvState.produced;
        const linked = fbInvState.linked;

        const make = (key, name, stockKey, totalForBatch) => {
            const stock = fbInvState.stock[stockKey] || 0;
            if (!linked) return { key, name, stockKey, stock, linked: false };
            const perPaver = totalForBatch / qty;
            const usedToday = perPaver * produced;
            const remaining = stock - usedToday;
            const dailyUsage = perPaver * ppd;
            const daysRemaining = dailyUsage > 0 ? remaining / dailyUsage : null;
            return { key, name, stockKey, stock, linked: true, perPaver, usedToday, remaining, dailyUsage, daysRemaining };
        };

        const items = [];
        if (mat.portland.bags > 0) items.push(make('portland', 'Portland Cement', 'portland_bags', mat.portland.bags));
        if (mat.white.bags > 0)    items.push(make('white', 'White Cement', 'white_bags', mat.white.bags));
        if (mat.sand.volumeL > 0)  items.push(make('sand', 'Sand', 'sand_yd3', mat.sand.volumeL * FB_L_TO_YD3_FB));
        if (mat.stoneDustB.volumeL > 0) items.push(make('stone_dust_b', 'Stone Dust (Fine)', 'stone_dust_b_yd3', mat.stoneDustB.volumeL * FB_L_TO_YD3_FB));
        if (mat.gcc400B.volumeL > 0)    items.push(make('gcc400_b', 'GCC 400 (Fine)', 'gcc400_b_yd3', mat.gcc400B.volumeL * FB_L_TO_YD3_FB));

        const c = mix.addition_c;
        const coarseTotal = c.regular_gravel + c.chip_gravel + c.white_gravel + c.stone_dust + c.gcc400 + c.white_lime + c.custom;
        const coarseTotalYd3 = mat.totalCoarseL * FB_L_TO_YD3_FB;
        [['regular_gravel','Regular Gravel','regular_gravel_yd3',c.regular_gravel],
         ['chip_gravel','Chip Gravel','chip_gravel_yd3',c.chip_gravel],
         ['white_gravel','White Gravel','white_gravel_yd3',c.white_gravel],
         ['stone_dust_c','Stone Dust (Coarse)','stone_dust_c_yd3',c.stone_dust],
         ['gcc400_c','GCC 400 (Coarse)','gcc400_c_yd3',c.gcc400],
         ['white_lime','White Lime','white_lime_yd3',c.white_lime]
        ].forEach(([key, name, sk, pct]) => {
            if (pct > 0) items.push(make(key, name, sk, coarseTotal > 0 ? coarseTotalYd3 * (pct / coarseTotal) : 0));
        });

        if (mat.water.volumeL > 0)    items.push(make('water', 'Water', 'water_l', mat.water.volumeL));
        if (adm.microFibreKg > 0)     items.push(make('micro_fibre', 'Micro Fibre', 'micro_fibre_kg', adm.microFibreKg));
        if (adm.macroFibreKg > 0)     items.push(make('macro_fibre', 'Macro Fibre', 'macro_fibre_kg', adm.macroFibreKg));
        if (adm.waterReducerKg > 0)   items.push(make('water_reducer', 'Water Reducer', 'water_reducer_kg', adm.waterReducerKg));
        if (adm.hardenerKg > 0)       items.push(make('hardener', 'Hardener', 'hardener_kg', adm.hardenerKg));
        if (pig.pigment1L > 0)        items.push(make('pigment1', mix.pigments.pigment1_name, 'pigment1_l', pig.pigment1L));
        if (pig.pigment2L > 0)        items.push(make('pigment2', mix.pigments.pigment2_name, 'pigment2_l', pig.pigment2L));
        return items;
    };

    const fbInvUpdateStatus = (m) => {
        const statusEl = document.getElementById(`inv-status-${m.key}`);
        if (!statusEl) return;
        if (!m.linked) { statusEl.textContent = '--'; statusEl.className = 'inventory-status'; return; }
        const ppEl   = document.getElementById(`inv-pp-${m.key}`);
        const usedEl = document.getElementById(`inv-used-${m.key}`);
        const remEl  = document.getElementById(`inv-rem-${m.key}`);
        const remRow = document.getElementById(`inv-rem-row-${m.key}`);
        const daysEl = document.getElementById(`inv-days-${m.key}`);
        if (ppEl)   ppEl.textContent   = fbInvFmtVal(m.perPaver,  m.stockKey);
        if (usedEl) usedEl.textContent = fbInvFmtVal(m.usedToday, m.stockKey);
        if (remEl)  remEl.textContent  = fbInvFmtVal(m.remaining, m.stockKey);
        if (remRow) remRow.className = m.remaining < 0 ? 'result-row inventory-negative' : 'result-row';
        if (m.stock <= 0) {
            statusEl.textContent = 'NO STOCK'; statusEl.className = 'inventory-status inventory-status-empty';
        } else if (m.daysRemaining === null) {
            statusEl.textContent = 'N/A'; statusEl.className = 'inventory-status';
        } else if (m.remaining <= 0) {
            statusEl.textContent = 'DEPLETED'; statusEl.className = 'inventory-status inventory-status-empty';
            if (daysEl) daysEl.textContent = '0d';
        } else if (m.daysRemaining > 2) {
            statusEl.textContent = `${m.daysRemaining.toFixed(1)}d`; statusEl.className = 'inventory-status inventory-status-ok';
            if (daysEl) daysEl.textContent = `${m.daysRemaining.toFixed(1)}d`;
        } else {
            statusEl.textContent = `${m.daysRemaining.toFixed(1)}d`; statusEl.className = 'inventory-status inventory-status-low';
            if (daysEl) daysEl.textContent = `${m.daysRemaining.toFixed(1)}d`;
        }
    };

    const fbInvRenderSummary = (materials) => {
        const el = document.getElementById('inv-summary-card');
        if (!el) return;
        if (!fbInvState.linked) { el.style.display = 'none'; return; }
        const actionable = materials.filter(m => m.linked && fbInvIsActionable(m.stockKey) && m.stock > 0);
        if (!actionable.length) { el.style.display = 'none'; return; }
        el.style.display = 'block';

        let bottleneck = null, minDays = null;
        actionable.forEach(m => {
            if (m.daysRemaining !== null && m.remaining > 0 && (minDays === null || m.daysRemaining < minDays)) {
                minDays = m.daysRemaining; bottleneck = m;
            }
        });

        const ppd = calculator.state.project.paversPerDay || 0;
        const dailyCost = materials.reduce((s, m) => s + (m.linked && m.perPaver ? m.perPaver * ppd * fbInvGetPrice(m.stockKey) : 0), 0);
        const restockCost = materials.reduce((s, m) => s + (m.stock > 0 ? m.stock * fbInvGetPrice(m.stockKey) : 0), 0);

        const runwayHtml = bottleneck
            ? `<div class="result-row"><span class="result-label">Production Runway</span><span class="result-value" style="font-weight:700;">${minDays.toFixed(1)} days</span></div>
               <div class="result-row"><span class="result-label">Limited By</span><span class="result-value">${bottleneck.name}</span></div>`
            : `<div class="result-row"><span class="result-label">Production Runway</span><span class="result-value" style="color:var(--text-secondary);">\u2014</span></div>`;

        el.innerHTML = `<h2 class="card-title">Stock Summary</h2>${runwayHtml}
            <div class="result-row"><span class="result-label">Daily Material Cost</span><span class="result-value">${fbInvFmtC(dailyCost)}</span></div>
            <div class="result-row"><span class="result-label">Restock Cost</span><span class="result-value">${fbInvFmtC(restockCost)}</span></div>`;
    };

    const fbInvRender = () => {
        const container = document.getElementById('inventory-materials');
        if (!container) return;
        const materials = fbInvBuildMaterials();

        if (materials.length === 0) {
            container.innerHTML = '<div class="card"><p style="color:var(--text-secondary);font-size:0.875rem;">Set a mix design in the Mix Design tab to see materials here.</p></div>';
            fbInvRenderSummary([]);
            return;
        }

        const groups = [
            { label: 'Cement',            keys: ['portland','white'] },
            { label: 'Fine Aggregates',   keys: ['sand','stone_dust_b','gcc400_b'] },
            { label: 'Coarse Aggregates', keys: ['regular_gravel','chip_gravel','white_gravel','stone_dust_c','gcc400_c','white_lime'] },
            { label: 'Water',             keys: ['water'] },
            { label: 'Admixtures',        keys: ['micro_fibre','macro_fibre','water_reducer','hardener'] },
            { label: 'Pigments',          keys: ['pigment1','pigment2'] },
        ];

        let html = '';
        groups.forEach(group => {
            const gm = materials.filter(m => group.keys.includes(m.key));
            if (!gm.length) return;
            const groupValue = gm.reduce((s, m) => s + m.stock * fbInvGetPrice(m.stockKey), 0);
            html += `<div class="card"><div class="inventory-group-label">${group.label}</div>`;
            gm.forEach(m => {
                const unit = fbInvGetUnit(m.stockKey);
                html += `<div class="inventory-item" data-inv-key="${m.key}">`;
                html += `<div class="inventory-item-header"><span class="inventory-item-name">${m.name}</span><span class="inventory-status" id="inv-status-${m.key}">--</span></div>`;
                html += `<div class="input-group" style="margin-bottom:8px;"><label class="input-label">Stock on Hand</label><div class="input-row">`;
                html += `<input type="number" id="inv-stock-${m.key}" class="input-number" value="${m.stock}" min="0" step="0.1" data-stock-key="${m.stockKey}">`;
                html += `<span class="input-unit">${unit}</span></div></div>`;
                if (m.linked) {
                    html += `<div class="result-row"><span class="result-label">Per Paver</span><span class="result-value" id="inv-pp-${m.key}">--</span></div>`;
                    html += `<div class="result-row"><span class="result-label">Used Today</span><span class="result-value" id="inv-used-${m.key}">--</span></div>`;
                    html += `<div class="result-row" id="inv-rem-row-${m.key}"><span class="result-label">Remaining</span><span class="result-value" id="inv-rem-${m.key}">--</span></div>`;
                    html += `<div class="result-row"><span class="result-label">Days Remaining</span><span class="result-value" id="inv-days-${m.key}">--</span></div>`;
                }
                html += `</div>`;
            });
            if (groupValue > 0) {
                html += `<div class="inventory-group-subtotal"><span>Stock Value</span><span>${fbInvFmtC(groupValue)}</span></div>`;
            }
            html += `</div>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('input[data-stock-key]').forEach(input => {
            input.addEventListener('input', (e) => {
                fbInvState.stock[e.target.dataset.stockKey] = parseFloat(e.target.value) || 0;
                fbInvSave();
                const mats = fbInvBuildMaterials();
                mats.forEach(fbInvUpdateStatus);
                fbInvRenderSummary(mats);
            });
        });

        materials.forEach(fbInvUpdateStatus);
        fbInvRenderSummary(materials);
    };

    const fbInvUpdate = () => {
        const rateEl = document.getElementById('inventory-daily-rate');
        if (rateEl) rateEl.textContent = `${calculator.state.project.paversPerDay || 0} pavers/day`;
        const orderSection = document.getElementById('purchase-order-section');
        if (orderSection) orderSection.style.display = fbInvState.linked ? 'block' : 'none';
        fbInvRender();
    };

    const fbInvGenerateOrder = () => {
        const target = parseFloat(document.getElementById('target-additional-pavers')?.value) || 0;
        const materials = fbInvBuildMaterials();
        const output = document.getElementById('purchase-order-output');
        if (!output) return;

        const orderItems = materials
            .filter(m => m.linked && m.perPaver > 0 && fbInvIsActionable(m.stockKey))
            .map(m => {
                const needed = m.perPaver * target;
                const available = m.linked ? Math.max(0, m.remaining) : m.stock;
                const qty = fbInvRoundUnit(Math.max(0, needed - available), m.stockKey);
                const unitPrice = fbInvGetPrice(m.stockKey);
                const cost = qty * unitPrice;
                return { name: m.name, qty, stockKey: m.stockKey, unitPrice, cost };
            })
            .filter(item => item.qty > 0);

        if (!orderItems.length) {
            output.innerHTML = `<div class="purchase-order-empty">Current stock covers ${target} pavers. No materials needed.</div>`;
            return;
        }

        if (window.PurchaseOrderEngine) {
            const s = calculator.state.settings;
            const settings = { business_name: s.businessName, business_address: s.businessAddress, business_phone: s.businessPhone, business_email: s.businessEmail, business_tax_id: s.businessTaxId, tax_rate: s.taxRate };
            window.PurchaseOrderEngine.generate(orderItems, settings, calculator.state.project.projectName, output);
        } else {
            const grandTotal = orderItems.reduce((s, i) => s + i.cost, 0);
            let html = `<div class="purchase-order-card"><div class="purchase-order-title">Order for ${target} additional pavers</div>`;
            orderItems.forEach(item => {
                const unit = fbInvGetUnit(item.stockKey);
                const qtyStr = item.stockKey.endsWith('_bags') ? `${item.qty} bags` : item.stockKey.endsWith('_yd3') ? `${item.qty.toFixed(2)} yd\u00B3` : `${item.qty.toFixed(1)} ${unit}`;
                html += `<div class="purchase-order-item"><span>${item.name}<br><span style="font-size:0.75rem;color:var(--text-secondary);">${qtyStr}</span></span><span class="purchase-order-qty">${fbInvFmtC(item.cost)}</span></div>`;
            });
            html += `<div class="purchase-order-total"><span>Total</span><span>${fbInvFmtC(grandTotal)}</span></div></div>`;
            output.innerHTML = html;
        }
    };

    // Wire inventory controls
    const fbToggleLinkEl = document.getElementById('toggle-calculator-link');
    if (fbToggleLinkEl) {
        fbToggleLinkEl.setAttribute('aria-checked', String(fbInvState.linked));
        const fbSlider = fbToggleLinkEl.querySelector('.toggle-slider');
        if (fbSlider) fbSlider.style.transform = fbInvState.linked ? 'translateX(20px)' : 'translateX(0)';
        const fbHintEl = document.getElementById('inventory-link-hint');
        if (fbHintEl && !fbInvState.linked) fbHintEl.textContent = 'Stock ledger only. Toggle on to link usage to the mix calculator.';
        fbToggleLinkEl.addEventListener('click', () => {
            fbInvState.linked = !fbInvState.linked;
            fbToggleLinkEl.setAttribute('aria-checked', String(fbInvState.linked));
            const sl = fbToggleLinkEl.querySelector('.toggle-slider');
            if (sl) sl.style.transform = fbInvState.linked ? 'translateX(20px)' : 'translateX(0)';
            const hint = document.getElementById('inventory-link-hint');
            if (hint) hint.textContent = fbInvState.linked ? 'Usage and days remaining are calculated from the current mix design.' : 'Stock ledger only. Toggle on to link usage to the mix calculator.';
            fbInvSave();
            fbInvUpdate();
        });
    }

    const fbPavTodayEl = document.getElementById('inventory-pavers-today');
    if (fbPavTodayEl) {
        if (fbInvState.produced > 0) fbPavTodayEl.value = fbInvState.produced;
        fbPavTodayEl.addEventListener('input', () => {
            fbInvState.produced = parseFloat(fbPavTodayEl.value) || 0;
            fbInvSave();
            const mats = fbInvBuildMaterials();
            mats.forEach(fbInvUpdateStatus);
            fbInvRenderSummary(mats);
        });
    }

    const fbClearTodayEl = document.getElementById('btn-clear-today');
    if (fbClearTodayEl) {
        fbClearTodayEl.addEventListener('click', () => {
            fbInvState.produced = 0;
            if (fbPavTodayEl) fbPavTodayEl.value = 0;
            fbInvSave();
            const mats = fbInvBuildMaterials();
            mats.forEach(fbInvUpdateStatus);
            fbInvRenderSummary(mats);
        });
    }

    const fbGenOrderBtn = document.getElementById('btn-generate-order');
    if (fbGenOrderBtn) fbGenOrderBtn.addEventListener('click', fbInvGenerateOrder);

    // Re-render inventory whenever calculator recalculates
    // Patch calculator.updateUI so inventory refreshes after every calculation
    const _fbBaseUpdateUI = calculator.updateUI.bind(calculator);
    calculator.updateUI = function() {
        _fbBaseUpdateUI();
        fbInvUpdate();
        fbApplyColorPreview(calculator.state.colorPreview, calculator.getActiveMix());
    };

    // Initial inventory render
    fbInvUpdate();
});
