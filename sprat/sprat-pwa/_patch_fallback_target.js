const fs = require('fs');
let js = fs.readFileSync('js/fallback.js', 'utf8');
const orig = js.replace(/\r\n/g, '\n');

// 1. Update fbInvState to use three separate target fields
const s1old = `const fbInvState = { linked: true, stock: {}, produced: 0, productionMode: 'daily', productionTarget: 0, waterUnlimited: true, daysMultiplier: 0 };`;
const s1new = `const fbInvState = { linked: true, stock: {}, produced: 0, productionMode: 'daily', productionTargetDaily: 0, productionTargetWeekly: 0, productionTargetMonthly: 0, waterUnlimited: true, daysMultiplier: 0 };`;
if (!orig.includes(s1old)) { console.log('S1 NOT FOUND'); process.exit(1); }

// 2. Update load: replace old single production_target load with three fields + migration
const s2old = `                if (typeof saved.production_target === 'number') fbInvState.productionTarget = saved.production_target;`;
const s2new = `                ['daily','weekly','monthly'].forEach(m => {
                    const k = 'production_target_' + m;
                    const fk = 'productionTarget' + m.charAt(0).toUpperCase() + m.slice(1);
                    if (typeof saved[k] === 'number') fbInvState[fk] = saved[k];
                    else if (m === 'daily' && typeof saved.production_target === 'number') fbInvState.productionTargetDaily = saved.production_target;
                });`;
if (!orig.includes(s2old)) { console.log('S2 NOT FOUND'); process.exit(1); }

// 3. Update save: replace single production_target save with three fields
const s3old = `                production_mode: fbInvState.productionMode,
                production_target: fbInvState.productionTarget,`;
const s3new = `                production_mode: fbInvState.productionMode,
                production_target_daily: fbInvState.productionTargetDaily,
                production_target_weekly: fbInvState.productionTargetWeekly,
                production_target_monthly: fbInvState.productionTargetMonthly,`;
if (!orig.includes(s3old)) { console.log('S3 NOT FOUND'); process.exit(1); }

// 4. Update the two places that read productionTarget for calculations (lines ~1849 and ~1944)
// Both use: fbInvState.productionTarget || calculator.state.project.paversPerDay || 0
// Replace with: reading from active mode's target field
const calcHelper = `(fbInvState['productionTarget' + fbInvState.productionMode.charAt(0).toUpperCase() + fbInvState.productionMode.slice(1)] || 0)`;

let out = orig
    .replace(s1old, s1new)
    .replace(s2old, s2new)
    .replace(s3old, s3new)
    .replace(/fbInvState\.productionTarget \|\| calculator\.state\.project\.paversPerDay \|\| 0/g,
             `(${calcHelper} || calculator.state.project.paversPerDay || 0)`)
    // Line ~2032: the rateEl display also uses productionTarget
    .replace(/\$\{fbInvState\.productionTarget \|\| calculator\.state\.project\.paversPerDay \|\| 0\}/g,
             `\${${calcHelper} || calculator.state.project.paversPerDay || 0}`);

// 5. Add production mode button + separate target input wiring after fbPavTodayEl block
const wireInsertAfter = `    const fbPavTodayEl = document.getElementById('inventory-pavers-today');
    if (fbPavTodayEl) {
        if (fbInvState.produced > 0) fbPavTodayEl.value = fbInvState.produced;
        fbPavTodayEl.addEventListener('input', () => {
            fbInvState.produced = parseFloat(fbPavTodayEl.value) || 0;
            fbInvSave();
            const mats = fbInvBuildMaterials();
            mats.forEach(fbInvUpdateStatus);
            fbInvRenderSummary(mats);
        });
    }`;

const wireNewSection = `    const fbPavTodayEl = document.getElementById('inventory-pavers-today');
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

    // Production mode buttons + separate target inputs
    const fbProdModeBtns = document.querySelectorAll('.prod-mode-btn');
    const fbProdGroups = {
        daily:   document.getElementById('prod-target-daily-group'),
        weekly:  document.getElementById('prod-target-weekly-group'),
        monthly: document.getElementById('prod-target-monthly-group'),
    };
    const fbProdInputs = {
        daily:   document.getElementById('production-target-daily'),
        weekly:  document.getElementById('production-target-weekly'),
        monthly: document.getElementById('production-target-monthly'),
    };
    const fbSyncProdModeUI = () => {
        const mode = fbInvState.productionMode;
        fbProdModeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
        ['daily','weekly','monthly'].forEach(m => {
            if (fbProdGroups[m]) fbProdGroups[m].style.display = m === mode ? '' : 'none';
        });
        const fk = (m) => 'productionTarget' + m.charAt(0).toUpperCase() + m.slice(1);
        ['daily','weekly','monthly'].forEach(m => {
            if (fbProdInputs[m]) fbProdInputs[m].value = fbInvState[fk(m)] || 0;
        });
        const rateEl = document.getElementById('inventory-daily-rate');
        if (rateEl) rateEl.textContent = (fbInvState[fk(mode)] || calculator.state.project.paversPerDay || 0) + ' pavers/day';
    };
    fbProdModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            fbInvState.productionMode = btn.dataset.mode;
            fbSyncProdModeUI();
            fbInvSave();
            fbInvUpdate();
        });
    });
    ['daily','weekly','monthly'].forEach(m => {
        const el = fbProdInputs[m];
        if (!el) return;
        const fk = 'productionTarget' + m.charAt(0).toUpperCase() + m.slice(1);
        el.addEventListener('input', (e) => {
            fbInvState[fk] = parseFloat(e.target.value) || 0;
            fbInvSave();
            fbInvUpdate();
        });
    });
    fbSyncProdModeUI();`;

if (!out.includes(wireInsertAfter)) { console.log('WIRE INSERT POINT NOT FOUND'); process.exit(1); }
out = out.replace(wireInsertAfter, wireNewSection);

fs.writeFileSync('js/fallback.js', out.replace(/\n/g, '\r\n'));
console.log('fallback.js patched OK');
