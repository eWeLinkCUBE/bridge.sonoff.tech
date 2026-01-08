/// <reference lib="webworker" />
import { expose } from 'comlink';
import Fuse from 'fuse.js';
import { flattenDevice } from '../utils/flatten';
import type { RawData, FlatRow, EnumFilters, EnumOption, EnumOptionMap, SortSpec, QueryInput } from '../types/data';
import { toString } from 'lodash-es';

const MAX_FUSE_QUERY_LENGTH = 40;

/** 全量数据缓存 */
let rows: FlatRow[] = [];

/** 搜索用 */
let fuse: Fuse<FlatRow> | null = null;

/** 模糊搜索涵盖的键值 */
let searchKeys: Array<keyof FlatRow> = [];

function buildFuse(keys: (keyof FlatRow)[]) {
    searchKeys = keys;
    const fuseKeys = searchKeys.map((key) => ({
        name: key,
        getFn: (row: FlatRow) => toString(row[key]),
    }));
    fuse = new Fuse(rows, {
        includeMatches: false,
        threshold: 0.0,
        ignoreLocation: true,
        useExtendedSearch: true,
        keys: fuseKeys,
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
    if (!includesAny(enums.appleSupported, row.appleSupported)) return false;
    if (!includesAny(enums.googleSupported, row.googleSupported)) return false;
    if (!includesAny(enums.smartThingsSupported, row.smartThingsSupported)) return false;
    if (!includesAny(enums.alexaSupported, row.alexaSupported)) return false;
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
    async load(url: string, keys: (keyof FlatRow)[]) {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw: RawData = await res.json();
        rows = raw.flatMap((item, idx) => flattenDevice(item, idx));
        buildFuse(keys);
        return { count: rows.length };
    },

    async query(input: QueryInput): Promise<{ rows: FlatRow[]; total: number }> {
        const { q, enums, sort, page = 1, pageSize = 10 } = input || {};
        // 先处理搜索逻辑
        let base: FlatRow[];
        if (q && q.trim()) {
            const qStr = q.trim().toLowerCase();
            // 为了优化性能，当搜索字符长度大于某个长度时，使用字符串匹配（To optimize performance, use string matching when the search character length is greater than a certain length）
            const useFuse = fuse && qStr.length <= MAX_FUSE_QUERY_LENGTH;
            if (useFuse) {
                const fuseResult = fuse!.search(qStr);
                base = fuseResult.map((result) => result.item);
            } else {
                base = rows.filter((r) => {
                    return searchKeys.some((key) => {
                        const value = toString(r[key]);
                        return value.toLowerCase().includes(qStr);
                    });
                });
            }
        } else {
            base = rows;
        }

        // 再处理列筛选逻辑
        const filtered = base.filter((r) => passEnums(r, enums));
        const sorted = sort && sort.length ? sortRows(filtered, sort) : filtered;

        const total = sorted.length;
        const effectivePageSize = pageSize > 0 ? pageSize : 10;
        const maxPage = Math.max(1, Math.ceil(total / effectivePageSize));
        const currentPage = Math.min(Math.max(1, page), maxPage);
        const start = (currentPage - 1) * effectivePageSize;
        const slice = sorted.slice(start, start + effectivePageSize);
        return { rows: slice, total };
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
            appleSupported: collectArray((row) => row.appleSupported),
            googleSupported: collectArray((row) => row.googleSupported),
            smartThingsSupported: collectArray((row) => row.smartThingsSupported),
            alexaSupported: collectArray((row) => row.alexaSupported),
            homeAssistantSupported: collect((row) => row.homeAssistantSupported, true),
            homeAssistantEntities: collectArray((row) => row.homeAssistantEntities),
        };
    },
};

export type WorkerAPI = typeof api;
expose(api);
