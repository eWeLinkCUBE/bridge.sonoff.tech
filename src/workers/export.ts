import * as XLSX from 'xlsx-js-style';
import type { FlatRow, ExportColumn } from '../types/data';
import { buildMergeRanges, isMergeColumn } from '@/utils/mergeCells';
import { PAGE_TITLE } from '@/contants';

/**
 * Build Excel buffer without template (header rows derived from columns).
 */
export async function buildExcelBufferByTemplate(rows: FlatRow[], columns: ExportColumn[]): Promise<ArrayBuffer> {
    const workbook = XLSX.utils.book_new();
    const sheetName = 'template';

    const { rows: headerRows, merges: headerMerges, leafKeys } = buildHeaderRows(columns);
    const titleRow = [PAGE_TITLE, ...new Array(Math.max(leafKeys.length - 1, 0)).fill('')];
    const allHeaderRows = [titleRow, ...headerRows];
    const dataRows = rows.map((row) => leafKeys.map((key) => getCellValue(row, key as keyof FlatRow)));

    const sheet = XLSX.utils.aoa_to_sheet([...allHeaderRows, ...dataRows]);

    applyHeaderStyles(sheet, leafKeys, allHeaderRows.length);
    applyDataStyles(sheet, allHeaderRows.length, dataRows.length, leafKeys.length);

    const headerMergesWithTitle: XLSX.Range[] = [
        { s: { c: 0, r: 0 }, e: { c: Math.max(leafKeys.length - 1, 0), r: 0 } },
        ...headerMerges.map((merge) => ({
            s: { r: merge.s.r + 1, c: merge.s.c },
            e: { r: merge.e.r + 1, c: merge.e.c },
        })),
    ];

    const mergeColumns = leafKeys.map((key, index) => (isMergeColumn(key) ? index : -1)).filter((index) => index >= 0);
    const dataMerges = buildMergeRanges(rows, allHeaderRows.length, mergeColumns) as XLSX.Range[];
    sheet['!merges'] = headerMergesWithTitle.concat(dataMerges);
    if (leafKeys.length > 0) {
        const filterRowIndex = allHeaderRows.length - 1;
        const filterRange = XLSX.utils.encode_range({
            s: { r: filterRowIndex, c: 0 },
            e: { r: filterRowIndex, c: leafKeys.length - 1 },
        });
        sheet['!autofilter'] = { ref: filterRange };
    }

    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);

    return XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
        cellStyles: true,
    });
}

const DEVICE_KEYS = new Set(['deviceSource', 'deviceModel', 'deviceBrand', 'deviceCategory']);
const EWELINK_KEYS = new Set(['ewelinkSupported', 'ewelinkCapabilities']);
const MATTER_KEYS = new Set([
    'matterSupported',
    'matterDeviceType',
    'matterSupportedClusters',
    'matterProtocolVersion',
    'appleSupported',
    'googleSupported',
    'smartThingsSupported',
    'alexaSupported',
]);
const HA_KEYS = new Set(['homeAssistantSupported', 'homeAssistantEntities']);

type LeafGroup = 'device' | 'ewelink' | 'matter' | 'ha' | 'unknown';

const getLeafGroup = (key: string): LeafGroup => {
    if (DEVICE_KEYS.has(key)) return 'device';
    if (EWELINK_KEYS.has(key)) return 'ewelink';
    if (MATTER_KEYS.has(key)) return 'matter';
    if (HA_KEYS.has(key)) return 'ha';
    return 'unknown';
};

