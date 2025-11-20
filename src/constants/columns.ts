import type { ColumnsType, ColumnType } from 'ant-design-vue/es/table';
import type { FlatRow } from '@/types/data';
import correct from '@/assets/img/correct.png';
import wrong from '@/assets/img/wrong.png';
import Cluster from '@/components/business/MatterCluster.vue';
import MatterThirdPartAppCluster from '@/components/business/MatterThirdPartAppCluster.vue';
import EwelinkCapabilities from '@/components/business/EwelinkCapabilities.vue';
import { Popover } from 'ant-design-vue';
import { h } from 'vue';

export type GroupKey = 'ewelink' | 'matter' | 'homeAssistant';

/** 图标展示 */
const boolIcon = (value?: boolean) =>
    h('img', {
        style: {
            width: '24px',
        },
        src: value ? correct : wrong,
    });
const listDisplay = (list: string[]) => (list.length ? list.join(',') : '无');
const ewelinkCapabilitiesTransform = (list: string[]) => {
    if (!list.length) return '无';
    return h(EwelinkCapabilities, {
        capabilities: list,
    });
};

const titleTipMap: Record<string, string> = {
    ewelinkSupported: '支持在易微联 APP 添加该设备',
    ewelinkCapabilities: '对应设备在易微联 APP 支持的能力',
    matterSupported: '支持通过 Matter Bridge 同步到第三方生态圈',
    matterDeviceType: '对应设备在 Matter 标准协议中的设备类别',
    matterSupportedClusters: 'Matter 标准协议中设备的能力',
    googleSupported: '设备同步至 Google Home 支持的功能',
    smartThingsSupported: '设备同步至 SmartThings 支持的功能',
    alexaSupported: '设备同步至 Alexa 支持的功能',
    homeAssistantSupported: '支持同步到 Home Assistant',
    homeAssistantEntities: '设备同步至 Home Assistant 时对应的实体',
};

type SpanStrategy = 'group' | 'deviceInfo' | false;

const createColumn = (key: keyof FlatRow | string, title: string, options: Partial<ColumnType<FlatRow>> = {}, span: SpanStrategy = 'group'): ColumnType<FlatRow> => ({
    key,
    dataIndex: key as ColumnType<FlatRow>['dataIndex'],
    title: () => {
        if (!Object.keys(titleTipMap).includes(key)) return title;
        return h(
            Popover,
            { trigger: 'hover', placement: 'bottom' },
            {
                default: () => h('div', { style: { cursor: 'pointer' } }, title),
                content: () => h('div', titleTipMap[key]),
            }
        );
    },
    width: 160,
    align: 'left',
    customCell:
        span === false
            ? undefined
            : (record: FlatRow) => ({
                rowSpan: span === 'deviceInfo' ? record.deviceInfoRowSpan ?? 1 : record.isGroupHead ? record.groupSpan : 0,
            }),
    ...options,
});

const deviceInfoColumns: ColumnsType<FlatRow> = [
    createColumn('deviceModel', '设备型号', { width: 180, fixed: 'left' }, 'deviceInfo'),
    createColumn('deviceType', '设备类型', { width: 140, fixed: 'left' }),
    createColumn('deviceBrand', '品牌', { width: 140, fixed: 'left' }, 'deviceInfo'),
    createColumn('deviceCategory', '设备类别', { width: 160, fixed: 'left' }, 'deviceInfo'),
];

const ewelinkColumns: ColumnsType<FlatRow> = [
    createColumn('ewelinkSupported', '是否支持易微联云', {
        width: 220,
        align: 'center',
        customRender: ({ record }) => boolIcon(record.ewelinkSupported),
    }),
    createColumn(
        'ewelinkCapabilities',
        '连接易微联云支持的能力',
        {
            width: 300,
            customRender: ({ record }) => ewelinkCapabilitiesTransform(record.ewelinkCapabilities),
        },
        'deviceInfo'
    ),
];

