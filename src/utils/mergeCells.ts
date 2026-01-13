import type { FlatRow } from '@/types/data';

/** 需要执行合并的 key */
export const MERGE_COLUMN_KEYS: Array<keyof FlatRow> = ['deviceSource', 'deviceModel', 'deviceBrand', 'deviceCategory', 'ewelinkSupported', 'ewelinkCapabilities'] as const;
/** 合并的 key 对应 excel 列数 */
export const MERGE_EXCEL_COLUMNS = [0, 1, 2, 3, 4, 5] as const;

const normalizeCapabilities = (list: string[]) => (list.length ? [...list].sort().join('\x1F') : '');
const MERGE_COLUMN_KEY_SET = new Set<string>(MERGE_COLUMN_KEYS);

export const isMergeColumn = (key?: string) => (key ? MERGE_COLUMN_KEY_SET.has(key) : false);

export const buildMergeKey = (row: FlatRow) =>
    MERGE_COLUMN_KEYS.map((key) => {
        if (key === 'ewelinkCapabilities') {
            return normalizeCapabilities(row.ewelinkCapabilities ?? []);
        }
        const value = row[key];
        return typeof value === 'boolean' ? String(value) : (value ?? '');
    }).join('|');

export const buildMergeSpans = (rows: FlatRow[]) => {
    const spans = new Array(rows.length).fill(1);
    let i = 0;
    while (i < rows.length) {
        const key = buildMergeKey(rows[i]!);
        let j = i + 1;
        while (j < rows.length && buildMergeKey(rows[j]!) === key) j += 1;
        spans[i] = j - i;
        for (let k = i + 1; k < j; k += 1) spans[k] = 0;
        i = j;
    }
    return spans;
};

export const buildMergeRanges = (
    rows: FlatRow[],
    startRow0: number,
    mergeColumns: readonly number[] = MERGE_EXCEL_COLUMNS
) => {
    const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
    let i = 0;
    while (i < rows.length) {
        const key = buildMergeKey(rows[i]!);
        let j = i + 1;
        while (j < rows.length && buildMergeKey(rows[j]!) === key) j += 1;
        if (j - i > 1) {
            mergeColumns.forEach((c) => {
                merges.push({
                    s: { r: startRow0 + i, c },
                    e: { r: startRow0 + j - 1, c },
                });
            });
        }
        i = j;
    }
    return merges;
};
