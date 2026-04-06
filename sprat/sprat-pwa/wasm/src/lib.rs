use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{to_value, from_value};

// Configuration constants
const PORTLAND_DENSITY: f64 = 1506.0; // kg/m³
const WHITE_CEMENT_DENSITY: f64 = 1134.0; // kg/m³
const SAND_DENSITY: f64 = 1700.0; // kg/m³
const REGULAR_GRAVEL_DENSITY: f64 = 1600.0; // kg/m³
const CHIP_GRAVEL_DENSITY: f64 = 1600.0; // kg/m³
const WHITE_GRAVEL_DENSITY: f64 = 1600.0; // kg/m³
const STONE_DUST_DENSITY: f64 = 1500.0; // kg/m³
const GCC400_DENSITY: f64 = 900.0; // kg/m³
const WHITE_LIME_DENSITY: f64 = 500.0; // kg/m³
const WATER_DENSITY: f64 = 1000.0; // kg/m³

// Conversion factors
const INCH_TO_ML: f64 = 16.387;
const FT_TO_ML: f64 = 28316.8;
const YD_TO_FT: f64 = 27.0;
const M_TO_FT: f64 = 35.3147;
const M_TO_YD: f64 = 1.30795;
const KG_TO_LB: f64 = 2.20462;
const L_TO_GAL: f64 = 0.264172;
const PORTLAND_BAG_LB: f64 = 94.0;
const WHITE_BAG_LB: f64 = 88.0;

// Admixture densities
const MICRO_FIBRE_DENSITY: f64 = 0.91;
const MACRO_FIBRE_DENSITY: f64 = 0.91;
const WATER_REDUCER_DENSITY: f64 = 1.08;
const HARDENER_DENSITY: f64 = 1.05;

// Pigment data
#[derive(Debug, Clone)]
struct Pigment {
    density: f64,
    price: f64,
}

const PIGMENTS: &[(&str, Pigment)] = &[
    ("Red Iron Oxide", Pigment { density: 1.037, price: 1371.72 }),
    ("Yellow Iron Oxide", Pigment { density: 0.454, price: 600.54 }),
    ("Black Iron Oxide", Pigment { density: 1.451, price: 1919.34 }),
    ("Blue Pigment", Pigment { density: 1.08, price: 7143.0 }),
    ("Green Pigment", Pigment { density: 1.148, price: 1518.57 }),
    ("Brown Pigment", Pigment { density: 1.09, price: 3000.0 }),
    ("White Titanium Dioxide", Pigment { density: 1.037, price: 2591.32 }),
    ("None", Pigment { density: 1.0, price: 0.0 }),
];

// Input structures
#[derive(Debug, Deserialize)]
pub struct ProjectInput {
    pub length: f64,
    pub width: f64,
    pub thickness: f64,
    pub quantity: f64,
    pub waste_factor: f64,
    pub pavers_per_day: f64,
    pub wage_rate: f64,
    pub raw_material_transport: f64,
}

#[derive(Debug, Deserialize)]
pub struct MixPartsInput {
    pub cement: f64,
    pub sand: f64,
    pub coarse_agg: f64,
}

#[derive(Debug, Deserialize)]
pub struct AdditionAInput {
    pub portland: f64,
    pub white: f64,
    pub custom: f64,
    pub custom_density: f64,
}

#[derive(Debug, Deserialize)]
pub struct AdditionBInput {
    pub sand: f64,
    pub stone_dust: f64,
    pub gcc400: f64,
    pub custom: f64,
    pub custom_density: f64,
}

#[derive(Debug, Deserialize)]
pub struct AdditionCInput {
    pub regular_gravel: f64,
    pub chip_gravel: f64,
    pub white_gravel: f64,
    pub stone_dust: f64,
    pub gcc400: f64,
    pub white_lime: f64,
    pub custom: f64,
    pub custom_density: f64,
}

#[derive(Debug, Deserialize)]
pub struct WaterInput {
    pub wc_ratio: f64,
    pub wet_cast_factor: f64,
}

#[derive(Debug, Deserialize)]
pub struct AdmixturesInput {
    pub micro_fibre: f64,    // g/L of concrete mix
    pub macro_fibre: f64,    // % of cement
    pub water_reducer: f64,  // mL/kg of cement
    pub hardener: f64,       // % of cement
}

