import type { FlatRow } from '../types/data';

const compareString = (a?: string, b?: string): number => {
    if (a === b) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    return a < b ? -1 : 1;
};

const compareStringArray = (a: string[] = [], b: string[] = []): number => {
    if (a.length !== b.length) return a.length - b.length;
    for (let i = 0; i < a.length; i += 1) {
        const result = compareString(a[i], b[i]);
        if (result !== 0) return result;
    }
    return 0;
};

export const sortByDeviceInfoGroup = (rows: FlatRow[]): FlatRow[] =>
    rows.slice().sort((a, b) => {
        const modelCmp = compareString(a.deviceModel, b.deviceModel);
        if (modelCmp !== 0) return modelCmp;
        const brandCmp = compareString(a.deviceBrand, b.deviceBrand);
        if (brandCmp !== 0) return brandCmp;
        const categoryCmp = compareString(a.deviceCategory, b.deviceCategory);
        if (categoryCmp !== 0) return categoryCmp;
        const capsCmp = compareStringArray(a.ewelinkCapabilities, b.ewelinkCapabilities);
        if (capsCmp !== 0) return capsCmp;
        return compareString(a.rowId, b.rowId);
    });

const isSameDeviceInfoGroup = (a: FlatRow, b: FlatRow): boolean => {
    if (a.deviceModel !== b.deviceModel) return false;
    if (a.deviceBrand !== b.deviceBrand) return false;
    if (a.deviceCategory !== b.deviceCategory) return false;
    const capsA = a.ewelinkCapabilities ?? [];
    const capsB = b.ewelinkCapabilities ?? [];
    if (capsA.length !== capsB.length) return false;
    for (let i = 0; i < capsA.length; i += 1) {
        if (capsA[i] !== capsB[i]) return false;
    }
    return true;
};

export const applyDeviceInfoRowSpan = (rows: FlatRow[]): void => {
    let cursor = 0;
    while (cursor < rows.length) {
        const head = rows[cursor]!;
        let span = 1;
        while (cursor + span < rows.length && isSameDeviceInfoGroup(head, rows[cursor + span]!)) {
            span += 1;
        }
        head.deviceInfoRowSpan = span;
        for (let offset = 1; offset < span; offset += 1) {
            rows[cursor + offset]!.deviceInfoRowSpan = 0;
        }
        cursor += span;
    }
};

export const prepareRowsForDeviceInfoMerge = (rows: FlatRow[], hasCustomSort: boolean): FlatRow[] => {
    const ordered = hasCustomSort ? rows.slice() : sortByDeviceInfoGroup(rows);
    const cloned = ordered.map((row) => ({ ...row }));
    applyDeviceInfoRowSpan(cloned);
    return cloned;
};
