/// <reference lib="webworker" />
import { expose } from 'comlink';
import Fuse from 'fuse.js';
import { flattenDevice } from '../utils/flatten';
import type { RawData, FlatRow, EnumFilters, EnumOption, EnumOptionMap, SortSpec, QueryInput } from '../types/data';
import { buildExcelBufferByTemplate } from './export';
import { toString } from 'lodash-es';

const MAX_FUSE_QUERY_LENGTH = 40;

/** 全量数据缓存 */
let rows: FlatRow[] = [];

/** 搜索 */
let fuse: Fuse<FlatRow> | null = null;

/** 数据更新时间 */
let updateTime: number = 0;

/** 模糊搜索涵盖的键*/
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

function filterBySearch(q?: string) {
    if (!q || !q.trim()) return rows;
    const qStr = q.trim().toLowerCase();
    const useFuse = fuse && qStr.length <= MAX_FUSE_QUERY_LENGTH;
    if (useFuse) {
        const fuseResult = fuse!.search(qStr);
        return fuseResult.map((result) => result.item);
    }
    return rows.filter((r) => {
        return searchKeys.some((key) => {
            const value = toString(r[key]);
            return value.toLowerCase().includes(qStr);
        });
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
    if (!includes(enums.deviceSource, row.deviceSource)) return false;
    if (!includes(enums.deviceBrand, row.deviceBrand)) return false;
    if (!includes(enums.deviceCategory, row.deviceCategory)) return false;
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
        const { updateTime: _updateTime, supportDevices } = raw;
        updateTime = _updateTime;
        rows = supportDevices.flatMap((item, idx) => flattenDevice(item, idx));
        buildFuse(keys);
        return { count: rows.length };
    },

    async query(input: QueryInput): Promise<{ rows: FlatRow[]; total: number; updateTime: number }> {
        const { q, enums, sort, page = 1, pageSize = 10 } = input || {};
        // 先处理搜索逻辑
        const base = filterBySearch(q);

        // 再处理列筛选逻辑
        const filtered = base.filter((r) => passEnums(r, enums));
        const sorted = sort && sort.length ? sortRows(filtered, sort) : filtered;

        const total = sorted.length;
        const effectivePageSize = pageSize > 0 ? pageSize : 10;
        const maxPage = Math.max(1, Math.ceil(total / effectivePageSize));
        const currentPage = Math.min(Math.max(1, page), maxPage);
        const start = (currentPage - 1) * effectivePageSize;
        const slice = sorted.slice(start, start + effectivePageSize);
        return { rows: slice, total, updateTime };
    },

    async distinct(input?: Pick<QueryInput, 'q' | 'enums'>): Promise<EnumOptionMap> {
        const optionFromValue = (map: Map<string, number>): EnumOption[] =>
            Array.from(map.entries())
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count);

        const collect = (data: FlatRow[], getter: (row: FlatRow) => string | boolean | undefined) => {
            const counter = new Map<string, number>();
            data.forEach((row) => {
                const value = getter(row);
                if (value === undefined) return;
                const key = String(value);
                counter.set(key, (counter.get(key) ?? 0) + 1);
            });
            return optionFromValue(counter);
        };

        const collectArray = (data: FlatRow[], getter: (row: FlatRow) => string[]) => {
            const counter = new Map<string, number>();
            data.forEach((row) => {
                getter(row).forEach((item) => {
                    counter.set(item, (counter.get(item) ?? 0) + 1);
                });
            });
            return optionFromValue(counter);
        };

        const { q, enums } = input || {};
        const base = filterBySearch(q);
        const withoutKey = (key: keyof EnumFilters) => {
            if (!enums) return;
            const { [key]: _omit, ...rest } = enums as Record<string, unknown>;
            return rest as EnumFilters;
        };
        const byOtherFilters = (key: keyof EnumFilters) => {
            const active = withoutKey(key);
            if (!active) return base;
            return base.filter((row) => passEnums(row, active));
        };

        return {
            deviceModel: collect(byOtherFilters('deviceModel'), (row) => row.deviceModel),
            deviceSource: collect(byOtherFilters('deviceSource'), (row) => row.deviceSource),
            deviceBrand: collect(byOtherFilters('deviceBrand'), (row) => row.deviceBrand),
            deviceCategory: collect(byOtherFilters('deviceCategory'), (row) => row.deviceCategory),
            ewelinkSupported: collect(byOtherFilters('ewelinkSupported'), (row) => row.ewelinkSupported),
            ewelinkCapabilities: collectArray(byOtherFilters('ewelinkCapabilities'), (row) => row.ewelinkCapabilities),
            matterSupported: collect(byOtherFilters('matterSupported'), (row) => row.matterSupported),
            matterDeviceType: collect(byOtherFilters('matterDeviceType'), (row) => row.matterDeviceType),
            matterProtocolVersion: collect(byOtherFilters('matterProtocolVersion'), (row) => row.matterProtocolVersion),
            matterSupportedClusters: collectArray(byOtherFilters('matterSupportedClusters'), (row) => row.matterSupportedClusters),
            appleSupported: collectArray(byOtherFilters('appleSupported'), (row) => row.appleSupported),
            googleSupported: collectArray(byOtherFilters('googleSupported'), (row) => row.googleSupported),
            smartThingsSupported: collectArray(byOtherFilters('smartThingsSupported'), (row) => row.smartThingsSupported),
            alexaSupported: collectArray(byOtherFilters('alexaSupported'), (row) => row.alexaSupported),
            homeAssistantSupported: collect(byOtherFilters('homeAssistantSupported'), (row) => row.homeAssistantSupported),
            homeAssistantEntities: collectArray(byOtherFilters('homeAssistantEntities'), (row) => row.homeAssistantEntities),
        };
    },
    /** 生成导出文件�?Buffer */
    async buildExcelBuf() {
        return await buildExcelBufferByTemplate(rows);
    },
};

export type WorkerAPI = typeof api;
expose(api);