const getCellValue = (row: FlatRow, key: keyof FlatRow): string | number => {
    const map: Record<string, (r: FlatRow) => string | number> = {
        deviceSource: (r) => r.deviceSource,
        deviceModel: (r) => r.deviceModel,
        deviceBrand: (r) => r.deviceBrand || 'N/A',
        deviceCategory: (r) => r.deviceCategory,
        ewelinkSupported: (r) => (r.ewelinkSupported ? '√' : '×'),
        ewelinkCapabilities: (r) => ewelinkCapabilitiesLabel(r),
        matterSupported: (r) => (r.matterSupported ? '√' : '×'),
        matterDeviceType: (r) => r.matterDeviceType ?? 'Matter 无对应设备类型（缺）',
        matterSupportedClusters: (r) => clusterLabel(r.matterSupportedClusters, r.matterUnsupportedClusters),
        matterProtocolVersion: (r) => r.matterProtocolVersion || 'Matter 无对应设备类型（缺）',
        appleSupported: (r) => thirdAppMatterBridgeLabel(r, 'appleSupported'),
        googleSupported: (r) => thirdAppMatterBridgeLabel(r, 'googleSupported'),
        smartThingsSupported: (r) => thirdAppMatterBridgeLabel(r, 'smartThingsSupported'),
        alexaSupported: (r) => thirdAppMatterBridgeLabel(r, 'alexaSupported'),
        homeAssistantSupported: (r) => (r.homeAssistantSupported ? '√' : '×'),
        homeAssistantEntities: (r) => entitiesLabel(r.homeAssistantEntities),
    };

    if (map[key]) return map[key](row);
    const value = row[key];
    if (Array.isArray(value)) return value.join('\n');
    if (typeof value === 'boolean') return value ? '√' : '×';
    if (value == null) return '';
    return typeof value === 'number' ? value : String(value);
};

const buildHeaderRows = (columns: ExportColumn[]) => {
    const depth = getMaxDepth(columns);
    const totalLeaves = columns.reduce((sum, col) => sum + countLeaves(col), 0);
    const rows = Array.from({ length: depth }, () => new Array(totalLeaves).fill('')) as string[][];
    const merges: XLSX.Range[] = [];
    const leafKeys: string[] = [];
    let cursor = 0;

    const fill = (cols: ExportColumn[], level: number) => {
        cols.forEach((col) => {
            const title = col.title ?? '';
            if (col.children && col.children.length) {
                const start = cursor;
                fill(col.children, level + 1);
                const end = cursor - 1;
                rows[level]![start] = title;
                if (end > start) merges.push({ s: { r: level, c: start }, e: { r: level, c: end } });
            } else {
                rows[level]![cursor] = title;
                leafKeys.push(col.key ?? '');
                if (level < depth - 1) merges.push({ s: { r: level, c: cursor }, e: { r: depth - 1, c: cursor } });
                cursor += 1;
            }
        });
    };

    fill(columns, 0);
    return { rows, merges, leafKeys };
};

const getMaxDepth = (columns: ExportColumn[], level = 1): number => {
    return columns.reduce((max, col) => {
        if (!col.children || col.children.length === 0) return Math.max(max, level);
        return Math.max(max, getMaxDepth(col.children, level + 1));
    }, level);
};

const countLeaves = (col: ExportColumn): number => {
    if (!col.children || col.children.length === 0) return 1;
    return col.children.reduce((sum, child) => sum + countLeaves(child), 0);
};

