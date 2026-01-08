import type { ColumnsType, ColumnType } from 'ant-design-vue/es/table';
import type { FlatRow } from '@/types/data';
import correct from '@/assets/img/correct.png';
import wrong from '@/assets/img/wrong.png';
import Cluster from '@/components/business/MatterCluster.vue';
import MatterThirdPartAppCluster from '@/components/business/MatterThirdPartAppCluster.vue';
import EwelinkCapabilities from '@/components/business/EwelinkCapabilities.vue';
import { ref, computed } from 'vue';
import { Popover } from 'ant-design-vue';
import { type EnumFilters, type EnumOptionMap } from '@/types/data';
import { h } from 'vue';
import type { FilterDropdownProps } from 'ant-design-vue/es/table/interface';
import FilterDropdown from '@/components/FilterDropdown/Index.vue';

export type GroupKey = 'ewelink' | 'matter' | 'homeAssistant';

type ColumnWithGroup = ColumnType<FlatRow> & { groupKey?: GroupKey };

// 筛选项的显示数量限制，每次显示更多也依照该增量展开，保持体验一致
const MAX_FILTER_OPTIONS = 80;

const groupVisibility = ref<GroupKey[]>(['ewelink', 'matter', 'homeAssistant']);

const SUPPORT_SEARCH_KEYS: Array<keyof FlatRow> = ['deviceModel', 'deviceType'];

/**  */
const enumFilterSearch = ref<Partial<Record<keyof EnumFilters, string>>>({});
// 各列当前展开的筛选项数量；用于“显示更多”
const enumFilterLimit = ref<Partial<Record<keyof EnumFilters, number>>>({});

const getEnumFilterLimit = (key: keyof EnumFilters) => enumFilterLimit.value[key] ?? MAX_FILTER_OPTIONS;
const setEnumFilterLimit = (key: keyof EnumFilters, value: number) => {
    enumFilterLimit.value = { ...enumFilterLimit.value, [key]: value };
};
const resetEnumFilterLimit = (key: keyof EnumFilters) => setEnumFilterLimit(key, MAX_FILTER_OPTIONS);
const increaseEnumFilterLimit = (key: keyof EnumFilters) => setEnumFilterLimit(key, getEnumFilterLimit(key) + MAX_FILTER_OPTIONS);

// 枚举筛选的默认空值；每次重置或 worker 返回 filters 时使用
const createDefaultEnums = (): EnumFilters => ({
    deviceModel: [],
    deviceType: [],
    brand: [],
    category: [],
    ewelinkSupported: [],
    ewelinkCapabilities: [],
    matterSupported: [],
    matterDeviceType: [],
    matterProtocolVersion: [],
    matterSupportedClusters: [],
    appleSupported: [],
    googleSupported: [],
    smartThingsSupported: [],
    alexaSupported: [],
    homeAssistantSupported: [],
    homeAssistantEntities: [],
});

const enums = ref<EnumFilters>(createDefaultEnums());

const enumOptions = ref<EnumOptionMap>({
    deviceModel: [],
    deviceType: [],
    brand: [],
    category: [],
    ewelinkSupported: [],
    ewelinkCapabilities: [],
    matterSupported: [],
    matterDeviceType: [],
    matterProtocolVersion: [],
    matterSupportedClusters: [],
    appleSupported: [],
    googleSupported: [],
    smartThingsSupported: [],
    alexaSupported: [],
    homeAssistantSupported: [],
    homeAssistantEntities: [],
});

/** 图标展示 */
const boolIcon = (value?: boolean) =>
    h('img', {
        style: {
            width: '24px',
        },
        src: value ? correct : wrong,
    });
const listDisplay = (list: string[]) => (list.length ? list.join(',') : 'Not Yet Supported');
const ewelinkCapabilitiesTransform = (list: string[], supported: boolean) => {
    if (!list.length && !supported) return 'Unsupported in eWeLink App';
    if (!list.length && supported) return 'No Supported Capabilities';
    return h(EwelinkCapabilities, {
        capabilities: list,
    });
};

const titleTipMap: Record<string, string> = {
    ewelinkSupported: 'Supported in eWeLink App',
    ewelinkCapabilities: 'eWeLink App Capabilities',
    matterSupported: 'Sync via Matter Bridge',
    matterDeviceType: 'Matter Device Type',
    matterProtocolVersion: 'Matter Version',
    matterSupportedClusters: 'Matter Capabilities',
    appleSupported: 'Apple Home Features',
    googleSupported: 'Google Home Features',
    smartThingsSupported: 'SmartThings Features',
    alexaSupported: 'Alexa Features',
    homeAssistantEntities: 'Home Assistant Entity',
    homeAssistantSupported: 'Home Assistant Support',
};

const createColumn = (key: keyof FlatRow | string, title: string, options: Partial<ColumnType<FlatRow>> = {}): ColumnWithGroup => ({
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
    align: 'left',
    ...options,
});

