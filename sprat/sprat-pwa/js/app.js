import wasmInit, { calculate_all, get_pigment_options } from 'sprat-pwa';

// State management
const state = {
    project: {
        project_name: '',
        length: 2,
        width: 1,
        thickness: 2,
        quantity: 10,
        waste_factor: 1.1,
        pavers_per_day: 10,
        workers: 1,
        wage_rate: 0,
        raw_material_transport: 0,
        selling_price: 0,
    },
    mixes: [
        {
            name: 'Mix 1',
            mix_parts: { cement: 1, sand: 2, coarse_agg: 3 },
            addition_a: { portland: 50, white: 50, custom: 0, custom_density: 1440 },
            addition_b: { sand: 50, stone_dust: 35, gcc400: 15, custom: 0, custom_density: 1600 },
            addition_c: { regular_gravel: 0, chip_gravel: 50, white_gravel: 50, stone_dust: 0, gcc400: 0, white_lime: 0, custom: 0, custom_density: 1600 },
            water: { wc_ratio: 0.45, wet_cast_factor: 1.57 },
            admixtures: { micro_fibre: 0.6, macro_fibre: 0, water_reducer: 3, hardener: 0 },
            pigments: { total_percent: 0, pigment1_name: 'Red Iron Oxide', pigment1_parts: 1, pigment2_name: 'None', pigment2_parts: 0 },
        }
    ],
    active_mix: 0,
    deleted_mixes: [],
    prices: {
        portland_bag: 1750,
        white_bag: 3810,
        sand: 5000,
        regular_gravel: 4000,
        chip_gravel: 4000,
        white_gravel: 1600,
        stone_dust: 1800,
        gcc400: 17891,
        white_lime: 55,
        micro_fibre: 1622.6,
        macro_fibre: 2200,
        water_reducer: 1378.34,
        hardener: 0,
        // Purchase unit sizes
        portland_pqty: 1,
        white_pqty: 1,
        sand_pqty: 1,
        stone_dust_pqty: 1,
        gcc400_pqty: 1,
        regular_gravel_pqty: 1,
        chip_gravel_pqty: 1,
        white_gravel_pqty: 1,
        white_lime_pqty: 1,
        micro_fibre_pqty: 1,
        macro_fibre_pqty: 1,
        water_reducer_pqty: 1,
        hardener_pqty: 1,
        water_pqty: 1000,
        water_unlimited: true,
        // Reorder points (0 = disabled)
        reorder_portland: 0,
        reorder_white: 0,
        reorder_sand: 0,
        reorder_stone_dust: 0,
        reorder_gcc400: 0,
        reorder_regular_gravel: 0,
        reorder_chip_gravel: 0,
        reorder_white_gravel: 0,
        reorder_white_lime: 0,
        reorder_micro_fibre: 0,
        reorder_macro_fibre: 0,
        reorder_water_reducer: 0,
        reorder_hardener: 0,
    },
    settings: {
        business_name: '',
        business_address: '',
        business_phone: '',
        business_email: '',
        business_tax_id: '',
        tax_rate: 15,
    },
    results: null,
    no_costs: false,
    color_preview: false,
    inventory: {
        pavers_produced_today: 0,
        linked_to_calculator: true,
        always_show_purchase: false,
        purchase_qtys: {},
        target_additional_pavers: 0,
        stock: {
            portland_bags: 0,
            white_bags: 0,
            sand_yd3: 0,
            stone_dust_b_yd3: 0,
            gcc400_b_yd3: 0,
            regular_gravel_yd3: 0,
            chip_gravel_yd3: 0,
            white_gravel_yd3: 0,
            stone_dust_c_yd3: 0,
            gcc400_c_yd3: 0,
            white_lime_yd3: 0,
            water_l: 0,
            micro_fibre_kg: 0,
            macro_fibre_kg: 0,
            water_reducer_kg: 0,
            hardener_kg: 0,
            pigment1_l: 0,
            pigment2_l: 0,
        },
    },
};

const getActiveMix = () => state.mixes[state.active_mix];

const createDefaultMix = (name) => ({
    name,
    mix_parts: { cement: 1, sand: 2, coarse_agg: 3 },
    addition_a: { portland: 50, white: 50, custom: 0, custom_density: 1440 },
    addition_b: { sand: 50, stone_dust: 35, gcc400: 15, custom: 0, custom_density: 1600 },
    addition_c: { regular_gravel: 0, chip_gravel: 50, white_gravel: 50, stone_dust: 0, gcc400: 0, white_lime: 0, custom: 0, custom_density: 1600 },
    water: { wc_ratio: 0.45, wet_cast_factor: 1.57 },
    admixtures: { micro_fibre: 0.6, macro_fibre: 0, water_reducer: 3, hardener: 0 },
    pigments: { total_percent: 0, pigment1_name: 'Red Iron Oxide', pigment1_parts: 1, pigment2_name: 'None', pigment2_parts: 0 },
});

const addMix = (name) => {
    state.mixes.push(createDefaultMix(name || `Mix ${state.mixes.length + 1}`));
    saveState();
};

const duplicateMix = (index) => {
    const copy = JSON.parse(JSON.stringify(state.mixes[index]));
    copy.name = copy.name + ' (copy)';
    state.mixes.splice(index + 1, 0, copy);
    if (state.active_mix > index) state.active_mix++;
    saveState();
};

const deleteMix = (index) => {
    if (state.mixes.length <= 1) { showToast('Cannot delete the last mix.'); return; }
    const removed = state.mixes.splice(index, 1)[0];
    state.deleted_mixes.push({ mix: removed, original_index: index });
    if (state.active_mix >= state.mixes.length) state.active_mix = state.mixes.length - 1;
    else if (state.active_mix > index) state.active_mix--;
    saveState();
    calculate();
};

const restoreMix = (deletedIndex) => {
    const entry = state.deleted_mixes.splice(deletedIndex, 1)[0];
    const insertAt = Math.min(entry.original_index, state.mixes.length);
    state.mixes.splice(insertAt, 0, entry.mix);
    if (state.active_mix >= insertAt) state.active_mix++;
    saveState();
};

const permanentlyDeleteMix = (deletedIndex) => {
    state.deleted_mixes.splice(deletedIndex, 1);
    saveState();
};

const setActiveMix = (index) => {
    if (index >= 0 && index < state.mixes.length) {
        state.active_mix = index;
        saveState();
        calculate();
    }
};

// DOM elements
const elements = {
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    
    // Project inputs
    projectLength: document.getElementById('project-length'),
    projectWidth: document.getElementById('project-width'),
    projectThickness: document.getElementById('project-thickness'),
    projectQuantity: document.getElementById('project-quantity'),
    projectWaste: document.getElementById('project-waste'),
    projectPaversPerDay: document.getElementById('project-pavers-per-day'),
    projectWorkers: document.getElementById('project-workers'),
    projectWageRate: document.getElementById('project-wage-rate'),
    projectTransport: document.getElementById('project-transport'),
    
    // Mix inputs and mix results are dynamic (indexed by mix index) — use gEl(id) or mEl(id) helpers below
    
    // Cost displays
    labourCostPerPaver: document.getElementById('labour-cost-per-paver'),
    transportCostPerPaverDisplay: document.getElementById('transport-cost-per-paver-display'),
    costPortland: document.getElementById('cost-portland'),
    costWhite: document.getElementById('cost-white'),
    costSand: document.getElementById('cost-sand'),
    costStoneDustB: document.getElementById('cost-stone-dust-b'),
    costGcc400B: document.getElementById('cost-gcc400-b'),
    costAddBTotal: document.getElementById('cost-add-b-total'),
    costRegularGravel: document.getElementById('cost-regular-gravel'),
    costChipGravel: document.getElementById('cost-chip-gravel'),
    costWhiteGravel: document.getElementById('cost-white-gravel'),
    costStoneDustC: document.getElementById('cost-stone-dust-c'),
    costGcc400C: document.getElementById('cost-gcc400-c'),
    costWhiteLime: document.getElementById('cost-white-lime'),
    costAddCTotal: document.getElementById('cost-add-c-total'),
    costMicroFibre: document.getElementById('cost-micro-fibre'),
    costMacroFibre: document.getElementById('cost-macro-fibre'),
    costWaterReducer: document.getElementById('cost-water-reducer'),
    costHardener: document.getElementById('cost-hardener'),
    costPigmentsTitle: document.getElementById('cost-pigments-title'),
    costPigment1: document.getElementById('cost-pigment-1'),
    costPigment2: document.getElementById('cost-pigment-2'),
    costPigment1Label: document.getElementById('cost-pigment-1-label'),
    costPigment2Label: document.getElementById('cost-pigment-2-label'),
    costRegularGravelRow: document.getElementById('cost-regular-gravel-row'),
    costChipGravelRow: document.getElementById('cost-chip-gravel-row'),
    costWhiteGravelRow: document.getElementById('cost-white-gravel-row'),
    costStoneDustCRow: document.getElementById('cost-stone-dust-c-row'),
    costGcc400CRow: document.getElementById('cost-gcc400-c-row'),
    costWhiteLimeRow: document.getElementById('cost-white-lime-row'),
    costMicroFibreRow: document.getElementById('cost-micro-fibre-row'),
    costMacroFibreRow: document.getElementById('cost-macro-fibre-row'),
    costWaterReducerRow: document.getElementById('cost-water-reducer-row'),
    costHardenerRow: document.getElementById('cost-hardener-row'),
    costPigment1Row: document.getElementById('cost-pigment-1-row'),
    costPigment2Row: document.getElementById('cost-pigment-2-row'),
    
    // Material summary
    summaryPortland: document.getElementById('summary-portland'),
    summaryWhite: document.getElementById('summary-white'),
    summaryCement: document.getElementById('summary-cement'),
    summaryFine: document.getElementById('summary-fine'),
    summaryCoarse: document.getElementById('summary-coarse'),
    summaryWater: document.getElementById('summary-water'),
    summaryTotal: document.getElementById('summary-total'),
    
    // Controls
    toggleNoCosts: document.getElementById('toggle-no-costs'),
    btnCopySummary: document.getElementById('btn-copy-summary'),
    btnDownloadCsv: document.getElementById('btn-download-csv'),
    
    // Prices
    pricePortland: document.getElementById('price-portland'),
    priceWhite: document.getElementById('price-white'),
    priceSand: document.getElementById('price-sand'),
    priceStoneDust: document.getElementById('price-stone-dust'),
    priceGcc400: document.getElementById('price-gcc400'),
    priceRegularGravel: document.getElementById('price-regular-gravel'),
    priceChipGravel: document.getElementById('price-chip-gravel'),
    priceWhiteGravel: document.getElementById('price-white-gravel'),
    priceWhiteLime: document.getElementById('price-white-lime'),
    priceMicroFibre: document.getElementById('price-micro-fibre'),
    priceMacroFibre: document.getElementById('price-macro-fibre'),
    priceWaterReducer: document.getElementById('price-water-reducer'),
    priceHardener: document.getElementById('price-hardener'),
    btnResetPrices: document.getElementById('btn-reset-prices'),
    // Purchase qty inputs
    pqtyPortland: document.getElementById('pqty-portland'),
    pqtyWhite: document.getElementById('pqty-white'),
    pqtySand: document.getElementById('pqty-sand'),
    pqtyStoneDust: document.getElementById('pqty-stone-dust'),
    pqtyGcc400: document.getElementById('pqty-gcc400'),
    pqtyRegularGravel: document.getElementById('pqty-regular-gravel'),
    pqtyChipGravel: document.getElementById('pqty-chip-gravel'),
    pqtyWhiteGravel: document.getElementById('pqty-white-gravel'),
    pqtyWhiteLime: document.getElementById('pqty-white-lime'),
    pqtyMicroFibre: document.getElementById('pqty-micro-fibre'),
    pqtyMacroFibre: document.getElementById('pqty-macro-fibre'),
    pqtyWaterReducer: document.getElementById('pqty-water-reducer'),
    pqtyHardener: document.getElementById('pqty-hardener'),
    pqtyWater: document.getElementById('pqty-water'),
    toggleWaterUnlimited: document.getElementById('toggle-water-unlimited'),
    waterPurchaseFields: document.getElementById('water-purchase-fields'),
    // Reorder point inputs
    reorderPortland: document.getElementById('reorder-portland'),
    reorderWhite: document.getElementById('reorder-white'),
    reorderSand: document.getElementById('reorder-sand'),
    reorderStoneDust: document.getElementById('reorder-stone-dust'),
    reorderGcc400: document.getElementById('reorder-gcc400'),
    reorderRegularGravel: document.getElementById('reorder-regular-gravel'),
    reorderChipGravel: document.getElementById('reorder-chip-gravel'),
    reorderWhiteGravel: document.getElementById('reorder-white-gravel'),
    reorderWhiteLime: document.getElementById('reorder-white-lime'),
    reorderMicroFibre: document.getElementById('reorder-micro-fibre'),
    reorderMacroFibre: document.getElementById('reorder-macro-fibre'),
    reorderWaterReducer: document.getElementById('reorder-water-reducer'),
    reorderHardener: document.getElementById('reorder-hardener'),

    // Loading
    loadingOverlay: document.getElementById('loading-overlay'),
};

// Helper: get element by ID (safe, returns null if missing)
const gEl = (id) => document.getElementById(id);
// Helper: get mix-indexed element for current active mix
const mEl = (suffix) => gEl(`${suffix}-${state.active_mix}`);

// Utility functions
const formatNum = (num, decimals = 1) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// HTML escape helper (D1)
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Toast notification function
const showToast = (message) => {
    if (!elements.toast || !elements.toastMessage) return;
    
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
};

const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return 'JMD 0';
    return 'JMD ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatWeight = (kg) => {
    if (kg === undefined || kg === null || isNaN(kg)) return '0 kg';
    return `${formatNum(kg)} kg`;
};

const formatVolume = (l) => {
    if (l === undefined || l === null || isNaN(l)) return '0 L';
    return `${formatNum(l)} L`;
};

const formatVolumeYd3 = (yd3) => {
    if (yd3 === undefined || yd3 === null || isNaN(yd3)) return '0 yd³';
    return `${formatNum(yd3, 3)} yd³`;
};

const formatBags = (bags) => {
    if (bags === undefined || bags === null || isNaN(bags)) return '0 bags';
    return `${formatNum(bags, 1)} bags`;
};

const formatGallons = (gal) => {
    if (gal === undefined || gal === null || isNaN(gal)) return '0 gal';
    return `${formatNum(gal, 2)} gal`;
};

const formatGrams = (g) => {
    if (g === undefined || g === null || isNaN(g)) return '0 g';
    return `${formatNum(g)} g`;
};

const formatMilliliters = (ml) => {
    if (ml === undefined || ml === null || isNaN(ml)) return '0 mL';
    return `${formatNum(ml, 1)} mL`;
};

const formatLiters = (l) => {
    if (l === undefined || l === null || isNaN(l)) return '0 L';
    return `${formatNum(l, 3)} L`;
};

// State update functions
const updateState = (path, value) => {
    const keys = path.split('.');
    let current = state;
    for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    calculate();
    saveState();
};

const updateAdditionValidation = (addition, totalElement) => {
    // Sum all numeric fields except density overrides
    const total = Object.entries(addition)
        .filter(([k]) => !k.includes('density'))
        .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
    const isValid = Math.abs(total - 100) < 0.01;
    totalElement.textContent = `${formatNum(total, 0)}% ${isValid ? 'OK' : '!'}`;
    totalElement.style.backgroundColor = isValid ? '#dcfce7' : '#fee2e2';
    totalElement.style.color = isValid ? '#166534' : '#991b1b';
};