const applyHeaderStyles = (sheet: XLSX.WorkSheet, leafKeys: string[], headerRowCount: number) => {
    const fillTitle = { patternType: 'solid', fgColor: { theme: 0, tint: -0.35 }, bgColor: { indexed: 64 } };
    const fillDevice = { patternType: 'solid', fgColor: { theme: 7, tint: 0.4, rgb: 'FFD966' }, bgColor: { indexed: 64 } };
    const fillDeviceSub = { patternType: 'solid', fgColor: { theme: 7, tint: 0.6, rgb: 'FFE699' }, bgColor: { indexed: 64 } };
    const fillPlatform = { patternType: 'solid', fgColor: { theme: 9, tint: 0.4, rgb: 'A9D18E' }, bgColor: { indexed: 64 } };
    const fillEwelink = { patternType: 'solid', fgColor: { theme: 9, tint: 0.6, rgb: 'C5E0B4' }, bgColor: { indexed: 64 } };
    const fillMatter = { patternType: 'solid', fgColor: { theme: 9, tint: 0.8, rgb: 'E2F0D9' }, bgColor: { indexed: 64 } };
    const fillHA = { patternType: 'solid', fgColor: { theme: 9, tint: 0.8, rgb: 'D5FEE9' }, bgColor: { indexed: 64 } };

    const setCellStyle = (r: number, c: number, style: any) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[addr] ?? (sheet[addr] = { t: 's', v: '' });
        cell.s = style;
    };

    for (let c = 0; c < leafKeys.length; c += 1) setCellStyle(0, c, fillTitle);

    if (headerRowCount > 1) {
        for (let c = 0; c < leafKeys.length; c += 1) {
            const group = getLeafGroup(leafKeys[c]!);
            const style = group === 'device' ? fillDevice : group === 'unknown' ? fillPlatform : fillPlatform;
            setCellStyle(1, c, style);
        }
    }

    for (let r = 2; r < headerRowCount; r += 1) {
        for (let c = 0; c < leafKeys.length; c += 1) {
            const group = getLeafGroup(leafKeys[c]!);
            let style = fillDeviceSub;
            if (group === 'ewelink') style = fillEwelink;
            if (group === 'matter') style = fillMatter;
            if (group === 'ha') style = fillHA;
            if (group === 'device') style = fillDeviceSub;
            setCellStyle(r, c, style);
        }
    }

    const headerHeights = new Array(headerRowCount).fill({ hpt: 16.2, hpx: 16.2 });
    if (headerRowCount > 0) headerHeights[0] = { hpt: 23.4, hpx: 23.4 };
    if (headerRowCount > 0) headerHeights[headerRowCount - 1] = { hpt: 50.4, hpx: 50.4 };
    sheet['!rows'] = headerHeights;
};

const applyDataStyles = (sheet: XLSX.WorkSheet, startRow: number, rowCount: number, colCount: number) => {
    const applyCenteredStyle = (cell: any) => {
        const s = cell.s ? { ...cell.s } : {};
        s.alignment = {
            ...(s.alignment || {}),
            horizontal: 'center',
            vertical: 'center',
            wrapText: true,
        };
        cell.s = s;
    };

    for (let r = startRow; r < startRow + rowCount; r += 1) {
        for (let c = 0; c < colCount; c += 1) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = sheet[addr] ?? (sheet[addr] = { t: 's', v: '' });
            applyCenteredStyle(cell);
        }
    }
};

const entitiesLabel = (entities: string[]) => {
    return !entities.length ? 'N/A' : entities.join('\n');
};

const ewelinkCapabilitiesLabel = (row: FlatRow) => {
    const { ewelinkSupported, ewelinkCapabilities } = row;
    if (!ewelinkCapabilities.length && !ewelinkSupported) return 'N/A';
    if (!ewelinkCapabilities.length && ewelinkSupported) return 'No Supported Capabilities';
    return ewelinkCapabilities.join('\n');
};

const clusterLabel = (supported: string[], unsupported: string[]) => {
    return !supported.length && !unsupported.length
        ? 'Bridge 暂未适配该设备（缺）'
        : `${supported.map((item) => `√${item}`).join('\n')}\n${unsupported.map((item) => `×${item}`).join('\n')}`;
};

const thirdAppMatterBridgeLabel = (row: FlatRow, supportKey: 'appleSupported' | 'googleSupported' | 'smartThingsSupported' | 'alexaSupported') => {
    const supported = row[supportKey];
    const isThirdAppEmpty = !supported.length;
    const { matterDeviceType } = row;

    if (isThirdAppEmpty && matterDeviceType) return 'Bridge 暂未适配该设备（缺）';
    if (isThirdAppEmpty && !matterDeviceType) return 'Matter 无对应设备类型（缺）';
    return supported.join('\n');
};