const deviceInfoColumns: ColumnsType<FlatRow> = [
    createColumn('deviceType', 'Type', { width: 130, customRender: ({ record }) => record.deviceType }),
    createColumn('deviceBrand', 'Brand', { width: 130, customRender: ({ record }) => record.deviceBrand }),
    createColumn('deviceCategory', 'Category', { width: 130, customRender: ({ record }) => record.deviceCategory }),
];

const ewelinkColumns: ColumnsType<FlatRow> = [
    createColumn('ewelinkSupported', 'Sync to eWeLink', {
        width: 166,
        customRender: ({ record }) => boolIcon(record.ewelinkSupported),
    }),
    createColumn('ewelinkCapabilities', 'Capabilities of eWeLink', {
        width: 280,
        customRender: ({ record }) => ewelinkCapabilitiesTransform(record.ewelinkCapabilities, record.ewelinkSupported),
    }),
];

const matterColumns: ColumnsType<FlatRow> = [
    createColumn('matterSupported', 'Sync to Matter', {
        width: 166,
        customRender: ({ record }) => boolIcon(record.matterSupported),
    }),
    createColumn('matterDeviceType', 'Matter Device Type', { width: 200, customRender: ({ record }) => record.matterDeviceType || 'Not Yet Supported' }),
    createColumn('matterSupportedClusters', 'Cluster', {
        width: 400,
        customRender: ({ record }) => stringifyClusterInfo(record.matterSupportedClusters, record.matterUnsupportedClusters),
    }),
    createColumn('matterProtocolVersion', 'Matter Version', { width: 150, customRender: ({ record }) => record.matterProtocolVersion || 'N/A' }),
    createColumn('appleSupported', 'Apple Home', {
        width: 300,
        customRender: ({ record }) => withNotes(record, 'appleSupported', 'appleNotes'),
    }),
    createColumn('googleSupported', 'Google Home', {
        width: 300,
        customRender: ({ record }) => withNotes(record, 'googleSupported', 'googleNotes'),
    }),
    createColumn('smartThingsSupported', 'SmartThings', {
        width: 300,
        customRender: ({ record }) => withNotes(record, 'smartThingsSupported', 'smartThingsNotes'),
    }),
    createColumn('alexaSupported', 'Alexa', {
        width: 300,
        customRender: ({ record }) => withNotes(record, 'alexaSupported', 'alexaNotes'),
    }),
];

const homeAssistantColumns: ColumnsType<FlatRow> = [
    createColumn('homeAssistantSupported', 'Sync to HA', {
        width: 166,
        customRender: ({ record }) => boolIcon(record.homeAssistantSupported),
    }),
    createColumn('homeAssistantEntities', 'Entities', {
        width: 220,
        customRender: ({ record }) => listDisplay(record.homeAssistantEntities),
    }),
];

function withNotes(
    record: FlatRow,
    supportKey: 'appleSupported' | 'googleSupported' | 'smartThingsSupported' | 'alexaSupported',
    notesKey: 'appleNotes' | 'googleNotes' | 'smartThingsNotes' | 'alexaNotes'
) {
    const supported = record[supportKey];
    const notes = record[notesKey];
    const isThirdAppEmpty = !supported.length;
    const { matterSupportedClusters, matterUnsupportedClusters, deviceType } = record;
    const isClusterOrDeviceTypeEmpty = ![...matterSupportedClusters, ...matterUnsupportedClusters].length || !deviceType;

    if (isThirdAppEmpty && isClusterOrDeviceTypeEmpty) return 'Not Yet Supported';
    if (isThirdAppEmpty && !isClusterOrDeviceTypeEmpty) return 'Device Type Unsupported';
    return h(MatterThirdPartAppCluster, {
        supported: supported,
        notes,
    });
}

// 返回下拉可见列表 + 是否仍有剩余，方便显示“显示更多”
const getDropdownOptionMeta = (enumKey: keyof EnumFilters, limit?: number) => {
    const raw = enumOptions.value[enumKey] || [];
    const keyword = (enumFilterSearch.value[enumKey] || '').trim().toLowerCase();
    const filtered = keyword ? raw.filter((opt) => opt.value.toLowerCase().includes(keyword)) : raw;
    const effectiveLimit = limit ?? getEnumFilterLimit(enumKey);
    return {
        options: filtered.slice(0, effectiveLimit),
        total: filtered.length,
        hasMore: filtered.length > effectiveLimit,
    };
};

function stringifyClusterInfo(supported: string[], unsupported: string[]) {
    if (!supported.length && !unsupported.length) return 'Not Yet Supported';
    return h(Cluster, {
        supported,
        unsupported,
    });
}

