// PaverManager — Google Apps Script Web App
// Paste this entire file into Extensions > Apps Script in your Google Sheet.
// Deploy: Deploy > New deployment > Web app
//   Execute as: Me
//   Who has access: Anyone
// Copy the deployment URL into the app's Settings > "Apps Script URL" field.
//
// Optional: set SYNC_KEY below to require a shared secret in requests.

var SYNC_KEY = ''; // Leave blank to allow any request, or set e.g. 'mySecret123'

var SHEET_PRICES    = 'Prices';
var SHEET_DENSITIES = 'Densities';
var SHEET_SUPPLIERS = 'Suppliers';
var SHEET_PRESETS   = 'MixPresets';
var SHEET_PO        = 'POHistory';
var SHEET_INV       = 'InventoryLog';

// ─── Default data ────────────────────────────────────────────────────────────

var DEFAULT_PRICES = [
  ['material_key','display_name','price','unit'],
  ['portland_bag','Portland Cement',1750,'JMD/bag'],
  ['white_bag','White Cement',3810,'JMD/bag'],
  ['sand','Sand',5000,'JMD/yd3'],
  ['stone_dust','Stone Dust',1800,'JMD/yd3'],
  ['gcc400','GCC 400',17891,'JMD/yd3'],
  ['regular_gravel','Regular Gravel 3/4"',4000,'JMD/yd3'],
  ['chip_gravel','Chip Gravel 3/8"',4000,'JMD/yd3'],
  ['white_gravel','White Gravel',1600,'JMD/yd3'],
  ['white_lime','White Lime',55,'JMD/yd3'],
  ['micro_fibre','Micro Fibre',1622.6,'JMD/kg'],
  ['macro_fibre','Macro Fibre',2200,'JMD/kg'],
  ['water_reducer','Water Reducer',1378.34,'JMD/kg'],
  ['hardener','Hardener',0,'JMD/kg'],
  ['pigment_red_iron_oxide','Red Iron Oxide',1371.72,'JMD/L'],
  ['pigment_yellow_iron_oxide','Yellow Iron Oxide',600.54,'JMD/L'],
  ['pigment_black_iron_oxide','Black Iron Oxide',1919.34,'JMD/L'],
  ['pigment_blue','Blue Pigment',7143,'JMD/L'],
  ['pigment_green','Green Pigment',1518.57,'JMD/L'],
  ['pigment_brown','Brown Pigment',3000,'JMD/L'],
  ['pigment_white_tio2','White Titanium Dioxide',2591.32,'JMD/L'],
];

