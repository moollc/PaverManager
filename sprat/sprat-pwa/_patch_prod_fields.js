const fs = require('fs');

// ── index.html patch ─────────────────────────────────────────────────────────
let html = fs.readFileSync('index.html', 'utf8');

const htmlOld = `                    <div class="input-group">
                        <label class="input-label" id="production-target-label">Target Pavers Per Day</label>
                        <div class="input-row">
                            <input type="number" id="production-target" class="input-number" value="0" min="0" step="1" placeholder="e.g. 100">
                            <span class="input-unit">pavers</span>
                        </div>
                        <p class="help-text" id="production-target-hint">Enter how many pavers you plan to produce — all material needs recalculate.</p>
                    </div>`;

const htmlNew = `                    <div class="input-group" id="prod-target-daily-group">
                        <label class="input-label">Target Pavers Today</label>
                        <div class="input-row">
                            <input type="number" id="production-target-daily" class="input-number" value="0" min="0" step="1" placeholder="e.g. 100">
                            <span class="input-unit">pavers</span>
                        </div>
                        <p class="help-text">How many pavers you plan to produce today.</p>
                    </div>
                    <div class="input-group" id="prod-target-weekly-group" style="display:none;">
                        <label class="input-label">Target Pavers This Week</label>
                        <div class="input-row">
                            <input type="number" id="production-target-weekly" class="input-number" value="0" min="0" step="1" placeholder="e.g. 700">
                            <span class="input-unit">pavers</span>
                        </div>
                        <p class="help-text">How many pavers you plan to produce this week.</p>
                    </div>
                    <div class="input-group" id="prod-target-monthly-group" style="display:none;">
                        <label class="input-label">Target Pavers This Month</label>
                        <div class="input-row">
                            <input type="number" id="production-target-monthly" class="input-number" value="0" min="0" step="1" placeholder="e.g. 3000">
                            <span class="input-unit">pavers</span>
                        </div>
                        <p class="help-text">How many pavers you plan to produce this month.</p>
                    </div>`;

// Normalize CRLF for comparison
const htmlOldNorm = htmlOld.replace(/\r\n/g, '\n');
const htmlNorm = html.replace(/\r\n/g, '\n');

if (!htmlNorm.includes(htmlOldNorm)) {
    console.log('HTML OLD BLOCK NOT FOUND');
    process.exit(1);
}

// Replace in normalized form then restore CRLF
const htmlPatched = htmlNorm.replace(htmlOldNorm, htmlNew.replace(/\r\n/g, '\n'));
fs.writeFileSync('index.html', htmlPatched.replace(/\n/g, '\r\n'));
console.log('index.html patched OK');

// ── app.js patch ──────────────────────────────────────────────────────────────
let js = fs.readFileSync('js/app.js', 'utf8');
const jsNorm = js.replace(/\r\n/g, '\n');

// 1. State: replace single production_target with three separate fields
const stateOld = `        production_mode: 'daily',\n        production_target: 0,`;
const stateNew = `        production_mode: 'daily',\n        production_target_daily: 0,\n        production_target_weekly: 0,\n        production_target_monthly: 0,`;

if (!jsNorm.includes(stateOld)) { console.log('STATE OLD NOT FOUND'); process.exit(1); }

// 2. Replace the entire prod-mode wiring block
const wireOld = `    // Production mode buttons (Daily / Weekly / Monthly)
    const prodModeBtns = document.querySelectorAll('.prod-mode-btn');
    const prodTargetEl = document.getElementById('production-target');
    const prodTargetLabel = document.getElementById('production-target-label');
    const prodTargetHint = document.getElementById('production-target-hint');
    const prodRateLabel = document.getElementById('production-rate-label');
    const prodRateValue = document.getElementById('inventory-daily-rate');

    const getModeLabel = (mode) => mode === 'daily' ? 'Day' : mode === 'weekly' ? 'Week' : 'Month';
    const getModeDays = (mode) => mode === 'daily' ? 1 : mode === 'weekly' ? 7 : 30;

    const syncProdModeUI = () => {
        const mode = state.inventory.production_mode;
        prodModeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
        const lbl = getModeLabel(mode);
        if (prodTargetLabel) prodTargetLabel.textContent = \`Target Pavers Per \${lbl}\`;
        if (prodTargetHint) prodTargetHint.textContent = mode === 'daily'
            ? 'Enter how many pavers you plan to produce today — all material needs recalculate.'
            : mode === 'weekly'
            ? 'Enter your weekly target — shown as daily rate for calculations.'
            : 'Enter your monthly target — shown as daily rate for calculations.';
        if (prodRateLabel) prodRateLabel.textContent = \`\${lbl}ly Rate (from Project tab)\`;
        // Show project tab rate
        if (prodRateValue) prodRateValue.textContent = state.project.pavers_per_day + ' pavers/day';
        // Sync production target value
        if (prodTargetEl) {
            prodTargetEl.value = state.inventory.production_target || 0;
        }
    };
    prodModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.inventory.production_mode = btn.dataset.mode;
            syncProdModeUI();
            saveInventory();
            _inventoryMaterialKeys = '';
            updateInventoryTab();
        });
    });

    // Production target input
    if (prodTargetEl) {
        prodTargetEl.addEventListener('input', (e) => {
            state.inventory.production_target = parseFloat(e.target.value) || 0;
            saveInventory();
            _inventoryMaterialKeys = '';
            updateInventoryTab();
        });
    }
    syncProdModeUI();`;