// ─── Mix Rendering ──────────────────────────────────────────────────────────

const PIGMENT_OPTIONS = ['Red Iron Oxide', 'Yellow Iron Oxide', 'Black Iron Oxide', 'Blue Pigment', 'Green Pigment', 'Brown Pigment', 'White Titanium Dioxide', 'None'];

// ─── Paver Color Preview ─────────────────────────────────────────────────────
const PIGMENT_COLORS = {
    'Red Iron Oxide':         [140, 82, 57],
    'Yellow Iron Oxide':      [175, 128, 80],
    'Black Iron Oxide':       [58, 58, 58],
    'Blue Pigment':           [74, 111, 165],
    'Green Pigment':          [90, 125, 107],
    'Brown Pigment':          [122, 92, 58],
    'White Titanium Dioxide': [239, 239, 239],
    'None':                   null,
};
const BASE_GREY  = [154, 154, 148]; // Portland cement
const BASE_WHITE = [239, 239, 239]; // White cement

const lerpColor = (a, b, t) => [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
];

const computePaverColor = (mix) => {
    const a = mix.addition_a;
    const portland = a.portland || 0;
    const white = a.white || 0;
    const custom = a.custom || 0;
    const total = portland + white + custom || 1;
    const greyFrac = (portland + custom) / total; // custom treated as grey
    const base = lerpColor(BASE_WHITE, BASE_GREY, greyFrac);

    const pct = mix.pigments.total_percent || 0;
    if (pct <= 0) return base;

    const p1 = PIGMENT_COLORS[mix.pigments.pigment1_name];
    const p2 = PIGMENT_COLORS[mix.pigments.pigment2_name];
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
    return lerpColor(base, pigmentColor, saturation);
};

