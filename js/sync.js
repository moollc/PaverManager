// Google Sheets Sync — shared across all three execution paths (WASM, fallback, watchdog).
// Exposes window.SheetSync. Loaded as a plain <script> after suppliers.js and po.js.
// Prices/suppliers auto-pull on every page load when URL is configured.
// Write mode (5-min toggle) is required to push changes back to the sheet.

(function() {
    'use strict';

    var SYNC_CONFIG_KEY = 'sprat-sync-config';
    var SHEET_CACHE_KEY = 'sprat-sheet-cache';
    var SYNC_DIRTY_KEY  = 'sprat-sync-dirty';
    var SYNC_WINDOW_MS  = 5 * 60 * 1000;  // 5 minutes write mode
    var PUSH_INTERVAL_MS = 30 * 1000;     // push every 30s if dirty
    var MAX_FAILURES = 5;

    var _pushTimer    = null;
    var _countTimer   = null;
    var _deadline     = null;
    var _failCount    = 0;
    var _enabled      = false;

    // ─── Config persistence ──────────────────────────────────────────────────

    var DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbxw8NfagN0nCGQ_iyYFM_ZMXl9faAwcCn_Nkovcg-t6zwVJ-FGvmL11CmTPzYA1Ra6G/exec';

    function loadConfig() {
        var cfg;
        try { cfg = JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY) || 'null') || {}; } catch(_) { cfg = {}; }
        if (!cfg.url) cfg.url = DEFAULT_URL;
        return cfg;
    }

    function saveConfig(cfg) {
        try { localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(cfg)); } catch(_) {}
    }

    function loadDirty() {
        try { return JSON.parse(localStorage.getItem(SYNC_DIRTY_KEY) || 'null') || {}; } catch(_) { return {}; }
    }

    function saveDirty(d) {
        try { localStorage.setItem(SYNC_DIRTY_KEY, JSON.stringify(d)); } catch(_) {}
    }

    function loadCache() {
        try { return JSON.parse(localStorage.getItem(SHEET_CACHE_KEY) || 'null') || null; } catch(_) { return null; }
    }

    function saveCache(data) {
        try { localStorage.setItem(SHEET_CACHE_KEY, JSON.stringify(data)); } catch(_) {}
    }

    // ─── Dirty flag API (called by other modules) ────────────────────────────

    function markDirty(category) {
        if (!_enabled) return;
        var d = loadDirty();
        d[category] = true;
        saveDirty(d);
    }

    // ─── Status display ──────────────────────────────────────────────────────

    function setStatus(msg) {
        var el = document.getElementById('sync-status');
        if (el) el.textContent = msg;
    }

    function showToast(msg) {
        var t = document.getElementById('toast');
        var tm = document.getElementById('toast-message');
        if (t && tm) {
            tm.textContent = msg;
            t.classList.add('show');
            setTimeout(function() { t.classList.remove('show'); }, 3000);
        }
    }

    function setToggleUI(on) {
        var btn = document.getElementById('toggle-sync');
        if (!btn) return;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-checked', String(on));
        var slider = btn.querySelector('.toggle-slider');
        if (slider) slider.style.transform = on ? 'translateX(20px)' : 'translateX(0)';
    }

    // ─── Apply pulled data to app state ─────────────────────────────────────

    function applyPrices(prices) {
        if (!prices || !prices.length) return 0;
        // Map sheet material_key → DOM input id
        var keyMap = {
            portland_bag:   'price-portland',
            white_bag:      'price-white',
            sand:           'price-sand',
            stone_dust:     'price-stone-dust',
            gcc400:         'price-gcc400',
            regular_gravel: 'price-regular-gravel',
            chip_gravel:    'price-chip-gravel',
            white_gravel:   'price-white-gravel',
            white_lime:     'price-white-lime',
            micro_fibre:    'price-micro-fibre',
            macro_fibre:    'price-macro-fibre',
            water_reducer:  'price-water-reducer',
            hardener:       'price-hardener',
        };
        var count = 0;
        prices.forEach(function(row) {
            var mk = row.material_key;
            var price = parseFloat(row.price);
            if (!mk || isNaN(price)) return;
            var fieldId = keyMap[mk];
            if (fieldId) {
                var el = document.getElementById(fieldId);
                if (el) { el.value = price; el.dispatchEvent(new Event('input')); }
            }
            count++;
        });
        return count;
    }

    function applySuppliers(suppliers) {
        if (!suppliers || !suppliers.length) return 0;
        if (!window.SupplierDB) return 0;
        var existing = window.SupplierDB.load();
        var existingIds = {};
        existing.forEach(function(s) { existingIds[s.id] = true; });
        var added = 0;
        suppliers.forEach(function(s) {
            if (!s.name) return;
            if (s.id && existingIds[s.id]) {
                // Upsert: update if incoming is newer
                var idx = existing.findIndex(function(e) { return e.id === s.id; });
                if (idx >= 0) {
                    var inTs = s.updated_at || '';
                    var exTs = existing[idx].updated_at || '';
                    if (inTs > exTs) { existing[idx] = s; added++; }
                }
                return;
            }
            if (!s.id) s.id = 'sup_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
            existing.push(s);
            existingIds[s.id] = true;
            added++;
        });
        window.SupplierDB.save(existing);
        if (window.SupplierDB.renderList) window.SupplierDB.renderList();
        return added;
    }

    function applyMixPresets(presets) {
        if (!presets || !presets.length) return 0;
        var RECIPES_KEY = 'sprat-recipes';
        var existing;
        try { existing = JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]'); } catch(_) { existing = []; }
        var existingNames = {};
        existing.forEach(function(r) { existingNames[r.name] = true; });
        var added = 0;
        presets.forEach(function(p) {
            if (!p.preset_name) return;
            var name = existingNames[p.preset_name] ? p.preset_name + ' (Sheet)' : p.preset_name;
            if (!existingNames[name]) {
                existing.push({ name: name, mixes: p.mixes || [], activeMix: p.active_mix || 0 });
                existingNames[name] = true;
                added++;
            }
        });
        try { localStorage.setItem(RECIPES_KEY, JSON.stringify(existing)); } catch(_) {}
        return added;
    }

    function applyPulledData(data) {
        var priceCount = applyPrices(data.prices);
        var supCount   = applySuppliers(data.suppliers);
        applyMixPresets(data.mix_presets);
        // Cache raw data for offline use
        saveCache({ ts: data.ts, prices: data.prices, densities: data.densities, suppliers: data.suppliers, mix_presets: data.mix_presets });
        showToast('Synced: ' + priceCount + ' prices, ' + supCount + ' suppliers');
        var cfg = loadConfig();
        setStatus('Connected — last sync: ' + new Date().toLocaleTimeString() + (_enabled ? ' | Write mode — ' + formatRemaining() + ' remaining' : ''));
    }

    // ─── Network: pull ───────────────────────────────────────────────────────

    function pull() {
        var cfg = loadConfig();
        if (!cfg.url) return Promise.resolve();
        var url = cfg.url + '?action=pull' + (cfg.key ? '&key=' + encodeURIComponent(cfg.key) : '');
        return fetch(url, { redirect: 'follow' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.ok) { showToast('Sync pull failed: ' + (data.error || 'unknown')); return; }
                _failCount = 0;
                applyPulledData(data);
                var cfg2 = loadConfig();
                cfg2.lastSync = new Date().toISOString();
                saveConfig(cfg2);
            })
            .catch(function(err) {
                _failCount++;
                if (_enabled && _failCount >= MAX_FAILURES) disable('Network errors — write mode disabled');
            });
    }

    // ─── Network: push ───────────────────────────────────────────────────────

    function buildPushPayload(dirty) {
        var cfg = loadConfig();
        var payload = { action: 'push', key: cfg.key || '' };

        if (dirty.suppliers && window.SupplierDB) {
            payload.suppliers = window.SupplierDB.load();
        }
        if (dirty.po_history) {
            try { payload.po_history = JSON.parse(localStorage.getItem('sprat-po-history') || '[]'); } catch(_) { payload.po_history = []; }
        }
        if (dirty.inventory) {
            try {
                var inv = JSON.parse(localStorage.getItem('sprat-inventory') || 'null');
                if (inv) { payload.inventory = inv.stock || inv; payload.inventory_action = 'snapshot'; }
            } catch(_) {}
        }
        if (dirty.prices) {
            // Build prices array from DOM inputs (correct IDs: price-<material>)
            var priceMap = [
                ['portland_bag',   'price-portland'],
                ['white_bag',      'price-white'],
                ['sand',           'price-sand'],
                ['stone_dust',     'price-stone-dust'],
                ['gcc400',         'price-gcc400'],
                ['regular_gravel', 'price-regular-gravel'],
                ['chip_gravel',    'price-chip-gravel'],
                ['white_gravel',   'price-white-gravel'],
                ['white_lime',     'price-white-lime'],
                ['micro_fibre',    'price-micro-fibre'],
                ['macro_fibre',    'price-macro-fibre'],
                ['water_reducer',  'price-water-reducer'],
                ['hardener',       'price-hardener'],
            ];
            payload.prices = [];
            priceMap.forEach(function(pm) {
                var el = document.getElementById(pm[1]);
                if (el) payload.prices.push({ material_key: pm[0], price: parseFloat(el.value) || 0 });
            });
        }
        return payload;
    }

    function push() {
        var dirty = loadDirty();
        var hasDirty = Object.keys(dirty).some(function(k) { return dirty[k]; });
        if (!hasDirty) return Promise.resolve();

        var cfg = loadConfig();
        if (!cfg.url) return Promise.resolve();

        var payload = buildPushPayload(dirty);
        return fetch(cfg.url, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain' }, // avoid CORS preflight
            body: JSON.stringify(payload)
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.ok) { showToast('Sync push failed: ' + (data.error || 'unknown')); _failCount++; return; }
            _failCount = 0;
            saveDirty({});
            var cfg2 = loadConfig();
            cfg2.lastSync = new Date().toISOString();
            saveConfig(cfg2);
        })
        .catch(function(err) {
            _failCount++;
            if (_failCount >= MAX_FAILURES) disable('Network errors — write mode disabled');
        });
    }

    // ─── Timer helpers ───────────────────────────────────────────────────────

    function formatRemaining() {
        if (!_deadline) return '0:00';
        var ms = Math.max(0, _deadline - Date.now());
        var m = Math.floor(ms / 60000);
        var s = Math.floor((ms % 60000) / 1000);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function tickCountdown() {
        if (!_enabled) return;
        if (Date.now() >= _deadline) {
            disable('Write mode expired');
            return;
        }
        setStatus('Write mode — ' + formatRemaining() + ' remaining');
    }

    // ─── Enable / Disable ────────────────────────────────────────────────────

    function enable() {
        if (location.protocol === 'file:') {
            showToast('Sync requires HTTP. Open the app from a web server or installed PWA.');
            return;
        }
        var cfg = loadConfig();
        if (!cfg.url) {
            showToast('Enter the Apps Script URL first.');
            setToggleUI(false);
            return;
        }
        _enabled = true;
        _failCount = 0;
        _deadline = Date.now() + SYNC_WINDOW_MS;
        setToggleUI(true);
        setStatus('Write mode — ' + formatRemaining() + ' remaining');
        document.body.classList.add('sync-write-mode');

        // Pull latest before starting write session
        pull();

        _pushTimer  = setInterval(push, PUSH_INTERVAL_MS);
        _countTimer = setInterval(tickCountdown, 1000);
    }

    function disable(reason) {
        _enabled = false;
        if (_pushTimer)  { clearInterval(_pushTimer);  _pushTimer  = null; }
        if (_countTimer) { clearInterval(_countTimer); _countTimer = null; }
        _deadline = null;
        push(); // final flush
        setToggleUI(false);
        document.body.classList.remove('sync-write-mode');
        var cfg = loadConfig();
        var last = cfg.lastSync ? ' Last sync: ' + new Date(cfg.lastSync).toLocaleTimeString() : '';
        setStatus((reason || 'Write mode off') + '.' + last);
        if (reason) showToast(reason + '.');
    }

    // ─── Settings UI wiring ──────────────────────────────────────────────────

    function wireSettingsUI() {
        var urlInput = document.getElementById('sync-url');
        var keyInput = document.getElementById('sync-key');
        var toggleBtn = document.getElementById('toggle-sync');

        if (!toggleBtn) return;

        // Restore saved config into inputs
        var cfg = loadConfig();
        if (urlInput && cfg.url) urlInput.value = cfg.url;
        if (keyInput && cfg.key) keyInput.value = cfg.key;

        // Save config on input change
        if (urlInput) urlInput.addEventListener('input', function() {
            var c = loadConfig(); c.url = urlInput.value.trim(); saveConfig(c);
        });
        if (keyInput) keyInput.addEventListener('input', function() {
            var c = loadConfig(); c.key = keyInput.value.trim(); saveConfig(c);
        });

        toggleBtn.addEventListener('click', function() {
            if (_enabled) { disable(); } else { enable(); }
        });

        // Show status based on config
        var cfg2 = loadConfig();
        if (cfg2.url) {
            var last = cfg2.lastSync ? 'Connected — last sync: ' + new Date(cfg2.lastSync).toLocaleTimeString() : 'Connected — syncing on load...';
            setStatus(last);
        } else {
            setStatus('Set Apps Script URL to sync');
        }
    }

    // ─── Init ────────────────────────────────────────────────────────────────

    function init() {
        wireSettingsUI();
        // Auto-pull on load if URL is configured and not file://
        var cfg = loadConfig();
        if (cfg.url && location.protocol !== 'file:') {
            pull();
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    window.SheetSync = {
        init:       init,
        pull:       pull,
        push:       push,
        enable:     enable,
        disable:    disable,
        markDirty:  markDirty,
    };

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