const wireNew = `    // Production mode buttons (Daily / Weekly / Monthly) — separate entry fields
    const prodModeBtns = document.querySelectorAll('.prod-mode-btn');
    const prodRateValue = document.getElementById('inventory-daily-rate');
    const prodGroups = {
        daily:   document.getElementById('prod-target-daily-group'),
        weekly:  document.getElementById('prod-target-weekly-group'),
        monthly: document.getElementById('prod-target-monthly-group'),
    };
    const prodInputs = {
        daily:   document.getElementById('production-target-daily'),
        weekly:  document.getElementById('production-target-weekly'),
        monthly: document.getElementById('production-target-monthly'),
    };

    const syncProdModeUI = () => {
        const mode = state.inventory.production_mode;
        prodModeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
        // Show only the active mode's input group
        ['daily','weekly','monthly'].forEach(m => {
            if (prodGroups[m]) prodGroups[m].style.display = m === mode ? '' : 'none';
        });
        // Sync values into inputs
        ['daily','weekly','monthly'].forEach(m => {
            if (prodInputs[m]) prodInputs[m].value = state.inventory['production_target_' + m] || 0;
        });
        if (prodRateValue) prodRateValue.textContent = state.project.pavers_per_day + ' pavers/day';
    };

    prodModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.inventory.production_mode = btn.dataset.mode;
            syncProdModeUI();
            saveInventory();
            _inventoryMaterialKeys = '';
            updateInventoryTab();
        });
    });

    // Wire each target input independently
    ['daily','weekly','monthly'].forEach(m => {
        const el = prodInputs[m];
        if (!el) return;
        el.addEventListener('input', (e) => {
            state.inventory['production_target_' + m] = parseFloat(e.target.value) || 0;
            saveInventory();
            _inventoryMaterialKeys = '';
            updateInventoryTab();
        });
    });
    syncProdModeUI();`;

if (!jsNorm.includes(wireOld)) { console.log('WIRE OLD NOT FOUND'); process.exit(1); }

// 3. calculateInventory: replace production_target read
const calcOld = `    // production_target is the total pavers the user wants to produce in the selected period\n    const productionTarget = state.inventory.production_target || 0;`;
const calcNew = `    // production_target_* are separate fields per mode; read the active one\n    const _activeMode = state.inventory.production_mode || 'daily';\n    const productionTarget = state.inventory['production_target_' + _activeMode] || 0;`;

if (!jsNorm.includes(calcOld)) { console.log('CALC OLD NOT FOUND'); process.exit(1); }

// 4. saveInventory: replace production_target field
const saveOld = `            production_mode: state.inventory.production_mode,\n            production_target: state.inventory.production_target,`;
const saveNew = `            production_mode: state.inventory.production_mode,\n            production_target_daily: state.inventory.production_target_daily,\n            production_target_weekly: state.inventory.production_target_weekly,\n            production_target_monthly: state.inventory.production_target_monthly,`;

if (!jsNorm.includes(saveOld)) { console.log('SAVE OLD NOT FOUND'); process.exit(1); }

// 5. loadInventory: replace production_target load
const loadOld = `        if (typeof data.production_target === 'number') {\n            state.inventory.production_target = data.production_target;\n        }`;
const loadNew = `        ['daily','weekly','monthly'].forEach(m => {\n            const k = 'production_target_' + m;\n            if (typeof data[k] === 'number') state.inventory[k] = data[k];\n            // migrate old single-field saves\n            else if (m === 'daily' && typeof data.production_target === 'number') state.inventory.production_target_daily = data.production_target;\n        });`;

if (!jsNorm.includes(loadOld)) { console.log('LOAD OLD NOT FOUND'); process.exit(1); }

// Apply all patches
let out = jsNorm
    .replace(stateOld, stateNew)
    .replace(wireOld, wireNew)
    .replace(calcOld, calcNew)
    .replace(saveOld, saveNew)
    .replace(loadOld, loadNew);

fs.writeFileSync('js/app.js', out.replace(/\n/g, '\r\n'));
console.log('js/app.js patched OK');