#[derive(Debug, Deserialize)]
pub struct PigmentsInput {
    pub total_percent: f64,
    pub pigment1_name: String,
    pub pigment1_parts: f64,
    pub pigment2_name: String,
    pub pigment2_parts: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PricesInput {
    pub portland_bag: f64,
    pub white_bag: f64,
    pub sand: f64,
    pub regular_gravel: f64,
    pub chip_gravel: f64,
    pub white_gravel: f64,
    pub stone_dust: f64,
    pub gcc400: f64,
    pub white_lime: f64,
    pub micro_fibre: f64,
    pub macro_fibre: f64,
    pub water_reducer: f64,
    pub hardener: f64,
}

#[derive(Debug, Deserialize)]
pub struct CalculatorInput {
    pub project: ProjectInput,
    pub mix_parts: MixPartsInput,
    pub addition_a: AdditionAInput,
    pub addition_b: AdditionBInput,
    pub addition_c: AdditionCInput,
    pub water: WaterInput,
    pub admixtures: AdmixturesInput,
    pub pigments: PigmentsInput,
    pub prices: PricesInput,
}

// Output structures
#[derive(Debug, Serialize, Deserialize)]
pub struct VolumeResults {
    pub volume_per_paver: f64,
    pub total_volume_in3: f64,
    pub total_volume_ml: f64,
    pub adjusted_volume_ml: f64,
    pub volume_l: f64,
    pub volume_m3: f64,
    pub volume_ft3: f64,
    pub volume_yd3: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CementResults {
    pub blended_cement_density: f64,
    pub base_cement_weight_kg: f64,
    pub portland_weight_kg: f64,
    pub portland_volume_l: f64,
    pub portland_bags: f64,
    pub white_weight_kg: f64,
    pub white_volume_l: f64,
    pub white_bags: f64,
    pub custom_cement_kg: f64,
    pub custom_cement_l: f64,
    pub cement_weight_kg: f64,
    pub cement_volume_l: f64,
    pub cement_weight_lbs: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WaterResults {
    pub water_weight_kg: f64,
    pub water_volume_l: f64,
    pub water_gallons: f64,
    pub water_80_l: f64,
    pub water_20_l: f64,
    pub water_80_gallons: f64,
    pub water_20_gallons: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FineAggregatesResults {
    pub add_b_volume_l: f64,
    pub add_b_volume_m3: f64,
    pub sand_volume_l: f64,
    pub sand_weight_kg: f64,
    pub stone_dust_b_volume_l: f64,
    pub stone_dust_b_weight_kg: f64,
    pub gcc400_b_volume_l: f64,
    pub gcc400_b_volume_yd3: f64,
    pub gcc400_b_weight_kg: f64,
    pub custom_b_volume_l: f64,
    pub custom_b_weight_kg: f64,
    pub total_add_b_weight_kg: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CoarseAggregatesResults {
    pub add_c_volume_l: f64,
    pub add_c_volume_m3: f64,
    pub add_c_volume_yd3: f64,
    pub regular_gravel_c_vol_m3: f64,
    pub regular_gravel_c_vol_l: f64,
    pub regular_gravel_c_weight_kg: f64,
    pub chip_gravel_c_vol_m3: f64,
    pub chip_gravel_c_vol_l: f64,
    pub chip_gravel_c_weight_kg: f64,
    pub white_gravel_c_vol_m3: f64,
    pub white_gravel_c_vol_l: f64,
    pub white_gravel_c_weight_kg: f64,
    pub stone_dust_c_vol_m3: f64,
    pub stone_dust_c_vol_l: f64,
    pub stone_dust_c_weight_kg: f64,
    pub gcc400_c_vol_m3: f64,
    pub gcc400_c_vol_l: f64,
    pub gcc400_c_weight_kg: f64,
    pub white_lime_c_vol_m3: f64,
    pub white_lime_c_vol_l: f64,
    pub white_lime_c_weight_kg: f64,
    pub custom_c_vol_m3: f64,
    pub custom_c_vol_l: f64,
    pub custom_c_weight_kg: f64,
    pub total_add_c_weight_kg: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdmixturesResults {
    pub micro_fibre_kg: f64,
    pub micro_fibre_g: f64,
    pub macro_fibre_kg: f64,
    pub macro_fibre_ml: f64,
    pub water_reducer_ml: f64,
    pub water_reducer_kg: f64,
    pub hardener_kg: f64,
    pub hardener_ml: f64,
    pub water_mixer_ml: f64,
    pub total_mixer_volume_ml: f64,
    pub total_mixer_volume_l: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PigmentsResults {
    pub total_pigment_kg: f64,
    pub pigment1_kg: f64,
    pub pigment1_ml: f64,
    pub pigment1_l: f64,
    pub pigment2_kg: f64,
    pub pigment2_ml: f64,
    pub pigment2_l: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CostResults {
    pub portland_cost: f64,
    pub white_cost: f64,
    pub sand_cost: f64,
    pub stone_dust_b_cost: f64,
    pub gcc400_b_cost: f64,
    pub add_b_cost: f64,
    pub regular_gravel_cost: f64,
    pub chip_gravel_cost: f64,
    pub white_gravel_cost: f64,
    pub stone_dust_c_cost: f64,
    pub gcc400_c_cost: f64,
    pub white_lime_cost: f64,
    pub add_c_cost: f64,
    pub micro_fibre_cost: f64,
    pub macro_fibre_cost: f64,
    pub water_reducer_cost: f64,
    pub hardener_cost: f64,
    pub pigment1_cost: f64,
    pub pigment2_cost: f64,
    pub total_material_cost: f64,
    pub material_cost_per_paver: f64,
    pub labour_cost_per_paver: f64,
    pub transport_cost_per_paver: f64,
    pub total_cost_per_paver: f64,
    pub grand_total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MaterialSummary {
    pub portland_volume_l: f64,
    pub white_volume_l: f64,
    pub total_cement_kg: f64,
    pub fine_aggregates_l: f64,
    pub coarse_aggregates_l: f64,
    pub water_volume_l: f64,
    pub total_concrete_kg: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AllResults {
    pub volumes: VolumeResults,
    pub cement: CementResults,
    pub water: WaterResults,
    pub fine_aggregates: FineAggregatesResults,
    pub coarse_aggregates: CoarseAggregatesResults,
    pub admixtures: AdmixturesResults,
    pub pigments: PigmentsResults,
    pub costs: CostResults,
    pub material_summary: MaterialSummary,
}

// Helper function to get pigment by name
fn get_pigment(name: &str) -> Pigment {
    PIGMENTS.iter()
        .find(|&&(n, _)| n == name)
        .map(|(_, pigment)| pigment.clone())
        .unwrap_or(Pigment { density: 1.0, price: 0.0 })
}

// Helper function to calculate aggregate results
fn calculate_aggregate(percent: f64, density: f64, add_c_volume_m3: f64) -> (f64, f64, f64) {
    let vol_m3 = add_c_volume_m3 * (percent / 100.0);
    let vol_l = vol_m3 * 1000.0;
    let weight_kg = vol_m3 * density;
    (vol_m3, vol_l, weight_kg)
}

// Main calculation functions
#[wasm_bindgen]
pub fn calculate_volumes(
    length: f64,
    width: f64,
    thickness: f64,
    quantity: f64,
    waste_factor: f64,
) -> JsValue {
    let volume_per_paver = length * 12.0 * width * 12.0 * thickness;
    let total_volume_in3 = volume_per_paver * quantity;
    let total_volume_ml = total_volume_in3 * INCH_TO_ML;
    let adjusted_volume_ml = total_volume_ml * waste_factor;
    let volume_l = adjusted_volume_ml / 1000.0;
    let volume_m3 = volume_l / 1000.0;
    let volume_ft3 = adjusted_volume_ml / FT_TO_ML;
    let volume_yd3 = volume_ft3 / YD_TO_FT;

    let results = VolumeResults {
        volume_per_paver,
        total_volume_in3,
        total_volume_ml,
        adjusted_volume_ml,
        volume_l,
        volume_m3,
        volume_ft3,
        volume_yd3,
    };

    to_value(&results).unwrap()
}

#[wasm_bindgen]
pub fn calculate_cement(
    volume_m3: f64,
    cement_proportion: f64,
    wet_cast_factor: f64,
    portland_percent: f64,
    white_percent: f64,
    custom_percent: f64,
    custom_density: f64,
) -> JsValue {
    let base_cement_volume_m3 = volume_m3 * cement_proportion * wet_cast_factor;
    let base_cement_weight_kg = base_cement_volume_m3 * PORTLAND_DENSITY;

    let portland_weight_kg = base_cement_weight_kg * (portland_percent / 100.0);
    let white_weight_kg = base_cement_weight_kg * (white_percent / 100.0);
    let custom_cement_kg = base_cement_weight_kg * (custom_percent / 100.0);

    let portland_volume_l = portland_weight_kg / PORTLAND_DENSITY * 1000.0;
    let white_volume_l = white_weight_kg / WHITE_CEMENT_DENSITY * 1000.0;
    let custom_cement_l = if custom_percent > 0.0 {
        custom_cement_kg / custom_density * 1000.0
    } else {
        0.0
    };

    let cement_weight_kg = base_cement_weight_kg;
    let cement_volume_l = portland_volume_l + white_volume_l + custom_cement_l;
    let cement_weight_lbs = cement_weight_kg * KG_TO_LB;

    let portland_bags = portland_weight_kg * KG_TO_LB / PORTLAND_BAG_LB;
    let white_bags = white_weight_kg * KG_TO_LB / WHITE_BAG_LB;

    let blended_cement_density = cement_weight_kg / (cement_volume_l / 1000.0);

    let results = CementResults {
        blended_cement_density,
        base_cement_weight_kg,
        portland_weight_kg,
        portland_volume_l,
        portland_bags,
        white_weight_kg,
        white_volume_l,
        white_bags,
        custom_cement_kg,
        custom_cement_l,
        cement_weight_kg,
        cement_volume_l,
        cement_weight_lbs,
    };

    to_value(&results).unwrap()
}

#[wasm_bindgen]
pub fn calculate_water(
    cement_weight_kg: f64,
    wc_ratio: f64,
) -> JsValue {
    let water_weight_kg = cement_weight_kg * wc_ratio;
    let water_volume_l = water_weight_kg;
    let water_gallons = water_volume_l * L_TO_GAL;

    // 80/20 split
    let water_80_l = water_volume_l * 0.8;
    let water_20_l = water_volume_l * 0.2;
    let water_80_gallons = water_80_l * L_TO_GAL;
    let water_20_gallons = water_20_l * L_TO_GAL;

    let results = WaterResults {
        water_weight_kg,
        water_volume_l,
        water_gallons,
        water_80_l,
        water_20_l,
        water_80_gallons,
        water_20_gallons,
    };

    to_value(&results).unwrap()
}

#[wasm_bindgen]
pub fn calculate_fine_aggregates(
    volume_m3: f64,
    sand_proportion: f64,
    wet_cast_factor: f64,
    sand_percent: f64,
    stone_dust_percent: f64,
    gcc400_percent: f64,
    custom_percent: f64,
    custom_density: f64,
) -> JsValue {
    let add_b_volume_m3 = volume_m3 * sand_proportion * wet_cast_factor;
    let add_b_volume_l = add_b_volume_m3 * 1000.0;

    let sand_volume_l = add_b_volume_l * (sand_percent / 100.0);
    let sand_weight_kg = sand_volume_l * SAND_DENSITY / 1000.0;

    let stone_dust_b_volume_l = add_b_volume_l * (stone_dust_percent / 100.0);
    let stone_dust_b_weight_kg = stone_dust_b_volume_l * STONE_DUST_DENSITY / 1000.0;

    let gcc400_b_volume_l = add_b_volume_l * (gcc400_percent / 100.0);
    let gcc400_b_volume_yd3 = gcc400_b_volume_l / 1000.0 * M_TO_YD;
    let gcc400_b_weight_kg = gcc400_b_volume_l * GCC400_DENSITY / 1000.0;

    let custom_b_volume_l = add_b_volume_l * (custom_percent / 100.0);
    let custom_b_weight_kg = custom_b_volume_l * custom_density / 1000.0;

    let total_add_b_weight_kg = sand_weight_kg + stone_dust_b_weight_kg + gcc400_b_weight_kg + custom_b_weight_kg;

    let results = FineAggregatesResults {
        add_b_volume_l,
        add_b_volume_m3,
        sand_volume_l,
        sand_weight_kg,
        stone_dust_b_volume_l,
        stone_dust_b_weight_kg,
        gcc400_b_volume_l,
        gcc400_b_volume_yd3,
        gcc400_b_weight_kg,
        custom_b_volume_l,
        custom_b_weight_kg,
        total_add_b_weight_kg,
    };

    to_value(&results).unwrap()
}

#[wasm_bindgen]
pub fn calculate_coarse_aggregates(
    volume_m3: f64,
    coarse_proportion: f64,
    wet_cast_factor: f64,
    regular_gravel_percent: f64,
    chip_gravel_percent: f64,
    white_gravel_percent: f64,
    stone_dust_percent: f64,
    gcc400_percent: f64,
    white_lime_percent: f64,
    custom_percent: f64,
    custom_density: f64,
) -> JsValue {
    let add_c_volume_m3 = volume_m3 * coarse_proportion * wet_cast_factor;
    let add_c_volume_l = add_c_volume_m3 * 1000.0;
    let add_c_volume_yd3 = add_c_volume_m3 * M_TO_YD;

    let (regular_gravel_c_vol_m3, regular_gravel_c_vol_l, regular_gravel_c_weight_kg) =
        calculate_aggregate(regular_gravel_percent, REGULAR_GRAVEL_DENSITY, add_c_volume_m3);
    let (chip_gravel_c_vol_m3, chip_gravel_c_vol_l, chip_gravel_c_weight_kg) =
        calculate_aggregate(chip_gravel_percent, CHIP_GRAVEL_DENSITY, add_c_volume_m3);
    let (white_gravel_c_vol_m3, white_gravel_c_vol_l, white_gravel_c_weight_kg) =
        calculate_aggregate(white_gravel_percent, WHITE_GRAVEL_DENSITY, add_c_volume_m3);
    let (stone_dust_c_vol_m3, stone_dust_c_vol_l, stone_dust_c_weight_kg) =
        calculate_aggregate(stone_dust_percent, STONE_DUST_DENSITY, add_c_volume_m3);
    let (gcc400_c_vol_m3, gcc400_c_vol_l, gcc400_c_weight_kg) =
        calculate_aggregate(gcc400_percent, GCC400_DENSITY, add_c_volume_m3);
    let (white_lime_c_vol_m3, white_lime_c_vol_l, white_lime_c_weight_kg) =
        calculate_aggregate(white_lime_percent, WHITE_LIME_DENSITY, add_c_volume_m3);
    let (custom_c_vol_m3, custom_c_vol_l, custom_c_weight_kg) =
        calculate_aggregate(custom_percent, custom_density, add_c_volume_m3);

    let total_add_c_weight_kg = regular_gravel_c_weight_kg + chip_gravel_c_weight_kg + white_gravel_c_weight_kg +
        stone_dust_c_weight_kg + gcc400_c_weight_kg + white_lime_c_weight_kg + custom_c_weight_kg;

    let results = CoarseAggregatesResults {
        add_c_volume_l,
        add_c_volume_m3,
        add_c_volume_yd3,
        regular_gravel_c_vol_m3,
        regular_gravel_c_vol_l,
        regular_gravel_c_weight_kg,
        chip_gravel_c_vol_m3,
        chip_gravel_c_vol_l,
        chip_gravel_c_weight_kg,
        white_gravel_c_vol_m3,
        white_gravel_c_vol_l,
        white_gravel_c_weight_kg,
        stone_dust_c_vol_m3,
        stone_dust_c_vol_l,
        stone_dust_c_weight_kg,
        gcc400_c_vol_m3,
        gcc400_c_vol_l,
        gcc400_c_weight_kg,
        white_lime_c_vol_m3,
        white_lime_c_vol_l,
        white_lime_c_weight_kg,
        custom_c_vol_m3,
        custom_c_vol_l,
        custom_c_weight_kg,
        total_add_c_weight_kg,
    };

    to_value(&results).unwrap()
}

#[wasm_bindgen]
pub fn calculate_admixtures(
    volume_m3: f64,
    cement_weight_kg: f64,
    micro_fibre_dosage: f64,
    macro_fibre_percent: f64,
    water_reducer_dosage: f64,
    hardener_percent: f64,
) -> JsValue {
    let micro_fibre_kg = volume_m3 * micro_fibre_dosage;
    let micro_fibre_g = micro_fibre_kg * 1000.0;

    let macro_fibre_kg = cement_weight_kg * (macro_fibre_percent / 100.0);
    let macro_fibre_ml = if macro_fibre_kg > 0.0 {
        macro_fibre_kg * 1000.0 / MACRO_FIBRE_DENSITY
    } else {
        0.0
    };

    let water_reducer_ml = cement_weight_kg * water_reducer_dosage;
    let water_reducer_kg = water_reducer_ml * WATER_REDUCER_DENSITY / 1000.0;

    let hardener_kg = cement_weight_kg * (hardener_percent / 100.0);
    let hardener_ml = if hardener_kg > 0.0 {
        hardener_kg * 1000.0 / HARDENER_DENSITY
    } else {
        0.0
    };

    let water_mixer_ml = water_reducer_ml * 5.0;
    let total_mixer_volume_ml = water_reducer_ml + water_mixer_ml;
    let total_mixer_volume_l = total_mixer_volume_ml / 1000.0;

    let results = AdmixturesResults {
        micro_fibre_kg,
        micro_fibre_g,
        macro_fibre_kg,
        macro_fibre_ml,
        water_reducer_ml,
        water_reducer_kg,
        hardener_kg,
        hardener_ml,
        water_mixer_ml,
        total_mixer_volume_ml,
        total_mixer_volume_l,
    };

    to_value(&results).unwrap()
}

#[wasm_bindgen]
pub fn calculate_pigments(
    cement_weight_kg: f64,
    total_pigment_percent: f64,
    pigment1_name: &str,
    pigment1_parts: f64,
    pigment2_name: &str,
    pigment2_parts: f64,
) -> JsValue {
    let total_pigment_kg = cement_weight_kg * (total_pigment_percent / 100.0);
    let total_pigment_parts = pigment1_parts + pigment2_parts;

    let pigment1_kg = if total_pigment_parts > 0.0 {
        total_pigment_kg * (pigment1_parts / total_pigment_parts)
    } else {
        0.0
    };

    let pigment1_density = get_pigment(pigment1_name).density;
    let pigment1_ml = if pigment1_kg > 0.0 {
        pigment1_kg * 1000.0 / pigment1_density
    } else {
        0.0
    };
    let pigment1_l = pigment1_ml / 1000.0;

    let pigment2_kg = if total_pigment_parts > 0.0 {
        total_pigment_kg * (pigment2_parts / total_pigment_parts)
    } else {
        0.0
    };

    let pigment2_density = get_pigment(pigment2_name).density;
    let pigment2_ml = if pigment2_kg > 0.0 {
        pigment2_kg * 1000.0 / pigment2_density
    } else {
        0.0
    };
    let pigment2_l = pigment2_ml / 1000.0;

    let results = PigmentsResults {
        total_pigment_kg,
        pigment1_kg,
        pigment1_ml,
        pigment1_l,
        pigment2_kg,
        pigment2_ml,
        pigment2_l,
    };

    to_value(&results).unwrap()
}

#[wasm_bindgen]
pub fn calculate_costs(
    portland_bags: f64,
    white_bags: f64,
    sand_volume_l: f64,
    stone_dust_b_volume_l: f64,
    gcc400_b_volume_l: f64,
    regular_gravel_vol_m3: f64,
    chip_gravel_vol_m3: f64,
    white_gravel_vol_m3: f64,
    stone_dust_c_vol_m3: f64,
    gcc400_c_vol_m3: f64,
    white_lime_vol_m3: f64,
    micro_fibre_kg: f64,
    macro_fibre_kg: f64,
    water_reducer_kg: f64,
    hardener_kg: f64,
    pigment1_l: f64,
    pigment2_l: f64,
    pigment1_name: &str,
    pigment2_name: &str,
    quantity: f64,
    wage_rate: f64,
    pavers_per_day: f64,
    raw_material_transport: f64,
    prices: &JsValue,
) -> JsValue {
    let prices: PricesInput = from_value(prices.clone()).unwrap();

    // Cement costs
    let portland_cost = portland_bags * prices.portland_bag;
    let white_cost = white_bags * prices.white_bag;

    // Fine aggregates costs
    let sand_cost = (sand_volume_l / 1000.0 * M_TO_YD) * prices.sand;
    let stone_dust_b_cost = (stone_dust_b_volume_l / 1000.0 * M_TO_YD) * prices.stone_dust;
    let gcc400_b_volume_yd3 = gcc400_b_volume_l / 1000.0 * M_TO_YD;
    let gcc400_b_cost = gcc400_b_volume_yd3 * prices.gcc400;
    let add_b_cost = sand_cost + stone_dust_b_cost + gcc400_b_cost;

    // Coarse aggregates costs
    let regular_gravel_cost = (regular_gravel_vol_m3 * M_TO_YD) * prices.regular_gravel;
    let chip_gravel_cost = (chip_gravel_vol_m3 * M_TO_YD) * prices.chip_gravel;
    let white_gravel_cost = (white_gravel_vol_m3 * M_TO_YD) * prices.white_gravel;
    let stone_dust_c_cost = (stone_dust_c_vol_m3 * M_TO_YD) * prices.stone_dust;
    let gcc400_c_cost = (gcc400_c_vol_m3 * M_TO_YD) * prices.gcc400;
    let white_lime_cost = (white_lime_vol_m3 * M_TO_YD) * prices.white_lime;
    let add_c_cost = regular_gravel_cost + chip_gravel_cost + white_gravel_cost + stone_dust_c_cost + gcc400_c_cost + white_lime_cost;

    // Admixture costs
    let micro_fibre_cost = micro_fibre_kg * prices.micro_fibre;
    let macro_fibre_cost = macro_fibre_kg * prices.macro_fibre;
    let water_reducer_cost = water_reducer_kg * prices.water_reducer;
    let hardener_cost = hardener_kg * prices.hardener;

    // Pigment costs
    let pigment1_price = get_pigment(pigment1_name).price;
    let pigment2_price = get_pigment(pigment2_name).price;
    let pigment1_cost = pigment1_l * pigment1_price;
    let pigment2_cost = pigment2_l * pigment2_price;

    let total_material_cost = portland_cost + white_cost + add_b_cost + add_c_cost + 
        micro_fibre_cost + macro_fibre_cost + water_reducer_cost + pigment1_cost + pigment2_cost + hardener_cost;
    
    let material_cost_per_paver = if quantity > 0.0 { total_material_cost / quantity } else { 0.0 };
    let labour_cost_per_paver = if pavers_per_day > 0.0 { wage_rate / pavers_per_day } else { 0.0 };
    let transport_cost_per_paver = if quantity > 0.0 { raw_material_transport / quantity } else { 0.0 };
    let total_cost_per_paver = material_cost_per_paver + labour_cost_per_paver + transport_cost_per_paver;
    let grand_total = total_cost_per_paver * quantity;

    let results = CostResults {
        portland_cost,
        white_cost,
        sand_cost,
        stone_dust_b_cost,
        gcc400_b_cost,
        add_b_cost,
        regular_gravel_cost,
        chip_gravel_cost,
        white_gravel_cost,
        stone_dust_c_cost,
        gcc400_c_cost,
        white_lime_cost,
        add_c_cost,
        micro_fibre_cost,
        macro_fibre_cost,
        water_reducer_cost,
        hardener_cost,
        pigment1_cost,
        pigment2_cost,
        total_material_cost,
        material_cost_per_paver,
        labour_cost_per_paver,
        transport_cost_per_paver,
        total_cost_per_paver,
        grand_total,
    };

    to_value(&results).unwrap()
}

#[wasm_bindgen]
pub fn calculate_material_summary(
    portland_volume_l: f64,
    white_volume_l: f64,
    cement_weight_kg: f64,
    fine_aggregates_volume_l: f64,
    fine_aggregates_weight_kg: f64,
    coarse_aggregates_volume_l: f64,
    coarse_aggregates_weight_kg: f64,
    water_volume_l: f64,
) -> JsValue {
    let total_concrete_kg = cement_weight_kg + fine_aggregates_weight_kg + coarse_aggregates_weight_kg + water_volume_l;

    let results = MaterialSummary {
        portland_volume_l,
        white_volume_l,
        total_cement_kg: cement_weight_kg,
        fine_aggregates_l: fine_aggregates_volume_l,
        coarse_aggregates_l: coarse_aggregates_volume_l,
        water_volume_l,
        total_concrete_kg,
    };

    to_value(&results).unwrap()
}

// Master function to calculate everything
#[wasm_bindgen]
pub fn calculate_all(input: &JsValue) -> JsValue {
    let input: CalculatorInput = from_value(input.clone()).unwrap();
    
    // Calculate volumes
    let volumes = calculate_volumes(
        input.project.length,
        input.project.width,
        input.project.thickness,
        input.project.quantity,
        input.project.waste_factor,
    );
    let volumes: VolumeResults = from_value(volumes).unwrap();

    // Calculate mix proportions
    let total_parts = input.mix_parts.cement + input.mix_parts.sand + input.mix_parts.coarse_agg;
    let cement_proportion = input.mix_parts.cement / total_parts;
    let sand_proportion = input.mix_parts.sand / total_parts;
    let coarse_proportion = input.mix_parts.coarse_agg / total_parts;

    // Calculate cement
    let cement: CementResults = from_value(calculate_cement(
        volumes.volume_m3,
        cement_proportion,
        input.water.wet_cast_factor,
        input.addition_a.portland,
        input.addition_a.white,
        input.addition_a.custom,
        input.addition_a.custom_density,
    )).unwrap();

    // Calculate water
    let water: WaterResults = from_value(calculate_water(
        cement.cement_weight_kg,
        input.water.wc_ratio,
    )).unwrap();

    // Calculate fine aggregates
    let fine_aggregates: FineAggregatesResults = from_value(calculate_fine_aggregates(
        volumes.volume_m3,
        sand_proportion,
        input.water.wet_cast_factor,
        input.addition_b.sand,
        input.addition_b.stone_dust,
        input.addition_b.gcc400,
        input.addition_b.custom,
        input.addition_b.custom_density,
    )).unwrap();

    // Calculate coarse aggregates
    let coarse_aggregates: CoarseAggregatesResults = from_value(calculate_coarse_aggregates(
        volumes.volume_m3,
        coarse_proportion,
        input.water.wet_cast_factor,
        input.addition_c.regular_gravel,
        input.addition_c.chip_gravel,
        input.addition_c.white_gravel,
        input.addition_c.stone_dust,
        input.addition_c.gcc400,
        input.addition_c.white_lime,
        input.addition_c.custom,
        input.addition_c.custom_density,
    )).unwrap();

    // Calculate admixtures
    let admixtures: AdmixturesResults = from_value(calculate_admixtures(
        volumes.volume_m3,
        cement.cement_weight_kg,
        input.admixtures.micro_fibre,
        input.admixtures.macro_fibre,
        input.admixtures.water_reducer,
        input.admixtures.hardener,
    )).unwrap();

    // Calculate pigments
    let pigments: PigmentsResults = from_value(calculate_pigments(
        cement.cement_weight_kg,
        input.pigments.total_percent,
        &input.pigments.pigment1_name,
        input.pigments.pigment1_parts,
        &input.pigments.pigment2_name,
        input.pigments.pigment2_parts,
    )).unwrap();

    // Calculate costs
    let costs: CostResults = from_value(calculate_costs(
        cement.portland_bags,
        cement.white_bags,
        fine_aggregates.sand_volume_l,
        fine_aggregates.stone_dust_b_volume_l,
        fine_aggregates.gcc400_b_volume_l,
        coarse_aggregates.regular_gravel_c_vol_m3,
        coarse_aggregates.chip_gravel_c_vol_m3,
        coarse_aggregates.white_gravel_c_vol_m3,
        coarse_aggregates.stone_dust_c_vol_m3,
        coarse_aggregates.gcc400_c_vol_m3,
        coarse_aggregates.white_lime_c_vol_m3,
        admixtures.micro_fibre_kg,
        admixtures.macro_fibre_kg,
        admixtures.water_reducer_kg,
        admixtures.hardener_kg,
        pigments.pigment1_l,
        pigments.pigment2_l,
        &input.pigments.pigment1_name,
        &input.pigments.pigment2_name,
        input.project.quantity,
        input.project.wage_rate,
        input.project.pavers_per_day,
        input.project.raw_material_transport,
        &to_value(&input.prices).unwrap(),
    )).unwrap();

    // Calculate material summary
    let material_summary: MaterialSummary = from_value(calculate_material_summary(
        cement.portland_volume_l,
        cement.white_volume_l,
        cement.cement_weight_kg,
        fine_aggregates.add_b_volume_l,
        fine_aggregates.total_add_b_weight_kg,
        coarse_aggregates.add_c_volume_l,
        coarse_aggregates.total_add_c_weight_kg,
        water.water_volume_l,
    )).unwrap();

    let results = AllResults {
        volumes,
        cement,
        water,
        fine_aggregates,
        coarse_aggregates,
        admixtures,
        pigments,
        costs,
        material_summary,
    };

    to_value(&results).unwrap()
}

#[wasm_bindgen]
pub fn get_pigment_options() -> JsValue {
    let options: Vec<&str> = PIGMENTS.iter().map(|&(name, _)| name).collect();
    to_value(&options).unwrap()
}