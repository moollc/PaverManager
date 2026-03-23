// Purchase Order engine — shared across all three execution paths.
// Loaded as a plain <script>. Requires SupplierDB (suppliers.js) to be loaded first.

(function() {
    'use strict';

    var PO_COUNTER_KEY = 'sprat-po-counter';
    var PO_HISTORY_KEY = 'sprat-po-history';

    // ─── PO Number ──────────────────────────────────────────────────────────────

    function nextPoNumber() {
        var n = parseInt(localStorage.getItem(PO_COUNTER_KEY) || '0', 10) + 1;
        localStorage.setItem(PO_COUNTER_KEY, String(n));
        return 'PO-' + String(n).padStart(4, '0');
    }

    // ─── History ─────────────────────────────────────────────────────────────────

    function loadPoHistory() {
        try { var h = JSON.parse(localStorage.getItem(PO_HISTORY_KEY) || 'null'); return Array.isArray(h) ? h : []; } catch (_) { return []; }
    }

    function savePoHistory(history) {
        try { localStorage.setItem(PO_HISTORY_KEY, JSON.stringify(history)); } catch (_) {}
    }

    function addToHistory(po) {
        var h = loadPoHistory();
        h.unshift(po); // newest first
        if (h.length > 200) h = h.slice(0, 200);
        savePoHistory(h);
        if (window.SheetSync) window.SheetSync.markDirty('po_history');
    }

    // ─── Grouping ────────────────────────────────────────────────────────────────

    // orderItems: [{ name, qty, stockKey, unitPrice, cost }]
    // Returns: [{ supplier: {name, email, ...} | null, items: [...] }, ...]
    function groupBySupplier(orderItems) {
        var suppliers = (window.SupplierDB ? window.SupplierDB.load() : []);

        // Build a map: stockKey → best supplier (first matching one)
        var stockKeyToSupplier = {};
        suppliers.forEach(function(sup) {
            (sup.materials || []).forEach(function(m) {
                if (!stockKeyToSupplier[m.stockKey]) {
                    stockKeyToSupplier[m.stockKey] = sup;
                }
            });
        });

        var groups = {}; // supplierId → { supplier, items }
        var unassigned = [];

        orderItems.forEach(function(item) {
            var sup = stockKeyToSupplier[item.stockKey];
            if (!sup) {
                unassigned.push(item);
            } else {
                var sid = sup.id;
                if (!groups[sid]) groups[sid] = { supplier: sup, items: [] };
                // Apply supplier unit price if set
                var supMat = (sup.materials || []).find(function(m) { return m.stockKey === item.stockKey; });
                var displayItem = Object.assign({}, item);
                if (supMat && supMat.unit_price > 0) {
                    displayItem.unitPrice = supMat.unit_price;
                    // Apply container rounding if configured
                    if (supMat.container_size && supMat.container_size > 0) {
                        var containers = Math.ceil(item.qty / supMat.container_size);
                        displayItem.containers    = containers;
                        displayItem.containerSize  = supMat.container_size;
                        displayItem.containerLabel = supMat.container_label || supMat.unit;
                        displayItem.qty           = containers * supMat.container_size;
                    }
                    displayItem.cost = displayItem.qty * displayItem.unitPrice;
                }
                groups[sid].items.push(displayItem);
            }
        });

        var result = Object.values(groups);
        if (unassigned.length > 0) {
            result.push({ supplier: null, items: unassigned });
        }
        return result;
    }

    // ─── HTML rendering ──────────────────────────────────────────────────────────

    function fmtC(v) {
        return 'JMD ' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function escHtml(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function fmtQty(item) {
        if (item.containers) {
            return item.containers + ' ' + escHtml(item.containerLabel) + ' (' + (item.qty % 1 === 0 ? item.qty : item.qty.toFixed(3)) + ' ' + escHtml(item.containerLabel.replace(/\s*\(.*/, '')) + ')';
        }
        var k = item.stockKey;
        if (k.endsWith('_bags')) return item.qty + ' bags';
        if (k.endsWith('_yd3'))  return item.qty.toFixed(2) + ' yd\u00B3';
        if (k.endsWith('_kg'))   return item.qty.toFixed(3) + ' kg';
        if (k.endsWith('_l'))    return item.qty.toFixed(2) + ' L';
        return String(item.qty);
    }

    // Render one PO block (one supplier group)
    function renderPoBlock(poData) {
        var sup = poData.supplier;
        var items = poData.items;
        var subtotal = items.reduce(function(s, i) { return s + (i.cost || 0); }, 0);
        var taxAmt = subtotal * (poData.taxRate / 100);
        var grandTotal = subtotal + taxAmt;

        var supName = sup ? escHtml(sup.name) : 'Unassigned';
        var supContact = sup ? [sup.contact_name, sup.phone, sup.email, sup.address].filter(Boolean).map(escHtml).join(' &middot; ') : '';

        var html = '<div class="po-block" data-po-number="' + escHtml(poData.poNumber) + '">';

        // PO header
        html += '<div class="po-header-block">';
        html += '<div class="po-meta"><span class="po-number">' + escHtml(poData.poNumber) + '</span>';
        html += ' &mdash; <span class="po-date">' + escHtml(poData.date) + '</span></div>';

        html += '<div class="po-parties">';
        // From
        html += '<div class="po-party"><div class="po-party-label">From</div>';
        html += '<div class="po-party-name">' + escHtml(poData.businessName || 'Your Business') + '</div>';
        if (poData.businessAddress) html += '<div class="po-party-detail">' + escHtml(poData.businessAddress) + '</div>';
        if (poData.businessPhone)   html += '<div class="po-party-detail">' + escHtml(poData.businessPhone)   + '</div>';
        if (poData.businessEmail)   html += '<div class="po-party-detail">' + escHtml(poData.businessEmail)   + '</div>';
        if (poData.businessTaxId)   html += '<div class="po-party-detail">TRN: ' + escHtml(poData.businessTaxId) + '</div>';
        html += '</div>';
        // To
        html += '<div class="po-party"><div class="po-party-label">To</div>';
        html += '<div class="po-party-name">' + supName + '</div>';
        if (supContact) html += '<div class="po-party-detail">' + supContact + '</div>';
        html += '</div>';
        html += '</div>'; // po-parties

        if (poData.projectName) {
            html += '<div class="po-ship-to">Ship to: <strong>' + escHtml(poData.projectName) + '</strong></div>';
        }
        html += '</div>'; // po-header-block

        // Line items
        html += '<table class="po-table"><thead><tr><th>Material</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>';
        items.forEach(function(item) {
            html += '<tr>';
            html += '<td>' + escHtml(item.name) + '</td>';
            html += '<td>' + fmtQty(item) + '</td>';
            html += '<td>' + fmtC(item.unitPrice) + '</td>';
            html += '<td>' + fmtC(item.cost) + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table>';

        // Totals
        html += '<div class="po-totals">';
        html += '<div class="po-total-row"><span>Subtotal</span><span>' + fmtC(subtotal) + '</span></div>';
        if (poData.taxRate > 0) {
            html += '<div class="po-total-row"><span>GCT ' + poData.taxRate + '%</span><span>' + fmtC(taxAmt) + '</span></div>';
        }
        html += '<div class="po-total-row po-grand-total"><span>Total</span><span>' + fmtC(grandTotal) + '</span></div>';
        html += '</div>';

        // Notes
        html += '<div class="po-notes-section">';
        html += '<textarea id="po-notes-' + escHtml(poData.poNumber.replace(/[^a-z0-9]/gi,'_')) + '" class="po-notes" placeholder="Add notes..." rows="2">' + escHtml(poData.notes || '') + '</textarea>';
        html += '</div>';

        // Actions
        html += '<div class="po-actions">';
        html += '<button class="btn-primary po-print-btn" data-po-number="' + escHtml(poData.poNumber) + '">Print / Save PDF</button>';
        if (sup && sup.email) {
            var subject = encodeURIComponent(poData.poNumber + ' from ' + (poData.businessName || poData.projectName || 'Paver Co'));
            var body = encodePlainTextPo(poData, items, subtotal, taxAmt, grandTotal);
            html += '<a class="btn-secondary po-email-btn" href="mailto:' + escHtml(sup.email) + '?subject=' + subject + '&body=' + body + '">Email Supplier</a>';
        }
        html += '<button class="btn-secondary po-copy-btn" data-po-number="' + escHtml(poData.poNumber) + '">Copy Text</button>';
        html += '<button class="btn-secondary po-save-btn" data-po-number="' + escHtml(poData.poNumber) + '">Save to History</button>';
        html += '</div>';

        html += '</div>'; // po-block
        return { html: html, poData: poData, subtotal: subtotal, taxAmt: taxAmt, grandTotal: grandTotal };
    }

    function encodePlainTextPo(poData, items, subtotal, taxAmt, grandTotal) {
        var lines = [];
        lines.push('PURCHASE ORDER: ' + poData.poNumber);
        lines.push('Date: ' + poData.date);
        lines.push('');
        lines.push('From: ' + (poData.businessName || 'Your Business'));
        if (poData.businessAddress) lines.push('       ' + poData.businessAddress);
        if (poData.businessPhone)   lines.push('       ' + poData.businessPhone);
        if (poData.businessTaxId)   lines.push('       TRN: ' + poData.businessTaxId);
        lines.push('');
        lines.push('To:   ' + (poData.supplier ? poData.supplier.name : 'Unassigned'));
        if (poData.supplier) {
            if (poData.supplier.contact_name) lines.push('      ' + poData.supplier.contact_name);
            if (poData.supplier.phone)        lines.push('      ' + poData.supplier.phone);
            if (poData.supplier.address)      lines.push('      ' + poData.supplier.address);
        }
        if (poData.projectName) lines.push('');
        if (poData.projectName) lines.push('Ship to: ' + poData.projectName);
        lines.push('');
        lines.push('--- Items ---');
        items.forEach(function(item) {
            lines.push(item.name + '  ' + fmtQty(item) + '  @ JMD ' + (item.unitPrice || 0).toLocaleString() + '  =  ' + fmtC(item.cost));
        });
        lines.push('');
        lines.push('Subtotal: ' + fmtC(subtotal));
        if (poData.taxRate > 0) lines.push('GCT ' + poData.taxRate + '%: ' + fmtC(taxAmt));
        lines.push('TOTAL: ' + fmtC(grandTotal));
        if (poData.notes) { lines.push(''); lines.push('Notes: ' + poData.notes); }
        return encodeURIComponent(lines.join('\n'));
    }

    function buildPlainTextPo(poData, items, subtotal, taxAmt, grandTotal) {
        var lines = [];
        lines.push('PURCHASE ORDER: ' + poData.poNumber);
        lines.push('Date: ' + poData.date);
        lines.push('');
        lines.push('From: ' + (poData.businessName || 'Your Business'));
        if (poData.businessAddress) lines.push('       ' + poData.businessAddress);
        if (poData.businessPhone)   lines.push('       ' + poData.businessPhone);
        if (poData.businessTaxId)   lines.push('       TRN: ' + poData.businessTaxId);
        lines.push('');
        lines.push('To:   ' + (poData.supplier ? poData.supplier.name : 'Unassigned'));
        if (poData.supplier && poData.supplier.contact_name) lines.push('      ' + poData.supplier.contact_name);
        if (poData.supplier && poData.supplier.phone)        lines.push('      ' + poData.supplier.phone);
        if (poData.supplier && poData.supplier.address)      lines.push('      ' + poData.supplier.address);
        if (poData.projectName) { lines.push(''); lines.push('Ship to: ' + poData.projectName); }
        lines.push('');
        lines.push('--- Items ---');
        items.forEach(function(item) {
            lines.push(item.name + '  ' + fmtQty(item) + '  @ JMD ' + (item.unitPrice || 0).toLocaleString() + '  =  ' + fmtC(item.cost));
        });
        lines.push('');
        lines.push('Subtotal: ' + fmtC(subtotal));
        if (poData.taxRate > 0) lines.push('GCT ' + poData.taxRate + '%: ' + fmtC(taxAmt));
        lines.push('TOTAL: ' + fmtC(grandTotal));
        if (poData.notes) { lines.push(''); lines.push('Notes: ' + poData.notes); }
        return lines.join('\n');
    }

    // ─── Main entry point ────────────────────────────────────────────────────────

    // orderItems: [{name, qty, stockKey, unitPrice, cost}]
    // settings: {business_name, business_address, business_phone, business_email, business_tax_id, tax_rate}
    // projectName: string
    // outputEl: DOM element to render into
    function generatePO(orderItems, settings, projectName, outputEl) {
        if (!outputEl) return;
        if (!orderItems || orderItems.length === 0) {
            outputEl.innerHTML = '<div class="purchase-order-empty">No materials to order.</div>';
            return;
        }

        var groups = groupBySupplier(orderItems);
        var today = new Date().toISOString().split('T')[0];
        var taxRate = settings ? (settings.tax_rate || 0) : 0;

        var html = '';
        var allPoData = [];

        groups.forEach(function(group) {
            if (group.items.length === 0) return;
            var poNumber = nextPoNumber();
            var poData = {
                poNumber:        poNumber,
                date:            today,
                supplier:        group.supplier,
                businessName:    settings ? settings.business_name    : '',
                businessAddress: settings ? settings.business_address : '',
                businessPhone:   settings ? settings.business_phone   : '',
                businessEmail:   settings ? settings.business_email   : '',
                businessTaxId:   settings ? settings.business_tax_id  : '',
                taxRate:         taxRate,
                projectName:     projectName || '',
                notes:           '',
                status:          'Draft',
                items:           group.items,
            };
            var rendered = renderPoBlock(poData);
            html += rendered.html;
            allPoData.push({ poData: poData, subtotal: rendered.subtotal, taxAmt: rendered.taxAmt, grandTotal: rendered.grandTotal });
        });

        outputEl.innerHTML = html;

        // Wire action buttons
        allPoData.forEach(function(entry) {
            var pd = entry.poData;
            var safeNum = pd.poNumber.replace(/[^a-z0-9]/gi, '_');

            // Print
            var printBtn = outputEl.querySelector('.po-print-btn[data-po-number="' + pd.poNumber + '"]');
            if (printBtn) {
                printBtn.addEventListener('click', function() {
                    window.__poPrintTarget = pd.poNumber;
                    window.print();
                });
            }

            // Copy text
            var copyBtn = outputEl.querySelector('.po-copy-btn[data-po-number="' + pd.poNumber + '"]');
            if (copyBtn) {
                copyBtn.addEventListener('click', function() {
                    var notesEl = document.getElementById('po-notes-' + safeNum);
                    pd.notes = notesEl ? notesEl.value : '';
                    var text = buildPlainTextPo(pd, pd.items, entry.subtotal, entry.taxAmt, entry.grandTotal);
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(text).then(function() { showToast('Copied!'); }).catch(function() { fallbackCopy(text); });
                    } else { fallbackCopy(text); }
                });
            }

            // Share
            if (navigator.share) {
                var shareBtn = outputEl.querySelector('.po-copy-btn[data-po-number="' + pd.poNumber + '"]');
                // share is on copy — if share available, also offer it (already handled by copy for now)
            }

            // Save to history
            var saveBtn = outputEl.querySelector('.po-save-btn[data-po-number="' + pd.poNumber + '"]');
            if (saveBtn) {
                saveBtn.addEventListener('click', function() {
                    var notesEl = document.getElementById('po-notes-' + safeNum);
                    pd.notes = notesEl ? notesEl.value : '';
                    addToHistory(pd);
                    saveBtn.textContent = 'Saved!';
                    saveBtn.disabled = true;
                    setTimeout(function() { saveBtn.textContent = 'Save to History'; saveBtn.disabled = false; }, 2000);
                    // Refresh history list if visible
                    renderPoHistory();
                });
            }
        });
    }

    function showToast(msg) {
        var t = document.getElementById('toast');
        var tm = document.getElementById('toast-message');
        if (t && tm) { tm.textContent = msg; t.classList.add('show'); setTimeout(function() { t.classList.remove('show'); }, 2000); }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        try { document.execCommand('copy'); showToast('Copied!'); } catch (_) { showToast('Copy failed — use long press to copy.'); }
        document.body.removeChild(ta);
    }

    // ─── History UI ──────────────────────────────────────────────────────────────

    function statusBadge(status) {
        var colors = { Draft: '#6b7280', Sent: '#2563eb', Received: '#16a34a', Partial: '#d97706' };
        var c = colors[status] || '#6b7280';
        return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:0.7rem;font-weight:700;background:' + c + '20;color:' + c + ';">' + escHtml(status) + '</span>';
    }

    function renderPoHistory() {
        var container = document.getElementById('po-history-list');
        if (!container) return;

        var history = loadPoHistory();
        if (history.length === 0) {
            container.innerHTML = '<div class="recipe-empty">No purchase orders saved yet.</div>';
            return;
        }

        var html = '';
        history.forEach(function(po, idx) {
            var supName = po.supplier ? escHtml(po.supplier.name) : 'Unassigned';
            var total = (po.items || []).reduce(function(s, i) { return s + (i.cost || 0); }, 0);
            var tax = total * ((po.taxRate || 0) / 100);
            var grand = total + tax;
            html += '<div class="recipe-row" style="flex-direction:column;align-items:stretch;gap:4px;margin-bottom:8px;">';
            html += '<div style="display:flex;align-items:center;gap:8px;">';
            html += '<span style="font-weight:700;font-size:0.875rem;">' + escHtml(po.poNumber || 'PO') + '</span>';
            html += statusBadge(po.status || 'Draft');
            html += '<span style="flex:1;font-size:0.8rem;color:var(--text-secondary);">' + supName + ' &middot; ' + escHtml(po.date || '') + '</span>';
            html += '</div>';
            html += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
            html += '<span style="font-size:0.8rem;color:var(--text-secondary);">Total: ' + fmtC(grand) + '</span>';
            if (po.status !== 'Received') {
                html += '<button class="recipe-btn recipe-btn-load po-hist-receive-btn" data-idx="' + idx + '">Receive</button>';
                html += '<button class="recipe-btn po-hist-sent-btn" data-idx="' + idx + '" style="background:var(--primary-color);color:white;">Mark Sent</button>';
            }
            html += '<button class="recipe-btn recipe-btn-del po-hist-del-btn" data-idx="' + idx + '">Delete</button>';
            html += '</div>';
            // Expandable items list
            html += '<details style="margin-top:4px;">';
            html += '<summary style="font-size:0.8rem;color:var(--text-secondary);cursor:pointer;">' + (po.items || []).length + ' item(s)</summary>';
            html += '<ul style="margin:6px 0 0 16px;font-size:0.8rem;color:var(--text-secondary);">';
            (po.items || []).forEach(function(item) {
                html += '<li>' + escHtml(item.name) + ' — ' + fmtQty(item) + ' = ' + fmtC(item.cost) + '</li>';
            });
            html += '</ul></details>';
            html += '</div>';
        });
        container.innerHTML = html;

        // Wire buttons
        container.querySelectorAll('.po-hist-del-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                if (btn.dataset.confirm !== '1') {
                    btn.dataset.confirm = '1';
                    btn.textContent = 'Confirm?';
                    btn.style.background = '#dc2626'; btn.style.color = 'white';
                    setTimeout(function() { btn.dataset.confirm = ''; btn.textContent = 'Delete'; btn.style.background = ''; btn.style.color = ''; }, 3000);
                    return;
                }
                var idx = parseInt(btn.dataset.idx, 10);
                var h = loadPoHistory(); h.splice(idx, 1); savePoHistory(h); renderPoHistory();
            });
        });

        container.querySelectorAll('.po-hist-sent-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(btn.dataset.idx, 10);
                var h = loadPoHistory(); h[idx].status = 'Sent'; savePoHistory(h); renderPoHistory();
            });
        });

        container.querySelectorAll('.po-hist-receive-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(btn.dataset.idx, 10);
                var h = loadPoHistory();
                var po = h[idx];
                if (!po) return;
                renderReceiveForm(po, idx);
            });
        });
    }

    function renderReceiveForm(po, histIdx) {
        var container = document.getElementById('po-history-list');
        if (!container) return;

        var formHtml = '<div style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px;background:var(--bg-card);">';
        formHtml += '<div style="font-weight:700;margin-bottom:12px;">Receive ' + escHtml(po.poNumber || 'PO') + '</div>';
        formHtml += '<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">Enter quantities actually received. Leave blank to receive the full ordered amount.</p>';

        (po.items || []).forEach(function(item, i) {
            formHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
            formHtml += '<label style="flex:1;font-size:0.85rem;">' + escHtml(item.name) + ' (ordered: ' + fmtQty(item) + ')</label>';
            formHtml += '<input type="number" id="rcv-qty-' + i + '" class="input-number" value="' + item.qty + '" min="0" style="width:100px;font-size:0.85rem;">';
            formHtml += '</div>';
        });

        formHtml += '<div style="display:flex;gap:8px;margin-top:12px;">';
        formHtml += '<button id="rcv-confirm" class="btn-primary" style="flex:1;">Confirm Receipt</button>';
        formHtml += '<button id="rcv-cancel" class="btn-secondary" style="flex:1;">Cancel</button>';
        formHtml += '</div></div>';

        container.innerHTML = formHtml;

        document.getElementById('rcv-cancel').addEventListener('click', renderPoHistory);

        document.getElementById('rcv-confirm').addEventListener('click', function() {
            var h = loadPoHistory();
            var storedPo = h[histIdx];
            if (!storedPo) { renderPoHistory(); return; }

            var fullReceived = true;
            (storedPo.items || []).forEach(function(item, i) {
                var el = document.getElementById('rcv-qty-' + i);
                var rcvQty = el ? (parseFloat(el.value) || 0) : item.qty;
                item.received_qty = rcvQty;
                if (rcvQty < item.qty) fullReceived = false;
            });

            storedPo.status = fullReceived ? 'Received' : 'Partial';
            storedPo.received_date = new Date().toISOString().split('T')[0];
            savePoHistory(h);

            // Update inventory stock levels
            updateInventoryFromPo(storedPo);

            renderPoHistory();
            showToast('Receipt recorded. Stock updated.');
        });
    }

    // Add received quantities to inventory state across all three paths
    function updateInventoryFromPo(po) {
        var INV_KEY = 'sprat-inventory';
        try {
            var inv = JSON.parse(localStorage.getItem(INV_KEY) || 'null') || { stock: {} };
            if (!inv.stock) inv.stock = {};
            (po.items || []).forEach(function(item) {
                var rcv = item.received_qty !== undefined ? item.received_qty : item.qty;
                var sk = item.stockKey;
                inv.stock[sk] = (parseFloat(inv.stock[sk]) || 0) + rcv;
            });
            localStorage.setItem(INV_KEY, JSON.stringify(inv));
        } catch (_) {}
    }

    // Auto-render history on load
    function initPoHistory() {
        renderPoHistory();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPoHistory);
    } else {
        initPoHistory();
    }

    // Public API
    window.PurchaseOrderEngine = {
        generate: generatePO,
        loadHistory: loadPoHistory,
        saveHistory: savePoHistory,
        addToHistory: addToHistory,
        groupBySupplier: groupBySupplier,
        renderHistory: renderPoHistory,
    };
})();