var DEFAULT_DENSITIES = [
  ['material_key','density_kg_m3','unit'],
  ['portland',1506,'kg/m3'],
  ['white_cement',1134,'kg/m3'],
  ['sand',1700,'kg/m3'],
  ['stone_dust',1500,'kg/m3'],
  ['gcc400',900,'kg/m3'],
  ['regular_gravel',1600,'kg/m3'],
  ['chip_gravel',1600,'kg/m3'],
  ['white_gravel',1600,'kg/m3'],
  ['white_lime',500,'kg/m3'],
  ['water_reducer',1080,'kg/m3'],
  ['hardener',1050,'kg/m3'],
  ['macro_fibre',910,'kg/m3'],
  ['pigment_generic',1037,'kg/m3'],
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function checkKey(params) {
  if (!SYNC_KEY) return true; // no key required
  return params.key === SYNC_KEY;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function sheetToObjects(sh) {
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}

// ─── Setup: create tabs with defaults ────────────────────────────────────────

function runSetup(ss) {
  // Prices
  var ps = ss.getSheetByName(SHEET_PRICES);
  if (!ps) {
    ps = ss.insertSheet(SHEET_PRICES);
    DEFAULT_PRICES.forEach(function(row) { ps.appendRow(row); });
  }
  // Densities
  var ds = ss.getSheetByName(SHEET_DENSITIES);
  if (!ds) {
    ds = ss.insertSheet(SHEET_DENSITIES);
    DEFAULT_DENSITIES.forEach(function(row) { ds.appendRow(row); });
  }
  // Suppliers
  getOrCreateSheet(ss, SHEET_SUPPLIERS, ['id','name','contact_name','phone','email','address','notes','materials_json','updated_at']);
  // Mix Presets
  getOrCreateSheet(ss, SHEET_PRESETS, ['preset_name','created_date','mixes_json','active_mix']);
  // PO History
  getOrCreateSheet(ss, SHEET_PO, ['po_number','date','supplier_name','supplier_id','status','items_json','subtotal','tax','total','notes']);
  // Inventory Log
  getOrCreateSheet(ss, SHEET_INV, ['timestamp','snapshot_json','action']);
  return { ok: true, message: 'Setup complete' };
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

function runPull(ss) {
  var result = { ok: true, ts: new Date().toISOString() };

  var pricesSheet = ss.getSheetByName(SHEET_PRICES);
  result.prices = pricesSheet ? sheetToObjects(pricesSheet) : [];

  var densitiesSheet = ss.getSheetByName(SHEET_DENSITIES);
  result.densities = densitiesSheet ? sheetToObjects(densitiesSheet) : [];

  var suppliersSheet = ss.getSheetByName(SHEET_SUPPLIERS);
  if (suppliersSheet) {
    result.suppliers = sheetToObjects(suppliersSheet).map(function(s) {
      try { s.materials = JSON.parse(s.materials_json || '[]'); } catch(_) { s.materials = []; }
      delete s.materials_json;
      return s;
    });
  } else {
    result.suppliers = [];
  }

  var presetsSheet = ss.getSheetByName(SHEET_PRESETS);
  if (presetsSheet) {
    result.mix_presets = sheetToObjects(presetsSheet).map(function(p) {
      try { p.mixes = JSON.parse(p.mixes_json || '[]'); } catch(_) { p.mixes = []; }
      delete p.mixes_json;
      return p;
    });
  } else {
    result.mix_presets = [];
  }

  return result;
}

// ─── Push ─────────────────────────────────────────────────────────────────────

function runPush(ss, body) {
  var written = {};

  // Suppliers: upsert by id
  if (body.suppliers && body.suppliers.length) {
    var sh = getOrCreateSheet(ss, SHEET_SUPPLIERS, ['id','name','contact_name','phone','email','address','notes','materials_json','updated_at']);
    var existing = sh.getDataRange().getValues();
    var idCol = 0; // 'id' is column A
    var idMap = {};
    for (var i = 1; i < existing.length; i++) {
      idMap[existing[i][idCol]] = i + 1; // 1-based row
    }
    var count = 0;
    body.suppliers.forEach(function(s) {
      var row = [
        s.id || '', s.name || '', s.contact_name || '', s.phone || '',
        s.email || '', s.address || '', s.notes || '',
        JSON.stringify(s.materials || []),
        s.updated_at || new Date().toISOString()
      ];
      if (idMap[s.id]) {
        sh.getRange(idMap[s.id], 1, 1, row.length).setValues([row]);
      } else {
        sh.appendRow(row);
      }
      count++;
    });
    written.suppliers = count;
  }

  // PO History: append, skip existing po_number
  if (body.po_history && body.po_history.length) {
    var poSheet = getOrCreateSheet(ss, SHEET_PO, ['po_number','date','supplier_name','supplier_id','status','items_json','subtotal','tax','total','notes']);
    var existingPOs = poSheet.getDataRange().getValues();
    var existingNums = {};
    for (var pi = 1; pi < existingPOs.length; pi++) {
      existingNums[existingPOs[pi][0]] = true;
    }
    var poCount = 0;
    body.po_history.forEach(function(po) {
      if (!existingNums[po.po_number]) {
        var groups = po.groups || [];
        var firstGroup = groups[0] || {};
        var sup = firstGroup.supplier || {};
        poSheet.appendRow([
          po.po_number || '',
          po.date || '',
          sup.name || '',
          sup.id || '',
          po.status || 'Draft',
          JSON.stringify(groups),
          po.subtotal || 0,
          po.tax || 0,
          po.total || 0,
          po.notes || ''
        ]);
        poCount++;
      }
    });
    written.po_history = poCount;
  }

  // Inventory Log: append snapshot
  if (body.inventory) {
    var invSheet = getOrCreateSheet(ss, SHEET_INV, ['timestamp','snapshot_json','action']);
    invSheet.appendRow([new Date().toISOString(), JSON.stringify(body.inventory), body.inventory_action || 'snapshot']);
    written.inventory = 1;
  }

  // Prices: update matching rows
  if (body.prices && body.prices.length) {
    var prSheet = ss.getSheetByName(SHEET_PRICES);
    if (prSheet) {
      var prData = prSheet.getDataRange().getValues();
      var prMap = {};
      for (var pri = 1; pri < prData.length; pri++) {
        prMap[prData[pri][0]] = pri + 1;
      }
      var prCount = 0;
      body.prices.forEach(function(p) {
        if (prMap[p.material_key]) {
          prSheet.getRange(prMap[p.material_key], 3).setValue(p.price);
          prCount++;
        }
      });
      written.prices = prCount;
    }
  }

  return { ok: true, written: written };
}

// ─── Entry points ─────────────────────────────────────────────────────────────

function doGet(e) {
  var params = e.parameter || {};
  if (!checkKey(params)) return jsonResponse({ ok: false, error: 'Unauthorized' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = params.action || 'pull';

  try {
    if (action === 'setup') return jsonResponse(runSetup(ss));
    if (action === 'pull')  return jsonResponse(runPull(ss));
    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch(err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (SYNC_KEY && body.key !== SYNC_KEY) return jsonResponse({ ok: false, error: 'Unauthorized' });
    if (body.action !== 'push') return jsonResponse({ ok: false, error: 'Unknown action' });
    return jsonResponse(runPush(ss, body));
  } catch(err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}