const filterColumnsByGroup = (cols: ColumnsType<FlatRow>, visibleGroups: GroupKey[]): ColumnsType<FlatRow> => {
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

const formatFilterLabel = (key: keyof EnumFilters, value: string) => {
    if (key === 'ewelinkSupported' || key === 'matterSupported' || key === 'homeAssistantSupported') {
        return h('img', {
            src: value === 'true' ? correct : wrong,
            alt: value === 'true' ? 'supported' : 'unsupported',
            style: {
                width: '16px',
                height: '16px',
                marginTop: '-3px',
            },
        });
    }
    return value || '—';
};

/** antd 列配置需要静态 filters，仅保留前 80 条用于勾选提示 */
const getColumnFilterOptions = (enumKey: keyof EnumFilters) => {
    const raw = enumOptions.value[enumKey] || [];
    return raw.slice(0, MAX_FILTER_OPTIONS);
};

/** 生成下拉选项框的DOM */
const renderFilterDropdown = (enumKey: keyof EnumFilters) => (props: FilterDropdownProps<FlatRow>) => {
    const search = enumFilterSearch.value[enumKey] || '';
    const limit = getEnumFilterLimit(enumKey);
    const { options, hasMore, total } = getDropdownOptionMeta(enumKey, limit);
    const selectedKeys = (props.selectedKeys as string[]) ?? [];
    const isAllChecked = selectedKeys.length === 0;
    const isAllIndeterminate = !isAllChecked && selectedKeys.length > 0;

    const toggleValue = (value: string, checked: boolean) => {
        const next = checked ? [...selectedKeys, value] : selectedKeys.filter((v) => v !== value);
        props.setSelectedKeys?.(next);
    };

    const toggleAll = (checked: boolean) => {
        if (checked) {
            props.setSelectedKeys?.([]);
        }
    };

    const clear = () => {
        enumFilterSearch.value = { ...enumFilterSearch.value, [enumKey]: '' };
        resetEnumFilterLimit(enumKey);
        props.clearFilters?.();
    };

    return h(
        FilterDropdown,
        {
            search,
            options,
            selectedKeys,
            isAllChecked,
            isAllIndeterminate,
            hasMore,
            total,
            limit,
            'onUpdate:search': (val: string) => {
                enumFilterSearch.value = { ...enumFilterSearch.value, [enumKey]: val };
                resetEnumFilterLimit(enumKey);
            },
            onToggleValue: toggleValue,
            onToggleAll: toggleAll,
            onClear: clear,
            onConfirm: () => props.confirm?.(),
            onLoadMore: () => increaseEnumFilterLimit(enumKey),
        },
        {
            label: ({ value }: { value: string }) => formatFilterLabel(enumKey, value),
        }
    );
};

/** 在列定义上再注入 antd 筛选能力、筛选项以及相关配置 */
const enhanceColumns = (cols: ColumnsType<FlatRow>): ColumnsType<FlatRow> => {
    return cols.map((col) => {
        // 存在叶子筛选项就继续递归（比如易微联的叶子筛选项是云支持+设备能力）
        if ('children' in col && col.children) {
            return { ...col, children: enhanceColumns(col.children) };
        }
        const leaf = col as ColumnType<FlatRow>;
        const key = leaf.key as string | undefined;
        if (!key) {
            throw new Error('每个需要筛选的列都必须提供唯一 key');
        }
        const enumKey = key as keyof EnumFilters;
        if (!enumKey) return leaf;
        const opts = getColumnFilterOptions(enumKey);
        const filters = opts.map((option) => ({
            text: [formatFilterLabel(enumKey, option.value), ` (${option.count})`],
            value: option.value,
        }));
        const selected = enums.value[enumKey];
        const clearSearchForColumn = () => {
            enumFilterSearch.value = { ...enumFilterSearch.value, [enumKey]: '' };
        };
        return {
            ...leaf,
            filters,
            filterMultiple: true,
            filteredValue: selected && selected.length ? selected.map((value) => String(value)) : null,
            filterDropdown: renderFilterDropdown(enumKey),
            onFilterDropdownOpenChange: async (visible: boolean) => {
                if (visible) {
                    clearSearchForColumn();
                }
            },
        };
    });
};

export const useColumns = () => {
    const baseColumns: ColumnsType<FlatRow> = [
        createColumn('deviceModel', 'Model', { width: 160, fixed: true, customRender: ({ record }) => record.deviceModel }),
        {
            title: 'Device information',
            key: 'group-device',
            children: deviceInfoColumns,
        },
        {
            title: 'eWeLink',
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

    const tableColumns = computed(() => {
        const filtered = filterColumnsByGroup(baseColumns, groupVisibility.value);
        return enhanceColumns(filtered);
    });

    return {
        SUPPORT_SEARCH_KEYS,
        tableColumns,
        enums,
        enumOptions,
        groupVisibility,
        createDefaultEnums,
    };
};