const matterColumns: ColumnsType<FlatRow> = [
    createColumn('matterSupported', 'Matter Bridge 是否支持', {
        width: 220,
        align: 'center',
        customRender: ({ record }) => boolIcon(record.matterSupported),
    }),
    createColumn('matterDeviceType', 'Matter Device Type', { width: 220 }, false),
    createColumn(
        'matterSupportedClusters',
        'Cluster',
        {
            width: 260,
            customRender: ({ record }) => stringifyClusterInfo(record.matterSupportedClusters, record.matterUnsupportedClusters),
        },
        false
    ),
    createColumn('matterProtocolVersion', 'Matter 支持的协议版本', { width: 260 }, false),
    createColumn(
        'appleSupported',
        'Apple Home',
        {
            width: 220,
            customRender: ({ record }) => withNotes(record.appleSupported, record.appleNotes),
        },
        false
    ),
    createColumn(
        'googleSupported',
        'Google Home',
        {
            width: 220,
            customRender: ({ record }) => withNotes(record.googleSupported, record.googleNotes),
        },
        false
    ),
    createColumn(
        'alexaSupported',
        'Alexa',
        {
            width: 220,
            customRender: ({ record }) => withNotes(record.alexaSupported, record.alexaNotes),
        },
        false
    ),
    createColumn(
        'smartThingsSupported',
        'SmartThings',
        {
            width: 220,
            customRender: ({ record }) => withNotes(record.smartThingsSupported, record.smartThingsNotes),
        },
        false
    ),
];

const homeAssistantColumns: ColumnsType<FlatRow> = [
    createColumn('homeAssistantSupported', '是否支持同步到 HA', {
        width: 200,
        align: 'center',
        customRender: ({ record }) => boolIcon(record.homeAssistantSupported),
    }),
    createColumn('homeAssistantEntities', 'entities', {
        width: 220,
        customRender: ({ record }) => listDisplay(record.homeAssistantEntities),
    }),
];

function withNotes(supported: string[], notes: string[]) {
    if (!supported.length && !notes.length) return '无';
    return h(MatterThirdPartAppCluster, {
        supported,
        notes,
    });
}

function stringifyClusterInfo(supported: string[], unsupported: string[]) {
    if (!supported.length && !unsupported.length) return '无';
    return h(Cluster, {
        supported,
        unsupported,
    });
}

type ColumnWithGroup = ColumnType<FlatRow> & { groupKey?: GroupKey };

export const baseColumns: ColumnsType<FlatRow> = [
    {
        title: '设备信息',
        key: 'group-device',
        children: deviceInfoColumns,
    },
    {
        title: '易微联云',
        key: 'group-ewelink',
        groupKey: 'ewelink',
        children: ewelinkColumns as ColumnsType<FlatRow>,
    } as ColumnWithGroup,
    {
        title: 'Matter',
        key: 'group-matter',
        groupKey: 'matter',
        children: matterColumns as ColumnsType<FlatRow>,
    } as ColumnWithGroup,
    {
        title: 'Home Assistant',
        key: 'group-homeassistant',
        groupKey: 'homeAssistant',
        children: homeAssistantColumns as ColumnsType<FlatRow>,
    } as ColumnWithGroup,
];

const collectLeafColumns = (cols: ColumnsType<FlatRow>, bucket: ColumnType<FlatRow>[] = []) => {
    cols.forEach((col) => {
        if ('children' in col && col.children) {
            collectLeafColumns(col.children, bucket);
        } else {
            bucket.push(col as ColumnType<FlatRow>);
        }
    });
    return bucket;
};

export const filterColumnsByGroup = (cols: ColumnsType<FlatRow>, visibleGroups: GroupKey[]): ColumnsType<FlatRow> => {
    const result: ColumnsType<FlatRow> = [];
    cols.forEach((col) => {
        const groupKey = (col as ColumnWithGroup).groupKey;
        if (groupKey && !visibleGroups.includes(groupKey)) return;
        if ('children' in col && col.children) {
            const children = filterColumnsByGroup(col.children, visibleGroups);
            if (children.length) result.push({ ...col, children });
            return;
        }
        result.push(col);
    });
    return result;
};

export const sumColumnWidth = (cols: ColumnsType<FlatRow>): number =>
    collectLeafColumns(cols).reduce((acc, col) => {
        if (!col.width) return acc + 160;
        if (typeof col.width === 'number') return acc + col.width;
        const parsed = parseInt(col.width, 10);
        return acc + (Number.isNaN(parsed) ? 160 : parsed);
    }, 0);