const applyColorPreview = () => {
    const header = document.querySelector('.header');
    if (!header) return;
    const hppEl = document.getElementById('header-profit-per-paver');
    const isProfit = hppEl ? hppEl.dataset.profit !== '0' : true;
    if (!state.color_preview) {
        header.style.background = '';
        header.style.color = '';
        if (hppEl && hppEl.textContent !== '--') {
            hppEl.style.color = isProfit ? '#4ade80' : '#f87171';
        }
        return;
    }
    const rgb = computePaverColor(getActiveMix());
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

const renderMixSelector = () => {
    const sel = gEl('active-mix-select');
    if (!sel) return;
    const prev = parseInt(sel.value, 10);
    sel.innerHTML = '';
    state.mixes.forEach((mix, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = mix.name || `Mix ${idx + 1}`;
        if (idx === state.active_mix) opt.selected = true;
        sel.appendChild(opt);
    });
};

const buildMixSectionHTML = (mix, i) => {
    const isActive = i === state.active_mix;
    const p1opts = PIGMENT_OPTIONS.map(n => `<option value="${n}"${mix.pigments.pigment1_name === n ? ' selected' : ''}>${n}</option>`).join('');
    const p2opts = PIGMENT_OPTIONS.map(n => `<option value="${n}"${mix.pigments.pigment2_name === n ? ' selected' : ''}>${n}</option>`).join('');
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
};

const wireMixSectionEvents = (i) => {
    const mix = state.mixes[i];

    // Collapse/expand toggle — clicking header area (not name or buttons)
    const header = gEl(`mix-header-${i}`);
    const body = gEl(`mix-body-${i}`);
    const chevron = gEl(`mix-chevron-${i}`);
    if (header) {
        header.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            const expanded = body.classList.toggle('expanded');
            chevron.classList.toggle('expanded', expanded);
            header.classList.toggle('expanded', expanded);
        });
    }

    // Set as active mix when clicking header (if not already)
    if (header) {
        header.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            if (i !== state.active_mix) {
                setActiveMix(i);
                renderMixSections();
                renderMixSelector();
            }
        });
    }

    // Mix name editing
    const nameEl = gEl(`mix-name-${i}`);
    if (nameEl) nameEl.addEventListener('input', (e) => {
        state.mixes[i].name = e.target.value;
        renderMixSelector();
        saveState();
    });

    // Duplicate button
    const dupBtn = gEl(`mix-dup-${i}`);
    if (dupBtn) dupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        duplicateMix(i);
        renderMixSections();
        renderMixSelector();
    });

    // Delete button (two-step confirmation)
    const delBtn = gEl(`mix-del-${i}`);
    if (delBtn) {
        let confirmTimer = null;
        let outsideListener = null;
        const cancelDelConfirm = () => {
            clearTimeout(confirmTimer);
            delBtn.classList.remove('confirm');
            delBtn.textContent = 'Delete';
            if (outsideListener) {
                document.removeEventListener('click', outsideListener, true);
                outsideListener = null;
            }
        };
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (delBtn.classList.contains('confirm')) {
                cancelDelConfirm();
                deleteMix(i);
                renderMixSections();
                renderMixSelector();
            } else {
                delBtn.classList.add('confirm');
                delBtn.textContent = 'Confirm?';
                confirmTimer = setTimeout(cancelDelConfirm, 3000);
                outsideListener = (ev) => {
                    if (!delBtn.contains(ev.target)) cancelDelConfirm();
                };
                document.addEventListener('click', outsideListener, true);
            }
        });
    }

    // Mix ratio inputs
    const wireMixNum = (sfx, setter) => {
        const el = gEl(`${sfx}-${i}`);
        if (el) el.addEventListener('input', (e) => {
            setter(parseFloat(e.target.value) || 0);
            calculate(); saveState();
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

    // Pigment total
    const pigTotalEl = gEl(`pigment-total-${i}`);
    if (pigTotalEl) pigTotalEl.addEventListener('input', (e) => {
        mix.pigments.total_percent = parseFloat(e.target.value) || 0;
        const ps = gEl(`pigment-section-${i}`);
        if (ps) ps.style.display = mix.pigments.total_percent > 0 ? 'block' : 'none';
        calculate(); saveState();
    });

    // Pigment selects
    const pig1NameEl = gEl(`pigment-1-name-${i}`);
    if (pig1NameEl) pig1NameEl.addEventListener('change', (e) => { mix.pigments.pigment1_name = e.target.value; calculate(); saveState(); });
    wireMixNum('pigment-1-parts', v => { mix.pigments.pigment1_parts = v; });

    const pig2NameEl = gEl(`pigment-2-name-${i}`);
    if (pig2NameEl) pig2NameEl.addEventListener('change', (e) => {
        mix.pigments.pigment2_name = e.target.value;
        const ppg = gEl(`pigment-2-parts-group-${i}`);
        const pr = gEl(`pigment-2-row-${i}`);
        if (ppg) ppg.style.display = e.target.value !== 'None' ? 'block' : 'none';
        if (pr) pr.style.display = e.target.value !== 'None' ? 'flex' : 'none';
        if (e.target.value === 'None') mix.pigments.pigment2_parts = 0;
        calculate(); saveState();
    });
    wireMixNum('pigment-2-parts', v => { mix.pigments.pigment2_parts = v; });

    // Addition A sliders
    const wireSlider = (sfx, setter) => {
        const el = gEl(`${sfx}-${i}`);
        const valEl = gEl(`${sfx}-value-${i}`);
        const addObj = sfx.startsWith('add-a') ? mix.addition_a : sfx.startsWith('add-b') ? mix.addition_b : mix.addition_c;
        const validEl = gEl(`add-${sfx[4]}-validation-${i}`);
        if (el) el.addEventListener('input', (e) => {
            setter(parseFloat(e.target.value) || 0);
            if (valEl) valEl.textContent = `${e.target.value}%`;
            if (validEl) updateAdditionValidation(addObj, validEl);
            calculate(); saveState();
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
};

const renderRestoreSection = (container) => {
    if (state.deleted_mixes.length === 0) return;
    const restoreDiv = document.createElement('div');
    restoreDiv.className = 'restore-section';
    restoreDiv.innerHTML = `
<div class="restore-section-header" id="restore-header">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  Restore Mix (${state.deleted_mixes.length})
</div>
<div class="restore-section-body" id="restore-body">
${state.deleted_mixes.map((entry, di) => `
  <div class="restore-mix-item">
    <span class="restore-mix-name">${entry.mix.name || 'Unnamed'}</span>
    <button class="mix-section-btn" id="restore-btn-${di}">Restore</button>
    <button class="mix-section-btn delete" id="restore-del-btn-${di}">Delete</button>
  </div>`).join('')}
</div>`;
    container.appendChild(restoreDiv);

    // Wire restore/delete buttons
    state.deleted_mixes.forEach((_, di) => {
        const rBtn = gEl(`restore-btn-${di}`);
        if (rBtn) rBtn.addEventListener('click', () => {
            restoreMix(di);
            renderMixSections();
            renderMixSelector();
        });
        const dBtn = gEl(`restore-del-btn-${di}`);
        if (dBtn) {
            let confirmTimer2 = null;
            dBtn.addEventListener('click', () => {
                if (dBtn.classList.contains('confirm')) {
                    clearTimeout(confirmTimer2);
                    permanentlyDeleteMix(di);
                    renderMixSections();
                } else {
                    dBtn.classList.add('confirm');
                    dBtn.textContent = 'Confirm?';
                    confirmTimer2 = setTimeout(() => {
                        dBtn.classList.remove('confirm');
                        dBtn.textContent = 'Delete';
                    }, 3000);
                }
            });
        }
    });
};

const renderMixSections = () => {
    const container = gEl('mix-sections-container');
    if (!container) return;
    container.innerHTML = '';

    state.mixes.forEach((mix, i) => {
        const div = document.createElement('div');
        div.innerHTML = buildMixSectionHTML(mix, i);
        container.appendChild(div.firstElementChild);
        wireMixSectionEvents(i);
    });

    // Add Mix button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add-mix';
    addBtn.textContent = '+ Add Mix';
    addBtn.addEventListener('click', () => {
        addMix();
        renderMixSections();
        renderMixSelector();
    });
    container.appendChild(addBtn);

    // Restore section
    renderRestoreSection(container);
};

// Event handlers
const setupEventListeners = () => {
    // Header stock status tap
    const stockStatusEl = document.getElementById('header-stock-status');
    if (stockStatusEl) {
        const goToStock = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const invBtn = document.querySelector('[data-tab="inventory"]');
            if (invBtn) invBtn.classList.add('active');
            const invTab = document.getElementById('tab-inventory');
            if (invTab) invTab.classList.add('active');
            const key = stockStatusEl._stockTarget;
            if (key) {
                const target = document.querySelector(`[data-inv-key="${key}"]`);
                if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
            }
        };
        stockStatusEl.addEventListener('click', goToStock);
        stockStatusEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') goToStock(); });
    }

    // Project inputs
    const projectNameEl = document.getElementById('project-name');
    if (projectNameEl) projectNameEl.addEventListener('input', (e) => {
        state.project.project_name = e.target.value;
        saveState();
        const hn = document.getElementById('header-project-name');
        if (hn) hn.textContent = e.target.value || 'Concrete Mix Calculator';
    });
    elements.projectLength.addEventListener('input', (e) => updateState('project.length', parseFloat(e.target.value) || 0));
    elements.projectWidth.addEventListener('input', (e) => updateState('project.width', parseFloat(e.target.value) || 0));
    elements.projectThickness.addEventListener('input', (e) => updateState('project.thickness', parseFloat(e.target.value) || 0));
    elements.projectQuantity.addEventListener('input', (e) => updateState('project.quantity', parseFloat(e.target.value) || 0));
    elements.projectWaste.addEventListener('input', (e) => {
        const v = Math.min(2, Math.max(1, parseFloat(e.target.value) || 1));
        e.target.value = v;
        updateState('project.waste_factor', v);
    });
    elements.projectPaversPerDay.addEventListener('input', (e) => updateState('project.pavers_per_day', parseFloat(e.target.value) || 0));
    elements.projectWorkers.addEventListener('input', (e) => updateState('project.workers', Math.max(1, parseInt(e.target.value) || 1)));
    elements.projectWageRate.addEventListener('input', (e) => updateState('project.wage_rate', parseFloat(e.target.value) || 0));
    elements.projectTransport.addEventListener('input', (e) => updateState('project.raw_material_transport', parseFloat(e.target.value) || 0));
    const projectSellingPrice = document.getElementById('project-selling-price');
    if (projectSellingPrice) projectSellingPrice.addEventListener('input', (e) => updateState('project.selling_price', parseFloat(e.target.value) || 0));

    // Mix tab input listeners are wired dynamically in renderMixSections()

    // Active mix selector (Project tab)
    const activeMixSel = gEl('active-mix-select');
    if (activeMixSel) activeMixSel.addEventListener('change', (e) => {
        setActiveMix(parseInt(e.target.value, 10));
        renderMixSections();
    });


    // Prices
    elements.pricePortland.addEventListener('input', (e) => updateState('prices.portland_bag', parseFloat(e.target.value) || 0));
    elements.priceWhite.addEventListener('input', (e) => updateState('prices.white_bag', parseFloat(e.target.value) || 0));
    elements.priceSand.addEventListener('input', (e) => updateState('prices.sand', parseFloat(e.target.value) || 0));
    elements.priceStoneDust.addEventListener('input', (e) => updateState('prices.stone_dust', parseFloat(e.target.value) || 0));
    elements.priceGcc400.addEventListener('input', (e) => updateState('prices.gcc400', parseFloat(e.target.value) || 0));
    elements.priceRegularGravel.addEventListener('input', (e) => updateState('prices.regular_gravel', parseFloat(e.target.value) || 0));
    elements.priceChipGravel.addEventListener('input', (e) => updateState('prices.chip_gravel', parseFloat(e.target.value) || 0));
    elements.priceWhiteGravel.addEventListener('input', (e) => updateState('prices.white_gravel', parseFloat(e.target.value) || 0));
    elements.priceWhiteLime.addEventListener('input', (e) => updateState('prices.white_lime', parseFloat(e.target.value) || 0));
    elements.priceMicroFibre.addEventListener('input', (e) => updateState('prices.micro_fibre', parseFloat(e.target.value) || 0));
    elements.priceMacroFibre.addEventListener('input', (e) => updateState('prices.macro_fibre', parseFloat(e.target.value) || 0));
    elements.priceWaterReducer.addEventListener('input', (e) => updateState('prices.water_reducer', parseFloat(e.target.value) || 0));
    elements.priceHardener.addEventListener('input', (e) => updateState('prices.hardener', parseFloat(e.target.value) || 0));

    // Purchase qty listeners
    const pqtyPairs = [
        [elements.pqtyPortland,      'prices.portland_pqty'],
        [elements.pqtyWhite,         'prices.white_pqty'],
        [elements.pqtySand,          'prices.sand_pqty'],
        [elements.pqtyStoneDust,     'prices.stone_dust_pqty'],
        [elements.pqtyGcc400,        'prices.gcc400_pqty'],
        [elements.pqtyRegularGravel, 'prices.regular_gravel_pqty'],
        [elements.pqtyChipGravel,    'prices.chip_gravel_pqty'],
        [elements.pqtyWhiteGravel,   'prices.white_gravel_pqty'],
        [elements.pqtyWhiteLime,     'prices.white_lime_pqty'],
        [elements.pqtyMicroFibre,    'prices.micro_fibre_pqty'],
        [elements.pqtyMacroFibre,    'prices.macro_fibre_pqty'],
        [elements.pqtyWaterReducer,  'prices.water_reducer_pqty'],
        [elements.pqtyHardener,      'prices.hardener_pqty'],
        [elements.pqtyWater,         'prices.water_pqty'],
    ];
    pqtyPairs.forEach(([el, key]) => {
        if (el) el.addEventListener('input', (e) => updateState(key, parseFloat(e.target.value) || 1));
    });

    // Reorder point listeners
    const reorderPairs = [
        [elements.reorderPortland, 'prices.reorder_portland'],
        [elements.reorderWhite, 'prices.reorder_white'],
        [elements.reorderSand, 'prices.reorder_sand'],
        [elements.reorderStoneDust, 'prices.reorder_stone_dust'],
        [elements.reorderGcc400, 'prices.reorder_gcc400'],
        [elements.reorderRegularGravel, 'prices.reorder_regular_gravel'],
        [elements.reorderChipGravel, 'prices.reorder_chip_gravel'],
        [elements.reorderWhiteGravel, 'prices.reorder_white_gravel'],
        [elements.reorderWhiteLime, 'prices.reorder_white_lime'],
        [elements.reorderMicroFibre, 'prices.reorder_micro_fibre'],
        [elements.reorderMacroFibre, 'prices.reorder_macro_fibre'],
        [elements.reorderWaterReducer, 'prices.reorder_water_reducer'],
        [elements.reorderHardener, 'prices.reorder_hardener'],
    ];
    reorderPairs.forEach(([el, key]) => {
        if (el) el.addEventListener('input', (e) => updateState(key, parseFloat(e.target.value) || 0));
    });

    // Water unlimited toggle
    const applyWaterUnlimited = (val) => {
        state.prices.water_unlimited = val;
        if (elements.toggleWaterUnlimited) {
            elements.toggleWaterUnlimited.setAttribute('aria-checked', String(val));
            elements.toggleWaterUnlimited.classList.toggle('active', val);
            const sl = elements.toggleWaterUnlimited.querySelector('.toggle-slider');
            if (sl) sl.style.transform = val ? 'translateX(20px)' : 'translateX(0)';
        }
        if (elements.waterPurchaseFields) elements.waterPurchaseFields.style.display = val ? 'none' : 'block';
        saveState();
        renderInventoryUI();
    };
    if (elements.toggleWaterUnlimited) {
        elements.toggleWaterUnlimited.addEventListener('click', () => applyWaterUnlimited(!state.prices.water_unlimited));
    }

    // Business identity + tax inputs
    const bizFields = ['biz-name', 'biz-address', 'biz-phone', 'biz-email', 'biz-tax-id'];
    const bizKeys   = ['business_name', 'business_address', 'business_phone', 'business_email', 'business_tax_id'];
    bizFields.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => { state.settings[bizKeys[i]] = el.value; saveState(); });
    });
    const taxRateEl = document.getElementById('tax-rate');
    if (taxRateEl) taxRateEl.addEventListener('input', () => { state.settings.tax_rate = parseFloat(taxRateEl.value) || 0; saveState(); });

    {
        let resetConfirmTimer = null;
        let resetOutsideListener = null;
        const cancelResetConfirm = () => {
            clearTimeout(resetConfirmTimer);
            elements.btnResetPrices.innerHTML = '<span class="icon" id="icon-reset"></span> Reset to Default Prices';
            elements.btnResetPrices.removeAttribute('data-confirm');
            if (resetOutsideListener) {
                document.removeEventListener('click', resetOutsideListener, true);
                resetOutsideListener = null;
            }
        };
        elements.btnResetPrices.addEventListener('click', () => {
            if (elements.btnResetPrices.dataset.confirm === '1') {
                cancelResetConfirm();
                state.prices = {
                    portland_bag: 1750,
                    white_bag: 3810,
                    sand: 5000,
                    regular_gravel: 4000,
                    chip_gravel: 4000,
                    white_gravel: 1600,
                    stone_dust: 1800,
                    gcc400: 17891,
                    white_lime: 55,
                    micro_fibre: 1622.6,
                    macro_fibre: 2200,
                    water_reducer: 1378.34,
                    hardener: 0,
                    portland_pqty: 1,
                    white_pqty: 1,
                    sand_pqty: 1,
                    stone_dust_pqty: 1,
                    gcc400_pqty: 1,
                    regular_gravel_pqty: 1,
                    chip_gravel_pqty: 1,
                    white_gravel_pqty: 1,
                    white_lime_pqty: 1,
                    micro_fibre_pqty: 1,
                    macro_fibre_pqty: 1,
                    water_reducer_pqty: 1,
                    hardener_pqty: 1,
                    water_pqty: 1000,
                    water_unlimited: true,
                };
                updatePricesUI();
                calculate();
                saveState();
            } else {
                elements.btnResetPrices.dataset.confirm = '1';
                elements.btnResetPrices.textContent = 'Confirm reset?';
                resetConfirmTimer = setTimeout(cancelResetConfirm, 3000);
                resetOutsideListener = (ev) => {
                    if (!elements.btnResetPrices.contains(ev.target)) cancelResetConfirm();
                };
                document.addEventListener('click', resetOutsideListener, true);
            }
        });
    }

    // Controls
    elements.toggleNoCosts.addEventListener('click', () => {
        state.no_costs = !state.no_costs;
        elements.toggleNoCosts.classList.toggle('active', state.no_costs);
        elements.toggleNoCosts.querySelector('.toggle-slider').style.transform = state.no_costs ? 'translateX(20px)' : 'translateX(0)';
        calculate();
        saveState();
    });

    const toggleColorPreview = document.getElementById('toggle-color-preview');
    if (toggleColorPreview) {
        toggleColorPreview.addEventListener('click', () => {
            state.color_preview = !state.color_preview;
            toggleColorPreview.classList.toggle('active', state.color_preview);
            toggleColorPreview.setAttribute('aria-checked', String(state.color_preview));
            toggleColorPreview.querySelector('.toggle-slider').style.transform = state.color_preview ? 'translateX(20px)' : 'translateX(0)';
            applyColorPreview();
            saveState();
        });
    }
    
    elements.btnCopySummary.addEventListener('click', copySummary);
    elements.btnDownloadCsv.addEventListener('click', downloadCSV);

    const btnResetAll = document.getElementById('btn-reset-all');
    if (btnResetAll) btnResetAll.addEventListener('click', () => {
        localStorage.removeItem(STATE_KEY);
        location.reload();
    });

    // C1: Export backup
    const btnExport = document.getElementById('btn-export-data');
    if (btnExport) btnExport.addEventListener('click', () => {
        const backup = {
            _version: 2,
            state: JSON.parse(localStorage.getItem(STATE_KEY) || 'null'),
            inventory: JSON.parse(localStorage.getItem(INVENTORY_KEY) || 'null'),
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = new Date();
        a.download = `sprat-backup-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // C1: Import backup
    const btnImport = document.getElementById('btn-import-data');
    if (btnImport) btnImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data._version || !data.state || !data.state.prices || !data.state.project) {
                    showToast('Invalid backup file');
                    return;
                }
                if (data.state) localStorage.setItem(STATE_KEY, JSON.stringify(data.state));
                if (data.inventory) localStorage.setItem(INVENTORY_KEY, JSON.stringify(data.inventory));
                showToast('Backup restored — reloading…');
                setTimeout(() => location.reload(), 1200);
            } catch (_) {
                showToast('Could not read backup file');
            }
        };
        reader.readAsText(file);
        btnImport.value = '';
    });

    const btnSaveRecipe = document.getElementById('btn-save-recipe');
    if (btnSaveRecipe) btnSaveRecipe.addEventListener('click', saveCurrentAsRecipe);

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // Inventory event listeners
    const pavTodayEl = document.getElementById('inventory-pavers-today');
    if (pavTodayEl) {
        pavTodayEl.addEventListener('input', (e) => {
            state.inventory.pavers_produced_today = parseFloat(e.target.value) || 0;
            saveInventory();
            updateInventoryTab();
        });
    }

    const toggleLinkEl = document.getElementById('toggle-calculator-link');
    if (toggleLinkEl) {
        toggleLinkEl.addEventListener('click', () => {
            state.inventory.linked_to_calculator = !state.inventory.linked_to_calculator;
            toggleLinkEl.setAttribute('aria-checked', String(state.inventory.linked_to_calculator));
            toggleLinkEl.querySelector('.toggle-slider').style.transform =
                state.inventory.linked_to_calculator ? 'translateX(20px)' : 'translateX(0)';
            const hintEl = document.getElementById('inventory-link-hint');
            if (hintEl) {
                hintEl.textContent = state.inventory.linked_to_calculator
                    ? 'Usage and days remaining are calculated from the current mix design.'
                    : 'Stock ledger only. Toggle on to link usage to the mix calculator.';
            }
            saveInventory();
            _inventoryMaterialKeys = ''; // force re-render to show/hide usage rows
            updateInventoryTab();
        });
    }

    const alwaysPurchaseToggle = document.getElementById('toggle-always-purchase');
    if (alwaysPurchaseToggle) {
        alwaysPurchaseToggle.addEventListener('click', () => {
            state.inventory.always_show_purchase = !state.inventory.always_show_purchase;
            alwaysPurchaseToggle.setAttribute('aria-checked', String(state.inventory.always_show_purchase));
            alwaysPurchaseToggle.classList.toggle('active', state.inventory.always_show_purchase);
            alwaysPurchaseToggle.querySelector('.toggle-slider').style.transform =
                state.inventory.always_show_purchase ? 'translateX(20px)' : 'translateX(0)';
            saveInventory();
            updateInventoryValues(calculateInventory());
        });
        // Sync visual state from loaded value
        alwaysPurchaseToggle.setAttribute('aria-checked', String(state.inventory.always_show_purchase));
        alwaysPurchaseToggle.classList.toggle('active', state.inventory.always_show_purchase);
        const apSlider = alwaysPurchaseToggle.querySelector('.toggle-slider');
        if (apSlider) apSlider.style.transform = state.inventory.always_show_purchase ? 'translateX(20px)' : 'translateX(0)';
    }

    const clearTodayEl = document.getElementById('btn-clear-today');
    if (clearTodayEl) {
        clearTodayEl.addEventListener('click', () => {
            state.inventory.pavers_produced_today = 0;
            const pavEl = document.getElementById('inventory-pavers-today');
            if (pavEl) pavEl.value = 0;
            saveInventory();
            updateInventoryTab();
        });
    }

    const targetEl = document.getElementById('target-additional-pavers');
    if (targetEl) {
        targetEl.value = state.inventory.target_additional_pavers || 0;
        targetEl.addEventListener('input', (e) => {
            state.inventory.target_additional_pavers = parseFloat(e.target.value) || 0;
            saveInventory();
        });
    }

    const genOrderEl = document.getElementById('btn-generate-order');
    if (genOrderEl) {
        genOrderEl.addEventListener('click', generatePurchaseOrder);
    }
};

const updatePricesUI = () => {
    elements.pricePortland.value = state.prices.portland_bag;
    elements.priceWhite.value = state.prices.white_bag;
    elements.priceSand.value = state.prices.sand;
    elements.priceStoneDust.value = state.prices.stone_dust;
    elements.priceGcc400.value = state.prices.gcc400;
    elements.priceRegularGravel.value = state.prices.regular_gravel;
    elements.priceChipGravel.value = state.prices.chip_gravel;
    elements.priceWhiteGravel.value = state.prices.white_gravel;
    elements.priceWhiteLime.value = state.prices.white_lime;
    elements.priceMicroFibre.value = state.prices.micro_fibre;
    elements.priceMacroFibre.value = state.prices.macro_fibre;
    elements.priceWaterReducer.value = state.prices.water_reducer;
    elements.priceHardener.value = state.prices.hardener;
    // Purchase qtys
    if (elements.pqtyPortland) elements.pqtyPortland.value = state.prices.portland_pqty;
    if (elements.pqtyWhite) elements.pqtyWhite.value = state.prices.white_pqty;
    if (elements.pqtySand) elements.pqtySand.value = state.prices.sand_pqty;
    if (elements.pqtyStoneDust) elements.pqtyStoneDust.value = state.prices.stone_dust_pqty;
    if (elements.pqtyGcc400) elements.pqtyGcc400.value = state.prices.gcc400_pqty;
    if (elements.pqtyRegularGravel) elements.pqtyRegularGravel.value = state.prices.regular_gravel_pqty;
    if (elements.pqtyChipGravel) elements.pqtyChipGravel.value = state.prices.chip_gravel_pqty;
    if (elements.pqtyWhiteGravel) elements.pqtyWhiteGravel.value = state.prices.white_gravel_pqty;
    if (elements.pqtyWhiteLime) elements.pqtyWhiteLime.value = state.prices.white_lime_pqty;
    if (elements.pqtyMicroFibre) elements.pqtyMicroFibre.value = state.prices.micro_fibre_pqty;
    if (elements.pqtyMacroFibre) elements.pqtyMacroFibre.value = state.prices.macro_fibre_pqty;
    if (elements.pqtyWaterReducer) elements.pqtyWaterReducer.value = state.prices.water_reducer_pqty;
    if (elements.pqtyHardener) elements.pqtyHardener.value = state.prices.hardener_pqty;
    if (elements.pqtyWater) elements.pqtyWater.value = state.prices.water_pqty;
    // Reorder points
    if (elements.reorderPortland) elements.reorderPortland.value = state.prices.reorder_portland;
    if (elements.reorderWhite) elements.reorderWhite.value = state.prices.reorder_white;
    if (elements.reorderSand) elements.reorderSand.value = state.prices.reorder_sand;
    if (elements.reorderStoneDust) elements.reorderStoneDust.value = state.prices.reorder_stone_dust;
    if (elements.reorderGcc400) elements.reorderGcc400.value = state.prices.reorder_gcc400;
    if (elements.reorderRegularGravel) elements.reorderRegularGravel.value = state.prices.reorder_regular_gravel;
    if (elements.reorderChipGravel) elements.reorderChipGravel.value = state.prices.reorder_chip_gravel;
    if (elements.reorderWhiteGravel) elements.reorderWhiteGravel.value = state.prices.reorder_white_gravel;
    if (elements.reorderWhiteLime) elements.reorderWhiteLime.value = state.prices.reorder_white_lime;
    if (elements.reorderMicroFibre) elements.reorderMicroFibre.value = state.prices.reorder_micro_fibre;
    if (elements.reorderMacroFibre) elements.reorderMacroFibre.value = state.prices.reorder_macro_fibre;
    if (elements.reorderWaterReducer) elements.reorderWaterReducer.value = state.prices.reorder_water_reducer;
    if (elements.reorderHardener) elements.reorderHardener.value = state.prices.reorder_hardener;
    // Water unlimited toggle state
        const input = {
            project: { ...state.project, wage_rate: state.project.wage_rate * (state.project.workers || 1) },
            mix_parts: mix.mix_parts,
            addition_a: mix.addition_a,
            addition_b: mix.addition_b,
            addition_c: mix.addition_c,
            water: mix.water,
            admixtures: mix.admixtures,
            pigments: mix.pigments,
            prices: state.prices,
        };
        const results = calculate_all(input);
        state.results = results;
        updateUI();
    } catch (error) {
        console.error('Calculation error:', error);
        if (state.results) updateUI(); // show last valid results rather than staying blank
    }
};

const updateUI = () => {
    if (!state.results) return;
    
    const r = state.results;
    
    // Update mix section results (indexed by active mix)
    const i = state.active_mix;
    const mix = getActiveMix();
    const sEl = (sfx, v) => { const el = gEl(`${sfx}-${i}`); if (el) el.textContent = v; };
    const sElStyle = (sfx, prop, v) => { const el = gEl(`${sfx}-${i}`); if (el) el.style[prop] = v; };

    // Volume results
    sEl('volume-per-paver', `${formatNum(r.volumes.volume_per_paver)} in³`);
    sEl('total-volume', formatVolume(r.volumes.volume_l));
    sEl('volume-m3', formatNum(r.volumes.volume_m3, 4) + ' m³');
    sEl('volume-yd3', formatVolumeYd3(r.volumes.volume_yd3));

    // Cement results
    sEl('cement-portland', `${formatVolume(r.cement.portland_volume_l)} / ${formatBags(r.cement.portland_bags)}`);
    sEl('cement-white', `${formatVolume(r.cement.white_volume_l)} / ${formatBags(r.cement.white_bags)}`);
    sEl('cement-total', formatWeight(r.cement.cement_weight_kg));

    // Fine aggregates
    sEl('fine-sand', formatVolume(r.fine_aggregates.sand_volume_l));
    sEl('fine-stone-dust', formatVolume(r.fine_aggregates.stone_dust_b_volume_l));
    sEl('fine-gcc400', formatVolume(r.fine_aggregates.gcc400_b_volume_l));
    sEl('fine-total', formatVolume(r.fine_aggregates.add_b_volume_l));

    // Coarse aggregates
    sEl('coarse-total', `${formatVolume(r.coarse_aggregates.add_c_volume_l)} (${formatVolumeYd3(r.coarse_aggregates.add_c_volume_yd3)})`);

    // Water results
    sEl('water-volume', formatVolume(r.water.water_volume_l));
    sEl('water-gallons', formatGallons(r.water.water_gallons));
    sEl('water-weight', formatWeight(r.water.water_weight_kg));
    sEl('water-80', formatVolume(r.water.water_volume_l * 0.8));
    sEl('water-20', formatVolume(r.water.water_volume_l * 0.2));

    // Admixtures results
    sEl('admixture-micro-result', `${formatGrams(r.admixtures.micro_fibre_g)} (${formatWeight(r.admixtures.micro_fibre_kg)})`);
    sElStyle('admixture-macro-row', 'display', r.admixtures.macro_fibre_kg > 0 ? 'flex' : 'none');
    if (r.admixtures.macro_fibre_kg > 0) sEl('admixture-macro-result', formatWeight(r.admixtures.macro_fibre_kg));
    sEl('admixture-water-reducer-result', formatMilliliters(r.admixtures.water_reducer_ml));
    sEl('admixture-mixer-water', formatMilliliters(r.admixtures.water_mixer_ml));
    sEl('admixture-mixer-total', `${formatMilliliters(r.admixtures.total_mixer_volume_ml)} (${formatLiters(r.admixtures.total_mixer_volume_l)})`);
    sElStyle('admixture-hardener-row', 'display', r.admixtures.hardener_kg > 0 ? 'flex' : 'none');
    if (r.admixtures.hardener_kg > 0) sEl('admixture-hardener-result', formatWeight(r.admixtures.hardener_kg));

    // Hardener zero-price warning
    sElStyle('hardener-zero-price-note', 'display', (mix.admixtures.hardener > 0 && state.prices.hardener === 0) ? 'block' : 'none');

    // Pigment results
    sEl('pigment-1-label', mix.pigments.pigment1_name);
    sEl('pigment-1-result', `${formatMilliliters(r.pigments.pigment1_ml)} (${formatLiters(r.pigments.pigment1_l)} / ${formatWeight(r.pigments.pigment1_kg)})`);
    if (mix.pigments.pigment2_name !== 'None' && mix.pigments.pigment2_parts > 0) {
        sEl('pigment-2-label', mix.pigments.pigment2_name);
        sEl('pigment-2-result', `${formatMilliliters(r.pigments.pigment2_ml)} (${formatLiters(r.pigments.pigment2_l)} / ${formatWeight(r.pigments.pigment2_kg)})`);
    }
    sEl('pigment-total-result', formatWeight(r.pigments.total_pigment_kg));
    
    // Update cost results
    elements.labourCostPerPaver.textContent = formatCurrency(r.costs.labour_cost_per_paver);
    elements.transportCostPerPaverDisplay.textContent = formatCurrency(r.costs.transport_cost_per_paver);

    // Update dynamic quantity labels
    const qty = state.project.quantity;
    const setQty = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setQty('cost-summary-qty', qty);
    setQty('cost-summary-grand-qty', qty);
    setQty('cost-summary-div-qty', `${formatCurrency(r.costs.total_material_cost)} \u00f7 ${qty}`);
    const costTotalSub = document.getElementById('cost-total-sub-detail');
    if (costTotalSub) costTotalSub.textContent = `Material: ${formatCurrency(r.costs.material_cost_per_paver)} + Labour: ${formatCurrency(r.costs.labour_cost_per_paver)} + Transport: ${formatCurrency(r.costs.transport_cost_per_paver)}`;
    // Sync cost summary tab values
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('cost-material-total', formatCurrency(r.costs.total_material_cost));
    setEl('cost-material-per-paver', formatCurrency(r.costs.material_cost_per_paver));
    setEl('cost-total-per-paver', formatCurrency(r.costs.total_cost_per_paver));
    setEl('cost-grand-total', formatCurrency(r.costs.grand_total));

    // Profit calculations
    const sellingPrice = state.project.selling_price || 0;
    const totalCostPerPaver = r.costs.total_cost_per_paver;
    const profitPerPaver = sellingPrice - totalCostPerPaver;
    const profitMargin = sellingPrice > 0 ? (profitPerPaver / sellingPrice) * 100 : 0;
    const batchProfit = profitPerPaver * qty;
    const profitColor = profitPerPaver >= 0 ? '#059669' : '#dc2626';

    // Quick summary card (Project tab)
    setEl('quick-cost-per-paver', formatCurrency(totalCostPerPaver));
    setEl('quick-profit-per-paver', formatCurrency(profitPerPaver));
    setEl('quick-profit-margin', `${formatNum(profitMargin, 1)}%`);
    const qppEl = document.getElementById('quick-profit-per-paver');
    const qpmEl = document.getElementById('quick-profit-margin');
    if (qppEl) qppEl.style.color = sellingPrice > 0 ? profitColor : '';
    if (qpmEl) qpmEl.style.color = sellingPrice > 0 ? profitColor : '';

    // Cost summary profit box (Costs tab)
    const profitBox = document.getElementById('profit-summary-box');
    if (profitBox) profitBox.style.display = sellingPrice > 0 ? 'block' : 'none';
    setEl('cost-profit-per-paver', formatCurrency(profitPerPaver));
    const profitSubEl = document.getElementById('cost-profit-sub');
    if (profitSubEl) profitSubEl.textContent = `Margin: ${formatNum(profitMargin, 1)}%`;
    const cpEl = document.getElementById('cost-profit-per-paver');
    if (cpEl) cpEl.style.color = profitColor;
    setEl('cost-profit-total', `Total Profit (${qty} pavers): ${formatCurrency(batchProfit)}`);
    const cptEl = document.getElementById('cost-profit-total');
    if (cptEl) cptEl.style.color = profitColor;

    // Update cost breakdown
    elements.costPortland.textContent = formatCurrency(r.costs.portland_cost);
    elements.costWhite.textContent = formatCurrency(r.costs.white_cost);
    elements.costSand.textContent = formatCurrency(r.costs.sand_cost);
    elements.costStoneDustB.textContent = formatCurrency(r.costs.stone_dust_b_cost);
    elements.costGcc400B.textContent = formatCurrency(r.costs.gcc400_b_cost);
    elements.costAddBTotal.textContent = formatCurrency(r.costs.add_b_cost);

    // Update cost breakdown labels with actual quantities
    const portlandLabelEl = gEl('cost-portland-label');
    if (portlandLabelEl) portlandLabelEl.textContent = `Portland (${formatBags(r.cement.portland_bags)})`;
    const whiteLabelEl = gEl('cost-white-label');
    if (whiteLabelEl) whiteLabelEl.textContent = `White Cement (${formatBags(r.cement.white_bags)})`;
    const gcc400BLabelEl = gEl('cost-gcc400-b-label');
    if (gcc400BLabelEl) gcc400BLabelEl.textContent = `GCC 400 (${formatVolumeYd3(r.fine_aggregates.gcc400_b_volume_yd3)})`;
    
    // Show/hide coarse aggregate costs based on percentages
    elements.costRegularGravelRow.style.display = getActiveMix().addition_c.regular_gravel > 0 ? 'flex' : 'none';
    elements.costChipGravelRow.style.display = getActiveMix().addition_c.chip_gravel > 0 ? 'flex' : 'none';
    elements.costWhiteGravelRow.style.display = getActiveMix().addition_c.white_gravel > 0 ? 'flex' : 'none';
    elements.costStoneDustCRow.style.display = getActiveMix().addition_c.stone_dust > 0 ? 'flex' : 'none';
    elements.costGcc400CRow.style.display = getActiveMix().addition_c.gcc400 > 0 ? 'flex' : 'none';
    elements.costWhiteLimeRow.style.display = getActiveMix().addition_c.white_lime > 0 ? 'flex' : 'none';

    if (getActiveMix().addition_c.regular_gravel > 0) elements.costRegularGravel.textContent = formatCurrency(r.costs.regular_gravel_cost);
    if (getActiveMix().addition_c.chip_gravel > 0) elements.costChipGravel.textContent = formatCurrency(r.costs.chip_gravel_cost);
    if (getActiveMix().addition_c.white_gravel > 0) elements.costWhiteGravel.textContent = formatCurrency(r.costs.white_gravel_cost);
    if (getActiveMix().addition_c.stone_dust > 0) elements.costStoneDustC.textContent = formatCurrency(r.costs.stone_dust_c_cost);
    if (getActiveMix().addition_c.gcc400 > 0) elements.costGcc400C.textContent = formatCurrency(r.costs.gcc400_c_cost);
    if (getActiveMix().addition_c.white_lime > 0) elements.costWhiteLime.textContent = formatCurrency(r.costs.white_lime_cost);
    
    elements.costAddCTotal.textContent = formatCurrency(r.costs.add_c_cost);
    
    // Show/hide admixture costs based on usage
    elements.costMicroFibreRow.style.display = r.admixtures.micro_fibre_kg > 0 ? 'flex' : 'none';
    elements.costMacroFibreRow.style.display = r.admixtures.macro_fibre_kg > 0 ? 'flex' : 'none';
    elements.costWaterReducerRow.style.display = r.admixtures.water_reducer_kg > 0 ? 'flex' : 'none';
    elements.costHardenerRow.style.display = r.admixtures.hardener_kg > 0 ? 'flex' : 'none';
    
    if (r.admixtures.micro_fibre_kg > 0) elements.costMicroFibre.textContent = formatCurrency(r.costs.micro_fibre_cost);
    if (r.admixtures.macro_fibre_kg > 0) elements.costMacroFibre.textContent = formatCurrency(r.costs.macro_fibre_cost);
    if (r.admixtures.water_reducer_kg > 0) elements.costWaterReducer.textContent = formatCurrency(r.costs.water_reducer_cost);
    if (r.admixtures.hardener_kg > 0) elements.costHardener.textContent = formatCurrency(r.costs.hardener_cost);
    
    // Show/hide pigment costs based on usage
    const showPigments = getActiveMix().pigments.total_percent > 0;
    elements.costPigmentsTitle.style.display = showPigments ? 'block' : 'none';
    elements.costPigment1Row.style.display = showPigments ? 'flex' : 'none';
    elements.costPigment2Row.style.display = showPigments && getActiveMix().pigments.pigment2_name !== 'None' && getActiveMix().pigments.pigment2_parts > 0 ? 'flex' : 'none';

    if (showPigments) {
        elements.costPigment1Label.textContent = getActiveMix().pigments.pigment1_name;
        elements.costPigment1.textContent = formatCurrency(r.costs.pigment1_cost);

        if (getActiveMix().pigments.pigment2_name !== 'None' && getActiveMix().pigments.pigment2_parts > 0) {
            elements.costPigment2Label.textContent = getActiveMix().pigments.pigment2_name;
            elements.costPigment2.textContent = formatCurrency(r.costs.pigment2_cost);
        }
    }
    
    // Update material summary
    elements.summaryPortland.textContent = formatVolume(r.material_summary.portland_volume_l);
    elements.summaryWhite.textContent = formatVolume(r.material_summary.white_volume_l);
    elements.summaryCement.textContent = formatWeight(r.material_summary.total_cement_kg);
    elements.summaryFine.textContent = formatVolume(r.material_summary.fine_aggregates_l);
    elements.summaryCoarse.textContent = formatVolume(r.material_summary.coarse_aggregates_l);
    elements.summaryWater.textContent = formatVolume(r.material_summary.water_volume_l);
    elements.summaryTotal.textContent = formatWeight(r.material_summary.total_concrete_kg);
    
    // Update active mix section dynamic values (slider percentages, pigment visibility, custom density)
    sElStyle('pigment-section', 'display', mix.pigments.total_percent > 0 ? 'block' : 'none');
    sElStyle('pigment-2-parts-group', 'display', mix.pigments.pigment2_name !== 'None' ? 'block' : 'none');
    sElStyle('pigment-2-row', 'display', mix.pigments.pigment2_name !== 'None' ? 'flex' : 'none');

    const setDisabled = (sfx, v) => { const el = gEl(`${sfx}-${i}`); if (el) el.disabled = v; };
    setDisabled('add-a-custom-density', mix.addition_a.custom === 0);
    setDisabled('add-b-custom-density', mix.addition_b.custom === 0);
    setDisabled('add-c-custom-density', mix.addition_c.custom === 0);

    const addAValidEl = gEl(`add-a-validation-${i}`);
    const addBValidEl = gEl(`add-b-validation-${i}`);
    const addCValidEl = gEl(`add-c-validation-${i}`);
    if (addAValidEl) updateAdditionValidation(mix.addition_a, addAValidEl);
    if (addBValidEl) updateAdditionValidation(mix.addition_b, addBValidEl);
    if (addCValidEl) updateAdditionValidation(mix.addition_c, addCValidEl);

    // Slider percentage labels
    sEl('add-a-portland-value', `${mix.addition_a.portland}%`);
    sEl('add-a-white-value', `${mix.addition_a.white}%`);
    sEl('add-a-custom-value', `${mix.addition_a.custom}%`);
    sEl('add-b-sand-value', `${mix.addition_b.sand}%`);
    sEl('add-b-stone-dust-value', `${mix.addition_b.stone_dust}%`);
    sEl('add-b-gcc400-value', `${mix.addition_b.gcc400}%`);
    sEl('add-b-custom-value', `${mix.addition_b.custom}%`);
    sEl('add-c-regular-value', `${mix.addition_c.regular_gravel}%`);
    sEl('add-c-chip-value', `${mix.addition_c.chip_gravel}%`);
    sEl('add-c-white-value', `${mix.addition_c.white_gravel}%`);
    sEl('add-c-stone-dust-value', `${mix.addition_c.stone_dust}%`);
    sEl('add-c-gcc400-value', `${mix.addition_c.gcc400}%`);
    sEl('add-c-white-lime-value', `${mix.addition_c.white_lime}%`);
    sEl('add-c-custom-value', `${mix.addition_c.custom}%`);

    // Sync inventory with updated results
    updateInventoryTab();

    // Header dashboard
    setEl('header-project-name', state.project.project_name || 'Concrete Mix Calculator');
    setEl('header-mix-name', getActiveMix().name);
    setEl('header-quantity', state.project.quantity);
    setEl('header-cost-per-paver', formatCurrency(r.costs.total_cost_per_paver));
    const hppEl = document.getElementById('header-profit-per-paver');
    if (hppEl) {
        if (sellingPrice > 0) {
            hppEl.textContent = formatCurrency(profitPerPaver);
            hppEl.style.color = profitPerPaver >= 0 ? '#4ade80' : '#f87171';
            hppEl.dataset.profit = profitPerPaver >= 0 ? '1' : '0';
        } else {
            hppEl.textContent = '--';
            hppEl.style.color = '';
            hppEl.dataset.profit = '1';
        }
    }
    applyColorPreview();
};

// Export functions
const copySummary = async () => {
    const r = state.results;
    if (!r) return;

    const mix = getActiveMix();

    let pigmentSection = '';
    if (mix.pigments.total_percent > 0) {
        pigmentSection = `\nPIGMENTS:\n`;
        if (mix.pigments.pigment1_parts > 0) {
            pigmentSection += `  • ${mix.pigments.pigment1_name}\n    ${formatMilliliters(r.pigments.pigment1_ml)} (${formatLiters(r.pigments.pigment1_l)})\n`;
        }
        if (mix.pigments.pigment2_name !== 'None' && mix.pigments.pigment2_parts > 0) {
            pigmentSection += `  • ${mix.pigments.pigment2_name}\n    ${formatMilliliters(r.pigments.pigment2_ml)} (${formatLiters(r.pigments.pigment2_l)})\n`;
        }
        pigmentSection += `  • Total Pigment: ${formatWeight(r.pigments.total_pigment_kg)}\n`;
    }

    const sellingPrice = state.project.selling_price || 0;
    const profitPerPaver = sellingPrice - r.costs.total_cost_per_paver;
    const profitMarginPct = sellingPrice > 0 ? (profitPerPaver / sellingPrice) * 100 : 0;
    const totalProfit = profitPerPaver * state.project.quantity;
    const profitLines = sellingPrice > 0 ? `
  • Selling Price/Paver: ${formatCurrency(sellingPrice)}
  • Profit/Paver: ${formatCurrency(profitPerPaver)}
  • Margin: ${formatNum(profitMarginPct, 1)}%
  • Total Profit (${state.project.quantity} pavers): ${formatCurrency(totalProfit)}` : '';
    const costSection = state.no_costs ? '' : `

COST BREAKDOWN:
  • Material Cost/Paver: ${formatCurrency(r.costs.material_cost_per_paver)}
  • Labour Cost/Paver: ${formatCurrency(r.costs.labour_cost_per_paver)}
  • Transport Cost/Paver: ${formatCurrency(r.costs.transport_cost_per_paver)}
  • TOTAL COST/PAVER: ${formatCurrency(r.costs.total_cost_per_paver)}
  • GRAND TOTAL (${state.project.quantity} pavers): ${formatCurrency(r.costs.grand_total)}${profitLines}`;

    // Build coarse aggregates section with only non-zero items
    let coarseLines = '';
    if (mix.addition_c.chip_gravel > 0) coarseLines += `\n  • Chip Gravel: ${formatVolume(r.coarse_aggregates.chip_gravel_c_vol_l)} (${mix.addition_c.chip_gravel}%)`;
    if (mix.addition_c.white_gravel > 0) coarseLines += `\n  • White Gravel: ${formatVolume(r.coarse_aggregates.white_gravel_c_vol_l)} (${mix.addition_c.white_gravel}%)`;
    if (mix.addition_c.regular_gravel > 0) coarseLines += `\n  • Regular Gravel: ${formatVolume(r.coarse_aggregates.regular_gravel_c_vol_l)} (${mix.addition_c.regular_gravel}%)`;
    if (mix.addition_c.stone_dust > 0) coarseLines += `\n  • Stone Dust: ${formatVolume(r.coarse_aggregates.stone_dust_c_vol_l)} (${mix.addition_c.stone_dust}%)`;
    if (mix.addition_c.gcc400 > 0) coarseLines += `\n  • GCC 400: ${formatVolume(r.coarse_aggregates.gcc400_c_vol_l)} (${mix.addition_c.gcc400}%)`;
    if (mix.addition_c.white_lime > 0) coarseLines += `\n  • White Lime: ${formatVolume(r.coarse_aggregates.white_lime_c_vol_l)} (${mix.addition_c.white_lime}%)`;

    // Build admixtures section with only active items
    let admixLines = `\n  • Micro Fibre: ${formatGrams(r.admixtures.micro_fibre_g)}`;
    if (r.admixtures.macro_fibre_kg > 0) admixLines += `\n  • Macro Fibre: ${formatWeight(r.admixtures.macro_fibre_kg)}`;
    admixLines += `\n  • Water Reducer: ${formatMilliliters(r.admixtures.water_reducer_ml)}`;
    if (r.admixtures.hardener_kg > 0) admixLines += `\n  • Hardener: ${formatWeight(r.admixtures.hardener_kg)}`;

    const nameHeader = state.project.project_name ? `${state.project.project_name}\n` : '';
    const mixHeader = mix.name !== 'Mix 1' ? `MIX: ${mix.name}\n` : '';
    const summary = `CONCRETE MIX SUMMARY
━━━━━━━━━━━━━━━━━━━━━━
${nameHeader}${mixHeader}BATCH: ${state.project.quantity} pavers (${state.project.length}ft × ${state.project.width}ft × ${state.project.thickness}in)
TOTAL VOLUME: ${formatVolume(r.volumes.volume_l)} (${formatNum(r.volumes.volume_m3, 3)} m³)

CEMENT (${mix.mix_parts.cement}:${mix.mix_parts.sand}:${mix.mix_parts.coarse_agg} mix):
  • Portland: ${formatVolume(r.cement.portland_volume_l)} (${formatBags(r.cement.portland_bags)})
  • White: ${formatVolume(r.cement.white_volume_l)} (${formatBags(r.cement.white_bags)})
  • Total: ${formatWeight(r.cement.cement_weight_kg)}

WATER: ${formatVolume(r.water.water_volume_l)} (W/C: ${mix.water.wc_ratio})

FINE AGGREGATES (Addition B): ${formatVolume(r.fine_aggregates.add_b_volume_l)}
  • Sand: ${formatVolume(r.fine_aggregates.sand_volume_l)} (${mix.addition_b.sand}%)
  • Stone Dust: ${formatVolume(r.fine_aggregates.stone_dust_b_volume_l)} (${mix.addition_b.stone_dust}%)
  • GCC 400: ${formatVolume(r.fine_aggregates.gcc400_b_volume_l)} (${mix.addition_b.gcc400}%)

COARSE AGGREGATES (Addition C): ${formatVolume(r.coarse_aggregates.add_c_volume_l)}${coarseLines}

ADMIXTURES:${admixLines}${pigmentSection}${costSection}
━━━━━━━━━━━━━━━━━━━━━━`;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(summary);
            showToast('Summary copied. You can now paste it into WhatsApp or Email.');
            return;
        }
    } catch (err) {
        console.log('Clipboard API not available, using fallback');
    }

    // Fallback method
    try {
        const textArea = document.createElement('textarea');
        textArea.value = summary;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            showToast('Summary copied! You can now paste it into WhatsApp or Email.');
        } else {
            throw new Error('Copy command failed');
        }
    } catch (err) {
        // Last resort: show a visible readonly textarea the user can manually copy from
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;';
        const ta = document.createElement('textarea');
        ta.value = summary;
        ta.readOnly = true;
        ta.style.cssText = 'width:100%;max-width:480px;height:60vh;padding:0.75rem;font-size:0.85rem;font-family:monospace;border-radius:8px;resize:none;';
        const btn = document.createElement('button');
        btn.textContent = 'Close';
        btn.style.cssText = 'margin-top:0.75rem;padding:0.5rem 2rem;border-radius:8px;background:#2563eb;color:#fff;border:none;font-size:1rem;cursor:pointer;';
        btn.addEventListener('click', () => document.body.removeChild(overlay));
        overlay.appendChild(ta);
        overlay.appendChild(btn);
        document.body.appendChild(overlay);
        ta.focus();
        ta.select();
        showToast('Select all and copy the text above.');
    }
};

const downloadCSV = () => {
    const r = state.results;
    if (!r) return;

    const mix = getActiveMix();

    const csvContent = `Concrete Mix Calculator - Calculation Results
Generated: ${new Date().toLocaleString()}${state.project.project_name ? '\nProject: ' + state.project.project_name : ''}${mix.name !== 'Mix 1' ? '\nMix: ' + mix.name : ''}

PROJECT DETAILS
Parameter,Value,Unit
Length,${state.project.length},ft
Width,${state.project.width},ft
Thickness,${state.project.thickness},in
Batch Size,${state.project.quantity},pavers
Waste Factor,${state.project.waste_factor},×
Pavers Per Day,${state.project.pavers_per_day},pavers/day
Workers,${state.project.workers || 1},workers
Wage Rate (per worker),${state.project.wage_rate},JMD/day
Raw Material Transport,${state.project.raw_material_transport},JMD

VOLUME CALCULATIONS
Parameter,Value,Unit
Volume per Paver,${formatNum(r.volumes.volume_per_paver)},in³
Total Volume,${formatNum(r.volumes.volume_l)},L
Total Volume,${formatNum(r.volumes.volume_m3, 4)},m³
Total Volume,${formatNum(r.volumes.volume_yd3, 3)},yd³

MIX PROPORTIONS
Mix Ratio,${mix.mix_parts.cement}:${mix.mix_parts.sand}:${mix.mix_parts.coarse_agg}
Water-Cement Ratio,${mix.water.wc_ratio}
Wet Cast Factor,${mix.water.wet_cast_factor}

CEMENT (ADDITION A)
Material,Percentage,Volume (L),Weight (kg),Bags
Portland Cement,${mix.addition_a.portland}%,${formatNum(r.cement.portland_volume_l)},${formatNum(r.cement.portland_weight_kg)},${formatNum(r.cement.portland_bags, 1)}
White Cement,${mix.addition_a.white}%,${formatNum(r.cement.white_volume_l)},${formatNum(r.cement.white_weight_kg)},${formatNum(r.cement.white_bags, 1)}
Total Cement,,${formatNum(r.cement.cement_volume_l)},${formatNum(r.cement.cement_weight_kg)}

WATER
Parameter,Value,Unit
Water Required,${formatNum(r.water.water_volume_l)},L
Water Required,${formatNum(r.water.water_gallons, 2)},gal
Water Weight,${formatNum(r.water.water_weight_kg)},kg

FINE AGGREGATES (ADDITION B)
Material,Percentage,Volume (L),Weight (kg)
Sand,${mix.addition_b.sand}%,${formatNum(r.fine_aggregates.sand_volume_l)},${formatNum(r.fine_aggregates.sand_weight_kg)}
Stone Dust,${mix.addition_b.stone_dust}%,${formatNum(r.fine_aggregates.stone_dust_b_volume_l)},${formatNum(r.fine_aggregates.stone_dust_b_weight_kg)}
GCC 400,${mix.addition_b.gcc400}%,${formatNum(r.fine_aggregates.gcc400_b_volume_l)},${formatNum(r.fine_aggregates.gcc400_b_weight_kg)}
Total Fine Aggregates,,${formatNum(r.fine_aggregates.add_b_volume_l)},${formatNum(r.fine_aggregates.total_add_b_weight_kg)}

COARSE AGGREGATES (ADDITION C)
Material,Percentage,Volume (L),Weight (kg)
Regular Gravel,${mix.addition_c.regular_gravel}%,${formatNum(r.coarse_aggregates.regular_gravel_c_vol_l)},${formatNum(r.coarse_aggregates.regular_gravel_c_weight_kg)}
Chip Gravel,${mix.addition_c.chip_gravel}%,${formatNum(r.coarse_aggregates.chip_gravel_c_vol_l)},${formatNum(r.coarse_aggregates.chip_gravel_c_weight_kg)}
White Gravel,${mix.addition_c.white_gravel}%,${formatNum(r.coarse_aggregates.white_gravel_c_vol_l)},${formatNum(r.coarse_aggregates.white_gravel_c_weight_kg)}
Stone Dust,${mix.addition_c.stone_dust}%,${formatNum(r.coarse_aggregates.stone_dust_c_vol_l)},${formatNum(r.coarse_aggregates.stone_dust_c_weight_kg)}
GCC 400,${mix.addition_c.gcc400}%,${formatNum(r.coarse_aggregates.gcc400_c_vol_l)},${formatNum(r.coarse_aggregates.gcc400_c_weight_kg)}
White Lime,${mix.addition_c.white_lime}%,${formatNum(r.coarse_aggregates.white_lime_c_vol_l)},${formatNum(r.coarse_aggregates.white_lime_c_weight_kg)}
Total Coarse Aggregates,,${formatNum(r.coarse_aggregates.add_c_volume_l)},${formatNum(r.coarse_aggregates.total_add_c_weight_kg)}

ADMIXTURES
Material,Dosage Rate,Quantity,Unit
Micro Fibre,${mix.admixtures.micro_fibre} g/L,${formatNum(r.admixtures.micro_fibre_g)},g
Macro Fibre,${mix.admixtures.macro_fibre}% of cement,${formatNum(r.admixtures.macro_fibre_kg, 3)},kg
Water Reducer,${mix.admixtures.water_reducer} mL/kg cement,${formatNum(r.admixtures.water_reducer_ml)},mL
Hardener,${mix.admixtures.hardener}% of cement,${formatNum(r.admixtures.hardener_kg, 3)},kg

PIGMENTS
Material,Parts Ratio,Volume (mL),Volume (L),Weight (kg),% of Cement
${mix.pigments.pigment1_name},${mix.pigments.pigment1_parts},${formatNum(r.pigments.pigment1_ml, 1)},${formatNum(r.pigments.pigment1_l, 3)},${formatNum(r.pigments.pigment1_kg, 3)},${(mix.pigments.total_percent * (mix.pigments.pigment1_parts / (mix.pigments.pigment1_parts + mix.pigments.pigment2_parts))).toFixed(2)}
${mix.pigments.pigment2_name !== 'None' && mix.pigments.pigment2_parts > 0 ? `${mix.pigments.pigment2_name},${mix.pigments.pigment2_parts},${formatNum(r.pigments.pigment2_ml, 1)},${formatNum(r.pigments.pigment2_l, 3)},${formatNum(r.pigments.pigment2_kg, 3)},${(mix.pigments.total_percent * (mix.pigments.pigment2_parts / (mix.pigments.pigment1_parts + mix.pigments.pigment2_parts))).toFixed(2)}` : ''}
Total Pigment,,${formatNum(r.pigments.pigment1_ml + r.pigments.pigment2_ml, 1)},${formatNum(r.pigments.pigment1_l + r.pigments.pigment2_l, 3)},${formatNum(r.pigments.total_pigment_kg, 3)},${mix.pigments.total_percent}

COST ANALYSIS
Category,Item,Quantity,Unit Price (JMD),Total Cost (JMD)
Cement,Portland Cement,${formatNum(r.cement.portland_bags, 1)} bags,${state.prices.portland_bag},${formatNum(r.costs.portland_cost, 2)}
Cement,White Cement,${formatNum(r.cement.white_bags, 1)} bags,${state.prices.white_bag},${formatNum(r.costs.white_cost, 2)}
Fine Aggregates,Sand,${formatNum(r.fine_aggregates.sand_volume_l / 1000 * 1.30795, 3)} yd³,${state.prices.sand},${formatNum(r.costs.sand_cost, 2)}
Fine Aggregates,Stone Dust,${formatNum(r.fine_aggregates.stone_dust_b_volume_l / 1000 * 1.30795, 3)} yd³,${state.prices.stone_dust},${formatNum(r.costs.stone_dust_b_cost, 2)}
Fine Aggregates,GCC 400,${formatNum(r.fine_aggregates.gcc400_b_volume_yd3, 3)} yd³,${state.prices.gcc400},${formatNum(r.costs.gcc400_b_cost, 2)}
Coarse Aggregates,Regular Gravel,${formatNum(r.coarse_aggregates.regular_gravel_c_vol_m3 * 1.30795, 3)} yd³,${state.prices.regular_gravel},${formatNum(r.costs.regular_gravel_cost, 2)}
Coarse Aggregates,Chip Gravel,${formatNum(r.coarse_aggregates.chip_gravel_c_vol_m3 * 1.30795, 3)} yd³,${state.prices.chip_gravel},${formatNum(r.costs.chip_gravel_cost, 2)}
Coarse Aggregates,White Gravel,${formatNum(r.coarse_aggregates.white_gravel_c_vol_m3 * 1.30795, 3)} yd³,${state.prices.white_gravel},${formatNum(r.costs.white_gravel_cost, 2)}
Coarse Aggregates,Stone Dust (C),${formatNum(r.coarse_aggregates.stone_dust_c_vol_m3 * 1.30795, 3)} yd³,${state.prices.stone_dust},${formatNum(r.costs.stone_dust_c_cost, 2)}
Coarse Aggregates,GCC 400 (C),${formatNum(r.coarse_aggregates.gcc400_c_vol_m3 * 1.30795, 3)} yd³,${state.prices.gcc400},${formatNum(r.costs.gcc400_c_cost, 2)}
Coarse Aggregates,White Lime,${formatNum(r.coarse_aggregates.white_lime_c_vol_m3 * 1.30795, 3)} yd³,${state.prices.white_lime},${formatNum(r.costs.white_lime_cost, 2)}
Admixtures,Micro Fibre,${formatNum(r.admixtures.micro_fibre_kg, 3)} kg,${state.prices.micro_fibre},${formatNum(r.costs.micro_fibre_cost, 2)}
Admixtures,Macro Fibre,${formatNum(r.admixtures.macro_fibre_kg, 3)} kg,${state.prices.macro_fibre},${formatNum(r.costs.macro_fibre_cost, 2)}
Admixtures,Water Reducer,${formatNum(r.admixtures.water_reducer_kg, 3)} kg,${state.prices.water_reducer},${formatNum(r.costs.water_reducer_cost, 2)}
Admixtures,Hardener,${formatNum(r.admixtures.hardener_kg, 3)} kg,${state.prices.hardener},${formatNum(r.costs.hardener_cost, 2)}
Pigments,${mix.pigments.pigment1_name},${formatNum(r.pigments.pigment1_l, 3)} L,${getPigmentPrice(mix.pigments.pigment1_name)},${formatNum(r.costs.pigment1_cost, 2)}
Pigments,${mix.pigments.pigment2_name},${formatNum(r.pigments.pigment2_l, 3)} L,${getPigmentPrice(mix.pigments.pigment2_name)},${formatNum(r.costs.pigment2_cost, 2)}

COST SUMMARY
Category,Cost (JMD)
Material Cost (Total),${formatNum(r.costs.total_material_cost, 2)}
Material Cost per Paver,${formatNum(r.costs.material_cost_per_paver, 2)}
Labour Cost per Paver,${formatNum(r.costs.labour_cost_per_paver, 2)}
Transport Cost per Paver,${formatNum(r.costs.transport_cost_per_paver, 2)}
TOTAL COST PER PAVER,${formatNum(r.costs.total_cost_per_paver, 2)}
GRAND TOTAL (${state.project.quantity} pavers),${formatNum(r.costs.grand_total, 2)}
${(state.project.selling_price || 0) > 0 ? `
PROFIT ANALYSIS
Category,Value (JMD)
Selling Price per Paver,${formatNum(state.project.selling_price, 2)}
Profit per Paver,${formatNum(state.project.selling_price - r.costs.total_cost_per_paver, 2)}
Profit Margin,${formatNum((state.project.selling_price - r.costs.total_cost_per_paver) / state.project.selling_price * 100, 1)}%
Total Profit (${state.project.quantity} pavers),${formatNum((state.project.selling_price - r.costs.total_cost_per_paver) * state.project.quantity, 2)}
` : ''}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `concrete_mix_calculation_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const getPigmentPrice = (name) => {
    const pigmentData = {
        'Red Iron Oxide': 1371.72,
        'Yellow Iron Oxide': 600.54,
        'Black Iron Oxide': 1919.34,
        'Blue Pigment': 7143,
        'Green Pigment': 1518.57,
        'Brown Pigment': 3000,
        'White Titanium Dioxide': 2591.32,
        'None': 0,
    };
    return pigmentData[name] || 0;
};

// ─── Inventory ──────────────────────────────────────────────────────────────

const INVENTORY_KEY = 'sprat-inventory';

const saveInventory = () => {
    try {
        localStorage.setItem(INVENTORY_KEY, JSON.stringify({
            linked_to_calculator: state.inventory.linked_to_calculator,
            always_show_purchase: state.inventory.always_show_purchase,
            stock: state.inventory.stock,
            purchase_qtys: state.inventory.purchase_qtys,
            target_additional_pavers: state.inventory.target_additional_pavers,
            pavers_produced_today: state.inventory.pavers_produced_today,
            production_date: new Date().toISOString().split('T')[0],
        }));
    } catch (_) {}
};

const loadInventory = () => {
    try {
        const saved = localStorage.getItem(INVENTORY_KEY);
        if (!saved) return;
        const data = JSON.parse(saved);
        if (typeof data.linked_to_calculator === 'boolean') {
            state.inventory.linked_to_calculator = data.linked_to_calculator;
        }
        if (typeof data.always_show_purchase === 'boolean') {
            state.inventory.always_show_purchase = data.always_show_purchase;
        }
        if (data.stock && typeof data.stock === 'object') {
            Object.keys(state.inventory.stock).forEach(k => {
                if (typeof data.stock[k] === 'number') {
                    state.inventory.stock[k] = data.stock[k];
                }
            });
        }
        if (data.purchase_qtys && typeof data.purchase_qtys === 'object') {
            state.inventory.purchase_qtys = data.purchase_qtys;
        }
        if (typeof data.target_additional_pavers === 'number') {
            state.inventory.target_additional_pavers = data.target_additional_pavers;
        }
        // Restore today's production count — reset if saved on a different date
        const today = new Date().toISOString().split('T')[0];
        if (data.production_date === today && typeof data.pavers_produced_today === 'number') {
            state.inventory.pavers_produced_today = data.pavers_produced_today;
        }
    } catch (_) {}
};

// Map stock keys to unit prices from state.prices / pigment lookup
const getStockPrice = (stockKey) => {
    const p = state.prices;
    const mix = getActiveMix();
    switch (stockKey) {
        case 'portland_bags':     return p.portland_bag;
        case 'white_bags':        return p.white_bag;
        case 'sand_yd3':          return p.sand;
        case 'stone_dust_b_yd3':  return p.stone_dust;
        case 'gcc400_b_yd3':      return p.gcc400;
        case 'regular_gravel_yd3':return p.regular_gravel;
        case 'chip_gravel_yd3':   return p.chip_gravel;
        case 'white_gravel_yd3':  return p.white_gravel;
        case 'stone_dust_c_yd3':  return p.stone_dust;
        case 'gcc400_c_yd3':      return p.gcc400;
        case 'white_lime_yd3':    return p.white_lime;
        case 'water_l':           return 0;
        case 'micro_fibre_kg':    return p.micro_fibre;
        case 'macro_fibre_kg':    return p.macro_fibre;
        case 'water_reducer_kg':  return p.water_reducer;
        case 'hardener_kg':       return p.hardener || 0;
        case 'pigment1_l':        return getPigmentPrice(mix.pigments.pigment1_name);
        case 'pigment2_l':        return getPigmentPrice(mix.pigments.pigment2_name);
        default:                  return 0;
    }
};

// Map stock keys to reorder point keys in state.prices
const getReorderPoint = (stockKey) => {
    const p = state.prices;
    const keyMap = {
        'portland_bags': p.reorder_portland,
        'white_bags': p.reorder_white,
        'sand_yd3': p.reorder_sand,
        'stone_dust_b_yd3': p.reorder_stone_dust,
        'gcc400_b_yd3': p.reorder_gcc400,
        'regular_gravel_yd3': p.reorder_regular_gravel,
        'chip_gravel_yd3': p.reorder_chip_gravel,
        'white_gravel_yd3': p.reorder_white_gravel,
        'white_lime_yd3': p.reorder_white_lime,
        'stone_dust_c_yd3': p.reorder_stone_dust,
        'gcc400_c_yd3': p.reorder_gcc400,
        'micro_fibre_kg': p.reorder_micro_fibre,
        'macro_fibre_kg': p.reorder_macro_fibre,
        'water_reducer_kg': p.reorder_water_reducer,
        'hardener_kg': p.reorder_hardener,
    };
    return keyMap[stockKey] || 0;
};

// Round purchase order quantities to purchasable units
const roundToPurchaseUnit = (qty, stockKey) => {
    if (stockKey.endsWith('_bags')) return Math.ceil(qty);
    if (stockKey.endsWith('_yd3')) return Math.ceil(qty * 4) / 4;  // nearest 0.25 yd³
    if (stockKey.endsWith('_kg'))  return Math.ceil(qty * 10) / 10;
    if (stockKey.endsWith('_l'))   return Math.ceil(qty * 10) / 10;
    return qty;
};

// Non-actionable materials excluded from bottleneck and purchase order
const isActionable = (stockKey) => stockKey !== 'water_l';

// L to yd³ conversion factor
const L_TO_YD3 = 1.30795 / 1000;
// m³ to yd³
const M3_TO_YD3 = 1.30795;

const calculateInventory = () => {
    if (!state.results) return [];
    const r = state.results;
    const effectiveQty = state.project.quantity * state.project.waste_factor;
    if (effectiveQty <= 0) return [];

    const linked = state.inventory.linked_to_calculator;
    const produced = state.inventory.pavers_produced_today;
    const ppd = state.project.pavers_per_day;
    const s = state.inventory.stock;

    const makeMaterial = (key, name, stockKey, perPaverValue) => {
        const stock = s[stockKey] || 0;
        if (!linked) {
            return { key, name, stockKey, stock, linked: false };
        }
        const perPaver = perPaverValue / effectiveQty;
        const usedToday = perPaver * produced;
        const remaining = stock - usedToday;
        const dailyUsage = perPaver * ppd;
        const daysRemaining = dailyUsage > 0 ? remaining / dailyUsage : null;
        return { key, name, stockKey, stock, linked: true, perPaver, usedToday, remaining, dailyUsage, daysRemaining };
    };

    const materials = [];

    // Cement
    if (r.cement.portland_bags > 0) {
        materials.push(makeMaterial('portland', 'Portland Cement', 'portland_bags', r.cement.portland_bags));
    }
    if (r.cement.white_bags > 0) {
        materials.push(makeMaterial('white', 'White Cement', 'white_bags', r.cement.white_bags));
    }

    // Fine aggregates
    if (r.fine_aggregates.sand_volume_l > 0) {
        materials.push(makeMaterial('sand', 'Sand', 'sand_yd3', r.fine_aggregates.sand_volume_l * L_TO_YD3));
    }
    if (r.fine_aggregates.stone_dust_b_volume_l > 0) {
        materials.push(makeMaterial('stone_dust_b', 'Stone Dust (Fine)', 'stone_dust_b_yd3', r.fine_aggregates.stone_dust_b_volume_l * L_TO_YD3));
    }
    if (r.fine_aggregates.gcc400_b_volume_l > 0) {
        materials.push(makeMaterial('gcc400_b', 'GCC 400 (Fine)', 'gcc400_b_yd3', r.fine_aggregates.gcc400_b_volume_l * L_TO_YD3));
    }

    // Coarse aggregates — results are in m³ (add_c_volume_m3) or L
    const coarsePairs = [
        ['regular_gravel', 'Regular Gravel', 'regular_gravel_yd3', getActiveMix().addition_c.regular_gravel],
        ['chip_gravel', 'Chip Gravel', 'chip_gravel_yd3', getActiveMix().addition_c.chip_gravel],
        ['white_gravel', 'White Gravel', 'white_gravel_yd3', getActiveMix().addition_c.white_gravel],
        ['stone_dust_c', 'Stone Dust (Coarse)', 'stone_dust_c_yd3', getActiveMix().addition_c.stone_dust],
        ['gcc400_c', 'GCC 400 (Coarse)', 'gcc400_c_yd3', getActiveMix().addition_c.gcc400],
        ['white_lime', 'White Lime', 'white_lime_yd3', getActiveMix().addition_c.white_lime],
    ];
    const coarseTotalPct = getActiveMix().addition_c.regular_gravel + getActiveMix().addition_c.chip_gravel + getActiveMix().addition_c.white_gravel + getActiveMix().addition_c.stone_dust + getActiveMix().addition_c.gcc400 + getActiveMix().addition_c.white_lime + getActiveMix().addition_c.custom;
    const coarseTotalYd3 = r.coarse_aggregates ? (r.coarse_aggregates.add_c_volume_l * L_TO_YD3) : 0;
    coarsePairs.forEach(([key, name, stockKey, pct]) => {
        if (pct > 0) {
            const yd3 = coarseTotalPct > 0 ? coarseTotalYd3 * (pct / coarseTotalPct) : 0;
            materials.push(makeMaterial(key, name, stockKey, yd3));
        }
    });

    // Water
    if (r.water.water_volume_l > 0) {
        materials.push(makeMaterial('water', 'Water', 'water_l', r.water.water_volume_l));
    }

    // Admixtures
    if (r.admixtures.micro_fibre_kg > 0) {
        materials.push(makeMaterial('micro_fibre', 'Micro Fibre', 'micro_fibre_kg', r.admixtures.micro_fibre_kg));
    }
    if (r.admixtures.macro_fibre_kg > 0) {
        materials.push(makeMaterial('macro_fibre', 'Macro Fibre', 'macro_fibre_kg', r.admixtures.macro_fibre_kg));
    }
    if (r.admixtures.water_reducer_kg > 0) {
        materials.push(makeMaterial('water_reducer', 'Water Reducer', 'water_reducer_kg', r.admixtures.water_reducer_kg));
    }
    if (r.admixtures.hardener_kg > 0) {
        materials.push(makeMaterial('hardener', 'Hardener', 'hardener_kg', r.admixtures.hardener_kg));
    }

    // Pigments
    if (r.pigments.pigment1_l > 0) {
        materials.push(makeMaterial('pigment1', getActiveMix().pigments.pigment1_name, 'pigment1_l', r.pigments.pigment1_l));
    }
    if (r.pigments.pigment2_l > 0) {
        materials.push(makeMaterial('pigment2', getActiveMix().pigments.pigment2_name, 'pigment2_l', r.pigments.pigment2_l));
    }

    return materials;
};

const getUnitLabel = (stockKey) => {
    if (stockKey.endsWith('_bags')) return 'bags';
    if (stockKey.endsWith('_yd3')) return 'yd\u00B3';
    if (stockKey.endsWith('_kg')) return 'kg';
    if (stockKey === 'water_l' || stockKey.endsWith('_l')) return 'L';
    return '';
};

const formatInventoryValue = (val, stockKey) => {
    const unit = getUnitLabel(stockKey);
    if (unit === 'bags') return `${val.toFixed(1)} bags`;
    if (unit === 'yd\u00B3') return `${val.toFixed(3)} yd\u00B3`;
    if (unit === 'kg') return `${val.toFixed(3)} kg`;
    if (unit === 'L') return `${val.toFixed(2)} L`;
    return val.toFixed(3);
};

const minPurchaseUnit = (stockKey) => {
    if (stockKey.includes('_bags')) return 1;
    if (stockKey.includes('_yd3')) return 0.25;
    return 0.1;
};

const qtyDecimals = (stockKey) => {
    if (stockKey.includes('_bags')) return 0;
    if (stockKey.includes('_yd3')) return 2;
    return 1;
};

const roundPurchaseUnit = (qty, stockKey) => {
    if (stockKey.includes('_bags')) return Math.ceil(qty);
    if (stockKey.includes('_yd3')) return Math.ceil(qty * 4) / 4;
    return Math.ceil(qty * 10) / 10;
};

const stockKeyToPqty = {
    portland_bags: 'portland_pqty', white_bags: 'white_pqty',
    sand_yd3: 'sand_pqty', stone_dust_b_yd3: 'stone_dust_pqty', gcc400_b_yd3: 'gcc400_pqty',
    stone_dust_c_yd3: 'stone_dust_pqty', gcc400_c_yd3: 'gcc400_pqty',
    regular_gravel_yd3: 'regular_gravel_pqty', chip_gravel_yd3: 'chip_gravel_pqty',
    white_gravel_yd3: 'white_gravel_pqty', white_lime_yd3: 'white_lime_pqty',
    micro_fibre_kg: 'micro_fibre_pqty', macro_fibre_kg: 'macro_fibre_pqty',
    water_reducer_kg: 'water_reducer_pqty', hardener_kg: 'hardener_pqty',
    pigment1_l: 'water_pqty', pigment2_l: 'water_pqty', water_l: 'water_pqty',
};

const getPurchaseUnitSize = (stockKey) => {
    const pkey = stockKeyToPqty[stockKey];
    if (pkey && state.prices[pkey]) return state.prices[pkey];
    return minPurchaseUnit(stockKey);
};

const calcShortfall = (m) => {
    const deficit = m.remaining < 0 ? -m.remaining : 0;
    const rounded = roundPurchaseUnit(deficit, m.stockKey);
    return Math.max(rounded, getPurchaseUnitSize(m.stockKey));
};

const updatePurchaseRow = (m) => {
    const pillEl = document.getElementById(`inv-purchase-pill-${m.key}`);
    if (!pillEl) return;
    // Water unlimited — always hide
    if (m.stockKey === 'water_l' && state.prices.water_unlimited !== false) {
        pillEl.style.display = 'none';
        return;
    }
    const isDepleted = m.daysRemaining !== undefined && (m.stock <= 0 || m.remaining <= 0);
    const isLow = m.daysRemaining !== undefined && m.daysRemaining !== null && m.daysRemaining > 0 && m.daysRemaining <= 2;
    const alwaysShow = state.inventory.always_show_purchase;
    const show = alwaysShow || isDepleted || isLow;
    pillEl.style.display = show ? '' : 'none';
    pillEl.classList.remove('purchase-glow-low', 'purchase-glow-empty');
    if (alwaysShow && isDepleted) pillEl.classList.add('purchase-glow-empty');
    else if (alwaysShow && isLow) pillEl.classList.add('purchase-glow-low');
    if (show && state.inventory.purchase_qtys[m.key] === undefined) {
        state.inventory.purchase_qtys[m.key] = calcShortfall(m);
        const qtyEl = document.getElementById(`inv-purchase-qty-${m.key}`);
        if (qtyEl) qtyEl.textContent = state.inventory.purchase_qtys[m.key].toFixed(qtyDecimals(m.stockKey));
    }
    // Days gained from purchasing
    const daysEl = document.getElementById(`inv-purchase-days-${m.key}`);
    if (daysEl) {
        const pqty = state.inventory.purchase_qtys[m.key] || 0;
        if (show && pqty > 0 && m.dailyUsage > 0) {
            const daysGained = pqty / m.dailyUsage;
            daysEl.textContent = `+${daysGained.toFixed(1)}d`;
        } else {
            daysEl.textContent = '';
        }
    }
};

let _inventoryMaterialKeys = '';

const buildInventorySummary = (materials) => {
    const linked = state.inventory.linked_to_calculator;
    if (!linked) return null;

    const fmtC = v => 'JMD ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const actionable = materials.filter(m => m.linked && isActionable(m.stockKey));

    // All limiting materials sorted by days remaining (depleted first, then ascending)
    const limitingMaterials = actionable
        .filter(m => m.daysRemaining !== undefined)
        .map(m => ({
            name: m.name,
            daysRemaining: (m.stock <= 0 || m.remaining <= 0) ? 0 : (m.daysRemaining || 0),
            isDepleted: m.stock <= 0 || m.remaining <= 0,
        }))
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const minDays = limitingMaterials.length > 0 ? limitingMaterials[0].daysRemaining : null;

    // Daily material cost at current production rate
    const ppd = state.project.pavers_per_day;
    const dailyCost = materials
        .filter(m => m.linked && m.perPaver > 0)
        .reduce((sum, m) => sum + m.perPaver * ppd * getStockPrice(m.stockKey), 0);

    // Total restock cost (cost to repurchase current stock level)
    const restockCost = materials
        .filter(m => m.stock > 0)
        .reduce((sum, m) => sum + m.stock * getStockPrice(m.stockKey), 0);

    return { limitingMaterials, minDays, dailyCost, restockCost, fmtC };
};

const renderSummaryCard = (materials) => {
    const summary = buildInventorySummary(materials);
    const el = document.getElementById('inv-summary-card');
    if (!el) return;

    if (!summary) { el.style.display = 'none'; return; }
    el.style.display = 'block';

    const { limitingMaterials, minDays, dailyCost, restockCost, fmtC } = summary;

    let runwayHtml;
    if (limitingMaterials.length === 0) {
        runwayHtml = `<div class="result-row"><span class="result-label">Production Runway</span><span class="result-value" style="color:var(--text-secondary);">—</span></div>`;
    } else {
        const runwayVal = minDays !== null ? `${minDays.toFixed(1)} days` : '—';
        const limitedByHtml = limitingMaterials.map(m => {
            const daysText = m.isDepleted ? 'DEPLETED' : `${m.daysRemaining.toFixed(1)}d`;
            const style = m.isDepleted || m.daysRemaining <= 2
                ? 'color:var(--error-color);font-weight:600;'
                : 'color:var(--text-secondary);';
            return `<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="font-size:0.82rem;">${m.name}</span><span style="font-size:0.82rem;${style}">${daysText}</span></div>`;
        }).join('');

        runwayHtml = `<div class="result-row"><span class="result-label">Production Runway</span><span class="result-value" style="font-weight:700;">${runwayVal}</span></div>
            <div style="margin:6px 0 8px;"><div class="result-label" style="margin-bottom:4px;">Limited By</div>${limitedByHtml}</div>`;
    }

    el.innerHTML = `
        <h2 class="card-title">Stock Summary</h2>
        ${runwayHtml}
        <div class="result-row"><span class="result-label">Daily Material Cost</span><span class="result-value">${fmtC(dailyCost)}</span></div>
        <div class="result-row"><span class="result-label">Restock Cost</span><span class="result-value">${fmtC(restockCost)}</span></div>
    `;
};

const renderInventoryUI = (materials) => {
    const container = document.getElementById('inventory-materials');
    if (!container) return;

    const newKeys = materials.map(m => m.key).join(',');
    const linked = state.inventory.linked_to_calculator;

    if (newKeys === _inventoryMaterialKeys && container.children.length > 0) {
        updateInventoryValues(materials);
        return;
    }
    _inventoryMaterialKeys = newKeys;

    if (materials.length === 0) {
        container.innerHTML = '<div class="card"><p style="color:var(--text-secondary);font-size:0.875rem;">Set a mix design in the Mix Design tab to see materials here.</p></div>';
        return;
    }

    const allZeroStock = linked && materials.every(m => (state.inventory.stock[m.stockKey] || 0) === 0);
    const guidanceBanner = allZeroStock
        ? '<div class="card" style="border-left:3px solid var(--accent-color);padding:10px 14px;"><p style="color:var(--text-secondary);font-size:0.875rem;margin:0;">Enter stock values below to track usage and days remaining.</p></div>'
        : '';

    const groups = [
        { label: 'Cement', keys: ['portland', 'white'] },
        { label: 'Fine Aggregates', keys: ['sand', 'stone_dust_b', 'gcc400_b'] },
        { label: 'Coarse Aggregates', keys: ['regular_gravel', 'chip_gravel', 'white_gravel', 'stone_dust_c', 'gcc400_c', 'white_lime'] },
        { label: 'Water', keys: ['water'] },
        { label: 'Admixtures', keys: ['micro_fibre', 'macro_fibre', 'water_reducer', 'hardener'] },
        { label: 'Pigments', keys: ['pigment1', 'pigment2'] },
    ];

    let html = '';
    groups.forEach(group => {
        const groupMaterials = materials.filter(m => group.keys.includes(m.key));
        if (groupMaterials.length === 0) return;

        // Stock value subtotal for this group
        const groupValue = groupMaterials.reduce((sum, m) => sum + m.stock * getStockPrice(m.stockKey), 0);
        const fmtC = v => 'JMD ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        html += `<div class="card">`;
        html += `<div class="inventory-group-label">${group.label}</div>`;

        groupMaterials.forEach(m => {
            const unit = getUnitLabel(m.stockKey);
            html += `<div class="inventory-item" data-inv-key="${m.key}">`;
            html += `<div class="inventory-item-header">`;
            html += `<span class="inventory-item-name">${esc(m.name)}</span>`;
            if (linked) {
                html += `<div class="inv-purchase-pill" id="inv-purchase-pill-${m.key}" style="display:none;">`;
                html += `<span class="inv-purchase-label">Purchase</span>`;
                html += `<button class="inv-purchase-btn inv-purchase-dec" data-key="${m.key}">−</button>`;
                html += `<span class="inv-purchase-qty" id="inv-purchase-qty-${m.key}">0</span>`;
                html += `<span class="inv-purchase-unit">${esc(unit)}</span>`;
                html += `<button class="inv-purchase-btn inv-purchase-inc" data-key="${m.key}">+</button>`;
                html += `<span class="inv-purchase-days" id="inv-purchase-days-${m.key}"></span>`;
                html += `</div>`;
            }
            html += `<span class="inventory-status" id="inv-status-${m.key}">--</span>`;
            html += `</div>`;
            html += `<div class="input-group" style="margin-bottom:8px;">`;
            html += `<label class="input-label">Stock on Hand</label>`;
            html += `<div class="input-row">`;
            html += `<input type="number" id="inv-stock-${m.key}" class="input-number" value="${m.stock}" min="0" step="0.1" data-stock-key="${m.stockKey}">`;
            html += `<span class="input-unit">${esc(unit)}</span>`;
            html += `</div></div>`;

            if (linked) {
                html += `<div class="result-row"><span class="result-label">Per Paver</span><span class="result-value" id="inv-pp-${m.key}">--</span></div>`;
                html += `<div class="result-row"><span class="result-label">Used Today</span><span class="result-value" id="inv-used-${m.key}">--</span></div>`;
                html += `<div class="result-row" id="inv-rem-row-${m.key}"><span class="result-label">Remaining</span><span class="result-value" id="inv-rem-${m.key}">--</span></div>`;
                html += `<div class="result-row"><span class="result-label">Days Remaining</span><span class="result-value" id="inv-days-${m.key}">--</span></div>`;
            }

            html += `</div>`;
        });

        if (groupValue > 0) {
            html += `<div class="inventory-group-subtotal"><span>Stock Value</span><span>${fmtC(groupValue)}</span></div>`;
        }
        html += `</div>`;
    });

    container.innerHTML = guidanceBanner + html;

    // Wire up stock inputs
    container.querySelectorAll('input[data-stock-key]').forEach(input => {
        input.addEventListener('input', (e) => {
            const stockKey = e.target.dataset.stockKey;
            state.inventory.stock[stockKey] = parseFloat(e.target.value) || 0;
            saveInventory();
            updateInventoryValues(calculateInventory());
        });
    });

    // Wire purchase +/- buttons
    container.querySelectorAll('.inv-purchase-dec, .inv-purchase-inc').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            const m = materials.find(x => x.key === key);
            if (!m) return;
            const step = getPurchaseUnitSize(m.stockKey);
            if (state.inventory.purchase_qtys[key] === undefined) state.inventory.purchase_qtys[key] = calcShortfall(m);
            state.inventory.purchase_qtys[key] = btn.classList.contains('inv-purchase-inc')
                ? state.inventory.purchase_qtys[key] + step
                : Math.max(0, state.inventory.purchase_qtys[key] - step);
            const qtyEl = document.getElementById(`inv-purchase-qty-${key}`);
            if (qtyEl) qtyEl.textContent = state.inventory.purchase_qtys[key].toFixed(qtyDecimals(m.stockKey));
            saveInventory();
        });
    });

    updateInventoryValues(materials);
};

const updateInventoryValues = (materials) => {
    const linked = state.inventory.linked_to_calculator;
    materials.forEach(m => {
        const statusEl = document.getElementById(`inv-status-${m.key}`);
        if (!statusEl) return;

        if (!linked || m.daysRemaining === undefined) {
            statusEl.textContent = '--';
            statusEl.className = 'inventory-status';
            return;
        }

        const ppEl = document.getElementById(`inv-pp-${m.key}`);
        const usedEl = document.getElementById(`inv-used-${m.key}`);
        const remEl = document.getElementById(`inv-rem-${m.key}`);
        const remRowEl = document.getElementById(`inv-rem-row-${m.key}`);
        const daysEl = document.getElementById(`inv-days-${m.key}`);

        if (ppEl) ppEl.textContent = formatInventoryValue(m.perPaver, m.stockKey);
        if (usedEl) usedEl.textContent = formatInventoryValue(m.usedToday, m.stockKey);
        if (remEl) remEl.textContent = formatInventoryValue(m.remaining, m.stockKey);
        if (remRowEl) remRowEl.className = m.remaining < 0 ? 'result-row inventory-negative' : 'result-row';

        const reorderPoint = getReorderPoint(m.stockKey);
        const isBelowReorder = reorderPoint > 0 && m.stock < reorderPoint;
        
        if (m.stock <= 0) {
            statusEl.textContent = 'NO STOCK';
            statusEl.className = 'inventory-status inventory-status-empty';
        } else if (m.remaining <= 0) {
            statusEl.textContent = 'DEPLETED';
            statusEl.className = 'inventory-status inventory-status-empty';
            if (daysEl) daysEl.textContent = '0d';
        } else if (isBelowReorder) {
            statusEl.textContent = 'REORDER';
            statusEl.className = 'inventory-status inventory-status-reorder';
        } else if (m.daysRemaining === null) {
            statusEl.textContent = 'N/A';
            statusEl.className = 'inventory-status';
        } else if (m.daysRemaining > 2) {
            statusEl.textContent = `${m.daysRemaining.toFixed(1)}d`;
            statusEl.className = 'inventory-status inventory-status-ok';
            if (daysEl) daysEl.textContent = `${m.daysRemaining.toFixed(1)}d`;
        } else {
            statusEl.textContent = `${m.daysRemaining.toFixed(1)}d`;
            statusEl.className = 'inventory-status inventory-status-low';
            if (daysEl) daysEl.textContent = `${m.daysRemaining.toFixed(1)}d`;
        }
    });

    materials.forEach(updatePurchaseRow);

    // Header stock status
    const stockStatusEl = document.getElementById('header-stock-status');
    if (stockStatusEl) {
        const linked = materials.filter(m => m.daysRemaining !== undefined);
        const depleted = linked.filter(m => m.stock <= 0 || m.remaining <= 0);
        const low = linked.filter(m => m.daysRemaining !== null && m.daysRemaining > 0 && m.daysRemaining <= 2);
        const bottleneck = linked.filter(m => m.daysRemaining !== null && m.remaining > 0)
            .sort((a, b) => a.daysRemaining - b.daysRemaining)[0] || null;
        if (depleted.length > 0) {
            stockStatusEl.textContent = 'DEPLETED';
            stockStatusEl.className = 'stock-empty';
            stockStatusEl.style.display = '';
            stockStatusEl._stockTarget = depleted[0].key;
        } else if (low.length > 0) {
            stockStatusEl.textContent = 'LOW STOCK';
            stockStatusEl.className = 'stock-low';
            stockStatusEl.style.display = '';
            stockStatusEl._stockTarget = low[0].key;
        } else if (bottleneck) {
            stockStatusEl.textContent = `${bottleneck.daysRemaining.toFixed(1)}d stock`;
            stockStatusEl.className = 'stock-ok';
            stockStatusEl.style.display = '';
            stockStatusEl._stockTarget = bottleneck.key;
        } else {
            stockStatusEl.style.display = 'none';
        }
    }

    renderSummaryCard(materials);
};

const generatePurchaseOrder = () => {
    const target = state.inventory.target_additional_pavers;
    const materials = calculateInventory();
    const output = document.getElementById('purchase-order-output');
    if (!output) return;

    const orderItems = materials
        .filter(m => m.linked && m.perPaver > 0 && isActionable(m.stockKey))
        .map(m => {
            const needed = m.perPaver * target;
            const available = m.linked ? Math.max(0, m.remaining) : m.stock;
            const qty = roundToPurchaseUnit(Math.max(0, needed - available), m.stockKey);
            const unitPrice = getStockPrice(m.stockKey);
            const cost = qty * unitPrice;
            return { name: m.name, qty, stockKey: m.stockKey, unitPrice, cost };
        })
        .filter(item => item.qty > 0);

    // Add reorder-flagged materials not already covered by target calculation
    const reorderItems = materials
        .filter(m => m.linked && isActionable(m.stockKey))
        .filter(m => {
            const reorderPoint = getReorderPoint(m.stockKey);
            return reorderPoint > 0 && m.stock < reorderPoint;
        })
        .filter(m => !orderItems.some(oi => oi.stockKey === m.stockKey))
        .map(m => {
            const reorderPoint = getReorderPoint(m.stockKey);
            const qty = roundToPurchaseUnit(reorderPoint - m.stock, m.stockKey);
            const unitPrice = getStockPrice(m.stockKey);
            const cost = qty * unitPrice;
            return { name: m.name + ' (REORDER)', qty, stockKey: m.stockKey, unitPrice, cost };
        });

    const allItems = [...orderItems, ...reorderItems];

    if (allItems.length === 0) {
        output.innerHTML = `<div class="purchase-order-empty">Current stock covers ${target} pavers. No materials needed.</div>`;
        return;
    }

    if (window.PurchaseOrderEngine) {
        window.PurchaseOrderEngine.generate(allItems, state.settings, state.project.project_name, output);
    } else {
        // Minimal fallback if PO engine not loaded
        const fmtC = v => 'JMD ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const grandTotal = allItems.reduce((s, i) => s + i.cost, 0);
        let html = `<div class="purchase-order-card"><div class="purchase-order-title">Order for ${target} additional pavers</div>`;
        allItems.forEach(item => {
            const k = item.stockKey;
            const qStr = k.endsWith('_bags') ? `${item.qty} bags` : k.endsWith('_yd3') ? `${item.qty.toFixed(2)} yd\u00B3` : k.endsWith('_kg') ? `${item.qty.toFixed(1)} kg` : `${item.qty.toFixed(1)}`;
            html += `<div class="purchase-order-item"><span>${item.name}<br><span style="font-size:0.75rem;color:var(--text-secondary);">${qStr}</span></span><span class="purchase-order-qty">${fmtC(item.cost)}</span></div>`;
        });
        html += `<div class="purchase-order-total"><span>Total</span><span>${fmtC(grandTotal)}</span></div></div>`;
        output.innerHTML = html;
    }
};

const updateInventoryTab = () => {
    const materials = calculateInventory();
    renderInventoryUI(materials);

    const rateEl = document.getElementById('inventory-daily-rate');
    if (rateEl) rateEl.textContent = `${state.project.pavers_per_day} pavers/day`;

    const orderSection = document.getElementById('purchase-order-section');
    if (orderSection) {
        orderSection.style.display = state.inventory.linked_to_calculator ? 'block' : 'none';
    }

    // Sync persisted pavers-produced-today to input
    const producedEl = document.getElementById('inventory-pavers-today');
    if (producedEl && state.inventory.pavers_produced_today > 0) {
        producedEl.value = state.inventory.pavers_produced_today;
    }
};

// State persistence
const STATE_KEY = 'sprat-calculator-state';
const RECIPES_KEY = 'sprat-recipes';
const RECIPES_MAX = 20;

const loadRecipes = () => {
    try {
        const raw = localStorage.getItem(RECIPES_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
};

const saveRecipes = (recipes) => {
    try { localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes)); } catch (_) {}
};

const renderRecipes = () => {
    const list = document.getElementById('recipe-list');
    if (!list) return;
    const recipes = loadRecipes();
    if (recipes.length === 0) {
        list.innerHTML = '<div class="recipe-empty">No presets saved yet.</div>';
        return;
    }
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
            if (s.project) Object.assign(state.project, s.project);
            // Handle both new format (mixes array) and old format (flat mix fields)
            if (Array.isArray(s.mixes) && s.mixes.length > 0) {
                state.mixes = JSON.parse(JSON.stringify(s.mixes));
                state.active_mix = typeof s.active_mix === 'number' ? Math.min(s.active_mix, s.mixes.length - 1) : 0;
            } else {
                // old recipe format: wrap flat fields
                state.mixes[0] = {
                    name: 'Mix 1',
                    mix_parts: s.mix_parts ? { ...s.mix_parts } : state.mixes[0].mix_parts,
                    addition_a: s.addition_a ? { ...s.addition_a } : state.mixes[0].addition_a,
                    addition_b: s.addition_b ? { ...s.addition_b } : state.mixes[0].addition_b,
                    addition_c: s.addition_c ? { ...s.addition_c } : state.mixes[0].addition_c,
                    water: s.water ? { ...s.water } : state.mixes[0].water,
                    admixtures: s.admixtures ? { ...s.admixtures } : state.mixes[0].admixtures,
                    pigments: s.pigments ? { ...s.pigments } : state.mixes[0].pigments,
                };
                state.active_mix = 0;
            }
            syncInputsFromState();
            // Restore pigment selects
            const mix = getActiveMix();
            if (elements.pigment1Name) elements.pigment1Name.value = mix.pigments.pigment1_name;
            if (elements.pigment2Name) elements.pigment2Name.value = mix.pigments.pigment2_name;
            calculate();
            saveState();
            showToast('Recipe "' + recipe.name + '" loaded.');
        });
        const delBtn = document.createElement('button');
        delBtn.className = 'recipe-btn recipe-btn-del';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
            const recipes2 = loadRecipes();
            recipes2.splice(idx, 1);
            saveRecipes(recipes2);
            renderRecipes();
        });
        row.appendChild(nameSpan);
        row.appendChild(loadBtn);
        row.appendChild(delBtn);
        list.appendChild(row);
    });
};

const saveCurrentAsRecipe = () => {
    const input = document.getElementById('recipe-name-input');
    const name = input ? input.value.trim() : '';
    if (!name) { showToast('Enter a preset name first.'); return; }
    const recipes = loadRecipes();
    if (recipes.length >= RECIPES_MAX) { showToast('Max ' + RECIPES_MAX + ' presets reached. Delete one first.'); return; }
    recipes.push({
        name,
        created: new Date().toISOString(),
        state: {
            project: { ...state.project },
            mixes: JSON.parse(JSON.stringify(state.mixes)),
            active_mix: state.active_mix,
        },
    });
    saveRecipes(recipes);
    renderRecipes();
    if (input) input.value = '';
    showToast('Recipe "' + name + '" saved.');
};

const saveState = () => {
    try {
        const data = {
            _version: 2,
            project: state.project,
            mixes: state.mixes,
            active_mix: state.active_mix,
            deleted_mixes: state.deleted_mixes,
            prices: state.prices,
            settings: state.settings,
            no_costs: state.no_costs,
            color_preview: state.color_preview,
        };
        localStorage.setItem(STATE_KEY, JSON.stringify(data));
        if (window.SheetSync) window.SheetSync.markDirty('prices');
    } catch (_) {}
};

const loadState = () => {
    try {
        const raw = localStorage.getItem(STATE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved) return;
        if (saved._version === 1) {
            // Migrate from v1: wrap flat fields into mixes array
            state.mixes = [{
                name: 'Mix 1',
                mix_parts: saved.mix_parts ? { ...saved.mix_parts } : state.mixes[0].mix_parts,
                addition_a: saved.addition_a ? { ...saved.addition_a } : state.mixes[0].addition_a,
                addition_b: saved.addition_b ? { ...saved.addition_b } : state.mixes[0].addition_b,
                addition_c: saved.addition_c ? { ...saved.addition_c } : state.mixes[0].addition_c,
                water: saved.water ? { ...saved.water } : state.mixes[0].water,
                admixtures: saved.admixtures ? { ...saved.admixtures } : state.mixes[0].admixtures,
                pigments: saved.pigments ? { ...saved.pigments } : state.mixes[0].pigments,
            }];
            state.active_mix = 0;
            state.deleted_mixes = [];
            if (saved.project)    Object.assign(state.project, saved.project);
            if (saved.prices)     Object.assign(state.prices, saved.prices);
            if (saved.settings)   Object.assign(state.settings, saved.settings);
            if (typeof saved.no_costs === 'boolean') state.no_costs = saved.no_costs;
            if (typeof saved.color_preview === 'boolean') state.color_preview = saved.color_preview;
        } else if (saved._version === 2) {
            if (Array.isArray(saved.mixes) && saved.mixes.length > 0) state.mixes = saved.mixes;
            if (typeof saved.active_mix === 'number') state.active_mix = Math.min(saved.active_mix, state.mixes.length - 1);
            if (Array.isArray(saved.deleted_mixes)) state.deleted_mixes = saved.deleted_mixes;
            if (saved.project)    Object.assign(state.project, saved.project);
            if (saved.prices)     Object.assign(state.prices, saved.prices);
            if (saved.settings)   Object.assign(state.settings, saved.settings);
            if (typeof saved.no_costs === 'boolean') state.no_costs = saved.no_costs;
            if (typeof saved.color_preview === 'boolean') state.color_preview = saved.color_preview;
        }
    } catch (_) {}
};

const syncInputsFromState = () => {
    // Project
    const pnEl = document.getElementById('project-name');
    if (pnEl) pnEl.value = state.project.project_name || '';
    elements.projectLength.value = state.project.length;
    elements.projectWidth.value = state.project.width;
    elements.projectThickness.value = state.project.thickness;
    elements.projectQuantity.value = state.project.quantity;
    elements.projectWaste.value = state.project.waste_factor;
    elements.projectPaversPerDay.value = state.project.pavers_per_day;
    if (elements.projectWorkers) elements.projectWorkers.value = state.project.workers || 1;
    elements.projectWageRate.value = state.project.wage_rate;
    elements.projectTransport.value = state.project.raw_material_transport;
    const spEl = document.getElementById('project-selling-price');
    if (spEl) spEl.value = state.project.selling_price;
    // Mix inputs are inside dynamic mix sections — renderMixSections() handles syncing those
    renderMixSections();
    renderMixSelector();
    // Prices
    updatePricesUI();
    // Business identity + tax
    const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    setEl('biz-name',    state.settings.business_name);
    setEl('biz-address', state.settings.business_address);
    setEl('biz-phone',   state.settings.business_phone);
    setEl('biz-email',   state.settings.business_email);
    setEl('biz-tax-id',  state.settings.business_tax_id);
    setEl('tax-rate',    state.settings.tax_rate);
    // No-costs toggle
    elements.toggleNoCosts.classList.toggle('active', state.no_costs);
    const slider = elements.toggleNoCosts.querySelector('.toggle-slider');
    if (slider) slider.style.transform = state.no_costs ? 'translateX(20px)' : 'translateX(0)';
    // Color preview toggle
    const cpToggle = document.getElementById('toggle-color-preview');
    if (cpToggle) {
        cpToggle.classList.toggle('active', state.color_preview);
        cpToggle.setAttribute('aria-checked', String(state.color_preview));
        const cpSlider = cpToggle.querySelector('.toggle-slider');
        if (cpSlider) cpSlider.style.transform = state.color_preview ? 'translateX(20px)' : 'translateX(0)';
    }
};

// Initialize application
const init = async () => {
    try {
        // Apply theme before paint to prevent flash
        initializeTheme();

        // Hide loading overlay
        elements.loadingOverlay.style.display = 'none';

        // Setup event listeners
        setupEventListeners();
        
        // Load persisted inventory state
        loadInventory();

        // Apply inventory toggle visual state
        const toggleLinkEl = document.getElementById('toggle-calculator-link');
        if (toggleLinkEl) {
            toggleLinkEl.setAttribute('aria-checked', String(state.inventory.linked_to_calculator));
            const slider = toggleLinkEl.querySelector('.toggle-slider');
            if (slider) slider.style.transform = state.inventory.linked_to_calculator ? 'translateX(20px)' : 'translateX(0)';
            const hintEl = document.getElementById('inventory-link-hint');
            if (hintEl && !state.inventory.linked_to_calculator) {
                hintEl.textContent = 'Stock ledger only. Toggle on to link usage to the mix calculator.';
            }
        }

        // Load persisted calculator state
        loadState();
        syncInputsFromState();

        // Pigment selects are now inside dynamic mix sections (built by renderMixSections above).
        // PIGMENT_OPTIONS array in this file provides the option list — no WASM call needed here.

        // Initialize WASM module before first calculation
        await wasmInit();

        // Initial calculation
        await calculate();
        saveState();
        renderRecipes();
        
    } catch (error) {
        console.error('Initialization error:', error);
        elements.loadingOverlay.innerHTML = `
            <div class="loading-text">Failed to load calculator. Please refresh the page.</div>
        `;
    }
};

// Theme Management
function initializeTheme() {
    const html = document.documentElement;
    const btnLight = document.getElementById('theme-btn-light');
    const btnDark = document.getElementById('theme-btn-dark');

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    html.setAttribute('data-theme', activeTheme);
    updateThemeButtons(activeTheme, btnLight, btnDark);

    [btnLight, btnDark].forEach(btn => {
        btn.addEventListener('click', () => {
            const newTheme = btn.dataset.theme;
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeButtons(newTheme, btnLight, btnDark);
            applyColorPreview();
        });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            updateThemeButtons(newTheme, btnLight, btnDark);
            applyColorPreview();
        }
    });
}

function updateThemeButtons(theme, btnLight, btnDark) {
    btnLight.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    btnDark.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
}

// Start the application
init();
