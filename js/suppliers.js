// Supplier management — shared across all three execution paths (WASM, fallback, watchdog).
// All paths read/write the same localStorage key so data is consistent regardless of how the app loaded.
// This file is loaded as a plain <script> (not a module) so it runs in all contexts.

(function() {
    'use strict';

    var SUPPLIERS_KEY = 'sprat-suppliers';

    // ─── Persistence ────────────────────────────────────────────────────────────

    function loadSuppliers() {
        try {
            var arr = JSON.parse(localStorage.getItem(SUPPLIERS_KEY) || 'null');
            return Array.isArray(arr) ? arr : [];
        } catch (_) { return []; }
    }

    function saveSuppliers(suppliers) {
        try { localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers)); } catch (_) {}
        if (window.SheetSync) window.SheetSync.markDirty('suppliers');
    }

    function genId() {
        return 'sup_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    // ─── Stock key → display name map ───────────────────────────────────────────

    var MATERIAL_NAMES = {
        portland_bags:      'Portland Cement',
        white_bags:         'White Cement',
        sand_yd3:           'Sand',
        stone_dust_b_yd3:   'Stone Dust (Fine)',
        gcc400_b_yd3:       'GCC 400 (Fine)',
        regular_gravel_yd3: 'Regular Gravel ¾″',
        chip_gravel_yd3:    'Chip Gravel ⅜″',
        white_gravel_yd3:   'White Gravel',
        stone_dust_c_yd3:   'Stone Dust (Coarse)',
        gcc400_c_yd3:       'GCC 400 (Coarse)',
        white_lime_yd3:     'White Lime',
        micro_fibre_kg:     'Micro Fibre',
        macro_fibre_kg:     'Macro Fibre',
        water_reducer_kg:   'Water Reducer',
        hardener_kg:        'Hardener',
        pigment1_l:         'Pigment 1',
        pigment2_l:         'Pigment 2',
    };

    var STOCK_KEYS = Object.keys(MATERIAL_NAMES);

    function materialName(k) { return MATERIAL_NAMES[k] || k; }

    function stockUnit(k) {
        if (k.endsWith('_bags')) return 'bags';
        if (k.endsWith('_yd3'))  return 'yd\u00B3';
        if (k.endsWith('_kg'))   return 'kg';
        if (k.endsWith('_l'))    return 'L';
        return '';
    }

    // ─── Edit form ──────────────────────────────────────────────────────────────

    // Build and render an edit form for a supplier (new or existing) inside the container.
    function renderEditForm(container, supplier, onDone) {
        // supplier: null for new, object for edit
        var isNew = !supplier;
        supplier = supplier || { id: genId(), name: '', contact_name: '', phone: '', email: '', address: '', notes: '', materials: [] };

        var form = document.createElement('div');
        form.className = 'supplier-form';
        form.style.cssText = 'border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px;margin-bottom:12px;background:var(--bg-card);';

        function field(label, id, type, value, placeholder) {
            return '<div class="input-group"><label class="input-label">' + label + '</label>' +
                   '<input type="' + type + '" id="sf-' + id + '" class="input-number" value="' + (value||'').replace(/"/g, '&quot;') + '" placeholder="' + (placeholder||'') + '" style="text-align:left;"></div>';
        }

        // Build material rows
        var matRowsHtml = '';
        STOCK_KEYS.forEach(function(k) {
            var existing = (supplier.materials || []).find(function(m) { return m.stockKey === k; });
            var checked      = existing ? 'checked' : '';
            var price        = existing ? existing.unit_price : '';
            var leadTime     = existing ? existing.lead_time_days : '';
            var contSize     = existing ? (existing.container_size || '') : '';
            var contLabel    = existing ? (existing.container_label || '') : '';
            var unit = stockUnit(k);
            matRowsHtml += '<div class="supplier-mat-row" data-key="' + k + '" style="border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:8px;margin-bottom:8px;">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
                  '<input type="checkbox" id="smat-' + k + '" ' + checked + ' style="flex-shrink:0;">' +
                  '<label for="smat-' + k + '" style="flex:1;font-size:0.85rem;font-weight:600;">' + materialName(k) + '</label>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding-left:20px;">' +
                  '<div style="display:flex;align-items:center;gap:4px;">' +
                    '<input type="number" id="smat-price-' + k + '" class="input-number" value="' + (price||'') + '" placeholder="Price/'+unit+'" min="0" step="0.01" style="flex:1;font-size:0.8rem;">' +
                    '<span style="font-size:0.75rem;color:var(--text-secondary);white-space:nowrap;">JMD/'+unit+'</span>' +
                  '</div>' +
                  '<div style="display:flex;align-items:center;gap:4px;">' +
                    '<input type="number" id="smat-lead-' + k + '" class="input-number" value="' + (leadTime||'') + '" placeholder="Lead" min="0" step="1" style="flex:1;font-size:0.8rem;">' +
                    '<span style="font-size:0.75rem;color:var(--text-secondary);">days</span>' +
                  '</div>' +
                  '<div style="display:flex;align-items:center;gap:4px;">' +
                    '<input type="number" id="smat-csize-' + k + '" class="input-number" value="' + (contSize||'') + '" placeholder="Pkg size" min="0" step="0.001" style="flex:1;font-size:0.8rem;">' +
                    '<span style="font-size:0.75rem;color:var(--text-secondary);white-space:nowrap;">'+unit+'/pkg</span>' +
                  '</div>' +
                  '<div>' +
                    '<input type="text" id="smat-clabel-' + k + '" class="input-number" value="' + (contLabel||'').replace(/"/g,'&quot;') + '" placeholder="Pkg label" style="flex:1;font-size:0.8rem;text-align:left;">' +
                  '</div>' +
                '</div>' +
            '</div>';
        });

        form.innerHTML =
            field('Name *', 'name', 'text', supplier.name, 'e.g. ReadyMix Jamaica Ltd') +
            field('Contact Name', 'contact', 'text', supplier.contact_name, 'Optional') +
            field('Phone', 'phone', 'tel', supplier.phone, 'Optional') +
            field('Email', 'email', 'email', supplier.email, 'Optional — used for mailto: send') +
            field('Address', 'address', 'text', supplier.address, 'Optional — printed on PO') +
            field('Notes', 'notes', 'text', supplier.notes, 'Optional') +
            '<div style="margin-top:12px;"><div class="input-label" style="margin-bottom:8px;">Materials Supplied</div>' +
            '<div id="sf-mat-rows">' + matRowsHtml + '</div></div>' +
            '<div style="display:flex;gap:8px;margin-top:16px;">' +
              '<button id="sf-save" class="btn-primary" style="flex:1;">' + (isNew ? 'Add Supplier' : 'Save Changes') + '</button>' +
              '<button id="sf-cancel" class="btn-secondary" style="flex:1;">Cancel</button>' +
            '</div>';

        container.innerHTML = '';
        container.appendChild(form);

        document.getElementById('sf-cancel').addEventListener('click', function() { onDone(null); });

        document.getElementById('sf-save').addEventListener('click', function() {
            var name = (document.getElementById('sf-name').value || '').trim();
            if (!name) { supShowToast('Supplier name is required.'); return; }
            supplier.name         = name;
            supplier.contact_name = (document.getElementById('sf-contact').value || '').trim();
            supplier.phone        = (document.getElementById('sf-phone').value || '').trim();
            supplier.email        = (document.getElementById('sf-email').value || '').trim();
            supplier.address      = (document.getElementById('sf-address').value || '').trim();
            supplier.notes        = (document.getElementById('sf-notes').value || '').trim();

            var materials = [];
            STOCK_KEYS.forEach(function(k) {
                var cb = document.getElementById('smat-' + k);
                if (cb && cb.checked) {
                    var priceEl  = document.getElementById('smat-price-'  + k);
                    var leadEl   = document.getElementById('smat-lead-'   + k);
                    var csizeEl  = document.getElementById('smat-csize-'  + k);
                    var clabelEl = document.getElementById('smat-clabel-' + k);
                    var entry = {
                        stockKey:       k,
                        unit_price:     parseFloat((priceEl  && priceEl.value)  || '0') || 0,
                        unit:           stockUnit(k),
                        lead_time_days: parseInt((leadEl  && leadEl.value)   || '0', 10) || 0,
                    };
                    var csize = parseFloat((csizeEl && csizeEl.value) || '0') || 0;
                    if (csize > 0) {
                        entry.container_size  = csize;
                        entry.container_label = (clabelEl && clabelEl.value.trim()) || '';
                    }
                    materials.push(entry);
                }
            });
            supplier.materials = materials;
            supplier.updated_at = new Date().toISOString();
            onDone(supplier);
        });
    }

    // ─── List renderer ──────────────────────────────────────────────────────────

    function renderSupplierList() {
        var container = document.getElementById('supplier-list-container');
        if (!container) return;

        var suppliers = loadSuppliers();

        if (suppliers.length === 0) {
            container.innerHTML = '<div class="recipe-empty">No suppliers saved yet.</div>';
            return;
        }

        var html = '';
        suppliers.forEach(function(s, idx) {
            var matCount = (s.materials || []).length;
            html += '<div class="recipe-row" data-sup-idx="' + idx + '" style="flex-direction:column;align-items:stretch;gap:4px;">' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                  '<span class="recipe-name" style="flex:1;">' + escHtml(s.name) + (s.phone ? ' &middot; ' + escHtml(s.phone) : '') + '</span>' +
                  '<button class="recipe-btn recipe-btn-load sup-edit-btn" data-idx="' + idx + '">Edit</button>' +
                  '<button class="recipe-btn recipe-btn-del sup-del-btn" data-idx="' + idx + '">Delete</button>' +
                '</div>' +
                (matCount > 0 ? '<div style="font-size:0.75rem;color:var(--text-secondary);padding-left:4px;">' + matCount + ' material' + (matCount > 1 ? 's' : '') + '</div>' : '') +
            '</div>';
        });
        container.innerHTML = html;

        // Wire edit buttons
        container.querySelectorAll('.sup-edit-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(btn.dataset.idx, 10);
                var suppliers = loadSuppliers();
                var sup = JSON.parse(JSON.stringify(suppliers[idx]));
                renderEditForm(container, sup, function(updated) {
                    if (updated) {
                        var list = loadSuppliers();
                        list[idx] = updated;
                        saveSuppliers(list);
                    }
                    renderSupplierList();
                });
            });
        });

        // Wire delete buttons
        container.querySelectorAll('.sup-del-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(btn.dataset.idx, 10);
                var list = loadSuppliers();
                var name = list[idx] ? list[idx].name : 'this supplier';
                // Inline confirm via double-click pattern: first click shows warning text, second click deletes
                if (btn.dataset.confirm !== '1') {
                    btn.dataset.confirm = '1';
                    btn.textContent = 'Confirm?';
                    btn.style.background = '#dc2626';
                    setTimeout(function() { btn.dataset.confirm = ''; btn.textContent = 'Delete'; btn.style.background = ''; }, 3000);
                    return;
                }
                list.splice(idx, 1);
                saveSuppliers(list);
                renderSupplierList();
            });
        });
    }

    function escHtml(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function supShowToast(msg) {
        var t = document.getElementById('toast');
        var tm = document.getElementById('toast-message');
        if (t && tm) { tm.textContent = msg; t.classList.add('show'); setTimeout(function() { t.classList.remove('show'); }, 2500); }
    }

    // ─── Init ───────────────────────────────────────────────────────────────────

    function initSuppliers() {
        renderSupplierList();

        var addBtn = document.getElementById('btn-add-supplier');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                var container = document.getElementById('supplier-list-container');
                if (!container) return;
                renderEditForm(container, null, function(newSup) {
                    if (newSup) {
                        var list = loadSuppliers();
                        list.push(newSup);
                        saveSuppliers(list);
                    }
                    renderSupplierList();
                });
            });
        }

        // Export JSON
        var exportBtn = document.getElementById('btn-export-suppliers');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                var data = JSON.stringify(loadSuppliers(), null, 2);
                var blob = new Blob([data], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'suppliers.json';
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        // Import JSON
        var importInput = document.getElementById('btn-import-suppliers');
        if (importInput) {
            importInput.addEventListener('change', function(e) {
                var file = e.target.files && e.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(evt) {
                    try {
                        var imported = JSON.parse(evt.target.result);
                        if (!Array.isArray(imported)) { supShowToast('Invalid supplier file — expected a JSON array.'); return; }
                        // Merge: add imported suppliers that don't share an existing id
                        var existing = loadSuppliers();
                        var existingIds = existing.map(function(s) { return s.id; });
                        var added = 0;
                        imported.forEach(function(s) {
                            if (!s.name) return;
                            if (s.id && existingIds.indexOf(s.id) >= 0) return; // skip duplicates
                            if (!s.id) s.id = genId();
                            existing.push(s);
                            added++;
                        });
                        saveSuppliers(existing);
                        renderSupplierList();
                        supShowToast('Imported ' + added + ' supplier(s).');
                    } catch (_) { supShowToast('Failed to parse supplier file.'); }
                };
                reader.readAsText(file);
                importInput.value = ''; // reset so same file can be re-imported
            });
        }
    }

    // Public API
    window.SupplierDB = {
        load: loadSuppliers,
        save: saveSuppliers,
        init: initSuppliers,
        renderList: renderSupplierList,
        MATERIAL_NAMES: MATERIAL_NAMES,
        STOCK_KEYS: STOCK_KEYS,
        materialName: materialName,
        stockUnit: stockUnit,
    };

    // Auto-init if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSuppliers);
    } else {
        initSuppliers();
    }
})();
