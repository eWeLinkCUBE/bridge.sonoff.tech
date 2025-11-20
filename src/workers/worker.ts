/// <reference lib="webworker" />
import { expose } from 'comlink';
import Fuse from 'fuse.js';
import { flattenDevice } from '../utils/flatten';
import type { RawData, FlatRow } from '../types/data';
import { prepareRowsForDeviceInfoMerge } from '../utils/deviceInfoGrouping';

/** 每个列的筛选值 */
export interface EnumFilters {
    deviceModel?: string[];
    deviceType?: string[];
    brand?: string[];
    category?: string[];
    ewelinkSupported?: boolean[];
    ewelinkCapabilities?: string[];
    matterSupported?: boolean[];
    matterDeviceType?: string[];
    matterProtocolVersion?: string[];
    matterSupportedClusters?: string[];
    homeAssistantSupported?: boolean[];
    homeAssistantEntities?: string[];
}

/** 每个筛选值的内容以及数量 */
export interface EnumOption {
    value: string;
    count: number;
}

/** 每个筛选值 */
export type EnumOptionMap = {
    deviceModel: EnumOption[];
    deviceType: EnumOption[];
    brand: EnumOption[];
    category: EnumOption[];
    ewelinkSupported: EnumOption[];
    ewelinkCapabilities: EnumOption[];
    matterSupported: EnumOption[];
    matterDeviceType: EnumOption[];
    matterProtocolVersion: EnumOption[];
    matterSupportedClusters: EnumOption[];
    homeAssistantSupported: EnumOption[];
    homeAssistantEntities: EnumOption[];
};

export interface SortSpec {
    id: keyof FlatRow;
    desc?: boolean;
}

export interface QueryInput {
    q?: string;
    enums?: EnumFilters;
    sort?: SortSpec[];
}

const SEARCH_KEYS = ['searchText'] as const;

let rows: FlatRow[] = [];
let fuse: Fuse<FlatRow> | null = null;

function buildFuse() {
    const fuseKeys = SEARCH_KEYS.map((key) => ({
        name: key,
        getFn: (row: FlatRow) => row[key],
    }));
    fuse = new Fuse(rows, {
        includeMatches: true,
        threshold: 0.3,
        ignoreLocation: true,
        keys: fuseKeys as any,
    });
}

function passEnums(row: FlatRow, enums?: EnumFilters): boolean {
    if (!enums) return true;
    const includes = (selected?: string[], value?: string) => {
        if (!selected || selected.length === 0) return true;
        if (!value) return false;
        return selected.includes(value);
    };
    const includesAny = (selected?: string[], values?: string[]) => {
        if (!selected || selected.length === 0) return true;
        if (!values || values.length === 0) return false;
        return selected.some((val) => values.includes(val));
    };
    if (!includes(enums.deviceModel, row.deviceModel)) return false;
    if (!includes(enums.deviceType, row.deviceType)) return false;
    if (!includes(enums.brand, row.deviceBrand)) return false;
    if (!includes(enums.category, row.deviceCategory)) return false;
    if (enums.ewelinkSupported?.length) {
        if (!enums.ewelinkSupported.includes(row.ewelinkSupported)) return false;
    }
    if (!includesAny(enums.ewelinkCapabilities, row.ewelinkCapabilities)) return false;
    if (enums.matterSupported?.length) {
        if (!enums.matterSupported.includes(row.matterSupported)) return false;
    }
    if (!includes(enums.matterDeviceType, row.matterDeviceType)) return false;
    if (!includes(enums.matterProtocolVersion, row.matterProtocolVersion)) return false;
    if (!includesAny(enums.matterSupportedClusters, row.matterSupportedClusters)) return false;
    if (enums.homeAssistantSupported?.length) {
        if (!enums.homeAssistantSupported.includes(row.homeAssistantSupported)) return false;
    }
    if (!includesAny(enums.homeAssistantEntities, row.homeAssistantEntities)) return false;
    return true;
}

function sortRows(data: FlatRow[], sort?: SortSpec[]): FlatRow[] {
    if (!sort || sort.length === 0) return data;
    const specs = sort.slice();
    return data.slice().sort((a, b) => {
        for (const spec of specs) {
            const av = a[spec.id];
            const bv = b[spec.id];
            if (av == null && bv == null) continue;
            if (av == null) return spec.desc ? 1 : -1;
            if (bv == null) return spec.desc ? -1 : 1;
            if (av < bv) return spec.desc ? 1 : -1;
            if (av > bv) return spec.desc ? -1 : 1;
        }
        return 0;
    });
}

const api = {
    async load(url: string) {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw: RawData = await res.json();
        rows = raw.flatMap((item, idx) => flattenDevice(item, idx));
        buildFuse();
        return { count: rows.length };
    },

    async query(input: QueryInput): Promise<{ rows: FlatRow[]; total: number }> {
        const { q, enums, sort } = input || {};
        let base: FlatRow[];
        if (q && q.trim()) {
            const qStr = q.trim().toLowerCase();
            const fuseResult = fuse!.search(qStr);
            const prelim = fuseResult.map((result) => result.item);
            base = prelim.filter((r) =>
                SEARCH_KEYS.some((key) => {
                    const value = r[key];
                    return typeof value === 'string' && value.toLowerCase().includes(qStr);
                })
            );
        } else {
            base = rows;
        }
        const filtered = base.filter((r) => passEnums(r, enums));
        const sorted = sortRows(filtered, sort);
        const rowsWithSpan = prepareRowsForDeviceInfoMerge(sorted, Boolean(sort?.length));
        return { rows: rowsWithSpan, total: rowsWithSpan.length };
    },

    async distinct(): Promise<EnumOptionMap> {
        const optionFromValue = (map: Map<string, number>): EnumOption[] =>
            Array.from(map.entries())
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count);

        const collect = (getter: (row: FlatRow) => string | boolean | undefined, booleanType = false) => {
            const counter = new Map<string, number>();
            rows.forEach((row) => {
                const value = getter(row);
                if (value === undefined) return;
                const key = booleanType ? String(value) : String(value);
                counter.set(key, (counter.get(key) ?? 0) + 1);
            });
            return optionFromValue(counter);
        };

        const collectArray = (getter: (row: FlatRow) => string[]) => {
            const counter = new Map<string, number>();
            rows.forEach((row) => {
                getter(row).forEach((item) => {
                    counter.set(item, (counter.get(item) ?? 0) + 1);
                });
            });
            return optionFromValue(counter);
        };

        return {
            deviceModel: collect((row) => row.deviceModel),
            deviceType: collect((row) => row.deviceType),
            brand: collect((row) => row.deviceBrand),
            category: collect((row) => row.deviceCategory),
            ewelinkSupported: collect((row) => row.ewelinkSupported, true),
            ewelinkCapabilities: collectArray((row) => row.ewelinkCapabilities),
            matterSupported: collect((row) => row.matterSupported, true),
            matterDeviceType: collect((row) => row.matterDeviceType),
            matterProtocolVersion: collect((row) => row.matterProtocolVersion),
            matterSupportedClusters: collectArray((row) => row.matterSupportedClusters),
            homeAssistantSupported: collect((row) => row.homeAssistantSupported, true),
            homeAssistantEntities: collectArray((row) => row.homeAssistantEntities),
        };
    },
};

export type WorkerAPI = typeof api;
expose(api);
