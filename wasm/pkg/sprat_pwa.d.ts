/* tslint:disable */
/* eslint-disable */

export function calculate_admixtures(volume_m3: number, cement_weight_kg: number, micro_fibre_dosage: number, macro_fibre_percent: number, water_reducer_dosage: number, hardener_percent: number): any;

export function calculate_all(input: any): any;

export function calculate_cement(volume_m3: number, cement_proportion: number, wet_cast_factor: number, portland_percent: number, white_percent: number, custom_percent: number, custom_density: number): any;

export function calculate_coarse_aggregates(volume_m3: number, coarse_proportion: number, wet_cast_factor: number, regular_gravel_percent: number, chip_gravel_percent: number, white_gravel_percent: number, stone_dust_percent: number, gcc400_percent: number, white_lime_percent: number, custom_percent: number, custom_density: number): any;

export function calculate_costs(portland_bags: number, white_bags: number, sand_volume_l: number, stone_dust_b_volume_l: number, gcc400_b_volume_l: number, regular_gravel_vol_m3: number, chip_gravel_vol_m3: number, white_gravel_vol_m3: number, stone_dust_c_vol_m3: number, gcc400_c_vol_m3: number, white_lime_vol_m3: number, micro_fibre_kg: number, macro_fibre_kg: number, water_reducer_kg: number, hardener_kg: number, pigment1_l: number, pigment2_l: number, pigment1_name: string, pigment2_name: string, quantity: number, wage_rate: number, pavers_per_day: number, raw_material_transport: number, prices: any): any;

export function calculate_fine_aggregates(volume_m3: number, sand_proportion: number, wet_cast_factor: number, sand_percent: number, stone_dust_percent: number, gcc400_percent: number, custom_percent: number, custom_density: number): any;

export function calculate_material_summary(portland_volume_l: number, white_volume_l: number, cement_weight_kg: number, fine_aggregates_volume_l: number, fine_aggregates_weight_kg: number, coarse_aggregates_volume_l: number, coarse_aggregates_weight_kg: number, water_volume_l: number): any;

export function calculate_pigments(cement_weight_kg: number, total_pigment_percent: number, pigment1_name: string, pigment1_parts: number, pigment2_name: string, pigment2_parts: number): any;

export function calculate_volumes(length: number, width: number, thickness: number, quantity: number, waste_factor: number): any;

export function calculate_water(cement_weight_kg: number, wc_ratio: number): any;

export function get_pigment_options(): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly calculate_admixtures: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
    readonly calculate_all: (a: any) => any;
    readonly calculate_cement: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
    readonly calculate_coarse_aggregates: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => any;
    readonly calculate_costs: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number, x: number, y: number, z: any) => any;
    readonly calculate_fine_aggregates: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => any;
    readonly calculate_material_summary: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => any;
    readonly calculate_pigments: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => any;
    readonly calculate_volumes: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly calculate_water: (a: number, b: number) => any;
    readonly get_pigment_options: () => any;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
