# Sprat PWA — State of the Tool

> Written 2026-03-21. Use this to orient yourself at the start of any new session.
> For task conventions and workflow see root WORKFLOW.md and TASKLIST.md.
> For completed commit history see root ClineTasks.md and ClaudeTasks.md.

---

## What This Tool Is

A concrete mix calculator PWA for a Jamaican paver production operation. The manager enters paver dimensions, quantity, mix design (cement ratio, aggregates, admixtures, pigments), labour/transport costs, and selling price. The tool outputs material quantities, batch material costs, labour costs, profit per paver, and a full bill of quantities. It works fully offline and on the filesystem (file://).

Prices are in JMD. Volumes in litres. Weights in kg. Aggregate quantities in yd³ (yard is the unit used locally for bulk material purchases).

---

## Architecture — Three Computation Paths

Every feature must work in all three paths. This is the most important constraint.

### Path 1: WASM (normal operation via HTTP server or PWA)
- `js/app.js` — ES module. Imports `calculate_all()` and `get_pigment_options()` from the compiled WASM package at `wasm/pkg/sprat_pwa.js`.
- `wasm/src/lib.rs` — Rust source. Compiled with `wasm-pack build --target web`. Output goes to `wasm/pkg/` (tracked in git).
- When WASM loads successfully, `app.js` runs and `fallback.js` / watchdog are inert.

### Path 2: JS Fallback (WASM unavailable — rare HTTP error)
- `js/fallback.js` — Plain JS class `ConcreteCalculator` with full mirror of all WASM calculations. Activates when `app.js` sets `window.__fallbackActive = true` on WASM load error.
- `DOMContentLoaded` handler at the bottom of `fallback.js` wires all inputs, loads state, renders mix sections, and sets up the inventory fallback.
- Calculation methods: `calculateVolume()`, `calculateMixProportions()`, `calculateMaterials()`, `calculateAdmixtures()`, `calculatePigments()`, `calculateCosts()`, `updateUI()`.
- Export methods: `copySummary(showToast)`, `downloadCSV(showToast)`.

### Path 3: Watchdog / Inline ES5 (file:// protocol — most common offline use)
- Large inline `<script>` block in `index.html` (line range approximate — do not rely on line numbers, they shift with edits; ES5 only).
- Detects file:// by checking `window.location.protocol === 'file:'` or `window.__fallbackActive`.
- Instantiates `new ConcreteCalculator()` (from fallback.js), wires all project/price inputs, handles mix add/delete/duplicate/rename, recipe presets, inventory, copy/CSV buttons, no-costs toggle, and active-mix selector.
- **ES5 only** — no arrow functions, no const/let, no template literals, no for...of, no destructuring. Uses `var`, `function`, string concatenation.
- Shares localStorage keys with Path 1 and 2 for seamless switching.

---

## File Structure

```
sprat/sprat-pwa/
├── index.html          — Full app HTML + inline watchdog script (Path 3)
├── manifest.json       — PWA manifest (SVG data URI icon)
├── service-worker.js   — Cache-first SW, currently v13
├── css/
│   └── styles.css      — All styles. Dark/light via [data-theme] on <html>.
├── js/
│   ├── app.js          — WASM path (Path 1). ES module.
│   ├── fallback.js     — JS fallback class + DOMContentLoaded wiring (Path 2 + class used by Path 3).
│   └── icons.js        — Injects 18+ inline SVGs by element ID on DOMContentLoaded.
└── wasm/
    ├── src/lib.rs      — Rust source (authoritative for all calculations)
    ├── Cargo.toml
    ├── Cargo.lock
    └── pkg/            — Compiled WASM output (tracked in git, do NOT gitignore)
        ├── sprat_pwa.js
        ├── sprat_pwa_bg.wasm
        ├── sprat_pwa.d.ts
        └── sprat_pwa_bg.wasm.d.ts
```

---

## State Structure (app.js canonical, mirrored in fallback.js with camelCase keys)

```js
state = {
    project: {
        project_name: '',           // free text
        length: 2,                  // ft
        width: 1,                   // ft
        thickness: 2,               // in
        quantity: 10,               // pavers
        waste_factor: 1.1,          // multiplier
        pavers_per_day: 10,
        workers: 1,
        wage_rate: 0,               // JMD/day per worker
        raw_material_transport: 0,  // JMD total for batch
        selling_price: 0,           // JMD per paver
    },
    mixes: [                        // Array — supports multiple mix designs
        {
            name: 'Mix 1',
            mix_parts: { cement: 1, sand: 2, coarse_agg: 3 },
            addition_a: { portland: 50, white: 50, custom: 0, custom_density: 1440 },
            addition_b: { sand: 50, stone_dust: 35, gcc400: 15, custom: 0, custom_density: 1600 },
            addition_c: { regular_gravel: 0, chip_gravel: 50, white_gravel: 50,
                          stone_dust: 0, gcc400: 0, white_lime: 0, custom: 0, custom_density: 1600 },
            water: { wc_ratio: 0.45, wet_cast_factor: 1.57 },
            admixtures: { micro_fibre: 0.6, macro_fibre: 0, water_reducer: 3, hardener: 0 },
            pigments: { total_percent: 0, pigment1_name: 'Red Iron Oxide', pigment1_parts: 1,
                        pigment2_name: 'None', pigment2_parts: 0 },
        }
    ],
    active_mix: 0,                  // index into mixes[]
    deleted_mixes: [],              // [{mix, original_index}] — for restore functionality
    prices: {
        portland_bag: 1750,         // JMD/bag (94 lb bag)
        white_bag: 3810,            // JMD/bag (88 lb bag)
        sand: 5000,                 // JMD/yd³
        stone_dust: 1800,           // JMD/yd³ (used for both Addition B and C stone dust)
        gcc400: 17891,              // JMD/yd³ (used for both Addition B and C gcc400)
        regular_gravel: 4000,       // JMD/yd³
        chip_gravel: 4000,          // JMD/yd³
        white_gravel: 1600,         // JMD/yd³
        white_lime: 55,             // JMD/yd³
        micro_fibre: 1622.6,        // JMD/kg
        macro_fibre: 2200,          // JMD/kg
        water_reducer: 1378.34,     // JMD/kg
        hardener: 0,                // JMD/kg — defaults 0, user must set
    },
    no_costs: false,                // hides cost section from copySummary text
    results: null,                  // set by calculate() — the WASM output object
    inventory: { ... },             // see Inventory section below
}
```

**Fallback.js uses camelCase** (`sellingPrice`, `wageRate`, `paversPerDay`, `stoneDust`, `gcc400`, etc.) mapped to the same snake_case localStorage keys.

**State persistence key:** `'sprat-calculator-state'` in localStorage, `_version: 2` format.
- v1 format (flat, single mix) is migrated to v2 on load.
- v2 format has top-level `mixes`, `active_mix`, `deleted_mixes`.

---

## Multi-Mix System

The app supports multiple named mix designs on a single project.

- The **Project tab** has an `active-mix-select` dropdown. Selecting a mix sets it as the active mix for all calculations.
- The **Mix tab** renders one collapsible section per mix (`<div class="mix-section" id="mix-section-{i}">`). Each section has: mix name input, Active badge (on active mix), Dup button, Delete button, chevron toggle.
- Mix results use **indexed element IDs**: e.g., `result-volume-{i}`, `stat-cement-{i}`, etc. The helper `sEl(suffix, value)` in app.js writes to `${suffix}-${state.active_mix}`.
- Cost tab elements are **non-indexed** (shared) — always show results for the active mix.
- Add/Dup/Delete/Restore operations:
  - `addMix()` — pushes default mix, re-renders, sets as active.
  - `duplicateMix(index)` — deep copies, inserts after original, adjusts `active_mix` pointer.
  - `deleteMix(index)` — moves to `deleted_mixes[]`, adjusts pointer, re-renders.
  - `restoreMix(deletedIndex)` — re-inserts at original position, adjusts pointer.
  - `permanentlyDeleteMix(deletedIndex)` — removes from `deleted_mixes[]`.
- Mix section rendering: `renderMixSections(onUpdate)` in fallback.js builds and injects all mix HTML, wires all inputs within each section.
- Active mix selector rendering: `renderMixSelector()` in fallback.js / `updateMixSelector()` in app.js rebuilds the `<select>` options.

---

## DOM Patterns

### Element ID conventions
- `project-*` — project inputs (length, width, thickness, quantity, waste, pavers-per-day, workers, wage-rate, transport, selling-price, name)
- `price-*` — price inputs (portland, white, sand, stone-dust, gcc400, etc.)
- `add-a-*-{i}`, `add-b-*-{i}`, `add-c-*-{i}` — mix slider inputs and value displays, indexed by mix position
- `mix-name-{i}`, `mix-dup-{i}`, `mix-del-{i}`, `mix-section-{i}`, `mix-body-{i}` — per-mix management elements
- `cost-*` — cost tab display elements (non-indexed, always active mix)
- `summary-*` — material summary tab elements (non-indexed)
- `stat-volume`, `stat-cement`, `stat-cost` — stats bar (non-indexed) — **JS refs removed; HTML/CSS removal pending Cline task**

### Helper functions
- `app.js`: `gEl(id)` = `document.getElementById(id)`, `sEl(sfx, v)` writes to `${sfx}-${state.active_mix}`, `setEl(id, v)` writes to static element
- `fallback.js`: `this.updateElement(id, value)`, `this.toggleRow(id, show)`

---

## Tabs

1. **Project** (`tab-project`) — Project name, active mix selector, paver dimensions, production/labour, transport, quick cost summary card (cost/paver, profit/paver, margin).
2. **Mix** (`tab-mix`) — Dynamic mix sections rendered by `renderMixSections()`. Add Mix button, Deleted Mixes restore list. Each section has Addition A/B/C sliders, water settings, admixtures, pigments, and result displays for that mix.
3. **Costs** (`tab-cost`) — Cost Summary card (material total, cost/paver, grand total, profit box), Material Cost Breakdown card (line items per material), Material Summary card (total weights), Controls card (No Costs toggle, Copy Summary button, Download CSV button).
4. **Stock/Inventory** (`tab-inventory`) — Link toggle, pavers produced today, stock inputs per active material, status badges, purchase order generator.
5. **Settings** (`tab-settings`) — Dark/light mode toggle, price inputs for all materials, Reset Prices button, Recipe Presets card (save/load/delete), Reset All button.

---

## Cost Tab — Current State

All features implemented across all three paths.

**Cost Summary card:** Material total, cost/paver, grand total. Profit box (hidden until selling_price > 0) shows profit/paver, margin%, and total batch profit.

**Copy Summary (`btn-copy-summary`):** Copies formatted text summary to clipboard. Uses Clipboard API → execCommand → manual textarea overlay fallback. Includes profit section when selling_price > 0. Respects `no_costs` toggle (omits cost section when toggled on). Works in WASM mode (wired in `setupEventListeners()`) and fallback/file mode (wired in fallback.js DOMContentLoaded).

**Download CSV (`btn-download-csv`):** Downloads a `.csv` with all project parameters, volumes, mix proportions, material quantities, cost analysis, cost summary, and profit analysis (when selling_price > 0). Full COST ANALYSIS section includes all materials: cement, all fine aggregates, all coarse aggregates (regular gravel, chip gravel, white gravel, stone dust C, GCC 400 C, white lime), admixtures (micro fibre, macro fibre, water reducer, hardener), pigments.

**No Costs toggle (`toggle-no-costs`):** Removes cost section from copySummary text. Persists to localStorage. CSS `.active` class and `.toggle-slider` transform applied. Works in all three paths.

---

## Inventory Tab — Current State

The inventory tab shows material stock levels for the active mix's materials only.

- **Link to Calculator toggle** — when ON, shows per-paver usage rate, used today (based on pavers produced today), stock remaining, and days remaining. When OFF, shows only the stock ledger.
- **Pavers Produced Today** — input that drives the "used today" and "remaining" calculations. Resets to 0 on page reload (not persisted).
- **Status badges** — green (>2 days remaining), amber (0–2 days), red (DEPLETED or NO STOCK set), grey (not linked or N/A).
- **Purchase Order generator** — enter target additional pavers, get per-material deficit list showing how much to buy.
- Stock levels persist to localStorage key `'sprat-inventory'` (separate from main state key).
- The inventory fallback in index.html (watchdog) reads `calc.calculateMaterials()` and `calc.calculateAdmixtures()` directly.

---

## Recipe Presets — Current State

- Up to 20 named presets stored in `'sprat-recipes'` localStorage key.
- Each preset stores: project dimensions (not selling price/transport), full mixes array, active_mix index.
- Selling price, transport, and wage are intentionally excluded from presets (they are project-specific, not mix-specific).
- Load replaces current mix data and project dimensions, triggers full recalculate.
- Delete removes from list immediately.
- Works in all three paths (app.js, fallback.js DOMContentLoaded, watchdog).

---

## Service Worker

- Cache-first strategy. Currently `concrete-calc-v16`.
- Caches: `/`, `/index.html`, `/css/styles.css`, `/js/app.js`, `/manifest.json`, `/wasm/pkg/sprat_pwa.js`, `/wasm/pkg/sprat_pwa_bg.wasm`.
- Bump `CACHE_NAME` version on every deploy that changes any of the above files.
- Falls back to network for any uncached request.

---

## Key Constraints (enforce on every change)

- **No emojis** anywhere — SVG icons only (defined in icons.js, injected by ID).
- **No alert() / confirm() / prompt()** — use `showToast()` / `fbShowToast()`.
- **No PNG/JPEG** — SVG or CSS only.
- **ES5 only in watchdog script** (index.html inline script) — var, function declarations, string concatenation only.
- **All three paths must stay in sync** — any new feature added to app.js needs a mirror in fallback.js and the watchdog script.
- **fallback.js calculations must mirror lib.rs exactly** — constants, formulas, unit conversions.
- **`bash check.sh` must pass with 0 new failures in sprat/`** — the 3 moo/ failures are pre-existing and expected.

---

## Densities and Conversions (authoritative values, do not change without updating lib.rs too)

| Material | Density |
|---|---|
| Portland Cement | 1506 kg/m³ |
| White Cement | 1134 kg/m³ |
| Sand | 1700 kg/m³ |
| Regular/Chip/White Gravel | 1600 kg/m³ |
| Stone Dust | 1500 kg/m³ |
| GCC 400 | 900 kg/m³ |
| White Lime | 500 kg/m³ |
| Water Reducer | 1.08 kg/L |
| Hardener | 1.05 kg/L |
| Macro Fibre | 0.91 kg/L |

| Conversion | Value |
|---|---|
| in³ to mL | 16.387 |
| m³ to yd³ | 1.30795 |
| kg to lb | 2.20462 |
| Portland bag | 94 lb |
| White cement bag | 88 lb |
| L to gal | 0.264172 |

Pigment densities (kg/L): Red Iron Oxide 1.037, Yellow Iron Oxide 0.454, Black Iron Oxide 1.451, Blue 1.08, Green 1.148, Brown 1.09, White Titanium Dioxide 1.037.

Pigment prices (JMD/L): Red Iron Oxide 1371.72, Yellow Iron Oxide 600.54, Black Iron Oxide 1919.34, Blue 7143, Green 1518.57, Brown 3000, White Titanium Dioxide 2591.32.

---

## Pending / Future Work

The following are known improvements not yet implemented:

### Mix Tab UI polish
The mix sections are functional but not visually polished:
- Collapsible body is controlled by a chevron button and CSS `.expanded` class — this works but the transitions could be smoother.
- No visual indicator in the active mix section that results are "live" (all other mixes show stale/static result displays when inactive — this is by design but may be confusing).
- Consider a "Compare Mixes" view that shows cost/paver side-by-side for all mixes.

### Deleted Mixes UI
Deleted mixes are tracked in `state.deleted_mixes` and can be restored. The restore UI exists in the Mix tab but is a plain button list — could be styled better.

### CSV: No Costs respect
The `downloadCSV()` function does not check `state.no_costs` — it always includes the full cost section. This is likely intentional (CSV is a data export, not a communication format) but worth confirming with the manager.

### Recipe presets: selling price
Selling price is excluded from recipe presets intentionally (it is a project-level concern, not a mix-level one). This assumption should be confirmed.

### WASM rebuild needed?
If any calculation logic in `lib.rs` is changed, run:
```
cd sprat/sprat-pwa/wasm
wasm-pack build --target web
```
Output goes to `wasm/pkg/` — commit the entire pkg/ directory. The current WASM binary is in sync with lib.rs.

---

## How to Verify the Tool Works

1. **HTTP/WASM path:** Serve `sprat/sprat-pwa/` from any local HTTP server (e.g. `python -m http.server 8080`). Open browser. WASM loads. Check console for no errors.
2. **file:// path:** Open `sprat/sprat-pwa/index.html` directly in browser. Watchdog activates. All tabs, inputs, mix add/delete, copy/CSV buttons, no-costs toggle, inventory, and presets must work.
3. **Profit flow:** Set selling price > 0. Confirm profit box appears on Cost tab with profit/paver, margin%, and total batch profit. Copy summary must include profit lines. CSV must include PROFIT ANALYSIS section.
4. **Multi-mix:** Add a second mix, change its aggregates, switch active mix via Project tab dropdown. Cost tab and quick summary must update to reflect the active mix.
5. **`bash check.sh`** — 0 failures in sprat/ (3 moo/ failures expected and pre-existing).
