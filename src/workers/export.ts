import * as XLSX from 'xlsx-js-style';
import type { FlatRow } from '../types/data';

/**
 * 根据 Excel 模板生成导出 ArrayBuffer（保留表头样式；数据区统一水平/垂直居中 + 自动换行）
 * 约定：
 * - 模板 sheet 名为 "template"
 * - 表头占第 1~4 行
 * - 数据从第 5 行开始（第 5 行在你的模板里虽然是空行，但已经带了样式，可当作“样式行”）
 */
export async function buildExcelBufferByTemplate(rows: FlatRow[], templateUrl = '/excel-template.xlsx'): Promise<ArrayBuffer> {
    // 1) 读取模板
    const templateBuffer = await fetch(templateUrl).then((res) => res.arrayBuffer());
    const workbook = XLSX.read(templateBuffer, { type: 'array', cellStyles: true });

    const sheetName = 'template';
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`模板缺少工作表: ${sheetName}`);

    const START_ROW = 5; // 数据起始行（1-based）
    const STYLE_ROW = 5; // 用模板第 5 行当数据区样式行（空但有样式）

    // 深拷贝 style（避免引用导致后续互相污染）
    const cloneStyle = (s: any) => (s ? JSON.parse(JSON.stringify(s)) : undefined);

    // 取某列在样式行的 style
    const getStyleForCol = (colIndex: number) => {
        const addr = XLSX.utils.encode_cell({ r: STYLE_ROW - 1, c: colIndex });
        return cloneStyle(sheet[addr]?.s);
    };

    // 给 cell 套用 style，并把对齐统一成居中
    const applyCenteredStyle = (cell: any, baseStyle: any) => {
        const s = baseStyle ? cloneStyle(baseStyle) : cell.s ? cloneStyle(cell.s) : {};
        s.alignment = {
            ...(s.alignment || {}),
            horizontal: 'center',
            vertical: 'center',
            wrapText: true,
        };
        cell.s = s;
    };

    // 2) 写数据（保留表头 1~4 行不动）
    rows.forEach((row, index) => {
        const excelRow = START_ROW + index; // 1-based
        const values = flatRowToExcelRow(row);
        const colCount = values.length;

        for (let c = 0; c < colCount; c++) {
            const addr = XLSX.utils.encode_cell({ r: excelRow - 1, c });
            const value = values[c];

            // ✅ 不要整格替换对象：尽量复用
            const cell = sheet[addr] ?? (sheet[addr] = { t: 's', v: '' });

            // ✅ 套用模板数据区样式（来自第 5 行同列）
            const baseStyle = getStyleForCol(c);
            applyCenteredStyle(cell, baseStyle);

            // ✅ 写值
            cell.v = value ?? '';
            cell.t = typeof value === 'number' ? 'n' : 's';
        }
    });

    // 3) 更新 worksheet 的 range（!ref）
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const lastRow0 = START_ROW - 1 + Math.max(rows.length - 1, 0); // 0-based
    range.e.r = Math.max(range.e.r, lastRow0);

    // 让列数至少覆盖你的数据列（避免 !ref 太窄导致样式/显示怪异）
    const sampleCols = rows.length ? flatRowToExcelRow(rows[0]!).length : 16;
    range.e.c = Math.max(range.e.c, sampleCols - 1);

    sheet['!ref'] = XLSX.utils.encode_range(range);

    // 4) 导出
    return XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
        cellStyles: true,
    });
}

const clusterLabel = (supported: string[], unsupported: string[]) => {
    return !supported.length && !unsupported.length
        ? 'Not Yet Supported'
        : `${supported.map((item) => `√${item}`).join('\n')}\n${unsupported.map((item) => `×${item}`).join('\n')}`;
};

// TODO: 待产品确认 “Cluster 为空”的具体含义
const thirdAppMatterBridgeLabel = (row: FlatRow, supportKey: 'appleSupported' | 'googleSupported' | 'smartThingsSupported' | 'alexaSupported') => {
    const { matterSupportedClusters, matterUnsupportedClusters, matterDeviceType } = row;
    const thirdAppSupported = row[supportKey];
    const isThirdAppEmpty = !thirdAppSupported.length;
    const isClusterOrMatterDeviceTypeEmpty = ![...matterSupportedClusters, ...matterUnsupportedClusters].length || !matterDeviceType;
    if (isThirdAppEmpty && isClusterOrMatterDeviceTypeEmpty) return 'Not Yet Supported';
    if (isThirdAppEmpty && !isClusterOrMatterDeviceTypeEmpty) return 'Device Type Unsupported';
    return thirdAppSupported.join('\n');
};

function flatRowToExcelRow(row: FlatRow): (string | number)[] {
    return [
        row.deviceSource,
        row.deviceModel,
        row.deviceBrand || 'N/A',
        row.deviceCategory,
        row.ewelinkSupported ? '√' : '×',
        row.ewelinkCapabilities.join('\n'),
        row.matterSupported ? '√' : '×',
        row.matterDeviceType ?? 'Not Yet Supported',
        clusterLabel(row.matterSupportedClusters, row.matterUnsupportedClusters),
        row.matterProtocolVersion || 'N/A',
        thirdAppMatterBridgeLabel(row, 'appleSupported'),
        thirdAppMatterBridgeLabel(row, 'googleSupported'),
        thirdAppMatterBridgeLabel(row, 'smartThingsSupported'),
        thirdAppMatterBridgeLabel(row, 'alexaSupported'),
        row.homeAssistantSupported ? '√' : '×',
        row.homeAssistantEntities.join('\n'),
    ];
}
