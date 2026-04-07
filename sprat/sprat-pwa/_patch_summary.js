const fs = require('fs');
let content = fs.readFileSync('js/app.js', 'utf8');

// Find the function by line markers and replace the whole block
const startMarker = 'const renderSummaryCard = (materials) => {\r\n    const summary = buildInventorySummary(materials);\r\n    const el = document.getElementById(\'inv-summary-card\');\r\n    if (!el) return;\r\n\r\n    if (!summary) { el.style.display = \'none\'; return; }\r\n    el.style.display = \'block\';\r\n\r\n    const { limitingMaterials, minDays, dailyCost, restockCost, fmtC } = summary;';

if (!content.includes(startMarker)) {
    console.log('START MARKER NOT FOUND');
    process.exit(1);
}

const endMarker = '        <div class="result-row"><span class="result-label">Restock Cost</span><span class="result-value">${fmtC(restockCost)}</span></div>\r\n    `;\r\n};';

if (!content.includes(endMarker)) {
    console.log('END MARKER NOT FOUND');
    process.exit(1);
}

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker) + endMarker.length;
const oldBlock = content.slice(startIdx, endIdx);

const newBlock = `const renderSummaryCard = (materials) => {
    const summary = buildInventorySummary(materials);
    const el = document.getElementById('inv-summary-card');
    if (!el) return;

    if (!summary) { el.style.display = 'none'; return; }
    el.style.display = 'block';

    const { runwayMaterials, minDays, dailyCost, targetShortfallCost, fmtC, target, shortMaterials } = summary;
    const modeLabel = state.inventory.production_mode === 'weekly' ? 'week' : state.inventory.production_mode === 'monthly' ? 'month' : 'day';
    const formatQty = (stockKey, qty) => {
        if (stockKey.endsWith('_bags')) return qty.toFixed(1) + ' bags';
        if (stockKey.endsWith('_yd3')) return qty.toFixed(2) + ' yd\u00B3';
        if (stockKey.endsWith('_kg')) return qty.toFixed(2) + ' kg';
        if (stockKey.endsWith('_l')) return qty.toFixed(1) + ' L';
        return qty.toFixed(2);
    };

    // Target section
    let targetHtml = '';
    if (target > 0) {
        if (shortMaterials.length === 0) {
            targetHtml = \`<div style="margin-bottom:10px;padding:8px 10px;background:rgba(22,163,74,0.1);border-left:3px solid #16a34a;border-radius:4px;">
                <span style="font-size:0.85rem;font-weight:600;color:#16a34a;">Stock covers \${target.toLocaleString()} pavers this \${modeLabel}</span>
            </div>\`;
        } else {
            const shortRows = shortMaterials.map(m => {
                const shortQty = formatQty(m.stockKey, m.short);
                const haveQty = formatQty(m.stockKey, m.have);
                const needQty = formatQty(m.stockKey, m.needed);
                return \`<div style="display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:1px solid var(--border-color);">
                    <span style="font-size:0.82rem;">\${m.name}</span>
                    <span style="font-size:0.78rem;color:var(--error-color);font-weight:600;white-space:nowrap;margin-left:8px;">short \${shortQty}<span style="color:var(--text-secondary);font-weight:400;"> (have \${haveQty}, need \${needQty})</span></span>
                </div>\`;
            }).join('');
            targetHtml = \`<div style="margin-bottom:10px;">
                <div class="result-label" style="margin-bottom:4px;color:var(--error-color);">Short for \${target.toLocaleString()} pavers this \${modeLabel}</div>
                \${shortRows}
                \${targetShortfallCost > 0 ? \`<div style="margin-top:6px;font-size:0.82rem;color:var(--text-secondary);">Shortfall cost: <strong>\${fmtC(targetShortfallCost)}</strong></div>\` : ''}
            </div>\`;
        }
    }

    // Runway section
    let runwayHtml;
    if (runwayMaterials.length === 0) {
        runwayHtml = \`<div class="result-row"><span class="result-label">Production Runway</span><span class="result-value" style="color:var(--text-secondary);">—</span></div>\`;
    } else {
        const runwayVal = minDays !== null ? \`\${minDays.toFixed(1)} days\` : '—';
        const runwayRows = runwayMaterials.map(m => {
            const daysText = m.isDepleted ? 'NO STOCK' : \`\${m.daysRemaining.toFixed(1)}d\`;
            const style = m.isDepleted || m.daysRemaining <= 2
                ? 'color:var(--error-color);font-weight:600;'
                : 'color:var(--text-secondary);';
            return \`<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="font-size:0.82rem;">\${m.name}</span><span style="font-size:0.82rem;\${style}">\${daysText}</span></div>\`;
        }).join('');

        runwayHtml = \`<div class="result-row"><span class="result-label">Production Runway</span><span class="result-value" style="font-weight:700;">\${runwayVal}</span></div>
            <div style="margin:6px 0 8px;"><div class="result-label" style="margin-bottom:4px;">Stock by Material</div>\${runwayRows}</div>\`;
    }

    el.innerHTML = \`
        <h2 class="card-title">Stock Summary</h2>
        \${targetHtml}
        \${runwayHtml}
        <div class="result-row"><span class="result-label">Daily Material Cost</span><span class="result-value">\${fmtC(dailyCost)}</span></div>
    \`;
};`.replace(/\n/g, '\r\n');

content = content.slice(0, startIdx) + newBlock + content.slice(endIdx);
fs.writeFileSync('js/app.js', content);
console.log('OK - replaced ' + oldBlock.length + ' chars with ' + newBlock.length + ' chars');
